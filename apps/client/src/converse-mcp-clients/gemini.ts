import { GoogleGenAI, Type } from '@google/genai';
import type { GenerateContentParameters, GenerateContentResponse, Schema, ToolUnion, Content, FunctionCall } from '@google/genai';
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ConverseMcpBaseClient } from "./base.js";
import EventEmitter from "events";
import config from '../config.js'

export class ConverseMcpGeminiClient extends ConverseMcpBaseClient {
  private client: GoogleGenAI
  private conversation: Content[] = []
  private tools: ToolUnion[] = []
  private lastFunctionCallConversationId: number | null = null

  constructor(modelId: string, eventEmitter: EventEmitter) {
    super(modelId, eventEmitter)
    this.client = new GoogleGenAI({
      apiKey: config.gemini.apiKey
    })
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
              const parameters: Schema = {
                ...tool.inputSchema,
                type: 'object',
                properties: tool.inputSchema.properties
              }

              const geminiTool: ToolUnion = {
                  functionDeclarations: [{
                    name: tool.name,
                    description: tool.description,
                    parameters
                  }],
              }
              return geminiTool;
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
    const input: GenerateContentParameters = {
        model: this.modelId,
        contents: this.conversation,
        config: {
          maxOutputTokens: 1024,
        }
    }
    if (this.tools.length > 0) {
        input.config = {
          ...input.config,
          tools: this.tools
        }
    }

    const response: GenerateContentResponse = await this.client.models.generateContent(
        input
    );

    const toolUse = response?.candidates.find(candidate => {
      return candidate.content?.parts?.find(part => !!part.functionCall)
    })

    if(toolUse) {
      for (const contentBlock of response.candidates[0].content?.parts) {
        if(contentBlock.text) {
          this.conversation.push({
            role: "model",
            parts: [{
              text: contentBlock.text,
            }],
          })
        } else if (contentBlock.functionCall) {
          const toolName = contentBlock.functionCall.name as string
          const response = await this.mcp.callTool({
            name: toolName,
            arguments: contentBlock.functionCall.args
          })
          const toolReponse = response.content

          this._handleToolResponse(toolName, response)

          this.conversation.push({
            role: 'model',
            parts: [{
              functionCall: contentBlock.functionCall,
            }],
          },{
            role: 'model',
            parts: [{
              functionResponse: {
                id: contentBlock.functionCall.id,
                name: contentBlock.functionCall.name,
                willContinue: true, // will wait for callback outcome
                response: toolReponse[0]
              },
            }],
          })

          this.lastFunctionCallConversationId = (this.conversation.length - 1)

          await this.converse()
        }
      }
    } else {
      this.conversation.push( {
        role: 'model',
        parts: [{
          text: response.candidates[0].content?.parts[0].text
        }],
      })

      if (response.candidates[0].content?.parts[0].text?.startsWith('Please click')) {
        return
      }

      this.eventEmitter.emit("message", {
        role: 'model',
        content: [{
          text: response.candidates[0].content?.parts[0].text,
          type: 'input_text'
        }]
      })
    }
  }

  async sendMessage(message: string): Promise<boolean> {
      let msg: Content

      if(message.startsWith('The verification process has completed') && this.lastFunctionCallConversationId) {
        const functionResponseParts = this.conversation[this.lastFunctionCallConversationId].parts

        if (!functionResponseParts?.length) {
          return false
        }

        functionResponseParts[0] = {
          functionResponse: {
            id: functionResponseParts[0]?.functionResponse.id,
            name: functionResponseParts[0]?.functionResponse.name,
            willContinue: false, // final outcome received
            response: { text: message }
          }
        }

        this.conversation.splice((this.lastFunctionCallConversationId + 1), 1)
        this.lastFunctionCallConversationId = null
      } else {
        msg = {
            role: 'user',
            parts: [{
              text: message,
            }],
        }
        this.conversation.push(msg)
      }
      
      await this.converse()

      return true
  }
}

export default ConverseMcpGeminiClient
