"use client"
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client'
import VisualizationPanel from './VisualizationPanel';
import ControlPanel from './ControlPanel';
import ResponsePanel from './ResponsePanel';
import DoubtBox from './DoubtBox';
// import './streaming.css';
// import AudioPlayer from './AudioPlayer';
import RealtimeAudioPlayer from "./RealTimeAudioPlayer"

// Import visualization components
import ERVisualization from './ERVisualization';
// import DocumentVisualization from './DocumentVisualization';
// import HierarchicalVisualization from './HierarchicalVisualization';
// import EntityVisualization from './EntityVisualization';
// import AttributeVisualization from './AttributeVisualization';
// import SharedMemoryVisualization from './Shared_memoryVisualization';
// import SharedDiskVisualization from './Shared_diskVisualization';
// import SharedNothingVisualization from './Shared_nothingVisualization';
// import DistributedDatabaseVisualization from './Distributed_databaseVisualization';
// import OOPConceptsVisualization from './Oop_conceptsVisualization';
// import RelationalQueryVisualization from './RelationalqueryVisualization';
// import NormalFormVisualization from './NormalizationVisualization';
// import ActiveDBVisualization from './ActivedbVisualization';
// import QueryProcessingVisualization from './QueryprocessingVisualization';
// import MobiledbVisualization from './MobiledbVisualization';
// import GISVisualization from './GisVisualization';
// import BusinessPolicyVisualization from './BusinessPolicyVisualization';

// Define the VISUALIZATIONS object
const VISUALIZATIONS = {
  er: ERVisualization,
  // document: DocumentVisualization,
  // hierarchical: HierarchicalVisualization,
  // entity: EntityVisualization,
  // attribute: AttributeVisualization,
  // shared_memory: SharedMemoryVisualization,
  // shared_disk: SharedDiskVisualization,
  // shared_nothing: SharedNothingVisualization,
  // distributed_database: DistributedDatabaseVisualization,
  // oop_concepts: OOPConceptsVisualization,
  // relationalQuery: RelationalQueryVisualization,
  // normalization: NormalFormVisualization,
  // activedb: ActiveDBVisualization,
  // queryprocessing: QueryProcessingVisualization,
  // mobiledb: MobiledbVisualization,
  // gis: GISVisualization,
  // businesspolicy: BusinessPolicyVisualization
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

export default function RenderComponent () {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('er');
  const [visualizationData, setVisualizationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [doubt, setDoubt] = useState('');
  const [doubtResponse, setDoubtResponse] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const audioRef = useRef(null);
  const audioChunks = useRef([]);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const currentAudioRef = useRef(null);
  
  // Add state for timing chunks
  const [timingChunks, setTimingChunks] = useState([]);
  const [narrationTimestamps, setNarrationTimestamps] = useState([]);
  
  // Add state for realtime session
  const [realtimeSession, setRealtimeSession] = useState(null);
  
  // Initialize Socket.IO connection
  useEffect(() => {
    // Configure Socket.IO client with proper options
    const backendUrl = window.BACKEND_URL || window.location.origin;
    console.log('Connecting to backend at:', backendUrl);
    
    const newSocket = io(backendUrl, {
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
    });

    newSocket.on('audio_chunk', (chunk) => {
      audioChunks.current.push(chunk);
    });

    newSocket.on('audio_complete', (data) => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      audioChunks.current = [];
      
      if (data.word_timings) {
        // Process word timings for highlighting
        console.log('Word timings received:', data.word_timings);
      }
    });

    newSocket.on('doubt_response', (data) => {
      console.log('Received doubt response:', data);
      setDoubtResponse(data);
      setIsLoading(false);
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
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialLoad]);

  // Add a useEffect to handle timing chunks
  // useEffect(() => {
  //   if (!socket) return;
    
  //   // Handle timing chunks
  //   socket.on('timing_chunk', (data) => {
  //     console.log(`Received timing chunk ${data.chunk_index + 1} of ${data.total_chunks}`);
      
  //     // Add the chunk to the state
  //     setTimingChunks(prev => {
  //       const newChunks = [...prev];
  //       newChunks[data.chunk_index] = data.timestamps;
  //       return newChunks;
  //     });
  //   });
    
  //   return () => {
  //     socket.off('timing_chunk');
  //   };
  // }, [socket]);
  
  // Add a useEffect to assemble timing chunks when they're all received
  // useEffect(() => {
  //   // Check if we have all chunks
  //   if (timingChunks.length > 0 && !timingChunks.includes(undefined)) {
  //     // Flatten the chunks into a single array
  //     const allTimestamps = timingChunks.flat();
  //     console.log(`Assembled ${allTimestamps.length} timestamps from ${timingChunks.length} chunks`);
      
  //     // Set the narration timestamps
  //     setNarrationTimestamps(allTimestamps);
      
  //     // Clear the chunks
  //     setTimingChunks([]);
  //   }
  // }, [timingChunks]);
  
  // Update the useEffect that handles highlights to use narrationTimestamps
  // useEffect(() => {
  //   if (narrationTimestamps.length > 0 && isPlaying) {
  //     const highlights = narrationTimestamps.filter(
  //       timing => timing.start_time <= currentTime && timing.end_time >= currentTime
  //     ).map(timing => timing.node_id).flat().filter(Boolean);
      
  //     setHighlightedElements(highlights);
  //   }
  // }, [currentTime, narrationTimestamps, isPlaying]);

  // Auto-play narration when visualization data is loaded
  useEffect(() => {
    if (visualizationData && !isPlaying && audioRef.current) {
      // Short delay to ensure everything is ready
      const timer = setTimeout(() => {
        handlePlayPause();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [visualizationData]);

  // Add a new useEffect for handling audio queue
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlayingAudio) {
      playNextAudio();
    }
  }, [audioQueue, isPlayingAudio]);

  // Function to play the next audio in the queue
  const playNextAudio = () => {
    if (audioQueue.length === 0) {
      setIsPlayingAudio(false);
      return;
    }
    
    setIsPlayingAudio(true);
    
    const nextAudio = audioQueue[0];
    const audioBlob = new Blob([nextAudio], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Create a new audio element
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    
    // Set up event listeners
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      setAudioQueue(prev => prev.slice(1));
      setIsPlayingAudio(false);
    };
    
    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      URL.revokeObjectURL(audioUrl);
      setAudioQueue(prev => prev.slice(1));
      setIsPlayingAudio(false);
    };
    
    // Play the audio
    audio.play().catch(err => {
      console.error('Failed to play audio:', err);
      setIsPlayingAudio(false);
    });
  };

  // Update the socket event handler for audio chunks
  useEffect(() => {
    if (!socket) return;
    
    // Handle audio chunks - we'll let AudioPlayer handle this now
    socket.on('audio_chunk', (data) => {
      console.log('App received audio chunk of size:', data.audio_data ? data.audio_data.length : 'unknown');
      // We don't need to handle this here anymore since AudioPlayer will handle it
      // setAudioQueue(prev => [...prev, data.audio_data]);
    });
    
    return () => {
      socket.off('audio_chunk');
    };
  }, [socket]);

  const handleTopicChange = (topic) => {
    setSelectedTopic(topic);
    setDoubtResponse(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsPlaying(false);
    setCurrentTime(0);
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

  // Handle doubt submission
  const handleDoubtSubmit = async (doubtText, currentState = {}) => {
    if (!socket || !doubtText.trim() || !selectedTopic) return;
    
    setIsLoading(true);
    setDoubtResponse(null);
    setDoubt(doubtText);
    
    console.log('Submitting doubt:', doubtText, 'Current state:', currentState);
    
    // Emit the doubt event with WebRTC flag
    socket.emit('doubt', {
      topic: selectedTopic,
      doubt: doubtText,
      current_time: currentState.currentTime || currentTime,
      current_state: {
        highlighted_elements: currentState.highlightedElements || highlightedElements,
        is_original_narration: currentState.isOriginalNarration !== undefined 
          ? currentState.isOriginalNarration 
          : true
      },
      use_webrtc: true // Add a flag to indicate we want to use WebRTC
    });
    
    // Return a promise that resolves when the session starts or times out
    return new Promise((resolve, reject) => {
      // Set a timeout to reject the promise if no response is received
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout waiting for response'));
        setIsLoading(false);
        setError('Timeout waiting for response. Please try again.');
      }, 15000);
      
      // Create a one-time check function
      const checkSession = setInterval(() => {
        if (realtimeSession) {
          clearTimeout(timeoutId);
          clearInterval(checkSession);
          resolve(realtimeSession);
        }
      }, 500);
      
      // Also clear on component unmount
      return () => {
        clearTimeout(timeoutId);
        clearInterval(checkSession);
      };
    });
  };

  const handlePlayAudio = () => {
    if (!audioUrl || !audioRef.current) return;
    
    if (isAudioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsAudioPlaying(!isAudioPlaying);
  };

  const handlePlayPause = () => {
    if (!visualizationData) return;
    
    if (isPlaying) {
      cancelAnimationFrame(animationFrameRef.current);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      // Reset to beginning if at the end
      if (audioRef.current && audioRef.current.ended) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      
      startTimeRef.current = performance.now() - currentTime;
      animate();
      setIsPlaying(true);
      
      if (audioRef.current) {
        audioRef.current.currentTime = currentTime / 1000;
        audioRef.current.play().catch(err => {
          console.error("Audio playback error:", err);
          // Continue with animation even if audio fails
          setIsAudioPlaying(false);
        });
      }
    }
  };

  console.log("sahil.....")

  const animate = () => {
    const now = performance.now();
    const newTime = now - startTimeRef.current;
    
    setCurrentTime(newTime);
    
    // Check if animation should continue
    if (visualizationData?.narration_timestamps) {
      const lastTimestamp = visualizationData.narration_timestamps[
        visualizationData.narration_timestamps.length - 1
      ]?.end_time || 0;
      
      if (newTime < lastTimestamp) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    } else {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  const renderVisualization = () => {
    if (!visualizationData || !selectedTopic) return null;
    
    const VisualizationComponent = VISUALIZATIONS[selectedTopic];
    
    if (!VisualizationComponent) {
      return <div>No visualization component available for {selectedTopic}</div>;
    }
    
    return (
      <VisualizationComponent
        data={visualizationData}
        highlightedElements={highlightedElements}
        currentTime={currentTime}
      />
    );
  };

  // Add a new useEffect hook to handle streaming responses
  useEffect(() => {
    if (!socket) return;

    // Handle streaming doubt chunks
    socket.on('doubt_chunk', (data) => {
      console.log('Received doubt chunk:', data);
      // The DoubtBox component will handle displaying the chunks
    });

    // Handle completion of streaming
    socket.on('doubt_complete', (data) => {
      console.log('Doubt response complete:', data);
      setDoubtResponse(data);
      setIsLoading(false);
      
      // Update highlighted elements if provided
      if (data.highlights && data.highlights.length > 0) {
        setHighlightedElements(data.highlights);
      }
    });

    return () => {
      socket.off('doubt_chunk');
      socket.off('doubt_complete');
    };
  }, [socket]);

  // Update the socket event handler for realtime session
  useEffect(() => {
    if (!socket) return;
    
    // Persistent event listener for WebRTC session start
    const handleWebRTCSessionStart = (data) => {
      console.log('WebRTC session start received:', data);
      
      // Fix: Use doubt instead of doubtText
      setRealtimeSession({
        sessionId: data.sessionId || Date.now().toString(),
        topic: data.topic || selectedTopic,
        doubt: data.doubt || doubt, // Changed from doubtText to doubt
        visualizationData: data.visualizationData || visualizationData
      });
      
      setIsLoading(false);
    };
    
    socket.on('start_webrtc_session', handleWebRTCSessionStart);
    
    return () => {
      socket.off('start_webrtc_session', handleWebRTCSessionStart);
    };
  }, [socket, selectedTopic, doubt, visualizationData]); // Changed from doubtText to doubt

  // Add a function to handle the completion of the narration
  const handleNarrationComplete = (highlightedNodes, isComplete = true) => {
    console.log('Received highlighted nodes:', highlightedNodes, 'isComplete:', isComplete);
    
    // Update highlighted elements if provided
    if (highlightedNodes && highlightedNodes.length > 0) {
      console.log('Setting highlighted nodes:', highlightedNodes);
      
      // Force a re-render by creating a new array
      const newHighlights = [...highlightedNodes];
      
      // Log the current and new highlights for debugging
      console.log('Current highlights:', highlightedElements);
      console.log('New highlights:', newHighlights);
      
      // Update the state with the new highlights
      setHighlightedElements(newHighlights);
      
      // Force a re-render of the visualization component
      // by updating currentTime even if we're not in a realtime session
      setCurrentTime(() => {
        console.log('Updating currentTime to force re-render');
        const newTime = Date.now();
        console.log('New currentTime:', newTime);
        return newTime; // Use current timestamp to ensure a change
      });
    } else {
      console.log('No highlighted nodes provided');
    }
    
    // Only close the session if isComplete is true
    if (isComplete) {
      console.log('Narration complete, returning to visualization view');
      setRealtimeSession(null);
    }
  };

  console.log("3333333333", realtimeSession)

  return (
    <div className="app-container text-black">
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
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        hasVisualization={!!visualizationData}
      />
      
      <div className="main-content">
        {realtimeSession ? (
          <>
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
            <div className="realtime-container">
              <RealtimeAudioPlayer 
                topic={realtimeSession.topic}
                doubt={realtimeSession.doubt}
                sessionId={realtimeSession.sessionId}
                onComplete={handleNarrationComplete}
                visualizationData={visualizationData || window.visualizationData}
              />
            </div>
          </>
        ) : (
          <>
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
            
            <ResponsePanel
              response={visualizationData?.narration || response}
              audioUrl={audioUrl}
              onPlayAudio={handlePlayAudio}
              isAudioPlaying={isAudioPlaying}
              audioRef={audioRef}
              currentTime={currentTime}
              highlightedWord={
                narrationTimestamps.length > 0 ?
                  narrationTimestamps.find(
                    timing => timing.start_time <= currentTime && timing.end_time >= currentTime
                  )?.word || '' :
                  visualizationData?.narration_timestamps?.find(
                    timing => timing.start_time <= currentTime && timing.end_time >= currentTime
                  )?.word || ''
              }
            />
            
            {/* <AudioPlayer socket={socket} /> */}
          </>
        )}
      </div>
      
      <DoubtBox
        onSubmit={handleDoubtSubmit}
        isLoading={isLoading}
        doubtResponse={doubtResponse}
        socket={socket}
      />
      
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
          onEnded={() => {
            setIsAudioPlaying(false);
            setIsPlaying(false);
          }}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};
