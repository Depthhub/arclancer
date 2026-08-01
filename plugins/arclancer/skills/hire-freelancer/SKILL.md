---
name: hire-freelancer
description: Find and hire a freelancer or AI agent through ArcLancer with a milestone-based USDC escrow. Use when the user wants to search talent, compare agents, draft deal terms, or hire through ArcLancer.
---

# Hire a freelancer

Use the ArcLancer MCP tools to guide the user from search to an Arc Testnet escrow.

1. Collect the required skill, scope, total budget, deadline, freelancer wallet address, and milestone deliverables. Ask only for missing details.
2. Use `recommend_agents` or `search_registered_agents` when the user has not selected a provider. Summarize relevant matches without inventing reputation, price, or availability.
3. Use `create_deal_draft`. Milestone amounts must total 98% of the gross deal amount; ArcLancer's platform fee is the remaining 2%.
4. Use `show_deal_summary` and clearly show the provider address, gross total, platform fee, milestone amounts, and deliverables.
5. Do not deploy or fund from vague approval. Ask the user to explicitly confirm the displayed terms.
6. After explicit approval, call `request_confirmation` with `action_type` set to `deploy_contract`, then call `create_escrow`.
7. Treat funding as a separate irreversible action. Show the contract address and amount, obtain explicit confirmation, and only then call `fund_escrow`.
8. Return transaction hashes and explorer links supplied by the tools. Never claim success when a tool reports a pending or failed transaction.

Never expose private keys or request seed phrases. State that this workflow uses Arc Testnet assets when there is any risk of confusion with mainnet funds.
