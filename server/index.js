import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import pgPromise from "pg-promise";
import cors from "cors";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AWS from "aws-sdk";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

// AWS S3 setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Multer setup for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for example
});

// Get the current directory and set the JSON file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "channels.json");

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

// Function to read channels from JSON file
const readChannels = async () => {
  try {
    const data = await fs.readFile("./channels.json", "utf-8"); // Adjust the path as needed
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading channels:", err.message);
    throw new Error("Failed to read channels");
  }
};

// Structure to store channel subscriptions
const channelClients = {};

// WebSocket connection setup
wss.on("connection", async (ws) => {
  console.log("[Server] Client connected via WebSocket.");

  // Fetch channels data once at the start
  const channelData = await readChannels();

  ws.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      console.log(parsedMessage, "ssss");

      // Handle channel subscription
      if (parsedMessage.type === "subscribe") {
        const { channels: requestedChannels } = parsedMessage;

        requestedChannels.forEach((channel) => {
          if (!channelClients[channel]) {
            channelClients[channel] = new Set();
          }
          channelClients[channel].add(ws); // Add client to the channel's Set
          console.log(channelData, "channelData");

          // Send commands to the new client subscribing to this channel
          sendCommandsToClient(ws, channelData, channel);
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
const sendCommandsToClient = (client, channelData, channel) => {
  const channelMeta = channelData[channel];
  console.log(channelMeta, "channelMeta");

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
    res
      .status(500)
      .send({ message: "Error fetching clients", error: error.message });
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
    res
      .status(200)
      .send({ message: "Client created successfully.", client: newClient });
  } catch (error) {
    console.error("[API] Error creating client:", error);
    const errorMessage =
      error.code === "23505"
        ? "Client with the same name already exists."
        : "Error creating client.";
    res
      .status(error.code === "23505" ? 400 : 500)
      .send({ message: errorMessage, error: error.message });
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
        await db.none(
          `UPDATE sama_system_tracking SET active_time = $1, location = $2 WHERE mac_address = $3 AND "date" = $4`,
          [active_time, location, mac_address, date]
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

// Helper function to write to the JSON file
async function writeChannels(channels) {
  try {
    await fs.writeFile(filePath, JSON.stringify(channels, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to JSON file:", err);
    throw new Error("Could not write channels");
  }
}

// Get all channels from JSON
app.get("/channels", async (req, res) => {
  try {
    const channels = await readChannels();

    // Return all channels in the response
    res.json(channels);
  } catch (err) {
    console.error("Error fetching channels:", err.message);
    res.status(500).json({ message: "Failed to fetch channels" });
  }
});

// API for adding a new channel
app.post("/channels", async (req, res) => {
  const { channelName, type, name, commands } = req.body;

  if (!channelName || !type || !name || !commands || !Array.isArray(commands)) {
    return res.status(400).json({
      message:
        "Invalid input. Please provide channelName, type, name, and commands.",
    });
  }

  try {
    const channels = await readChannels();

    // Check if the channel already exists
    if (channels[channelName]) {
      // Clear the existing commands array
      channels[channelName].commands = [];

      // Log to indicate that the existing commands have been cleared
      console.log(
        `[Server] Cleared commands for existing channel: ${channelName}`
      );
    }

    // Update or add new channel data
    channels[channelName] = {
      type,
      name,
      commands, // New commands added or updated after clearing
    };

    // Write updated channels back to JSON file
    await writeChannels(channels);

    res.status(200).json({
      message: "Channel added/updated successfully.",
      channel: channels[channelName],
    });
  } catch (err) {
    console.error("Error adding channel:", err.message);
    res.status(500).json({ message: "Failed to add/update channel." });
  }
});

// Get commands for a specific channel by name from JSON
app.get("/channels/:channelName", async (req, res) => {
  const { channelName } = req.params;

  try {
    const channels = await readChannels();

    if (!channels[channelName]) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const commands = channels[channelName].commands || "";
    res.json({ commands });
  } catch (err) {
    console.error("Error fetching commands:", err.message);
    res.status(500).json({ message: "Failed to fetch commands" });
  }
});

// // Image upload route for a single image
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    // Check if the file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Generate a unique filename
    const fileName = `${uuidv4()}-${req.file.originalname}`;

    // Define the S3 upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET_NAME, // Your S3 bucket name
      Key: `sama_wallpaper/${fileName}`, // The filename in S3
      Body: req.file.buffer, // File buffer from Multer
      ContentType: req.file.mimetype, // Content type (MIME type of the file)
      ACL: "public-read", // Access control list for the file (optional)
    };

    // Upload the file to S3
    const data = await s3.upload(params).promise();

    // Respond with the S3 file URL
    const uploadedImage = data.Location;

    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: uploadedImage,
    });

    // Read existing channel data
    const channelData = await readChannels();

    // Prepare the wallpaper command
    const wallpaperCommandPrefix =
      "gsettings set org.gnome.desktop.background picture-uri";
    const wallpaperCommand = `${wallpaperCommandPrefix} '${uploadedImage}'`;

    // Check if channel1 exists and has commands array
    if (channelData.channel1 && Array.isArray(channelData.channel1.commands)) {
      // Find the index of the existing gsettings command
      const existingCommandIndex = channelData.channel1.commands.findIndex(
        (command) => command.startsWith(wallpaperCommandPrefix)
      );

      if (existingCommandIndex !== -1) {
        // Update the existing gsettings command with the new URL
        channelData.channel1.commands[existingCommandIndex] = wallpaperCommand;
      } else {
        // If not found, push the new wallpaper command
        channelData.channel1.commands.push(wallpaperCommand);
      }
    } else {
      console.error("Channel1 or commands array not found");
    }

    // Write the updated channel data back
    await writeChannels(channelData);
  } catch (error) {
    console.error("Error uploading image:", error);
    res
      .status(500)
      .json({ message: "Failed to upload image", error: error.message });
  }
});
