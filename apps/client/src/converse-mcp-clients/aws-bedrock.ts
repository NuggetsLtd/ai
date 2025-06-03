import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { ConverseCommandInput, Message as BedrockMessage, Tool, ToolInputSchema } from "@aws-sdk/client-bedrock-runtime";
import EventEmitter from "events";
import { ConverseMcpBaseClient } from "./base.js";

export class ConverseMcpBedrockClient extends ConverseMcpBaseClient {
  private client: BedrockRuntimeClient
  private conversation: BedrockMessage[] = []
  private tools: Tool[] = []

  constructor(modelId: string, region: string, eventEmitter: EventEmitter) {
    super(modelId, eventEmitter)
    this.client = new BedrockRuntimeClient({ region })
  }

  async connectToMcpServer(serverScriptPath: string) {
      try {
          const command = process.execPath;

          // Initialize transport and connect to server
          this.transport = new StdioClientTransport({
              command,
              args: [serverScriptPath],
          });
          this.mcp.connect(this.transport);

          // List available tools
          const toolsResult = await this.mcp.listTools();

          this.tools = toolsResult.tools.map((tool) => {
              const toolInputSchema: ToolInputSchema = {
                  json: JSON.parse(JSON.stringify(tool.inputSchema))
              }
              const bedrockTool: Tool = {
                  toolSpec: {
                      inputSchema: toolInputSchema,
                      name: tool.name,
                      description: tool.description
                  }
              }
              return bedrockTool;
          });
      }
      catch (e) {
          console.log("Failed to connect to MCP server: ", e);
          throw e;
      }
  }

  private _handleToolResponse(toolName: string, response: any) {
    if(!["generate-invite-qr-code", "generate-invite-oidc-link"].includes(toolName) || !response) {
      return
    }
    
    this.eventEmitter.emit("message", response)
  }

  async converse() {
    const input: ConverseCommandInput = {
        modelId: this.modelId,
        messages: this.conversation
    }
    if (this.tools.length > 0) {
        input.toolConfig = {
            tools: this.tools
        }
    }
    const response = await this.client.send(
        new ConverseCommand(input),
    );
    
    if (response.stopReason === 'tool_use') {
      if (response.output?.message?.content) {
            const message = response.output.message
            this.conversation.push(message)
            const content = response.output?.message?.content

            for (var contentBlock of content) {
                if (contentBlock.toolUse?.name) {
                    const toolName = contentBlock.toolUse.name
                    const toolArguments = JSON.parse(JSON.stringify(contentBlock.toolUse.input))
                    const response = await this.mcp.callTool({
                        name: toolName,
                        arguments: toolArguments
                    })

                    this._handleToolResponse(toolName, response)

                    const message: BedrockMessage = {
                        role: "user",
                        content: [{
                            toolResult: {
                                toolUseId: contentBlock.toolUse.toolUseId,
                                content: [{
                                    text: JSON.stringify(response)
                                }]
                            }
                        }]
                    }
                    this.conversation.push(message)
                    await this.converse()
                }
            }
    
        }
    }
    else if (response.output?.message) {
        const message = response.output.message
        this.conversation.push(message)
        this.eventEmitter.emit("message", message)
    }
  }

  async sendMessage(message: string): Promise<boolean> {
      const question: BedrockMessage = {
          role: "user",
          content: [{ text: message }],
      }
      this.conversation.push(question)
      await this.converse()

      return true
  }
}

export default ConverseMcpBedrockClient
