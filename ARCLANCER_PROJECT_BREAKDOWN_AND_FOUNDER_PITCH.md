# ArcLancer Project Breakdown and Founder Pitch

## Executive Summary

ArcLancer is a low-fee, stablecoin-native freelance escrow platform built on Arc Network. It helps freelancers and clients create milestone-based work agreements, fund escrow in USDC, submit deliverables, approve milestones, release payments, and resolve disputes without relying on a traditional high-fee marketplace.

The simple pitch:

> ArcLancer lets global freelancers keep 98% of what they earn, get paid instantly, and avoid platform fees, payment holds, and foreign exchange markups.

The deeper platform vision:

> ArcLancer is commerce infrastructure for both human freelancers and AI agents. It gives workers, clients, and autonomous agents the primitives they need to transact: identity, wallets, escrow, deliverables, approvals, disputes, reputation, and stablecoin settlement.

ArcLancer has two major product surfaces:

- A wallet-connected web app for creating, managing, funding, and settling escrow contracts.
- A Telegram-native Deal Copilot that lets users draft and execute freelance deals directly from chat.

The project is currently Arc Testnet focused and has substantial MVP implementation across frontend, smart contracts, Telegram bot flows, server-side wallet execution, and early agent-commerce infrastructure.

---

## Founder Pitch

Freelancers lose a painful share of their income to platforms that charge high fees, hold payments for days or weeks, and add hidden foreign exchange costs. A designer earning $5,000 on a traditional platform can lose more than $1,000 before the money ever reaches their bank.

ArcLancer changes that.

We are building the trust and payment layer for global freelance work. Clients can create milestone contracts, fund escrow in stablecoins, and release payment only when work is delivered. Freelancers get instant settlement, transparent fees, and the ability to receive payouts in local currency. The platform takes 2%, not 20%.

But the bigger unlock is where this goes next.

Freelance work is becoming increasingly agentic. Humans will hire AI agents. AI agents will hire other AI agents. Teams will coordinate work through chat, tools, and autonomous services. These agents need wallets, identities, reputation, job contracts, payments, and dispute rules.

ArcLancer starts with human freelancers, but it is designed to become the commercial operating system for agentic work.

In one sentence:

> ArcLancer is Upwork rebuilt for the stablecoin and AI-agent era.

---

## The Problem

Traditional freelance platforms solve trust, but at a high cost.

Common pain points:

- High platform fees, often around 10% to 20%.
- Long payment holds after work is approved.
- Foreign exchange markups for international freelancers.
- Withdrawal fees and slow bank rails.
- Platform custody of user funds.
- Poor protection when a client ghosts after work is submitted.
- Limited portability of reputation and work history.

For many freelancers, especially outside the US, the total cost is not just a platform fee. It is platform fee plus FX spread plus withdrawal fee plus payment delay.

ArcLancer's wedge is direct:

- Keep 98% of what you earn.
- Use milestone escrow instead of trust-based invoicing.
- Settle instantly in stablecoins.
- Convert into local currency with transparent rates.
- Use chat-native workflows instead of complex crypto UX.

---

## Product Overview

ArcLancer combines four layers:

1. Freelance escrow marketplace
2. Stablecoin payment infrastructure
3. Telegram AI Deal Copilot
4. Agent commerce and AI worker infrastructure

At the user level, it feels like a simple workflow:

1. Client and freelancer agree on a job.
2. Client creates a milestone contract.
3. Client funds escrow.
4. Freelancer submits deliverables.
5. Client approves work.
6. Payment is released instantly.
7. If the client does not respond, auto-approval can protect the freelancer.
8. If there is a conflict, the contract can enter dispute.

Under the hood, the workflow is powered by smart contracts on Arc Network, USDC settlement, optional StableFX conversion, and a frontend/backend stack that abstracts the blockchain details.

---

## Product Surfaces

### 1. Web App

The web app is the wallet-connected interface for users who want a more traditional dashboard experience.

Key routes:

- `/` - Marketing landing page and product positioning.
- `/create` - Contract creation flow.
- `/contract/[id]` - Individual escrow contract detail page.
- `/dashboard` - User dashboard for contracts, pending actions, escrow, and withdrawals.
- `/dashboard/client` - Client-specific dashboard surface.
- `/dashboard/freelancer` - Freelancer-specific dashboard surface.

The web app supports:

- Wallet connection through RainbowKit and wagmi.
- Arc Testnet configuration.
- Contract creation through `EscrowFactory`.
- USDC approval flows.
- Escrow funding.
- Milestone viewing.
- Deliverable submission.
- Milestone approval.
- Payment release.
- Auto-approval.
- Disputes and cancellation.
- Dashboard aggregation from on-chain state.

### 2. Telegram Deal Copilot

The Telegram bot is the more differentiated experience. It lets users manage freelance deals without leaving Telegram.

Core commands include:

- `/wallet` - Create or view a bot-managed wallet.
- `/balance` - Check USDC balance.
- `/deposit` - Get a deposit address.
- `/export` - Export private key.
- `/startdeal` - Start a guided deal draft.
- `/summary` - Review current deal draft.
- `/create` - Deploy an escrow contract.
- `/fund` - Fund an escrow contract.
- `/submit 1 <url>` - Submit milestone deliverable.
- `/approve 1` - Approve a milestone.
- `/withdraw 1` - Release payment.
- `/dispute` - Initiate dispute.
- `/cancel` - Cancel a contract before completion.
- `/status 0x...` - View contract status.
- `/mycontracts 0x...` - List contracts for a wallet.

The bot can:

- Generate encrypted server-side wallets.
- Store user state in Redis-compatible storage.
- Draft milestone contracts.
- Execute transactions using viem.
- Notify freelancers when contracts or funding events happen.
- Bridge Telegram drafts into the web app with signed draft tokens.

### 3. Hybrid Telegram to Web Flow

ArcLancer supports a hybrid UX:

1. User drafts a deal in Telegram.
2. Telegram bot creates a signed draft token.
3. User opens the web app with `?draft=...`.
4. The `/create` page resolves the draft and prefills the contract form.
5. User signs the final transaction with their connected wallet.

This is important because it supports both:

- Fully chat-native flows where the bot signs with an encrypted server-side wallet.
- Safer web-wallet flows where the user signs directly from their own wallet.

---

## Smart Contract System

The smart contracts live in `contracts/src`.

### EscrowFactory

File: `contracts/src/EscrowFactory.sol`

`EscrowFactory` is the contract factory and business model layer.

Responsibilities:

- Deploy new `EscrowContract` instances.
- Calculate and collect platform fees.
- Track contracts by user.
- Store all deployed contract addresses.
- Manage fee collector.
- Manage platform fee percentage.
- Manage StableFX contract address.
- Allow owner to pause contract creation.

The default platform fee is 200 basis points, equal to 2%.

The factory collects this fee at contract creation. The remaining net amount becomes the escrow amount assigned across milestones.

### EscrowContract

File: `contracts/src/EscrowContract.sol`

`EscrowContract` represents one freelance agreement.

It stores:

- Client address.
- Freelancer address.
- USDC token address.
- Factory address.
- Payout currency.
- Total amount.
- Total paid.
- Funding status.
- Contract status.
- Arbitrator address.
- StableFX contract reference.
- Milestone list.

Milestones contain:

- Amount.
- Description.
- Deliverable URI.
- Submitted status.
- Approved status.
- Paid status.
- Submission timestamp.
- Approval timestamp.

Main actions:

- `fundContract()` - Client funds the escrow.
- `submitMilestone()` - Freelancer submits a deliverable.
- `approveMilestone()` - Client approves submitted work.
- `autoApproveMilestone()` - Approves after the review window.
- `releaseMilestonePayment()` - Releases funds to the freelancer.
- `initiateDispute()` - Moves contract into disputed state.
- `cancelContract()` - Cancels contract where allowed.
- `changePayoutCurrency()` - Lets payout currency be updated.
- `previewConversion()` - Previews StableFX conversion output.

Security patterns:

- Uses OpenZeppelin `ReentrancyGuard`.
- Uses OpenZeppelin `Pausable`.
- Uses `SafeERC20`.
- Restricts actions by client, freelancer, or participant role.
- Tracks contract state to prevent invalid lifecycle transitions.

### AgentRegistry

File: `contracts/src/AgentRegistry.sol`

`AgentRegistry` is the beginning of ArcLancer's agent-commerce layer.

It lets users register AI agents as ERC-721 identities.

Each agent has:

- Name.
- Skill.
- Tool name.
- Task fee.
- Active status.

Why this matters:

If AI agents are going to perform paid work, they need more than a prompt. They need identity, ownership, pricing, discoverability, and the ability to be hired.

`AgentRegistry` gives ArcLancer an early primitive for agent identity and agent marketplace mechanics.

---

## Agentic Side of ArcLancer

The agentic side is one of the most important strategic parts of the project.

ArcLancer is not only a freelance escrow product. It is also an early attempt at a transaction layer for autonomous AI work.

The core thesis:

> AI agents can generate work, but they still need commercial infrastructure. ArcLancer gives agents a way to be identified, hired, paid, evaluated, and disputed.

### AI Deal Copilot

The Deal Copilot is an AI-powered Telegram assistant designed to convert natural language into structured escrow workflows.

Example target experience:

> "I want to hire this designer for 500 USDC. Pay 200 upfront and 300 on completion."

The copilot should understand:

- Who is being hired.
- Total contract amount.
- Milestone split.
- Payout currency.
- Required contract fields.
- Whether a wallet exists.
- Whether the user has enough balance.
- Which on-chain action should happen next.

Instead of a user filling out a complex form, the AI agent guides them through the deal.

### Tool-Calling Agent Runtime

The codebase includes a ReAct-style tool-calling agent loop.

Relevant files:

- `frontend/src/lib/dealCopilot/agent.ts`
- `frontend/src/lib/dealCopilot/agentTools.ts`
- `frontend/src/lib/dealCopilot/agentPrompt.ts`

This makes the AI more than a chatbot. It can call tools that interact with the rest of the system.

Agent tools include capabilities around:

- Creating wallets.
- Checking balances.
- Getting deposit addresses.
- Creating deal drafts.
- Showing summaries.
- Editing draft fields.
- Looking up contract status.
- Listing user contracts.
- Registering agent identity.
- Looking up agent identity.
- Reading agentic job information.

The strategic difference:

- A normal chatbot answers questions.
- ArcLancer's agent can prepare and execute commercial actions.

### On-Chain Agent Identity

The agent identity layer means an AI agent can become a first-class market participant.

Instead of agents being temporary API calls, they can have:

- Persistent identity.
- Owner.
- Skill profile.
- Fee schedule.
- Active or inactive status.
- Potential reputation in future versions.

This creates the foundation for an agent marketplace.

### Agentic Jobs

The project references ERC-8004 and ERC-8183 style infrastructure.

The practical idea:

- Agents can have on-chain identity.
- Agents can create jobs.
- Agents can accept jobs.
- Agents can be paid.
- Agents can establish reputation.

This opens a path to machine-to-machine freelance work.

Example:

1. A client asks for a landing page.
2. A project manager agent breaks the work into subtasks.
3. A design agent creates mockups.
4. A frontend agent builds the page.
5. An auditor agent reviews the output.
6. Each agent is paid through escrow.

ArcLancer becomes the settlement and coordination layer underneath that workflow.

### OpenClaw Auditor Worker

The repo contains a backend worker plugin for ArcLancer auditing.

Relevant area:

- `backend/worker/plugins/arclancer-auditor`
- `frontend/src/lib/dealCopilot/openclawDispatch.ts`

This suggests a design where heavy tasks can be dispatched outside the Telegram request lifecycle.

Potential use cases:

- Smart contract audits.
- Deliverable verification.
- Code quality review.
- AI-generated work validation.
- Security analysis.

This is important because agents often need external tools. A Telegram bot should not run heavy analysis directly inside a short webhook request. The worker path allows longer-running agent tasks.

### Agentic Founder Pitch

The agentic founder pitch:

> Today's AI agents can talk, but they cannot reliably transact. ArcLancer gives agents a commercial operating system: identity, wallets, escrow, job contracts, deliverables, approvals, disputes, and payouts.

The human freelancer product is the wedge.

The bigger vision is:

> ArcLancer becomes the settlement layer for human and AI labor.

---

## Architecture

High-level architecture:

```text
User
  |
  | Web app or Telegram
  v
Next.js frontend and API routes
  |
  | wagmi / viem
  v
Arc Testnet
  |
  | EscrowFactory deploys
  v
EscrowContract per freelance deal
```

Telegram-specific architecture:

```text
Telegram user
  |
  v
Telegram webhook route
  |
  +--> Command router
  +--> Deal drafting state machine
  +--> AI agent loop
  +--> Wallet manager
  +--> Transaction executor
  |
  v
Redis-compatible storage
  |
  v
Arc Network transactions through viem
```

Agent/worker architecture:

```text
User or AI request
  |
  v
Deal Copilot agent
  |
  +--> lightweight tools
  +--> wallet tools
  +--> chain read tools
  +--> escrow execution tools
  +--> agent registry tools
  |
  +--> heavy task dispatch
          |
          v
        OpenClaw worker
          |
          v
        audit / analysis result
```

---

## Key Technologies

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- RainbowKit
- wagmi
- viem
- React Query
- React Hook Form
- Zod

### Smart Contracts

- Solidity `^0.8.20`
- Hardhat
- OpenZeppelin
- ethers v6
- TypeChain

### Chain

- Arc Testnet
- Chain ID: `5042002`
- USDC as native/stable gas context
- ArcScan explorer

### Storage

- Upstash Redis recommended
- Memory fallback for local/dev mode
- Encrypted wallet storage
- Deal draft state
- Agent conversation state

### Telegram

- Telegram bot webhook
- Inline buttons
- Command routing
- Chat-native deal drafting
- Bot-managed wallets

### AI

- ReAct-style tool-calling loop
- LLM-backed deal copilot
- BYOK/server-key style evolution in docs/code
- DigitalOcean/OpenRouter-related inference paths
- Tool execution bridge

### File/Deliverable Storage

- IPFS-style deliverable URIs
- Pinata integration in frontend library

### Agent Infrastructure

- Agent registry contract
- Agent identity and task fee model
- OpenClaw worker plugin
- Early ERC-8004 / ERC-8183 positioning

---

## Web App Breakdown

### Landing Page

File: `frontend/src/app/page.tsx`

The homepage positions ArcLancer around freelancer economics.

Key messages:

- "Keep 98% of what you earn."
- 2% platform fee.
- Instant settlement.
- Local currency payouts.
- Milestone escrow.
- Auto-approval protection.
- Privacy-first transactions.
- Comparison against Upwork, Fiverr, and traditional payments.

This page is pitch-heavy and designed to make the pain obvious.

### Contract Creation

File: `frontend/src/app/create/CreateContractClient.tsx`

Users can:

- Connect wallet.
- Enter freelancer address.
- Enter total amount.
- Select payout currency.
- Add milestones.
- See fee and net amount.
- Ensure milestone totals match net payout.
- Approve USDC.
- Create the escrow contract.

The flow also supports prefilling from a Telegram draft token.

### Contract Detail Page

File: `frontend/src/app/contract/[id]/page.tsx`

Users can:

- View contract details.
- See client/freelancer role.
- See milestone progress.
- Fund the contract.
- Submit deliverables.
- Approve milestones.
- Release milestone payments.
- Auto-approve when eligible.
- Initiate dispute.
- Cancel where applicable.
- View timeline and deliverables.

### Dashboard

File: `frontend/src/app/dashboard/page.tsx`

The dashboard aggregates:

- Total contracts.
- Active contracts.
- Funds in escrow.
- Available withdrawals.
- Pending actions.
- Active disputes.
- Completed contracts.
- Recent payout information.

It reads on-chain data through hooks and contract calls.

---

## Telegram Deal Copilot Breakdown

Key files:

- `frontend/src/app/api/telegram/deal-copilot/route.ts`
- `frontend/src/lib/dealCopilot/engine.ts`
- `frontend/src/lib/dealCopilot/agent.ts`
- `frontend/src/lib/dealCopilot/agentTools.ts`
- `frontend/src/lib/dealCopilot/executor.ts`
- `frontend/src/lib/dealCopilot/wallet.ts`
- `frontend/src/lib/dealCopilot/chain.ts`
- `frontend/src/lib/dealCopilot/storage.ts`
- `frontend/src/lib/dealCopilot/telegram.ts`

### State Machine

The state machine supports guided command-based deal creation.

It handles:

- Starting new drafts.
- Asking for missing fields.
- Editing fields.
- Reviewing summary.
- Validating milestone totals.
- Creating signed draft links.
- Resetting drafts.

This gives users a deterministic fallback even if the AI layer is unavailable.

### AI Agent Loop

The AI agent loop stores conversation history and uses tools to act on the user's behalf.

It can interpret natural language, call structured tools, and return a user-facing Telegram reply.

This is the foundation for chat-native escrow.

### Wallet Management

The Telegram bot can create a wallet for a user.

Security model:

- Private keys generated server-side.
- Private keys encrypted with AES-256-GCM.
- Encryption key derived from `WALLET_ENCRYPTION_SECRET` and Telegram user ID.
- Encrypted wallet stored in JSON store.
- User can export the private key.
- Sensitive seed/private-key input detection warns users and refuses processing.

This creates convenience, but it is a different trust model from web-wallet signing. The product should communicate this clearly in production.

### Transaction Executor

The executor signs and sends transactions for bot-managed wallets.

It supports:

- Balance checks.
- USDC transfers.
- USDC approvals.
- Escrow contract creation.
- Escrow funding.
- Milestone submission.
- Milestone approval.
- Payment release.
- Dispute initiation.
- Cancellation.
- Agent deployment/registration.

---

## Stablecoin and FX Strategy

ArcLancer is built around stablecoin settlement.

Core idea:

- Client pays in USDC.
- Contract holds stablecoin escrow.
- Freelancer can choose payout currency.
- StableFX-style conversion can preview or execute local/stable currency payouts.

Supported or planned currency codes in the frontend include:

- USDC
- EURC
- BRLA
- MXNB
- QCAD
- AUDF
- JPYC
- KRW1
- PHPC

The code includes mock fallback FX rates for development and cases where on-chain StableFX is unavailable.

Founder framing:

> Freelancers should not lose 5% just to receive money in the currency they actually spend. ArcLancer uses stablecoin rails and transparent conversion to make global freelance work economically fairer.

---

## Business Model

### Primary Revenue

ArcLancer charges a 2% platform fee on contract creation.

This is implemented in `EscrowFactory.sol` through `platformFeePercentage = 200`.

Why this works:

- It is much lower than traditional platforms.
- It is transparent.
- It is collected programmatically.
- It scales with contract volume.
- It does not require custodial control over the full work payment.

### Additional Revenue Opportunities

Potential expansion:

- StableFX or currency conversion spread.
- Premium dispute resolution.
- AI agent marketplace fees.
- Smart contract audit fees.
- Agent verification and reputation products.
- B2B escrow infrastructure.
- White-label Telegram escrow bots for agencies and communities.
- SaaS dashboard for teams managing multiple contractors.

---

## Market Positioning

ArcLancer can be positioned in several ways.

### Against Upwork/Fiverr

ArcLancer is cheaper, faster, and more transparent.

Message:

> Keep 98%, not 75%.

### Against Traditional Invoicing

ArcLancer gives freelancers payment certainty.

Message:

> No more "I'll pay next week." The money is already in escrow.

### Against Crypto Wallet Complexity

ArcLancer hides crypto behind Telegram and familiar workflows.

Message:

> You do not need to understand blockchain. Client pays, you deliver, you get paid.

### Against Generic AI Agent Platforms

ArcLancer focuses on transactions, not just task execution.

Message:

> Agents need to get paid. ArcLancer gives them wallets, identity, escrow, and settlement.

---

## Competitive Advantages

Potential strengths:

- Clear fee wedge: 2% vs traditional 10% to 20% marketplace fees.
- Stablecoin-native settlement.
- Arc Network alignment.
- Telegram-native UX for global users.
- Web and chat surfaces.
- Non-custodial smart contract escrow.
- Auto-approval protection.
- Multi-currency payout story.
- Agent identity and agent marketplace direction.
- Worker architecture for heavier AI tasks.

---

## Current State and Caveats

The project appears to be an active MVP/prototype rather than a fully mature production platform.

Implemented or substantially present:

- Next.js frontend.
- Landing page.
- Wallet connection.
- Contract creation UI.
- Contract detail UI.
- Dashboard UI.
- Solidity escrow factory.
- Solidity escrow contract.
- Agent registry contract.
- Telegram webhook route.
- Telegram command flow.
- Encrypted bot-managed wallets.
- Server-side viem transaction execution.
- Deal draft state machine.
- AI agent tool-calling framework.
- StableFX-style rate preview fallback.
- OpenClaw auditor plugin direction.

Work-in-progress or needs caution:

- Arc Testnet focus, not clearly mainnet production.
- Some dashboard and homepage metrics appear illustrative.
- StableFX rates include mock fallbacks.
- AI copilot reliability/authentication has been a documented blocker in project notes.
- Telegram server-side wallets improve UX but introduce custody/trust considerations.
- Agentic ERC-8004 / ERC-8183 workflows look partly aspirational or early-stage.
- Dispute resolution needs operational policy beyond smart contract state.
- Production security review would be essential before handling real user funds.

---

## Key Files

### Product and Documentation

- `ArcLancer_Product_Walkthrough.md`
- `frontend/TELEGRAM_DEAL_COPILOT.md`
- `frontend/README.md`
- `DEPLOYMENT.md`
- `GO_LIVE.md`
- `QUICK_DEPLOY.md`

### Frontend

- `frontend/src/app/page.tsx`
- `frontend/src/app/create/CreateContractClient.tsx`
- `frontend/src/app/contract/[id]/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/lib/wagmi.ts`
- `frontend/src/lib/contracts.ts`

### Hooks and UI

- `frontend/src/hooks/useContracts.ts`
- `frontend/src/hooks/useEscrow.ts`
- `frontend/src/hooks/useDashboardData.ts`
- `frontend/src/hooks/useStableFX.ts`
- `frontend/src/components/contracts`
- `frontend/src/components/dashboard`

### Telegram and Agent System

- `frontend/src/app/api/telegram/deal-copilot/route.ts`
- `frontend/src/lib/dealCopilot/engine.ts`
- `frontend/src/lib/dealCopilot/agent.ts`
- `frontend/src/lib/dealCopilot/agentPrompt.ts`
- `frontend/src/lib/dealCopilot/agentTools.ts`
- `frontend/src/lib/dealCopilot/executor.ts`
- `frontend/src/lib/dealCopilot/wallet.ts`
- `frontend/src/lib/dealCopilot/chain.ts`
- `frontend/src/lib/dealCopilot/storage.ts`
- `frontend/src/lib/dealCopilot/telegram.ts`
- `frontend/src/lib/dealCopilot/arcAgent.ts`
- `frontend/src/lib/dealCopilot/openclawDispatch.ts`

### Smart Contracts

- `contracts/src/EscrowFactory.sol`
- `contracts/src/EscrowContract.sol`
- `contracts/src/AgentRegistry.sol`
- `contracts/src/interfaces/IStableFX.sol`
- `contracts/src/mocks/MockUSDC.sol`
- `contracts/src/mocks/MockStableFX.sol`
- `contracts/test/Escrow.test.ts`
- `contracts/scripts/deploy.ts`

### Worker

- `backend/worker/plugins/arclancer-auditor/package.json`

---

## Investor-Style Narrative

ArcLancer starts with a painful and obvious market problem: freelancers are overcharged and underprotected. The product gives them a simple promise: keep more of your money and get paid faster.

The first product is a 2% milestone escrow platform powered by stablecoins. That alone is a strong wedge against traditional freelance marketplaces.

The second product surface is Telegram. This matters because many freelance relationships already start in chat. ArcLancer turns that chat into an executable contract workflow.

The third and most ambitious layer is agent commerce. As AI agents begin doing real work, they will need the same primitives as freelancers: identity, job scope, pricing, escrow, delivery, approval, and payout. ArcLancer is already laying the groundwork for that through agent registration, tool-calling workflows, and worker-based task execution.

In the short term, ArcLancer can win on fees and payment speed.

In the long term, ArcLancer can become the payment and trust layer for human and machine labor.

---

## Short Pitch

ArcLancer is a 2% freelance escrow platform built on Arc Network. Clients create milestone contracts, fund escrow in USDC, and release payments when work is approved. Freelancers get instant settlement, lower fees, and local-currency payout options.

The product works through both a wallet-connected web app and a Telegram Deal Copilot, so users can manage work agreements directly from chat.

Long term, ArcLancer expands from human freelance escrow into agent commerce: AI agents with on-chain identity, task fees, wallets, deliverables, and stablecoin settlement.

---

## 30-Second Founder Pitch

Freelancers lose too much money to platforms that charge 20%, hold payments, and hide FX costs. ArcLancer is a 2% milestone escrow platform on Arc Network that lets clients fund work in USDC and lets freelancers get paid instantly when milestones are approved.

We meet users where they already negotiate work: Telegram. Our Deal Copilot turns chat into structured escrow contracts, and our web app gives users a full dashboard for funding, delivery, approvals, disputes, and withdrawals.

The bigger opportunity is agent commerce. AI agents will need identity, wallets, pricing, escrow, deliverables, reputation, and payouts. ArcLancer is building that settlement layer for both human and AI labor.

---

## One-Liner

ArcLancer is Upwork rebuilt for stablecoins and AI agents: 2% fees, milestone escrow, instant settlement, Telegram-native deal creation, and on-chain infrastructure for human and machine work.
