// Initialize the audio player functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get references to audio elements
    const audioPlayer = document.getElementById('debug-audio-player');
    const playAudioBtn = document.getElementById('play-audio-btn');
    const audioStatus = document.getElementById('audio-status');
    
    // Initialize Socket.IO client if available
    let socketClient = null;
    let lastAudioUrl = null;
    let audioBlob = null;
    
    // Initialize the client when the page loads
    initializeClient();
    
    // Update audio status
    function updateAudioStatus(message) {
        if (audioStatus) {
            audioStatus.textContent = message;
        }
        console.log('Audio status:', message);
    }
    
    // Set up event listeners for the audio player
    if (audioPlayer) {
        audioPlayer.addEventListener('play', function() {
            updateAudioStatus('Audio playing');
        });
        
        audioPlayer.addEventListener('pause', function() {
            updateAudioStatus('Audio paused');
        });
        
        audioPlayer.addEventListener('ended', function() {
            updateAudioStatus('Audio playback completed');
        });
        
        audioPlayer.addEventListener('error', function(e) {
            updateAudioStatus('Error playing audio: ' + (audioPlayer.error?.message || 'Unknown error'));
            console.error('Audio player error:', audioPlayer.error);
        });
    }
    
    // Set up event listeners for the play button
    if (playAudioBtn) {
        playAudioBtn.addEventListener('click', function() {
            if (audioPlayer && audioPlayer.src) {
                updateAudioStatus('Playing audio from player source');
                audioPlayer.play().catch(error => {
                    console.error('Error playing audio:', error);
                    updateAudioStatus('Error playing audio: ' + error.message);
                    alert('Error playing audio: ' + error.message);
                });
            } else if (lastAudioUrl) {
                updateAudioStatus('Playing audio from last audio URL');
                audioPlayer.src = lastAudioUrl;
                audioPlayer.load();
                audioPlayer.play().catch(error => {
                    console.error('Error playing audio:', error);
                    updateAudioStatus('Error playing audio: ' + error.message);
                    alert('Error playing audio: ' + error.message);
                });
            } else if (audioBlob) {
                updateAudioStatus('Playing audio from blob');
                const url = URL.createObjectURL(audioBlob);
                audioPlayer.src = url;
                audioPlayer.load();
                audioPlayer.play().catch(error => {
                    console.error('Error playing audio:', error);
                    updateAudioStatus('Error playing audio: ' + error.message);
                    alert('Error playing audio: ' + error.message);
                });
            } else {
                updateAudioStatus('No audio available to play');
                alert('No audio available to play');
            }
        });
    }
    
    function initializeClient() {
        // Check if RealtimeClient is available
        if (typeof window.RealtimeClient !== 'undefined') {
            console.log('Initializing RealtimeClient for audio');
            updateAudioStatus('Initializing audio client...');
            
            // Get server URL from config if available, otherwise use default
            const serverUrl = window.serverConfig ? window.serverConfig.getServerUrl() : window.location.origin;
            console.log('Using server URL:', serverUrl);
            
            socketClient = new window.RealtimeClient({
                baseUrl: serverUrl,
                onTextChunk: (chunk) => {
                    console.log('Received text chunk:', chunk);
                    // Update UI with text chunks if needed
                },
                onResponseData: (data) => {
                    console.log('Received complete response data:', data);
                    // Update UI with response data
                    if (data.explanation) {
                        const chatMessages = document.getElementById('chat-messages');
                        if (chatMessages) {
                            const messageDiv = document.createElement('div');
                            messageDiv.className = 'message bot';
                            messageDiv.textContent = data.explanation;
                            chatMessages.appendChild(messageDiv);
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    }
                },
                onTiming: (timingData) => {
                    console.log('Received word timing data');
                    updateAudioStatus('Received word timing data');
                    // Handle word timing data if needed
                },
                onAudioChunk: (chunk) => {
                    console.log('Received audio chunk');
                    updateAudioStatus('Receiving audio data...');
                },
                onStatus: (status) => {
                    console.log('Received status update:', status);
                    // Update UI with status
                    const connectionStatus = document.getElementById('connection-status');
                    if (connectionStatus && status.message) {
                        connectionStatus.textContent = status.message;
                    }
                    
                    // Update audio status if related to audio
                    if (status.message && status.message.toLowerCase().includes('audio')) {
                        updateAudioStatus(status.message);
                    }
                },
                onError: (error) => {
                    console.error('RealtimeClient error:', error);
                    updateAudioStatus('Error: ' + (error.message || 'Unknown error'));
                    alert('Error: ' + (error.message || 'Unknown error'));
                },
                onEnd: (data) => {
                    console.log('Processing completed:', data);
                    
                    // If we have an audio URL, set it to the audio player
                    if (data && data.audioUrl) {
                        console.log('Setting audio player source to:', data.audioUrl);
                        lastAudioUrl = data.audioUrl;
                        
                        if (audioPlayer) {
                            audioPlayer.src = data.audioUrl;
                            audioPlayer.load();
                            updateAudioStatus('Audio loaded and ready to play');
                            
                            // Make the play button more visible
                            if (playAudioBtn) {
                                playAudioBtn.style.animation = 'pulse 1.5s infinite';
                                playAudioBtn.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.7)';
                            }
                            
                            // Try to auto-play
                            audioPlayer.play().catch(error => {
                                console.error('Auto-play failed:', error);
                                console.log('Auto-play may be blocked by browser policy. User interaction required.');
                                updateAudioStatus('Audio ready. Click Play Audio button to start playback.');
                            });
                        }
                    }
                    
                    // If we have an audio blob, store it
                    if (data && data.audioBlob) {
                        console.log('Storing audio blob:', data.audioBlob);
                        audioBlob = data.audioBlob;
                        updateAudioStatus('Audio data received and ready to play');
                        
                        // Make the play button more visible
                        if (playAudioBtn) {
                            playAudioBtn.style.animation = 'pulse 1.5s infinite';
                            playAudioBtn.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.7)';
                        }
                    }
                    
                    // Update connection status
                    const connectionStatus = document.getElementById('connection-status');
                    if (connectionStatus) {
                        connectionStatus.textContent = 'Connected to server';
                    }
                }
            });
            
            // Connect to the Socket.IO server
            socketClient.connect()
                .then(() => {
                    console.log('Connected to Socket.IO server');
                    const connectionStatus = document.getElementById('connection-status');
                    if (connectionStatus) {
                        connectionStatus.textContent = 'Connected to server';
                    }
                    updateAudioStatus('Connected to audio server');
                })
                .catch(error => {
                    console.error('Failed to connect to Socket.IO server:', error);
                    const connectionStatus = document.getElementById('connection-status');
                    if (connectionStatus) {
                        connectionStatus.textContent = 'Connection failed';
                    }
                    updateAudioStatus('Failed to connect to audio server');
                    alert('Failed to connect to the server. Please try again.');
                });
        } else {
            console.error('RealtimeClient is not available');
            updateAudioStatus('Audio client not available');
            setTimeout(initializeClient, 1000); // Try again in 1 second
        }
    }
    
    // Set up the send button for chat
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    
    if (sendBtn && userInput) {
        sendBtn.addEventListener('click', function() {
            sendMessage();
        });
        
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user';
            messageDiv.textContent = message;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Clear input
        userInput.value = '';
        
        // Reset audio player state
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        lastAudioUrl = null;
        audioBlob = null;
        updateAudioStatus('Processing your question...');
        
        // Send message to server if client is available
        if (socketClient) {
            const topicSelect = document.getElementById('topic-select');
            const topic = topicSelect ? topicSelect.value : 'shared_memory';
            
            socketClient.processDoubt({
                topic: topic,
                doubt: message,
                current_state: {},
                relevantNodes: []
            }).catch(error => {
                console.error('Error sending doubt:', error);
                updateAudioStatus('Error sending message: ' + error.message);
                alert('Error sending message: ' + error.message);
            });
        } else {
            updateAudioStatus('Not connected to server');
            alert('Not connected to server. Please refresh the page and try again.');
        }
    }
    
    // Set up topic selection
    const topicSelect = document.getElementById('topic-select');
    if (topicSelect) {
        topicSelect.addEventListener('change', function() {
            const topic = topicSelect.value;
            if (topic) {
                // Show loading indicator
                const loading = document.getElementById('loading');
                if (loading) {
                    loading.style.display = 'block';
                }
                
                // Reset audio player state
                if (audioPlayer) {
                    audioPlayer.pause();
                    audioPlayer.currentTime = 0;
                    audioPlayer.src = '';
                }
                lastAudioUrl = null;
                audioBlob = null;
                updateAudioStatus('Loading visualization...');
                
                // Get server URL for API calls
                const serverUrl = window.serverConfig ? window.serverConfig.getServerUrl() : window.location.origin;
                
                // Load visualization data
                fetch(`${serverUrl}/api/visualization`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ topic })
                })
                .then(response => response.json())
                .then(data => {
                    // Hide loading indicator
                    if (loading) {
                        loading.style.display = 'none';
                    }
                    
                    // Update visualization
                    const visualization = document.getElementById('visualization');
                    if (visualization) {
                        // Clear previous visualization
                        visualization.innerHTML = '';
                        
                        // Add topic title
                        const title = document.createElement('h2');
                        title.textContent = data.topic_name || topic;
                        visualization.appendChild(title);
                        
                        // Add narration if available
                        if (data.narration) {
                            const narration = document.createElement('div');
                            narration.className = 'narration';
                            narration.textContent = data.narration;
                            visualization.appendChild(narration);
                            
                            // Update audio status
                            updateAudioStatus('Visualization loaded. Ask a question to hear audio explanation.');
                        } else {
                            updateAudioStatus('Visualization loaded. No audio narration available.');
                        }
                    }
                })
                .catch(err => {
                    console.error('Error loading visualization:', err);
                    if (loading) {
                        loading.style.display = 'none';
                    }
                    updateAudioStatus('Error loading visualization: ' + err.message);
                    alert('Error loading visualization: ' + err.message);
                });
            }
        });
    }
    
    // Add CSS for the pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}); 