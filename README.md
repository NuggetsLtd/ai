# Model Context Protocol PoC

A Proof of Concept for integration of Nuggets with AI agents using the Model Context Protocol (MCP) standard.

1. Sign in to AWS: `yarn aws:ecr:signin`
2. Run containers (run one of):
   1. Self-hosted integration: `yarn docker:communicator`
   2. OIDC integration: `yarn docker:communicator redis`
3. Build the Server: `cd packages/server && yarn build`
4. Run the Client: `cd ../../apps/client && yarn dev`
