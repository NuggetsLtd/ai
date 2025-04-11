import { Issuer, BaseClient, ClientAuthMethod, generators } from 'openid-client'
import config from './config.js'
import { GenerateInviteInput, GenerateInviteOutput, OIDCQueryResponse, OIDCCachedValues, OIDCCallbackResponse, OIDCUserInfoRespose } from './types.js'
import cache from "./cache.js"
import { v4 as uuidv4 } from 'uuid'
import * as jose from 'jose'

const { providerUrl, jwks, redirectUris, clientId, responseTypes, grantTypes, tokenEndpointAuthMethod, postLogoutRedirectUris } = config.oidc
const response_type = 'code'

let issuer: Issuer<BaseClient> | undefined
let oidcClient: BaseClient | undefined

export type {
  OIDCQueryResponse,
  OIDCCallbackResponse,
  OIDCUserInfoRespose,
}

export async function loadOidcClient() {
  // Generate OIDC Link
  if (oidcClient) {
    return
  }

  if (!jwks) {
    throw new Error('Could not load private keys')
  }
  if (!Array.isArray(jwks) && jwks.length) {
    throw new Error('JWKS must be an array of keys')
  }
  if(!providerUrl) {
    throw new Error('OIDC provider URL is not set')
  }
  if (!clientId) {
    throw new Error('OIDC client ID is not set')
  }

  issuer = await Issuer.discover(providerUrl)

  oidcClient = new issuer.Client(
    {
      client_id: clientId,
      response_types: responseTypes,
      grant_types: grantTypes,
      redirect_uris: redirectUris,
      post_logout_redirect_uris: postLogoutRedirectUris,
      token_endpoint_auth_method: tokenEndpointAuthMethod as ClientAuthMethod,
    },
    { keys: jwks }
  )
}


export async function generateOidcInvite({
  scope,
}: GenerateInviteInput): Promise<GenerateInviteOutput> {
  await loadOidcClient()

  if (!oidcClient) {
    throw new Error('Failed to load OIDC client')
  }

  const finalScope = `openid ${scope}`
  const state = uuidv4()
  const codeVerifier = generators.codeVerifier()
  const nonce = generators.nonce()
  const redirectUri = config.oidc.redirectUris[0]

  const authPayload = await oidcClient.pushedAuthorizationRequest({
    scope: finalScope,
    response_type,
    response_mode: 'jwt',
    state,
    nonce,
    code_challenge: generators.codeChallenge(codeVerifier),
    code_challenge_method: 'S256',
    redirect_uri: redirectUri
  })

  const url = oidcClient.authorizationUrl(authPayload)

  // cache the nonce, codeVerifier and scope for use in the callback
  await cache.set(state, JSON.stringify({
    nonce: nonce,
    code_verifier: codeVerifier,
    scope: finalScope
  } as OIDCCachedValues), "EX", 60 * 2)

  return { url, ref: state }
}

export async function callback(response: OIDCQueryResponse): Promise<OIDCCallbackResponse> {
  await loadOidcClient()

  if (!oidcClient) {
    throw new Error('Failed to load OIDC client')
  }

  const { state } = jose.decodeJwt(response.response)
  const redirectUri = config.oidc.redirectUris[0]

  const cachedValues = await cache.get(state as string)
  if (!cachedValues) {
    throw new Error('No cached values found for state')
  }

  const parsedValues = JSON.parse(cachedValues) as OIDCCachedValues

  const tokenSet = await oidcClient.callback(redirectUri, response, { 
    response_type,
    state: state as string,
    nonce: parsedValues.nonce,
    code_verifier: parsedValues.code_verifier,
   })

  const userInfo: OIDCUserInfoRespose = await oidcClient.userinfo(tokenSet)
console.log('User info: ', userInfo)

  const type = userInfo?.proof?.credentialSubject?.type as string || 'unknown'

  const outcome: OIDCCallbackResponse = {
    ref: state as string,
    type
  }

  switch (type) {
    case 'Twitter':
    case 'Github':
      outcome.url = userInfo?.proof?.credentialSubject?.url
      outcome.username = userInfo?.proof?.credentialSubject?.username
      outcome.profileImage = userInfo?.proof?.credentialSubject?.profileImage
      break;
    case 'Person':
      userInfo?.given_name && (outcome.givenName = userInfo?.given_name)
      userInfo?.family_name && (outcome.familyName = userInfo?.family_name)
      userInfo?.proof?.credentialSubject?.over18 && (outcome.over18 = userInfo?.proof?.credentialSubject?.over18)
    default:
      break;
  }

  return outcome
}
