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

## Hosted connector authorization

The production MCP resource is `https://mcp.arclancer.xyz/mcp`. Remote clients discover its OAuth 2.1 configuration through RFC 9728 protected-resource metadata and authorization-server metadata:

```text
https://mcp.arclancer.xyz/.well-known/oauth-protected-resource
https://mcp.arclancer.xyz/.well-known/oauth-authorization-server
```

Authorization uses the code flow with S256 PKCE and dynamic client registration. The advertised least-privilege scopes are:

- `arclancer:read` for wallet, marketplace, job, agent, and escrow queries.
- `arclancer:write` for state-changing marketplace, agent, escrow, dispute, and payment operations.

Clients should request only the scopes needed for the tools they invoke. OAuth authorization does not replace per-operation confirmation for write and fund-moving tools.

## Platform distribution

Claude supports a prefilled custom-connector dialog:

```text
https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=ArcLancer&connectorUrl=https%3A%2F%2Fmcp.arclancer.xyz%2Fmcp
```

The user or organization owner must still review and add the connector. ChatGPT does not provide a public custom-MCP prefill URL: use Developer mode with the production MCP URL during review, then submit the universal MCP server through OpenAI's plugin submission portal. Submission materials must include the ArcLancer company URL, [privacy policy](https://arclancer.xyz/privacy), [support page](https://arclancer.xyz/support), tool descriptions, test prompts/responses, and review credentials.

After approval, configure the frontend's `NEXT_PUBLIC_CHATGPT_INSTALL_URL` with the official ArcLancer listing/install URL. Until then, use `https://chatgpt.com/plugins`. This setting controls only the install call-to-action and must not be used as an OAuth redirect or MCP resource URL.
