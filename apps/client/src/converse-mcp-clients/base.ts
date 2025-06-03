import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import EventEmitter from "events";

export abstract class ConverseMcpBaseClient {
  protected mcp: Client // from "@modelcontextprotocol/sdk/client/index.js"
  protected transport: StdioClientTransport | null = null; // from "@modelcontextprotocol/sdk/client/stdio.js"
  public modelId: string
  public eventEmitter: EventEmitter

  constructor(modelId: string, eventEmitter: EventEmitter) {
      this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" })
      this.modelId = modelId
      this.eventEmitter = eventEmitter
  }

  abstract connectToMcpServer(serverScriptPath: string): unknown
  abstract converse(): Promise<void>;
  abstract sendMessage(msg: string): Promise<boolean>;
}
