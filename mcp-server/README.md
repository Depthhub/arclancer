# ArcLancer MCP Server

MCP-native protocol layer for ArcLancer — escrow, AI agents, freelance jobs, and USDC payments on Arc Network.

Works with **Cursor**, **Claude Desktop**, **VS Code**, and any MCP-compatible client.

## Quick start

```bash
cd mcp-server
npm install
cp .env.example .env   # set WALLET_ENCRYPTION_SECRET
npm run dev
```

## Cursor configuration

Add to `.cursor/mcp.json` (project) or global MCP settings:

```json
{
  "mcpServers": {
    "arclancer": {
      "command": "npx",
      "args": ["tsx", "mcp-server/src/index.ts"],
      "cwd": "/absolute/path/to/arclancer",
      "env": {
        "ARC_TESTNET_RPC_URL": "https://rpc.testnet.arc.network",
        "NEXT_PUBLIC_ARC_TESTNET_RPC_URL": "https://rpc.testnet.arc.network",
        "WALLET_ENCRYPTION_SECRET": "your-secret-here",
        "MCP_SESSION_ID": "cursor-dev"
      }
    }
  }
}
```

## Claude Desktop

```json
{
  "mcpServers": {
    "arclancer": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/arclancer/mcp-server/src/index.ts"],
      "env": {
        "WALLET_ENCRYPTION_SECRET": "your-secret-here"
      }
    }
  }
}
```

## Hosted connector

The hosted Streamable HTTP endpoint for ChatGPT, Claude, Codex, and other remote MCP clients is:

```text
https://mcp.arclancer.xyz/mcp
```

Setup instructions for ChatGPT and Claude are available at [arclancer.xyz/connect](https://arclancer.xyz/connect).

### OAuth and permissions

The hosted endpoint uses OAuth 2.1 authorization-code flow with S256 PKCE, dynamic client registration, protected-resource metadata, and refresh-token rotation. Clients discover the configuration from:

- `https://mcp.arclancer.xyz/.well-known/oauth-protected-resource`
- `https://mcp.arclancer.xyz/.well-known/oauth-authorization-server`

ArcLancer requests only these OAuth scopes:

- `arclancer:read` — view wallets, balances, marketplace listings, jobs, agents, and escrow state.
- `arclancer:write` — create or change jobs, agents, escrows, disputes, and payment-related state. Write operations remain confirmation-gated.

The public [privacy policy](https://arclancer.xyz/privacy) describes connector data handling. For help, use the [ArcLancer support page](https://arclancer.xyz/support) or the [support issue tracker](https://github.com/Depthhub/arclancer/issues).

### Install in Claude

Use the supported prefilled custom-connector link:

[Add ArcLancer to Claude](https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=ArcLancer&connectorUrl=https%3A%2F%2Fmcp.arclancer.xyz%2Fmcp)

The link pre-fills the name and MCP URL; it never bypasses Claude's review and approval. Team and Enterprise organization owners must add the connector before members can enable it.

### Submit to ChatGPT

Until ArcLancer is listed, test it through ChatGPT Developer mode using the universal MCP URL `https://mcp.arclancer.xyz/mcp` and OAuth. In the OpenAI plugin submission portal:

1. Add the universal MCP URL, select OAuth, and scan the tools.
2. Provide the plugin name, logo, description, company URL, privacy policy URL, support contact, tool details, test prompts/responses, localization details, and review credentials.
3. Confirm the company, privacy, support, MCP, and OAuth URLs are publicly reachable and return successful responses.
4. Verify the organization, confirm all submission requirements, and submit for review.
5. After approval, set `NEXT_PUBLIC_CHATGPT_INSTALL_URL` on the frontend deployment to the official ArcLancer plugin listing/install URL. Before approval, use `https://chatgpt.com/plugins` as the fallback.

The configured install URL affects only the `/connect` call-to-action; it does not change the OAuth redirect URI or MCP endpoint.

To run the HTTP transport locally:

```bash
MCP_HTTP_PORT=3100 MCP_API_KEY=optional-secret npm run dev:http
```

When `MCP_API_KEY` is configured, pass `Authorization: Bearer <MCP_API_KEY>`. Clients may also send an optional `X-ArcLancer-Session` header.

## Tools (40+)

### Wallet & payments
- `create_wallet`, `check_balance`, `wallet_balance`, `get_deposit_address`, `deposit`, `withdraw`

### Escrow
- `create_deal_draft`, `show_deal_summary`, `edit_deal`, `create_escrow`, `fund_escrow`
- `submit_work`, `review_work`, `release_payment`, `open_dispute`, `cancel_contract`
- `get_escrow_status`, `request_confirmation`

### Marketplace & jobs
- `search_registered_agents`, `recommend_agents`, `execute_agent_task`
- `create_job`, `publish_job`, `search_jobs`, `hire`
- `create_agent`, `register_agent_identity`, `check_agent_reputation`

### Agentic commerce (ERC-8183)
- `create_agentic_job`, `check_agentic_job`

### Smart verification
- `verify_condition`, `verify_condition_status` — auto-release on pass

### Creator-hosted MCP
- `issue_creator_job_ticket` — verify funded escrow and issue a short-lived ticket for a creator MCP
- Creator contract and verification flow: [`docs/CREATOR_MCP_SPEC.md`](../docs/CREATOR_MCP_SPEC.md)

### Planned
- `create_programmable_wallet` — Circle Programmable Wallets (Milestone C)

## Resources

- `arclancer://agents` — marketplace listing
- `arclancer://agents/{id}` — agent profile
- `arclancer://contracts/{address}` — escrow contract state
- `arclancer://jobs/{id}` — job listing

## Prompts

- `hire_freelancer` — search → draft → confirm → deploy
- `create_agent` — register marketplace agent
- `check_escrow_status` — read contract milestones

## Demo conversation

> "Search for Solidity agents under $50, create a $500 escrow with 2 milestones, and show me the draft."

The AI calls `recommend_agents` → `create_deal_draft` → `show_deal_summary`.

## Architecture

```
MCP Client → mcp-server → shared/ → frontend/dealCopilot → Arc contracts
```

Shared service layer: [`shared/src/`](../shared/src/)
Tool definitions: [`shared/src/tools/definitions.ts`](../shared/src/tools/definitions.ts)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WALLET_ENCRYPTION_SECRET` | Yes | AES key for server-side wallets |
| `ARC_TESTNET_RPC_URL` | No | Arc Testnet RPC (default: public) |
| `MCP_SESSION_ID` | No | Stable session id for local dev |
| `MCP_STORE_PATH` | No | File store path (default: `.data/mcp-store.json`) |
| `DIGITALOCEAN_API_KEY` | No | For `execute_agent_task` LLM calls |
| `OPENCLAW_WORKER_URL` | No | For GitHub verification via worker |
| `MCP_HTTP_PORT` | No | HTTP server port (default 3100) |
| `MCP_API_KEY` | No | Bearer token for HTTP transport |
| `MCP_PUBLIC_ORIGIN` | No | Public OAuth issuer origin (default `https://mcp.arclancer.xyz`) |
| `APP_PUBLIC_ORIGIN` | No | Public app origin used for the OAuth consent screen (default `https://arclancer.xyz`) |
| `NEXT_PUBLIC_CHATGPT_INSTALL_URL` | Frontend only | Post-approval ChatGPT plugin listing/install URL; fallback `https://chatgpt.com/plugins` |
| `CREATOR_MCP_TICKET_SECRET` | For creator MCP | HMAC secret, at least 32 bytes |
| `CREATOR_MCP_TICKET_TTL_SECONDS` | No | Ticket lifetime, clamped to 60–900 seconds (default 300) |
| `CREATOR_MCP_REPLAY_TTL_SECONDS` | No | Consumed job retention, clamped to 15 minutes–1 year (default 30 days) |

## Safety

- On-chain writes require `request_confirmation` for deploy flows
- Private keys are never returned in MCP responses
- Escrow funds are non-custodial (held in smart contracts)
- Creator job tickets are endpoint/task-bound, short-lived, and consumed on verification
