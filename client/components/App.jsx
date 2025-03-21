import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import VisualizationPanel from './VisualizationPanel';
import ControlPanel from './ControlPanel';
import DoubtBox from './DoubtBox';
import '../styles/streaming.css';
import RealtimeAudioPlayer from "./RealTimeAudioPlayer"

// Import visualization components
import ERVisualization from './ERVisualization';
import DocumentVisualization from './DocumentVisualization';
import HierarchicalVisualization from './HierarchicalVisualization';
import EntityVisualization from './EntityVisualization';
import AttributeVisualization from './AttributeVisualization';
import SharedMemoryVisualization from './Shared_memoryVisualization';
import SharedDiskVisualization from './Shared_diskVisualization';
import SharedNothingVisualization from './Shared_nothingVisualization';
import DistributedDatabaseVisualization from './Distributed_databaseVisualization';
import OOPConceptsVisualization from './Oop_conceptsVisualization';
import RelationalQueryVisualization from './RelationalqueryVisualization';
import NormalFormVisualization from './NormalizationVisualization';
import ActiveDBVisualization from './ActivedbVisualization';
import QueryProcessingVisualization from './QueryprocessingVisualization';
import MobiledbVisualization from './MobiledbVisualization';
import GISVisualization from './GisVisualization';
import BusinessPolicyVisualization from './BusinessPolicyVisualization';

// Define the VISUALIZATIONS object
const VISUALIZATIONS = {
  er: ERVisualization,
  document: DocumentVisualization,
  hierarchical: HierarchicalVisualization,
  entity: EntityVisualization,
  attribute: AttributeVisualization,
  shared_memory: SharedMemoryVisualization,
  shared_disk: SharedDiskVisualization,
  shared_nothing: SharedNothingVisualization,
  distributed_database: DistributedDatabaseVisualization,
  oop_concepts: OOPConceptsVisualization,
  relationalQuery: RelationalQueryVisualization,
  normalization: NormalFormVisualization,
  activedb: ActiveDBVisualization,
  queryprocessing: QueryProcessingVisualization,
  mobiledb: MobiledbVisualization,
  gis: GISVisualization,
  businesspolicy: BusinessPolicyVisualization
};

const TOPICS = [
  { id: 'er', name: 'Entity-Relationship Model' },
  { id: 'document', name: 'Document Database' },
  { id: 'hierarchical', name: 'Hierarchical Database' },
  { id: 'entity', name: 'Entity Model' },
  { id: 'attribute', name: 'Attribute Model' },
  { id: 'shared_memory', name: 'Shared Memory Architecture' },
  { id: 'shared_disk', name: 'Shared Disk Architecture' },
  { id: 'shared_nothing', name: 'Shared Nothing Architecture' },
  { id: 'distributed_database', name: 'Distributed Database' },
  { id: 'oop_concepts', name: 'OOP Concepts' },
  { id: 'relationalQuery', name: 'Relational Query' },
  { id: 'normalization', name: 'Normalization' },
  { id: 'activedb', name: 'Active Database' },
  { id: 'queryprocessing', name: 'Query Processing' },
  { id: 'mobiledb', name: 'Mobile Database' },
  { id: 'gis', name: 'Geographic Information System' },
  { id: 'businesspolicy', name: 'Business Policy' }
];

const App = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [visualizationData, setVisualizationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlightedElements, setHighlightedElements] = useState([]);
  const [doubt, setDoubt] = useState('');
  const [doubtResponse, setDoubtResponse] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [realtimeSession, setRealtimeSession] = useState(null);
  
  // Add a new state to track if narration is playing
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  
  // Add a reference to the RealTimeAudioPlayer component
  const audioPlayerRef = useRef(null);
  
  // Add a state to track if narration-only mode is active
  const [isNarrationOnly, setIsNarrationOnly] = useState(false);
  
  // Initialize Socket.IO connection
  useEffect(() => {
    // Configure Socket.IO client with Ngrok URL
    const newSocket = io('https://9c75-103-129-109-37.ngrok-free.app', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      
      // If this is the initial load, automatically select the ER model
      if (isInitialLoad) {
        setIsInitialLoad(false);
        handleTopicChange('er');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('visualization_response', (data) => {
      console.log('Received visualization data:', data);
      setVisualizationData(data);
      
      // Make visualization data available globally for the RealtimeAudioPlayer
      window.visualizationData = data;
      
      setIsLoading(false);
      
      // Set narration-only mode to true when visualization loads
      // but don't start narration automatically
      setIsNarrationOnly(true);
    });

    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(`Error: ${err.message || 'Unknown error'}`);
      setIsLoading(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isInitialLoad]);

  const handleTopicChange = (topic) => {
    // Stop any playing narration first
    if (isNarrationPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.stopNarration();
      setIsNarrationPlaying(false);
      setIsNarrationOnly(false);
    }
    
    setSelectedTopic(topic);
    setDoubtResponse(null);
    
    // Reset highlighted elements
    setHighlightedElements([]);
    
    // Immediately load a placeholder visualization while waiting for server
    const placeholderData = getPlaceholderData(topic);
    setVisualizationData(placeholderData);
    
    if (topic) {
      loadVisualization(topic);
    }
  };

  // Function to get placeholder data for instant rendering
  const getPlaceholderData = (topic) => {
    // Basic placeholder data for ER model
    if (topic === 'er') {
      return {
        nodes: [
          { id: "student", name: "Student", type: "entity", attributes: [
            { name: "student_id", isKey: true },
            { name: "name", isKey: false },
            { name: "email", isKey: false }
          ]},
          { id: "course", name: "Course", type: "entity", attributes: [
            { name: "course_id", isKey: true },
            { name: "title", isKey: false },
            { name: "credits", isKey: false }
          ]},
          { id: "enrollment", name: "Enrolls", type: "relationship" }
        ],
        edges: [
          { source: "student", target: "enrollment", type: "participates" },
          { source: "enrollment", target: "course", type: "participates" }
        ],
        topic: topic,
        narration: "Loading narration...",
        narration_timestamps: []
      };
    }
    
    // Placeholder data for Document Database
    else if (topic === 'document') {
      return {
        nodes: [
          { 
            id: "user_collection", 
            name: "Users Collection", 
            type: "collection",
            document: {
              "_id": "user123",
              "name": "John Doe",
              "email": "john@example.com",
              "preferences": {
                "theme": "dark",
                "notifications": true
              },
              "posts": [
                {"id": "post1", "title": "First Post"},
                {"id": "post2", "title": "Second Post"}
              ]
            }
          },
          { 
            id: "post_collection", 
            name: "Posts Collection", 
            type: "collection",
            document: {
              "_id": "post1",
              "title": "First Post",
              "content": "This is the content of the first post",
              "author_id": "user123",
              "comments": [
                {"user_id": "user456", "text": "Great post!"},
                {"user_id": "user789", "text": "Thanks for sharing"}
              ],
              "tags": ["database", "nosql", "document"]
            }
          }
        ],
        edges: [
          { source: "user_collection", target: "post_collection", type: "reference", description: "User -> Posts" }
        ],
        topic: topic,
        narration: "Loading narration...",
        narration_timestamps: []
      };
    }
    
    // Placeholder data for Hierarchical Database
    else if (topic === 'hierarchical') {
      return {
        nodes: [
          { id: "root", name: "University", type: "root" },
          { id: "department1", name: "Computer Science", type: "branch" },
          { id: "department2", name: "Mathematics", type: "branch" },
          { id: "course1", name: "Database Systems", type: "leaf" },
          { id: "course2", name: "Algorithms", type: "leaf" },
          { id: "course3", name: "Calculus", type: "leaf" }
        ],
        edges: [
          { source: "root", target: "department1", type: "parent-child" },
          { source: "root", target: "department2", type: "parent-child" },
          { source: "department1", target: "course1", type: "parent-child" },
          { source: "department1", target: "course2", type: "parent-child" },
          { source: "department2", target: "course3", type: "parent-child" }
        ],
        topic: topic,
        narration: "Loading narration...",
        narration_timestamps: []
      };
    }
    
    // Generic placeholder for other topics with a consistent structure
    else {
      return {
        nodes: [
          { id: `${topic}_node1`, name: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Node 1`, type: "generic" },
          { id: `${topic}_node2`, name: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Node 2`, type: "generic" },
          { id: `${topic}_node3`, name: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Node 3`, type: "generic" }
        ],
        edges: [
          { source: `${topic}_node1`, target: `${topic}_node2`, type: "connection" },
          { source: `${topic}_node2`, target: `${topic}_node3`, type: "connection" }
        ],
        topic: topic,
        narration: `Loading ${topic.replace('_', ' ')} visualization...`,
        narration_timestamps: []
      };
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

  // New function to initiate WebRTC session
  const initiateWebRTCSession = (topic, doubtText = '') => {
    if (!socket || !isConnected) {
      setError('Not connected to server');
      return;
    }
    
    console.log('Initiating WebRTC session for topic:', topic);
    
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

  // Handle doubt submission - simplified to always use WebRTC
  const handleDoubtSubmit = (doubtText) => {
    setDoubt(doubtText);
    setIsLoading(true);
    
    // Stop any playing narration
    if (isNarrationPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.stopNarration();
      setIsNarrationPlaying(false);
    }
    
    // Start WebRTC session with the doubt
    initiateWebRTCSession(selectedTopic, doubtText);
  };

  const renderVisualization = () => {
    if (!visualizationData) {
      return <div>No visualization data available</div>;
    }
    
    const VisualizationComponent = VISUALIZATIONS[selectedTopic];
    
    if (!VisualizationComponent) {
      return <div>No visualization component available for {selectedTopic}</div>;
    }
    
    console.log('HIGHLIGHT DEBUG: Rendering visualization with highlighted elements:', highlightedElements);
    
    return (
      <VisualizationComponent
        data={visualizationData}
        highlightedElements={highlightedElements}
        currentTime={Date.now()} // Just use current time as a placeholder
      />
    );
  };

  // Update the socket event handler for realtime session
  useEffect(() => {
    if (!socket) return;
    
    socket.on('start_webrtc_session', (data) => {
      console.log('WebRTC session request received:', data);
      
      // Only set realtimeSession if it's not already set
      setRealtimeSession(prevSession => {
        if (prevSession) {
          console.log('Ignoring duplicate WebRTC session request, session already active');
          return prevSession;
        }
        
        // Ensure we have visualization data
        if (!visualizationData && data.topic) {
          console.log('Requesting visualization data for topic:', data.topic);
          socket.emit('visualization', { topic: data.topic });
        }
        
        // Set highlighted elements to empty array to reset any previous highlights
        setHighlightedElements([]);
        
        return {
          sessionId: data.sessionId,
          topic: data.topic,
          doubt: data.doubt,
          visualizationData: visualizationData
        };
      });
    });
    
    return () => {
      socket.off('start_webrtc_session');
    };
  }, [socket, visualizationData]);

  // Update the handleNarrationComplete function to reset button state

  const handleNarrationComplete = (highlightedNodes, isComplete = true) => {
    console.log('HIGHLIGHT DEBUG: Received highlighted nodes in App:', highlightedNodes, 'isComplete:', isComplete);
    
    // Update highlighted elements if provided
    if (highlightedNodes && highlightedNodes.length > 0) {
      console.log('HIGHLIGHT DEBUG: Setting highlighted nodes in App:', highlightedNodes);
      
      // Check if the node IDs exist in the visualization data
      if (visualizationData && visualizationData.nodes) {
        const validNodeIds = visualizationData.nodes.map(node => node.id);
        console.log('HIGHLIGHT DEBUG: Valid node IDs in visualization:', validNodeIds);
        
        const validHighlights = highlightedNodes.filter(id => validNodeIds.includes(id));
        
        if (validHighlights.length !== highlightedNodes.length) {
          console.warn('HIGHLIGHT DEBUG: Some node IDs do not exist in the visualization:', 
            highlightedNodes.filter(id => !validNodeIds.includes(id)));
          console.log('HIGHLIGHT DEBUG: Using only valid node IDs:', validHighlights);
        }
        
        // Only set valid node IDs
        console.log('HIGHLIGHT DEBUG: Setting highlightedElements state with:', validHighlights);
        setHighlightedElements(validHighlights);
        
        // Force a re-render of the visualization
        setTimeout(() => {
          console.log('HIGHLIGHT DEBUG: Current highlightedElements after update:', highlightedElements);
        }, 10);
      } else {
        // If we don't have visualization data, just set the highlights as is
        console.log('HIGHLIGHT DEBUG: No visualization data nodes, setting all highlights:', highlightedNodes);
        setHighlightedElements([...highlightedNodes]);
      }
    } else if (highlightedNodes && highlightedNodes.length === 0) {
      // Clear highlights
      console.log('HIGHLIGHT DEBUG: Clearing all highlights');
      setHighlightedElements([]);
    }
    
    // If narration is complete, reset the narration state
    if (isComplete) {
      console.log('HIGHLIGHT DEBUG: Narration complete, resetting state');
      setIsNarrationPlaying(false);
      
      // Only close the WebRTC session if it exists
      if (realtimeSession) {
        console.log('HIGHLIGHT DEBUG: Closing WebRTC session');
        setRealtimeSession(null);
      }
    }
  };

  // Update the handlePlayNarration function to properly manage state
  const handlePlayNarration = () => {
    if (selectedTopic) {
      // First ensure we're in narration-only mode
      setIsNarrationOnly(true);
      
      // Use a timeout to ensure the component is rendered
      setTimeout(() => {
        if (audioPlayerRef.current) {
          // Stop any existing narration first
          audioPlayerRef.current.stopNarration();
          
          console.log('Starting narration for topic:', selectedTopic);
          audioPlayerRef.current.playNarrationScript(selectedTopic);
          setIsNarrationPlaying(true);
        }
      }, 100);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Database Visualization</h1>
        <div className="connection-status">
          {isConnected ? (
            <span className="connected">Connected</span>
          ) : (
            <span className="disconnected">Disconnected</span>
          )}
        </div>
      </header>
      
      <ControlPanel
        topics={TOPICS}
        selectedTopic={selectedTopic}
        onTopicChange={handleTopicChange}
        isLoading={isLoading}
        isPlaying={!!realtimeSession} // Use realtimeSession as a proxy for isPlaying
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
      
      <div className="main-content">
        <div className="visualization-container">
          <VisualizationPanel>
            {error ? (
              <div className="error">{error}</div>
            ) : (
              renderVisualization()
            )}
            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
              </div>
            )}
          </VisualizationPanel>
        </div>
        
        {realtimeSession ? (
          <div className="realtime-container">
            <RealtimeAudioPlayer 
              ref={audioPlayerRef}
              topic={realtimeSession.topic}
              doubt={realtimeSession.doubt}
              sessionId={realtimeSession.sessionId}
              onComplete={handleNarrationComplete}
              visualizationData={visualizationData}
            />
          </div>
        ) : (
          <div className="placeholder-message">
            <h3>Interactive Database Learning</h3>
            <p>Select a topic from the dropdown above to start exploring.</p>
            
            {visualizationData && (
              <div className="narration-controls">
                <p>The visualization is now loaded. You can:</p>
                <button 
                  className={`play-narration-btn ${isNarrationPlaying ? 'playing' : ''}`}
                  onClick={handlePlayNarration}
                  disabled={isNarrationPlaying}
                >
                  {isNarrationPlaying ? 'Narration Playing...' : 'Play Narration'}
                </button>
                <p>Or ask questions about the topic using the doubt box below.</p>
              </div>
            )}
            
            {/* Hidden RealtimeAudioPlayer for narration-only mode */}
            {isNarrationOnly && visualizationData && (
              <div style={{ display: 'none' }}>
                <RealtimeAudioPlayer 
                  ref={audioPlayerRef}
                  topic={selectedTopic}
                  doubt=""
                  sessionId={`narration-${Date.now()}`}
                  onComplete={handleNarrationComplete}
                  visualizationData={visualizationData}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      <DoubtBox
        onSubmit={handleDoubtSubmit}
        isLoading={isLoading}
        doubtResponse={doubtResponse}
        socket={socket}
      />
    </div>
  );
};

export default App; 