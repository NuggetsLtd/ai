import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam as AnthropicMessage, ToolUnion } from "@anthropic-ai/sdk/resources";
import { TextBlockParam } from "@anthropic-ai/sdk/resources.js";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { ConverseCommandInput, Message as BedrockMessage, Tool, ToolInputSchema } from "@aws-sdk/client-bedrock-runtime";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import EventEmitter from "events";

enum ClientType {
  AwsBedrock,
  Anthropic
}

export {
  BedrockMessage,
  AnthropicMessage,
  ClientType
}

abstract class ConverseMcpBaseClient {
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

export class ConverseMcpAnthropicClient extends ConverseMcpBaseClient {
  private client: Anthropic
  private conversation: AnthropicMessage[] = []
  private tools: ToolUnion[] = []

  constructor(modelId: string, eventEmitter: EventEmitter) {
    super(modelId, eventEmitter)
    this.client = new Anthropic() // defaults to process.env["ANTHROPIC_API_KEY"]
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
              const anthropicTool: ToolUnion = {
                  input_schema: tool.inputSchema,
                  name: tool.name,
                  description: tool.description
              }
              return anthropicTool;
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
    const input: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model: this.modelId,
        max_tokens: 1024,
        messages: this.conversation
    }
    if (this.tools.length > 0) {
        input.tools = this.tools
    }
    const response: Anthropic.Messages.Message = await this.client.messages.create(
        input,
    );
    
    if (response.stop_reason === 'tool_use') {
      if (response.content) {
            for (var contentBlock of response.content) {
                switch (contentBlock.type) {
                  case 'text':
                    this.conversation.push({
                      role: "assistant",
                      content: contentBlock.text
                    })
                    break;
                  case 'tool_use':
                    const toolName = contentBlock.name
                    const toolArguments = JSON.parse(JSON.stringify(contentBlock.input))
                    const response = await this.mcp.callTool({
                        name: toolName,
                        arguments: toolArguments
                    })
                    const toolReponse = response.content as TextBlockParam[]

                    this._handleToolResponse(toolName, response)

                    this.conversation.push({
                      role: 'assistant',
                      content: [
                        {
                          id: contentBlock.id,
                          type: 'tool_use',
                          name: contentBlock.name,
                          input: contentBlock.input
                        }
                      ]
                    }, {
                      role: "user",
                      content: [
                        {
                          tool_use_id: contentBlock.id,
                          type: 'tool_result',
                          content: JSON.stringify(toolReponse)
                        }
                      ]
                  })
                    await this.converse()
                    break;
                }
            }
    
        }
    } else if (response.stop_reason === 'end_turn') {
        this.conversation.push({
          role: 'assistant',
          content: response.content
        })

        this.eventEmitter.emit("message", response)
    }
  }

  async sendMessage(message: string): Promise<boolean> {
      const question: AnthropicMessage = {
          role: "user",
          content: [{
            type: 'text',
            text: message
          }],
      }
      this.conversation.push(question)
      await this.converse()

      return true
  }
}

export default {
  ConverseMcpAnthropicClient,
  ConverseMcpBedrockClient
}
