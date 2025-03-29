from pydantic import BaseModel, Field
import os
import logging
import json
import argparse
import sys
from typing import List, Optional, Union, Generator

# If you're using Pydantic v2, you could keep "model_dump_json()".
# But for broader compatibility (including Pydantic v1), we'll use .json() or .dict().
# from openai import OpenAI, AsyncOpenAI  # Comment out if not actually using OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define data models
class VisualizationNode(BaseModel):
    id: str
    name: str
    type: Optional[str] = None
    attributes: Optional[List[dict]] = None

class VisualizationEdge(BaseModel):
    source: str
    target: str
    type: str
    description: Optional[str] = None

class WordTiming(BaseModel):
    word: str
    start_time: int = Field(description="Time in milliseconds from start")
    end_time: int = Field(description="Time in milliseconds from start")
    node_id: Optional[Union[str, List[str]]] = Field(
        None, description="ID of the node(s) to highlight"
    )

class VisualizationData(BaseModel):
    nodes: List[VisualizationNode]
    edges: List[VisualizationEdge]
    topic: str
    narration: Optional[str] = None
    narration_timestamps: Optional[List[WordTiming]] = None

class DoubtResponse(BaseModel):
    narration: Optional[str] = None
    narration_timestamps: Optional[List[WordTiming]] = None
    highlights: Optional[List[str]] = None


def generate_word_timings(text: str) -> List[WordTiming]:
    """Generate simple word timings for narration."""
    words = text.split()
    # Approximate 500ms per word, but you can adjust as needed
    timings = []
    current_time = 0
    
    for word in words:
        # A naive approach: length-based timing
        word_duration = len(word) * 30 + 200
        timing = WordTiming(
            word=word,
            start_time=current_time,
            end_time=current_time + word_duration
        )
        timings.append(timing)
        current_time += word_duration
    
    return timings

def load_visualization_data(topic: str) -> VisualizationData:
    """Load or generate visualization data for a given topic."""
    try:
        # Example: "er"
        if topic == 'er':
            nodes = [
                VisualizationNode(
                    id="student",
                    name="Student",
                    type="entity",
                    attributes=[
                        {"name": "student_id", "isKey": True},
                        {"name": "name", "isKey": False},
                        {"name": "email", "isKey": False}
                    ]
                ),
                VisualizationNode(
                    id="course",
                    name="Course",
                    type="entity",
                    attributes=[
                        {"name": "course_id", "isKey": True},
                        {"name": "title", "isKey": False},
                        {"name": "credits", "isKey": False}
                    ]
                ),
                VisualizationNode(
                    id="enrollment",
                    name="Enrolls",
                    type="relationship"
                )
            ]
            
            edges = [
                VisualizationEdge(source="student", target="enrollment", type="participates"),
                VisualizationEdge(source="enrollment", target="course", type="participates")
            ]
            
            narration = (
                "This Entity-Relationship diagram shows a Student entity connected "
                "to a Course entity through an Enrollment relationship. Each Student "
                "has attributes like student_id (primary key), name, and email. Each Course "
                "has attributes like course_id (primary key), title, and credits. "
                "The Enrollment relationship represents how students enroll in courses."
            )
            narration_timestamps = generate_word_timings(narration)
            
            return VisualizationData(
                nodes=nodes,
                edges=edges,
                topic=topic,
                narration=narration,
                narration_timestamps=narration_timestamps
            )
        
        elif topic == 'document':
            nodes = [
                VisualizationNode(
                    id="user_collection",
                    name="Users Collection",
                    type="collection",
                    # attributes or a custom field can be included if needed
                ),
                VisualizationNode(
                    id="post_collection",
                    name="Posts Collection",
                    type="collection"
                )
            ]
            
            edges = [
                VisualizationEdge(
                    source="user_collection",
                    target="post_collection",
                    type="reference",
                    description="User -> Posts"
                )
            ]
            
            narration = (
                "This Document Database visualization shows two collections: Users and Posts. "
                "The Users collection contains documents with embedded arrays and nested objects, "
                "demonstrating the flexible schema of document databases. The Posts collection "
                "references users and contains embedded comments, showing how document databases "
                "can model relationships without formal joins."
            )
            narration_timestamps = generate_word_timings(narration)
            
            return VisualizationData(
                nodes=nodes,
                edges=edges,
                topic=topic,
                narration=narration,
                narration_timestamps=narration_timestamps
            )
        
        elif topic == 'hierarchical':
            nodes = [
                VisualizationNode(id="root", name="University", type="root"),
                VisualizationNode(id="department1", name="Computer Science", type="branch"),
                VisualizationNode(id="department2", name="Mathematics", type="branch"),
                VisualizationNode(id="course1", name="Database Systems", type="leaf"),
                VisualizationNode(id="course2", name="Algorithms", type="leaf"),
                VisualizationNode(id="course3", name="Calculus", type="leaf")
            ]
            
            edges = [
                VisualizationEdge(source="root", target="department1", type="parent-child"),
                VisualizationEdge(source="root", target="department2", type="parent-child"),
                VisualizationEdge(source="department1", target="course1", type="parent-child"),
                VisualizationEdge(source="department1", target="course2", type="parent-child"),
                VisualizationEdge(source="department2", target="course3", type="parent-child")
            ]
            
            narration = (
                "This Hierarchical Database visualization shows a university structure "
                "with departments and courses. The University is the root node, with "
                "Computer Science and Mathematics as branch nodes. Each department "
                "has courses as leaf nodes. This tree-like structure demonstrates how "
                "hierarchical databases organize data in parent-child relationships."
            )
            narration_timestamps = generate_word_timings(narration)
            
            return VisualizationData(
                nodes=nodes,
                edges=edges,
                topic=topic,
                narration=narration,
                narration_timestamps=narration_timestamps
            )
        
        # Fallback for other topics
        else:
            nodes = [
                VisualizationNode(
                    id=f"{topic}_node1",
                    name=f"{topic.capitalize()} Node 1",
                    type="generic"
                ),
                VisualizationNode(
                    id=f"{topic}_node2",
                    name=f"{topic.capitalize()} Node 2",
                    type="generic"
                ),
                VisualizationNode(
                    id=f"{topic}_node3",
                    name=f"{topic.capitalize()} Node 3",
                    type="generic"
                )
            ]
            
            edges = [
                VisualizationEdge(
                    source=f"{topic}_node1",
                    target=f"{topic}_node2",
                    type="connection"
                ),
                VisualizationEdge(
                    source=f"{topic}_node2",
                    target=f"{topic}_node3",
                    type="connection"
                )
            ]
            
            narration = (
                f"This is a visualization of a {topic.replace('_', ' ')} database model. "
                "It shows three nodes connected in a simple structure. In a real implementation, "
                f"this would contain more details specific to the {topic.replace('_', ' ')} model."
            )
            narration_timestamps = generate_word_timings(narration)
            
            return VisualizationData(
                nodes=nodes,
                edges=edges,
                topic=topic,
                narration=narration,
                narration_timestamps=narration_timestamps
            )
    
    except Exception as e:
        logger.error(f"Error loading visualization data for {topic}: {str(e)}")
        # Return a minimal valid response instead of raising
        return VisualizationData(
            nodes=[VisualizationNode(id="error", name="Error", type="error")],
            edges=[],
            topic=topic,
            narration=f"Error loading visualization: {str(e)}"
        )


def process_doubt(topic: str, doubt: str, current_state=None, stream=False):
    """
    Process a doubt about a visualization topic.
    This function uses GPT calls if you have an OPENAI_API_KEY set.
    If you don't need GPT or have no key, you can remove/comment out the GPT code.
    """
    try:
        # Load the relevant visualization data
        visualization_data = load_visualization_data(topic)
        
        # If you do NOT have an OpenAI key, skip or return a mock response
        if not os.getenv("OPENAI_API_KEY"):
            logger.warning("No OPENAI_API_KEY found. Returning a mock doubt response.")
            return DoubtResponse(
                narration="OpenAI key not found, so here's a mock answer to your doubt.",
                narration_timestamps=generate_word_timings("OpenAI key not found, so here's a mock answer."),
                highlights=[]
            )
        
        # If you do have an OPENAI_API_KEY, you can proceed with GPT calls here.
        # For brevity, let's just do a placeholder response:
        mock_explanation = (
            f"You asked about '{doubt}' in the context of {topic}. "
            "Here's where I'd normally call GPT to get an answer."
        )
        word_timings = generate_word_timings(mock_explanation)
        return DoubtResponse(
            narration=mock_explanation,
            narration_timestamps=word_timings,
            highlights=[]
        )
    
    except Exception as e:
        logger.error(f"Error processing doubt: {str(e)}")
        return DoubtResponse(
            narration=f"Sorry, I encountered an error: {str(e)}",
            narration_timestamps=[],
            highlights=[]
        )


def main():
    """Main entry point for the application."""
    parser = argparse.ArgumentParser(description='Generate or process visualization data.')
    parser.add_argument('--topic', type=str, help='Visualization topic')
    parser.add_argument('--doubt', action='store_true', help='Process a doubt from stdin')
    args = parser.parse_args()
    
    if args.doubt and args.topic:
        # Process a doubt from stdin
        try:
            doubt_request = json.loads(sys.stdin.read())
            doubt = doubt_request.get('doubt', '')
            current_state = doubt_request.get('current_state', {})
            
            response = process_doubt(args.topic, doubt, current_state)
            
            # If the response is a Pydantic model, convert to JSON
            if isinstance(response, DoubtResponse):
                print(response.model_dump_json(exclude_none=True))
            else:
                # If it's a generator or something else
                print(json.dumps({"error": "Streaming or other response not supported in this example"}))
        
        except Exception as e:
            logger.error(f"Error processing doubt from stdin: {str(e)}")
            print(json.dumps({
                "error": str(e),
                "narration": f"Sorry, I encountered an error: {str(e)}",
                "narration_timestamps": [],
                "highlights": []
            }))
    
    elif args.topic:
        # Generate visualization data for the given topic
        try:
            visualization_data = load_visualization_data(args.topic)
            # Print out the JSON
            # For Pydantic v1/v2 compatibility, let's do .json(exclude_none=True)
            print(visualization_data.model_dump_json(exclude_none=True))
        except Exception as e:
            logger.error(f"Error generating visualization data: {str(e)}")
            print(json.dumps({"error": str(e)}))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
