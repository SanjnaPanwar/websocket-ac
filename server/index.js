import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import pgPromise from "pg-promise";
import cors from "cors";
import dotenv from "dotenv";
// import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AWS from "aws-sdk";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import cron from "node-cron";
import fs from "fs/promises";

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

const server = app.listen(process.env.PORT, () => {
  console.log(
    `Server running on port ${process.env.PORT} and database connected.`
  );
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());
const allowedOrigins = [process.env.CLIENT_URL, process.env.LOCAL_CLIENT_URL];

app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // If using cookies or authorization headers
  })
);

//************** HELPER FUNCTIONS **************//

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

// Helper function to write to the JSON file
async function writeChannels(channels) {
  try {
    await fs.writeFile(filePath, JSON.stringify(channels, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to JSON file:", err);
    throw new Error("Could not write channels");
  }
}

// Function to send commands to a single client when they subscribe
const sendCommandsToClient = (client, channelData, channel) => {
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

// Function to fetch tracking data by mac_address and include current location
const getTrackingDataByMacAddress = async (mac_address) => {
  try {
    // Query to join both tables and fetch tracking data, including location
    const trackingData = await db.any(
      `
      SELECT st.*, c.name as client_name, c.last_sync, st.location
      FROM sama_system_tracking st
      JOIN sama_clients c ON st.mac_address = c.mac_address
      WHERE st.mac_address ILIKE $1
      ORDER BY st.date DESC
      `,
      [mac_address]
    );

    return trackingData;
  } catch (err) {
    throw new Error("Failed to fetch tracking data: " + err.message);
  }
};

// Function to calculate total active time from tracking data
const calculateTotalActiveTime = (trackingData) => {
  // Reduce function to accumulate total seconds
  const totalSeconds = trackingData.reduce((total, entry) => {
    // Convert hh:mm:ss to total seconds
    const [hours, minutes, seconds] = entry.active_time.split(":").map(Number);
    return total + hours * 3600 + minutes * 60 + seconds;
  }, 0);

  // Convert total seconds back to hh:mm:ss
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Return in hh:mm:ss format
  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
};

/// Function to update software status in the `sama_client` table
function updateSoftwareStatus(macAddress, installedSoftware, status) {
  // Update query to insert or append software and update software_installed status
  const sql = `
    UPDATE sama_clients
    SET
      software_status = $1,
      installed_softwares = 
        CASE 
          WHEN installed_softwares IS NULL OR installed_softwares = '' THEN $2
          WHEN POSITION($2 in installed_softwares) = 0 THEN CONCAT(installed_softwares, ', ', $2)
          ELSE installed_softwares
        END
    WHERE mac_address = $3
  `;

  // Update the software status and installed software list based on mac_address
  db.none(sql, [status, installedSoftware, macAddress])
    .then(() => {
      console.log(
        `Updated software status for ${installedSoftware} on ${macAddress}`
      );
    })
    .catch((err) => {
      console.error("[DB] Error updating software status:", err);
    });
}

// Function to update wallpaper status in the `sama_client` table
async function updateWallpaperStatus(macAddress, status) {
  const query = `UPDATE sama_clients SET wallpaper_status = $1 WHERE mac_address = $2`;
  const values = [status, macAddress];

  try {
    await db.none(query, values);
  } catch (error) {
    console.error("[DB] Error updating wallpaper status:", error);
    throw error;
  }
}

// Function to create or update a record in the `sama_clients` table
async function createOrUpdateClientRecord(macAddress, serialNumber) {
  const trimmedMacAddress = macAddress.trim();
  const trimmedSerialNumber = serialNumber.trim();

  try {
    // Check if the record already exists based on mac_address
    const existingClient = await db.oneOrNone(
      `SELECT id, serial_number FROM sama_clients WHERE mac_address = $1`,
      [trimmedMacAddress]
    );

    if (existingClient) {
      // If the record exists, update the serial_number
      if (existingClient.serial_number !== trimmedSerialNumber) {
        await db.none(
          `UPDATE sama_clients 
           SET serial_number = $1, last_sync = NOW() 
           WHERE mac_address = $2`,
          [trimmedSerialNumber, trimmedMacAddress]
        );
        console.log("[DB] Record updated with new serial number.");
      } else {
        console.log("[DB] Serial number is the same, no update needed.");
      }
    } else {
      // If the record does not exist, create a new record
      await db.none(
        `INSERT INTO sama_clients (mac_address, serial_number, created_at)
         VALUES ($1, $2, NOW())`,
        [trimmedMacAddress, trimmedSerialNumber]
      );
      console.log("[DB] Record created successfully.");
    }
  } catch (error) {
    console.error("[DB] Error creating or updating record:", error);

    // Specific error handling
    if (error.code === "23505") {
      // Unique constraint violation (e.g., mac_address and serial_number combination)
      throw new Error(
        "Record with the same macAddress and serialNumber already exists."
      );
    }
    throw error; // Rethrow for unhandled cases
  }
}

// Main message processor
async function processMessage(ws, parsedMessage, channelData) {
  // If the parsed message contains an array of actions (multiple types)
  if (Array.isArray(parsedMessage)) {
    for (const message of parsedMessage) {
      await processSingleMessage(ws, message, channelData); // Process each message type
    }
  }
  // Check if parsedMessage is valid
  else await processSingleMessage(ws, parsedMessage, channelData); // Process a single message type
}

// Function to handle each individual message type
async function processSingleMessage(ws, message, channelData) {
  switch (message.type) {
    case "subscribe":
      handleSubscription(ws, message, channelData);
      break;
    case "software":
      await handleSoftwareUpdate(message);
      break;
    case "wallpaper":
      await handleWallpaperUpdate(message);
      break;
    case "serialNumber":
      await handleClientRecordCreation(message);
      break;
    default:
      // console.error("[Service] Unknown message type:", message.type);
      break;
  }
}

function handleSubscription(ws, parsedMessage, channelData) {
  const { channels: requestedChannels } = parsedMessage;

  requestedChannels.forEach((channel) => {
    if (!channelClients[channel]) {
      channelClients[channel] = new Set();
    }
    channelClients[channel].add(ws); // Add client to the channel's Set

    // Send commands to the new client subscribing to this channel
    sendCommandsToClient(ws, channelData, channel);
  });

  ws.subscribedChannels = requestedChannels; // Store subscribed channels
}

// Function to handle software updates
async function handleSoftwareUpdate(message) {
  const { mac_address, status, installed_software } = message;

  // Validate data
  if (!mac_address || typeof status !== "boolean" || !installed_software) {
    console.error("[Service] Invalid software message data:", message);
    return;
  }

  // Update the database using mac_address
  await updateSoftwareStatus(mac_address, installed_software, status);
}

// Function to handle wallpaper updates
async function handleWallpaperUpdate(message) {
  const { mac_address, status } = message;

  // Validate data
  if (!mac_address || typeof status !== "boolean") {
    console.error("[Service] Invalid wallpaper message data:", message);
    return;
  }

  // Update the database based on mac_address
  await updateWallpaperStatus(mac_address, status);
}

// Function to handle serial number updates
async function handleClientRecordCreation(message) {
  const { mac_address, serial } = message;

  // Validate data
  if (!mac_address || !serial) {
    console.error("[Service] Invalid serial message data:", message);
    return;
  }

  // Update the database based on mac_address
  await createClientRecord(mac_address, serial);
}
// Structure to store channel subscriptions
const channelClients = {};

// WebSocket connection setup
wss.on("connection", async (ws) => {
  console.log("[Server] Client connected via WebSocket.");

  // Fetch channels data once at the start
  const channelData = await readChannels();

  ws.on("message", async (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      // Pass the parsed message to the message service
      await processMessage(ws, parsedMessage, channelData);

      console.log(`[Server] Received message from client: ${message}`);
    } catch (err) {
      console.error("[Server] Error parsing message:", err.message);
      ws.send(JSON.stringify({ error: "Invalid JSON format" })); // Notify the client
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

//************** ROUTES **************//

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

// API to fetch clients
app.get("/clients", async (req, res) => {
  const { page = 0, limit = 20 } = req.query; // Default to page 0 and limit 20
  const offset = page * limit;

  try {
    // Fetch clients with pagination, including only necessary columns
    const clients = await db.any(
      `SELECT name, mac_address, serial_number
       FROM sama_clients
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Fetch total number of clients for pagination metadata
    const totalClients = await db.one(
      `SELECT COUNT(*) FROM sama_clients`,
      [],
      (c) => +c.count
    );

    // Iterate over each client and fetch tracking data + total active time
    const clientsWithActiveTime = await Promise.all(
      clients.map(async (client) => {
        const trackingData = await getTrackingDataByMacAddress(
          client.mac_address
        );

        // Assuming the latest tracking data contains the most recent location and active time
        const latestTracking = trackingData[0]; // Get the latest tracking record
        const total_active_time = calculateTotalActiveTime(trackingData);

        return {
          name: client.name,
          mac_address: client.mac_address,
          serial_number: client.serial_number,
          total_active_time,
          location: latestTracking ? latestTracking.location : null, // Set location if available
        };
      })
    );

    // Send the final response with filtered data
    res.json({
      data: clientsWithActiveTime,
      pagination: {
        total: totalClients,
        page: +page, // Current page number
        limit: +limit, // Number of items per page
        totalPages: Math.ceil(totalClients / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching clients:", err.message);
    res.status(500).json({ message: "Failed to fetch clients" });
  }
});

app.get("/client", async (req, res) => {
  const { mac_address, serial_number } = req.query;

  // Ensure at least one parameter is provided
  if (!mac_address && !serial_number) {
    return res
      .status(400)
      .json({ message: "Either mac_address or serial_number is required" });
  }

  try {
    // Build dynamic query based on available parameters
    const queryConditions = [];
    const queryParams = [];

    if (mac_address) {
      queryConditions.push("mac_address = $1");
      queryParams.push(mac_address);
    }
    if (serial_number) {
      queryConditions.push(`serial_number = $${queryParams.length + 1}`);
      queryParams.push(serial_number);
    }

    const client = await db.oneOrNone(
      `SELECT name, mac_address, software_status, wallpaper_status, last_sync, 
              installed_softwares, serial_number, created_at
       FROM sama_clients
       WHERE ${queryConditions.join(" AND ")}`,
      queryParams
    );

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Fetch tracking data from sama_system_tracking table
    const trackingData = await db.any(
      `SELECT *
       FROM sama_system_tracking
       WHERE mac_address = $1
       ORDER BY created_at DESC`,
      [client.mac_address] // Always use the `mac_address` from the found client
    );

    // Calculate total active time
    const total_active_time = calculateTotalActiveTime(trackingData);

    // Prepare final response
    res.json({
      client_detail: {
        name: client.name,
        mac_address: client.mac_address,
        software_status: client.software_status,
        wallpaper_status: client.wallpaper_status,
        last_sync: client.last_sync,
        installed_softwares: client.installed_softwares,
        serial_number: client.serial_number,
        created_at: client.created_at,
      },
      trackingData,
      total_active_time,
    });
  } catch (err) {
    console.error("Error fetching client data:", err.message);
    res.status(500).json({ message: "Failed to fetch client data" });
  }
});

// API to fetch tracking data by mac_address
app.get("/tracking/:mac_address", async (req, res) => {
  const { mac_address } = req.params;

  try {
    // Call the function to fetch tracking data
    const trackingData = await getTrackingDataByMacAddress(mac_address);

    if (trackingData.length === 0) {
      return res
        .status(404)
        .json({ message: "No tracking data found for this client" });
    }

    // Send the result back to the client
    res.json({
      message: "Tracking data retrieved successfully",
      data: trackingData,
    });
  } catch (err) {
    console.error("Error fetching tracking data:", err.message);
    res.status(500).json({ message: "Failed to fetch tracking data" });
  }
});

// Get last_sync for a specific client using mac_address
app.get("/clients/:mac_address/last-sync", async (req, res) => {
  const { mac_address } = req.params;

  try {
    // Select only necessary fields (e.g., last_sync)
    const client = await db.oneOrNone(
      `SELECT last_sync
       FROM sama_clients 
       WHERE TRIM(mac_address) ILIKE TRIM($1)
       LIMIT 1`,
      [mac_address]
    );

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({
      message: "Last sync data retrieved successfully",
      last_sync: client.last_sync,
    });
  } catch (err) {
    console.error("Error fetching client last sync data:", err.message);
    res.status(500).json({ message: "Failed to fetch last sync data" });
  }
});

//systems traking API
app.post("/database-sync", async (req, res) => {
  const { data: rows } = req.body;

  if (!rows?.length) {
    return res.status(400).json({ message: "No data provided" });
  }

  try {
    for (const {
      mac_address,
      active_time,
      date,
      location,
      username,
      softwareStatus,
      wallpaperStatus,
    } of rows) {
      // Validate mac_address, active_time, and date (ensure they are provided)
      if (!mac_address || !active_time || !date) {
        return res
          .status(400)
          .json({
            message: "Missing required fields (mac_address, active_time, date)",
          });
      }

      // Check if the record exists in the sama_clients table
      const existingClient = await db.oneOrNone(
        `SELECT 1 FROM sama_clients WHERE mac_address = $1`,
        [mac_address]
      );

      if (existingClient) {
        // If the record exists, update the client information
        await db.none(
          `
          UPDATE sama_clients
          SET 
            last_sync = NOW(),
            name = COALESCE($1, name), 
            software_status = COALESCE($2, software_status),
            wallpaper_status = COALESCE($3, wallpaper_status)
          WHERE mac_address = $4
          `,
          [
            username || null, // If no username is provided, set it to null
            softwareStatus || null, // If no softwareStatus is provided, set it to null
            wallpaperStatus || null, // If no wallpaperStatus is provided, set it to null
            mac_address,
          ]
        );
      } else {
        // If the record does not exist, insert a new client record
        await db.none(
          `
          INSERT INTO sama_clients (mac_address, name, last_sync, software_status, wallpaper_status)
          VALUES ($1, $2, NOW(), $3, $4)
          `,
          [
            mac_address,
            username || null, // If no username is provided, set it to null
            softwareStatus || null, // If no softwareStatus is provided, set it to null
            wallpaperStatus || null, // If no wallpaperStatus is provided, set it to null
          ]
        );
      }

      // Check if there's an existing tracking record for this mac_address and date
      const existingRow = await db.oneOrNone(
        `SELECT active_time FROM sama_system_tracking WHERE mac_address = $1 AND "date" = $2`,
        [mac_address, date]
      );

      if (existingRow) {
        // If tracking record exists, update it
        await db.tx(async (t) => {
          await t.none(
            `UPDATE sama_system_tracking SET active_time = $1, location = $2 WHERE mac_address = $3 AND "date" = $4`,
            [active_time, location, mac_address, date]
          );
          // Ensure client last_sync is also updated
          await t.none(
            `UPDATE sama_clients SET last_sync = NOW() WHERE mac_address = $1`,
            [mac_address]
          );
        });
      } else {
        // If no tracking record exists, insert a new record
        await db.none(
          `INSERT INTO sama_system_tracking (mac_address, active_time, "date", location) 
          VALUES ($1, $2, $3, $4)`,
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

//Upload image route for a single image
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    // Check if the file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Extract the channelName from the request body
    const { channelName } = req.body;

    if (!channelName) {
      return res.status(400).json({ message: "Channel name is required." });
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

    // Check if the provided channel exists and has a commands array
    if (
      channelData[channelName] &&
      Array.isArray(channelData[channelName].commands)
    ) {
      // Find the index of the existing gsettings command
      const existingCommandIndex = channelData[channelName].commands.findIndex(
        (command) => command.startsWith(wallpaperCommandPrefix)
      );

      if (existingCommandIndex !== -1) {
        // Update the existing gsettings command with the new URL
        channelData[channelName].commands[existingCommandIndex] =
          wallpaperCommand;
      } else {
        // If not found, push the new wallpaper command
        channelData[channelName].commands.push(wallpaperCommand);
      }
    } else {
      console.error(`Channel "${channelName}" or commands array not found`);
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

// Endpoint to check for alerts if a client hasn't synced in 3 days
app.get("/clients/alerts", async (req, res) => {
  try {
    // Date calculations
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const formattedSevenDaysAgo = sevenDaysAgo
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const formattedFifteenDaysAgo = fifteenDaysAgo
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const formattedThirtyDaysAgo = thirtyDaysAgo
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");

    // Queries for different sync time ranges
    const query7Days = `
      SELECT id, name, mac_address, last_sync 
      FROM sama_clients 
      WHERE last_sync < $1 AND last_sync >= $2
    `;
    const query15Days = `
      SELECT id, name, mac_address, last_sync 
      FROM sama_clients 
      WHERE last_sync < $1 AND last_sync >= $2
    `;
    const query30Days = `
      SELECT id, name, mac_address, last_sync 
      FROM sama_clients 
      WHERE last_sync < $1
    `;

    // Execute queries
    const notSyncedIn7Days = await db.any(query7Days, [
      formattedSevenDaysAgo,
      formattedFifteenDaysAgo,
    ]);
    const notSyncedIn15Days = await db.any(query15Days, [
      formattedFifteenDaysAgo,
      formattedThirtyDaysAgo,
    ]);
    const notSyncedIn30Days = await db.any(query30Days, [
      formattedThirtyDaysAgo,
    ]);

    // Structure alerts for the response
    const alerts = {
      notSyncedIn7Days: notSyncedIn7Days.map((row) => ({
        clientId: row.id,
        clientName: row.name,
        macAddress: row.mac_address,
        lastSynced: row.last_sync,
      })),
      notSyncedIn15Days: notSyncedIn15Days.map((row) => ({
        clientId: row.id,
        clientName: row.name,
        macAddress: row.mac_address,
        lastSynced: row.last_sync,
      })),
      notSyncedIn30Days: notSyncedIn30Days.map((row) => ({
        clientId: row.id,
        clientName: row.name,
        macAddress: row.mac_address,
        lastSynced: row.last_sync,
      })),
    };

    res.json({
      message: "Alert checks completed.",
      alerts: alerts,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to check for alerts." });
  }
});

//Alerts cron job for 30 days
// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send an email if there are clients not synced in over 30 days
async function sendEmailAlert(notSyncedIn30Days) {
  if (notSyncedIn30Days.length === 0) return; // Skip if no unsynced clients

  const emailContent = notSyncedIn30Days
    .map(
      (row) =>
        `- ID: ${row.id}, Name: ${row.name}, MAC: ${row.mac_address}, Last Synced: ${row.last_sync}, Serial Number: ${row.serial_number}`
    )
    .join("\n");

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: "Clients Not Synced in Over 30 Days",
    text: `The following clients have not synced in over 30 days:\n\n${emailContent}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Alert email sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Query clients who haven't synced in over 30 days
const query30Days = `
  SELECT id, name, mac_address, last_sync, serial_number 
  FROM sama_clients 
  WHERE last_sync < $1
`;

// Schedule the email alert for every day at 11:50 PM
cron.schedule("50 23 * * *", async () => {
  // cron.schedule("*/2 * * * *", async () => {
  console.log("Running daily email alert check...");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const formattedThirtyDaysAgo = thirtyDaysAgo
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");

  try {
    const notSyncedIn30Days = await db.any(query30Days, [
      formattedThirtyDaysAgo,
    ]);
    await sendEmailAlert(notSyncedIn30Days);
  } catch (error) {
    console.error("Error fetching or sending alerts:", error);
  }
});
