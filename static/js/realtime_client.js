/**
 * Real-time client for interacting with Socket.IO endpoints.
 * This replaces the previous WebSocket implementation with Socket.IO.
 */
class RealtimeClient {
  /**
   * Initialize the realtime client.
   * @param {Object} options - Configuration options
   * @param {string} options.baseUrl - Base URL for the server
   * @param {Function} options.onTextChunk - Callback for text chunks
   * @param {Function} options.onResponseData - Callback for complete response data
   * @param {Function} options.onTiming - Callback for word timing data
   * @param {Function} options.onAudioChunk - Callback for audio chunks
   * @param {Function} options.onStatus - Callback for status updates
   * @param {Function} options.onError - Callback for errors
   * @param {Function} options.onEnd - Callback for end of streaming
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || window.location.origin;
    
    // Callbacks
    this.onTextChunk = options.onTextChunk || (() => {});
    this.onResponseData = options.onResponseData || (() => {});
    this.onTiming = options.onTiming || (() => {});
    this.onAudioChunk = options.onAudioChunk || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.onError = options.onError || ((error) => console.error('Realtime client error:', error));
    this.onEnd = options.onEnd || (() => {});
    
    // Socket.IO instance
    this.socket = null;
    
    // State
    this.isConnected = false;
    this.responseText = '';
    this.audioChunks = [];
    this.audioContentType = 'audio/mpeg';
    this.audioTotalSize = 0;
    this.receivedAudioSize = 0;
    this.isStreamingAudio = false;
    
    console.log('RealtimeClient initialized with base URL:', this.baseUrl);
  }
  
  /**
   * Connect to the Socket.IO server.
   * @returns {Promise} - Resolves when connected
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // Load Socket.IO client from CDN if not already loaded
        if (!window.io) {
          console.log('Loading Socket.IO client from CDN');
          const script = document.createElement('script');
          script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
          script.onload = () => this._initializeSocket(resolve, reject);
          script.onerror = (error) => {
            console.error('Error loading Socket.IO client:', error);
            reject(new Error('Failed to load Socket.IO client'));
          };
          document.head.appendChild(script);
        } else {
          this._initializeSocket(resolve, reject);
        }
      } catch (error) {
        console.error('Error connecting to Socket.IO server:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Initialize the Socket.IO connection.
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   * @private
   */
  _initializeSocket(resolve, reject) {
    try {
      console.log('Initializing Socket.IO connection to:', this.baseUrl);
      
      // Create Socket.IO connection
      this.socket = io(this.baseUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Set up event handlers
      this.socket.on('connect', () => {
        console.log('Connected to Socket.IO server with ID:', this.socket.id);
        this.isConnected = true;
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        this.onError({ message: 'Connection error', details: error });
        reject(error);
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.IO server:', reason);
        this.isConnected = false;
      });
      
      // Set up message handlers
      this.socket.on('text_chunk', (chunk) => {
        console.log('Received text chunk:', chunk.substring(0, 20) + '...');
        this.responseText += chunk;
        this.onTextChunk(chunk);
      });
      
      this.socket.on('response_data', (data) => {
        console.log('Received complete response data');
        this.onResponseData(data);
      });
      
      this.socket.on('timing', (timingData) => {
        console.log('Received word timing data');
        this.onTiming(timingData);
      });
      
      // Handle audio header information
      this.socket.on('audio_header', (headerInfo) => {
        console.log('Received audio header:', headerInfo);
        this.audioChunks = []; // Reset audio chunks when a new stream starts
        this.audioContentType = headerInfo.content_type || 'audio/mpeg';
        this.audioTotalSize = headerInfo.total_size || 0;
        this.receivedAudioSize = 0;
        this.isStreamingAudio = true;
        
        // Notify about audio streaming start
        this.onStatus({
          message: 'Audio streaming started',
          details: {
            contentType: this.audioContentType,
            totalSize: this.audioTotalSize
          }
        });
      });
      
      this.socket.on('audio_chunk', (chunk) => {
        // Set streaming flag if not already set
        if (!this.isStreamingAudio) {
          this.isStreamingAudio = true;
          this.onStatus({
            message: 'Audio streaming started',
            details: { contentType: this.audioContentType }
          });
        }
        
        let processedChunk = null;
        
        // Handle binary data from direct OpenAI streaming
        if (chunk instanceof ArrayBuffer || chunk instanceof Uint8Array) {
          const arrayBuffer = chunk instanceof ArrayBuffer ? chunk : chunk.buffer;
          processedChunk = arrayBuffer;
          this.receivedAudioSize += arrayBuffer.byteLength;
          console.log(`Received binary audio chunk: ${arrayBuffer.byteLength} bytes (total: ${this.receivedAudioSize} bytes)`);
        } else if (chunk instanceof Buffer || (chunk && typeof chunk === 'object' && chunk.type === 'Buffer' && Array.isArray(chunk.data))) {
          // Handle Node.js Buffer objects that have been serialized
          const arrayBuffer = new Uint8Array(chunk.data || chunk).buffer;
          processedChunk = arrayBuffer;
          this.receivedAudioSize += arrayBuffer.byteLength;
          console.log(`Received Buffer audio chunk: ${arrayBuffer.byteLength} bytes (total: ${this.receivedAudioSize} bytes)`);
        } else {
          console.warn('Received non-binary audio chunk:', typeof chunk, chunk);
          
          // Try to convert to ArrayBuffer if it's a different format
          try {
            let arrayBuffer;
            if (typeof chunk === 'string') {
              // Convert base64 string to ArrayBuffer
              const binaryString = atob(chunk);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              arrayBuffer = bytes.buffer;
            } else if (Array.isArray(chunk)) {
              // Convert array of numbers to ArrayBuffer
              arrayBuffer = new Uint8Array(chunk).buffer;
            } else {
              throw new Error('Unsupported chunk format');
            }
            
            processedChunk = arrayBuffer;
            this.receivedAudioSize += arrayBuffer.byteLength;
            console.log(`Converted audio chunk to ArrayBuffer: ${arrayBuffer.byteLength} bytes (total: ${this.receivedAudioSize} bytes)`);
          } catch (error) {
            console.error('Failed to convert audio chunk to ArrayBuffer:', error);
            this.onError({
              message: 'Failed to process audio chunk',
              details: error
            });
            return;
          }
        }
        
        // Add to our collection and notify
        if (processedChunk) {
          this.audioChunks.push(processedChunk);
          this.onAudioChunk(processedChunk);
          
          // Provide progress updates every few chunks
          if (this.audioChunks.length % 5 === 0) {
            this.onStatus({
              message: `Received ${this.audioChunks.length} audio chunks (${(this.receivedAudioSize / 1024).toFixed(1)} KB)`,
              details: {
                chunks: this.audioChunks.length,
                bytes: this.receivedAudioSize,
                progress: this.audioTotalSize ? (this.receivedAudioSize / this.audioTotalSize) : null
              }
            });
          }
        }
      });
      
      this.socket.on('status', (status) => {
        console.log('Received status update:', status);
        this.onStatus(status);
      });
      
      this.socket.on('error', (error) => {
        console.error('Received error from server:', error);
        this.onError(error);
      });
      
      this.socket.on('end', (data) => {
        console.log('Received end of streaming signal:', data);
        
        // If we have audio chunks, combine them into a single audio blob
        if (this.audioChunks.length > 0) {
          console.log(`Creating audio blob from ${this.audioChunks.length} chunks (${(this.receivedAudioSize / 1024).toFixed(1)} KB total)`);
          const audioBlob = new Blob(this.audioChunks, { type: this.audioContentType || 'audio/mpeg' });
          data.audioBlob = audioBlob;
          data.audioUrl = URL.createObjectURL(audioBlob);
          data.audioSize = audioBlob.size;
          console.log('Created audio blob of size:', audioBlob.size, 'bytes');
          console.log('Audio URL created:', data.audioUrl);
          
          // Set the debug audio player's source if it exists
          const debugAudioPlayer = document.getElementById('debug-audio-player');
          if (debugAudioPlayer) {
            console.log('Setting debug audio player source to:', data.audioUrl);
            debugAudioPlayer.src = data.audioUrl;
            debugAudioPlayer.load();
            
            // Update audio status if it exists
            const audioStatus = document.getElementById('audio-status');
            if (audioStatus) {
              audioStatus.textContent = `Audio ready: ${(audioBlob.size / 1024).toFixed(1)} KB`;
            }
          }
          
          // Reset streaming flag
          this.isStreamingAudio = false;
          
          // Notify about audio completion
          this.onStatus({
            message: 'Audio streaming completed',
            details: {
              chunks: this.audioChunks.length,
              bytes: this.receivedAudioSize,
              blobSize: audioBlob.size
            }
          });
        }
        
        // Call the end callback with the data
        this.onEnd(data);
      });
    } catch (error) {
      console.error('Error initializing Socket.IO:', error);
      this.onError({ message: 'Failed to initialize Socket.IO', details: error });
      reject(error);
    }
  }
  
  /**
   * Process a doubt using the Socket.IO connection.
   * @param {Object} doubtData - The doubt data
   * @param {string} doubtData.topic - The topic ID
   * @param {string} doubtData.doubt - The doubt text
   * @param {Object} doubtData.current_state - Current state of the visualization
   * @param {Array} doubtData.relevantNodes - Relevant nodes in the visualization
   * @returns {Promise} - Resolves when the request is sent
   */
  processDoubt(doubtData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return this.connect()
          .then(() => this._sendDoubtRequest(doubtData, resolve, reject))
          .catch(reject);
      }
      
      this._sendDoubtRequest(doubtData, resolve, reject);
    });
  }
  
  /**
   * Request narration using the Socket.IO connection.
   * @param {Object} narrationData - The narration data
   * @param {string} narrationData.topic - The topic ID
   * @param {string} narrationData.text - The text to narrate
   * @param {Array} narrationData.nodes - Nodes to highlight during narration
   * @returns {Promise} - Resolves when the request is sent
   */
  requestNarration(narrationData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return this.connect()
          .then(() => this._sendNarrationRequest(narrationData, resolve, reject))
          .catch(reject);
      }
      
      this._sendNarrationRequest(narrationData, resolve, reject);
    });
  }
  
  /**
   * Send the narration request to the server.
   * @param {Object} narrationData - The narration data
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   * @private
   */
  _sendNarrationRequest(narrationData, resolve, reject) {
    try {
      console.log('Sending narration request:', narrationData.text?.substring(0, 50) + '...');
      
      // Reset state
      this.responseText = '';
      this.audioChunks = [];
      
      // Send the narration data
      this.socket.emit('narration', narrationData);
      
      // Resolve immediately as we'll get responses via events
      resolve();
    } catch (error) {
      console.error('Error sending narration request:', error);
      reject(error);
    }
  }
  
  /**
   * Send the doubt request to the server.
   * @param {Object} doubtData - The doubt data
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   * @private
   */
  _sendDoubtRequest(doubtData, resolve, reject) {
    try {
      console.log('Sending doubt request:', doubtData.doubt);
      
      // Reset state
      this.responseText = '';
      this.audioChunks = [];
      
      // Send the doubt data
      this.socket.emit('process-doubt', doubtData);
      
      // Resolve immediately as we'll get responses via events
      resolve();
    } catch (error) {
      console.error('Error sending doubt request:', error);
      reject(error);
    }
  }
  
  /**
   * Disconnect from the Socket.IO server.
   */
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting from Socket.IO server');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
  
  /**
   * Check if the client is connected to the Socket.IO server.
   * @returns {boolean} - True if connected
   */
  isConnected() {
    return this.isConnected;
  }
  
  /**
   * Test the connection to the server.
   * @returns {Promise} - Resolves with the test result
   */
  testConnection() {
    return new Promise((resolve, reject) => {
      fetch(`${this.baseUrl}/api/health`)
        .then(response => response.json())
        .then(data => {
          console.log('Server health check result:', data);
          resolve(data);
        })
        .catch(error => {
          console.error('Server health check failed:', error);
          reject(error);
        });
    });
  }
}

// Explicitly expose RealtimeClient to the global window object
if (typeof window !== 'undefined') {
  window.RealtimeClient = RealtimeClient;
  console.log('RealtimeClient exposed to window object');
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealtimeClient;
} 