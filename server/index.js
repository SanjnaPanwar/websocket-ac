import express from "express";
import { WebSocketServer } from "ws";

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
  console.log("Server is running on port 8080");
});

// Create a WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[Server] A client connected.");

  ws.send(executeCommand(command));

  // Handle the result returned from the client
  ws.on("message", (message) => {
    console.log(`[Server] Received result from client: ${message}`);
  });

  // Handle when the client disconnects
  ws.on("close", () => {
    console.log("[Server] Client disconnected.");
  });
});
