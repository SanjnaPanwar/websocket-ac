const Html5WebSocket = require("html5-websocket");
const ReconnectingWebSocket = require("reconnecting-websocket");

// WebSocket initialization
let ws_host = "localhost";
let ws_port = "8080";

// Ensure that the valid WebSocket class is passed into the options
const options = { WebSocket: Html5WebSocket };

const rws = new ReconnectingWebSocket(
  "ws://" + ws_host + ":" + ws_port + "/ws",
  undefined,
  options
);

rws.timeout = 1000; // Timeout duration

rws.addEventListener("open", () => {
  console.log("[Client] Connection to WebSocket server is opened.");
  rws.send("Hello, this is a message from a client.");
});

rws.addEventListener("message", (e) => {
  console.log("[Client] Message received: " + e.data);
});

rws.addEventListener("close", () => {
  console.log("[Client] Connection closed.");
});

// Error handling
rws.onerror = (err) => {
  console.log("[Client] Error: " + err.message);
};
