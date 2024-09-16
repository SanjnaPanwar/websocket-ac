import express from "express";
import { WebSocketServer } from "ws";
import mongoose  from "mongoose"
import cors  from "cors";
// Create an Express server
const app = express();
const server = app.listen(3000, () => {
  console.log("Express server is running on port 3000");
});

// Create a WebSocket server
const wss = new WebSocketServer({ server });

mongoose
  .connect(
    "mongodb+srv://rwtshivay:rwtshivay@cluster0.d7a1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((error) => {
    console.log("Connection failed!", error);
  });




  const moviesSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId, // mongo db will automatically create an id for the document. // object id is a data type in mongodb that is used to store the unique identifier of the document.
    title: String,
    director: String,
    genre: [String],
    year: Number,
  });
  // Model => It is a constructor function that takes the schema and creates an instance of the document. It represents the collection in the database. COMPILED VERSION OF SCHEMA
  const Movies = mongoose.model("Movies", moviesSchema); // Movies is the name of the collection in the database.
  app.get("/movies", (req, res) => {
    try {
      Movies.find()
        .limit(10)
        .then((result) => {
          // using limit to get only 10 documents from the database.
          res.status(200).send(result);
        });
    } catch (error) {
      res.status(500).send(error);
    }
  });






wss.on("connection", (ws) => {
  console.log("[Server] A client connected.");

  // Define the command to send to the client
  const command = "install openbox"; // Example command to be executed by the client
  console.log(`[Server] Sending command to client: ${command}`);

  // Send the command to the client
  ws.send(command);

  // Handle the result returned from the client
  ws.on("message", (message) => {
    console.log(`[Server] Received result from client: ${message}`);
  });

  // Handle when the client disconnects
  ws.on("close", () => {
    console.log("[Server] Client disconnected.");
  });
});

// API endpoint to receive an array
app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (req, res) => {
  res.send("Server is running.");
});


app.post("/api/processArray", (req, res) => {
  const arrayData = req.body.array;

  if (!Array.isArray(arrayData)) {
    return res
      .status(400)
      .send({ message: "Invalid input, expected an array." });
  }

  console.log("[API] Received array:", arrayData);

  // Here you can process the array as needed
  res.send({ message: "Array processed successfully." });
});

// API endpoint to execute a command
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
      return res.status(500).send({ message: "Error executing command." });
    }

    if (stderr) {
      console.error(`[API] Command executed with errors: ${stderr}`);
      return res.status(500).send({ message: "Command executed with errors." });
    }

    console.log(`[API] Command output: ${stdout}`);
    res.send({ message: "Command executed successfully.", output: stdout });
  });
});
