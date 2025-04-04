const {
  NUGGETS_CLIENT_TYPE
} = process.env

const config = {
  clientType: NUGGETS_CLIENT_TYPE || 'OIDC'
}

export default config
