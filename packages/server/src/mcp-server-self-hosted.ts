import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import config from './config.js'

const validInviteReasons = ['fullname', 'over18'] as const;

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

type OnUserConnect = string | {
  uri: string;
  payload: object;
};


// ********** Helper Functions **********

function determineOnUserConnect(reason: string): OnUserConnect {
  switch (reason) {
    case 'over18':
      return {
        uri: "https://schemas.nuggets.life/age_over/1.0/1_start",
        payload: {
          age: '18'
        }
      };
    default:
      throw new Error(`Invalid reason: ${reason}`);
  }
}


// ********** Implement Tool Execution **********

server.tool(
  "generate-invite-qr-code",
  "Generate a Nuggets QR code for user to verify their identity. Each user interaction requires a new unique QR code to be generated",
  { reason: z.enum(validInviteReasons) },
  async ({ reason }) => {
    // Generate QR code
    const response = await fetch(`${config.selfHostedCommunicatorUrl}/api/didcomm/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format: "svg",
        onUserConnect: determineOnUserConnect(reason)
      }),
    })

    const body = await response.json()
    const qrCode = Buffer.from(body.qrCode).toString('base64')

    if (!response.ok) {
      throw new Error(`Failed to generate QR code: ${response.statusText}`);
    }

    return {
      content: [{ 
        type: 'image',
        data: qrCode,
        mimeType: 'image/svg+xml'
       }]
    }
  }
);


// ********** Implement Prompts **********

server.prompt(
  "generate-invite-qr-code-identity",
  "Generate a Nuggets QR code for user to verify their identity. Each user interaction requires a new unique QR code to be generated",
  { reason: z.enum(validInviteReasons) },
  ({ reason }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please generate an invite QR code for: ${reason} verification`
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
