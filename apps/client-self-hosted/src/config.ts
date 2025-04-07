const {
  BEDROCK_MODEL_ID,
  BEDROCK_REGION,
  NUGGETS_WEBHOOK_API_TOKEN
} = process.env

const config = {
  bedrock: {
    modelId: BEDROCK_MODEL_ID,
    region: BEDROCK_REGION,
  },
  communicator: {
    callbackToken: NUGGETS_WEBHOOK_API_TOKEN
  }
}

export default config
