// In server.js or your main file
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.json());

const clients = []; // Array to store WebSocket clients

app.get("/", (req, res) => {
  res.send("Server is running.");
});

const server = app.listen(8080, () => {
  console.log('Server is running on port 8080');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[Server] A client connected.');
  clients.push(ws); // Add client to the list

  ws.on('message', (message) => {
    console.log(`[Server] Received message from client: ${message}`);
  });

  ws.on('close', () => {
    console.log('[Server] Client disconnected.');
    const index = clients.indexOf(ws);
    if (index > -1) {
      clients.splice(index, 1);
    }
  });
});


// helper fuctions
async function installPackage() {
  const managers = ["apt", "pip", "npm"];
  let installedPackages = [];

  for (let manager of managers) {
    let command;
    try {
      if (manager === "apt") {
        command = `sudo apt-get install python3-pip npm -y`; // apt installs pip and npm
        await executeCommand(command);
        installedPackages.push({ manager });
      } else if (manager === "pip") {
        command = `pip install --upgrade pip`; // Upgrade pip if it's already installed
        await executeCommand(command);
        installedPackages.push({ manager });
      } else if (manager === "npm") {
        command = `npm install -g npm`; // Globally install/upgrade npm
        await executeCommand(command);
        installedPackages.push({ manager });
      }
    } catch (error) {
      console.error(
        `Failed to install ${manager}. Skipping to next manager...`
      );
    }
  }

  if (installedPackages.length === 0) {
    throw new Error(`Failed to install using all package managers.`);
  }

  return installedPackages;
}


// Dummy route for testing
app.post('/send-command', (req, res) => {
  const { command } = req.body;
  if (command) {
    console.log('Sending command to clients:', command); // Debugging line
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(command);
      }
    });
    res.status(200).send('Command sent.');
  } else {
    res.status(400).send('Command is required.');
  }

  app.postpost('/install', async (req, res) => {
    try {
        const result = await installPackage();
        if (result.length > 0) {
            res.status(200).send({
                message: 'Packages installed successfully.',
                installedPackages: result,
            });
        } else {
            res.status(400).send({
                message: 'No packages were installed.',
            });
        }
    } catch (error) {
        res.status(500).send({
            message: 'Failed to install packages.',
            error: error.message,
        });
    }
});
});
