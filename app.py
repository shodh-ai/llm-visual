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

class VisualizationData(BaseModel):
    nodes: List[VisualizationNode]
    edges: List[VisualizationEdge]
    jsx_code: str
    topic: str
    narration: Optional[str] = None

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
    """Load visualization data and JSX code for a specific topic"""
    data_path = Path('static/data') / f'{topic}_visualization.json'
    jsx_path = Path('static/js') / f'{topic}Visualization.jsx'
    
    with open(data_path) as f:
        data = json.load(f)
    
    jsx_code = ""
    if jsx_path.exists():
        with open(jsx_path) as f:
            jsx_code = f.read()
    
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
        elif topic == 'er':
            # For ER visualization, include attributes
            node_data = {
                'id': n['id'],
                'name': n['name'],
                'type': n.get('type'),
                'attributes': n.get('attributes', [])
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
        jsx_code=jsx_code,
        topic=topic
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
    """Get visualization data, JSX code, and narration for a specific topic"""
    logging.info(f"Received visualization request for topic: {request.topic}")
    
    valid_topics = ['schema', 'parallel_db', 'hierarchical', 'network', 'er', 'document', 'history', 'xml', 'relational','relationalQuery', "normalization", "activedb", "queryprocessing", "mobiledb"]

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
            
        # Load narration text
        narration = None
        try:
            script_data = load_narration_script(request.topic)
            narration = script_data.get('script', '')
            logging.info(f"Successfully loaded narration for topic: {request.topic}")
        except FileNotFoundError:
            logging.warning(f"No narration script found for topic: {request.topic}")
        except Exception as e:
            logging.error(f"Error loading narration for topic {request.topic}: {str(e)}")
        
        # Create response with data, JSX code, and narration
        response_data = VisualizationData(
            nodes=data.nodes,
            edges=data.edges,
            jsx_code=jsx_code,  # Now contains just the component's render logic
            topic=request.topic,
            narration=narration
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
async def generate_narration(topic: str):
    """Generate narration for a specific topic"""
    try:
        if topic not in ['schema', 'parallel_db', 'hierarchical', 'network', 'er', 'document', 'history', 'xml', 'relational','relationalQuery', "normalization", "activedb", "queryprocessing", "mobiledb"]:

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
        if topic not in ['schema', 'parallel_db', 'hierarchical', 'network', 'er', 'document', 'history', 'xml', 'relational','relationalQuery', 'normalization', 'activedb', 'queryprocessing', 'mobiledb']:
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
