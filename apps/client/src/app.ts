import 'dotenv/config'
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { fileURLToPath } from 'url';
import { ConverseMcpBedrockClient, ConverseMcpAnthropicClient, BedrockMessage, AnthropicMessage, ClientType } from './converse-mcp-client.js'
import EventEmitter from "events";
import config from './config.js'
import { Notification } from './types.js'
import { oidcCallbackHandler } from './oidc-callback-handler.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const awsBedrockModelId = config.bedrock.modelId;
const awsBedrockRegion = config.bedrock.region;
const anthropicApiKey = config.anthropic.apiKey;
const anthropicModelId = config.anthropic.modelId;
const callbackToken = config.communicator.callbackToken;
const chatWelcomeMessage: BedrockMessage = {
  role: "assistant",
  content: [{
    text: "Hello, how can I help you today?"
  }]
};
let clientType: ClientType
let modelId: string

switch (config.clientType) {
  case 'anthropic':
    clientType = ClientType.Anthropic
    if(!anthropicModelId) {
      throw new Error("ANTHROPIC_MODEL_ID environment variable NOT set");
    }
    if(anthropicModelId.startsWith('arn:aws:bedrock:')) {
      throw new Error('AWS Bedrock model id should start with "arn:aws:bedrock:"')
    }

    modelId = anthropicModelId
    break;
  case 'bedrock':
      clientType = ClientType.AwsBedrock
      if(!awsBedrockModelId) {
        throw new Error("BEDROCK_MODEL_ID environment variable NOT set");
      }
      modelId = awsBedrockModelId
    break;
  default:
    throw new Error("CLIENT_TYPE environment variable NOT set or unsupported");
}

// check env vars are set for AWS Bedrock
if (clientType === ClientType.AwsBedrock) {
  if(!awsBedrockRegion) {
    throw new Error("BEDROCK_REGION environment variable NOT set");
  }
}

// check env vars are set for Anthropic
if (clientType === ClientType.Anthropic) {
  if(!anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable NOT set");
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

const notificationEventEmitter = new EventEmitter();


io.on("connection", async (socket: Socket) => {
  console.log("A user connected");
  const mcpServerEventEmitter = new EventEmitter();
  let mcpClient: ConverseMcpBedrockClient | ConverseMcpAnthropicClient
  
  switch (clientType) {
    case ClientType.Anthropic:
      mcpClient = new ConverseMcpAnthropicClient(modelId, mcpServerEventEmitter)
      break;
    case ClientType.AwsBedrock:
      mcpClient = new ConverseMcpBedrockClient(modelId, awsBedrockRegion as string, mcpServerEventEmitter)
      break;
  }

  mcpClient.connectToMcpServer('../../node_modules/@nuggetslife/mcp-server/dist/index.js')
    .then(() => {
      console.log("Connected to MCP server");
    })
    .catch((error) => {
      console.error("Failed to connect to MCP server: ", error);
    });

  io.emit("chat message", chatWelcomeMessage);

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("chat message", (msg: string) => {
    io.emit("chat message", msg);
    
    // send message to mcp server
    mcpClient.sendMessage(msg)
  });

  mcpServerEventEmitter.on("message", (message: any) => {
    io.emit("chat message", message);
    
    const ref = message?.content[0]?.ref

    if(!ref) return

    notificationEventEmitter.on(ref, (notification: Notification) => {
      io.emit("chat notification", notification);

      if (notification.status === "COMPLETED") {
        // update mcp server with the outcome
        mcpClient.sendMessage(sendOutcomeToMcpClient(notification.outcome));
      }
    })
  })
});

const sendOutcomeToMcpClient = (outcome: any) => {
  let outcomeMsg = "I have completed the verification process, and ";

  outcome.verified
    ? outcomeMsg += "verified "
    : outcomeMsg += "failed to verify ";
  
  switch (outcome.proof.type) {
    case "over18":
      outcomeMsg += "that I am over 18 years old";
      break;
    case "Twitter":
      outcomeMsg += `my Twitter account${outcome.verified ? ` username is ${outcome.proof.username}` : ""}`;
      break;
    default:
      outcomeMsg += `the identity element`;
  }

  return outcomeMsg;
}

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

app.get("/oidc/callback", async (req, res) => {
  // handle OIDC callback
  const notification: Notification = await oidcCallbackHandler(req, res)

  // emit notification event
  notificationEventEmitter.emit(notification?.ref, notification)
})

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
