import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { fileURLToPath } from 'url';
import { ConverseMcpClient, Message } from './converse-mcp-client.js'
import EventEmitter from "events";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const awsBedrockModelId = 'arn:aws:bedrock:us-east-1:454245708275:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0'
const chatWelcomeMessage: Message = {
  role: "assistant",
  content: [{
    text: "Hello, how can I help you today?"
  }]
};


app.use(express.static(path.join(__dirname, "../public")));

io.on("connection", async (socket: Socket) => {
  console.log("A user connected");
  const eventEmitter = new EventEmitter();
  const client = new ConverseMcpClient(awsBedrockModelId, eventEmitter)
  await client.connectToMcpServer('../server/build/index.js')

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

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
