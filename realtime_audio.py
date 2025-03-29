import os
import json
import logging
import asyncio
import websockets
from typing import Dict, List, Optional, Union, Any, AsyncGenerator
from openai import AsyncOpenAI
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

class WordTiming(BaseModel):
    word: str
    start_time: int
    end_time: int
    node_id: Optional[Union[str, List[str]]] = None

class StreamingResponse(BaseModel):
    type: str  # 'text', 'audio_chunk', 'timing', 'end'
    data: Any
    timestamp: Optional[int] = None

async def stream_text_to_speech(text: str, voice: str = "alloy") -> AsyncGenerator[bytes, None]:
    try:
        logger.info(f"Starting text-to-speech streaming for text of length {len(text)}")
        
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            response_format="mp3",
            speed=1.0
        )
        
        chunk_size = 8192
        audio_data = response.content
        
        header = json.dumps({
            "type": "header",
            "data": {
                "content_type": "audio/mpeg",
                "total_size": len(audio_data)
            }
        }).encode()
        yield header
        
        for i in range(0, len(audio_data), chunk_size):
            chunk = audio_data[i:i+chunk_size]
            yield chunk
            await asyncio.sleep(0.01)
            
        logger.info("Completed text-to-speech streaming")
    except Exception as e:
        logger.error(f"Error in text-to-speech streaming: {str(e)}")
        raise

async def generate_word_timings(text: str, audio_duration: int, nodes: List[Dict] = None) -> List[Dict]:
    words = text.split()
    word_count = len(words)
    word_timings = []
    current_time = 0
    
    for word in words:
        word_duration = (len(word) / 5) * (audio_duration / word_count)
        if word.endswith(('.', '!', '?', ',')):
            word_duration *= 1.5
        
        node_id = None
        if nodes:
            word_lower = word.lower()
            for node in nodes:
                if node.get('name', '').lower() == word_lower or word_lower in node.get('name', '').lower():
                    node_id = node.get('id')
                    break
        
        timing = {
            "word": word,
            "start_time": int(current_time),
            "end_time": int(current_time + word_duration),
            "node_id": node_id
        }
        
        word_timings.append(timing)
        current_time += word_duration
    
    return word_timings

async def handle_websocket_connection(websocket: WebSocket, topic: str):
    await websocket.accept()
    
    try:
        data = await websocket.receive_text()
        request_data = json.loads(data)
        
        text = request_data.get('text', '')
        nodes = request_data.get('nodes', [])
        
        if not text:
            await websocket.send_json({"error": "No text provided"})
            await websocket.close()
            return
        
        words = text.split()
        word_count = len(words)
        estimated_duration_ms = int((word_count / 150) * 60 * 1000)
        
        word_timings = await generate_word_timings(text, estimated_duration_ms, nodes)
        
        await websocket.send_json({
            "type": "timing",
            "data": word_timings
        })
        
        first_chunk = True
        async for audio_chunk in stream_text_to_speech(text):
            if first_chunk and audio_chunk.startswith(b'{'): 
                try:
                    header_info = json.loads(audio_chunk.decode('utf-8'))
                    await websocket.send_json(header_info)
                    first_chunk = False
                    continue
                except:
                    pass
            
            await websocket.send_bytes(audio_chunk)
        
        await websocket.send_json({
            "type": "end",
            "data": {"message": "Audio streaming completed"}
        })
        
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {str(e)}")
        try:
            await websocket.send_json({"error": str(e)})
            await websocket.close()
        except:
            pass

async def process_doubt_with_openai(topic: str, doubt: str, visualization_description: str, current_state: Dict = None) -> str:
    try:
        logger.info(f"Processing doubt with OpenAI: {doubt}")
        
        context = {
            "topic": topic,
            "doubt": doubt,
            "current_state": current_state or {},
            "visualization_description": visualization_description
        }
        
        system_message = """You are an expert in database visualization and education. You are a skilled teacher who engages students through interactive explanations. Your task is to:
1. Provide clear, concise explanations of database concepts
2. Identify relevant components in visualizations
3. Suggest visual highlights to emphasize important elements
4. Give brief practical examples
5. Ask thoughtful questions to check understanding

IMPORTANT: Keep your responses concise and focused. The total response should be under 300 words to ensure it can be converted to audio.
"""
        
        user_message = f"""I'm looking at a visualization about {topic}. Here's my question: {doubt}
        
Visualization structure:
{visualization_description}

Current state:
{json.dumps(context['current_state'], indent=2) if context['current_state'] else 'No state information available'}

Please help me understand this better by:
1. Providing a clear explanation
2. Suggesting which elements should be highlighted
3. If needed, suggesting modifications to the visualization
4. Including 1-2 questions to check my understanding

IMPORTANT: Keep your response under 300 words total to ensure it can be converted to audio."""
        
        response = await client.chat.completions.create(
            model="gpt-4o-realtime-preview-2024-12-17",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        response_text = response.choices[0].message.content
        logger.info(f"Received response from OpenAI: {response_text[:100]}...")
        
        return response_text
    except Exception as e:
        logger.error(f"Error processing doubt with OpenAI: {str(e)}")
        return f"I'm sorry, I encountered an error while processing your doubt: {str(e)}"

async def handle_doubt_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        # Receive the doubt request
        data = await websocket.receive_text()
        request_data = json.loads(data)
        
        topic = request_data.get('topic', '')
        doubt = request_data.get('doubt', '')
        current_state = request_data.get('current_state', {})
        visualization_description = request_data.get('visualization_description', '')
        
        if not doubt:
            await websocket.send_json({"error": "No doubt provided"})
            await websocket.close()
            return
        
        await websocket.send_json({
            "type": "status",
            "data": {"message": "Processing your doubt..."}
        })
        
        response_text = await process_doubt_with_openai(
            topic=topic,
            doubt=doubt,
            visualization_description=visualization_description,
            current_state=current_state
        )
        
        await websocket.send_json({
            "type": "text",
            "data": response_text
        })
        
        words = response_text.split()
        word_count = len(words)
        estimated_duration_ms = int((word_count / 150) * 60 * 1000)
        
        word_timings = await generate_word_timings(response_text, estimated_duration_ms)
        
        await websocket.send_json({
            "type": "timing",
            "data": word_timings
        })
        
        first_chunk = True
        async for audio_chunk in stream_text_to_speech(response_text):
            if first_chunk and audio_chunk.startswith(b'{'): 
                try:
                    header_info = json.loads(audio_chunk.decode('utf-8'))
                    await websocket.send_json(header_info)
                    first_chunk = False
                    continue
                except:
                    pass
            
            await websocket.send_bytes(audio_chunk)
        
        await websocket.send_json({
            "type": "end",
            "data": {"message": "Doubt handling completed"}
        })
        
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"Error in doubt WebSocket handler: {str(e)}")
        try:
            await websocket.send_json({"error": str(e)})
            await websocket.close()
        except:
            pass 