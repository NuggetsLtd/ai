import type { Message as BedrockMessage } from "@aws-sdk/client-bedrock-runtime";
import type { MessageParam as AnthropicMessage } from "@anthropic-ai/sdk/resources";
import { ConverseMcpAnthropicClient } from './anthropic.js'
import { ConverseMcpBedrockClient } from './aws-bedrock.js'
import { ConverseMcpGeminiClient } from './gemini.js'
import { ConverseMcpOpenAiClient } from './openai.js'

enum ClientType {
  AwsBedrock,
  Anthropic,
  Gemini,
  OpenAI
}

type ConverseMcpClient = ConverseMcpAnthropicClient | ConverseMcpBedrockClient | ConverseMcpGeminiClient | ConverseMcpOpenAiClient

export {
  BedrockMessage,
  AnthropicMessage,
  ClientType,
  ConverseMcpClient,
  ConverseMcpAnthropicClient,
  ConverseMcpBedrockClient,
  ConverseMcpGeminiClient,
  ConverseMcpOpenAiClient
}

export default {
  ConverseMcpAnthropicClient,
  ConverseMcpBedrockClient,
  ConverseMcpGeminiClient,
  ConverseMcpOpenAiClient
}
