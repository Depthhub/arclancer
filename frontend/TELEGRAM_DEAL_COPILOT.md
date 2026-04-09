# Telegram Deal Copilot (ArcLancer) — Full In-Telegram Experience

Users NEVER leave Telegram. The bot manages wallets, drafts deals, deploys contracts, and executes the full escrow lifecycle — all via chat commands.

## Architecture

```
User sends command in Telegram
  → POST /api/telegram/deal-copilot (webhook)
  ├── /wallet         → wallet.ts: generate + encrypt private key → store in Redis
  ├── /balance        → executor.ts: readContract(balanceOf)
  ├── /startdeal      → engine.ts: conversational deal drafting
  ├── /create         → executor.ts: approve + createEscrowContract on-chain
  ├── /fund           → executor.ts: approve + fundContract on-chain
  ├── /submit 1 url   → executor.ts: submitMilestone on-chain
  ├── /approve 1      → executor.ts: approveMilestone on-chain
  ├── /withdraw 1     → executor.ts: releaseMilestonePayment on-chain
  ├── /status 0x...   → chain.ts: getContractDetails (read-only)
  └── /mycontracts    → chain.ts: getUserContracts (read-only)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ | Random string for webhook verification |
| `WALLET_ENCRYPTION_SECRET` | ✅ | AES-256 encryption key for private keys |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL (e.g. `https://arclancer.vercel.app`) |
| `DEAL_COPILOT_SECRET` | ✅ | HMAC signing key for draft tokens |
| `UPSTASH_REDIS_REST_URL` | Recommended | Redis for persistent state |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Redis auth token |
| `DEAL_COPILOT_TTL_SECONDS` | Optional | State TTL, default 3600 |

## All Bot Commands

### 👛 Wallet
| Command | Description |
|---------|-------------|
| `/wallet` | Create or view your bot-managed wallet |
| `/balance` | Check USDC balance |
| `/deposit` | Get your wallet address for deposits |
| `/export` | Export your private key (to MetaMask etc.) |

### 🤝 Deal Setup
| Command | Description |
|---------|-------------|
| `/startdeal` | Start a new deal draft |
| `/summary` | Show draft with edit buttons |
| `/create` | **Deploy escrow contract on-chain** |
| `/reset` | Reset the draft |

### ✏️ Editing
| Command | Example |
|---------|---------|
| `/edit currency` | `/edit currency EURC` |
| `/edit total` | `/edit total 5000` |
| `/edit address` | `/edit address 0x1234...` |
| `/edit milestone` | `/edit milestone 2 500 - New desc` |
| `/add milestone` | `/add milestone 300 - QA` |
| `/remove milestone` | `/remove milestone 3` |

### 💰 Contract Actions
| Command | Description |
|---------|-------------|
| `/fund` | Fund an escrow contract (auto-approves USDC) |
| `/submit 1 <url>` | Submit milestone with deliverable link |
| `/approve 1` | Approve a submitted milestone |
| `/withdraw 1` | Release milestone payment |
| `/dispute` | Initiate a dispute |
| `/cancel` | Cancel contract (before funding) |

### 🔍 Lookup
| Command | Description |
|---------|-------------|
| `/status 0x...` | Get on-chain contract status + milestones |
| `/mycontracts 0x...` | List all contracts for a wallet |

## Full User Flow (Never Leaves Telegram)

```
1. /wallet                    → Bot creates encrypted wallet
2. /deposit                   → User deposits USDC from faucet
3. /balance                   → Confirms USDC arrived
4. /startdeal                 → Bot asks: currency? amount? address? milestones?
5. /summary                   → Reviews draft, taps edit buttons if needed
6. /create                    → Bot deploys escrow contract on-chain
7. /fund                      → Bot funds the contract with user's USDC
8. /submit 1 https://...      → Freelancer submits milestone 1
9. /approve 1                 → Client approves milestone 1
10. /withdraw 1               → Payment released to freelancer
11. /status 0x...             → Check final contract status
```

## Security

### Wallet Encryption
- Private keys encrypted at rest using **AES-256-GCM**
- Encryption key derived via **scrypt** from `WALLET_ENCRYPTION_SECRET + telegramUserId`
- Each wallet has unique salt + IV — no key reuse
- Users can export their key anytime with `/export`

### Seed Phrase Detection
- If a user pastes a 12/24-word seed phrase or hex private key, the bot:
  - Shows a ⚠️ security warning
  - Does NOT process or store the message
  - Advises moving funds immediately

### Webhook
- All incoming requests verified via `x-telegram-bot-api-secret-token` header

## Key Files

```
src/lib/dealCopilot/
  ├── types.ts       — TypeScript interfaces
  ├── engine.ts      — State machine for deal drafting conversation
  ├── wallet.ts      — Wallet generation, AES-256-GCM encryption, storage
  ├── executor.ts    — Server-side viem wallet client, on-chain tx execution
  ├── chain.ts       — Read-only on-chain queries (status, contracts list)
  ├── crypto.ts      — HMAC signing for draft tokens
  ├── telegram.ts    — Telegram API (sendMessage, answerCallbackQuery)
  └── storage.ts     — JsonStore (Upstash Redis + memory fallback)

src/app/api/
  ├── telegram/deal-copilot/route.ts  — Webhook handler + command routing
  └── deal-drafts/resolve/route.ts    — Draft token resolver (legacy web flow)
```

## Notes / Limitations

- Draft state expires after TTL (default 1 hour); wallets persist ~1 year
- On-chain transactions may take a few seconds; bot sends "⏳ Working..." message
- If Upstash is not configured, wallet state uses in-memory storage (lost on cold start!)
- Bot does NOT custody funds — user controls the wallet and can export the key
- Transactions on Arc Testnet are free (gas is USDC)
