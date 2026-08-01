---
name: fund-wallet
description: Create or inspect an ArcLancer wallet and guide the user through funding it with Arc Testnet USDC. Use when the user asks for a wallet, deposit address, balance, test funds, or wallet funding help.
---

# Fund an ArcLancer wallet

Use the ArcLancer MCP tools to provide an in-chat funding workflow.

1. Call `create_wallet` when the user does not yet have a linked Circle Programmable Wallet.
2. Call `check_balance` or `wallet_balance` and report the current balance and network.
3. On Arc Testnet, ask for explicit approval and call `fund_wallet` to request test USDC directly from Circle. Do not ask the user to copy an address into a public faucet.
4. On mainnet, `fund_wallet` returns a Circle Payment Gateway checkout URL. Present the URL and explain that payment must be completed by the user.
5. After funding, call `check_balance` again. Report only the balance returned by the tool and note that finality can take time.

Never request or reveal private keys, seed phrases, one-time codes, or wallet recovery material. Do not tell the user to send mainnet USDC to a testnet address.
