# DOC: App.jsx Function Analysis
# Core Functions
### App
**Purpose**: The main functional component that renders the entire application.
**Usage**: This is the root component that's rendered in the application.

### useEffect (Socket.IO initialization)
**Purpose**: Sets up the Socket.IO connection and event handlers.
**Usage**: Runs once when the component mounts (controlled by the [isInitialLoad] dependency array).
**Details**: Establishes connection to the server, sets up event listeners for 'connect', 'disconnect', 'visualization_response', and 'error' events.

### handleTopicChange
**Purpose**: Handles user selection of a database topic.
**Usage**: Called when a user selects a topic from the dropdown in the ControlPanel.
**Details**: Updates state, resets highlights, loads placeholder data, and requests visualization data from the server.

### getPlaceholderData
**Purpose**: Generates temporary visualization data while waiting for server response.
**Usage**: Called by handleTopicChange to immediately show something to the user.
**Details**: Contains predefined data structures for different topics (ER model, Document Database, etc.).

### loadVisualization
**Purpose**: Requests visualization data from the server for a specific topic.
**Usage**: Called by handleTopicChange after setting placeholder data.
**Details**: Emits a 'visualization' event to the server with the selected topic.

### initiateWebRTCSession
**Purpose**: Starts a WebRTC session for real-time audio communication.
**Usage**: Called automatically after receiving visualization data or when a user submits a doubt.
**Details**: Creates a session ID, sets up the realtime session state, and notifies the server.

### handleDoubtSubmit
**Purpose**: Processes user questions about the visualization.
**Usage**: Called when a user submits a question through the DoubtBox.
**Details**: Initiates a WebRTC session with the doubt text and returns a promise with session details.

### renderVisualization
**Purpose**: Renders the appropriate visualization component based on the selected topic.
**Usage**: Called during rendering to display the visualization.
**Details**: Looks up the correct component from the VISUALIZATIONS object and passes the necessary props.

### useEffect (WebRTC session handler)
**Purpose**: Sets up a Socket.IO event listener for 'start_webrtc_session' events.
**Usage**: Runs when the socket or visualization data changes.
**Details**: Handles server confirmations of WebRTC session requests and ensures visualization data is available.

### handleNarrationComplete
**Purpose**: Processes highlighting information from the RealtimeAudioPlayer.
**Usage**: Passed as a callback to the RealtimeAudioPlayer component.
**Details**: Updates highlighted elements in the visualization based on the AI's narration.

# State Variables
socket: Stores the Socket.IO connection
isConnected: Tracks connection status
selectedTopic: Currently selected database topic
visualizationData: Data for the current visualization
isLoading: Loading state indicator
error: Error message if something goes wrong
highlightedElements: Elements to highlight in the visualization
doubt: Current user question
doubtResponse: Response to the user's question
isInitialLoad: Flag for initial application load
realtimeSession: State for the current WebRTC session

# Render Logic
The component renders:
A header with the application title and connection status
A ControlPanel for topic selection
The main content area with:
A VisualizationPanel showing the selected visualization
Either a RealtimeAudioPlayer (when a session is active) or a placeholder message
A DoubtBox for submitting questions
The application uses a conditional rendering approach based on the presence of a realtimeSession to switch between showing the RealtimeAudioPlayer and the placeholder message.
