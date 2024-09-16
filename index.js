import express from 'express';
import { WebSocketServer } from 'ws';  // WebSocket
import { exec } from 'child_process';  // For executing system commands

const app = express();
const PORT = 8080;

// Middleware to parse JSON bodies
app.use(express.json());

// Start the Express server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Create a WebSocket server attached to the Express server
const wss = new WebSocketServer({ server });

// WebSocket connection setup
wss.on('connection', (ws) => {
  console.log('[Server] A client connected via WebSocket.');

  // Handle messages from the client (e.g., client responses)
  ws.on('message', (message) => {
    console.log(`[Server] Received from client: ${message}`);
  });

  // Handle when the client disconnects
  ws.on('close', () => {
    console.log('[Server] Client disconnected.');
  });
});

// Endpoint to send a command to the connected WebSocket client
app.post('/send-command', (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  console.log(`[Server] Sending command to WebSocket client: ${command}`);
  
  // Send the command to all connected WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(command);  // Send the command via WebSocket
    }
  });

  res.json({ message: `Command sent: ${command}` });
});
