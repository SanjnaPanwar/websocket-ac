import express from 'express';
import { WebSocketServer } from 'ws';

// Create an Express server
const app = express();
const server = app.listen(8080, () => {
  console.log('Server is running on port 8080');
});

// Create a WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[Server] A client connected.');

  // Define the command to send to the client
  const command = "npm -v";  // Example command to be executed by the client
  console.log(`[Server] Sending command to client: ${command}`);
  
  // Send the command to the client
  ws.send(command);

  // Handle the result returned from the client
  ws.on('message', (message) => {
    console.log(`[Server] Received result from client: ${message}`);
  });

  // Handle when the client disconnects
  ws.on('close', () => {
    console.log('[Server] Client disconnected.');
  });
});
