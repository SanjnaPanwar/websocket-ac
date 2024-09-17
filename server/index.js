import express from "express";
import { WebSocketServer } from "ws";
import pgPromise from "pg-promise";
import cors from "cors";
import dotenv from "dotenv";

// Setup multer for file uploads
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
console.log("Database connected");

// Create an Express server
const app = express();

const server = app.listen(8080, () => {
  console.log("Express server is running on port 8080");
});

// Create a WebSocket server
const wss = new WebSocketServer({ server });

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors()); // If needed for cross-origin requests

// WebSocket connection setup
wss.on("connection", (ws) => {
  console.log("[Server] A client connected via WebSocket.");

  ws.on("message", (message) => {
    console.log(`[Server] Received from client: ${message}`);
  });

  ws.on("close", () => {
    console.log("[Server] Client disconnected.");
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send({ message: "Server is running." });
});

// Helper functions to install packages
const installPackages = async () => {
  const managers = ["apt", "pip", "npm"];
  let installedPackages = [];

  for (let manager of managers) {
    let command;
    try {
      if (manager === "apt") {
        command = `sudo apt-get install python3-pip npm sqlite3 openssl rsync -y`;
        installedPackages.push({ manager, command });
      } else if (manager === "pip") {
        command = `pip install --upgrade pip`;
        installedPackages.push({ manager, command });
      } else if (manager === "npm") {
        command = `npm install -g npm`;
        installedPackages.push({ manager, command });
      }
      console.log(`Running: ${command}`);
    } catch (error) {
      console.error(
        `[Helper] Failed to install ${manager}. Skipping to next manager...`
      );
    }
  }

  if (installedPackages.length === 0) {
    throw new Error(`Failed to install using all package managers.`);
  }

  return installedPackages;
};

// API to pre-install packages
app.post("/pre-install-packages", async (req, res) => {
  try {
    const installedPackages = await installPackages();

    installedPackages.forEach((pkg) => {
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(pkg.command); // Send the install command to WebSocket client
        }
      });
    });

    if (installedPackages.length > 0) {
      res.status(200).send({
        message: "Packages installed successfully.",
        installedPackages,
      });
    } else {
      res.status(400).send({
        message: "No packages were installed.",
      });
    }
  } catch (error) {
    res.status(500).send({
      message: "Failed to install packages.",
      error: error.message,
    });
  }
});

// API to fetch all clients
app.get("/clients", async (req, res) => {
  try {
    const clients = await db.any("SELECT * FROM clients LIMIT 10");
    res.status(200).send({
      message: "Clients fetched successfully.",
      clients,
    });
  } catch (error) {
    console.error("[API] Error fetching clients:", error);
    res
      .status(500)
      .send({ message: "Error fetching clients", error: error.message });
  }
});

// API to create a new client
app.post("/client/create", async (req, res) => {
  try {
    const { name, mac_address } = req.body;
    const newClient = await db.one(
      "INSERT INTO clients(name, mac_address) VALUES($1, $2) RETURNING *",
      [name, mac_address]
    );
    res.status(200).send({
      message: "Client created successfully.",
      client: newClient,
    });
  } catch (error) {
    console.error("[API] Error creating client:", error);
    if (error.code === "23505") {
      res.status(400).send({
        message: "Client with the same name already exists.",
        error: error.message,
      });
    } else {
      res.status(500).send({
        message: "Error creating client.",
        error: error.message,
      });
    }
  }
});

// API to update software status
app.put("/client/update/software-status", async (req, res) => {
  try {
    const { mac_address } = req.body;
    
    // Ensure the mac_address is provided
    if (!mac_address) {
      return res.status(400).send({
        message: "mac_address is required.",
      });
    }

    // Update the software_installed status to true
    const updatedClient = await db.one(
      "UPDATE clients SET software_installed = true WHERE mac_address = $1 RETURNING *",
      [mac_address]
    );

    res.status(200).send({
      message: "Software status updated successfully.",
      client: updatedClient,
    });
  } catch (error) {
    console.error("[API] Error updating software status:", error);
    
    // Handle database error codes
    if (error.code === "23505") {
      res.status(400).send({
        message: "Client with the same mac_address already exists.",
        error: error.message,
      });
    } else {
      res.status(500).send({
        message: "Error updating software status.",
        error: error.message,
      });
    }
  }
});

// API to update wallpaper status
app.put("/client/update/wallpaper-status", async (req, res) => {
  try {
    const { mac_address } = req.body;
    
    // Ensure the mac_address is provided
    if (!mac_address) {
      return res.status(400).send({
        message: "mac_address is required.",
      });
    }

    // Update the software_installed status to true
    const updatedClient = await db.one(
      "UPDATE clients SET wallpaper_changed = true WHERE mac_address = $1 RETURNING *",
      [mac_address]
    );

    res.status(200).send({
      message: "Software status updated successfully.",
      client: updatedClient,
    });
  } catch (error) {
    console.error("[API] Error updating software status:", error);
    
    // Handle database error codes
    if (error.code === "23505") {
      res.status(400).send({
        message: "Client with the same mac_address already exists.",
        error: error.message,
      });
    } else {
      res.status(500).send({
        message: "Error updating software status.",
        error: error.message,
      });
    }
  }
});

// API to install software and send command via WebSocket
app.post("/install-software", (req, res) => {
  const { software_name } = req.body;

  // Validate the software name input
  if (!software_name) {
    return res.status(400).send({
      message: "Please provide a valid software name.",
    });
  }

  // Define the installation command
  const command = `sudo apt-get install -y ${software_name}`;

  // Send the command to all connected WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(command));
    }
  });
});

// Endpoint to handle database sync via JSON data
app.post('/database-sync', async (req, res) => {
  const rows = req.body.data;
console.log(rows,"rows");

  if (!rows || rows.length === 0) {
    return res.status(400).json({ message: 'No data provided' });
  }

  try {
    // Loop through the data rows and insert/update the PostgreSQL database
    for (const row of rows) {
      const { mac_address, active_time, date, location } = row;

      // Check if the MAC address and date exist in the server database
      const existingRow = await db.oneOrNone(
        `SELECT * FROM system_tracking WHERE mac_address = $1 AND "date" = $2`,
        [mac_address, date]
      );

      if (existingRow) {
        // Update the active_time if the record exists
        const updatedTime = parseInt(existingRow.active_time, 10) + parseInt(active_time, 10);
        await db.none(
          `UPDATE system_tracking 
           SET active_time = $1, location = $2 
           WHERE mac_address = $3 AND "date" = $4`,
          [updatedTime.toString(), location, mac_address, date]
        );
      } else {
        // Insert a new row if the record does not exist
        await db.none(
          `INSERT INTO system_tracking (mac_address, active_time, "date", location) 
           VALUES ($1, $2, $3, $4)`,
          [mac_address, active_time, date, location]
        );
      }
    }

    res.json({ message: 'Database synchronized successfully' });
  } catch (err) {
    console.error('Error syncing database:', err.message);
    res.status(500).json({ message: 'Failed to synchronize database' });
  }
});
