const {
  BEDROCK_MODEL_ID,
  BEDROCK_REGION,
} = process.env

const config = {
  bedrock: {
    modelId: BEDROCK_MODEL_ID,
    region: BEDROCK_REGION,
  }
}

export default config
