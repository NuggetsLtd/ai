const {
  NUGGETS_CLIENT_TYPE,
  NUGGETS_SELF_HOSTED_COMMUNICATOR_URL,
  NUGGETS_OIDC_CLIENT_ID,
  NUGGETS_OIDC_CLIENT_JWKS,
  NUGGETS_OIDC_REDIRECT_URIS,
  NUGGETS_OIDC_SIGNOUT_REDIRECT_URIS,
  NUGGETS_OIDC_PROVIDER_URL,
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
  selfHostedCommunicatorUrl: NUGGETS_SELF_HOSTED_COMMUNICATOR_URL,
  oidc: {
    clientId: NUGGETS_OIDC_CLIENT_ID,
    jwks: NUGGETS_OIDC_CLIENT_JWKS ? JSON.parse(NUGGETS_OIDC_CLIENT_JWKS) : undefined,
    redirectUris: NUGGETS_OIDC_REDIRECT_URIS ? JSON.parse(NUGGETS_OIDC_REDIRECT_URIS) : undefined,
    providerUrl: NUGGETS_OIDC_PROVIDER_URL,
    responseTypes: ["code"],
    grantTypes: ['authorization_code', 'refresh_token'],
    tokenEndpointAuthMethod: 'private_key_jwt',
    postLogoutRedirectUris: NUGGETS_OIDC_SIGNOUT_REDIRECT_URIS ? JSON.parse(NUGGETS_OIDC_SIGNOUT_REDIRECT_URIS) : undefined,
  }
}

export default config
