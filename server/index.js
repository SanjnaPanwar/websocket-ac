import express from "express";
import { WebSocketServer } from "ws";

// Create an Express server
const app = express();
const server = app.listen(3000, () => {
  console.log("Express server is running on port 3000");
});

// Create a WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[Server] A client connected.");

  // Define the command to send to the client
  const command = "install openbox"; // Example command to be executed by the client
  console.log(`[Server] Sending command to client: ${command}`);

  // Send the command to the client
  ws.send(command);

  // Handle the result returned from the client
  ws.on("message", (message) => {
    console.log(`[Server] Received result from client: ${message}`);
  });

  // Handle when the client disconnects
  ws.on("close", () => {
    console.log("[Server] Client disconnected.");
  });
});

// API endpoint to receive an array
app.use(express.json()); // Middleware to parse JSON bodies

app.post("/api/processArray", (req, res) => {
  const arrayData = req.body.array;

  if (!Array.isArray(arrayData)) {
    return res
      .status(400)
      .send({ message: "Invalid input, expected an array." });
  }

  console.log("[API] Received array:", arrayData);

  // Here you can process the array as needed
  res.send({ message: "Array processed successfully." });
});

// API endpoint to execute a command
app.post("/api/executeCommand", (req, res) => {
  const command = req.body.command;

  if (!command) {
    return res
      .status(400)
      .send({ message: "Invalid input, expected a command." });
  }

  console.log("[API] Executing command:", command);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`[API] Error executing command: ${error.message}`);
      return res.status(500).send({ message: "Error executing command." });
    }

    if (stderr) {
      console.error(`[API] Command executed with errors: ${stderr}`);
      return res.status(500).send({ message: "Command executed with errors." });
    }

    console.log(`[API] Command output: ${stdout}`);
    res.send({ message: "Command executed successfully.", output: stdout });
  });
});
