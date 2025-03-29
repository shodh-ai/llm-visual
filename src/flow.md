
### load visualization data
sequenceDiagram
    participant U as User
    participant F as Frontend (App.jsx)
    participant VC as VisualizationController
    participant B as Backend (app.py)
    
    U->>F: Selects visualization topic
    F->>B: POST /api/visualization {topic}
    B->>B: load_visualization_data(topic)
    B->>B: load_narration_script(topic)
    B-->>F: Returns {nodes, edges, narration, narration_timestamps}
    F->>VC: Passes data & topic
    VC->>B: POST /api/narration/{topic}
    B->>B: generate_narration()
    B-->>VC: Returns {audio_url, duration, word_timings, script}
    VC->>VC: Initializes audio player & highlighting system (AI agent, highlight based code and new narration)

### play narration
sequenceDiagram
    participant U as User
    participant VC as VisualizationController
    participant V as Visualization Component
    participant A as Audio Player

    U->>VC: Clicks Play
    VC->>A: Starts audio playback
    
    loop Every Animation Frame
        A-->>VC: Current time update
        VC->>VC: updateHighlights(currentTime)
        Note over VC: Finds current word_timing<br/>based on timestamp
        VC->>V: Updates highlightedElements prop
        V->>V: Applies D3 highlighting<br/>to matched nodes
    end


### doubt submission 

sequenceDiagram
    participant U as User
    participant VC as VisualizationController
    participant B as Backend (app.py)
    participant V as Visualization Component
    
    U->>VC: Submits doubt
    VC->>B: POST /api/doubt {topic, doubt, current_time}
    B->>B: handle_doubt()
    B->>B: enhance_response()
    B-->>VC: Returns {narration, narration_timestamps, highlights}
    VC->>B: POST /api/narration/{topic}
    B->>B: generate_narration()
    B-->>VC: Returns new {audio_url, duration, word_timings}
    VC->>VC: Updates narration state
    VC->>V: Updates highlightedElements
    VC->>VC: Starts new audio playback

