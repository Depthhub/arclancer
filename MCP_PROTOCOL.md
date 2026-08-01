# ArcLancer MCP Protocol

See [`mcp-server/README.md`](mcp-server/README.md) for setup and Cursor/Claude configuration.

## Architecture

```
MCP Client (Cursor, Claude, ChatGPT)
    ↓
mcp-server/ (stdio or HTTP)
    ↓
shared/ (UserContext, job listings, verification)
    ↓
frontend/src/lib/dealCopilot/ (existing 16 tools + executor)
    ↓
Arc Smart Contracts (EscrowFactory, AgentRegistry)
```

## Packages

| Path | Purpose |
|------|---------|
| [`mcp-server/`](mcp-server/) | MCP server (stdio + HTTP) |
| [`shared/`](shared/) | Shared service layer |
| [`frontend/src/lib/dealCopilot/`](frontend/src/lib/dealCopilot/) | Existing tool handlers |

## Quick start

```bash
cd mcp-server
npm install
cp .env.example .env
npm run dev
```
