/**
 * Streamable HTTP transport for remote MCP clients (ChatGPT, hosted deployments).
 */
import "dotenv/config";
import { createServer, type IncomingMessage } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpUserContext } from "../../shared/src/context/UserContext.js";
import { getMcpStore } from "../../shared/src/store/upstashStore.js";
import { createArcLancerMcpServer } from "./server.js";
import { verifyCreatorJobTicket } from "./creatorTickets.js";

const PORT = Number(process.env.MCP_HTTP_PORT ?? 3100);
const API_KEY = process.env.MCP_API_KEY?.trim();
const store = getMcpStore();
const replayTtlCandidate = Number(process.env.CREATOR_MCP_REPLAY_TTL_SECONDS);
const CREATOR_MCP_REPLAY_TTL_SECONDS = Number.isFinite(replayTtlCandidate)
  ? Math.min(31_536_000, Math.max(900, Math.floor(replayTtlCandidate)))
  : 2_592_000;

interface ConnectorIdentity {
  subject: string;
  walletAddress: string;
  walletId: string;
}

const sessions = new Map<
  string,
  { transport: StreamableHTTPServerTransport; server: ReturnType<typeof createArcLancerMcpServer> }
>();

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) throw new Error("Request body too large");
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON object required");
  }
  return parsed as Record<string, unknown>;
}

async function getOrCreateSession(sessionId: string, identity?: ConnectorIdentity) {
  let entry = sessions.get(sessionId);
  if (entry) return entry;

  const user = createMcpUserContext(
    sessionId,
    identity ? { address: identity.walletAddress, walletId: identity.walletId } : undefined
  );
  const mcpServer = createArcLancerMcpServer(user, store);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
  });
  await mcpServer.connect(transport);
  entry = { transport, server: mcpServer };
  sessions.set(sessionId, entry);
  return entry;
}

async function authenticate(
  req: IncomingMessage
): Promise<{ sessionId: string; identity?: ConnectorIdentity } | null> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (API_KEY && token === API_KEY) {
    const header = req.headers["x-arclancer-session"];
    return {
      sessionId: typeof header === "string" && header ? header : randomUUID(),
    };
  }

  if (!token.startsWith("arc_")) return null;
  const digest = createHash("sha256").update(token).digest("hex");
  const identity = await store.getJSON<ConnectorIdentity>(`mcp:token:${digest}`);
  if (!identity?.subject || !identity.walletAddress || !identity.walletId) return null;
  return { sessionId: identity.subject, identity };
}

const httpServer = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "arclancer-mcp" }));
    return;
  }

  if (req.method === "POST" && req.url === "/creator-tickets/verify") {
    try {
      const body = await readJsonBody(req);
      const ticket = typeof body.ticket === "string" ? body.ticket : "";
      const endpoint = typeof body.mcp_endpoint === "string" ? body.mcp_endpoint : "";
      const taskSha256 = typeof body.task_sha256 === "string" ? body.task_sha256 : "";
      if (!ticket || !endpoint || !/^[a-fA-F0-9]{64}$/.test(taskSha256)) {
        res.writeHead(400, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ ok: false, error: "ticket, mcp_endpoint, and task_sha256 required" }));
        return;
      }

      const claims = verifyCreatorJobTicket(ticket, {
        expectedAudience: endpoint,
        expectedTaskSha256: taskSha256,
      });
      const replayKey = `creator_ticket:consumed_job:${claims.job_id}`;
      if (await store.getJSON(replayKey)) {
        res.writeHead(409, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ ok: false, error: "Ticket already consumed" }));
        return;
      }
      await store.setJSON(
        replayKey,
        { consumedAt: Date.now() },
        CREATOR_MCP_REPLAY_TTL_SECONDS
      );
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, claims }));
    } catch {
      res.writeHead(401, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: false, error: "Invalid creator job ticket" }));
    }
    return;
  }

  if (!req.url?.startsWith("/mcp")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const authenticated = await authenticate(req);
  if (!authenticated) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const sessionHeader = req.headers["mcp-session-id"] ?? req.headers["x-arclancer-session"];
  const sessionId = authenticated.identity
    ? authenticated.sessionId
    : typeof sessionHeader === "string" && sessionHeader.length > 0
      ? sessionHeader
      : authenticated.sessionId;

  try {
    const { transport } = await getOrCreateSession(sessionId, authenticated.identity);
    res.setHeader("Mcp-Session-Id", sessionId);
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error("[mcp-http] error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
});

httpServer.listen(PORT, () => {
  console.error(`ArcLancer MCP HTTP server on http://localhost:${PORT}/mcp`);
  console.error(`Health: GET /health`);
  if (API_KEY) console.error("MCP_API_KEY auth enabled");
});
