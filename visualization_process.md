# Visualization Rendering and Doubt Handling Process

This document explains how the interactive database visualization system renders visualizations and handles user doubts.

## Visualization Rendering Process

### 1. Component Architecture

The visualization system uses a hierarchical component structure:

- **App.jsx**: The main application component that manages global state and routing
- **VisualizationController.jsx**: Manages visualization state, narration, and user interactions
- **Topic-specific Visualization Components**: (e.g., `Shared_memoryVisualization.jsx`) - Render specific visualizations using D3.js

### 2. Data Flow

1. **Data Fetching**:
   - When a topic is selected, `App.jsx` fetches visualization data from the `/api/visualization` endpoint
   - The response includes nodes, edges, narration text, and narration timestamps

2. **Component Selection**:
   - Based on the selected topic, the appropriate visualization component is dynamically loaded
   - For example, "shared_memory" topic uses `SharedMemoryVisualization` component

3. **Data Passing**:
   - Visualization data is passed down to the `VisualizationController`
   - The controller passes the data and highlight information to the specific visualization component

### 3. D3.js Rendering

The topic-specific visualization components use D3.js to render the visualization:

1. **Initialization**:
   ```javascript
   useEffect(() => {
     if (!containerRef.current || !data?.nodes) return;
     
     // Clear any previous visualization
     d3.select(containerRef.current).selectAll('*').remove();
     
     // Create base visualization
     createVisualization(data, containerRef.current, svgRef, simulationRef);
   }, [data]);
   ```

2. **Visualization Creation**:
   - The `createVisualization` function sets up:
     - SVG container and viewbox
     - Force simulation for node positioning
     - Node and edge elements with appropriate styling
     - Interaction handlers (drag, click, hover)

3. **Highlighting**:
   ```javascript
   useEffect(() => {
     if (!svgRef.current) return;
     const svg = d3.select(svgRef.current);

     // Reset all highlights
     svg.selectAll('.node')
       .transition()
       .duration(300)
       .style('filter', null)
       // ...

     // Apply new highlights
     if (highlightedElements && highlightedElements.length > 0) {
       highlightedElements.forEach(element => {
         // Highlight nodes and connected edges
         // ...
       });
     }
   }, [highlightedElements]);
   ```

### 4. Narration and Animation

1. **Narration Playback**:
   - Audio narration is fetched from `/api/narration/{topic}`
   - The `VisualizationController` manages audio playback and timing

2. **Synchronized Highlighting**:
   - The controller tracks the current playback time
   - It uses narration timestamps to determine which elements to highlight
   - The `updateHighlights` function is called on time updates:
     ```javascript
     const updateHighlights = () => {
       // Reset highlights
       setHighlightedElements([]);
       
       // Find current narration segment based on time
       const currentTime = audioRef.current?.currentTime * 1000 || 0;
       const currentSegment = narrationTimestamps.find(
         segment => segment.start_time <= currentTime && segment.end_time >= currentTime
       );
       
       // Apply highlights to relevant nodes
       if (currentSegment?.node_id) {
         const nodeIds = Array.isArray(currentSegment.node_id) 
           ? currentSegment.node_id 
           : [currentSegment.node_id];
         
         setHighlightedElements(
           nodeIds.map(id => ({ id, type: 'highlight' }))
         );
       }
     };
     ```

## Doubt Handling Process

When a user submits a doubt, the system processes it and provides a contextual response:

### 1. Doubt Submission

The user enters a doubt through the UI, which triggers the submission handler:

```javascript
const handleDoubtSubmission = async (doubt) => {
  try {
    // Pause current narration if playing
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setNarration("Processing your question...");

    // Send doubt to API
    const response = await fetch('/api/process-doubt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doubt,
        topic,
        currentState: {
          highlightedElements,
          currentTime: audioRef.current?.currentTime * 1000 || 0
        }
      })
    });
    
    // Process response
    // ...
  } catch (error) {
    console.error("Error processing doubt:", error);
  }
};
```

### 2. Backend Processing

1. **API Endpoint**:
   - The `/api/process-doubt` endpoint receives the doubt request
   - It extracts the doubt text, topic, and current state

2. **AI Processing**:
   - The system uses Claude AI to process the doubt
   - It provides context about the visualization and current state
   - The AI generates a structured response with explanations and recommendations

3. **Response Structure**:
   ```json
   {
     "explanation": "Main detailed explanation",
     "additionalInfo": "Additional context and background",
     "componentDetails": {
       "componentName": "Specific details about this component"
     },
     "examples": ["Practical example 1", "Example 2"],
     "recommendations": ["Recommendation 1", "Recommendation 2"],
     "highlightElements": [
       {
         "id": "component_id",
         "type": "highlight",
         "emphasis": "normal|strong|subtle"
       }
     ]
   }
   ```

### 3. Frontend Update

When the response is received, the frontend updates accordingly:

1. **Narration Update**:
   - The explanation text becomes the new narration
   - New audio may be generated for this narration

2. **Highlight Update**:
   - The recommended highlight elements are applied to the visualization
   - The D3 visualization updates to show these highlights

3. **UI Updates**:
   - Additional information and recommendations are displayed
   - Interactive elements may be added based on the response

4. **Audio Generation** (if needed):
   ```javascript
   const generateNarrationAudio = async (text) => {
     try {
       const response = await fetch(`/api/narration/${topic}`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ text }),
       });
       
       const data = await response.json();
       setAudioUrl(data.audio_url);
       setNarrationTimestamps(data.word_timings);
       // ...
     } catch (error) {
       console.error("Error generating audio:", error);
     }
   };
   ```

### 4. User Experience

The user experiences a seamless interaction flow:

1. User submits a doubt about the visualization
2. The system briefly shows a "Processing..." message
3. The visualization updates with new highlights relevant to the doubt
4. A new narration explains the concept with reference to the highlighted elements
5. Additional information and recommendations are displayed
6. The user can continue exploring or ask follow-up questions

## Technical Implementation Details

### Script Files and Timestamps

The system uses JSON script files to define narration and timing:

```json
{
  "script": "Let's explore the shared memory architecture...",
  "narration_timestamps": [
    {
      "word": "Introduction",
      "start_time": 0,
      "end_time": 5000,
      "node_id": null
    },
    {
      "word": "Multiple CPUs",
      "start_time": 5000,
      "end_time": 10000,
      "node_id": ["cpu1", "cpu2", "cpu3", "cpu4"]
    }
  ]
}
```

### Data Models

The system uses several data models:

1. **VisualizationData**: Contains nodes, edges, narration, and timestamps
2. **WordTiming**: Maps words to timestamps and node IDs
3. **DoubtRequest**: Contains the doubt text and context
4. **DoubtResponse**: Contains the AI response and visualization updates

### Animation and Highlighting

The D3 visualization uses transitions for smooth animations:

```javascript
node.transition()
  .duration(300)
  .select('rect')
  .style('stroke', '#4299e1')
  .style('stroke-width', '3px')
  .style('filter', 'drop-shadow(0 0 5px rgba(66, 153, 225, 0.5))');
```

This creates a responsive, interactive learning experience that adapts to user questions and provides contextual explanations with synchronized visual highlights. 