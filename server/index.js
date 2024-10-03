import express from "express";
import WebSocket, { WebSocketServer } from "ws";
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

const app = express();
app.use(express.json());

// All routes
app.get("/", (req, res) => {
  res.send("Server is running.");
});

const server = app.listen(8080, () => {
  console.log("Server running on port 8080 and database connected.");
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS

// Hard-coded commands for different channels
const channelData = {
  channel1: {
    type: "software",
    name: "brave-browser",
    commands: [
      "sudo apt install -y curl",
      "sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg",
      "echo 'deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main' | sudo tee /etc/apt/sources.list.d/brave-browser-release.list",
      "sudo apt update",
      "sudo apt install -y brave-browser",
    ],
  },
  channel2: {
    type: "wallpaper",
    name: "wallpaper-change",
    commands: [
      "https://th.bing.com/th/id/R.e6f2cedf317be31914a0057344eacd84?rik=lfjPJ3TUzOTvow&riu=http%3a%2f%2fwww.pixelstalk.net%2fwp-content%2fuploads%2f2016%2f04%2fDesktop-computer-nature-wallpaper-hd.jpg&ehk=9aJz5cz8NKlzsXNWOSKRpzEd3Ez5IHxpkLjp8NZ%2fmXg%3d&risl=&pid=ImgRaw&r=0",
    ],
  },
  channel3: {
    type: "misc",
    name: "system update",
    commands: [
      "sudo apt update",
      "sudo apt upgrade -y",
    ],
  },
};

// Structure to store channel subscriptions
const channelClients = {};

// WebSocket connection setup
wss.on("connection", (ws) => {
  console.log("[Server] Client connected via WebSocket.");

  ws.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      console.log(parsedMessage);

      // Handle channel subscription
      if (parsedMessage.type === "subscribe") {
        const { channels: requestedChannels } = parsedMessage;

        requestedChannels.forEach((channel) => {
          if (!channelClients[channel]) {
            channelClients[channel] = new Set();
          }
          channelClients[channel].add(ws); // Add client to the channel's Set

          // Send commands to the new client subscribing to this channel
          sendCommandsToClient(ws, channel);
        });

        ws.subscribedChannels = requestedChannels; // Store subscribed channels
      }

      console.log(`[Server] Received message from client: ${message}`);
    } catch (err) {
      console.error("[Server] Error parsing message:", err.message);
      ws.send(JSON.stringify({ error: "Invalid JSON format" })); // Optional: notify the client
    }
  });

  ws.on("close", () => {
    if (ws.subscribedChannels) {
      ws.subscribedChannels.forEach((channel) => {
        channelClients[channel]?.delete(ws); // Remove from each channel's client set

        // Clean up empty channels
        if (channelClients[channel]?.size === 0) {
          delete channelClients[channel];
          console.log(`[Server] Channel ${channel} removed.`);
        }
      });
      console.log("[Server] Client unsubscribed from all channels.");
    }
  });
});

// Function to send commands to a single client when they subscribe
const sendCommandsToClient = (client, channel) => {
  const channelMeta = channelData[channel];

  if (channelMeta) {
    const message = {
      type: channelMeta.type,
      name: channelMeta.name,
      commands: channelMeta.commands,
    };

    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message)); // Send the command as JSON to the client
    }
    console.log(`[Server] Commands sent to client for channel: ${channel}`);
  }
};


// API to fetch all clients
app.get("/clients", async (req, res) => {
  try {
    const clients = await db.any("SELECT * FROM sama_clients LIMIT 10");
    res.status(200).send({ message: "Clients fetched successfully.", clients });
  } catch (error) {
    console.error("[API] Error fetching clients:", error);
    res.status(500).send({ message: "Error fetching clients", error: error.message });
  }
});

// API to create a new client
app.post("/client/create", async (req, res) => {
  const { name, mac_address } = req.body;

  try {
    const newClient = await db.one(
      "INSERT INTO sama_clients (name, mac_address) VALUES ($1, $2) RETURNING *",
      [name, mac_address]
    );
    res.status(200).send({ message: "Client created successfully.", client: newClient });
  } catch (error) {
    console.error("[API] Error creating client:", error);
    const errorMessage =
      error.code === "23505" ? "Client with the same name already exists." : "Error creating client.";
    res.status(error.code === "23505" ? 400 : 500).send({ message: errorMessage, error: error.message });
  }
});


// API to update software status
app.put("/client/update/software-status", async (req, res) => {
  const { mac_address } = req.body;

  if (!mac_address) {
    return res.status(400).send({ message: "mac_address is required." });
  }

  try {
    const updatedClient = await db.one(
      "UPDATE sama_clients SET software_installed = true WHERE mac_address = $1 RETURNING *",
      [mac_address]
    );
    res.status(200).send({
      message: "Software status updated successfully.",
      client: updatedClient,
    });
  } catch (error) {
    console.error("[API] Error updating software status:", error);
    res.status(500).send({
      message: "Error updating software status.",
      error: error.message,
    });
  }
});

// API to update wallpaper status
app.put("/client/update/wallpaper-status", async (req, res) => {
  const { mac_address } = req.body;

  if (!mac_address) {
    return res.status(400).send({ message: "mac_address is required." });
  }

  try {
    const updatedClient = await db.one(
      "UPDATE sama_clients SET wallpaper_changed = true WHERE mac_address = $1 RETURNING *",
      [mac_address]
    );
    res.status(200).send({
      message: "Wallpaper status updated successfully.",
      client: updatedClient,
    });
  } catch (error) {
    console.error("[API] Error updating wallpaper status:", error);
    res.status(500).send({
      message: "Error updating wallpaper status.",
      error: error.message,
    });
  }
});

// Endpoint to handle database sync via JSON data
app.post("/database-sync", async (req, res) => {
  const { data: rows } = req.body;

  if (!rows?.length) {
    return res.status(400).json({ message: "No data provided" });
  }

  try {
    for (const { mac_address, active_time, date, location, username } of rows) {
      const clientQuery = `
        INSERT INTO sama_clients (name, mac_address)
        SELECT $1, $2 WHERE NOT EXISTS (
          SELECT 1 FROM sama_clients WHERE mac_address = $2
        )`;
      await db.none(clientQuery, [username, mac_address]);

      const existingRow = await db.oneOrNone(
        `SELECT active_time FROM sama_system_tracking WHERE mac_address = $1 AND "date" = $2`,
        [mac_address, date]
      );

      if (existingRow) {
        const updatedTime =
          parseInt(existingRow.active_time, 10) + parseInt(active_time, 10);
        await db.none(
          `UPDATE sama_system_tracking SET active_time = $1, location = $2 WHERE mac_address = $3 AND "date" = $4`,
          [updatedTime, location, mac_address, date]
        );
      } else {
        await db.none(
          `INSERT INTO sama_system_tracking (mac_address, active_time, "date", location) VALUES ($1, $2, $3, $4)`,
          [mac_address, active_time, date, location]
        );
      }
    }

    res.json({ message: "Database synchronized successfully" });
  } catch (err) {
    console.error("Error syncing database:", err.message);
    res.status(500).json({ message: "Failed to synchronize database" });
  }
});
