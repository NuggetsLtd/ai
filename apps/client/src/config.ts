const {
  CLIENT_TYPE,
  BEDROCK_MODEL_ID,
  BEDROCK_REGION,
  ANTHROPIC_MODEL_ID,
  ANTHROPIC_API_KEY,
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
  communicator: {
    callbackToken: NUGGETS_WEBHOOK_API_TOKEN
  }
}

export default config
