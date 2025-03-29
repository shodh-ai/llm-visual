"""
Socket.IO Bridge for Text-to-Speech Functionality

This script provides a simple HTTP API that the Node.js Socket.IO server can call
to generate text-to-speech audio using the existing Python backend functionality.
"""

import os
import json
import logging
import asyncio
import sys
import argparse
import socket
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import time

# Import the text-to-speech functionality from the existing backend
from realtime_audio import stream_text_to_speech, generate_word_timings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Parse command-line arguments
parser = argparse.ArgumentParser(description='Socket.IO TTS Bridge')
parser.add_argument('--mode', type=str, default='tts', help='Mode to run in (tts, doubt)')
parser.add_argument('--port', type=int, default=0, help='Port to run on (0 for auto)')
args = parser.parse_args()

# Create FastAPI app
app = FastAPI(
    title="Socket.IO TTS Bridge",
    description="Bridge between Socket.IO server and Python TTS functionality",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    """Request model for text-to-speech generation."""
    text: str
    voice: str = "alloy"
    estimated_duration_ms: Optional[int] = None

class WordTimingRequest(BaseModel):
    """Request model for word timing generation."""
    text: str
    audio_duration: int
    nodes: Optional[List[Dict[str, Any]]] = None

class DoubtRequest(BaseModel):
    """Request model for doubt processing."""
    topic: str
    doubt: str
    current_state: Dict[str, Any]

@app.get("/")
async def read_root():
    """Root endpoint to check if the service is running."""
    return {"status": "ok", "message": "Socket.IO TTS Bridge is running"}

@app.post("/api/tts/generate-timings")
async def generate_timings(request: WordTimingRequest):
    """Generate word timings for text-to-speech audio."""
    try:
        logger.info(f"Generating word timings for text of length {len(request.text)}")
        
        # Generate word timings using the existing functionality
        timings = await generate_word_timings(
            request.text,
            request.audio_duration,
            request.nodes
        )
        
        return {"timings": timings}
    except Exception as e:
        logger.error(f"Error generating word timings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating word timings: {str(e)}")

@app.post("/api/tts/stream")
async def tts_stream(request: Request):
    """Stream text-to-speech audio as binary chunks."""
    try:
        # Parse the request body
        body = await request.json()
        text = body.get("text")
        voice = body.get("voice", "alloy")
        
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")
        
        logger.info(f"Streaming TTS for text of length {len(text)}")
        
        # Create a response that streams the audio
        from starlette.responses import StreamingResponse
        
        async def audio_generator():
            async for chunk in stream_text_to_speech(text, voice):
                yield chunk
        
        return StreamingResponse(
            audio_generator(),
            media_type="audio/mpeg"
        )
    except Exception as e:
        logger.error(f"Error streaming TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error streaming TTS: {str(e)}")

@app.post("/api/doubt/process")
async def process_doubt(request: DoubtRequest):
    """Process a doubt and generate a response."""
    try:
        logger.info(f"Processing doubt: {request.doubt}")
        
        # Here you would call your doubt processing logic
        # For now, we'll just return a mock response
        
        return {
            "type": "response_data",
            "content": {
                "explanation": f"Response to: {request.doubt}",
                "highlightElements": []
            }
        }
    except Exception as e:
        logger.error(f"Error processing doubt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing doubt: {str(e)}")

def find_available_port(start_port=8001, max_attempts=100):
    """Find an available port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('0.0.0.0', port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"Could not find an available port after {max_attempts} attempts")

def handle_stdin_input():
    """Handle input from stdin for doubt processing."""
    try:
        # Read a single line from stdin
        input_data = sys.stdin.readline().strip()
        if not input_data:
            logger.error("No input received from stdin")
            return
        
        # Parse the JSON input
        data = json.loads(input_data)
        
        # Process the doubt
        topic = data.get('topic', '')
        doubt = data.get('doubt', '')
        current_state = data.get('current_state', {})
        
        logger.info(f"Processing doubt from stdin: {doubt}")
        
        # Here you would call your doubt processing logic
        # For now, we'll just print a mock response
        
        # Send text chunk response - make sure to flush after each print
        response = {
            "type": "text_chunk",
            "content": f"Processing your doubt about {topic}: {doubt}"
        }
        print(json.dumps(response), flush=True)
        
        # Small delay to ensure outputs are separated
        time.sleep(0.1)
        
        # Send a mock response data
        response_data = {
            "type": "response_data",
            "content": {
                "explanation": f"Here is the answer to your question about {topic}: {doubt}",
                "highlightElements": []
            }
        }
        print(json.dumps(response_data), flush=True)
        
        # Small delay to ensure outputs are separated
        time.sleep(0.1)
        
        # Send an end signal
        end_signal = {
            "type": "end",
            "content": {}
        }
        print(json.dumps(end_signal), flush=True)
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON input: {str(e)}")
        error_response = {
            "type": "error",
            "content": f"Error parsing input: {str(e)}"
        }
        print(json.dumps(error_response), flush=True)
    except Exception as e:
        logger.error(f"Error processing doubt from stdin: {str(e)}")
        error_response = {
            "type": "error",
            "content": f"Error: {str(e)}"
        }
        print(json.dumps(error_response), flush=True)

if __name__ == "__main__":
    if args.mode == 'doubt':
        # Run in doubt processing mode (read from stdin)
        handle_stdin_input()
    else:
        # Run the FastAPI app with uvicorn
        port = args.port
        if port == 0:
            # Find an available port
            port = find_available_port()
        
        logger.info(f"Starting Socket.IO Bridge on port {port}")
        uvicorn.run(app, host="0.0.0.0", port=port) 