// In ./server/routes/software_installation.js
const express = require('express');
const router = express.Router();
const { clients } = require('../index'); // Ensure correct path to the file where `clients` is exported
const WebSocket = require('ws');

function sendCommandToClients(command) {
  if (!clients) {
    console.error('Clients array is not defined');
    return;
  }
  console.log('Sending command to clients:', command); // Debugging line
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(command);
    }
  });
}

router.post('/send-command', (req, res) => {
  const { command } = req.body;
  if (command) {
    sendCommandToClients(command);
    res.status(200).send('Command sent.');
  } else {
    res.status(400).send('Command is required.');
  }
});

module.exports = router;
