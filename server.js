import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import { spawn } from 'child_process';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express & Socket.IO
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// 1) Serve your built frontend from client/dist
app.use(express.static(join(__dirname, 'client/dist')));

// 2) Serve the "static" folder so /static/data/*.json is accessible
app.use('/static', express.static(join(__dirname, 'static')));

// Simple cache for visualization data
const visualizationCache = new Map();

// Endpoint to get an ephemeral token for WebRTC connection (optional)
app.get('/token', async (req, res) => {
  try {
    const topic = req.query.topic;
    const doubt = req.query.doubt;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    console.log(`Token request for topic: ${topic}, doubt: ${doubt || 'none'}`);

    // Get visualization data for context (check cache first)
    let visualizationData = null;
    const cacheKey = `viz_${topic}`;

    if (visualizationCache.has(cacheKey)) {
      visualizationData = visualizationCache.get(cacheKey);
      console.log('Using cached visualization data for token');
    } else {
      // If not cached, optionally spawn Python or read local JSON.
      // Below is an example of continuing to spawn Python if needed.
      try {
        const pythonProcess = spawn('python', ['app.py', '--topic', topic]);
        let vizDataStr = '';

        pythonProcess.stdout.on('data', (data) => {
          vizDataStr += data.toString();
        });

        await new Promise((resolve, reject) => {
          pythonProcess.on('close', (code) => {
            if (code === 0 && vizDataStr) {
              try {
                visualizationData = JSON.parse(vizDataStr);
                visualizationCache.set(cacheKey, visualizationData);
                console.log('Generated and cached visualization data for token');
                resolve();
              } catch (error) {
                console.error('Error parsing visualization data:', error);
                reject(error);
              }
            } else {
              reject(new Error('Failed to generate visualization data'));
            }
          });

          pythonProcess.stderr.on('data', (data) => {
            console.error(`Python error: ${data}`);
          });
        });
      } catch (error) {
        console.error('Error fetching visualization data for token:', error);
        // Continue without visualization data
      }
    }

    // Optional: check for OPENAI_API_KEY
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('Invalid or missing OpenAI API key');
      return res.status(500).json({ error: 'Invalid or missing OpenAI API key' });
    }

    // Return an ephemeral token + visualization context
    return res.json({
      client_secret: {
        value: process.env.OPENAI_API_KEY
      },
      visualization_data: visualizationData,
      topic,
      doubt,
      sessionId: uuidv4()
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ error: 'Failed to generate token: ' + error.message });
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ----------------------------------------------------------------------------
  // VISUALIZATION REQUEST: Now reads from local JSON instead of spawning Python
  // ----------------------------------------------------------------------------
  socket.on('visualization', async (data) => {
    try {
      console.log('Visualization request:', data);

      const topic = data.topic;
      if (!topic) {
        socket.emit('visualization_response', { error: 'No topic specified' });
        return;
      }

      // We'll assume your files are named "<topic>_visualization.json"
      // in the static/data folder, e.g. "er_visualization.json"
      const fileName = `${topic}_visualization.json`;
      const filePath = join(__dirname, 'static', 'data', fileName);
      const cacheKey = `viz_${topic}`;

      // Check if we have cached data
      if (visualizationCache.has(cacheKey)) {
        console.log('Serving visualization from cache:', topic);
        socket.emit('visualization_response', visualizationCache.get(cacheKey));
        return;
      }

      // If not cached, read from the local JSON file
      fs.readFile(filePath, 'utf8', (err, fileContent) => {
        if (err) {
          console.error('Error reading file:', filePath, err);
          socket.emit('visualization_response', { error: `File not found for topic: ${topic}` });
          return;
        }

        try {
          const parsedData = JSON.parse(fileContent);
          visualizationCache.set(cacheKey, parsedData);
          socket.emit('visualization_response', parsedData);
        } catch (parseErr) {
          console.error('Error parsing JSON from file:', filePath, parseErr);
          socket.emit('visualization_response', { error: 'Failed to parse visualization data' });
        }
      });
    } catch (error) {
      console.error('Error handling visualization request:', error);
      socket.emit('visualization_response', { error: error.message || 'An error occurred' });
    }
  });

  // DOUBT request
  // If you still want to keep using Python for doubts, leave this code as is.
  // Otherwise, remove or modify to also read local data if you prefer.
  socket.on('doubt', async (data) => {
    try {
      console.log('Doubt request:', data);

      const sessionId = uuidv4();
      const cacheKey = `viz_${data.topic}`;
      let visualizationData = null;

      // Check cache for existing visualization
      if (visualizationCache.has(cacheKey)) {
        visualizationData = visualizationCache.get(cacheKey);
        console.log('Using cached visualization data');
      } else {
        // Otherwise spawn Python (or read local if you want)
        try {
          const pythonProcess = spawn('python', ['app.py', '--topic', data.topic]);
          let vizDataStr = '';

          pythonProcess.stdout.on('data', (chunk) => {
            vizDataStr += chunk.toString();
          });

          await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
              if (code === 0 && vizDataStr) {
                try {
                  visualizationData = JSON.parse(vizDataStr);
                  visualizationCache.set(cacheKey, visualizationData);
                  resolve();
                } catch (error) {
                  console.error('Error parsing visualization data:', error);
                  reject(error);
                }
              } else {
                reject(new Error('Failed to generate visualization data'));
              }
            });
            pythonProcess.stderr.on('data', (err) => {
              console.error(`Python error: ${err}`);
            });
          });
        } catch (error) {
          console.error('Error fetching visualization data:', error);
        }
      }

      // If the client wants WebRTC
      if (data.use_webrtc) {
        console.log('Client requested WebRTC session');
        socket.emit('start_webrtc_session', {
          sessionId,
          topic: data.topic,
          doubt: data.doubt,
          visualizationData
        });
        return;
      }

      // Otherwise handle doubt in Python
      const currentState = data.current_state || {};
      const currentTime = data.current_time || 0;
      const doubtRequest = {
        topic: data.topic,
        doubt: data.doubt,
        current_state: currentState,
        current_time: currentTime
      };

      const pythonProcess = spawn('python', ['app.py', '--doubt', '--topic', data.topic]);
      pythonProcess.stdin.write(JSON.stringify(doubtRequest));
      pythonProcess.stdin.end();

      let responseData = '';

      pythonProcess.stdout.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      pythonProcess.stderr.on('data', (err) => {
        console.error(`Python error: ${err}`);
      });

      pythonProcess.on('close', async (code) => {
        console.log(`Python doubt process exited with code ${code}`);
        if (code === 0 && responseData) {
          try {
            const parsedResponse = JSON.parse(responseData);
            const doubtResponse = {
              narration: parsedResponse.narration || "I couldn't generate a response.",
              narration_timestamps: parsedResponse.narration_timestamps || [],
              highlights: parsedResponse.highlights || []
            };

            // If there's audio, attach it; otherwise you might generate TTS here
            if (parsedResponse.audio_url) {
              doubtResponse.audio_url = parsedResponse.audio_url;
            }
            socket.emit('doubt_response', doubtResponse);

          } catch (error) {
            console.error('Error parsing doubt response:', error);
            socket.emit('error', { message: 'Failed to parse doubt response' });
          }
        } else {
          socket.emit('error', { message: 'Failed to process doubt' });
        }
      });
    } catch (error) {
      console.error('Error handling doubt request:', error);
      socket.emit('error', { message: error.message || 'An error occurred' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Upgrade HTTP connections to WebSocket
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  console.log(`WebSocket upgrade request for path: ${pathname}`);

  if (pathname.startsWith('/socket.io/')) {
    console.log('Allowing Socket.IO WebSocket upgrade');
    // Let Socket.IO handle it
  } else {
    console.log(`Rejecting WebSocket upgrade for unknown path: ${pathname}`);
    socket.destroy();
  }
});

// Catch-all route to serve your React app
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'client/dist/index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
