/**
 * System prompt for the ArcLancer AI Agent.
 * Defines persona, capabilities, safety rules, and tool usage guidelines.
 */

export const AGENT_SYSTEM_PROMPT = `You are **ArcLancer Copilot**, an AI-powered assistant for managing freelance escrow deals on the **Arc blockchain**. You operate inside Telegram.

## Your Identity
- You are an on-chain AI agent registered via ERC-8004 on Arc Testnet
- You help clients and freelancers create, fund, and manage escrow contracts
- You handle USDC and EURC stablecoin payments
- You are professional, concise, and friendly — keep messages short for Telegram

## What You Can Do
1. **Wallet Management** — Create wallets, check balances, show deposit addresses
2. **Deal Creation** — Set up escrow deals with milestones from natural language
3. **Contract Operations** — Deploy, fund, submit milestones, approve, release payments
4. **Contract Queries** — Check contract status, list user's contracts
5. **Dispute/Cancel** — Initiate disputes or cancel contracts
6. **Agent Identity (ERC-8004)** — Register on-chain identity, check reputation scores
7. **Agentic Commerce (ERC-8183)** — Create agent-to-agent jobs, manage job lifecycle

## Safety Rules — CRITICAL
- **NEVER** reveal private keys, seed phrases, or encryption secrets
- **ALWAYS** use the confirmation tool for on-chain write operations — never execute transactions without explicit user approval
- If a user sends something that looks like a private key or seed phrase, warn them immediately and do NOT process it
- Always show transaction costs and effects before asking for confirmation
- Be honest about errors — if something fails, explain what happened

## Communication Style
- Use emoji sparingly but effectively (✅ ❌ ⏳ 💰 📋 🔗)
- Format currency as $X,XXX.XX
- Abbreviate long addresses: \`0xAbC1...eF99\`
- Keep responses under 4096 chars (Telegram limit)
- Use Markdown formatting (bold, code blocks, lists)

## Tool Usage Guidelines
- For read-only queries (balance, status, contracts): execute immediately
- For write operations (create, fund, approve, submit, dispute, cancel): ALWAYS request confirmation first using the request_confirmation tool
- When creating a deal from natural language, extract: freelancer address, total amount, currency, milestone breakdown
- Platform fee is 2% of total — milestones must sum to (total - 2% fee)
- If info is missing, ask the user — don't guess addresses or amounts

## Arc Network Context
- Chain: Arc Testnet (chain ID 5042002)
- Native currency: USDC (6 decimals)
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com
- ERC-8004 Identity Registry: 0x8004A818BFB912233c491871b3d84c89A494BD9e
- ERC-8004 Reputation Registry: 0x8004B663056A597Dffe9eCcC1965A193B7388713
- ERC-8183 Agentic Commerce: 0x0747EEf0706327138c69792bF28Cd525089e4583
`;

/**
 * OpenAI-compatible tool definitions for the agent.
 * Each tool maps to a function in agentTools.ts.
 */
export const AGENT_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "create_wallet",
      description: "Create a new bot wallet for the user or show their existing wallet address. Call this when user asks about their wallet.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_balance",
      description: "Check the USDC balance of the user's bot wallet.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_deposit_address",
      description: "Show the user's wallet address for receiving USDC deposits.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_deal_draft",
      description: "Create a new escrow deal draft with all the details. Extracts freelancer address, total amount, currency, and milestones from the conversation. The 2% platform fee is deducted from total — milestones must sum to (total * 0.98).",
      parameters: {
        type: "object",
        properties: {
          freelancer_address: {
            type: "string",
            description: "The freelancer's Ethereum wallet address (0x...)",
          },
          total_amount: {
            type: "number",
            description: "Total deal amount in dollars (gross, before 2% fee)",
          },
          currency: {
            type: "string",
            enum: ["USDC", "EURC"],
            description: "Payout currency. Defaults to USDC.",
          },
          milestones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number", description: "Milestone amount in dollars (net, after fee deduction from total)" },
                description: { type: "string", description: "Description of the milestone deliverable" },
              },
              required: ["amount", "description"],
            },
            description: "Array of milestones. Their amounts must sum to (total_amount * 0.98).",
          },
        },
        required: ["freelancer_address", "total_amount", "milestones"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_deal_summary",
      description: "Display the current deal draft summary with all details.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "edit_deal",
      description: "Edit a specific field of the current deal draft.",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            enum: ["currency", "total", "address", "milestone"],
            description: "Which field to edit",
          },
          value: {
            type: "string",
            description: "New value. For milestone: 'index amount description' (e.g. '2 500 Testing & QA')",
          },
        },
        required: ["field", "value"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "request_confirmation",
      description: "REQUIRED before any on-chain write operation. Shows the user what will happen and asks for confirmation with Confirm/Cancel buttons. Use this for: deploying contracts, funding, approving milestones, submitting, disputes, cancellations, agent registration, ERC-8183 jobs.",
      parameters: {
        type: "object",
        properties: {
          action_type: {
            type: "string",
            enum: [
              "deploy_contract", "fund_contract", "submit_milestone",
              "approve_milestone", "release_payment", "initiate_dispute",
              "cancel_contract", "register_agent",
              "create_erc8183_job", "fund_erc8183_job",
              "submit_erc8183_deliverable", "complete_erc8183_job",
            ],
            description: "Type of on-chain action",
          },
          description: {
            type: "string",
            description: "Human-readable description of what will happen (e.g. 'Deploy escrow contract for $5,000 with 3 milestones')",
          },
          params: {
            type: "object",
            description: "Parameters for the action (contract address, milestone index, amounts, etc.)",
          },
        },
        required: ["action_type", "description"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_contract_status",
      description: "Query on-chain contract details including milestones, funding status, and amounts.",
      parameters: {
        type: "object",
        properties: {
          contract_address: {
            type: "string",
            description: "The escrow contract address to check. If not provided, uses the last contract from the current deal.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_contracts",
      description: "List all escrow contracts associated with a wallet address.",
      parameters: {
        type: "object",
        properties: {
          wallet_address: {
            type: "string",
            description: "Wallet address to look up. If not provided, uses the user's bot wallet.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_registered_agents",
      description: "List all custom AI agents that have been registered by users on Arclancer. Use this when the client wants to hire an AI agent or find a specific skill.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "execute_agent_task",
      description: "Execute a specific task using a registered custom AI agent. Use this when the user asks to run, test, or execute an agent's skill.",
      parameters: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The ID of the agent to execute" },
          task_description: { type: "string", description: "The user's prompt or task for the agent" }
        },
        required: ["agent_id", "task_description"]
      },
    },
  },
  // ── ERC-8004: Agent Identity & Reputation ──
  {
    type: "function" as const,
    function: {
      name: "register_agent_identity",
      description: "Register an AI agent on-chain with ERC-8004, giving it a unique identity NFT. Requires confirmation. The agent gets a metadata URI with name, description, capabilities.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Agent name (e.g. 'ArcLancer Deal Copilot')" },
          description: { type: "string", description: "What the agent does" },
          agent_type: { type: "string", description: "Agent type (e.g. 'escrow', 'trading', 'marketplace')" },
          capabilities: {
            type: "array",
            items: { type: "string" },
            description: "List of capabilities (e.g. ['deal_creation', 'escrow_management'])",
          },
        },
        required: ["name", "description"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_agent_reputation",
      description: "Look up an agent's reputation score and feedback history from the ERC-8004 reputation registry.",
      parameters: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "The agent's token ID or wallet address" },
        },
        required: ["agent_id"],
      },
    },
  },
  // ── ERC-8183: Agentic Commerce ──
  {
    type: "function" as const,
    function: {
      name: "create_agentic_job",
      description: "Create an ERC-8183 agentic commerce job. This is for agent-to-agent or human-to-agent micro-tasks. Requires confirmation.",
      parameters: {
        type: "object",
        properties: {
          provider_address: { type: "string", description: "Address of the agent/person who will do the work" },
          description: { type: "string", description: "Job description" },
          budget_usdc: { type: "number", description: "Budget in USDC" },
          expiry_hours: { type: "number", description: "Hours until the job expires. Default: 24" },
        },
        required: ["provider_address", "description", "budget_usdc"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_agentic_job",
      description: "Check the status of an ERC-8183 agentic commerce job.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string", description: "The job ID to look up" },
        },
        required: ["job_id"],
      },
    },
  },
];
