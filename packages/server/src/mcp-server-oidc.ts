import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateOidcInvite } from "./oidc-client.js";
import { validScopes } from "./types.js";

// Create server instance
const server = new McpServer({
  name: "nuggets-self-sovereign-identity-and-payment",
  description: "A Nuggets self-sovereign identity and payment server, for verifying self-sovereign identity elements and payments privately and securely.",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});


// ********** Implement Tool Execution **********

server.tool(
  "generate-invite-oidc-link",
  "Generate Nuggets OIDC link for user to verify their identity. Each user interaction requires a new unique link to be generated",
  { reason: z.enum(validScopes) },
  async ({ reason }) => {
    // Generate OIDC Link
    const { url, ref } = await generateOidcInvite({
      scope: reason,
    })

    return {
      content: [{ 
        type: 'text',
        text: `Please click the link to verify your identity: ${url}`,
        url,
        ref
       }]
    }
  }
);


// ********** Implement Prompts **********

server.prompt(
  "generate-invite-oidc-link-identity",
  "Generate Nuggets OIDC link for user to verify their identity. Each user interaction requires a new unique link to be generated",
  { reason: z.enum(validScopes) },
  ({ reason }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please generate an OIDC link for: ${reason} verification`
      }
    }]
  })
);


// ********** Start Server **********

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nuggets MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
