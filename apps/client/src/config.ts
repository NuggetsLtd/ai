import { ClientType } from './converse-mcp-clients/index.js'

const {
  CLIENT_TYPE,
  BEDROCK_MODEL_ID,
  BEDROCK_REGION,
  ANTHROPIC_MODEL_ID,
  ANTHROPIC_API_KEY,
  OPENAI_MODEL_ID,
  OPENAI_API_KEY,
  NUGGETS_WEBHOOK_API_TOKEN
} = process.env

const config = {
  clientType: CLIENT_TYPE,
  bedrock: {
    modelId: BEDROCK_MODEL_ID,
    region: BEDROCK_REGION,
  },
  anthropic: {
    modelId: ANTHROPIC_MODEL_ID,
    apiKey: ANTHROPIC_API_KEY
  },
  openai: {
    modelId: OPENAI_MODEL_ID,
    apiKey: OPENAI_API_KEY
  },
  communicator: {
    callbackToken: NUGGETS_WEBHOOK_API_TOKEN
  }
}

export const determineClientType = () => {
  let clientType: ClientType
  let modelId: string
  
  switch (config.clientType) {
    case 'anthropic':
      if(!config.anthropic.modelId) {
        throw new Error("ANTHROPIC_MODEL_ID environment variable NOT set");
      }
      if(config.anthropic.modelId.startsWith('arn:aws:bedrock:')) {
        throw new Error('AWS Bedrock model id should start with "arn:aws:bedrock:"')
      }
      if(!config.anthropic.apiKey) {
        throw new Error("ANTHROPIC_API_KEY environment variable NOT set");
      }
      
      clientType = ClientType.Anthropic
      modelId = config.anthropic.modelId
      break;
    case 'bedrock':
      if(!config.bedrock.modelId) {
        throw new Error("BEDROCK_MODEL_ID environment variable NOT set");
      }
      if(!config.bedrock.region) {
        throw new Error("BEDROCK_REGION environment variable NOT set");
      }

      clientType = ClientType.AwsBedrock
      modelId = config.bedrock.modelId
      break;
    case 'openai':
      if(!config.openai.modelId) {
        throw new Error("OPENAPI_MODEL_ID environment variable NOT set");
      }
      if(!config.openai.apiKey) {
        throw new Error("OPENAPI_API_KEY environment variable NOT set");
      }
      
      clientType = ClientType.OpenAI
      modelId = config.openai.modelId
      break;
    default:
      throw new Error("CLIENT_TYPE environment variable NOT set or unsupported");
  }

  return {
    clientType,
    modelId
  }
}

export default config
