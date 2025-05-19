# Nuggets AI

Welcome to the Nuggets AI repo. Here you will find examples of how to Nuggets into your AI projects.

1. [Getting Started](#getting-started)
2. [A2A Authentication](#a2a-authentication)
3. [MCP](#mcp)

## Getting Started

To get started you'll first need to clone the repo and run `pnpm i`. If you do not have `pnpm` please see: https://pnpm.io/.

## A2A Authentication

An example of Nuggets Authentication when connecting to an AI Agent. This allows Agents to confirm they are communicating with the correct Agent.

### Prerequisites

- Node.js and pnpm installed.

### Setup

1. **Create a Gemini API key**:

   As this project is build on top of the Google A2A Protocol example [repo](https://github.com/google/A2A/tree/main/samples/js), you will firstly need a Gemini API key. This can be found here: https://ai.google.dev/gemini-api/docs/api-key.

2. **Create a AI Agent Client in the Nuggets Accounts Portal**

   Log into the [Nuggets Accounts Portal](https://accounts.nuggets.life) and create your AI Agent. **_Make ensure to download your private key and keep a record of your client ID as these are needed for the next part_**.

3. **Add your environment variables**

   Once created you'll need to these to a `.env` file in the `/apps/a2a` directory.

   ```
   NUGGETS_PRIVATE_JWK={}
   NUGGETS_CLIENT_ID=xxxxxxx
   ```

4. **Run the coder agent**:

   ```bash
   npm run a2a:agent:coder
   ```

5. **Run the Agent to Agent CLI**:

   In a new terminal run:

   ```bash
   npm run a2a:cli
   ```

If all has worked successfully your should see all the verified information about your Client returned in the Terminal when connecting.

## MCP

Demonstrates integration using the Model Context Protocol.

### Prerequisites

- Node.js and pnpm installed.
- Docker and Docker Compose installed.
- AWS CLI configured for ECR access.

### Setup

1. **Sign in to AWS**:

   ```bash
   npm run aws:ecr:signin
   ```

2. **Run Containers**:

   - Self-hosted integration:
     ```bash
     npm run docker:communicator
     ```
   - OIDC integration:
     ```bash
     npm run docker:communicator redis
     ```

3. **Build the Server**:

   ```bash
   npm run build
   ```

4. **Run the Client**:
   ```bash
   npm run dev
   ```

## Monorepo Structure

- **apps/**: Contains the client and A2A examples.
  - **client/**: MCP client implementation.
  - **a2a/**: Agent to Agent authentication examples.
- **packages/**: Contains shared packages.
  - **server/**: MCP server implementation.
  - **authentication/**: Authentication utilities.

### Agent to Agent Authentication

Navigate to the `apps/a2a` directory and follow the instructions in the respective agent READMEs:

- **Movie Agent**: Uses TMDB API to search for movie information.
- **Coder Agent**: Generates full code files as artifacts.

## Development

- **Build**: Use `yarn build` in the respective package directories.
- **Dev**: Use `yarn dev` for development.

## Configuration

- **Environment Variables**: Ensure all necessary environment variables are set as per the setup instructions.
- **Docker Setup**: Refer to `docker-compose.yml` and related files for container orchestration.

## License

This project is licensed under the MIT License.
