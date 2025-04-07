const {
  NUGGETS_CLIENT_TYPE,
  NUGGETS_SELF_HOSTED_COMMUNICATOR_URL
} = process.env

// Check if the environment variables are set
if (!NUGGETS_CLIENT_TYPE) {
  throw new Error("NUGGETS_CLIENT_TYPE environment variable not set");
}
if(NUGGETS_CLIENT_TYPE === 'SELF_HOSTED' && !NUGGETS_SELF_HOSTED_COMMUNICATOR_URL) {
  throw new Error("NUGGETS_SELF_HOSTED_COMMUNICATOR_URL environment variable not set for type SELF_HOSTED");
}

const config = {
  clientType: NUGGETS_CLIENT_TYPE,
  selfHostedCommunicatorUrl: NUGGETS_SELF_HOSTED_COMMUNICATOR_URL
}

export default config
