import express from 'express';
import { WebSocketServer } from 'ws';
import { exec } from 'child_process';
// import clientRoutes from './routes/clientRoutes.mjs'; // Import the named export

import "reflect-metadata";
import { createConnection } from "typeorm";
import ormconfig from "./ormconfig.mjs";

// Establish database connection
createConnection(ormconfig)
  .then(() => {
    console.log("Database connected");
  })
  .catch((error) => console.error("Database connection failed:", error));


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

  ws.on('message', (message) => {
    console.log(`[Server] Received from client: ${message}`);
  });

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
  
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(command);
    }
  });

  res.json({ message: `Command sent: ${command}` });
});

//helper function
const installPackages = async function() {
  const managers = ["apt", "pip", "npm"];
  let installedPackages = [];

  for (let manager of managers) {
    let command;
    try {
      if (manager === "apt") {
        command = `sudo apt-get install python3-pip npm -y`; // apt installs pip and npm
        installedPackages.push({ manager, command });
      } else if (manager === "pip") {
        command = `pip install --upgrade pip`; // Upgrade pip
        installedPackages.push({ manager, command });
      } else if (manager === "npm") {
        command = `npm install -g npm`; // Globally install/upgrade npm
        installedPackages.push({ manager, command });
      }

      // Execute the command (You might want to actually run the command here using exec)
      console.log(`Running: ${command}`);

    } catch (error) {
      console.error(`Failed to install ${manager}. Skipping to next manager...`);
    }
  }

  if (installedPackages.length === 0) {
    throw new Error(`Failed to install using all package managers.`);
  }

  return installedPackages;
};
//preinstall packages API
app.post('/install', async (req, res) => {
  try {
    // Call the function to install packages
    const installedPackages = await installPackages();

    // Loop over the installed packages and send their commands to the WebSocket clients
    installedPackages.forEach(pkg => {
      wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
          client.send(pkg.command);  // Send the install command to WebSocket client
        }
      });
    });

    // Send success response back to HTTP client
    if (installedPackages.length > 0) {
      res.status(200).send({
        message: 'Packages installed successfully.',
        installedPackages,
      });
    } else {
      res.status(400).send({
        message: 'No packages were installed.',
      });
    }

  } catch (error) {
    // Send failure response back to HTTP client
    res.status(500).send({
      message: 'Failed to install packages.',
      error: error.message,
    });
  }
});



