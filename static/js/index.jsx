// Main React component for the database visualization application
// This file connects the frontend to our Socket.IO server

// Define the available visualization topics
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

// Main App component
function App() {
  const [selectedTopic, setSelectedTopic] = React.useState('');
  const [doubt, setDoubt] = React.useState('');
  const [response, setResponse] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [client, setClient] = React.useState(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [highlights, setHighlights] = React.useState([]);
  
  // State for visualization
  const [visualizationData, setVisualizationData] = React.useState(null);
  const [isVisualizationLoading, setIsVisualizationLoading] = React.useState(false);
  const [visualizationError, setVisualizationError] = React.useState(null);
  
  // Enhanced audio state
  const [audioUrl, setAudioUrl] = React.useState(null);
  const [audioChunks, setAudioChunks] = React.useState([]);
  const [isAudioPlaying, setIsAudioPlaying] = React.useState(false);
  const [isAudioReady, setIsAudioReady] = React.useState(false);
  const [audioBlob, setAudioBlob] = React.useState(null);
  const audioRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  
  // Reference to the visualization container
  const visualizationRef = React.useRef(null);
  
  // Initialize Web Audio API context
  React.useEffect(() => {
    // Create AudioContext only when needed to avoid autoplay restrictions
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
          console.log('AudioContext initialized');
        }
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
      }
    }
    
    // Cleanup function
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => console.error('Error closing AudioContext:', err));
      }
    };
  }, []);
  
  // Process audio chunks when they are updated
  React.useEffect(() => {
    if (audioChunks.length > 0) {
      // Create a new blob from all chunks
      const blob = new Blob(audioChunks, { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      
      // Update audio state
      setAudioBlob(blob);
      setAudioUrl(url);
      setIsAudioReady(true);
      
      console.log(`Audio blob created from ${audioChunks.length} chunks, size: ${blob.size} bytes`);
      
      // Clean up previous URL if it exists
      return () => {
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      };
    }
  }, [audioChunks]);
  
  // Initialize the client
  React.useEffect(() => {
    console.log('Initializing RealtimeClient...');
    
    // Function to initialize the client
    const initClient = () => {
      if (typeof window.RealtimeClient !== 'undefined') {
        console.log('RealtimeClient is available!');
        
        // Get server URL from config if available, otherwise use default
        const serverUrl = window.serverConfig ? window.serverConfig.getServerUrl() : 'http://' + window.location.hostname + ':3000';
        console.log('Socket.IO server URL:', serverUrl);
        
        const newClient = new window.RealtimeClient({
          baseUrl: serverUrl,
          onTextChunk: (chunk) => {
            console.log('Received text chunk');
            setResponse(prev => prev + chunk);
          },
          onResponseData: (data) => {
            console.log('Received complete response data:', data);
            if (data.explanation) {
              setResponse(data.explanation);
            }
            if (data.highlightElements) {
              setHighlights(data.highlightElements.map(h => h.id));
            }
            setIsLoading(false);
          },
          onAudioChunk: (chunk) => {
            console.log('Received audio chunk, size:', chunk.byteLength || chunk.length || 'unknown');
            // Add the new chunk to our collection of chunks
            setAudioChunks(prevChunks => [...prevChunks, chunk]);
          },
          onStatus: (status) => {
            console.log('Status update:', status);
            if (status.message && status.message.includes('audio')) {
              console.log('Audio status update:', status.message);
            }
          },
          onError: (error) => {
            console.error('Error from server:', error);
            setError(error.message || 'An error occurred');
            setIsLoading(false);
          },
          onEnd: (data) => {
            console.log('Processing completed');
            setIsLoading(false);
            
            // Handle audio if available as URL (fallback)
            if (data && data.audioUrl && audioChunks.length === 0) {
              console.log('Audio URL received (fallback):', data.audioUrl);
              setAudioUrl(data.audioUrl);
              setIsAudioReady(true);
            }
            
            // Handle audio blob if available (fallback)
            if (data && data.audioBlob && audioChunks.length === 0) {
              console.log('Audio blob received (fallback)');
              const url = URL.createObjectURL(data.audioBlob);
              setAudioBlob(data.audioBlob);
              setAudioUrl(url);
              setIsAudioReady(true);
            }
            
            console.log('Audio state after processing:', { 
              chunksReceived: audioChunks.length,
              audioUrl: !!audioUrl,
              audioBlob: !!audioBlob,
              isAudioReady
            });
          }
        });
        
        console.log('RealtimeClient initialized');
        setClient(newClient);
        
        // Connect to the Socket.IO server
        newClient.connect()
          .then(() => {
            console.log('Connected to Socket.IO server');
            setIsConnected(true);
          })
          .catch(error => {
            console.error('Failed to connect to Socket.IO server:', error);
            setError('Failed to connect to the server. Please try again.');
          });
        
        return newClient;
      } else {
        console.error('RealtimeClient is not available');
        return null;
      }
    };
    
    // Initialize the client
    const client = initClient();
    
    // Cleanup function
    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);
  
  // Load visualization data when topic changes
  React.useEffect(() => {
    if (!selectedTopic) {
      setVisualizationData(null);
      return;
    }
    
    // Reset state when topic changes
    setVisualizationData(null);
    setIsVisualizationLoading(true);
    setVisualizationError(null);
    setResponse('');
    resetAudio();
    
    // Use the visualization loader to load data
    if (window.visualizationLoader) {
      window.visualizationLoader.loadData(selectedTopic)
        .then(data => {
          console.log('Loaded visualization data:', data);
          setVisualizationData(data);
          setIsVisualizationLoading(false);
        })
        .catch(error => {
          console.error('Error fetching visualization data:', error);
          setVisualizationError(error.message);
          setIsVisualizationLoading(false);
        });
    } else {
      // Fallback to direct fetch if visualization loader is not available
      const serverUrl = window.serverConfig ? window.serverConfig.getServerUrl() : window.location.origin;
      
      fetch(`${serverUrl}/api/visualization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: selectedTopic })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load visualization data: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Loaded visualization data:', data);
        setVisualizationData(data);
        setIsVisualizationLoading(false);
      })
      .catch(error => {
        console.error('Error fetching visualization data:', error);
        setVisualizationError(error.message);
        setIsVisualizationLoading(false);
      });
    }
  }, [selectedTopic]);
  
  // Handle topic change
  const handleTopicChange = (e) => {
    setSelectedTopic(e.target.value);
    setResponse('');
    setHighlights([]);
    resetAudio();
  };
  
  // Reset audio state
  const resetAudio = () => {
    // Clean up previous URL if it exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioUrl(null);
    setAudioChunks([]);
    setAudioBlob(null);
    setIsAudioPlaying(false);
    setIsAudioReady(false);
    
    // Stop audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  // Handle doubt submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!doubt.trim() || !selectedTopic || !client) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResponse('');
    resetAudio();
    
    try {
      console.log('Submitting doubt:', doubt);
      
      await client.processDoubt({
        topic: selectedTopic,
        doubt: doubt,
        current_state: {
          highlightedElements: highlights,
          currentTime: 0,
          isOriginalNarration: true,
          currentNarration: ''
        },
        relevantNodes: []
      });
      
      console.log('Doubt submitted successfully');
    } catch (error) {
      console.error('Error submitting doubt:', error);
      setError('Failed to process your doubt. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Handle audio playback
  const handlePlayAudio = () => {
    if (audioRef.current && audioUrl) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => {
            setIsAudioPlaying(true);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            
            // Try to resume AudioContext if it's suspended (autoplay policy)
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume().then(() => {
                console.log('AudioContext resumed');
                return audioRef.current.play();
              }).then(() => {
                setIsAudioPlaying(true);
              }).catch(err => {
                console.error('Failed to resume audio context:', err);
                setError('Audio playback failed. Please click the play button again or use the audio controls directly.');
              });
            } else {
              setError('Audio playback failed. Please click the play button again or use the audio controls directly.');
            }
          });
      }
    } else if (audioChunks.length > 0 && !audioUrl) {
      // If we have chunks but no URL yet, create one
      const blob = new Blob(audioChunks, { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      setIsAudioReady(true);
      
      // Try to play after a short delay to allow the audio element to update
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
              setIsAudioPlaying(true);
            })
            .catch(error => {
              console.error('Error playing audio after creating URL:', error);
            });
        }
      }, 100);
    }
  };
  
  // Render the visualization component
  const renderVisualization = () => {
    if (isVisualizationLoading) {
      return <div className="loading">Loading visualization...</div>;
    }
    
    if (visualizationError) {
      // Check if it's a mock data message
      const isMockData = visualizationError.includes('mock data') || 
                         visualizationError.includes('API endpoint');
      
      return (
        <div className={isMockData ? "warning" : "error"}>
          <p>{visualizationError}</p>
          {isMockData && (
            <p className="note">
              Note: The visualization is using mock data because the API endpoint is not available. 
              This is a fallback to allow you to see the visualization structure.
            </p>
          )}
        </div>
      );
    }
    
    if (!visualizationData) {
      return <div className="empty">Select a topic to view its visualization.</div>;
    }
    
    // Check if JSX loader is available
    if (window.jsxLoader) {
      console.log('Using JSX visualization for', selectedTopic);
      return <JSXVisualization data={visualizationData} topic={selectedTopic} />;
    } else {
      console.warn('JSX loader not available, using D3 visualization');
      return <D3Visualization data={visualizationData} topic={selectedTopic} />;
    }
  };
  
  // JSX Visualization component that loads the appropriate component for the topic
  const JSXVisualization = ({ data, topic }) => {
    const [Component, setComponent] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    
    React.useEffect(() => {
      setIsLoading(true);
      setError(null);
      
      // Try to load the JSX component using the JSX loader
      if (window.jsxLoader) {
        console.log(`Attempting to load JSX component for ${topic}`);
        window.jsxLoader.loadComponent(topic)
          .then(component => {
            console.log(`Successfully loaded JSX component for ${topic}`);
            setComponent(() => component);
            setIsLoading(false);
          })
          .catch(error => {
            console.error(`Failed to load JSX component for ${topic}:`, error);
            setError(`Failed to load visualization component for ${topic}. Falling back to D3 visualization.`);
            setIsLoading(false);
          });
      } else {
        console.warn('JSX loader not available, falling back to D3 visualization');
        setError('JSX loader not available. Falling back to D3 visualization.');
        setIsLoading(false);
      }
    }, [topic]);
    
    if (isLoading) {
      return <div className="loading">Loading JSX visualization component...</div>;
    }
    
    if (error) {
      console.warn('Using D3 fallback visualization due to error:', error);
      return <D3Visualization data={data} topic={topic} />;
    }
    
    if (!Component) {
      console.warn('No component found, using D3 fallback visualization');
      return <D3Visualization data={data} topic={topic} />;
    }
    
    // Render the JSX component with the data
    try {
      console.log('Rendering JSX component with data:', data);
      return <Component data={data} />;
    } catch (error) {
      console.error('Error rendering JSX component:', error);
      return (
        <div className="error">
          <h3>Error Rendering Visualization</h3>
          <p>{error.message}</p>
          <D3Visualization data={data} topic={topic} />
        </div>
      );
    }
  };
  
  // D3 Visualization component (fallback)
  const D3Visualization = ({ data, topic }) => {
    const svgRef = React.useRef(null);
    
    React.useEffect(() => {
      if (!data || !svgRef.current) return;
      
      // Clear any existing visualization
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      
      // Set up the visualization dimensions
      const width = 800;
      const height = 600;
      const margin = { top: 50, right: 50, bottom: 50, left: 50 };
      
      // Create the SVG container
      svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      
      // Extract entities and relationships from the data
      let entities = [];
      let relationships = [];
      
      try {
        // Try to extract entities and relationships based on the data structure
        if (data.entities && Array.isArray(data.entities)) {
          entities = data.entities;
        } else if (data.nodes && Array.isArray(data.nodes)) {
          entities = data.nodes;
        } else if (data.data && data.data.entities && Array.isArray(data.data.entities)) {
          entities = data.data.entities;
        }
        
        if (data.relationships && Array.isArray(data.relationships)) {
          relationships = data.relationships;
        } else if (data.links && Array.isArray(data.links)) {
          relationships = data.links;
        } else if (data.edges && Array.isArray(data.edges)) {
          relationships = data.edges;
        } else if (data.data && data.data.relationships && Array.isArray(data.data.relationships)) {
          relationships = data.data.relationships;
        }
      } catch (error) {
        console.error("Error extracting data for visualization:", error);
        
        // Create some dummy data if extraction failed
        entities = [
          { id: "entity1", name: "Entity 1", type: "table" },
          { id: "entity2", name: "Entity 2", type: "table" },
          { id: "entity3", name: "Entity 3", type: "table" }
        ];
        
        relationships = [
          { source: "entity1", target: "entity2", type: "one-to-many" },
          { source: "entity2", target: "entity3", type: "one-to-one" }
        ];
      }
      
      // Create a force simulation
      const simulation = d3.forceSimulation(entities)
        .force("link", d3.forceLink(relationships).id(d => d.id || d.name))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(80));
      
      // Draw the links
      const link = svg.append("g")
        .selectAll("line")
        .data(relationships)
        .enter()
        .append("line")
        .attr("stroke", "#999")
        .attr("stroke-width", 2);
      
      // Create node groups
      const node = svg.append("g")
        .selectAll(".node")
        .data(entities)
        .enter()
        .append("g")
        .attr("class", "node")
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));
      
      // Add rectangles for entities
      node.append("rect")
        .attr("width", 120)
        .attr("height", 60)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("fill", "#69b3a2")
        .attr("stroke", "#000");
      
      // Add entity names
      node.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("x", 60)
        .attr("y", 30)
        .text(d => d.name || d.id || "Unknown")
        .attr("fill", "white")
        .attr("font-weight", "bold");
      
      // Add title for tooltips
      node.append("title")
        .text(d => JSON.stringify(d, null, 2));
      
      // Update positions on simulation tick
      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);
        
        node
          .attr("transform", d => `translate(${d.x - 60},${d.y - 30})`);
      });
      
      // Drag functions
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      
      // Add a title to the visualization
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(`${topic.charAt(0).toUpperCase() + topic.slice(1)} Visualization`);
      
    }, [data, topic]);
    
    return (
      <div className="d3-visualization">
        <h3>{topic.charAt(0).toUpperCase() + topic.slice(1)} Visualization</h3>
        <svg ref={svgRef}></svg>
      </div>
    );
  };
  
  return (
    <div className="app-container">
      <h1>Database Visualization</h1>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      <div className="controls">
        <select 
          value={selectedTopic} 
          onChange={handleTopicChange}
          className="topic-selector"
        >
          <option value="">Select a topic</option>
          {TOPICS.map(topic => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
        
        <div className="connection-status">
          {isConnected ? (
            <span className="connected">Connected to server</span>
          ) : (
            <span className="disconnected">Not connected to server</span>
          )}
        </div>
      </div>
      
      {/* Enhanced Audio Player */}
      {(isAudioReady || audioChunks.length > 0) && (
        <div className="audio-player-container">
          <h3>Audio Explanation {audioChunks.length > 0 && !isAudioReady ? '(Streaming...)' : ''}</h3>
          <div className="audio-status">
            {audioChunks.length > 0 && (
              <div className="audio-chunks-info">
                Received {audioChunks.length} audio chunks
                {audioBlob && ` (${(audioBlob.size / 1024).toFixed(1)} KB)`}
              </div>
            )}
          </div>
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            controls 
            onPlay={() => setIsAudioPlaying(true)}
            onPause={() => setIsAudioPlaying(false)}
            onEnded={() => setIsAudioPlaying(false)}
          />
          <button 
            onClick={handlePlayAudio}
            className="play-audio-btn"
            disabled={audioChunks.length === 0 && !audioUrl}
          >
            {isAudioPlaying ? 'Pause Audio' : 'Play Audio'}
          </button>
        </div>
      )}
      
      {/* Loading indicator for audio */}
      {isLoading && (
        <div className="audio-loading">
          <div className="loading-spinner"></div>
          <p>Processing your question and generating audio response...</p>
        </div>
      )}
      
      <div className="content-container">
        <div className="visualization-container" ref={visualizationRef}>
          {renderVisualization()}
        </div>
        
        <div className="interaction-panel">
          <form onSubmit={handleSubmit} className="doubt-form">
            <input
              type="text"
              value={doubt}
              onChange={(e) => setDoubt(e.target.value)}
              placeholder="Ask a question about the visualization..."
              disabled={isLoading || !isConnected || !selectedTopic}
              className="doubt-input"
            />
            <button 
              type="submit" 
              disabled={isLoading || !isConnected || !selectedTopic || !doubt.trim()}
              className="submit-button"
            >
              {isLoading ? 'Processing...' : 'Ask'}
            </button>
          </form>
          
          <div className="response-container">
            {response && (
              <div className="response">
                <p>{response}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .app-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 {
          text-align: center;
          color: #1e293b;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .topic-selector {
          padding: 10px 20px;
          font-size: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          min-width: 250px;
        }
        
        .connection-status {
          font-size: 14px;
        }
        
        .connected {
          color: #16a34a;
        }
        
        .disconnected {
          color: #dc2626;
        }
        
        .content-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .visualization-container {
          height: 400px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          background-color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .d3-visualization {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .d3-visualization h3 {
          text-align: center;
          margin-top: 0;
        }
        
        .d3-visualization svg {
          flex: 1;
        }
        
        .empty, .loading, .error {
          text-align: center;
          color: #64748b;
          font-size: 16px;
          padding: 20px;
        }
        
        .error {
          color: #dc2626;
        }
        
        .warning {
          color: #d97706;
          background-color: #fef3c7;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 15px;
        }
        
        .note {
          font-size: 14px;
          font-style: italic;
          margin-top: 10px;
        }
        
        .audio-player-container {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          background-color: white;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .audio-player-container h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #1e293b;
        }
        
        .audio-status {
          margin-bottom: 10px;
          font-size: 14px;
          color: #64748b;
        }
        
        .audio-chunks-info {
          background-color: #f1f5f9;
          padding: 5px 10px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 10px;
        }
        
        .audio-player-container audio {
          width: 100%;
          margin-bottom: 10px;
          border-radius: 4px;
        }
        
        .play-audio-btn {
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          font-size: 16px;
          display: block;
          width: 100%;
          transition: background-color 0.2s;
        }
        
        .play-audio-btn:hover:not(:disabled) {
          background-color: #45a049;
        }
        
        .play-audio-btn:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .audio-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          background-color: #f1f5f9;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .loading-spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .interaction-panel {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          background-color: white;
        }
        
        .doubt-form {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .doubt-input {
          flex: 1;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 16px;
        }
        
        .submit-button {
          padding: 12px 24px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .submit-button:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }
        
        .response-container {
          margin-top: 20px;
        }
        
        .response {
          background-color: #f8fafc;
          padding: 15px;
          border-radius: 6px;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}

// Render the App component to the DOM
ReactDOM.render(<App />, document.getElementById('root')); 