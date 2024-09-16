// Import necessary modules
import Html5WebSocket from "html5-websocket";
import ReconnectingWebSocket from "reconnecting-websocket";
import { exec } from "child_process";
import express from "express";

// WebSocket initialization
const ws_host = "localhost"; // Replace with your EC2 IP or hostname
const ws_port = "8080";

// Ensure that the valid WebSocket class is passed into the options
const options = { WebSocket: Html5WebSocket };

const rws = new ReconnectingWebSocket(
  `ws://${ws_host}:${ws_port}/ws`,
  undefined,
  options
);

rws.timeout = 1000; // Timeout duration

// Function to install software
function installSoftware(packageName) {
  console.log(`[Client] Installing software: ${packageName}`);
  exec(`sudo apt install -y ${packageName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Client] Installation error: ${error.message}`);
      rws.send(`[Client] Installation error: ${error.message}`);
      return;
    }

    const aptWarning =
      "WARNING: apt does not have a stable CLI interface. Use with caution in scripts.";
    if (stderr && !stderr.includes(aptWarning)) {
      console.error(`[Client] Installation stderr: ${stderr}`);
      rws.send(`[Client] Installation error: ${stderr}`);
      return;
    }

    console.log(`[Client] Installation stdout: ${stdout}`);
    rws.send(`[Client] Software installed successfully: ${packageName}`);
  });
}

// WebSocket event listeners
rws.addEventListener("open", () => {
  console.log("[Client] Connected to WebSocket server.");
});

rws.addEventListener("message", (e) => {
  const command = e.data.trim();
  console.log(`[Client] Command received from server: ${command}`);

  if (command.startsWith("install")) {
    const packageName = "openbox"; // Extract package name (dynamic extraction can be implemented)

    console.log("[Client] Package name: " + packageName);
    if (packageName) {
      installSoftware(packageName);
    } else {
      rws.send("[Client] Error: No package name specified for installation.");
    }
  } else {
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
      rws.send(stdout);
    });
  }
});

rws.addEventListener("close", () => {
  console.log("[Client] Connection closed.");
});

rws.onerror = (err) => {
  console.log("[Client] Error: " + err.message);
};

// Express server setup
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// API endpoint to receive an array
app.post("/api/processArray", (req, res) => {
  const arrayData = req.body.array;

  if (!Array.isArray(arrayData)) {
    return res
      .status(400)
      .send({ message: "Invalid input, expected an array." });
  }

  console.log("[API] Received array:", arrayData);

  // Here you can process the array as needed
  // For demonstration, we'll just send it back through WebSocket
  rws.send(`[API] Received array: ${JSON.stringify(arrayData)}`);

  res.send({ message: "Array processed successfully." });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
