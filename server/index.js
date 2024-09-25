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

import { executeCommand } from "./controller/middleware.cjs";
// import { accountManagement } from "./routes/account_managment.js";
// import { packageInstaller } from "./routes/software_installation.js";
// import { wallpaper } from "./routes/wallpaper.js";
// import { shortcut } from "./routes/shortcuts.js";

const packageInstaller = require("./routes/software_installation.js");

const app = express();
app.use(express.json());

// All routes
app.get("/", (req, res) => {
  res.send("Server is running.");
});
// app.use("/account", accountManagement);
app.use("/installed/packages", packageInstaller);
// app.use("/wallpaper", wallpaper);
// app.use("/shortcut", shortcut);

const server = app.listen(8080, () => {
  console.log("Server running on port 8080 and database connected.");
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS

// WebSocket connection setup
wss.on("connection", (ws) => {
  console.log("[Server] Client connected via WebSocket.");

  const command = "install openbox"; // Example command
  ws.send(command);
  console.log(`[Server] Command sent to client: ${command}`);

  ws.on("message", (message) => {
    console.log(`[Server] Received from client: ${message}`);
  });

  ws.on("close", () => {
    console.log("[Server] Client disconnected.");
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send({ message: "Server is live." });
});

// Helper function to install packages
const installPackages = async () => {
  const packageCommands = [
    { manager: "apt", command: "sudo apt-get install python3-pip npm sqlite3 openssl rsync -y" },
    { manager: "pip", command: "pip install --upgrade pip" },
    { manager: "npm", command: "npm install -g npm" },
  ];

  let installedPackages = [];
  
  for (const { manager, command } of packageCommands) {
    try {
      console.log(`Running: ${command}`);
      installedPackages.push({ manager, command });
    } catch (error) {
      console.error(`[Helper] Failed to install ${manager}, skipping...`);
    }
  }

  if (!installedPackages.length) {
    throw new Error("Failed to install packages using all managers.");
  }

  return installedPackages;
};

// API to pre-install packages
app.post("/pre-install-packages", async (req, res) => {
  try {
    const installedPackages = await installPackages();

    // Notify WebSocket clients
    installedPackages.forEach((pkg) => {
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(pkg.command);
        }
      });
    });

    res.status(200).send({ message: "Packages installed successfully.", installedPackages });
  } catch (error) {
    res.status(500).send({ message: "Failed to install packages.", error: error.message });
  }
});

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
    const errorMessage = error.code === "23505"
      ? "Client with the same name already exists."
      : "Error creating client.";
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
    res.status(200).send({ message: "Software status updated successfully.", client: updatedClient });
  } catch (error) {
    console.error("[API] Error updating software status:", error);
    res.status(500).send({ message: "Error updating software status.", error: error.message });
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
    res.status(200).send({ message: "Wallpaper status updated successfully.", client: updatedClient });
  } catch (error) {
    console.error("[API] Error updating wallpaper status:", error);
    res.status(500).send({ message: "Error updating wallpaper status.", error: error.message });
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
        const updatedTime = parseInt(existingRow.active_time, 10) + parseInt(active_time, 10);
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
