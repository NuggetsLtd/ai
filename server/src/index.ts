import 'dotenv/config'
import config from './config.js'

switch (config.clientType) {
  case 'OIDC':
    await import('./mcp-server-oidc.js')
    break;
  case 'SELF_HOSTED':
    await import('./mcp-server-self-hosted.js')
    break;
  default:
    console.error(`Unknown client type: ${config.clientType}`)
    process.exit(1)
}
