import OpenAI from "openai";
import type { ResponseInputItem, Tool, EasyInputMessage } from "openai/resources/responses/responses.mjs";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ConverseMcpBaseClient } from "./base.js";
import EventEmitter from "events";

export class ConverseMcpOpenAiClient extends ConverseMcpBaseClient {
  private client: OpenAI
  private conversation: ResponseInputItem[] = []
  private tools: Tool[] = []

  constructor(modelId: string, eventEmitter: EventEmitter) {
    super(modelId, eventEmitter)
    this.client = new OpenAI()
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
              const openaiTool: Tool = {
                  parameters: tool.inputSchema,
                  name: tool.name,
                  description: tool.description,
                  strict: true,
                  type: 'function'
              }
              return openaiTool;
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
    const input: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
        model: this.modelId,
        max_output_tokens: 1024,
        input: this.conversation
    }
    if (this.tools.length > 0) {
        input.tools = this.tools
    }
    const response: OpenAI.Responses.Response = await this.client.responses.create(
        input
    );
    console.log('OpenAI Response', response, response.output[0])

    const toolUse = response.output.find(contentBlock => contentBlock.type === 'function_call')

    if (response.status === 'completed' && toolUse) {
      for (var contentBlock of response.output) {
        switch (contentBlock.type) {
          case 'message':
            this.conversation.push({
              role: "assistant",
              content: contentBlock.content,
              id: contentBlock.id,
              status: contentBlock.status,
              type: contentBlock.type,
            })
            break;
          case 'function_call':
            const toolName = contentBlock.name
            const response = await this.mcp.callTool({
                name: toolName,
                arguments: JSON.parse(contentBlock.arguments)
            })
            const toolReponse = response.content

            this._handleToolResponse(toolName, response)

            this.conversation.push({
              call_id: contentBlock.call_id,
              type: 'function_call',
              name: contentBlock.name,
              arguments: contentBlock.arguments,
            },{
              call_id: contentBlock.call_id,
              type: 'function_call_output',
              output: JSON.stringify(toolReponse)
          })
            await this.converse()
            break;
        }
      }
    } else {
      this.conversation.push( {
        id: response.output[0]?.id as string,
        role: 'assistant',
        status: 'completed',
        type: 'message',
        content: [{
          text: response.output_text,
          type: 'output_text',
          annotations: []
        }],
      })

      this.eventEmitter.emit("message", {
        role: 'assistant',
        content: [{
          text: response.output_text,
          type: 'input_text'
        }]
      })
    }
  }

  async sendMessage(message: string): Promise<boolean> {
      const question: ResponseInputItem = {
          role: "user",
          type: 'message',
          content: [{
            text: message,
            type: 'input_text'
          }],
      }
      this.conversation.push(question)
      await this.converse()

      return true
  }
}

export default ConverseMcpOpenAiClient
