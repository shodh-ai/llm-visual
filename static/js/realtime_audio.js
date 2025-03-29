/**
 * RealtimeAudioClient - A wrapper around RealtimeClient that provides audio playback functionality
 * This version uses Socket.IO instead of WebSockets for communication with the server
 */
class RealtimeAudioClient {
    /**
     * Initialize the real-time audio client.
     * 
     * @param {Object} options 
     * @param {string} options.baseUrl 
     * @param {Function} options.onTextReceived 
     * @param {Function} options.onTimingReceived 
     * @param {Function} options.onAudioChunk 
     * @param {Function} options.onEnd 
     * @param {Function} options.onError 
     * @param {Function} options.onPlaybackStateChanged 
     */
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || window.location.origin;
        
        // State variables
        this.isPlaying = false;
        this.audioChunks = [];
        this.audioContentType = 'audio/mpeg'; 
        this.audioElement = null;
        this.highlightInterval = null;
        this.currentWordIndex = 0;
        this.wordTimings = [];
        this.processingComplete = false;
        
        // Callbacks
        this.onTextReceived = options.onTextReceived || (() => {});
        this.onTimingReceived = options.onTimingReceived || (() => {});
        this.onAudioChunk = options.onAudioChunk || (() => {});
        this.onEnd = options.onEnd || (() => {});
        this.onError = options.onError || ((error) => console.error('RealtimeAudioClient error:', error));
        this.onPlaybackStateChanged = options.onPlaybackStateChanged || (() => {});
        this.onResponseData = options.onResponseData || (() => {});
        
        // Initialize the Socket.IO client
        this._initSocketIOClient();
        
        // Initialize audio context
        this._initAudioContext();
        
        // Expose this instance globally for debugging and cross-component access
        if (typeof window !== 'undefined') {
            window.realtimeAudioClientInstance = this;
            console.log('RealtimeAudioClient instance exposed globally');
        }
    }
    
    /**
     * Initialize the Socket.IO client.
     * @private
     */
    _initSocketIOClient() {
        // Check if RealtimeClient is available
        if (typeof window.RealtimeClient === 'undefined') {
            console.error('RealtimeClient is not available. Make sure to include realtime_client.js before realtime_audio.js');
            return;
        }
        
        // Create a new RealtimeClient instance
        this.socketClient = new window.RealtimeClient({
            baseUrl: this.baseUrl,
            onTextChunk: (chunk) => {
                this.onTextReceived(chunk);
            },
            onResponseData: (data) => {
                this.onResponseData(data);
            },
            onTiming: (timingData) => {
                this.wordTimings = timingData;
                this.onTimingReceived(timingData);
            },
            onAudioChunk: (chunk) => {
                this.audioChunks.push(chunk);
                this.onAudioChunk(chunk);
            },
            onStatus: (status) => {
                // Handle status updates if needed
            },
            onError: (error) => {
                this.onError(error);
            },
            onEnd: (data) => {
                this.processingComplete = true;
                
                // If we have audio chunks, prepare them for playback
                if (this.audioChunks.length > 0) {
                    this._prepareAudioForPlayback();
                }
                
                // If data contains an audioUrl, set it to the debug audio player
                if (data && data.audioUrl) {
                    const debugAudioPlayer = document.getElementById('debug-audio-player');
                    if (debugAudioPlayer) {
                        console.log('Setting debug audio player source from onEnd to:', data.audioUrl);
                        debugAudioPlayer.src = data.audioUrl;
                        debugAudioPlayer.load();
                    }
                }
                
                this.onEnd(data);
            }
        });
        
        // Connect to the Socket.IO server
        this.socketClient.connect()
            .then(() => {
                console.log('Connected to Socket.IO server');
            })
            .catch(error => {
                console.error('Failed to connect to Socket.IO server:', error);
                this.onError('Failed to connect to the server');
            });
    }
    
    /**
     * Initialize the audio context.
     * @private
     */
    _initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            console.log('Audio context initialized');
        } catch (e) {
            this.onError('Web Audio API is not supported in this browser');
        }
    }
    
    /**
     * Connect to the narration WebSocket endpoint.
     * @param {string} topic - The topic to narrate
     * @param {string} text - The text to narrate (optional)
     * @param {Array} nodes - The nodes to highlight (optional)
     * @returns {Promise} - A promise that resolves when the narration is complete
     */
    connectToNarration(topic, text, nodes = []) {
        console.log('connectToNarration called with topic:', topic);
        console.log('Text provided:', !!text);
        console.log('Nodes provided:', nodes.length);
        
        // Reset state
        this.resetState();
        
        // Use the Socket.IO client to request narration
        if (this.socketClient && text) {
            return this.socketClient.requestNarration({
                topic,
                text,
                nodes
            });
        }
        
        // If no text is provided or no Socket.IO client, fall back to REST API
        return new Promise((resolve, reject) => {
            // Make a REST API call to get the narration
            fetch(`/api/narration/${topic}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, nodes })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
                if (result.error) {
                    throw new Error(result.error);
                }
                
                // Set the narration text
                if (result.text) {
                    this.onTextReceived(result.text);
                }
                
                // Set the word timings
                if (result.word_timings) {
                    this.wordTimings = result.word_timings;
                    this.onTimingReceived(result.word_timings);
                }
                
                // Load the audio
                if (result.audio_url) {
                    // Create an audio element
                    this.audioElement = new Audio(result.audio_url);
                    
                    // Set up event listeners
                    this.audioElement.addEventListener('play', () => {
                        this.isPlaying = true;
                        this._startWordHighlighting();
                        this.onPlaybackStateChanged(true);
                    });
                    
                    this.audioElement.addEventListener('pause', () => {
                        this.isPlaying = false;
                        this._stopWordHighlighting();
                        this.onPlaybackStateChanged(false);
                    });
                    
                    this.audioElement.addEventListener('ended', () => {
                        this.isPlaying = false;
                        this._stopWordHighlighting();
                        this.onPlaybackStateChanged(false);
                    });
                    
                    this.processingComplete = true;
                    resolve();
                } else {
                    throw new Error('No audio URL returned from server');
                }
            })
            .catch(error => {
                console.error('Error generating narration:', error);
                this.onError(error.message);
                reject(error);
            });
        });
    }
    
    /**
     * Connect to the doubt WebSocket endpoint.
     * 
     * @param {Object} doubtData - The doubt data
     * @param {string} doubtData.topic - The topic related to the doubt
     * @param {string} doubtData.doubt - The doubt text
     * @param {Object} doubtData.current_state - Current state of the visualization
     * @param {string} doubtData.visualization_description - Description of the visualization
     * @returns {Promise} - Resolves when connected, rejects on error
     */
    connectToDoubtHandler(doubtData) {
        console.log('RealtimeAudioClient.connectToDoubtHandler called with data:', doubtData);
        
        // Reset state
        this.resetState();
        
        // Use the Socket.IO client to process the doubt
        return this.socketClient.processDoubt(doubtData);
    }
    
    /**
     * Prepare audio for playback.
     * @private
     */
    _prepareAudioForPlayback() {
        console.log('_prepareAudioForPlayback called');
        console.log('Audio chunks available:', this.audioChunks.length);
        
        if (this.audioChunks.length === 0) {
            console.log('No audio chunks to play');
            return;
        }
        
        try {
            // Combine all chunks into a single blob
            const audioBlob = new Blob(this.audioChunks, { type: this.audioContentType });
            console.log('Created audio blob of size:', audioBlob.size, 'bytes');
            
            // Create an audio element to play the audio
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Created audio URL:', audioUrl);
            
            // Clean up previous audio element if it exists
            if (this.audioElement) {
                this.audioElement.pause();
                this.audioElement.src = '';
                this.audioElement.load();
            }
            
            this.audioElement = new Audio();
            
            // Set up event listeners before setting the source
            this.audioElement.addEventListener('play', () => {
                console.log('Audio play event triggered');
                this.isPlaying = true;
                this._startWordHighlighting();
                this.onPlaybackStateChanged(true);
            });
            
            this.audioElement.addEventListener('pause', () => {
                console.log('Audio pause event triggered');
                this.isPlaying = false;
                this._stopWordHighlighting();
                this.onPlaybackStateChanged(false);
            });
            
            this.audioElement.addEventListener('ended', () => {
                console.log('Audio ended event triggered');
                this.isPlaying = false;
                this._stopWordHighlighting();
                this.onPlaybackStateChanged(false);
            });
            
            this.audioElement.addEventListener('canplaythrough', () => {
                console.log('Audio can play through');
                this.processingComplete = true;
                
                // Try auto-playing the audio when it's ready
                console.log('Attempting to auto-play audio...');
                const playPromise = this.audioElement.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('Auto-play successful');
                        })
                        .catch(error => {
                            console.error('Auto-play failed:', error);
                            console.log('Auto-play may be blocked by browser policy. User interaction required.');
                            // Signal that audio is ready but needs user interaction
                            this.onPlaybackStateChanged(false);
                        });
                }
            });
            
            this.audioElement.addEventListener('error', (e) => {
                console.error('Audio error:', e);
                console.error('Audio error code:', this.audioElement.error?.code);
                console.error('Audio error message:', this.audioElement.error?.message);
                this.onError('Error playing audio: ' + (this.audioElement.error?.message || 'Unknown error'));
            });
            
            // Add more debugging events
            this.audioElement.addEventListener('loadstart', () => console.log('Audio loadstart event'));
            this.audioElement.addEventListener('durationchange', () => console.log('Audio durationchange event, duration:', this.audioElement.duration));
            this.audioElement.addEventListener('loadedmetadata', () => console.log('Audio loadedmetadata event'));
            this.audioElement.addEventListener('loadeddata', () => console.log('Audio loadeddata event'));
            this.audioElement.addEventListener('progress', () => console.log('Audio progress event'));
            this.audioElement.addEventListener('suspend', () => console.log('Audio suspend event'));
            this.audioElement.addEventListener('abort', () => console.log('Audio abort event'));
            this.audioElement.addEventListener('stalled', () => console.log('Audio stalled event'));
            this.audioElement.addEventListener('waiting', () => console.log('Audio waiting event'));
            
            // Set the source and load the audio
            this.audioElement.src = audioUrl;
            this.audioElement.load();
            
            console.log('Audio prepared for playback');
            
            // Add the audio element to the document temporarily for debugging
            // This can help with browsers that have issues with detached audio elements
            const tempAudio = document.createElement('div');
            tempAudio.style.display = 'none';
            tempAudio.id = 'temp-audio-container';
            tempAudio.appendChild(this.audioElement);
            document.body.appendChild(tempAudio);
            
            console.log('Added audio element to DOM for debugging');
        } catch (error) {
            console.error('Error preparing audio for playback:', error);
            this.onError('Error preparing audio: ' + error.message);
        }
    }
    
    /**
     * Start word highlighting based on current audio time.
     * @private
     */
    _startWordHighlighting() {
        // Clear any existing interval
        this._stopWordHighlighting();
        
        // Start a new interval
        this.highlightInterval = setInterval(() => {
            if (!this.audioElement || !this.wordTimings || this.wordTimings.length === 0) {
                return;
            }
            
            const currentTime = this.audioElement.currentTime * 1000; // Convert to ms
            
            // Find the current word based on timing
            let newIndex = 0;
            for (let i = 0; i < this.wordTimings.length; i++) {
                const timing = this.wordTimings[i];
                if (currentTime >= timing.start_time && currentTime <= timing.end_time) {
                    newIndex = i;
                    break;
                } else if (currentTime > timing.end_time && i < this.wordTimings.length - 1 && 
                           currentTime < this.wordTimings[i + 1].start_time) {
                    newIndex = i + 1;
                    break;
                }
            }
            
            // Update the current word index if it changed
            if (newIndex !== this.currentWordIndex) {
                this.currentWordIndex = newIndex;
                
                // Notify about the change
                const timing = this.wordTimings[this.currentWordIndex];
                if (timing && timing.node_id) {
                    // Highlight the node
                    // This is handled by the component that uses this client
                }
            }
        }, 50); // Check every 50ms
    }
    
    /**
     * Stop word highlighting.
     * @private
     */
    _stopWordHighlighting() {
        if (this.highlightInterval) {
            clearInterval(this.highlightInterval);
            this.highlightInterval = null;
        }
    }
    
    /**
     * Reset the client state.
     */
    resetState() {
        // Stop audio playback
        this.pause();
        
        // Reset state variables
        this.isPlaying = false;
        this.audioChunks = [];
        this.currentWordIndex = 0;
        this.wordTimings = [];
        this.processingComplete = false;
        
        // Stop word highlighting
        this._stopWordHighlighting();
        
        // Clean up audio element
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement.load();
            this.audioElement = null;
        }
    }
    
    /**
     * Play the audio.
     * @returns {boolean} - True if playback started, false otherwise
     */
    play() {
        if (!this.audioElement) {
            console.warn('No audio element available');
            return false;
        }
        
        try {
            // Resume the audio context if it's suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Play the audio
            const playPromise = this.audioElement.play();
            
            // Handle the play promise
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Audio playback started');
                        return true;
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        this.onError('Error playing audio: ' + error.message);
                        return false;
                    });
            }
            
            return true;
        } catch (error) {
            console.error('Error playing audio:', error);
            this.onError('Error playing audio: ' + error.message);
            return false;
        }
    }
    
    /**
     * Pause the audio.
     */
    pause() {
        if (this.audioElement) {
            this.audioElement.pause();
        }
    }
    
    /**
     * Toggle play/pause.
     * @returns {boolean} - The new playing state (true if playing, false if paused)
     */
    togglePlayPause() {
        if (!this.audioElement) return false;
        
        if (this.isPlaying) {
            this.pause();
            return false;
        } else {
            return this.play();
        }
    }
    
    /**
     * Check if audio is currently playing.
     * @returns {boolean} - True if playing, false otherwise
     */
    isAudioPlaying() {
        return this.isPlaying;
    }
    
    /**
     * Check if audio is ready for playback.
     * @returns {boolean} - True if ready, false otherwise
     */
    isAudioReady() {
        return this.audioElement !== null && this.processingComplete;
    }
    
    /**
     * Seek to a specific time in the audio.
     * @param {number} timeMs - The time to seek to in milliseconds
     */
    seekTo(timeMs) {
        if (!this.audioElement) return;
        
        try {
            // Convert from ms to seconds
            const timeSeconds = timeMs / 1000;
            
            // Seek to the specified time
            this.audioElement.currentTime = timeSeconds;
            
            // Update the current word index
            if (this.wordTimings && this.wordTimings.length > 0) {
                for (let i = 0; i < this.wordTimings.length; i++) {
                    const timing = this.wordTimings[i];
                    if (timeMs >= timing.start_time && timeMs <= timing.end_time) {
                        this.currentWordIndex = i;
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error seeking audio:', error);
        }
    }
    
    /**
     * Get the current audio time in milliseconds.
     * @returns {number} - The current time in milliseconds
     */
    getCurrentTime() {
        if (!this.audioElement) return 0;
        return this.audioElement.currentTime * 1000;
    }
    
    /**
     * Disconnect from the WebSocket.
     */
    disconnect() {
        // Stop audio playback
        this.pause();
        
        // Reset state
        this.resetState();
        
        // Disconnect the Socket.IO client
        if (this.socketClient) {
            this.socketClient.disconnect();
        }
    }
    
    /**
     * Test the WebSocket connection to the backend.
     * @returns {Promise<boolean>} - Resolves to true if connection is successful, false otherwise
     */
    testConnection() {
        if (this.socketClient) {
            return this.socketClient.testConnection();
        }
        
        return Promise.resolve(false);
    }
    
    /**
     * Play an audio blob directly.
     * @param {Blob} audioBlob - The audio blob to play
     * @param {string} contentType - The content type of the audio (default: 'audio/mpeg')
     * @returns {boolean} - True if playback started, false otherwise
     */
    playAudioBlob(audioBlob, contentType = 'audio/mpeg') {
        console.log('playAudioBlob called with blob size:', audioBlob.size);
        
        try {
            // Create an audio URL from the blob
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Created audio URL:', audioUrl);
            
            // Clean up previous audio element if it exists
            if (this.audioElement) {
                this.audioElement.pause();
                this.audioElement.src = '';
                this.audioElement.load();
            }
            
            // Create a new audio element
            this.audioElement = new Audio(audioUrl);
            
            // Set up event listeners
            this.audioElement.addEventListener('play', () => {
                console.log('Audio play event triggered');
                this.isPlaying = true;
                this.onPlaybackStateChanged(true);
            });
            
            this.audioElement.addEventListener('pause', () => {
                console.log('Audio pause event triggered');
                this.isPlaying = false;
                this.onPlaybackStateChanged(false);
            });
            
            this.audioElement.addEventListener('ended', () => {
                console.log('Audio ended event triggered');
                this.isPlaying = false;
                this.onPlaybackStateChanged(false);
            });
            
            this.audioElement.addEventListener('error', (e) => {
                console.error('Audio error:', e);
                console.error('Audio error code:', this.audioElement.error?.code);
                console.error('Audio error message:', this.audioElement.error?.message);
                this.onError('Error playing audio: ' + (this.audioElement.error?.message || 'Unknown error'));
                return false;
            });
            
            // Add the audio element to the document
            const tempAudio = document.createElement('div');
            tempAudio.style.display = 'none';
            tempAudio.id = 'temp-audio-container-direct';
            tempAudio.appendChild(this.audioElement);
            document.body.appendChild(tempAudio);
            
            // Set the debug audio player's source if it exists
            const debugAudioPlayer = document.getElementById('debug-audio-player');
            if (debugAudioPlayer) {
                console.log('Setting debug audio player source from playAudioBlob to:', audioUrl);
                debugAudioPlayer.src = audioUrl;
                debugAudioPlayer.load();
            }
            
            // Play the audio
            const playPromise = this.audioElement.play();
            
            // Handle the play promise
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Audio playback started');
                        this.processingComplete = true;
                        return true;
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        this.onError('Error playing audio: ' + error.message);
                        return false;
                    });
            }
            
            return true;
        } catch (error) {
            console.error('Error playing audio blob:', error);
            this.onError('Error playing audio: ' + error.message);
            return false;
        }
    }
}

// Expose to window object
if (typeof window !== 'undefined') {
    window.RealtimeAudioClient = RealtimeAudioClient;
    console.log('RealtimeAudioClient exposed to window object');
} 

