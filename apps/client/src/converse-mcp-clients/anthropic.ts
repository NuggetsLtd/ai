import Anthropic from "@anthropic-ai/sdk";
import { TextBlockParam } from "@anthropic-ai/sdk/resources";
import type { MessageParam as AnthropicMessage, ToolUnion } from "@anthropic-ai/sdk/resources";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ConverseMcpBaseClient } from "./base.js";
import EventEmitter from "events";

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

export default ConverseMcpAnthropicClient
