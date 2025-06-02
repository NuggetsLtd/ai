# A2A Authentication

An example of Nuggets Authentication when connecting to an AI Agent. This allows Agents to confirm they are communicating with the correct Agent.

## Getting Started

To get started you'll first need to clone the repo and run `pnpm i`. If you do not have `pnpm` please see: https://pnpm.io/.

## Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed

## Agents

- [Movie Agent](src/agents/movie-agent/README.md): Uses TMDB API to search for movie information and answer questions.
- [Coder Agent](src/agents/coder/README.md): Generates full code files as artifacts.

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

### How the authentication works

1. Create a Nuggets AI Agent (within the [accounts portal](https://accounts.nuggets.life)) and download the private key and client ID. Using the client ID as the subject, generate a signed JWT using the private key. Send to the authenticating server.
2. Once received, decode the JWT to retrieve the Client ID via the `payload.sub` field.
3. Using the client ID, the server can retrieve the clients DID via the `https://auth.nuggets.life/did/CLIENT_ID` endpoint.
4. Using the public key from the DID Document, authenticate the validity of the token. If the verification passes, you know that the agent has authenticated successfully.
5. Once successful the server is able to retrieve more information about the agent's Nuggets Client via the `https://auth.nuggets.life/verified-info/CLIENT_ID/json` endpoint.
6. This can then be used to display more information about the AI Agent and confirm its identity.

## License

This project is licensed under the MIT License.
