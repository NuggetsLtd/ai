# Model Context Protocol (MCP)

Demonstrates integration using the Model Context Protocol.

>**Note**: This documentation is specific to OIDC Integration. For self-hosted integrations, please [contact us](https://www.nuggets.life/request-a-meeting).

## Getting Started

To get started you'll first need to clone the repo and run `pnpm i`. If you do not have `pnpm` please see: https://pnpm.io/.

## Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed
- [Turborepo](https://turborepo.com/) installed

## Configure .env file

Copy & rename the [.env.example](https://github.com/NuggetsLtd/ai/blob/main/apps/client/.env.example) to `.env`, then add your OIDC Client ID and secret, and configuration for your LLM of choice:

```bash
NUGGETS_PRIVATE_JWK={}
NUGGETS_CLIENT_ID=xxxxxxx

CLIENT_TYPE=anthropic # anthropic, bedrock, openai

# AWS Bedrock configuration
BEDROCK_MODEL_ID=arn:aws:bedrock:<YOUR_BEDROCK_MODEL_ID>
BEDROCK_REGION=<YOUR_AWS_REGION>

# Anthropic config
ANTHROPIC_MODEL_ID=claude-3-5-sonnet-latest
ANTHROPIC_API_KEY=

# OpenAI config
OPENAI_MODEL_ID=gpt-4.1
OPENAI_API_KEY=
```

## Build & Run

1. **Run Redis Container**:
    ```bash
    npm run docker:redis
    ```

2. **Build the Server**:
   ```bash
   turbo build --filter=@nuggetslife/mcp-server
   ```

3. **Run the Client**:
  For development (watch mode):
   ```bash
   turbo dev
   ```
   OR server (static files):
   ```bash
   turbo start
   ```

## Chat to the AI Agent

You can ask questions of the AI Agent, such as:

- Can you verify I am over 18?
- Can you verify my social account?
- I want to sign in to verify my identity

<!-- 1. **Sign in to AWS**:

   ```bash
   npm run aws:ecr:signin
   ```

1. **Run Redis & Communicator Containers**:

    ```bash
    npm run docker:communicator
     ```

2. **Build the Server**:

   ```bash
   turbo build --filter=@nuggetslife/mcp-server
   ```

3. **Run the Client**:
   ```bash
   turbo dev
   ``` -->

## License

This project is licensed under the MIT License.
