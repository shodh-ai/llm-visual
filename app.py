#app.py
from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from openai import OpenAI
from anthropic import Anthropic
from animation_generator import AnimationGenerator
import os
from dotenv import load_dotenv
import logging
import json
from pathlib import Path
import tempfile
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
from flask import jsonify
import requests
import hashlib

logging.basicConfig(level=logging.INFO)
load_dotenv()

app = FastAPI(
    title="Database Visualization API",
    description="API for database visualization and narration",
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

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open('static/index.html') as f:
        return f.read()

# Initialize API clients
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
anthropic_client = Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

# Create directory for audio files
AUDIO_DIR = Path('static/audio')
AUDIO_DIR.mkdir(exist_ok=True)

class Property(BaseModel):
    name: str
    type: Optional[str] = None
    isPrimary: bool = False
    isForeign: bool = False

class NodeProperty(BaseModel):
    name: str
    type: str

class VisualizationNode(BaseModel):
    id: str
    name: str
    type: Optional[str] = None
    properties: Optional[Union[List[str], List[NodeProperty]]] = None
    columns: Optional[List[Property]] = None
    attributes: Optional[List[dict]] = None
    document: Optional[dict] = None

class VisualizationEdge(BaseModel):
    source: str
    target: str
    type: str
    description: Optional[str] = None

class VisualizationRequest(BaseModel):
    topic: str

class WordTiming(BaseModel):
    word: str
    start_time: int = Field(description="Time in milliseconds from start")
    end_time: int = Field(description="Time in milliseconds from start")
    node_id: Optional[Union[str, List[str]]] = Field(None, description="ID of the node(s) to highlight")

class AnimationState(BaseModel):
    component_id: str
    state: Dict[str, Any]
    duration: int = Field(description="Duration in milliseconds")

class VisualizationData(BaseModel):
    nodes: List[VisualizationNode]
    edges: List[VisualizationEdge]
    jsx_code: str
    topic: str
    narration: Optional[str] = None
    narration_timestamps: Optional[List[WordTiming]] = None
    animation_states: Optional[List[AnimationState]] = None
    node_id: Optional[str] = Field(None, description="ID of node to highlight")

class DoubtRequest(BaseModel):
    topic: str
    doubt: str
    current_time: Optional[int] = None
    current_state: Optional[dict] = None

class NarrationData(BaseModel):
    audio_url: str
    duration: int = Field(description="Total duration in milliseconds")
    word_timings: List[WordTiming]
    script: str

class DoubtResponse(BaseModel):
    narration: Optional[str] = None
    narration_timestamps: Optional[List[WordTiming]] = None
    nodes: Optional[List[VisualizationNode]] = None
    edges: Optional[List[VisualizationEdge]] = None
    highlights: Optional[List[str]] = None
    jsx_code: Optional[str] = None

def load_visualization_data(topic: str) -> VisualizationData:
    """Load visualization data and JSX code for a specific topic"""
    data_path = Path('static/data') / f'{topic}_visualization.json'
    script_path = Path('static/data') / f'{topic}_script.json'
    jsx_path = Path('src/components') / f'{topic}Visualization.jsx'
    
    with open(data_path) as f:
        data = json.load(f)
        
    # Load narration script and generate animation steps if available
    narration = None
    animation_steps = None
    if script_path.exists():
        with open(script_path) as f:
            script_data = json.load(f)
            narration = script_data.get('script')
            
            # Generate animation steps using OpenAI
            if narration:
                try:
                    generator = AnimationGenerator()
                    animation_steps = generator.generate_animation_timestamps(
                        narration=narration,
                        visualization_data={'nodes': data['nodes'], 'edges': data['edges']}
                    )
                except Exception as e:
                    logging.error(f"Error generating animation steps: {e}")
                    animation_steps = []
    
    jsx_code = ""
    if jsx_path.exists():
        with open(jsx_path) as f:
            jsx_code = f.read()
    
    nodes = []
    for n in data['nodes']:
        if topic == 'schema':
            node_data = {
                'id': n['id'],
                'name': n['name'],
                'columns': [Property(**col) for col in n['columns']]
            }
        elif topic == 'er':
            node_data = {
                'id': n['id'],
                'name': n['name'],
                'type': n.get('type'),
                'attributes': n.get('attributes', [])
            }
        else:
            node_data = {
                'id': n['id'],
                'name': n['name'],
                'type': n.get('type'),
                'properties': n.get('properties', [])
            }
        nodes.append(VisualizationNode(**node_data))
    
    return VisualizationData(
        nodes=nodes,
        edges=[VisualizationEdge(**e) for e in data['edges']],
        jsx_code=jsx_code,
        topic=topic,
        narration=narration,
        animation_states=[AnimationState(
            component_id=step['nodeIds'][0],
            state={'highlighted': True},
            duration=int(step['duration'] * 1000)
        ) for step in (animation_steps or [])]
    )

def load_narration_script(topic: str) -> Dict:
    """Load the narration script with component mappings"""
    # First try with _script.json suffix
    script_path = Path('static/data') / f'{topic}_script.json'
    if not script_path.exists():
        # Fallback to just script.json
        script_path = Path('static/data') / 'parallel_db_script.json'
        if not script_path.exists():
            raise FileNotFoundError(f"No script file found for topic {topic}")
    
    with open(script_path) as f:
        return json.load(f)

def generate_word_timings(text: str, audio_duration: int) -> List[WordTiming]:
    """Generate word-level timings for the narration"""
    words = text.split()
    avg_word_duration = audio_duration / len(words)
    
    timings = []
    current_time = 0
    
    for word in words:
        # Adjust duration based on word length
        word_duration = avg_word_duration * (len(word) / 5)  # 5 is average word length
        timings.append(WordTiming(
            word=word,
            start_time=int(current_time),
            end_time=int(current_time + word_duration)
        ))
        current_time += word_duration
    
    return timings

@app.post("/api/visualization", response_model=VisualizationData, tags=["Visualization"])
async def get_visualization(request: VisualizationRequest):
    """Get visualization data, JSX code, narration and animation timestamps for a specific topic"""
    logging.info(f"Received visualization request for topic: {request.topic}")
    
    valid_topics = [
        'schema', 'parallel_db', 'hierarchical', 'network', 'er', 'document', 'history', 'xml', 
        'entity', 'attribute', 'shared_memory', 'shared_disk', 'shared_nothing', 'distributed_database', 
        'oop_concepts', 'relational', 'relationalQuery', 'normalization', 'activedb', 'queryprocessing', 
        'mobiledb', 'gis', 'pestel', 'portersfiveforces', 'swot', 'industrylifecycle', 'marketstructures', 'strategicintent']
    
    if request.topic not in valid_topics:
        error_msg = f"Invalid topic '{request.topic}'. Must be one of: {', '.join(valid_topics)}"
        logging.error(error_msg)
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        # Load visualization data
        data = load_visualization_data(request.topic)
        
        # Load JSX code
        jsx_path = Path('src/components') / f'{request.topic.capitalize()}Visualization.jsx'
        if not jsx_path.exists():
            jsx_path = Path('static/js') / f'{request.topic}Visualization.jsx'
        
        if not jsx_path.exists():
            error_msg = f"JSX code not found for topic '{request.topic}'"
            logging.error(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        
        with open(jsx_path) as f:
            jsx_code = f.read()
            
            # For test visualization, use a simple component
            if request.topic == 'test':
                jsx_code = '''
                (props) => {
                    const { data } = props;
                    return React.createElement(
                        "div",
                        { 
                            style: { 
                                width: "100%", 
                                height: "100%", 
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                fontSize: "24px",
                                color: "#4299e1"
                            }
                        },
                        `${data.nodes.length} Nodes and ${data.edges.length} Edges`
                    );
                }
                '''.strip()
            else:
                # Extract the component definition for other components
                import re
                component_match = re.search(r'const\s+\w+\s*=\s*\(\s*props\s*\)\s*=>\s*{([^}]+)}', jsx_code)
                if component_match:
                    # Get the component body and clean it up
                    component_body = component_match.group(1).strip()
                    # Remove any return statement if present
                    component_body = re.sub(r'^\s*return\s+', '', component_body)
                    jsx_code = component_body
            
        # Load narration text and timestamps
        narration = None
        narration_timestamps = None
        animation_states = None
        try:
            script_data = load_narration_script(request.topic)
            narration = script_data.get('script', '')
            narration_timestamps = script_data.get('narration_timestamps', [])
            
            # Handle both node_id and node_ids in the timestamps
            if narration_timestamps:
                for timestamp in narration_timestamps:
                    if 'node_ids' in timestamp and 'node_id' not in timestamp:
                        timestamp['node_id'] = timestamp.pop('node_ids')
            
            animation_states = script_data.get('animation_states', [])
            
            # Validate that timestamps and animation states are properly synced
            if len(narration_timestamps) != len(animation_states):
                logging.warning(f"Mismatch between narration timestamps and animation states for topic: {request.topic}")
            
            logging.info(f"Successfully loaded narration and animation data for topic: {request.topic}")
        except FileNotFoundError:
            logging.warning(f"No narration script found for topic: {request.topic}")
        except Exception as e:
            logging.error(f"Error loading narration for topic {request.topic}: {str(e)}")
        
        response_data = VisualizationData(
            nodes=data.nodes,
            edges=data.edges,
            jsx_code=jsx_code,  
            topic=request.topic,
            narration=narration,
            narration_timestamps=narration_timestamps,
            animation_states=animation_states
        )
        
        logging.info(f"Successfully loaded visualization data and JSX code for topic: {request.topic}")
        return response_data
        
    except FileNotFoundError as e:
        error_msg = f"Visualization data not found for topic '{request.topic}': {str(e)}"
        logging.error(error_msg)
        raise HTTPException(status_code=404, detail=error_msg)
    except Exception as e:
        error_msg = f"Error loading visualization for topic '{request.topic}': {str(e)}"
        logging.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/narration/{topic}", response_model=NarrationData, tags=["Narration"])
async def generate_narration(topic: str, request: Request):
    try:
      
        if topic not in ['schema', 'parallel_db', 'hierarchical', 'network', 'er', 'document', 'history', 'xml', 'entity', 'attribute', 'shared_memory', 'shared_disk', 'shared_nothing', 'distributed_database', 'oop_concepts', 'relational', 'relationalQuery', 'normalization', 'activedb', 'queryprocessing', 'mobiledb', 'gis', 'pestel', 'portersfiveforces', 'swot', 'industrylifecycle', 'marketstructures', 'strategicintent']:            
          raise HTTPException(status_code=400, detail="Invalid topic")

        # Load the narration script
        script_data = load_narration_script(topic)
        script = script_data['script']
        component_mappings = script_data.get('component_mappings', {})

        # Generate audio using OpenAI's text-to-speech
        audio_response = openai_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=script
        )

        # Get request body
        try:
            body = await request.json()
            logging.info(f"Request body: {body}")
        except json.JSONDecodeError as e:
            logging.error(f"JSON decode error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON in request body: {str(e)}")

        text = body.get('text')
        if not text:
            logging.error("No text provided in request body")
            raise HTTPException(status_code=400, detail="Text is required in request body")

        # Create a hash of the text to use as a unique identifier
        text_hash = hashlib.md5(text.encode()).hexdigest()
        cached_audio_filename = f'{topic}_narration_{text_hash}.mp3'
        cached_audio_path = AUDIO_DIR / cached_audio_filename

        # Check if audio file already exists
        if cached_audio_path.exists():
            logging.info(f"Found existing audio file: {cached_audio_filename}")
            
            # Calculate duration and generate word timings
            words = text.split()
            word_count = len(words)
            duration_ms = int((word_count / 150) * 60 * 1000)  # Convert to milliseconds

            # Load visualization data for node highlighting
            try:
                visualization_data = load_visualization_data(topic)
                nodes = visualization_data.nodes
            except Exception as e:
                logging.warning(f"Could not load visualization data for highlighting: {e}")
                nodes = []

            # Generate word timings
            word_timings = []
            current_time = 0
            
            for word in words:
                word_duration = (len(word) / 5) * (duration_ms / word_count)
                if word.endswith(('.', '!', '?', ',')):
                    word_duration *= 1.5
                
                node_id = find_node_for_word(word, nodes)
                
                timing = WordTiming(
                    word=word,
                    start_time=int(current_time),
                    end_time=int(current_time + word_duration),
                    node_id=node_id
                )
                
                word_timings.append(timing)
                current_time += word_duration

            # Construct the audio URL using the request base URL
            base_url = str(request.base_url)
            audio_url = f"{base_url}static/audio/{cached_audio_filename}"
            
            response_data = NarrationData(
                audio_url=audio_url,
                duration=int(current_time),
                word_timings=word_timings,
                script=text
            )
            logging.info(f"Using cached audio file: {audio_url}")
            return response_data

        logging.info(f"Generating new audio for topic {topic} with text length: {len(text)}")

        # Check for OpenAI API key
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            logging.error("OpenAI API key not configured")
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        logging.info("OpenAI API key found, proceeding with audio generation")

        try:
            # Generate audio using OpenAI's text-to-speech
            logging.info("Calling OpenAI TTS API...")
            audio_response = openai_client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=text,
                speed=1.0
            )
            logging.info("Successfully received audio from OpenAI")

            # Save audio file with text hash
            logging.info(f"Saving audio to {cached_audio_path}")
            with open(cached_audio_path, 'wb') as f:
                f.write(audio_response.content)
            logging.info("Successfully saved audio file")

            # Rest of the existing code for duration calculation and word timing generation
            words = text.split()
            word_count = len(words)
            duration_ms = int((word_count / 150) * 60 * 1000)

            try:
                visualization_data = load_visualization_data(topic)
                nodes = visualization_data.nodes
            except Exception as e:
                logging.warning(f"Could not load visualization data for highlighting: {e}")
                nodes = []

            word_timings = []
            current_time = 0
            
            for word in words:
                word_duration = (len(word) / 5) * (duration_ms / word_count)
                if word.endswith(('.', '!', '?', ',')):
                    word_duration *= 1.5
                
                node_id = find_node_for_word(word, nodes)
                
                timing = WordTiming(
                    word=word,
                    start_time=int(current_time),
                    end_time=int(current_time + word_duration),
                    node_id=node_id
                )
                
                word_timings.append(timing)
                current_time += word_duration

            base_url = str(request.base_url)
            audio_url = f"{base_url}static/audio/{cached_audio_filename}"
            
            response_data = NarrationData(
                audio_url=audio_url,
                duration=int(current_time),
                word_timings=word_timings,
                script=text
            )
            logging.info(f"Audio URL generated: {audio_url}")
            return response_data

        except Exception as e:
            logging.error(f'Error in OpenAI API call or audio processing: {str(e)}')
            # Clean up any partially created files
            if cached_audio_path.exists():
                cached_audio_path.unlink()
            raise HTTPException(status_code=500, detail=f"Error generating audio: {str(e)}")

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f'Unexpected error in narration endpoint: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/static/audio/{filename}")
async def serve_audio(filename: str):
    """Serve generated audio files"""
    file_path = AUDIO_DIR / filename
    if not file_path.exists():
        logging.error(f"Audio file not found: {file_path}")
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=filename
    )

@app.get("/api/highlights/{topic}/{timestamp}", tags=["Highlights"])
def get_highlights(topic: str, timestamp: int):
    """Get component highlights for a specific timestamp"""
    try:
        if topic not in ['schema', 'parallel_db', 'hierarchical', 'network', 'er', 'document', 'history', 'xml', 'entity', 'attribute', 'shared_memory', 'shared_disk', 'shared_nothing', 'distributed_database', 'oop_concepts', 'relational', 'relationalQuery', 'normalization', 'activedb', 'queryprocessing', 'mobiledb', 'gis', 'pestel', 'portersfiveforces', 'swot', 'industrylifecycle', 'marketstructures', 'strategicintent']:

            return JSONResponse(status_code=400, content={'error': 'Invalid topic'})
        # Load narration script to get component mappings and word timings
        script_data = load_narration_script(topic)
        component_mappings = script_data.get('component_mappings', {})
        
        # Generate word timings for the script
        script = script_data['script']
        audio_duration = 30000  # Placeholder duration
        word_timings = generate_word_timings(script, audio_duration)
        
        # Find words being spoken at the current timestamp
        active_components = set()
        for timing in word_timings:
            if timing.start_time <= timestamp <= timing.end_time:
                word_lower = timing.word.lower()
                if word_lower in component_mappings:
                    node_id = component_mappings[word_lower]
                    active_components.add(node_id)
        
        # Format response
        highlights = [
            {
                'node_id': node_id,
                'highlight_type': 'primary',
                'duration': 1000  # Duration to keep highlight visible
            }
            for node_id in active_components
        ]

        return jsonify({'active_components': highlights})

    except FileNotFoundError:
        return jsonify({'error': 'Component mapping not found'}), 404
    except Exception as e:
        logging.error(f'Error getting highlights: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@app.post("/api/doubt", response_model=DoubtResponse)
async def handle_doubt(request: DoubtRequest):
    try:
        # Load the current visualization data
        try:
            current_data = load_visualization_data(request.topic)
            if not current_data:
                raise HTTPException(status_code=404, detail=f"Visualization data not found for topic: {request.topic}")
        except Exception as e:
            logging.error(f"Error loading visualization data: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error loading visualization data: {str(e)}")
        
        # Create a description of the visualization
        try:
            viz_description = f"This is a visualization of {request.topic} with the following components:\n"
            for node in current_data.nodes:
                node_desc = f"- {node.id}: {node.name}"
                if node.type:
                    node_desc += f" (type: {node.type})"
                viz_description += node_desc + "\n"
            
            # Add edge relationships
            viz_description += "\nRelationships between components:\n"
            for edge in current_data.edges:
                viz_description += f"- {edge.source} is connected to {edge.target}"
                if edge.type:
                    viz_description += f" ({edge.type})"
                viz_description += "\n"
        except Exception as e:
            logging.error(f"Error creating visualization description: {str(e)}")
            viz_description = f"A visualization about {request.topic}"

        # Prepare the context for the AI
        context = {
            "topic": request.topic,
            "doubt": request.doubt,
            "current_time": request.current_time,
            "current_state": request.current_state or {},
            "visualization_description": viz_description
        }
        
        try:
            # Process the doubt using Claude
            response = anthropic_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=2000,
                temperature=0.7,
                system="""You are an expert in database visualization and education. Your task is to:
1. Provide clear, detailed explanations of database concepts
2. Identify relevant components in visualizations
3. Suggest visual highlights to emphasize important elements
4. Give practical examples and analogies
5. Make recommendations for better understanding

Format your response in JSON with these sections:
{
    "explanation": "Main detailed explanation",
    "additionalInfo": "Additional context and background",
    "componentDetails": {
        "componentName": "Specific details about this component",
        ...
    },
    "examples": ["Practical example 1", "Example 2", ...],
    "recommendations": ["Recommendation 1", "Recommendation 2", ...],
    "highlightElements": [
        {
            "id": "component_id",
            "type": "highlight",
            "emphasis": "normal|strong|subtle"
        },
        ...
    ]
}

IMPORTANT: If you need to include any JSX code in your response, use React.createElement() syntax instead of JSX tags.
For example, instead of:
<div className="example">Hello</div>

Use:
React.createElement("div", { className: "example" }, "Hello")
""",
                messages=[{
                    "role": "user",
                    "content": f"""I'm looking at a visualization about {request.topic}. Here's my question: {request.doubt}
                    
Visualization structure:
{viz_description}

Current state:
{json.dumps(context['current_state'], indent=2)}

Please help me understand this better by:
1. Providing a clear explanation
2. Suggesting which elements should be highlighted
3. If needed, suggesting modifications to the visualization

Respond in JSON format with these fields:
- explanation: Your explanation text
- highlights: List of node IDs to highlight
- modifications: Any suggested modifications to nodes/edges (or null if none)
- new_narration: Updated narration text (or null if no change needed)"""
                }]
            )
            
            # Parse the AI response
            try:
                ai_response = json.loads(response.content[0].text)
            except json.JSONDecodeError:
                # Fallback to just using the explanation if JSON parsing fails
                ai_response = {
                    "explanation": response.content[0].text,
                    "highlights": [],
                    "modifications": None,
                    "new_narration": None
                }
        except Exception as e:
            logging.error(f"Error processing doubt with AI: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing doubt with AI: {str(e)}")
        
        try:
            # Prepare the response
            # Check if the response is already a JSON string and parse it if needed
            if isinstance(ai_response, str):
                try:
                    ai_response = json.loads(ai_response)
                except json.JSONDecodeError:
                    ai_response = {"explanation": ai_response}
            
            # Extract highlights from highlightElements if present
            highlights = []
            if "highlightElements" in ai_response:
                highlights = [item["id"] for item in ai_response["highlightElements"] if "id" in item]
            elif "highlights" in ai_response:
                highlights = ai_response["highlights"]
            
            # Prepare a formatted narration from the AI response
            formatted_narration = ""
            if "explanation" in ai_response:
                formatted_narration += ai_response["explanation"] + "\n\n"
            
            if "additionalInfo" in ai_response and ai_response["additionalInfo"]:
                formatted_narration += ai_response["additionalInfo"] + "\n\n"
                
            if "componentDetails" in ai_response and ai_response["componentDetails"]:
                formatted_narration += "Key Components:\n"
                for comp_name, comp_details in ai_response["componentDetails"].items():
                    details = comp_details if isinstance(comp_details, str) else comp_details.get("description", "")
                    formatted_narration += f"• {comp_name}: {details}\n"
                formatted_narration += "\n"
                
            if "examples" in ai_response and ai_response["examples"]:
                formatted_narration += "Examples:\n"
                for i, example in enumerate(ai_response["examples"]):
                    formatted_narration += f"{i+1}. {example}\n"
                formatted_narration += "\n"
                
            if "recommendations" in ai_response and ai_response["recommendations"]:
                formatted_narration += "Recommendations:\n"
                for rec in ai_response["recommendations"]:
                    formatted_narration += f"• {rec}\n"
            
            # Use the formatted narration or fallback to the original response
            narration_text = formatted_narration.strip() or ai_response.get("new_narration") or ai_response.get("explanation", "No explanation provided")
            
            doubt_response = DoubtResponse(
                narration=narration_text,
                highlights=highlights,
                jsx_code=current_data.jsx_code
            )
            
            # Apply any suggested modifications to the visualization
            if ai_response.get("modifications"):
                try:
                    modified_data = apply_modifications(current_data.__dict__, ai_response["modifications"])
                    doubt_response.nodes = [VisualizationNode(**node) for node in modified_data["nodes"]]
                    doubt_response.edges = [VisualizationEdge(**edge) for edge in modified_data["edges"]]
                except Exception as e:
                    logging.error(f"Error applying modifications: {str(e)}")
                    # Continue without modifications if they fail
                
                # Generate new narration timestamps if needed
                if doubt_response.narration:
                    try:
                        doubt_response.narration_timestamps = generate_word_timings(
                            doubt_response.narration,
                            len(doubt_response.narration.split()) * 500 
                        )
                    except Exception as e:
                        logging.error(f"Error generating word timings: {str(e)}")
            
            return doubt_response
            
        except Exception as e:
            logging.error(f"Error preparing response: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error preparing response: {str(e)}")
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Unexpected error in handle_doubt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    except Exception as e:
        logging.error(f"Error handling doubt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def apply_modifications(current_data: dict, modifications: dict) -> dict:
    """Apply modifications to the visualization data"""
    # Create a deep copy to avoid modifying the original data
    modified_data = json.loads(json.dumps(current_data))
    
    if modifications.get("nodes"):
        # Update existing nodes or add new ones
        node_map = {node["id"]: node for node in modified_data["nodes"]}
        for mod_node in modifications["nodes"]:
            if mod_node["id"] in node_map:
                node_map[mod_node["id"]].update(mod_node)
            else:
                modified_data["nodes"].append(mod_node)
    
    if modifications.get("edges"):
        # Update existing edges or add new ones
        edge_map = {(edge["source"], edge["target"]): edge for edge in modified_data["edges"]}
        for mod_edge in modifications["edges"]:
            key = (mod_edge["source"], mod_edge["target"])
            if key in edge_map:
                edge_map[key].update(mod_edge)
            else:
                modified_data["edges"].append(mod_edge)
    
    return modified_data

def find_node_for_word(word: str, nodes: List[VisualizationNode]) -> Optional[str]:
    """Find a node ID that matches the word being spoken"""
    word_lower = word.lower()
    
    # First try exact matches with node names
    for node in nodes:
        if node.name.lower() == word_lower:
            return node.id
            
    # Then try partial matches
    for node in nodes:
        if word_lower in node.name.lower():
            return node.id
            
    # Try matching with node types
    for node in nodes:
        if node.type and word_lower in node.type.lower():
            return node.id
            
    return None

@app.post("/api/process-doubt")
async def process_doubt(request: Request):
    try:
        data = await request.json()
        doubt = data.get('doubt')
        topic = data.get('topic')
        current_state = data.get('currentState', {})
        relevant_nodes = data.get('relevantNodes', [])
        
        # Prepare visualization context
        visualization_context = f"""
Current Topic: {topic}
Current Visualization State:
- Highlighted Elements: {current_state.get('highlightedElements', [])}
- Current Time: {current_state.get('currentTime', 0)}ms
- Is Original Narration: {current_state.get('isOriginalNarration', True)}

Relevant Components:
{json.dumps(relevant_nodes, indent=2)}

Current Narration:
{current_state.get('currentNarration', '')}
"""

        # Generate response using Claude
        try:
            response = anthropic_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=2000,
                temperature=0.7,
                system="""You are an expert in database visualization and education. Your task is to:
1. Provide clear, detailed explanations of database concepts
2. Identify relevant components in visualizations
3. Suggest visual highlights to emphasize important elements
4. Give practical examples and analogies
5. Make recommendations for better understanding

Format your response in JSON with these sections:
{
    "explanation": "Main detailed explanation",
    "additionalInfo": "Additional context and background",
    "componentDetails": {
        "componentName": "Specific details about this component",
        ...
    },
    "examples": ["Practical example 1", "Example 2", ...],
    "recommendations": ["Recommendation 1", "Recommendation 2", ...],
    "highlightElements": [
        {
            "id": "component_id",
            "type": "highlight",
            "emphasis": "normal|strong|subtle"
        },
        ...
    ]
}

IMPORTANT: If you need to include any JSX code in your response, use React.createElement() syntax instead of JSX tags.
For example, instead of:
<div className="example">Hello</div>

Use:
React.createElement("div", { className: "example" }, "Hello")
""",
                messages=[{
                    "role": "user",
                    "content": f"""User Question: {doubt}

Visualization Context:
{visualization_context}

Please provide a comprehensive response that:
1. Directly answers the user's question
2. Explains relevant concepts in detail
3. References specific components in the visualization
4. Provides practical examples
5. Makes recommendations for deeper understanding
6. Suggests which elements to highlight in the visualization"""
                }]
            )
            
            # Parse Claude's response
            try:
                ai_response = json.loads(response.content[0].text)
            except json.JSONDecodeError:
                # Fallback to basic response if JSON parsing fails
                ai_response = {
                    "explanation": response.content[0].text,
                    "highlightElements": []
                }

            # Enhance the response with additional processing
            enhanced_response = enhance_response(ai_response, topic, relevant_nodes)
            
            return JSONResponse(content=enhanced_response)

        except Exception as e:
            logging.error(f"Error generating AI response: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

    except Exception as e:
        logging.error(f"Error processing doubt: {str(e)}")
        return JSONResponse(
            content={
                "error": str(e),
                "explanation": "I apologize, but I encountered an error processing your question. Please try rephrasing it.",
                "highlightElements": []
            },
            status_code=500
        )

def enhance_response(ai_response: dict, topic: str, relevant_nodes: list) -> dict:
    """Enhance the AI response with additional processing"""
    enhanced = ai_response.copy()

    if "highlightElements" in enhanced:
        for i, highlight in enumerate(enhanced["highlightElements"]):
            highlight["duration"] = 2000  
            highlight["delay"] = i * 1000 

    if "componentDetails" in enhanced:
        for component, details in enhanced["componentDetails"].items():
            matching_node = next((node for node in relevant_nodes if node["id"] == component), None)
            if matching_node:
                enhanced["componentDetails"][component] = {
                    "description": details if isinstance(details, str) else details.get("description", str(details)),
                    "type": matching_node.get("type", "default"),
                    "properties": matching_node.get("properties", [])
                }

    # Add section for related concepts
    if topic in TOPIC_RELATIONSHIPS:
        enhanced["relatedConcepts"] = TOPIC_RELATIONSHIPS[topic]

    # Add interactive elements suggestions
    enhanced["interactiveElements"] = suggest_interactive_elements(topic, enhanced.get("explanation", ""))

    return enhanced

def suggest_interactive_elements(topic: str, explanation: str) -> list:
    """Suggest interactive elements based on the topic and explanation"""
    suggestions = []
    
    # Add zoom suggestions for complex diagrams
    if any(word in explanation.lower() for word in ["architecture", "structure", "layout"]):
        suggestions.append({
            "type": "zoom",
            "message": "You can zoom in to see more details of this component"
        })

    # Add click suggestions for components mentioned in explanation
    if any(word in explanation.lower() for word in ["click", "select", "choose"]):
        suggestions.append({
            "type": "click",
            "message": "Click on components to see more details"
        })

    # Add animation suggestions for process explanations
    if any(word in explanation.lower() for word in ["process", "flow", "sequence"]):
        suggestions.append({
            "type": "animate",
            "message": "Watch the animation to see how this process works"
        })

    return suggestions

# Topic relationships for suggesting related concepts
TOPIC_RELATIONSHIPS = {
    "shared_memory": [
        "parallel_processing",
        "cache_coherence",
        "memory_consistency",
        "distributed_systems"
    ],
    "distributed_database": [
        "data_replication",
        "consistency_models",
        "transaction_management",
        "distributed_query_processing"
    ],
    # Add more topics as needed
}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
