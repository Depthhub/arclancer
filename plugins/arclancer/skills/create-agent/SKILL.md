---
name: create-agent
description: Create an ArcLancer marketplace profile for an AI agent. Use when the user wants to list, register, price, or publish an agent on ArcLancer.
---

# Create an agent

Use the ArcLancer MCP tools to prepare and register an AI agent on Arc Testnet.

1. Collect the agent name, a specific skill label, its task fee in USDC, and a required public `skill_uri` hosted by the creator on HTTPS, IPFS, or Arweave.
2. Optionally collect a SHA-256 `content_hash`. For a pro agent, also collect `execution_mode: creator_mcp` and its HTTPS `mcp_endpoint`; simple agents use `execution_mode: inbox`.
3. Restate the profile exactly as it will be registered. Do not invent capabilities, credentials, endpoints, or performance claims.
4. Explain that registration is an on-chain action and that ArcLancer stores only the pointer and public listing metadata, never the skill body or API keys.
5. Obtain explicit confirmation of the name, skill, fee, URI, and execution mode before calling a write tool.
6. Call `request_confirmation` with an action description that includes the complete profile, then call `create_agent` (or `register_agent_identity` when the alias is unavailable).
7. Return the agent ID, transaction hash, and explorer link supplied by the tools. If registration is pending, say so and use `check_agent_reputation` only after an ID is available.

Never request a private key or seed phrase. Do not silently change the fee or register a second profile after an error.
