import express from 'express';
import { WebSocketServer } from 'ws';
import { exec } from 'child_process';

// Create an Express server
const app = express();
const server = app.listen(8080, () => {
  console.log('Server is running on port 8080');
});

// Create a WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[Server] A client connected.');

  // Execute the command when a client connects (e.g., "ls" to list directory)
  const command = 'node -v'; // Example command

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Server] Error executing command: ${error.message}`);
      ws.send(`[Server] Error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`[Server] Command executed with errors: ${stderr}`);
      ws.send(`[Server] Error: ${stderr}`);
      return;
    }

    console.log(`[Server] Command executed: ${command}`);
    // Send the command output to the client
    ws.send(`[Server] Command execution:\n${stdout}`);
  });

  // Handle when the client sends a message
  ws.on('message', (message) => {
    console.log(`[Server] Received message: ${message}`);
  });

  // Handle when the client disconnects
  ws.on('close', () => {
    console.log('[Server] Client disconnected.');
  });
});
