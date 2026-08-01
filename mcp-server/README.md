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
| `CREATOR_MCP_TICKET_SECRET` | For creator MCP | HMAC secret, at least 32 bytes |
| `CREATOR_MCP_TICKET_TTL_SECONDS` | No | Ticket lifetime, clamped to 60–900 seconds (default 300) |
| `CREATOR_MCP_REPLAY_TTL_SECONDS` | No | Consumed job retention, clamped to 15 minutes–1 year (default 30 days) |

## Safety

- On-chain writes require `request_confirmation` for deploy flows
- Private keys are never returned in MCP responses
- Escrow funds are non-custodial (held in smart contracts)
- Creator job tickets are endpoint/task-bound, short-lived, and consumed on verification
