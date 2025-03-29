import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import VisualizationPanel from './VisualizationPanel';
import ControlPanel from './ControlPanel';
import DoubtBox from './DoubtBox';
import '../styles/streaming.css';
import RealtimeAudioPlayer from "./RealtimeAudioPlayer";

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
import GdpVisualization from './GdpVisualization';

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
  businesspolicy: BusinessPolicyVisualization,
  gdp: GdpVisualization
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
  { id: 'businesspolicy', name: 'Business Policy' },
  { id: 'gdp', name: 'GDP Growth Visualization' }
];

const App = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [visualizationData, setVisualizationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlightedElements, setHighlightedElements] = useState([]);
  const [doubtResponse, setDoubtResponse] = useState(null);

  const [realtimeSession, setRealtimeSession] = useState(null);

  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  const audioPlayerRef = useRef(null);
  const [isNarrationOnly, setIsNarrationOnly] = useState(false);

  // Create and maintain a single socket connection
  useEffect(() => {
    // IMPORTANT: Make sure your Node server is NOT on the same port 
    // as the React dev server. If your React dev server is on 3000,
    // run the Node server on 3001 or vice versa.
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError(`Connection error: ${err.message}`);
      setIsLoading(false);
    });

    // Listen for the visualization response
    newSocket.on('visualization_response', (data) => {
      console.log('Received visualization data:', data);
      if (data.error) {
        setError(data.error);
      } else {
        setVisualizationData(data);
        window.visualizationData = data; // if needed
      }
      setIsLoading(false);
      setIsNarrationOnly(true);
    });

    // Listen for socket errors
    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(`Error: ${err.message || 'Unknown error'}`);
      setIsLoading(false);
    });

    // Listen for start_webrtc_session
    newSocket.on('start_webrtc_session', (data) => {
      console.log('WebRTC session request from server:', data);
      setRealtimeSession((prev) => {
        if (prev) return prev; // If we already have a session, ignore
        // If no data yet, request it
        if (!visualizationData && data.topic) {
          newSocket.emit('visualization', { topic: data.topic });
        }
        setHighlightedElements([]);
        return {
          sessionId: data.sessionId,
          topic: data.topic,
          doubt: data.doubt,
          visualizationData
        };
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

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

  const handleTopicChange = (topic) => {
    // Stop any playing narration
    if (isNarrationPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.stopNarration();
      setIsNarrationPlaying(false);
      setIsNarrationOnly(false);
    }

    setSelectedTopic(topic);
    setDoubtResponse(null);
    setHighlightedElements([]);

    // Show loading state and clear current visualization
    setIsLoading(true);
    setVisualizationData(null);

    if (topic) {
      loadVisualization(topic);
    }
  };

  // Render loading placeholder
  const renderLoadingPlaceholder = () => (
    <div className="placeholder-visualization">
      <div className="loading-text">Loading {selectedTopic} visualization...</div>
    </div>
  );

  // Start a WebRTC session (doubt or no doubt)
  const initiateWebRTCSession = (topic, doubtText = '') => {
    if (!socket || !isConnected) {
      setError('Not connected to server');
      return;
    }
    console.log('Initiating WebRTC session for topic:', topic);

    const sessionId = Date.now().toString();
    setRealtimeSession({
      sessionId,
      topic,
      doubt: doubtText,
      visualizationData
    });
    socket.emit('start_webrtc_session', {
      sessionId,
      topic,
      doubt: doubtText
    });
  };

  // If user enters a doubt question
  const handleDoubtSubmit = (doubtText) => {
    if (!selectedTopic) {
      setError('Please select a topic before asking a doubt.');
      return;
    }
    setIsLoading(true);
    if (isNarrationPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.stopNarration();
      setIsNarrationPlaying(false);
    }
    initiateWebRTCSession(selectedTopic, doubtText);
  };

  // Render whichever visualization is relevant
  const renderVisualization = () => {
    if (isLoading && !visualizationData) {
      return renderLoadingPlaceholder();
    }

    if (!visualizationData) {
      return <div>No visualization data available</div>;
    }

    const VisualizationComponent = VISUALIZATIONS[selectedTopic];
    if (!VisualizationComponent) {
      return <div>No visualization component available for {selectedTopic}</div>;
    }

    return (
      <VisualizationComponent
        data={visualizationData}
        highlightedElements={highlightedElements}
        currentTime={Date.now()}
      />
    );
  };

  // Called when narration is done or highlights update
  const handleNarrationComplete = (highlightedNodes, isComplete) => {
    if (highlightedNodes && highlightedNodes.length > 0) {
      setHighlightedElements(highlightedNodes);
    } else if (isComplete) {
      setIsNarrationPlaying(false);
      setIsNarrationOnly(false);
      setHighlightedElements([]);
    } else {
      setHighlightedElements([]);
    }
  };

  // Start the TTS-based narration
  const handlePlayNarration = () => {
    if (selectedTopic && visualizationData) {
      setIsNarrationOnly(true);
      setTimeout(() => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.stopNarration();
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
        isPlaying={!!realtimeSession}
        onPlayPause={() => {
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
            {isLoading && visualizationData && (
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
              topic={realtimeSession.topic || ''}
              doubt={realtimeSession.doubt || ''}
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

            {/* Hidden player for narration-only mode */}
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
