# DOC: Data Flow Documentation

## Overview

The application enables users to explore database concepts through interactive visualizations with real-time AI-powered explanations.

## System Architecture

The application follows a client-server architecture with these key components:

1. **React Frontend**: Renders visualizations and manages user interactions
2. **Socket.IO**: Handles real-time communication between client and server
3. **WebRTC**: Enables direct audio streaming between client and OpenAI
4. **Node.js Server**: Manages sessions, provides data, and handles authentication

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                     │
│                                                                     │
│  ┌─────────┐    ┌───────────────┐    ┌────────────────────┐         │
│  │         │    │               │    │                    │         │
│  │ App.jsx ├────► Visualization ├────► RealTimeAudioPlayer│         │
│  │         │    │  Components   │    │                    │         │
│  └────┬────┘    └───────────────┘    └──────────┬─────────┘         │
│       │                                         │                   │
└───────┼─────────────────────────────────────────┼───────────────────┘
        │                                         │
        │ Socket.IO                               │ WebRTC
        │                                         │
┌───────┼─────────────────────────────────────────┼───────────────────┐
│       │                                         │                   │
│  ┌────▼────┐                              ┌─────▼─────┐             │
│  │         │                              │           │             │
│  │ server.js│                              │  OpenAI   │             │
│  │         │                              │  API      │             │
│  └─────────┘                              └───────────┘             │
│                                                                     │
│                           SERVER                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Data Flow

### 1. Initial Application Load

```sequence
Client->Server: HTTP request to load application
Server->Client: Sends HTML, JS, CSS
Client->Client: React initializes App.jsx
Client->Server: Socket.IO connection established
```

**Code Reference:**
```javascript
// client/pages/index.jsx or static/js/index.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from '../components/App';

ReactDOM.render(<App />, document.getElementById('root'));
```

### 2. Topic Selection Flow

```sequence
User->App.jsx: Selects database topic
App.jsx->Server: Socket.IO 'visualization' event
Server->Server: Retrieves visualization data
Server->App.jsx: Socket.IO 'visualization_response' event
App.jsx->VisualizationComponent: Renders visualization
App.jsx->App.jsx: Initiates WebRTC session
```

**Code Reference:**
```javascript
// client/components/App.jsx
const handleTopicChange = (topic) => {
  setSelectedTopic(topic);
  setDoubtResponse(null);
  setHighlightedElements([]);
  
  // Load placeholder data immediately
  const placeholderData = getPlaceholderData(topic);
  setVisualizationData(placeholderData);
  
  if (topic) {
    loadVisualization(topic);
  }
};

const loadVisualization = (topic) => {
  if (!socket || !isConnected) {
    setError('Not connected to server');
    return;
  }

  setIsLoading(true);
  setError(null);

  console.log('Requesting visualization for topic:', topic);
  socket.emit('visualization', { topic });
};
```

### 3. Doubt Submission Flow

```sequence
User->App.jsx: Submits doubt/question
App.jsx->Server: Socket.IO 'start_webrtc_session' event
Server->App.jsx: Confirms session start
App.jsx->RealtimeAudioPlayer: Initializes with session data
RealtimeAudioPlayer->Server: HTTP request to /token endpoint
Server->RealtimeAudioPlayer: Returns OpenAI API key
RealtimeAudioPlayer->OpenAI: Establishes WebRTC connection
OpenAI->RealtimeAudioPlayer: Streams audio response
RealtimeAudioPlayer->App.jsx: Provides node IDs to highlight
App.jsx->VisualizationComponent: Updates highlighted elements
```

**Code Reference:**
```javascript
// client/components/App.jsx
const handleDoubtSubmit = async (doubtText, currentState = {}) => {
  if (!socket || !doubtText.trim() || !selectedTopic) return;
  
  setIsLoading(true);
  setDoubt(doubtText);
  
  console.log('Submitting doubt via WebRTC:', doubtText);
  
  // Initiate a WebRTC session with the doubt
  initiateWebRTCSession(selectedTopic, doubtText);
  
  // Return a resolved promise
  return Promise.resolve({
    sessionId: realtimeSession?.sessionId || Date.now().toString(),
    topic: selectedTopic,
    doubt: doubtText
  });
};

const initiateWebRTCSession = (topic, doubtText = '') => {
  // Create a session ID
  const sessionId = Date.now().toString();
  
  // Set up the realtime session
  setRealtimeSession({
    sessionId: sessionId,
    topic: topic,
    doubt: doubtText,
    visualizationData: visualizationData
  });
  
  // Notify the server to start a WebRTC session
  socket.emit('start_webrtc_session', {
    sessionId: sessionId,
    topic: topic,
    doubt: doubtText
  });
};
```

### 4. WebRTC Connection Establishment

```sequence
RealtimeAudioPlayer->Server: Requests token
Server->RealtimeAudioPlayer: Provides OpenAI API key
RealtimeAudioPlayer->RealtimeAudioPlayer: Creates RTCPeerConnection
RealtimeAudioPlayer->RealtimeAudioPlayer: Creates data channel
RealtimeAudioPlayer->RealtimeAudioPlayer: Creates SDP offer
RealtimeAudioPlayer->OpenAI: Sends SDP offer with API key
OpenAI->RealtimeAudioPlayer: Returns SDP answer
RealtimeAudioPlayer->RealtimeAudioPlayer: Sets remote description
RealtimeAudioPlayer->OpenAI: Connection established
```

**Code Reference:**
```javascript
// client/components/RealTimeAudioPlayer.jsx
const startSession = async () => {
  try {
    // Get token from server
    const tokenUrl = `${window.location.origin}/token?topic=${encodeURIComponent(topic)}&doubt=${encodeURIComponent(doubt)}`;
    const tokenResponse = await fetch(tokenUrl);
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;
    
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    peerConnectionRef.current = pc;
    
    // Set up data channel
    const dc = peerConnectionRef.current.createDataChannel('oai-events');
    dataChannelRef.current = dc;
    
    // Create and send offer
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    
    // Send SDP to OpenAI
    const openaiBaseUrl = 'https://api.openai.com/v1/realtime';
    const model = 'gpt-4o-realtime-preview-2024-12-17';
    const sdpResponse = await fetch(`${openaiBaseUrl}?model=${model}`, {
      method: 'POST',
      body: peerConnectionRef.current.localDescription.sdp,
      headers: {
        'Authorization': `Bearer ${EPHEMERAL_KEY}`,
        'Content-Type': 'application/sdp'
      }
    });
    
    // Process answer
    const sdpAnswer = await sdpResponse.text();
    const answer = { type: 'answer', sdp: sdpAnswer };
    await peerConnectionRef.current.setRemoteDescription(answer);
  } catch (error) {
    console.error('Error starting session:', error);
  }
};
```

### 5. Real-time Audio and Highlighting Flow

```sequence
OpenAI->RealtimeAudioPlayer: Streams audio via WebRTC
OpenAI->RealtimeAudioPlayer: Sends text transcript via data channel
RealtimeAudioPlayer->RealtimeAudioPlayer: Processes text for node IDs
RealtimeAudioPlayer->App.jsx: Calls onComplete with node IDs to highlight
App.jsx->VisualizationComponent: Updates highlightedElements state
VisualizationComponent->User: Displays highlighted nodes
```

**Code Reference:**
```javascript
// client/components/RealTimeAudioPlayer.jsx
dc.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data);
    
    // Process different event types
    if (data.type === 'response.audio_transcript.delta') {
      if (data.delta && typeof data.delta === 'string') {
        const textContent = data.delta;
        processAudioTranscriptDelta(textContent);
      }
    }
    // Other message types...
  } catch (error) {
    console.error('Error parsing message:', error);
  }
};

// In App.jsx
const handleNarrationComplete = (highlightedNodes, isComplete = true) => {
  console.log('Received highlighted nodes:', highlightedNodes);
  
  // Update highlighted elements if provided
  if (highlightedNodes && highlightedNodes.length > 0) {
    setHighlightedElements([...highlightedNodes]);
  }
  
  // Only close the session if isComplete is true
  if (isComplete) {
    console.log('Narration complete, but keeping WebRTC session active');
  }
};
```

### 6. Server-Side Token Generation

```sequence
RealtimeAudioPlayer->Server: GET /token with topic and doubt
Server->Server: Validates request
Server->Server: Retrieves OpenAI API key
Server->Server: Gets visualization data
Server->RealtimeAudioPlayer: Returns token and visualization data
```

**Code Reference:**
```javascript
// server.js
app.get('/token', (req, res) => {
  try {
    const { topic, doubt } = req.query;
    
    if (!topic || !doubt) {
      return res.status(400).json({ error: 'Missing topic or doubt parameter' });
    }
    
    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    // Get visualization data
    const visualizationData = getVisualizationData(topic);
    
    // Return response
    res.json({
      client_secret: { value: openaiApiKey },
      visualization_data: visualizationData
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});
```

### 7. Session Completion Flow

```sequence
User->RealtimeAudioPlayer: Clicks "Close AI Response"
RealtimeAudioPlayer->RealtimeAudioPlayer: Stops WebRTC session
RealtimeAudioPlayer->App.jsx: Calls onComplete with final highlights
App.jsx->App.jsx: Sets realtimeSession to null
App.jsx->User: Returns to standard visualization view
```

**Code Reference:**
```javascript
// client/components/RealTimeAudioPlayer.jsx
const handleReturn = () => {
  addDebugInfo('User clicked return to visualization');
  stopSession();
  if (onComplete) {
    // Pass true as second parameter to indicate session is complete
    onComplete(nodesToHighlight, true);
  }
};

// In App.jsx
<ControlPanel
  topics={TOPICS}
  selectedTopic={selectedTopic}
  onTopicChange={handleTopicChange}
  isLoading={isLoading}
  isPlaying={!!realtimeSession}
  onPlayPause={() => {
    // If we have a session, end it; otherwise start one
    if (realtimeSession) {
      setRealtimeSession(null);
    } else if (selectedTopic) {
      initiateWebRTCSession(selectedTopic);
    }
  }}
  hasVisualization={!!visualizationData}
/>
```

## Key Data Structures

### 1. Visualization Data

```javascript
// Example visualization data structure
const visualizationData = {
  nodes: [
    { 
      id: "student", 
      name: "Student", 
      type: "entity", 
      attributes: [
        { name: "student_id", isKey: true },
        { name: "name", isKey: false }
      ]
    },
    // More nodes...
  ],
  edges: [
    { 
      source: "student", 
      target: "enrollment", 
      type: "participates" 
    },
    // More edges...
  ],
  topic: "er",
  narration: "This Entity-Relationship diagram shows..."
};
```

### 2. WebRTC Session Data

```javascript
// In App.jsx
const realtimeSession = {
  sessionId: "1621234567890",
  topic: "er",
  doubt: "How does the relationship work between students and courses?",
  visualizationData: { /* visualization data object */ }
};
```

### 3. Socket.IO Events

| Event | Direction | Data | Purpose |
|-------|-----------|------|---------|
| `connect` | Server → Client | - | Connection established |
| `disconnect` | Server → Client | - | Connection lost |
| `visualization` | Client → Server | `{ topic }` | Request visualization data |
| `visualization_response` | Server → Client | Visualization data | Return visualization data |
| `start_webrtc_session` | Client → Server | `{ sessionId, topic, doubt }` | Request WebRTC session |
| `start_webrtc_session` | Server → Client | `{ sessionId, topic, doubt }` | Confirm session start |
| `error` | Server → Client | `{ message }` | Report error |

## State Management

### App.jsx State

```javascript
// Key state variables in App.jsx
const [socket, setSocket] = useState(null);
const [isConnected, setIsConnected] = useState(false);
const [selectedTopic, setSelectedTopic] = useState('');
const [visualizationData, setVisualizationData] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [highlightedElements, setHighlightedElements] = useState([]);
const [doubt, setDoubt] = useState('');
const [doubtResponse, setDoubtResponse] = useState(null);
const [realtimeSession, setRealtimeSession] = useState(null);
```

### RealTimeAudioPlayer State

```javascript
// Key state variables in RealTimeAudioPlayer.jsx
const [isConnected, setIsConnected] = useState(false);
const [isPlaying, setIsPlaying] = useState(false);
const [text, setText] = useState('');
const [highlightedWord, setHighlightedWord] = useState('');
const [error, setError] = useState(null);
const [connectionStatus, setConnectionStatus] = useState('Initializing...');
const [nodesToHighlight, setNodesToHighlight] = useState([]);
const [wordTimings, setWordTimings] = useState([]);
```

## Error Handling Flow

```sequence
Component->Component: Try operation
Component->Component: Catch error
Component->Component: Set error state
Component->User: Display error message
Component->Component: Optional: Retry logic
```

**Code Reference:**
```javascript
// Error handling in RealTimeAudioPlayer.jsx
try {
  // Operation that might fail
} catch (error) {
  console.error('Operation failed:', error);
  addDebugInfo(`Error: ${error.message}`);
  setError(`Failed: ${error.message}`);
  
  // Optional retry logic
  if (retryCount < maxRetries.current) {
    setRetryCount(prev => prev + 1);
    retryOperation();
  }
}
```

## Conclusion

This document provides a comprehensive overview of the data flow within the Database Visualization application. Understanding these flows will help you navigate the codebase and make effective contributions to the system.

Key points to remember:
1. Socket.IO handles initial communication and visualization data
2. WebRTC manages real-time audio streaming directly with OpenAI
3. React state manages UI updates and visualization highlighting
4. The server primarily acts as a facilitator for connections and data provider

For further details, refer to the specific component files mentioned throughout this document.
