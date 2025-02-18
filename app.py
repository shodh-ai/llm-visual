from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from openai import OpenAI
from anthropic import Anthropic
import os
from dotenv import load_dotenv
import logging
import json
from pathlib import Path
import tempfile
from typing import Dict, List, Optional, Union
from datetime import datetime

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
# openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
# anthropic_client = Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

# Create directory for audio files
AUDIO_DIR = Path('static/audio')
AUDIO_DIR.mkdir(exist_ok=True)

class Property(BaseModel):
    name: str
    type: Optional[str] = None
    isPrimary: bool = False
    isForeign: bool = False

class VisualizationNode(BaseModel):
    id: str
    name: str
    type: Optional[str] = None
    properties: Optional[List[str]] = None
    columns: Optional[List[Property]] = None

class VisualizationEdge(BaseModel):
    source: str
    target: str
    type: Optional[str] = None
    description: Optional[str] = None

class VisualizationData(BaseModel):
    nodes: List[VisualizationNode]
    edges: List[VisualizationEdge]
    js_code: Optional[str] = None

class WordTiming(BaseModel):
    word: str
    start_time: int = Field(description="Time in milliseconds from start")
    end_time: int = Field(description="Time in milliseconds from start")
    node_id: Optional[str] = Field(None, description="ID of node to highlight")

class NarrationData(BaseModel):
    audio_url: str
    duration: int = Field(description="Total duration in milliseconds")
    word_timings: List[WordTiming]
    script: str

def load_visualization_data(topic: str) -> VisualizationData:
    """Load visualization data and JavaScript code for a specific topic"""
    data_path = Path('static/data') / f'{topic}_visualization.json'
    js_path = Path('static/js') / f'{topic}_visualization.js'
    
    with open(data_path) as f:
        data = json.load(f)
    
    js_code = ""
    if js_path.exists():
        with open(js_path) as f:
            js_code = f.read()
    
    # Process nodes based on topic type
    nodes = []
    for n in data['nodes']:
        if topic == 'schema':
            # Convert properties to Property objects for schema visualization
            node_data = {
                'id': n['id'],
                'name': n['name'],
                'columns': [Property(**col) for col in n['columns']]
            }
        else:
            # For parallel_db and other visualizations, use properties as is
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
        js_code=js_code
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

@app.get("/api/visualization/{topic}", response_model=VisualizationData, tags=["Visualization"])
async def get_visualization(topic: str):
    """Get visualization data and JavaScript code for a specific topic"""
    if topic not in ['schema', 'parallel_db', 'intro_to_normalization', 'normal_form_types']:
        raise HTTPException(status_code=400, detail="Invalid topic")
    
    try:
        data = load_visualization_data(topic)
        return data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Visualization data not found")
    except Exception as e:
        logging.error(f"Error loading visualization: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/narration/{topic}", response_model=NarrationData, tags=["Narration"])
async def generate_narration(topic: str):
    """Generate narration for a specific topic"""
    try:
        if topic not in ['schema', 'parallel_db']:
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

        # Save audio file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        audio_filename = f'{topic}_narration_{timestamp}.mp3'
        audio_path = AUDIO_DIR / audio_filename
        
        with open(audio_path, 'wb') as f:
            f.write(audio_response.content)

        # Generate word timings
        audio_duration = 30000  # Placeholder: Get actual duration from audio file
        word_timings = generate_word_timings(script, audio_duration)

        # Add node highlighting information
        for timing in word_timings:
            word_lower = timing.word.lower()
            if word_lower in component_mappings:
                timing.node_id = component_mappings[word_lower]

        return NarrationData(
            audio_url=f'/api/audio/{audio_filename}',
            duration=audio_duration,
            word_timings=word_timings,
            script=script
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Narration script not found")
    except Exception as e:
        logging.error(f'Error generating narration: {e}')
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/audio/{filename}", tags=["Audio"])
async def serve_audio(filename: str):
    """Serve generated audio files"""
    file_path = AUDIO_DIR / filename
    if not file_path.exists():
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
        if topic not in ['schema', 'parallel_db']:
            return jsonify({'error': 'Invalid topic'}), 400

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


