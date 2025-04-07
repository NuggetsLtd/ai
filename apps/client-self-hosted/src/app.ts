import 'dotenv/config'
import express from "express";
import expressWs from 'express-ws';
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { fileURLToPath } from 'url';
import { ConverseMcpClient, Message } from './converse-mcp-client.js'
import EventEmitter from "events";
import config from './config.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const awsBedrockModelId = config.bedrock.modelId;
const awsBedrockRegion = config.bedrock.region;
const chatWelcomeMessage: Message = {
  role: "assistant",
  content: [{
    text: "Hello, how can I help you today?"
  }]
};

if(!awsBedrockModelId) {
  throw new Error("BEDROCK_MODEL_ID environment variable is not set");
}
if(!awsBedrockRegion) {
  throw new Error("BEDROCK_REGION environment variable is not set");
}

expressWs(app);

app.use(express.static(path.join(__dirname, "../public")));

io.on("connection", async (socket: Socket) => {
  console.log("A user connected");
  const eventEmitter = new EventEmitter();
  const client = new ConverseMcpClient(awsBedrockModelId, awsBedrockRegion, eventEmitter)
  await client.connectToMcpServer('../../node_modules/@nuggetslife/mcp-server/dist/index.js')

  io.emit("chat message", chatWelcomeMessage);

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("chat message", (msg: string) => {
    console.log("message: " + msg);
    io.emit("chat message", msg);
    
    // send message to mcp server
    client.sendMessage(msg)
  });

  eventEmitter.on("message", (message: string) => {
    console.log("Message from MCP server: ", message);
    io.emit("chat message", message);
  })
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

app.get("/communicator/callback", (req, res) => {

})

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
