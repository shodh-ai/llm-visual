import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const RealtimeAudioPlayer = forwardRef(({ topic, doubt, sessionId, onComplete, visualizationData }, ref) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [text, setText] = useState('');
  const [highlightedWord, setHighlightedWord] = useState('');
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const [debugInfo, setDebugInfo] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [events, setEvents] = useState([]);
  const [nodesToHighlight, setNodesToHighlight] = useState([]);
  const [currentSpeechPosition, setCurrentSpeechPosition] = useState(0);
  const [recentText, setRecentText] = useState('');
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [isSessionStopping, setIsSessionStopping] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [isMicrophoneRequested, setIsMicrophoneRequested] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [lastHighlightTime, setLastHighlightTime] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioElementRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const sessionInProgressRef = useRef(false);
  const sessionStartedTimeRef = useRef(null);
  const mountedRef = useRef(true);
  const maxRetries = useRef(3); // Maximum number of retry attempts
  
  // Add a reference for the clear timeout
  const clearHighlightsTimeoutRef = useRef(null);
  
  // Add a reference to track the last processed text position
  const lastProcessedPositionRef = useRef(0);
  
  // Add a state for tracking word-level timing
  const [wordTimings, setWordTimings] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const wordTimingIntervalRef = useRef(null);
  
  // Add a reference for the text display container
  const textDisplayRef = useRef(null);
  // Add a reference for the current word element
  const currentWordElementRef = useRef(null);
  
  // Add state for speech rate calibration
  const [speechRate, setSpeechRate] = useState(350); // milliseconds per word (initial estimate)
  const speechRateCalibrationRef = useRef({
    wordCount: 0,
    startTime: null,
    timings: []
  });
  
  // Add a reference to track when audio actually starts playing
  const audioStartTimeRef = useRef(null);
  // Add a reference to track the audio playback offset
  const audioPlaybackOffsetRef = useRef(0);
  // Add a reference to track audio playback position
  const audioPositionRef = useRef(0);
  // Add a reference to track audio playback time updates
  const audioTimeUpdateRef = useRef(null);
  // Add state to track if audio is currently playing
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  // Add a ref for narration audio
  const narrationAudioRef = useRef(null);
  
  // Add a debounce function at the top of the component
  const useDebounce = (callback, delay) => {
    const timeoutRef = useRef(null);
    
    return (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    };
  };
  
  // Create debounced versions of the highlight update functions
  const debouncedHighlightUpdate = useDebounce((nodesToShow) => {
    console.log('HIGHLIGHT DEBUG: Applying debounced highlight update with nodes:', nodesToShow);
    
    // Clear any pending clear timeout
    if (clearHighlightsTimeoutRef.current) {
      clearTimeout(clearHighlightsTimeoutRef.current);
      clearHighlightsTimeoutRef.current = null;
    }
    
    // Update highlighted nodes
    setNodesToHighlight(nodesToShow);
    
    // Also pass to parent component for immediate highlighting
    if (onComplete && typeof onComplete === 'function') {
      console.log('HIGHLIGHT DEBUG: Calling onComplete with debounced nodes:', nodesToShow);
      onComplete(nodesToShow, false);
    }
    
    // Set the highlighted word to the top node ID if available
    if (nodesToShow.length > 0) {
      setHighlightedWord(nodesToShow[0]);
      
      // Trigger pulsing effect
      setIsPulsing(true);
      setTimeout(() => {
        if (mountedRef.current) {
          setIsPulsing(false);
        }
      }, 1000);
    } else {
      setHighlightedWord('');
    }
  }, 50); // Reduce debounce delay from 100ms to 50ms for more immediate highlighting
  
  // Track the last highlighted nodes for comparison
  const lastHighlightedNodesRef = useRef([]);
  
  // Helper function to add debug info
  const addDebugInfo = (message) => {
    console.log(`[RealtimeAudioPlayer] ${message}`);
    if (mountedRef.current) {
    setDebugInfo(prev => [...prev, `${new Date().toISOString().substr(11, 8)}: ${message}`]);
    }
  };
  
  // Function to clear highlights after a delay
  const scheduleClearHighlights = () => {
    // Clear any existing timeout
    if (clearHighlightsTimeoutRef.current) {
      clearTimeout(clearHighlightsTimeoutRef.current);
    }
    
    // Set a new timeout to clear highlights after 1 second of no matches
    clearHighlightsTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.log('HIGHLIGHT DEBUG: Clearing highlights after timeout');
        setNodesToHighlight([]);
        setHighlightedWord('');
        if (onComplete && typeof onComplete === 'function') {
          onComplete([], false);
        }
      }
    }, 1000);
  };
  
  // Start WebRTC session
  useEffect(() => {
    // Set mounted flag
    mountedRef.current = true;
    setIsMounted(true);
    
    // Clear any previous state
    setText('');
    setHighlightedWord('');
    setError(null);
    setNodesToHighlight([]);
    setIsComplete(false);
    setEvents([]);
    
    if (!topic || !doubt || !sessionId) {
      setConnectionStatus('Missing topic, doubt, or sessionId');
      addDebugInfo('Missing required props: ' + 
        (!topic ? 'topic ' : '') + 
        (!doubt ? 'doubt ' : '') + 
        (!sessionId ? 'sessionId' : ''));
      return;
    }
    
    // Create a flag to track if this effect instance has been cleaned up
    let isEffectActive = true;
    
    // Only start a new session if one isn't already in progress
    if (!sessionInProgressRef.current) {
      sessionInProgressRef.current = true;
      sessionStartedTimeRef.current = Date.now();
      addDebugInfo(`Starting new session with ID: ${sessionId}`);
      
      // Request microphone access first
      requestMicrophoneAccess()
        .then(() => {
          if (mountedRef.current && isEffectActive) {
            // Add a small delay before starting the session to ensure microphone is ready
            setTimeout(() => {
              if (mountedRef.current && isEffectActive) {
                startSession().catch(err => {
                  if (mountedRef.current && isEffectActive) {
                    addDebugInfo(`Error starting session: ${err.message}`);
                    setError(`Failed to start session: ${err.message}`);
                  }
                });
              }
            }, 500);
          }
        })
        .catch(err => {
          if (mountedRef.current && isEffectActive) {
            addDebugInfo(`Microphone access error: ${err.message}`);
            setError(`Microphone access error: ${err.message}. Please ensure your browser has permission to access your microphone.`);
            
            // Still try to start the session even without microphone after a short delay
            setTimeout(() => {
              if (mountedRef.current && isEffectActive) {
                startSession().catch(err => {
                  if (mountedRef.current && isEffectActive) {
                    addDebugInfo(`Error starting session: ${err.message}`);
                    setError(`Failed to start session: ${err.message}`);
                  }
                });
              }
            }, 500);
          }
        });
    } else {
      // Log that we're skipping duplicate session start
      const timeSinceStart = Date.now() - (sessionStartedTimeRef.current || 0);
      addDebugInfo(`Skipping duplicate session start (${timeSinceStart}ms after first start)`);
    }
    
    // Cleanup function
    return () => {
      addDebugInfo('Component unmounting, cleaning up session');
      isEffectActive = false; // Mark this effect instance as cleaned up
      mountedRef.current = false;
      setIsMounted(false);
      
      // Set the stopping flag to prevent race conditions
      setIsSessionStopping(true);
      
      // Perform cleanup
      stopSession().then(() => {
        addDebugInfo('Session stopped during cleanup');
      }).catch(err => {
        console.error('Error stopping session during cleanup:', err);
      });
      
      sessionInProgressRef.current = false;
      sessionStartedTimeRef.current = null;
    };
  }, [topic, doubt, sessionId]);
  
  // Request microphone access
  const requestMicrophoneAccess = async () => {
    try {
      setIsMicrophoneRequested(true);
      addDebugInfo('Requesting microphone access');
      
      // Show a message to the user
      setConnectionStatus('Please grant microphone access when prompted');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      microphoneStreamRef.current = stream;
      setMicrophoneAccess(true);
      addDebugInfo('Microphone access granted');
      setConnectionStatus('Microphone access granted, starting session...');
      return stream;
    } catch (err) {
      addDebugInfo(`Microphone access denied: ${err.message}`);
      setMicrophoneAccess(false);
      setConnectionStatus('Microphone access denied. Some features may not work.');
      throw err;
    } finally {
      setIsMicrophoneRequested(false);
    }
  };
  
  // Add a retry function
  const retryConnection = () => {
    if (retryCount >= maxRetries.current) {
      addDebugInfo(`Maximum retry attempts (${maxRetries.current}) reached, giving up`);
      setError(`Failed to establish connection after ${maxRetries.current} attempts. Please try again later.`);
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setIsRetrying(true);
    setError(null);
    
    addDebugInfo(`Retrying connection (attempt ${retryCount + 1} of ${maxRetries.current})`);
    
    // Stop the current session
    stopSession().then(() => {
      // Wait a moment before retrying
      setTimeout(() => {
        if (mountedRef.current) {
          setIsRetrying(false);
          addDebugInfo('Starting new session after retry delay');
          startSession().catch(err => {
            if (mountedRef.current) {
              addDebugInfo(`Error in retry attempt: ${err.message}`);
              setError(`Connection failed: ${err.message}`);
            }
          });
        }
      }, 2000); // 2 second delay before retry
    });
  };
  
  // Start WebRTC session
  const startSession = async () => {
    try {
      // Check if component is still mounted
      if (!mountedRef.current) {
        console.log('[RealtimeAudioPlayer] Component unmounted, aborting session start');
        return;
      }
      
      // Reset the stopping flag when starting a new session
      setIsSessionStopping(false);
      
      // Prevent multiple simultaneous connections
      if (peerConnectionRef.current) {
        addDebugInfo('A peer connection already exists, stopping it first');
        await stopSession();
        
        // Add a small delay to ensure the previous connection is fully closed
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Check if the session is being stopped
      if (isSessionStopping) {
        addDebugInfo('Session is currently being stopped, aborting start');
        return;
      }
      
      setConnectionStatus('Starting session...');
      addDebugInfo(`Starting WebRTC session for topic: ${topic}, doubt: ${doubt}`);
      
      // Use only the Ngrok URL
      const tokenUrl = `https://9c75-103-129-109-37.ngrok-free.app/token?topic=${encodeURIComponent(topic)}&doubt=${encodeURIComponent(doubt)}`;
      addDebugInfo(`Fetching token from ${tokenUrl}`);
      
      // Try to get the API key from various sources
      let EPHEMERAL_KEY = null;
      
      try {
        // First try: Get from localStorage if available
        const savedKey = localStorage.getItem('openai_api_key');
        if (savedKey && savedKey.startsWith('sk-')) {
          EPHEMERAL_KEY = savedKey;
          addDebugInfo('Using API key from localStorage');
        } else {
          // Second try: Try to fetch from server
          addDebugInfo(`Connecting to endpoint: ${tokenUrl}`);
          
          const tokenResponse = await fetch(tokenUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          // Read the response text
          const responseText = await tokenResponse.text();
          addDebugInfo(`Response received (length: ${responseText.length})`);
          
          // Check if we got a JSON response
          const contentType = tokenResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            // Parse the JSON response
            try {
              const data = JSON.parse(responseText);
              
              // Validate the response data
              if (data && data.client_secret && data.client_secret.value) {
                EPHEMERAL_KEY = data.client_secret.value;
                addDebugInfo('Successfully retrieved API key from server');
              }
            } catch (parseError) {
              addDebugInfo(`Failed to parse response as JSON: ${parseError.message}`);
            }
          } else {
            addDebugInfo(`Received non-JSON response: ${contentType}`);
            addDebugInfo(`Response preview: ${responseText.substring(0, 100)}...`);
          }
        }
        
        // Third try: If we still don't have a key, prompt the user
        if (!EPHEMERAL_KEY) {
          addDebugInfo('No API key available, prompting user');
          const userKey = prompt("Please enter your OpenAI API key (starts with sk-...):");
          
          if (userKey && userKey.startsWith('sk-')) {
            EPHEMERAL_KEY = userKey;
            // Save for future use
            localStorage.setItem('openai_api_key', userKey);
            addDebugInfo('Using user-provided API key');
          } else {
            throw new Error('Invalid API key format provided');
          }
        }
        
        // Set the API key
        setApiKey(EPHEMERAL_KEY);
        
        // Create a peer connection with STUN servers
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;
        
        // Log ICE connection state changes
        peerConnectionRef.current.oniceconnectionstatechange = () => {
          if (!peerConnectionRef.current) return;
          addDebugInfo(`ICE connection state changed to: ${peerConnectionRef.current.iceConnectionState}`);
          if (peerConnectionRef.current.iceConnectionState === 'failed' || peerConnectionRef.current.iceConnectionState === 'disconnected') {
            setConnectionStatus(`ICE connection ${peerConnectionRef.current.iceConnectionState}`);
          }
        };
        
        // Log signaling state changes
        peerConnectionRef.current.onsignalingstatechange = () => {
          if (!peerConnectionRef.current) return;
          addDebugInfo(`Signaling state changed to: ${peerConnectionRef.current.signalingState}`);
        };
        
        // Log ICE gathering state changes
        peerConnectionRef.current.onicegatheringstatechange = () => {
          if (!peerConnectionRef.current) return;
          addDebugInfo(`ICE gathering state changed to: ${peerConnectionRef.current.iceGatheringState}`);
        };
        
        // Log ICE candidate errors
        peerConnectionRef.current.onicecandidateerror = (event) => {
          addDebugInfo(`ICE candidate error: ${event.errorText} (${event.errorCode})`);
        };
        
        // Set up to play remote audio from the model
        audioElementRef.current = document.createElement('audio');
        audioElementRef.current.autoplay = true;
        
        peerConnectionRef.current.ontrack = (e) => {
          addDebugInfo('Received audio track from OpenAI');
          audioElementRef.current = document.createElement('audio');
          audioElementRef.current.autoplay = true;
          audioElementRef.current.srcObject = e.streams[0];
          
          // Add event listeners for audio playback
          audioElementRef.current.onplaying = handleAudioStart;
          audioElementRef.current.onpause = () => setIsAudioPlaying(false);
          audioElementRef.current.onended = () => setIsAudioPlaying(false);
          audioElementRef.current.ontimeupdate = handleAudioTimeUpdate;
          
          setIsPlaying(true);
        };
        
        // Add local audio track for microphone input
        if (microphoneStreamRef.current) {
          try {
            const audioTracks = microphoneStreamRef.current.getAudioTracks();
            if (audioTracks.length > 0) {
              peerConnectionRef.current.addTrack(audioTracks[0], microphoneStreamRef.current);
              addDebugInfo('Added microphone track to peer connection');
            } else {
              addDebugInfo('No audio tracks found in microphone stream');
            }
          } catch (micError) {
            console.error('Error adding microphone track:', micError);
            addDebugInfo(`Error adding microphone track: ${micError.message}`);
            // Continue without microphone
          }
        } else {
          addDebugInfo('No microphone stream available, trying to get one now');
        try {
          const ms = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          microphoneStreamRef.current = ms;
            peerConnectionRef.current.addTrack(ms.getTracks()[0], ms);
            setMicrophoneAccess(true);
          addDebugInfo('Added microphone track to peer connection');
        } catch (micError) {
          console.error('Microphone access error:', micError);
          addDebugInfo(`Microphone error: ${micError.message}`);
            setMicrophoneAccess(false);
          // Continue without microphone
          }
        }
        
        // Set up data channel for sending and receiving events
        const dc = peerConnectionRef.current.createDataChannel('oai-events');
        dataChannelRef.current = dc;
        
        dc.onopen = () => {
          addDebugInfo('Data channel opened');
          setIsConnected(true);
          setConnectionStatus('Connected to OpenAI');
          
          // Prepare a detailed prompt with visualization context
          let prompt = `You are an AI assistant explaining a ${topic.replace('_', ' ')} database visualization. The user asked: "${doubt}"\n\n`;
          
          // Get visualization data from props or window
          const vizData = visualizationData || window.visualizationData;
          if (vizData) {
            prompt += "VISUALIZATION CONTEXT:\n";
            
            // Add nodes information
            if (vizData.nodes && vizData.nodes.length > 0) {
              prompt += "\nNodes:\n";
              vizData.nodes.forEach(node => {
                prompt += `- Node ID: ${node.id}, Name: ${node.name}, Type: ${node.type || 'unknown'}\n`;
                
                // Add attributes if available
                if (node.attributes && node.attributes.length > 0) {
                  prompt += "  Attributes:\n";
                  node.attributes.forEach(attr => {
                    prompt += `  - ${attr.name}${attr.isKey ? ' (Primary Key)' : ''}\n`;
                  });
                }
              });
            }
            
            // Add edges information
            if (vizData.edges && vizData.edges.length > 0) {
              prompt += "\nEdges:\n";
              vizData.edges.forEach(edge => {
                prompt += `- ${edge.source} → ${edge.target} (Type: ${edge.type}${edge.description ? `, ${edge.description}` : ''})\n`;
              });
            }
            
            // Add narration if available
            if (vizData.narration) {
              prompt += "\nVisualization Description:\n";
              prompt += vizData.narration + "\n";
            }
          }
          
          // Add instructions for highlighting
          prompt += "\nIMPORTANT INSTRUCTIONS FOR HIGHLIGHTING:\n";
          prompt += "1. When explaining concepts, ALWAYS mention the specific node IDs in your explanation.\n";
          prompt += "2. Use the exact node IDs as they appear in the visualization (e.g., 'student', 'course', etc.).\n";
          prompt += "3. When referring to a node, always include its ID in your explanation, like this: 'The student node (student) connects to...'\n";
          prompt += "4. Make sure to mention each relevant node ID at least once when explaining its role.\n";
          prompt += "5. The system will automatically highlight nodes when you mention their IDs.\n";
          prompt += "6. IMPORTANT: Always use the exact node ID format, not variations or abbreviations.\n";
          prompt += "7. EXAMPLES:\n";
          prompt += "   - Good: 'The student entity (student) has attributes like student_id.'\n";
          prompt += "   - Good: 'The relationship between student and course is represented by enrollment.'\n";
          prompt += "   - Bad: 'The Student entity has attributes like student_id.' (missing node ID)\n";
          prompt += "   - Bad: 'The students have attributes like student_id.' (incorrect node ID format)\n";
          prompt += "8. REPEAT node IDs multiple times throughout your explanation to ensure they are highlighted.\n";
          prompt += "9. For each concept you explain, mention the relevant node ID at least 2-3 times.\n";
          prompt += "10. When moving from one concept to another, explicitly mention the new node ID to trigger highlighting.\n";
          prompt += "11. Use phrases like 'Let's look at the [node_id] node' or 'Now focusing on [node_id]' to clearly indicate transitions.\n";
          prompt += "12. IMPORTANT: The highlighting only works when you mention the exact node ID, so be very precise.\n";
          
          // Send the detailed prompt
          sendTextMessage(prompt);
        };
        
        dc.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            addDebugInfo(`Received message of type: ${data.type}`);
            
            // Add to events
            setEvents(prev => [data, ...prev]);
            
            // Extract text content from the message
            let textContent = null;
            
            // Process different event types
            if (data.type === 'conversation.item.delta') {
              // This is the new format for text deltas in the latest API
              if (data.delta?.content?.[0]?.type === 'text_delta') {
                textContent = data.delta.content[0].text_delta.text;
              }
            } else if (data.type === 'response.content_part.added') {
              // This is another format that might contain text content
              if (data.content_part?.content_block?.type === 'text') {
                textContent = data.content_part.content_block.text;
              }
            } else if (data.type === 'message') {
              // Handle direct message type
              if (data.content && typeof data.content === 'string') {
                textContent = data.content;
              } else if (data.text && typeof data.text === 'string') {
                textContent = data.text;
              }
            } else if (data.type === 'text') {
              // Handle simple text type
              if (data.text && typeof data.text === 'string') {
                textContent = data.text;
              }
            } else if (data.type === 'response.audio_transcript.delta') {
              // Handle audio transcript delta with improved timing
              if (data.delta && typeof data.delta === 'string') {
                textContent = data.delta;
                addDebugInfo(`Extracted text from audio transcript: "${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}"`);
                
                // Use the new function for better synchronization with speech
                processAudioTranscriptDelta(textContent);
              }
            } else if (data.type === 'conversation.item.complete') {
              addDebugInfo('Conversation complete');
              setConnectionStatus('Response complete');
              setIsComplete(true);
              
              // Check for node IDs in the accumulated text when conversation is complete
              if (text && text.length > 0) {
                addDebugInfo('Checking for node IDs in accumulated text after conversation complete');
                processTextForNodeIds(text);
              }
            } else if (data.type === 'response.audio.done' || data.type === 'response.done') {
              addDebugInfo(`${data.type} received, checking for node IDs in accumulated text`);
              
              // Check for node IDs in the accumulated text when audio is done
              if (text && text.length > 0) {
                addDebugInfo('Checking for node IDs in accumulated text after audio complete');
                processTextForNodeIds(text);
              }
            } else if (data.type === 'error') {
              // Log detailed error information
              addDebugInfo(`Error from OpenAI: ${JSON.stringify(data)}`);
              setError(`OpenAI error: ${data.error?.message || 'Unknown error'}`);
            } else {
              // For any other message type, try to extract text content
              textContent = extractTextFromMessage(data);
            }
            
            // Process text content if found
            if (textContent) {
              addDebugInfo(`Extracted text content: "${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}"`);
              setText(prev => {
                const newText = prev + textContent;
                // Log the accumulated text periodically (every 100 characters)
                if (newText.length % 100 < prev.length % 100) {
                  addDebugInfo(`Accumulated text (${newText.length} chars): "${newText.substring(newText.length - 100)}"`);
                }
                return newText;
              });
              
              // Process text for node IDs
              processTextForNodeIds(textContent);
            }
          } catch (error) {
            console.error('Error parsing message:', error);
            addDebugInfo(`Error parsing message: ${error.message}`);
            addDebugInfo(`Raw message data: ${e.data.substring(0, 200)}${e.data.length > 200 ? '...' : ''}`);
          }
        };
        
        dc.onerror = (dcError) => {
          console.error('Data channel error:', dcError);
          addDebugInfo(`Data channel error: ${dcError.message || 'Unknown error'}`);
          setError('Connection error with OpenAI. Please try again.');
        };
        
        dc.onclose = () => {
          addDebugInfo('Data channel closed');
          setIsConnected(false);
          setConnectionStatus('Disconnected');
        };
        
        // Start the session using SDP
        addDebugInfo('Creating offer');
        
        try {
          // Create and set local description
          const offer = await peerConnectionRef.current.createOffer();
          
          // Check signaling state before setting local description
          addDebugInfo(`Signaling state before setLocalDescription: ${peerConnectionRef.current.signalingState}`);
          
          // Set local description
          await peerConnectionRef.current.setLocalDescription(offer);
          
          // Wait for ICE gathering to complete or timeout after 5 seconds
          await new Promise((resolve) => {
            const checkState = () => {
              if (peerConnectionRef.current.iceGatheringState === 'complete') {
                addDebugInfo('ICE gathering complete');
                resolve();
              } else if (!mountedRef.current || isSessionStopping) {
                addDebugInfo('Component unmounted or session stopping during ICE gathering');
                resolve();
              } else {
                setTimeout(checkState, 500);
              }
            };
            
            // Start checking ICE gathering state
            setTimeout(checkState, 500);
            
            // Set a timeout to resolve anyway after 5 seconds
            setTimeout(() => {
              addDebugInfo('ICE gathering timed out, continuing with available candidates');
              resolve();
            }, 5000);
          });
          
          // Check if component is still mounted and session is not being stopped
          if (!mountedRef.current || isSessionStopping) {
            addDebugInfo('Component unmounted or session stopping after ICE gathering');
            return;
          }
        
        const openaiBaseUrl = 'https://api.openai.com/v1/realtime';
        const model = 'gpt-4o-realtime-preview-2024-12-17';
          
          // Get the current local description which may have been updated with ICE candidates
          const currentLocalDescription = peerConnectionRef.current.localDescription;
        
        addDebugInfo('Sending SDP offer to OpenAI');
        const sdpResponse = await fetch(`${openaiBaseUrl}?model=${model}`, {
          method: 'POST',
            body: currentLocalDescription.sdp,
          headers: {
            'Authorization': `Bearer ${EPHEMERAL_KEY}`,
            'Content-Type': 'application/sdp'
          }
        });
        
        if (!sdpResponse.ok) {
          const errorText = await sdpResponse.text();
          addDebugInfo(`SDP negotiation failed with status ${sdpResponse.status}: ${errorText}`);
          throw new Error(`SDP negotiation failed: ${sdpResponse.status} ${sdpResponse.statusText}`);
        }
        
        const sdpAnswer = await sdpResponse.text();
        addDebugInfo(`Received SDP answer from OpenAI (length: ${sdpAnswer.length})`);
        
        if (!sdpAnswer || sdpAnswer.trim() === '') {
          addDebugInfo('Received empty SDP answer from OpenAI');
          throw new Error('Received empty SDP answer from OpenAI');
        }
        
          // Check if component is still mounted and session is not being stopped
          if (!mountedRef.current || isSessionStopping) {
            addDebugInfo('Component unmounted or session stopping after receiving SDP answer');
            return;
          }
          
          // Check if the peer connection still exists and is in the right state
          if (!peerConnectionRef.current) {
            addDebugInfo('Peer connection no longer exists, cannot set remote description');
            throw new Error('Peer connection no longer exists');
          }
          
          if (peerConnectionRef.current.signalingState === 'closed') {
            addDebugInfo('Peer connection is closed, cannot set remote description');
            throw new Error('Peer connection is closed');
          }
          
          // Log the current signaling state before setting remote description
          const currentSignalingState = peerConnectionRef.current.signalingState;
          addDebugInfo(`Current signaling state before setRemoteDescription: ${currentSignalingState}`);
          
          // Only proceed if we're in the right state (have-local-offer)
          if (currentSignalingState !== 'have-local-offer') {
            addDebugInfo(`Unexpected signaling state: ${currentSignalingState}, expected 'have-local-offer'`);
            
            // If we're in stable state, we need to set local description again before setting remote
            if (currentSignalingState === 'stable') {
              addDebugInfo('In stable state, setting local description again before remote');
              await peerConnectionRef.current.setLocalDescription(offer);
              addDebugInfo(`Signaling state after re-setting local description: ${peerConnectionRef.current.signalingState}`);
            } else {
              throw new Error(`Cannot set remote description in signaling state: ${currentSignalingState}`);
            }
          }
          
          // Create the answer object
          const answer = {
            type: 'answer',
            sdp: sdpAnswer
          };
          
          // Set remote description
          try {
            await peerConnectionRef.current.setRemoteDescription(answer);
          addDebugInfo('Set remote description, WebRTC connection established');
            setConnectionStatus('Connected to OpenAI');
            setIsConnected(true);
          } catch (innerError) {
            // If the error is about the signaling state, log more details
            addDebugInfo(`Detailed error setting remote description: ${innerError.name}: ${innerError.message}`);
            
            if (innerError.message.includes('signalingState')) {
              const currentState = peerConnectionRef.current ? peerConnectionRef.current.signalingState : 'null';
              addDebugInfo(`Signaling state at time of error: ${currentState}`);
              
              // If we're in stable state, try to create a new offer and start over
              if (currentState === 'stable') {
                addDebugInfo('Attempting recovery: creating new offer from stable state');
                
                // Create a new offer
                const newOffer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(newOffer);
                
                // Now try to set the remote description again
                await peerConnectionRef.current.setRemoteDescription(answer);
                addDebugInfo('Recovery successful: remote description set after creating new offer');
                setConnectionStatus('Connected to OpenAI (after recovery)');
                setIsConnected(true);
                return; // Exit early if recovery was successful
              }
            }
            
            // If we couldn't recover, rethrow the error
            throw innerError;
          }
        } catch (sdpError) {
          addDebugInfo(`Error in SDP negotiation: ${sdpError.message}`);
          throw new Error(`Failed in SDP negotiation: ${sdpError.message}`);
        }
        
      } catch (error) {
        addDebugInfo(`Error in token fetch: ${error.message}`);
        throw error;
      }
      
    } catch (error) {
      console.error('Error starting session:', error);
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
      setError(`Failed to start session: ${error.message}`);
      setConnectionStatus('Connection failed');
      addDebugInfo(`Session error: ${error.message}`);
        
        // Only call stopSession if we're not already stopping
        if (!isSessionStopping) {
      stopSession();
        }
        
        // If this wasn't a retry and we haven't exceeded max retries, attempt to retry
        if (!isRetrying && retryCount < maxRetries.current) {
          addDebugInfo('Will attempt to retry connection');
          setTimeout(() => {
            if (mountedRef.current) {
              retryConnection();
            }
          }, 1000);
        }
      }
    }
  };
  
  // Stop WebRTC session
  const stopSession = async () => {
    // Set the stopping flag to prevent race conditions
    setIsSessionStopping(true);
    
    // If no session is in progress, don't try to stop anything
    if (!sessionInProgressRef.current && !peerConnectionRef.current && !dataChannelRef.current) {
      addDebugInfo('No active session to stop');
      setIsSessionStopping(false); // Reset the stopping flag
      return Promise.resolve(); // Return a resolved promise
    }
    
    addDebugInfo('Stopping session');
    
    return new Promise(resolve => {
      // Use setTimeout to ensure this runs after any pending state updates
      setTimeout(() => {
        // First, close the data channel if it exists
    if (dataChannelRef.current) {
      try {
        if (dataChannelRef.current.readyState === 'open') {
          addDebugInfo('Closing data channel');
          dataChannelRef.current.close();
        } else {
          addDebugInfo(`Data channel in state: ${dataChannelRef.current.readyState}, not closing`);
        }
      } catch (err) {
        addDebugInfo(`Error closing data channel: ${err.message}`);
      }
      dataChannelRef.current = null;
    }
    
        // Next, stop all tracks in the microphone stream
    if (microphoneStreamRef.current) {
      try {
        addDebugInfo('Stopping microphone tracks');
        microphoneStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (err) {
        addDebugInfo(`Error stopping microphone tracks: ${err.message}`);
      }
      microphoneStreamRef.current = null;
    }
    
        // Then, close the peer connection
    if (peerConnectionRef.current) {
      try {
            // Remove all event listeners first
            if (peerConnectionRef.current.oniceconnectionstatechange) {
              peerConnectionRef.current.oniceconnectionstatechange = null;
            }
            if (peerConnectionRef.current.onsignalingstatechange) {
              peerConnectionRef.current.onsignalingstatechange = null;
            }
            if (peerConnectionRef.current.onicegatheringstatechange) {
              peerConnectionRef.current.onicegatheringstatechange = null;
            }
            if (peerConnectionRef.current.onicecandidateerror) {
              peerConnectionRef.current.onicecandidateerror = null;
            }
            if (peerConnectionRef.current.ontrack) {
              peerConnectionRef.current.ontrack = null;
            }
            
            // Log the current state before closing
            addDebugInfo(`Closing peer connection (current state: ${peerConnectionRef.current.signalingState})`);
            
            // Close the connection
        peerConnectionRef.current.close();
      } catch (err) {
        addDebugInfo(`Error closing peer connection: ${err.message}`);
      }
      peerConnectionRef.current = null;
    }
    
    // Clean up audio element
    if (audioElementRef.current) {
      try {
        if (audioElementRef.current.srcObject) {
          addDebugInfo('Cleaning up audio element');
              audioElementRef.current.pause();
          audioElementRef.current.srcObject = null;
        }
      } catch (err) {
        addDebugInfo(`Error cleaning up audio element: ${err.message}`);
      }
      audioElementRef.current = null;
    }
    
        // Update state if component is still mounted
        if (mountedRef.current) {
    setIsConnected(false);
          setIsPlaying(false);
          setText('');
          setHighlightedWord('');
    setConnectionStatus('Disconnected');
        }
    
    // Mark session as no longer in progress
    sessionInProgressRef.current = false;
        
        if (mountedRef.current) {
          setIsSessionStopping(false); // Reset the stopping flag
        }
        
        // Also stop any playing narration
        if (narrationAudioRef.current) {
          narrationAudioRef.current.pause();
          narrationAudioRef.current = null;
        }
        
        // Add a small delay before resolving to ensure all cleanup is complete
        setTimeout(() => {
          addDebugInfo('Session cleanup complete');
          resolve();
        }, 100);
      }, 0);
    });
  };
  
  // Send a text message to the model
  const sendTextMessage = (message) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      addDebugInfo('Cannot send message - data channel not open');
      return;
    }
    
    addDebugInfo(`Sending text message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    const event = {
      type: 'conversation.item.create',
      event_id: crypto.randomUUID(),
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: message
          }
        ]
      }
    };
    
    // Add to events
    setEvents(prev => [event, ...prev]);
    
    // Send the event
    dataChannelRef.current.send(JSON.stringify(event));
    
    // Send response.create event to trigger model response
    const responseEvent = {
      type: 'response.create',
      event_id: crypto.randomUUID()
    };
    
    // Add to events
    setEvents(prev => [responseEvent, ...prev]);
    
    // Send the event
    dataChannelRef.current.send(JSON.stringify(responseEvent));
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (!audioElementRef.current) return;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    audioElementRef.current.muted = newMutedState;
    addDebugInfo(`Audio ${newMutedState ? 'muted' : 'unmuted'}`);
  };
  
  // Handle return to visualization
  const handleReturn = () => {
    addDebugInfo('User clicked return to visualization');
    stopSession();
    if (onComplete) {
      // Pass true as second parameter to indicate session is complete
      onComplete(nodesToHighlight, true);
    }
  };
  
  // Function to handle token response
  const handleTokenResponse = (data) => {
    try {
      addDebugInfo(`Token response received (${data.length} bytes)`);
      
      // Parse the token response
      const parsedData = JSON.parse(data);
      
      // Store the API key
      if (parsedData.client_secret && parsedData.client_secret.value) {
        setApiKey(parsedData.client_secret.value);
        addDebugInfo('API key received');
      } else {
        addDebugInfo('No API key in token response');
      }
      
      // Store visualization data if available
      if (parsedData.visualization_data) {
        addDebugInfo(`Visualization data received with ${parsedData.visualization_data.nodes?.length || 0} nodes`);
        window.visualizationData = parsedData.visualization_data;
        
        // Log node IDs for debugging
        if (parsedData.visualization_data.nodes) {
          const nodeIds = parsedData.visualization_data.nodes.map(node => node.id);
          addDebugInfo(`Available node IDs: ${nodeIds.join(', ')}`);
        }
      } else {
        addDebugInfo('No visualization data in token response');
      }
      
      return parsedData;
    } catch (error) {
      addDebugInfo(`Error parsing token response: ${error.message}`);
      return null;
    }
  };
  
  // Add a useEffect to periodically check for node IDs in the accumulated text
  useEffect(() => {
    if (!text || text.length === 0) return;
    
    addDebugInfo(`Text updated (${text.length} chars)`);
    
    // No longer setting up periodic checks for node IDs in text
    // We'll rely solely on the audio-based word timing system
    
  }, [text]);
  
  // No longer processing recent text for node IDs
  useEffect(() => {
    if (!recentText || recentText.length === 0) return;
    
    // Only update the debug info, no text-based highlighting
    addDebugInfo(`Recent text updated (${recentText.length} chars)`);
    
  }, [recentText]);
  
  // Clean up on unmount
  useEffect(() => {
    addDebugInfo('Component unmounting, cleaning up session');
    setIsMounted(false);
    setIsSessionStopping(true);
    stopSession().then(() => {
      addDebugInfo('Session stopped during cleanup');
    }).catch(err => {
      console.error('Error stopping session during cleanup:', err);
    });
  }, []);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (clearHighlightsTimeoutRef.current) {
        clearTimeout(clearHighlightsTimeoutRef.current);
      }
    };
  }, []);
  
  // Add a function to process audio transcript deltas with precise timing
  const processAudioTranscriptDelta = (delta) => {
    if (!delta) return;
    
    // Record the timestamp for this delta
    const timestamp = Date.now();
    
    // Update the recent text window with a sliding window approach
    setRecentText(prev => {
      const windowSize = 300; // Characters to keep in the recent text window
      let newRecentText = prev + delta;
      
      // If the recent text exceeds the window size, trim it
      if (newRecentText.length > windowSize) {
        newRecentText = newRecentText.substring(newRecentText.length - windowSize);
      }
      
      // Store the text for later processing by the word timing system
      // but DON'T process for node IDs - let the audio-based word timing system handle it
      if (mountedRef.current) {
        // Update word timings for precise synchronization
        updateWordTimings(delta);
        
        // Track the last processed position for the word timing system
        lastProcessedPositionRef.current = newRecentText.length;
      }
      
      return newRecentText;
    });
    
    // Update the current speech position
    setCurrentSpeechPosition(prev => prev + 1);
  };
  
  // Function to update word timings for precise synchronization
  const updateWordTimings = (newText) => {
    if (!newText) return;
    
    // Split the new text into words
    const words = newText.match(/\b(\w+)\b/g) || [];
    
    if (words.length === 0) return;
    
    // Get the current timestamp
    const now = Date.now();
    
    // Start calibration if not already started
    if (!speechRateCalibrationRef.current.startTime) {
      speechRateCalibrationRef.current.startTime = now;
    }
    
    // Update word count for calibration
    speechRateCalibrationRef.current.wordCount += words.length;
    
    // Estimate word duration based on word length and calibrated speech rate
    const estimateWordDuration = (word) => {
      // Base duration from calibrated speech rate
      const baseDuration = speechRate;
      
      // Adjust for word length (longer words take longer to say)
      const lengthFactor = Math.max(0.8, Math.min(1.5, word.length / 5));
      
      return baseDuration * lengthFactor;
    };
    
    // Create timing entries for each word with calibrated timing
    // Add a small delay to account for the delay between text generation and speech
    const speechDelay = 800; // 800ms delay between text generation and speech (increased from 500ms)
    
    // Calculate the base time for the new words
    let currentTime;
    
    // If audio has started playing, use the audio playback time as a reference
    if (audioStartTimeRef.current) {
      // Calculate how much time has passed since audio started
      const audioPlaybackTime = Date.now() - audioStartTimeRef.current;
      // Apply the offset to account for the delay between text generation and audio playback
      currentTime = now + speechDelay - audioPlaybackOffsetRef.current;
      
      // If we have an audio position, use it for more accurate timing
      if (audioPositionRef.current > 0) {
        // Use the actual audio position (in milliseconds) plus a small buffer
        currentTime = now + (audioPositionRef.current * 1000) + 200;
      }
      
      // Log for debugging
      console.log(`TIMING DEBUG: Audio playback time: ${audioPlaybackTime}ms, Using adjusted time: ${currentTime}`);
    } else {
      // If audio hasn't started yet, use the current time plus delay
      currentTime = now + speechDelay;
    }
    
    // Check if we have existing word timings to ensure continuity
    if (wordTimings.length > 0) {
      // Get the last word timing
      const lastTiming = wordTimings[wordTimings.length - 1];
      // Start from the end of the last word plus a small gap
      currentTime = Math.max(currentTime, lastTiming.timestamp + estimateWordDuration(lastTiming.word) + 50);
    }
    
    const newTimings = words.map(word => {
      const timing = {
        word,
        timestamp: currentTime,
        processed: false,
        // Store the original text context for better node ID detection
        textContext: newText,
        // Add estimated duration for this word
        duration: estimateWordDuration(word)
      };
      
      // Update the time for the next word
      currentTime += timing.duration;
      
      return timing;
    });
    
    // Add the new timings to the existing ones
    setWordTimings(prev => [...prev, ...newTimings]);
    
    // Ensure the word timing interval is running
    if (!wordTimingIntervalRef.current) {
      startWordTimingInterval();
    }
    
    // Calibrate speech rate after receiving enough data
    calibrateSpeechRate();
  };
  
  // Function to calibrate speech rate based on actual timing data
  const calibrateSpeechRate = () => {
    const calibration = speechRateCalibrationRef.current;
    
    // Only calibrate if we have enough data (at least 10 words and 2 seconds)
    if (calibration.wordCount < 10 || !calibration.startTime) return;
    
    const now = Date.now();
    const elapsedTime = now - calibration.startTime;
    
    // Only calibrate if enough time has passed
    if (elapsedTime < 2000) return;
    
    // Calculate average time per word
    const avgTimePerWord = elapsedTime / calibration.wordCount;
    
    // Add this timing to our calibration data
    calibration.timings.push(avgTimePerWord);
    
    // Keep only the last 5 timing samples
    if (calibration.timings.length > 5) {
      calibration.timings.shift();
    }
    
    // Calculate the average from all samples
    const avgSpeechRate = calibration.timings.reduce((sum, time) => sum + time, 0) / 
                          calibration.timings.length;
    
    // Only update if the rate is reasonable (between 200-500ms per word)
    if (avgSpeechRate >= 200 && avgSpeechRate <= 500) {
      console.log(`HIGHLIGHT DEBUG: Calibrated speech rate: ${avgSpeechRate.toFixed(0)}ms per word`);
      setSpeechRate(avgSpeechRate);
    }
    
    // Reset calibration for next batch
    calibration.wordCount = 0;
    calibration.startTime = now;
  };
  
  // Function to start the word timing interval
  const startWordTimingInterval = () => {
    // Clear any existing interval
    if (wordTimingIntervalRef.current) {
      clearInterval(wordTimingIntervalRef.current);
    }
    
    // Set up an interval to process word timings
    wordTimingIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      
      // Get the current time
      const now = Date.now();
      
      // Check if audio element exists and update audio playing state
      if (audioElementRef.current) {
        const wasPlaying = isAudioPlaying;
        const isPlaying = !audioElementRef.current.paused;
        
        // Update audio playing state if it changed
        if (wasPlaying !== isPlaying) {
          setIsAudioPlaying(isPlaying);
          addDebugInfo(`Audio playback state changed: ${isPlaying ? 'Playing' : 'Paused'}`);
        }
        
        // If audio is not playing, don't process words
        if (!isPlaying) {
          return;
        }
      } else {
        // No audio element, can't determine if playing
        return;
      }
      
      // Find words that should be processed based on their timing
      setWordTimings(prev => {
        // Find words that are due to be processed
        const updatedTimings = prev.map(timing => {
          if (!timing.processed && timing.timestamp <= now) {
            // This word is now being spoken - check if it's a node ID
            const vizData = visualizationData || window.visualizationData;
            if (vizData && vizData.nodes) {
              const nodeIds = vizData.nodes.map(node => node.id);
              
              // First check if this exact word is a node ID
              const exactNodeMatch = nodeIds.find(nodeId => 
                nodeId.toLowerCase() === timing.word.toLowerCase()
              );
              
              if (exactNodeMatch) {
                console.log(`HIGHLIGHT DEBUG: Word timing triggered highlight for exact node match: ${exactNodeMatch}`);
                // Immediately highlight this node
                debouncedHighlightUpdate([exactNodeMatch]);
              } else {
                // If not an exact match, check if this word is part of a node ID phrase
                // or if it appears in a context that suggests a node ID
                
                // Get a window of text around this word for context
                const contextWindow = timing.textContext || '';
                
                // Check each node ID against the context window
                nodeIds.forEach(nodeId => {
                  if (!nodeId) return;
                  
                  try {
                    // Check for exact node ID match with word boundaries
                    const exactRegex = new RegExp(`\\b${nodeId}\\b`, 'i');
                    if (exactRegex.test(contextWindow)) {
                      // Check if this word is part of the node ID
                      if (nodeId.toLowerCase().includes(timing.word.toLowerCase())) {
                        console.log(`HIGHLIGHT DEBUG: Word "${timing.word}" is part of node ID "${nodeId}" - highlighting`);
                        debouncedHighlightUpdate([nodeId]);
                      }
                      
                      // Check if this word is in a phrase that references the node ID
                      const contextPhrases = [
                        new RegExp(`\\bthe ${nodeId}\\b`, 'i'),
                        new RegExp(`\\bthis ${nodeId}\\b`, 'i'),
                        new RegExp(`\\b${nodeId} (node|entity|relationship|table)\\b`, 'i'),
                        new RegExp(`\\b(node|entity|relationship|table) ${nodeId}\\b`, 'i'),
                        new RegExp(`\\babout ${nodeId}\\b`, 'i'),
                        new RegExp(`\\bfocus(ing)? on ${nodeId}\\b`, 'i'),
                        new RegExp(`\\blook(ing)? at ${nodeId}\\b`, 'i')
                      ];
                      
                      for (const pattern of contextPhrases) {
                        if (pattern.test(contextWindow)) {
                          console.log(`HIGHLIGHT DEBUG: Word "${timing.word}" is in a phrase referencing node ID "${nodeId}" - highlighting`);
                          debouncedHighlightUpdate([nodeId]);
                          break;
                        }
                      }
                    }
                  } catch (regexError) {
                    console.log(`HIGHLIGHT DEBUG: Regex error for node ID ${nodeId}: ${regexError.message}`);
                  }
                });
              }
            }
            
            // Mark this word as processed
            return { ...timing, processed: true };
          }
          return timing;
        });
        
        // Update the current word index
        updateCurrentWordIndex();
        
        return updatedTimings;
      });
    }, 10); // Check every 10ms for more responsive updates
    
    addDebugInfo('Word timing interval started - audio-based highlighting active');
  };
  
  // Clean up the word timing interval on unmount
  useEffect(() => {
    return () => {
      if (wordTimingIntervalRef.current) {
        clearInterval(wordTimingIntervalRef.current);
        wordTimingIntervalRef.current = null;
      }
    };
  }, []);
  
  // Render speech position indicator with enhanced visual feedback
  const renderSpeechPosition = () => {
    // Calculate percentage based on audio position if available
    let percentage = 0;
    let audioPositionText = '';
    
    if (audioElementRef.current) {
      // Get audio duration and current time
      const duration = audioElementRef.current.duration || 0;
      const currentTime = audioElementRef.current.currentTime || 0;
      
      // Calculate percentage if duration is available
      if (duration > 0) {
        percentage = (currentTime / duration) * 100;
        audioPositionText = `${Math.floor(currentTime)}s / ${Math.floor(duration)}s`;
      } else {
        // Fallback to the arbitrary position indicator
        percentage = Math.min(100, (currentSpeechPosition % 100) / 100 * 100);
      }
    } else {
      // Fallback to the arbitrary position indicator
      percentage = Math.min(100, (currentSpeechPosition % 100) / 100 * 100);
    }
    
    // Get the current word being processed
    const currentWord = wordTimings.length > 0 && currentWordIndex < wordTimings.length 
      ? wordTimings[currentWordIndex].word 
      : '';
    
    // Get the next few words for context
    const nextWords = wordTimings.length > 0 
      ? wordTimings.slice(currentWordIndex + 1, currentWordIndex + 5).map(t => t.word).join(' ')
      : '';
  
  return (
      <div className="speech-position">
        <div className="speech-position-bar">
          <div 
            className="speech-position-indicator" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="speech-position-text">
          <span className="current-word">{currentWord}</span>
          <span className="next-words">{nextWords}</span>
          <span className="position-percentage">
            {audioPositionText || `${percentage.toFixed(0)}%`}
          </span>
        </div>
        
        {/* Add audio status indicator */}
        <div className="audio-status">
          <span className={`audio-status-indicator ${isAudioPlaying ? 'playing' : 'paused'}`}>
            {isAudioPlaying ? 'Audio Playing' : 'Audio Paused'}
          </span>
        </div>
      </div>
    );
  };
  
  // Add a function to scroll to the current word
  const scrollToCurrentWord = () => {
    if (!textDisplayRef.current || !currentWordElementRef.current) return;
    
    const container = textDisplayRef.current;
    const element = currentWordElementRef.current;
    
    // Calculate the position to scroll to (center the current word in the container)
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Calculate the scroll position that would center the element
    const scrollTop = element.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);
    
    // Smooth scroll to the position
    container.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
  };
  
  // Update the current word index and scroll to it
  const updateCurrentWordIndex = () => {
    // Find the first unprocessed word
    const firstUnprocessedIndex = wordTimings.findIndex(timing => !timing.processed);
    
    if (firstUnprocessedIndex !== -1) {
      setCurrentWordIndex(firstUnprocessedIndex > 0 ? firstUnprocessedIndex - 1 : 0);
    } else if (wordTimings.length > 0) {
      // If all words are processed, set to the last word
      setCurrentWordIndex(wordTimings.length - 1);
    }
    
    // Schedule scrolling to the current word after the state update
    setTimeout(() => {
      if (mountedRef.current) {
        scrollToCurrentWord();
      }
    }, 50);
  };
  
  // Enhance the text display to highlight the current word
  const renderTextWithHighlights = () => {
    if (!text) return 'Waiting for response...';
    
    // Find the current word being processed
    const currentWord = wordTimings.length > 0 && currentWordIndex < wordTimings.length 
      ? wordTimings[currentWordIndex].word 
      : '';
    
    if (!currentWord) return text;
    
    // Create a regex to find the current word with word boundaries
    try {
      const regex = new RegExp(`\\b${currentWord}\\b`, 'gi');
      
      // Split the text by the current word
      const parts = text.split(regex);
      
      if (parts.length <= 1) return text; // Word not found
      
      // Create the result with highlighted current word
      return (
        <>
          {parts.map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < parts.length - 1 && (
                <span 
                  className="current-word-highlight"
                  ref={index === 0 ? currentWordElementRef : null} // Set ref only for the first occurrence
                >
                  {currentWord}
                </span>
              )}
            </React.Fragment>
          ))}
        </>
      );
    } catch (error) {
      console.error('Error highlighting current word:', error);
      return text;
    }
  };
  
  // Enhance the highlighted nodes display
  const renderHighlightedNodes = () => {
    if (nodesToHighlight.length === 0) return null;
    
    return (
      <div className={`highlighted-nodes ${isPulsing ? 'pulsing' : ''}`}>
        <strong>Highlighted Nodes:</strong>{' '}
        {nodesToHighlight.map((nodeId, index) => (
          <span key={index} className="node-highlight">{nodeId}</span>
        ))}
      </div>
    );
  };
  
  // Add a useEffect to update the document visualization component when node highlights change
  useEffect(() => {
    if (nodesToHighlight.length > 0 && onComplete && typeof onComplete === 'function') {
      // Immediately update the visualization with the current highlights
      onComplete(nodesToHighlight, false);
    }
  }, [nodesToHighlight]);
  
  // Add a function to handle when audio actually starts playing
  const handleAudioStart = () => {
    // Record when audio actually starts playing
    audioStartTimeRef.current = Date.now();
    
    // Calculate the offset between text generation and audio playback
    // This will be used to adjust future word timings
    audioPlaybackOffsetRef.current = audioStartTimeRef.current - (speechRateCalibrationRef.current.startTime || audioStartTimeRef.current);
    
    console.log(`TIMING DEBUG: Audio started playing at ${audioStartTimeRef.current}, offset: ${audioPlaybackOffsetRef.current}ms`);
    
    // Set up audio time update listener for more precise timing
    if (audioElementRef.current) {
      audioElementRef.current.ontimeupdate = handleAudioTimeUpdate;
      setIsAudioPlaying(true);
    }
    
    // Adjust existing word timings based on the actual audio start time
    setWordTimings(prev => {
      // Only adjust timings that haven't been processed yet
      return prev.map(timing => {
        if (!timing.processed) {
          // Adjust the timestamp based on the audio playback offset
          return {
            ...timing,
            timestamp: timing.timestamp - audioPlaybackOffsetRef.current + 200 // Add a small buffer (200ms)
          };
        }
        return timing;
      });
    });
  };
  
  // Add a function to handle audio time updates for more precise timing
  const handleAudioTimeUpdate = () => {
    if (!audioElementRef.current) return;
    
    // Update the audio position reference
    audioPositionRef.current = audioElementRef.current.currentTime;
    
    // If we have a time update interval, clear it
    if (audioTimeUpdateRef.current) {
      clearTimeout(audioTimeUpdateRef.current);
    }
    
    // Set a timeout to check if audio is still playing
    audioTimeUpdateRef.current = setTimeout(() => {
      if (audioElementRef.current && !audioElementRef.current.paused) {
        // Audio is still playing
        setIsAudioPlaying(true);
      } else {
        // Audio has stopped
        setIsAudioPlaying(false);
      }
    }, 250);
  };
  
  // Add the missing extractTextFromMessage function
  const extractTextFromMessage = (message) => {
    // Try to extract text from various possible locations in the message
    if (message.content) {
      if (typeof message.content === 'string') {
        return message.content;
      } else if (Array.isArray(message.content)) {
        // Try to extract text from content array
        return message.content
          .filter(item => item.type === 'text' || item.text)
          .map(item => item.text || '')
          .join(' ');
      }
    }
    
    // Check for text in other common locations
    if (message.text && typeof message.text === 'string') {
      return message.text;
    }
    
    // Check for delta content
    if (message.delta?.content) {
      if (Array.isArray(message.delta.content)) {
        return message.delta.content
          .filter(item => item.type === 'text_delta' || item.text_delta)
          .map(item => (item.text_delta ? item.text_delta.text : '') || '')
          .join(' ');
      }
    }
    
    return null;
  };
  
  // Add the missing processTextForNodeIds function
  const processTextForNodeIds = (text) => {
    if (!text) return [];
    
    // Get visualization data from props or window
    const vizData = visualizationData || window.visualizationData;
    if (!vizData || !vizData.nodes) return [];
    
    // Create a map of node names to IDs for faster lookup
    const nodeMap = {};
    vizData.nodes.forEach(node => {
      // Add the node name in lowercase for case-insensitive matching
      if (node.name) {
        nodeMap[node.name.toLowerCase()] = node.id;
      }
      // Also add the node ID as a key
      nodeMap[node.id] = node.id;
    });
    
    // Look for node names in the text
    const foundNodeIds = new Set();
    
    // Get all node names
    const nodeNames = Object.keys(nodeMap);
    
    // Sort node names by length (descending) to match longer names first
    nodeNames.sort((a, b) => b.length - a.length);
    
    // Convert text to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    
    // Check for each node name in the text
    nodeNames.forEach(nodeName => {
      if (lowerText.includes(nodeName)) {
        foundNodeIds.add(nodeMap[nodeName]);
      }
    });
    
    // Also look for explicit node IDs in the text
    const idRegex = /node\s*id[s]?[\s:]*([\w\d,\s]+)/gi;
    const idMatches = [...text.matchAll(idRegex)];
    
    idMatches.forEach(match => {
      const idList = match[1].split(/[\s,]+/);
      idList.forEach(id => {
        if (nodeMap[id]) {
          foundNodeIds.add(nodeMap[id]);
        }
      });
    });
    
    return Array.from(foundNodeIds);
  };
  
  // Update the playNarrationScript function to use the same highlighting system as WebRTC

  const playNarrationScript = async (topic) => {
    try {
      addDebugInfo(`Loading narration script for topic: ${topic}`);
      
      // For ER visualization, use a hardcoded example script
      if (topic === 'er') {
        addDebugInfo('Using hardcoded ER script');
        
        // Get node IDs from visualization data if available
        let nodeIds = [];
        if (visualizationData && visualizationData.nodes) {
          nodeIds = visualizationData.nodes.map(node => node.id);
          console.log('HIGHLIGHT DEBUG: Actual ER visualization node IDs:', nodeIds);
          addDebugInfo(`Found ${nodeIds.length} node IDs in ER visualization data: ${nodeIds.join(', ')}`);
        }
        
        // Hardcoded example script for ER visualization with exact matching node IDs
        const erScript = {
          script: "Let me walk you through the Entity-Relationship visualization. First, we have entities like Student that represent real-world objects. Each entity has attributes that describe its properties. The Course entity represents classes that students can take. The Enrollment relationship shows how students and courses are connected.",
          timestamps: [
            // Use the exact node IDs from the visualization
            {
              word: "Student",
              start_time: 3000,
              end_time: 4500,
              node_id: "student" // This matches an actual node ID
            },
            {
              word: "Course",
              start_time: 8000,
              end_time: 9500,
              node_id: "course" // This matches an actual node ID
            },
            {
              word: "Enrollment",
              start_time: 12000,
              end_time: 13500,
              node_id: "enrollment" // This matches an actual node ID
            }
          ]
        };
        
        // Process the hardcoded script
        processScriptData(erScript);
        return;
      }
      
      // For GDP visualization, use a hardcoded example script
      else if (topic === 'gdp') {
        addDebugInfo('Using hardcoded GDP script');
        
        // Get node IDs from visualization data if available
        let nodeIds = [];
        if (visualizationData && visualizationData.nodes) {
          nodeIds = visualizationData.nodes.map(node => node.id);
          console.log('HIGHLIGHT DEBUG: Actual GDP visualization node IDs:', nodeIds);
          addDebugInfo(`Found ${nodeIds.length} node IDs in GDP visualization data: ${nodeIds.join(', ')}`);
        }
        
        // Hardcoded example script for GDP visualization with exact matching node IDs
        const gdpScript = {
          script: "Let me walk you through India's GDP growth visualization. This chart shows India's economic growth from 2000 to 2025, with projections for future years. The blue bars represent years with lower growth rates, while the red bars indicate years with higher growth rates above 5%. Notice the significant drop in 2020 due to the global pandemic, followed by a strong recovery in subsequent years. The trend line shows the overall growth trajectory over this period.",
          timestamps: [
            // Use actual node IDs from the visualization
            {
              word: "2000",
              start_time: 3000,
              end_time: 4500,
              node_id: "2000" // Assuming year IDs match the year numbers
            },
            {
              word: "2020",
              start_time: 8000,
              end_time: 9500,
              node_id: "2020" // Highlight the pandemic year
            },
            {
              word: "recovery",
              start_time: 12000,
              end_time: 13500,
              node_id: "2021" // Highlight the recovery year
            },
            {
              word: "trend line",
              start_time: 16000,
              end_time: 17500,
              node_id: "trend-line" // Highlight the trend line if it has an ID
            }
          ]
        };
        
        // Process the hardcoded script
        processScriptData(gdpScript);
        return;
      }
      
      // For other visualizations, try to load from file
      const scriptPath = `/static/data/${topic}_script.json`;
      addDebugInfo(`Fetching script from: ${scriptPath}`);
      
      try {
        // Fetch the narration script
        const response = await fetch(scriptPath);
        
        if (!response.ok) {
          throw new Error(`Failed to load script: ${response.status} ${response.statusText}`);
        }
        
        // Get the response text first to check for HTML content
        const responseText = await response.text();
        
        // Check if the response starts with HTML tags
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          throw new Error('Received HTML instead of JSON');
        }
        
        // Parse the JSON response
        let scriptData;
        try {
          scriptData = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Failed to parse JSON: ${parseError.message}`);
        }
        
        addDebugInfo(`Successfully loaded script JSON with keys: ${Object.keys(scriptData).join(', ')}`);
        
        // Process the script data
        processScriptData(scriptData);
        
      } catch (fetchError) {
        addDebugInfo(`Error fetching script: ${fetchError.message}`);
        
        // Use a generic fallback script
        const fallbackScript = {
          script: `Welcome to the ${topic} visualization. This interactive diagram shows the key concepts of ${topic} in database systems. You can explore different elements by clicking on them or ask questions using the doubt box below.`
        };
        
        addDebugInfo('Using generic fallback script');
        processScriptData(fallbackScript);
      }
      
    } catch (error) {
      console.error('Error in playNarrationScript:', error);
      addDebugInfo(`Error in playNarrationScript: ${error.message}`);
      
      // Final fallback
      const emergencyScript = {
        script: `Welcome to the database visualization. This interactive diagram helps you understand database concepts visually.`
      };
      
      processScriptData(emergencyScript);
    }
  };
  
  // Helper function to process script data and play narration
  const processScriptData = async (scriptData) => {
    // Extract the narration text from the JSON structure
    let narrationText = '';
    
    // Process text as before...
    if (scriptData.narration) {
      narrationText = scriptData.narration;
      addDebugInfo('Using narration field from script');
    } else if (scriptData.script) {
      narrationText = typeof scriptData.script === 'string' 
        ? scriptData.script 
        : scriptData.script.join(' ');
      addDebugInfo('Using script field from script');
    } else if (scriptData.sections) {
      narrationText = scriptData.sections
        .map(section => {
          let sectionText = section.title ? `${section.title}. ` : '';
          if (section.content) {
            sectionText += typeof section.content === 'string' 
              ? section.content 
              : section.content.join(' ');
          }
          return sectionText;
        })
        .join('\n\n');
      addDebugInfo('Using sections field from script');
    } else {
      // Fallback: try to extract any text content from the JSON
      narrationText = JSON.stringify(scriptData)
        .replace(/[{}"\\]/g, '')
        .replace(/,/g, '. ')
        .replace(/:/g, ': ');
      addDebugInfo('Using fallback extraction from script JSON');
    }
    
    if (!narrationText) {
      throw new Error('Could not extract narration text from script JSON');
    }
    
    // Log the full text length
    addDebugInfo(`Extracted narration text (${narrationText.length} chars)`);
    // Only log the first 100 chars in the debug info, but use the full text for TTS
    addDebugInfo(`First 100 chars: ${narrationText.substring(0, 100)}...`);
    
    // Extract timestamps from the script
    let timestamps = [];
    
    if (scriptData.timestamps && Array.isArray(scriptData.timestamps)) {
      timestamps = scriptData.timestamps;
      addDebugInfo(`Using ${timestamps.length} timestamps from script`);
    } else if (scriptData.animation_states && Array.isArray(scriptData.animation_states)) {
      // Convert animation_states to timestamps
      timestamps = scriptData.animation_states.map((animation, index) => {
        let startTime = 0;
        for (let i = 0; i < index; i++) {
          startTime += scriptData.animation_states[i].duration || 2000;
        }
        
        return {
          word: animation.component_id,
          start_time: startTime,
          end_time: startTime + (animation.duration || 2000),
          node_id: animation.component_id
        };
      });
      addDebugInfo(`Converted ${timestamps.length} animation states to timestamps`);
    }
    
    // Use OpenAI TTS API to convert text to speech, passing the timestamps
    await playTextToSpeech(narrationText, timestamps);
  };
  
  // Update the playTextToSpeech function to use the full text

  const playTextToSpeech = async (text, timestamps = []) => {
    try {
      // Get API key (use the same one we're using for WebRTC)
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('No API key available for TTS');
      }
      
      // Log the full text length but don't truncate it
      addDebugInfo(`Generating speech from text (${text.length} chars)...`);
      console.log(`HIGHLIGHT DEBUG: Generating speech from full text (${text.length} chars)`);
      
      // Call OpenAI TTS API with the full text
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'alloy',
          input: text // Use the full text
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error: ${response.status} - ${errorText}`);
      }
      
      // Get audio blob
      const audioBlob = await response.blob();
      
      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set up audio element
      audio.onplay = () => {
        addDebugInfo('Narration script started playing');
        setIsAudioPlaying(true);
        
        // Set up highlighting timers when audio starts playing
        if (timestamps && timestamps.length > 0) {
          console.log('HIGHLIGHT DEBUG: Setting up highlighting timers for narration');
          setupHighlightingTimers(timestamps);
        }
      };
      
      audio.onended = () => {
        addDebugInfo('Narration script finished playing');
        setIsAudioPlaying(false);
        URL.revokeObjectURL(audioUrl); // Clean up
        
        // Clear any remaining highlights
        if (onComplete && typeof onComplete === 'function') {
          console.log('HIGHLIGHT DEBUG: Clearing highlights at end of narration');
          // Pass true as the second parameter to indicate narration is complete
          onComplete([], true);
        }
      };
      
      audio.onerror = (e) => {
        addDebugInfo(`Audio playback error: ${e.message}`);
        setIsAudioPlaying(false);
        URL.revokeObjectURL(audioUrl); // Clean up
        
        // Also notify parent that narration has ended with an error
        if (onComplete && typeof onComplete === 'function') {
          onComplete([], true);
        }
      };
      
      // Store reference to audio element
      narrationAudioRef.current = audio;
      
      // Play the audio
      await audio.play();
      
    } catch (error) {
      console.error('TTS error:', error);
      addDebugInfo(`TTS error: ${error.message}`);
      
      // Notify parent that narration has ended with an error
      if (onComplete && typeof onComplete === 'function') {
        onComplete([], true);
      }
    }
  };
  
  // Add a new function to set up highlighting timers
  const setupHighlightingTimers = (timestamps) => {
    // Clear any existing timers
    if (clearHighlightsTimeoutRef.current) {
      clearTimeout(clearHighlightsTimeoutRef.current);
    }
    
    console.log('HIGHLIGHT DEBUG: Setting up highlighting timers:', timestamps);
    console.log('HIGHLIGHT DEBUG: onComplete available:', !!onComplete);
    
    // Set up timers for each timestamp
    timestamps.forEach(timestamp => {
      if (timestamp.node_id) {
        setTimeout(() => {
          if (mountedRef.current && narrationAudioRef.current) {
            console.log(`HIGHLIGHT DEBUG: Highlighting node ${timestamp.node_id} at time ${timestamp.start_time}ms`);
            
            // Use the same highlighting system as WebRTC
            if (onComplete && typeof onComplete === 'function') {
              console.log(`HIGHLIGHT DEBUG: Calling onComplete with node: ${timestamp.node_id}`);
              onComplete([timestamp.node_id], false);
              
              // Double-check that the callback was called
              setTimeout(() => {
                console.log(`HIGHLIGHT DEBUG: Callback called for node: ${timestamp.node_id}`);
              }, 10);
            } else {
              console.error('HIGHLIGHT DEBUG: onComplete is not available or not a function!', onComplete);
            }
          }
        }, timestamp.start_time);
      }
    });
    
    // Clear highlights after the last timestamp
    if (timestamps.length > 0) {
      const lastTimestamp = timestamps.reduce((latest, current) => 
        (current.start_time > latest.start_time) ? current : latest, 
        timestamps[0]
      );
      
      const clearTime = lastTimestamp.start_time + 3000;
      
      clearHighlightsTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && narrationAudioRef.current) {
          console.log('HIGHLIGHT DEBUG: Clearing all highlights after narration');
          
          if (onComplete && typeof onComplete === 'function') {
            onComplete([], false);
          }
        }
      }, clearTime);
    }
  };
  
  // Expose the playNarrationScript method to parent components
  useImperativeHandle(ref, () => ({
    playNarrationScript: (topic) => playNarrationScript(topic),
    stopNarration: () => {
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current = null;
        setIsAudioPlaying(false);
        addDebugInfo('Narration stopped by parent component');
      }
    }
  }));
  
  return (
    <div className={`realtime-player ${nodesToHighlight.length > 0 ? 'highlighting-active' : ''}`}>
      <div className="connection-status">
        {connectionStatus}
        <span className={`mic-status ${microphoneAccess ? 'mic-on' : 'mic-off'}`}>
          {microphoneAccess ? ' (Microphone ON)' : ' (Microphone OFF)'}
        </span>
        {retryCount > 0 && (
          <span className="retry-status">
            {isRetrying ? ` (Retrying ${retryCount}/${maxRetries.current})` : ` (Retry ${retryCount}/${maxRetries.current} complete)`}
          </span>
        )}
      </div>
      
      {!microphoneAccess && !isMicrophoneRequested && (
        <div className="mic-request">
          <button 
            onClick={requestMicrophoneAccess}
            className="mic-request-button"
          >
            Grant Microphone Access
          </button>
          <p className="mic-info">
            Microphone access is required for the best experience. 
            Without it, you won't be able to ask follow-up questions verbally.
          </p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
          {retryCount < maxRetries.current && !isRetrying && (
            <button 
              onClick={retryConnection}
              className="retry-button"
            >
              Retry Connection
            </button>
          )}
        </div>
      )}
      
      <div className={`text-display ${nodesToHighlight.length > 0 ? 'highlighting' : ''}`} ref={textDisplayRef}>
        {renderTextWithHighlights()}
      </div>
      
      {renderHighlightedNodes()}
      
      {renderSpeechPosition()}
      
      <div className="controls">
        <button 
          className={`mute-button ${isMuted ? 'muted' : ''}`}
          onClick={toggleMute}
          disabled={!microphoneAccess}
        >
          {isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        </button>
        
        {isPlaying && (
          <span className="playing-indicator">
            Listening...
          </span>
        )}
        
          <button 
            className="return-button"
          onClick={handleReturn}
          >
            Close AI Response
          </button>
        
        {(visualizationData || window.visualizationData) && (
          <>
            <button 
              className="debug-button"
              onClick={() => {
                const vizData = visualizationData || window.visualizationData;
                if (vizData && vizData.nodes && vizData.nodes.length > 0) {
                  const firstNodeId = vizData.nodes[0].id;
                  addDebugInfo(`Test highlighting node ID: ${firstNodeId}`);
                  setNodesToHighlight([firstNodeId]);
                  if (onComplete && typeof onComplete === 'function') {
                    onComplete([firstNodeId], false);
                  }
                } else {
                  addDebugInfo('No visualization data available for test highlight');
                }
              }}
            >
              Test Highlight
            </button>
            
            <button 
              className="debug-button"
              onClick={() => {
                addDebugInfo('Displaying text information');
                if (text && text.length > 0) {
                  addDebugInfo(`Current text length: ${text.length} chars`);
                } else {
                  addDebugInfo('No accumulated text available');
                }
              }}
            >
              Text Info
            </button>
            
            <button 
              className="debug-button"
              onClick={() => {
                addDebugInfo(`Current recent text window (${recentText.length} chars): "${recentText}"`);
                addDebugInfo(`Current word timings: ${wordTimings.length} words`);
                addDebugInfo(`Audio playing: ${isAudioPlaying ? 'Yes' : 'No'}`);
              }}
            >
              Audio Status
            </button>
          </>
        )}
      </div>
      
      <div className="debug-info">
        <details>
          <summary>Debug Info ({debugInfo.length} entries)</summary>
          <pre>
            {debugInfo.map((info, index) => (
              <div key={index}>{info}</div>
            ))}
          </pre>
        </details>
        
        <details>
          <summary>Events ({events.length})</summary>
          <pre>
            {events.map((event, index) => (
              <div key={index} className="event-item">
                <div>{event.type}</div>
                <pre>{JSON.stringify(event, null, 2)}</pre>
              </div>
            ))}
          </pre>
        </details>
      </div>
    </div>
  );
});

export default RealtimeAudioPlayer; 