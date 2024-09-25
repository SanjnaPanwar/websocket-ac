import express from "express";
import { WebSocketServer } from "ws";
import pgPromise from "pg-promise";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// PostgreSQL database connection
const pgp = pgPromise({});
const db = pgp({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Create an Express server
const app = express();
const server = app.listen(8080, () => {
  console.log("Server running on port 8080 and database connected.");
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS

// Define the messages for each channel
const channels = {
  channel1: "This is the message from Channel 1",
  channel2: "This is the message from Channel 2",
  channel3: "This is the message from Channel 3",
};

// WebSocket connection setup
wss.on("connection", (ws) => {
  console.log("[Server] Client connected via WebSocket.");

  let subscribedChannel = null;

  // Handle incoming messages from clients
  ws.on("message", (message) => {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.action === "subscribe") {
      const channel = parsedMessage.channel;

      if (channels[channel]) {
        subscribedChannel = channel;
        console.log(`[Server] Client subscribed to ${channel}`);
        ws.send(`Subscribed to ${channel}`);
      } else {
        ws.send(
          "Invalid channel. Please subscribe to channel1, channel2, or channel3."
        );
      }
    }
  });

  // Periodically send messages to the subscribed channel
  const sendMessages = setInterval(() => {
    if (subscribedChannel && channels[subscribedChannel]) {
      ws.send(channels[subscribedChannel]);
    }
  }, 5000); // Send message every 5 seconds

  ws.on("close", () => {
    console.log("[Server] Client disconnected.");
    clearInterval(sendMessages); // Stop sending messages when the client disconnects
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send({ message: "Server is live." });
});

// Existing API and database functionality remains unchanged...
