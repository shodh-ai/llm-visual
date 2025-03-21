import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import "./streaming.css";

const RealtimeAudioPlayer = forwardRef(({
  topic,
  doubt,
  sessionId,
  onComplete,
  visualizationData,
  microphoneStream,
  isRecording,
  onPlayingChange,
  onClose,
}, ref) => {
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
  const [isSessionStopping, setIsSessionStopping] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [lastHighlightTime, setLastHighlightTime] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioElementRef = useRef(null);
  const microphoneStreamRef = useRef(microphoneStream);
  const sessionInProgressRef = useRef(false);
  const sessionStartedTimeRef = useRef(null);
  const mountedRef = useRef(true);
  const maxRetries = useRef(3);
  
  const clearHighlightsTimeoutRef = useRef(null);
  const lastProcessedPositionRef = useRef(0);
  const [wordTimings, setWordTimings] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const wordTimingIntervalRef = useRef(null);
  const textDisplayRef = useRef(null);
  const currentWordElementRef = useRef(null);
  
  const [speechRate, setSpeechRate] = useState(350);
  const speechRateCalibrationRef = useRef({
    wordCount: 0,
    startTime: null,
    timings: []
  });
  
  const audioStartTimeRef = useRef(null);
  const audioPlaybackOffsetRef = useRef(0);
  const audioPositionRef = useRef(0);
  const audioTimeUpdateRef = useRef(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const narrationAudioRef = useRef(null);
  
  const useDebounce = (callback, delay) => {
    const timeoutRef = useRef(null);
    return (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    };
  };
  
  const debouncedHighlightUpdate = useDebounce((nodesToShow) => {
    console.log('HIGHLIGHT DEBUG: Applying debounced highlight update with nodes:', nodesToShow);
    if (clearHighlightsTimeoutRef.current) {
      clearTimeout(clearHighlightsTimeoutRef.current);
      clearHighlightsTimeoutRef.current = null;
    }
    setNodesToHighlight(nodesToShow);
    if (onComplete && typeof onComplete === 'function') {
      console.log('HIGHLIGHT DEBUG: Calling onComplete with debounced nodes:', nodesToShow);
      onComplete(nodesToShow, false);
    }
    if (nodesToShow.length > 0) {
      setHighlightedWord(nodesToShow[0]);
      setIsPulsing(true);
      setTimeout(() => {
        if (mountedRef.current) setIsPulsing(false);
      }, 1000);
    } else {
      setHighlightedWord('');
    }
  }, 50);
  
  const lastHighlightedNodesRef = useRef([]);
  
  const addDebugInfo = (message) => {
    console.log(`[RealtimeAudioPlayer] ${message}`);
    if (mountedRef.current) {
      setDebugInfo(prev => [...prev, `${new Date().toISOString().substr(11, 8)}: ${message}`]);
    }
  };
  
  const scheduleClearHighlights = () => {
    if (clearHighlightsTimeoutRef.current) clearTimeout(clearHighlightsTimeoutRef.current);
    clearHighlightsTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.log('HIGHLIGHT DEBUG: Clearing highlights after timeout');
        setNodesToHighlight([]);
        setHighlightedWord('');
        if (onComplete && typeof onComplete === 'function') onComplete([], false);
      }
    }, 1000);
  };

  useEffect(() => {
    microphoneStreamRef.current = microphoneStream;
  }, [microphoneStream]);

  useEffect(() => {
    mountedRef.current = true;
    setIsMounted(true);
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
    
    let isEffectActive = true;
    
    if (!sessionInProgressRef.current) {
      sessionInProgressRef.current = true;
      sessionStartedTimeRef.current = Date.now();
      addDebugInfo(`Starting new session with ID: ${sessionId}`);
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
    } else {
      const timeSinceStart = Date.now() - (sessionStartedTimeRef.current || 0);
      addDebugInfo(`Skipping duplicate session start (${timeSinceStart}ms after first start)`);
    }
    
    return () => {
      addDebugInfo('Component unmounting, cleaning up session');
      isEffectActive = false;
      mountedRef.current = false;
      setIsMounted(false);
      setIsSessionStopping(true);
      stopSession().then(() => {
        addDebugInfo('Session stopped during cleanup');
      }).catch(err => {
        console.error('Error stopping session during cleanup:', err);
      });
      sessionInProgressRef.current = false;
      sessionStartedTimeRef.current = null;
    };
  }, [topic, doubt, sessionId]);
  
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
    
    stopSession().then(() => {
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
      }, 2000);
    });
  };
  
  const startSession = async () => {
    try {
      if (!mountedRef.current) {
        console.log('[RealtimeAudioPlayer] Component unmounted, aborting session start');
        return;
      }
      
      setIsSessionStopping(false);
      
      if (peerConnectionRef.current) {
        addDebugInfo('A peer connection already exists, stopping it first');
        await stopSession();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (isSessionStopping) {
        addDebugInfo('Session is currently being stopped, aborting start');
        return;
      }
      
      setConnectionStatus('Starting session...');
      addDebugInfo(`Starting WebRTC session for topic: ${topic}, doubt: ${doubt}`);
      
      const tokenUrl = `${process.env.NEXT_PUBLIC_SHODH_ML_URL}/token?topic=${encodeURIComponent(topic)}&doubt=${encodeURIComponent(doubt)}`;
      addDebugInfo(`Fetching token from ${tokenUrl}`);
      
      let EPHEMERAL_KEY = null;
      
      try {
        const savedKey = localStorage.getItem('openai_api_key');
        if (savedKey && savedKey.startsWith('sk-')) {
          EPHEMERAL_KEY = savedKey;
          addDebugInfo('Using API key from localStorage');
        } else {
          addDebugInfo(`Connecting to endpoint: ${tokenUrl}`);
          const tokenResponse = await fetch(tokenUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          const responseText = await tokenResponse.text();
          addDebugInfo(`Response received (length: ${responseText.length})`);
          
          const contentType = tokenResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const data = JSON.parse(responseText);
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
        
        if (!EPHEMERAL_KEY) {
          addDebugInfo('No API key available, prompting user');
          const userKey = prompt("Please enter your OpenAI API key (starts with sk-...):");
          if (userKey && userKey.startsWith('sk-')) {
            EPHEMERAL_KEY = userKey;
            localStorage.setItem('openai_api_key', userKey);
            addDebugInfo('Using user-provided API key');
          } else {
            throw new Error('Invalid API key format provided');
          }
        }
        
        setApiKey(EPHEMERAL_KEY);
        
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;
        
        peerConnectionRef.current.oniceconnectionstatechange = () => {
          if (!peerConnectionRef.current) return;
          addDebugInfo(`ICE connection state changed to: ${peerConnectionRef.current.iceConnectionState}`);
          if (peerConnectionRef.current.iceConnectionState === 'failed' || peerConnectionRef.current.iceConnectionState === 'disconnected') {
            setConnectionStatus(`ICE connection ${peerConnectionRef.current.iceConnectionState}`);
          }
        };
        
        peerConnectionRef.current.onsignalingstatechange = () => {
          if (!peerConnectionRef.current) return;
          addDebugInfo(`Signaling state changed to: ${peerConnectionRef.current.signalingState}`);
        };
        
        peerConnectionRef.current.onicegatheringstatechange = () => {
          if (!peerConnectionRef.current) return;
          addDebugInfo(`ICE gathering state changed to: ${peerConnectionRef.current.iceGatheringState}`);
        };
        
        peerConnectionRef.current.onicecandidateerror = (event) => {
          addDebugInfo(`ICE candidate error: ${event.errorText} (${event.errorCode})`);
        };
        
        audioElementRef.current = document.createElement('audio');
        audioElementRef.current.autoplay = true;
        
        peerConnectionRef.current.ontrack = (e) => {
          addDebugInfo('Received audio track from OpenAI');
          audioElementRef.current = document.createElement('audio');
          audioElementRef.current.autoplay = true;
          audioElementRef.current.srcObject = e.streams[0];
          
          audioElementRef.current.onplaying = handleAudioStart;
          audioElementRef.current.onpause = () => setIsAudioPlaying(false);
          audioElementRef.current.onended = () => setIsAudioPlaying(false);
          audioElementRef.current.ontimeupdate = handleAudioTimeUpdate;
          
          setIsPlaying(true);
        };
        
        if (microphoneStreamRef.current && isRecording) {
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
          }
        } else {
          addDebugInfo('No microphone stream available or not recording');
        }
        
        const dc = peerConnectionRef.current.createDataChannel('oai-events');
        dataChannelRef.current = dc;
        
        dc.onopen = () => {
          addDebugInfo('Data channel opened');
          setIsConnected(true);
          setConnectionStatus('Connected to OpenAI');
          
          let prompt = `You are an AI assistant explaining a ${topic.replace('_', ' ')} database visualization. The user asked: "${doubt}"\n\n`;
          const vizData = visualizationData || window.visualizationData;
          if (vizData) {
            prompt += "VISUALIZATION CONTEXT:\n";
            if (vizData.nodes && vizData.nodes.length > 0) {
              prompt += "\nNodes:\n";
              vizData.nodes.forEach(node => {
                prompt += `- Node ID: ${node.id}, Name: ${node.name}, Type: ${node.type || 'unknown'}\n`;
                if (node.attributes && node.attributes.length > 0) {
                  prompt += "  Attributes:\n";
                  node.attributes.forEach(attr => {
                    prompt += `  - ${attr.name}${attr.isKey ? ' (Primary Key)' : ''}\n`;
                  });
                }
              });
            }
            if (vizData.edges && vizData.edges.length > 0) {
              prompt += "\nEdges:\n";
              vizData.edges.forEach(edge => {
                prompt += `- ${edge.source} → ${edge.target} (Type: ${edge.type}${edge.description ? `, ${edge.description}` : ''})\n`;
              });
            }
            if (vizData.narration) {
              prompt += "\nVisualization Description:\n";
              prompt += vizData.narration + "\n";
            }
          }
          
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
          
          sendTextMessage(prompt);
        };
        
        dc.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            addDebugInfo(`Received message of type: ${data.type}`);
            setEvents(prev => [data, ...prev]);
            
            let textContent = null;
            if (data.type === 'conversation.item.delta') {
              if (data.delta?.content?.[0]?.type === 'text_delta') {
                textContent = data.delta.content[0].text_delta.text;
              }
            } else if (data.type === 'response.content_part.added') {
              if (data.content_part?.content_block?.type === 'text') {
                textContent = data.content_part.content_block.text;
              }
            } else if (data.type === 'message') {
              if (data.content && typeof data.content === 'string') {
                textContent = data.content;
              } else if (data.text && typeof data.text === 'string') {
                textContent = data.text;
              }
            } else if (data.type === 'text') {
              if (data.text && typeof data.text === 'string') {
                textContent = data.text;
              }
            } else if (data.type === 'response.audio_transcript.delta') {
              if (data.delta && typeof data.delta === 'string') {
                textContent = data.delta;
                addDebugInfo(`Extracted text from audio transcript: "${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}"`);
                processAudioTranscriptDelta(textContent);
              }
            } else if (data.type === 'conversation.item.complete') {
              addDebugInfo('Conversation complete');
              setConnectionStatus('Response complete');
              setIsComplete(true);
              if (text && text.length > 0) {
                addDebugInfo('Checking for node IDs in accumulated text after conversation complete');
                processTextForNodeIds(text);
              }
            } else if (data.type === 'response.audio.done' || data.type === 'response.done') {
              addDebugInfo(`${data.type} received, checking for node IDs in accumulated text`);
              setIsPlaying(false);
              if (text && text.length > 0) {
                addDebugInfo('Checking for node IDs in accumulated text after audio complete');
                processTextForNodeIds(text);
              }
            } else if (data.type === 'error') {
              addDebugInfo(`Error from OpenAI: ${JSON.stringify(data)}`);
              setError(`OpenAI error: ${data.error?.message || 'Unknown error'}`);
            } else {
              textContent = extractTextFromMessage(data);
            }
            
            if (textContent) {
              addDebugInfo(`Extracted text content: "${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}"`);
              setText(prev => {
                const newText = prev + textContent;
                if (newText.length % 100 < prev.length % 100) {
                  addDebugInfo(`Accumulated text (${newText.length} chars): "${newText.substring(newText.length - 100)}"`);
                }
                return newText;
              });
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
        
        addDebugInfo('Creating offer');
        const offer = await peerConnectionRef.current.createOffer();
        addDebugInfo(`Signaling state before setLocalDescription: ${peerConnectionRef.current.signalingState}`);
        await peerConnectionRef.current.setLocalDescription(offer);
        
        await new Promise((resolve) => {
          const checkState = () => {
            if (!peerConnectionRef.current) {
              addDebugInfo('Peer connection null during ICE gathering, resolving');
              resolve();
              return;
            }
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
          setTimeout(checkState, 500);
          setTimeout(() => {
            addDebugInfo('ICE gathering timed out, continuing with available candidates');
            resolve();
          }, 5000);
        });
        
        if (!mountedRef.current || isSessionStopping) {
          addDebugInfo('Component unmounted or session stopping after ICE gathering');
          return;
        }
        
        const openaiBaseUrl = 'https://api.openai.com/v1/realtime';
        const model = 'gpt-4o-realtime-preview-2024-12-17';
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
        
        if (!mountedRef.current || isSessionStopping) {
          addDebugInfo('Component unmounted or session stopping after receiving SDP answer');
          return;
        }
        
        if (!peerConnectionRef.current) {
          addDebugInfo('Peer connection no longer exists, cannot set remote description');
          throw new Error('Peer connection no longer exists');
        }
        
        if (peerConnectionRef.current.signalingState === 'closed') {
          addDebugInfo('Peer connection is closed, cannot set remote description');
          throw new Error('Peer connection is closed');
        }
        
        const currentSignalingState = peerConnectionRef.current.signalingState;
        addDebugInfo(`Current signaling state before setRemoteDescription: ${currentSignalingState}`);
        
        if (currentSignalingState !== 'have-local-offer') {
          addDebugInfo(`Unexpected signaling state: ${currentSignalingState}, expected 'have-local-offer'`);
          if (currentSignalingState === 'stable') {
            addDebugInfo('In stable state, setting local description again before remote');
            await peerConnectionRef.current.setLocalDescription(offer);
            addDebugInfo(`Signaling state after re-setting local description: ${peerConnectionRef.current.signalingState}`);
          } else {
            throw new Error(`Cannot set remote description in signaling state: ${currentSignalingState}`);
          }
        }
        
        const answer = { type: 'answer', sdp: sdpAnswer };
        try {
          await peerConnectionRef.current.setRemoteDescription(answer);
          addDebugInfo('Set remote description, WebRTC connection established');
          setConnectionStatus('Connected to OpenAI');
          setIsConnected(true);
        } catch (innerError) {
          addDebugInfo(`Detailed error setting remote description: ${innerError.name}: ${innerError.message}`);
          if (innerError.message.includes('signalingState')) {
            const currentState = peerConnectionRef.current ? peerConnectionRef.current.signalingState : 'null';
            addDebugInfo(`Signaling state at time of error: ${currentState}`);
            if (currentState === 'stable') {
              addDebugInfo('Attempting recovery: creating new offer from stable state');
              const newOffer = await peerConnectionRef.current.createOffer();
              await peerConnectionRef.current.setLocalDescription(newOffer);
              await peerConnectionRef.current.setRemoteDescription(answer);
              addDebugInfo('Recovery successful: remote description set after creating new offer');
              setConnectionStatus('Connected to OpenAI (after recovery)');
              setIsConnected(true);
              return;
            }
          }
          throw innerError;
        }
      } catch (error) {
        addDebugInfo(`Error in token fetch: ${error.message}`);
        throw error;
      }
    } catch (error) {
      console.error('Error starting session:', error);
      if (mountedRef.current) {
        setError(`Failed to start session: ${error.message}`);
        setConnectionStatus('Connection failed');
        addDebugInfo(`Session error: ${error.message}`);
        if (!isSessionStopping) stopSession();
        if (!isRetrying && retryCount < maxRetries.current) {
          addDebugInfo('Will attempt to retry connection');
          setTimeout(() => {
            if (mountedRef.current) retryConnection();
          }, 1000);
        }
      }
    }
  };
  
  const stopSession = () => {
    setIsSessionStopping(true);
    if (!sessionInProgressRef.current && !peerConnectionRef.current && !dataChannelRef.current) {
      addDebugInfo('No active session to stop');
      setIsSessionStopping(false);
      return Promise.resolve();
    }
    
    addDebugInfo('Stopping session');
    return new Promise(resolve => {
      setTimeout(() => {
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
        
        if (peerConnectionRef.current) {
          try {
            peerConnectionRef.current.oniceconnectionstatechange = null;
            peerConnectionRef.current.onsignalingstatechange = null;
            peerConnectionRef.current.onicegatheringstatechange = null;
            peerConnectionRef.current.onicecandidateerror = null;
            peerConnectionRef.current.ontrack = null;
            addDebugInfo(`Closing peer connection (current state: ${peerConnectionRef.current.signalingState})`);
            peerConnectionRef.current.close();
          } catch (err) {
            addDebugInfo(`Error closing peer connection: ${err.message}`);
          }
          peerConnectionRef.current = null;
        }
        
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
        
        if (mountedRef.current) {
          setIsConnected(false);
          setIsPlaying(false);
          setText('');
          setHighlightedWord('');
          setConnectionStatus('Disconnected');
        }
        
        sessionInProgressRef.current = false;
        if (mountedRef.current) setIsSessionStopping(false);
        
        setTimeout(() => {
          addDebugInfo('Session cleanup complete');
          resolve();
        }, 100);
      }, 0);
    });
  };
  
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
        content: [{ type: 'input_text', text: message }]
      }
    };
    setEvents(prev => [event, ...prev]);
    dataChannelRef.current.send(JSON.stringify(event));
    
    const responseEvent = { type: 'response.create', event_id: crypto.randomUUID() };
    setEvents(prev => [responseEvent, ...prev]);
    dataChannelRef.current.send(JSON.stringify(responseEvent));
  };
  
  const toggleMute = () => {
    if (!audioElementRef.current) return;
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    audioElementRef.current.muted = newMutedState;
    addDebugInfo(`Audio ${newMutedState ? 'muted' : 'unmuted'}`);
  };
  
  const handleReturn = () => {
    addDebugInfo('User clicked return to visualization');
    stopSession();
    if (onComplete) onComplete(nodesToHighlight, true);
    if (onClose) onClose();
  };
  
  const handleTokenResponse = (data) => {
    try {
      addDebugInfo(`Token response received (${data.length} bytes)`);
      const parsedData = JSON.parse(data);
      if (parsedData.client_secret && parsedData.client_secret.value) {
        setApiKey(parsedData.client_secret.value);
        addDebugInfo('API key received');
      } else {
        addDebugInfo('No API key in token response');
      }
      if (parsedData.visualization_data) {
        addDebugInfo(`Visualization data received with ${parsedData.visualization_data.nodes?.length || 0} nodes`);
        window.visualizationData = parsedData.visualization_data;
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
  
  useEffect(() => {
    if (!text || text.length === 0) return;
    addDebugInfo(`Text updated (${text.length} chars)`);
  }, [text]);
  
  useEffect(() => {
    if (!recentText || recentText.length === 0) return;
    addDebugInfo(`Recent text updated (${recentText.length} chars)`);
  }, [recentText]);
  
  useEffect(() => {
    addDebugInfo('Component unmounting, cleaning up session');
    return () => {
      setIsMounted(false);
      setIsSessionStopping(true);
      stopSession().then(() => {
        addDebugInfo('Session stopped during cleanup');
      }).catch(err => {
        console.error('Error stopping session during cleanup:', err);
      });
    };
  }, []);
  
  useEffect(() => {
    return () => {
      if (clearHighlightsTimeoutRef.current) clearTimeout(clearHighlightsTimeoutRef.current);
    };
  }, []);
  
  const processAudioTranscriptDelta = (delta) => {
    if (!delta) return;
    const timestamp = Date.now();
    setRecentText(prev => {
      const windowSize = 300;
      let newRecentText = prev + delta;
      if (newRecentText.length > windowSize) {
        newRecentText = newRecentText.substring(newRecentText.length - windowSize);
      }
      if (mountedRef.current) {
        updateWordTimings(delta);
        lastProcessedPositionRef.current = newRecentText.length;
      }
      return newRecentText;
    });
    setCurrentSpeechPosition(prev => prev + 1);
  };
  
  const updateWordTimings = (newText) => {
    if (!newText) return;
    const words = newText.match(/\b(\w+)\b/g) || [];
    if (words.length === 0) return;
    const now = Date.now();
    if (!speechRateCalibrationRef.current.startTime) speechRateCalibrationRef.current.startTime = now;
    speechRateCalibrationRef.current.wordCount += words.length;
    
    const estimateWordDuration = (word) => {
      const baseDuration = speechRate;
      const lengthFactor = Math.max(0.8, Math.min(1.5, word.length / 5));
      return baseDuration * lengthFactor;
    };
    
    const speechDelay = 800;
    let currentTime = audioStartTimeRef.current
      ? now + speechDelay - audioPlaybackOffsetRef.current
      : now + speechDelay;
    if (audioPositionRef.current > 0) {
      currentTime = now + (audioPositionRef.current * 1000) + 200;
    }
    
    if (wordTimings.length > 0) {
      const lastTiming = wordTimings[wordTimings.length - 1];
      currentTime = Math.max(currentTime, lastTiming.timestamp + estimateWordDuration(lastTiming.word) + 50);
    }
    
    const newTimings = words.map(word => {
      const timing = {
        word,
        timestamp: currentTime,
        processed: false,
        textContext: newText,
        duration: estimateWordDuration(word)
      };
      currentTime += timing.duration;
      return timing;
    });
    
    setWordTimings(prev => [...prev, ...newTimings]);
    if (!wordTimingIntervalRef.current) startWordTimingInterval();
    calibrateSpeechRate();
  };
  
  const calibrateSpeechRate = () => {
    const calibration = speechRateCalibrationRef.current;
    if (calibration.wordCount < 10 || !calibration.startTime) return;
    const now = Date.now();
    const elapsedTime = now - calibration.startTime;
    if (elapsedTime < 2000) return;
    const avgTimePerWord = elapsedTime / calibration.wordCount;
    calibration.timings.push(avgTimePerWord);
    if (calibration.timings.length > 5) calibration.timings.shift();
    const avgSpeechRate = calibration.timings.reduce((sum, time) => sum + time, 0) / calibration.timings.length;
    if (avgSpeechRate >= 200 && avgSpeechRate <= 500) {
      console.log(`HIGHLIGHT DEBUG: Calibrated speech rate: ${avgSpeechRate.toFixed(0)}ms per word`);
      setSpeechRate(avgSpeechRate);
    }
    calibration.wordCount = 0;
    calibration.startTime = now;
  };
  
  const startWordTimingInterval = () => {
    if (wordTimingIntervalRef.current) clearInterval(wordTimingIntervalRef.current);
    wordTimingIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const now = Date.now();
      if (audioElementRef.current) {
        const wasPlaying = isAudioPlaying;
        const isPlaying = !audioElementRef.current.paused;
        if (wasPlaying !== isPlaying) {
          setIsAudioPlaying(isPlaying);
          addDebugInfo(`Audio playback state changed: ${isPlaying ? 'Playing' : 'Paused'}`);
        }
        if (!isPlaying) return;
      } else {
        return;
      }
      
      setWordTimings(prev => {
        const updatedTimings = prev.map(timing => {
          if (!timing.processed && timing.timestamp <= now) {
            const vizData = visualizationData || window.visualizationData;
            if (vizData && vizData.nodes) {
              const nodeIds = vizData.nodes.map(node => node.id);
              const exactNodeMatch = nodeIds.find(nodeId => 
                nodeId.toLowerCase() === timing.word.toLowerCase()
              );
              if (exactNodeMatch) {
                console.log(`HIGHLIGHT DEBUG: Word timing triggered highlight for exact node match: ${exactNodeMatch}`);
                debouncedHighlightUpdate([exactNodeMatch]);
              } else {
                nodeIds.forEach(nodeId => {
                  if (!nodeId) return;
                  try {
                    const exactRegex = new RegExp(`\\b${nodeId}\\b`, 'i');
                    if (exactRegex.test(timing.textContext)) {
                      if (nodeId.toLowerCase().includes(timing.word.toLowerCase())) {
                        console.log(`HIGHLIGHT DEBUG: Word "${timing.word}" is part of node ID "${nodeId}" - highlighting`);
                        debouncedHighlightUpdate([nodeId]);
                      }
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
                        if (pattern.test(timing.textContext)) {
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
            return { ...timing, processed: true };
          }
          return timing;
        });
        updateCurrentWordIndex();
        return updatedTimings;
      });
    }, 10);
    addDebugInfo('Word timing interval started - audio-based highlighting active');
  };
  
  useEffect(() => {
    microphoneStreamRef.current = microphoneStream;
    if (peerConnectionRef.current && isConnected) {
      const senders = peerConnectionRef.current.getSenders();
      if (!microphoneStream || !isRecording) {
        // Microphone turned off or not recording, remove the track
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') {
            peerConnectionRef.current.removeTrack(sender);
            addDebugInfo('Removed microphone track from PeerConnection');
          }
        });
      } else if (microphoneStream && isRecording) {
        // Microphone turned on, add the track if not already present
        const audioTracks = microphoneStream.getAudioTracks();
        if (audioTracks.length > 0 && !senders.some(sender => sender.track && sender.track.kind === 'audio')) {
          peerConnectionRef.current.addTrack(audioTracks[0], microphoneStream);
          addDebugInfo('Added microphone track to PeerConnection');
        }
      }
    }
  }, [microphoneStream, isRecording]);
  useEffect(() => {
    return () => {
      if (wordTimingIntervalRef.current) {
        clearInterval(wordTimingIntervalRef.current);
        wordTimingIntervalRef.current = null;
      }
    };
  }, []);
  
  const renderSpeechPosition = () => {
    let percentage = 0;
    let audioPositionText = '';
    if (audioElementRef.current) {
      const duration = audioElementRef.current.duration || 0;
      const currentTime = audioElementRef.current.currentTime || 0;
      if (duration > 0) {
        percentage = (currentTime / duration) * 100;
        audioPositionText = `${Math.floor(currentTime)}s / ${Math.floor(duration)}s`;
      } else {
        percentage = Math.min(100, (currentSpeechPosition % 100) / 100 * 100);
      }
    } else {
      percentage = Math.min(100, (currentSpeechPosition % 100) / 100 * 100);
    }
    
    const currentWord = wordTimings.length > 0 && currentWordIndex < wordTimings.length 
      ? wordTimings[currentWordIndex].word 
      : '';
    const nextWords = wordTimings.length > 0 
      ? wordTimings.slice(currentWordIndex + 1, currentWordIndex + 5).map(t => t.word).join(' ')
      : '';
    
    return (
      <div className="speech-position">
        <div className="speech-position-bar">
          <div className="speech-position-indicator" style={{ width: `${percentage}%` }} />
        </div>
        <div className="speech-position-text">
          <span className="current-word">{currentWord}</span>
          <span className="next-words">{nextWords}</span>
          <span className="position-percentage">{audioPositionText || `${percentage.toFixed(0)}%`}</span>
        </div>
        <div className="audio-status">
          <span className={`audio-status-indicator ${isAudioPlaying ? 'playing' : 'paused'}`}>
            {isAudioPlaying ? 'Audio Playing' : 'Audio Paused'}
          </span>
        </div>
      </div>
    );
  };
  
  const scrollToCurrentWord = () => {
    if (!textDisplayRef.current || !currentWordElementRef.current) return;
    const container = textDisplayRef.current;
    const element = currentWordElementRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scrollTop = element.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);
    container.scrollTo({ top: scrollTop, behavior: 'smooth' });
  };
  
  const updateCurrentWordIndex = () => {
    const firstUnprocessedIndex = wordTimings.findIndex(timing => !timing.processed);
    if (firstUnprocessedIndex !== -1) {
      setCurrentWordIndex(firstUnprocessedIndex > 0 ? firstUnprocessedIndex - 1 : 0);
    } else if (wordTimings.length > 0) {
      setCurrentWordIndex(wordTimings.length - 1);
    }
    setTimeout(() => {
      if (mountedRef.current) scrollToCurrentWord();
    }, 50);
  };
  
  const renderTextWithHighlights = () => {
    if (!text) return 'Waiting for response...';
    const currentWord = wordTimings.length > 0 && currentWordIndex < wordTimings.length 
      ? wordTimings[currentWordIndex].word 
      : '';
    if (!currentWord) return text;
    
    try {
      const regex = new RegExp(`\\b${currentWord}\\b`, 'gi');
      const parts = text.split(regex);
      if (parts.length <= 1) return text;
      return (
        <>
          {parts.map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < parts.length - 1 && (
                <span 
                  className="current-word-highlight"
                  ref={index === 0 ? currentWordElementRef : null}
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
  
  useEffect(() => {
    if (nodesToHighlight.length > 0 && onComplete && typeof onComplete === 'function') {
      onComplete(nodesToHighlight, false);
    }
  }, [nodesToHighlight]);
  
  const handleAudioStart = () => {
    audioStartTimeRef.current = Date.now();
    audioPlaybackOffsetRef.current = audioStartTimeRef.current - (speechRateCalibrationRef.current.startTime || audioStartTimeRef.current);
    console.log(`TIMING DEBUG: Audio started playing at ${audioStartTimeRef.current}, offset: ${audioPlaybackOffsetRef.current}ms`);
    if (audioElementRef.current) {
      audioElementRef.current.ontimeupdate = handleAudioTimeUpdate;
      setIsAudioPlaying(true);
    }
    setWordTimings(prev => {
      return prev.map(timing => {
        if (!timing.processed) {
          return {
            ...timing,
            timestamp: timing.timestamp - audioPlaybackOffsetRef.current + 200
          };
        }
        return timing;
      });
    });
  };
  
  const handleAudioTimeUpdate = () => {
    if (!audioElementRef.current) return;
    audioPositionRef.current = audioElementRef.current.currentTime;
    if (audioTimeUpdateRef.current) clearTimeout(audioTimeUpdateRef.current);
    audioTimeUpdateRef.current = setTimeout(() => {
      if (audioElementRef.current && !audioElementRef.current.paused) {
        setIsAudioPlaying(true);
      } else {
        setIsAudioPlaying(false);
      }
    }, 250);
  };

  useEffect(() => {
    if (onPlayingChange) {
      onPlayingChange(isPlaying);
    }
  }, [isPlaying, onPlayingChange]);

  const processTextForNodeIds = (textContent) => {
    const vizData = visualizationData || window.visualizationData;
    if (vizData && vizData.nodes) {
      const nodeIds = vizData.nodes.map(node => node.id);
      const nodesToShow = nodeIds.filter(id => textContent.toLowerCase().includes(id.toLowerCase()));
      if (nodesToShow.length > 0) debouncedHighlightUpdate(nodesToShow);
    }
  };

  const extractTextFromMessage = (data) => {
    return data.text || data.content || null;
  };

  useImperativeHandle(ref, () => ({
    playNarrationScript: (topic) => playNarrationScript(topic),
    stopNarration: () => {
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current = null;
        setIsAudioPlaying(false);
        if (onPlayingChange) onPlayingChange(false);
        addDebugInfo('Narration stopped by parent component');
      }
    }
  }));

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
        
        const scriptData = await response.json();
        addDebugInfo(`Successfully loaded script JSON with keys: ${Object.keys(scriptData).join(', ')}`);
        
        // Process the script data
        processScriptData(scriptData);
      } catch (error) {
        addDebugInfo(`Error loading script: ${error.message}`);
        
        // Create a simple fallback script
        const fallbackScript = {
          script: `This is a visualization of the ${topic} database model. It shows the key components and relationships in this type of database system.`,
          timestamps: []
        };
        
        processScriptData(fallbackScript);
      }
    } catch (error) {
      console.error('Error in playNarrationScript:', error);
      addDebugInfo(`Error in playNarrationScript: ${error.message}`);
    }
  };

  return null;
});

export default RealtimeAudioPlayer;
