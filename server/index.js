import express from "express";
import { WebSocketServer } from "ws";
import pgPromise from "pg-promise";
import cors from "cors";
import { exec } from "child_process";
import dotenv from "dotenv";
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
const server = app.listen(3000, () => {
  console.log("Express server is running on port 3000");
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
app.post("/create/client", async (req, res) => {
  try {
    const { name, status, location } = req.body;
    const newClient = await db.one(
      "INSERT INTO clients(name, status, location) VALUES($1, $2, $3) RETURNING *",
      [name, status, location]
    );
    res.status(201).send({
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

// API to process an array
app.post("/api/processArray", (req, res) => {
  const arrayData = req.body.array;

  if (!Array.isArray(arrayData)) {
    return res
      .status(400)
      .send({ message: "Invalid input, expected an array." });
  }

  console.log("[API] Received array:", arrayData);
  res.send({ message: "Array processed successfully.", data: arrayData });
});

// API to execute a command
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
      return res
        .status(500)
        .send({ message: "Error executing command.", error: error.message });
    }

    if (stderr) {
      console.error(`[API] Command executed with errors: ${stderr}`);
      return res
        .status(500)
        .send({ message: "Command executed with errors.", stderr });
    }

    console.log(`[API] Command output: ${stdout}`);
    res.send({ message: "Command executed successfully.", output: stdout });
  });
});
