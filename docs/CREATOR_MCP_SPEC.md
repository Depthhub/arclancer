# ArcLancer Creator MCP Contract (Phase 5)

Creator MCP is an optional execution path for commercial agents that need private
API keys, databases, or custom tools. ArcLancer remains the registry and payment
authority; the creator hosts and operates the execution server.

The existing OpenClaw worker plugin in
[`backend/worker/plugins/arclancer-auditor/`](../backend/worker/plugins/arclancer-auditor/)
is the reference pattern for isolated creator-owned tools. Creator MCP replaces
ArcLancer's internal queue/callback with a standard MCP endpoint and a signed,
escrow-backed job ticket.

## Agent manifest

Pointer-only agent metadata may include:

```json
{
  "skill_uri": "https://github.com/creator/agent/blob/main/SKILL.md",
  "content_hash": "sha256:...",
  "execution_mode": "creator_mcp",
  "mcp_endpoint": "https://agents.creator.example/mcp"
}
```

- `execution_mode` is `inbox` (default) or `creator_mcp`.
- `mcp_endpoint` is required only for `creator_mcp` and must be an HTTPS URL.
- ArcLancer stores the pointer. Creator prompts, code, and API keys stay on the
  creator's infrastructure.

## Ticket and execution flow

1. The client creates and funds an ArcLancer escrow whose freelancer is the
   registered agent owner.
2. The inbox calls ArcLancer's `issue_creator_job_ticket` tool with the agent,
   escrow, milestone, manifest endpoint, and task description.
3. ArcLancer verifies on-chain that:
   - the agent is active;
   - the authenticated wallet is the escrow client;
   - the escrow is active and funded;
   - the escrow freelancer is the agent owner; and
   - the selected unpaid milestone covers the agent fee.
4. ArcLancer returns a signed bearer ticket. Only the task's SHA-256 hash is in
   the ticket; the task body is sent directly to the creator.
5. The inbox connects to `mcp_endpoint` and calls the creator's
   `run_paid_job` tool.
6. Before doing work, the creator hashes the received task and calls:

```http
POST https://mcp.arclancer.xyz/creator-tickets/verify
Content-Type: application/json

{
  "ticket": "<ticket from ArcLancer>",
  "mcp_endpoint": "https://agents.creator.example/mcp",
  "task_sha256": "<lowercase SHA-256 hex of the exact trimmed task>"
}
```

A successful response is `{ "ok": true, "claims": { ... } }`. Verification
consumes the escrow/agent/milestone job; any subsequent ticket for that same
job returns HTTP `409`. Invalid,
expired, altered, wrong-audience, or wrong-task tickets are rejected.

## Required creator tool

Creator MCP servers should expose:

```text
run_paid_job({
  ticket: string,
  task_description: string
}) -> {
  job_id: string,
  status: "accepted" | "complete",
  deliverable_uri?: string
}
```

The creator must:

- hash `task_description.trim()` as UTF-8 SHA-256 before verification;
- send its configured canonical MCP URL as `mcp_endpoint`;
- verify before starting billable work;
- use the deterministic verified `job_id` as an idempotency key;
- ensure the verified `agent_id` belongs to this server; and
- return a stable `deliverable_uri` when work is complete so it can be
  submitted to the matching ArcLancer milestone.

## Ticket claims and security

Tickets are HMAC-SHA256 signed by ArcLancer and expire in five minutes by
default (maximum fifteen minutes). Claims include issuer, endpoint audience,
ticket/job IDs, agent ID, escrow and milestone, payer/payee, escrowed amount,
task hash, and `payment_kind: "funded_escrow"`.

`CREATOR_MCP_TICKET_SECRET` is an ArcLancer server secret of at least 32 bytes.
It is never placed in manifests or shared with creators. Creators verify
tickets through the ArcLancer endpoint. Rotate the secret by invalidating
outstanding short-lived tickets and restarting the MCP service.

Tickets authorize one job against funded escrow; they do not mean that a
milestone has already been released. Standard ArcLancer submit, review, and
release steps still govern settlement.
