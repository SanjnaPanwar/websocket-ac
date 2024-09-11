import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const port = 8080;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("A new client connected!");

  ws.on("message", (message) => {
    console.log(`Received message => ${message}`);
    ws.send(`You sent => ${message}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected!");
  });
});
