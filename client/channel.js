const WebSocket = require("ws");

// Connect to the WebSocket server
const ws = new WebSocket("ws://localhost:8080");

// Specify the channel the client wants to subscribe to
const channel = "channel1"; // Change this to "channel2" or "channel3" as needed

ws.on("open", () => {
  console.log("Connected to server");
  // Send the subscription request
  ws.send(JSON.stringify({ action: "subscribe", channel }));
});

ws.on("message", (message) => {
  console.log(`Received: ${message}`);
});

ws.on("close", () => {
  console.log("Disconnected from server");
});
