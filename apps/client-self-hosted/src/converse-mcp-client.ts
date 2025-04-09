import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { ConverseCommandInput, Message, Tool, ToolInputSchema } from "@aws-sdk/client-bedrock-runtime";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import EventEmitter from "events";

export {
  Message
}

export class ConverseMcpClient {
    private mcp: Client // from "@modelcontextprotocol/sdk/client/index.js"
    private bedrock: BedrockRuntimeClient
    private transport: StdioClientTransport | null = null; // from "@modelcontextprotocol/sdk/client/stdio.js"
    private tools: Tool[] = []
    private modelId: string
    private conversation: Message[] = []
    private eventEmitter: EventEmitter

    constructor(modelId: string, region: string, eventEmitter: EventEmitter) {
        this.bedrock = new BedrockRuntimeClient({ region })
        this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" })
        this.modelId = modelId
        this.eventEmitter = eventEmitter
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

    _handleToolResponse(toolName: string, response: any) {
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
        const response = await this.bedrock.send(
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

                        const message: Message = {
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
        const question: Message = {
            role: "user",
            content: [{ text: message }],
        }
        this.conversation.push(question)
        await this.converse()

        return true
    }
}

export default ConverseMcpClient
