import "dotenv/config";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "tsconfig-paths";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

register({
  baseUrl: repoRoot,
  paths: {
    "@/*": ["frontend/src/*"],
    "@shared/*": ["shared/src/*"],
  },
});

const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
const { createMcpUserContext } = await import("../../shared/src/context/UserContext.js");
const { getMcpStore } = await import("../../shared/src/store/upstashStore.js");
const { createArcLancerMcpServer } = await import("./server.js");

const user = createMcpUserContext(process.env.MCP_SESSION_ID);
const store = getMcpStore();
const server = createArcLancerMcpServer(user, store);
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`ArcLancer MCP server running (session: ${user.sessionId})`);
