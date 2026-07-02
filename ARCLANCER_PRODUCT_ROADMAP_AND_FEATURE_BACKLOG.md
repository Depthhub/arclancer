# ArcLancer Product Roadmap and Feature Backlog

## Overview

This document lists the major things ArcLancer should work on next, including current product stabilization, new Circle/Arc features, web2 payment gateway support, marketplace expansion, agent-commerce features, security, operations, and documentation.

ArcLancer already has a strong MVP foundation:

- Smart contracts for milestone escrow.
- A Next.js web app.
- Contract creation and dashboard flows.
- Telegram Deal Copilot commands.
- Bot-managed encrypted wallets.
- Arc Testnet integration.
- Circle/stablecoin payment direction.
- Early AI-agent identity and commerce infrastructure.

The next stage is turning this from a promising MVP into a more standard, production-ready product.

---

## 1. Current Core Product To Stabilize

These are the most important things to fix, harden, or polish before adding too much new scope.

### Smart Contract Layer

Work needed:

- Expand tests for `EscrowFactory`, `EscrowContract`, and `AgentRegistry`.
- Test the full escrow lifecycle: create, fund, submit, approve, withdraw, dispute, cancel, and auto-approve.
- Add edge case tests for wrong callers, duplicate payments, milestone mismatch, zero amounts, invalid addresses, expired states, and reentrancy-sensitive flows.
- Prepare contracts for external audit.
- Review fee logic carefully: gross contract amount, 2% platform fee, and net milestone amount.
- Improve dispute resolution beyond only entering `DISPUTED` state.
- Add clearer events for frontend indexing, analytics, and explorer visibility.
- Decide whether contracts should be immutable or whether a future upgrade strategy is needed.

Why it matters:

ArcLancer handles user funds. The smart contracts are the foundation of trust. Before mainnet or public beta, the contract layer needs strong tests, clear invariants, and audit readiness.

### Frontend Web App

Work needed:

- Clean up dashboard placeholder/demo values.
- Improve transaction status UI.
- Add better error messages for failed approvals, funding, contract creation, and withdrawals.
- Improve mobile responsiveness.
- Improve onboarding for users who do not understand wallets.
- Add clearer Arc Testnet/Mainnet network detection.
- Add faucet/onboarding links for testnet users.
- Add better contract sharing links for clients and freelancers.
- Add notifications when a milestone needs action.
- Make the contract lifecycle obvious to first-time users.

Why it matters:

The web app should make escrow feel simple. Users should not need to understand smart contracts, gas, RPCs, or token allowances to complete a deal.

### Telegram Deal Copilot

Work needed:

- Make Telegram webhook handling idempotent so duplicate Telegram retries do not create duplicate transactions.
- Improve bot command reliability.
- Improve wallet export warnings and safety language.
- Add clearer confirmation before any on-chain transaction.
- Add transaction progress updates.
- Improve AI fallback when the LLM fails.
- Separate "AI suggestion" from "transaction execution" clearly.
- Add admin/debug commands for testing.
- Add better Telegram inline button flows for funding, submitting, approving, and withdrawing.

Why it matters:

Telegram is one of ArcLancer's biggest differentiators. It lets users create and manage escrow from chat, but chat-native financial actions must be extremely reliable and safe.

### Wallet and Security

Work needed:

- Review the server-side Telegram wallet model seriously.
- Add rate limits.
- Add anti-spam protection.
- Add stricter webhook verification.
- Improve secret management.
- Add monitoring for failed transactions.
- Add audit logs for sensitive actions.
- Add optional user-owned wallet flow inside Telegram through a signed web handoff.
- Make it clear when the user is using a self-custody wallet versus a bot-managed wallet.

Why it matters:

Bot-managed wallets improve UX, but they create a sensitive trust and security surface. This part needs careful review before real-money use.

---

## 2. Arc and Circle Features To Add

These are especially important for the Circle/Arc grant story.

### Circle CCTP

Add Circle Cross-Chain Transfer Protocol support.

Use cases:

- A client has USDC on another chain.
- ArcLancer helps bridge USDC into Arc.
- The user can fund escrow on Arc after CCTP transfer.
- A freelancer can withdraw USDC from Arc to another supported chain.

Possible product flow:

1. User selects source chain.
2. User sends USDC through CCTP.
3. ArcLancer detects completion.
4. Funds become available on Arc.
5. User creates or funds an escrow contract.

Why it matters:

- Reduces onboarding friction.
- Lets users bring liquidity from other ecosystems.
- Makes ArcLancer more useful beyond only Arc-native users.
- Gives Circle grant reviewers a direct Circle infrastructure use case.

### Circle Wallets or Programmable Wallets

Potential future integration:

- Embedded wallets for web2 users.
- Email or social login.
- Safer wallet onboarding.
- Sponsored or abstracted transaction flows.
- Alternative to fully custom bot-managed wallets.

Why it matters:

Most freelancers and clients are not crypto-native. Embedded wallet infrastructure can make ArcLancer feel like a normal fintech app while still settling on-chain.

### Circle Payment Gateway For Web2 Users

This is a major feature.

Goal:

Let non-crypto clients pay invoices or contracts with familiar payment methods while the freelancer receives stablecoin escrow.

Possible flow:

1. Client creates or receives a contract without needing a wallet.
2. Client pays using card, bank transfer, or checkout.
3. Payment is converted or settled into USDC.
4. Escrow contract is funded on Arc.
5. Freelancer receives USDC or a supported local currency payout.

Why it matters:

This makes ArcLancer usable by normal businesses. A freelancer should be able to send an escrow payment link to a client who has never used crypto.

### StableFX and Multi-Currency Payouts

Improve the current mock/fallback payout flow into real production logic.

Work needed:

- Real rate quotes.
- Payout currency selector.
- Conversion preview.
- Fee transparency.
- Settlement confirmation.
- Supported local stablecoins/currencies.
- Clear difference between testnet mocks and real production rates.

Why it matters:

One of ArcLancer's strongest promises is global freelancer payment. Freelancers care about what lands in their usable currency, not just the USDC amount.

---

## 3. Web2-Friendly User Experience

This is crucial if ArcLancer wants real freelancers and clients to use it.

### No-Wallet Client Mode

Clients should be able to:

- Create a contract with email.
- Pay with card, bank, or checkout.
- Track contract status from a simple link.
- Approve milestones without understanding crypto.
- Receive email or Telegram reminders when action is needed.

Why it matters:

Many clients will not connect a wallet just to hire a freelancer. The client-side experience should feel close to paying an invoice.

### Freelancer Wallet Abstraction

Freelancers should be able to:

- Sign up with Telegram or email.
- Receive a wallet automatically or connect their own.
- See balances in local currency.
- Withdraw to bank or mobile money where possible.
- Understand their custody model clearly.

Why it matters:

The freelancer should experience ArcLancer as "I got paid faster and kept more money," not as "I learned blockchain."

### Payment Links

Add payment links like:

```text
arclancer.app/pay/contract/123
```

Use cases:

- Freelancer sends a client a payment link.
- Client pays into escrow.
- Client does not need deep wallet knowledge.
- Contract funding becomes shareable and simple.

### Invoices

Add invoice-style contracts:

- Client name.
- Freelancer name.
- Work description.
- Milestones.
- Due dates.
- Payment status.
- Downloadable PDF.
- Shareable link.
- Escrow funding status.

Why it matters:

Invoices are familiar to web2 users. ArcLancer can hide the smart contract underneath a normal invoice-like experience.

---

## 4. Marketplace Features

Right now ArcLancer is mostly escrow infrastructure. A marketplace would add discovery, demand, and network effects.

### Freelancer Profiles

Add:

- Profile page.
- Skills.
- Location.
- Portfolio.
- Wallet/reputation.
- Completed contracts.
- Average payout time.
- Reviews.
- Verification badges.
- Preferred payout currency.

Why it matters:

Profiles turn ArcLancer from a payment tool into a place where clients can discover and trust workers.

### Job Marketplace

Add:

- Clients post jobs.
- Freelancers apply.
- Client hires freelancer.
- ArcLancer auto-creates escrow.
- Milestones are generated from job scope.
- Payments flow through Arc escrow.

Why it matters:

Escrow is useful, but marketplace demand is what can make ArcLancer grow beyond a tool.

### Search and Discovery

Add:

- Search by skill.
- Filter by location.
- Filter by rate.
- Filter by reputation.
- Filter by agent or human worker.
- Filter by verified profile.

### Reviews and Reputation

Add:

- On-chain or hybrid reputation.
- Completed contract count.
- Dispute rate.
- Payment reliability.
- Freelancer delivery score.
- Client approval speed.
- Agent task success rate.

Why it matters:

Reputation is one of the hardest things to port across platforms. ArcLancer can build portable credibility around completed escrow contracts.

### Agencies and Teams

Add:

- Agency profiles.
- Multi-freelancer contracts.
- Team wallets.
- Revenue splits.
- Subcontracting.
- Project owner and contributor roles.

Why it matters:

Many freelance projects are handled by teams, agencies, or informal groups. Supporting this expands the product beyond one-client/one-freelancer deals.

---

## 5. Agent Marketplace Features

This is the future-facing part of ArcLancer.

### AI Agent Profiles

Extend `AgentRegistry` into a visible product.

Agent profiles could include:

- Agent name.
- Skill.
- Tools.
- Task fee.
- Owner.
- Availability.
- Past jobs.
- Success rate.
- Reviews.
- Verification status.

Why it matters:

If agents are going to be paid workers, users need to browse, compare, trust, and hire them.

### Hire An Agent Flow

User flow:

1. User browses agents.
2. User selects an agent.
3. User defines a task.
4. User funds escrow.
5. Agent submits deliverable.
6. User approves.
7. Agent gets paid.

Why it matters:

This turns ArcLancer from a human freelancer platform into a marketplace for autonomous work.

### Agent-To-Agent Jobs

Future flow:

1. A project manager agent receives a job.
2. It splits work into subtasks.
3. It hires design, code, research, or audit agents.
4. Each subtask uses escrow.
5. Final output returns to the human client.

Why it matters:

Agent-to-agent subcontracting is where ArcLancer can become infrastructure, not just an app.

### Agent Verification

Add:

- Tool verification.
- Output verification.
- Reputation.
- Staking or slashing.
- Human arbitration for disputed outputs.
- Agent audit logs.
- Proof of task completion.

Why it matters:

Autonomous work needs trust. Verification and accountability will be critical if AI agents are paid for real tasks.

---

## 6. Security and Trust Features

Because ArcLancer handles money, security is non-negotiable.

### Security Work

Needed:

- External smart contract audit.
- Backend/API security review.
- Telegram bot security review.
- Key management review.
- Threat model document.
- Bug bounty.
- Monitoring and alerting.
- Admin incident response plan.
- Deployment checklist.
- Testnet-to-mainnet launch checklist.

### User Trust

Add:

- Public contract addresses.
- Audit report page.
- Clear fee page.
- Clear dispute rules.
- Clear wallet custody explanation.
- Risk warnings for testnet/mainnet.
- Transaction explorer links.
- Status page.

Why it matters:

Users will not trust escrow unless the platform is transparent about how funds move, who controls keys, what fees are charged, and what happens during disputes.

---

## 7. Operations and Admin Tools

ArcLancer will need internal tools to manage the platform.

Add:

- Admin dashboard.
- Contract explorer.
- User lookup.
- Dispute management panel.
- Transaction failure logs.
- Telegram bot logs.
- Revenue dashboard.
- Grant reporting dashboard.
- StableFX/CCTP status monitor.
- Alerting for failed or stuck transactions.
- Basic support tooling.

Why it matters:

Production systems need operational visibility. Without internal tools, debugging user money flows becomes slow and risky.

---

## 8. Documentation and Developer Experience

For grants, developers, audits, and users, documentation matters a lot.

Add or improve:

- Updated root `README.md`.
- Frontend setup guide.
- Contracts setup guide.
- Telegram bot setup guide.
- Environment variable reference.
- Demo script.
- Architecture diagram.
- API route documentation.
- Smart contract lifecycle docs.
- Grant milestone docs.
- Security model docs.
- Custody model docs.
- Testnet demo walkthrough.

Why it matters:

Good docs make the project easier to review, easier to fund, easier to audit, and easier for new developers to contribute to.

---

## Suggested Priority Order

If prioritizing by practical value and grant readiness, the order should be:

1. Stabilize the current escrow lifecycle.
2. Expand smart contract tests.
3. Clean up web dashboard and contract pages.
4. Harden Telegram bot and wallet flow.
5. Add payment links.
6. Add web2 client checkout/payment gateway flow.
7. Add Circle CCTP onboarding and withdrawals.
8. Add real StableFX/multi-currency payout flow.
9. Add freelancer profiles.
10. Add marketplace/job board.
11. Add agent profiles and hire-agent flow.
12. Add agent-to-agent commerce.

---

## Best Near-Term Grant Roadmap

The strongest near-term grant roadmap is:

> ArcLancer will harden its current Arc-native escrow MVP, add Circle CCTP for cross-chain USDC onboarding, introduce web2 payment links for non-crypto clients, and expand into a marketplace for freelancers and AI agents.

This roadmap is strong because it connects:

- Current working MVP.
- Arc-native settlement.
- Circle USDC and CCTP utility.
- Web2 user onboarding.
- Marketplace expansion.
- AI-agent future.

---

## Recommended Grant-Focused Milestones

### Milestone 1: Core Escrow Stabilization

Deliverables:

- Clean up current escrow lifecycle.
- Improve web contract creation and dashboard flows.
- Expand smart contract tests.
- Improve transaction status and error handling.
- Produce a reliable testnet demo.

### Milestone 2: Security and Audit Readiness

Deliverables:

- Prepare contracts for review.
- Add lifecycle and edge-case tests.
- Create threat model.
- Review Telegram wallet security.
- Document custody model.

### Milestone 3: Circle and Arc Integrations

Deliverables:

- Add CCTP planning and/or prototype.
- Improve USDC onboarding.
- Improve ArcScan transaction transparency.
- Improve StableFX payout preview.
- Add clear Circle/Arc user flows in the app.

### Milestone 4: Web2 Payment Gateway

Deliverables:

- Add payment link flow.
- Add no-wallet client payment UX.
- Add invoice-like contract view.
- Prepare architecture for card/bank-to-USDC escrow funding.

### Milestone 5: Marketplace and Agent Commerce

Deliverables:

- Add freelancer profile structure.
- Add early marketplace/job board design.
- Add AI agent profile UX.
- Show hire-agent escrow demo.
- Extend `AgentRegistry` usage into a real product flow.

---

## Short Strategic Summary

ArcLancer should first become a reliable escrow product, then a web2-friendly payment gateway for freelance work, then a marketplace, and finally an agent-commerce network.

The practical path:

```text
Escrow MVP
  -> Security and reliability
  -> Circle CCTP and payment links
  -> Web2 client checkout
  -> Freelancer marketplace
  -> AI agent marketplace
  -> Agent-to-agent commerce infrastructure
```

The long-term vision:

> ArcLancer becomes the payment, escrow, and trust layer for global human and AI work.

