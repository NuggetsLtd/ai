import 'dotenv/config'
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { fileURLToPath } from 'url';
import { ConverseMcpClient, Message } from './converse-mcp-client.js'
import EventEmitter from "events";
import config from './config.js'

type Notification = {
  ref: string;
  status: string;
  outcome?: {
    verified: boolean;
    proof: {
      type: string;
      over18: boolean;
    };
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const awsBedrockModelId = config.bedrock.modelId;
const awsBedrockRegion = config.bedrock.region;
const callbackToken = config.communicator.callbackToken;
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

const notificationEventEmitter = new EventEmitter();

io.on("connection", async (socket: Socket) => {
  console.log("A user connected");
  const mcpServerEventEmitter = new EventEmitter();
  const client = new ConverseMcpClient(awsBedrockModelId, awsBedrockRegion, mcpServerEventEmitter)
  await client.connectToMcpServer('../../node_modules/@nuggetslife/mcp-server/dist/index.js')

  io.emit("chat message", chatWelcomeMessage);

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("chat message", (msg: string) => {
    io.emit("chat message", msg);
    
    // send message to mcp server
    client.sendMessage(msg)
  });

  mcpServerEventEmitter.on("message", (message: any) => {
    io.emit("chat message", message);

    const ref = message?.content[0]?.ref

    notificationEventEmitter.on(ref, (notification: Notification) => {
      io.emit("chat notification", notification);

      if (notification.status === "COMPLETED") {
        // update mcp server with the outcome
        !!notification?.outcome?.verified
          ? client.sendMessage('I have completed the verification process, and am verified as over 18')
          : client.sendMessage('I have completed the verification process, and failed to verify I am over 18');
      }
    })
  })
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

app.post("/didcomm", (req, res) => {
  if(req.headers.authorization !== `Token token=${callbackToken}`) {
    console.log("Unauthorized request to /didcomm");
    res.sendStatus(401);
    return;
  }

  const { status, outcome, msg } = req.body;

  const notification: Notification = {
    ref: msg.thid,
    status
  }

  if(status === "COMPLETED") {
    notification.outcome = {
      verified: outcome.proof.credentialSubject.over18,
      proof: {
        type: outcome.proof.type,
        over18: outcome.proof.credentialSubject.over18,
      }
    }
  }

  // emit notification event
  notificationEventEmitter.emit(msg.thid, notification);

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
