import WebSocket from "ws";
import { exec } from "child_process";

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
  console.log("Connected to WebSocket server");
});

ws.on("message", (data) => {
  const message = JSON.parse(data);

  if (message.command === "install_wallpaper") {
    // Example command to set wallpaper (depends on OS and tools)
    const wallpaperPath = message.args;
    exec(`gsettings set org.gnome.desktop.background picture-uri file://${wallpaperPath}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error setting wallpaper: ${stderr}`);
      } else {
        console.log(`Wallpaper updated: ${stdout}`);
      }
    });
  } else {
    console.log(`Received message => ${data}`);
  }
});

ws.on("close", () => {
  console.log("Disconnected from WebSocket server");
});
