export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

/** Phase 1 — existing Deal Copilot tools */
const PHASE1_TOOLS: McpToolDefinition[] = [
  {
    name: "create_wallet",
    description: "Create or show the user's ArcLancer server-side wallet on Arc Testnet.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "check_balance",
    description: "Check USDC balance of the user's wallet.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_deposit_address",
    description: "Return the wallet address for USDC deposits on Arc Testnet.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_deal_draft",
    description:
      "Create a milestone escrow deal draft. Use freelancer_username (e.g. samuel) when known; milestones must sum to 98% of total (2% platform fee).",
    inputSchema: {
      type: "object",
      properties: {
        freelancer_username: {
          type: "string",
          description: "ArcLancer username without @ (e.g. samuel). Preferred over wallet address.",
        },
        freelancer_address: {
          type: "string",
          description: "Fallback 0x wallet address if username is unknown.",
        },
        total_amount: { type: "number" },
        currency: { type: "string", enum: ["USDC", "EURC"] },
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              amount: { type: "number" },
              description: { type: "string" },
            },
            required: ["amount", "description"],
          },
        },
      },
      required: ["total_amount"],
    },
  },
  {
    name: "show_deal_summary",
    description: "Show the current deal draft summary.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "edit_deal",
    description: "Edit a field on the current deal draft. For address, use a username (samuel) or 0x wallet.",
    inputSchema: {
      type: "object",
      properties: {
        field: { type: "string", enum: ["currency", "total", "address", "milestone"] },
        value: { type: "string" },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "request_confirmation",
    description: "REQUIRED before any on-chain write. Queues an action for user confirmation.",
    inputSchema: {
      type: "object",
      properties: {
        action_type: { type: "string" },
        description: { type: "string" },
        params: { type: "object" },
      },
      required: ["action_type", "description"],
    },
  },
  {
    name: "check_contract_status",
    description: "Read on-chain escrow contract status and milestones.",
    inputSchema: {
      type: "object",
      properties: { contract_address: { type: "string" } },
    },
  },
  {
    name: "list_contracts",
    description: "List escrow contracts for a wallet address.",
    inputSchema: {
      type: "object",
      properties: { wallet_address: { type: "string" } },
    },
  },
  {
    name: "search_registered_agents",
    description: "Search the ArcLancer AI agent marketplace.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "execute_agent_task",
    description: "Run a task using a registered marketplace agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        task_description: { type: "string" },
      },
      required: ["agent_id", "task_description"],
    },
  },
  {
    name: "register_agent_identity",
    description: "Register a new AI agent on the marketplace (requires confirmation).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        skill: { type: "string" },
        fee: { type: "number" },
        skill_uri: { type: "string" },
        content_hash: { type: "string" },
        execution_mode: { type: "string", enum: ["inbox", "creator_mcp"] },
        mcp_endpoint: { type: "string" },
      },
      required: ["name", "skill", "skill_uri"],
    },
  },
  {
    name: "check_agent_reputation",
    description: "Look up agent identity and reputation by ID or address.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string" } },
      required: ["agent_id"],
    },
  },
  {
    name: "create_agentic_job",
    description: "Create an ERC-8183 agentic commerce job (requires confirmation).",
    inputSchema: {
      type: "object",
      properties: {
        provider_address: { type: "string" },
        description: { type: "string" },
        budget_usdc: { type: "number" },
        expiry_hours: { type: "number" },
      },
      required: ["provider_address", "description", "budget_usdc"],
    },
  },
  {
    name: "check_agentic_job",
    description: "Check ERC-8183 job status by ID.",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "string" } },
      required: ["job_id"],
    },
  },
];

/** Phase 2 — marketplace and explicit escrow tools */
const PHASE2_TOOLS: McpToolDefinition[] = [
  {
    name: "create_job",
    description: "Create a freelance job listing (draft or published).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        budget_usdc: { type: "number" },
        deadline_days: { type: "number" },
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              amount: { type: "number" },
              description: { type: "string" },
            },
          },
        },
        publish: { type: "boolean" },
      },
      required: ["title", "description", "budget_usdc", "deadline_days"],
    },
  },
  {
    name: "publish_job",
    description: "Publish a draft job listing to the marketplace.",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "string" } },
      required: ["job_id"],
    },
  },
  {
    name: "search_jobs",
    description: "Search published freelance job listings.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
    },
  },
  {
    name: "recommend_agents",
    description: "Recommend marketplace agents by skill keyword.",
    inputSchema: {
      type: "object",
      properties: { skill: { type: "string" }, max_budget: { type: "number" } },
    },
  },
  {
    name: "lookup_profile",
    description: "Resolve an ArcLancer username (e.g. samuel) to wallet address before hiring.",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", description: "Username without @ (e.g. samuel)" },
      },
      required: ["username"],
    },
  },
  {
    name: "hire",
    description:
      "Hire a freelancer by username or wallet — creates an escrow draft from total_amount and milestones.",
    inputSchema: {
      type: "object",
      properties: {
        freelancer_username: { type: "string", description: "ArcLancer username (e.g. samuel)" },
        freelancer_address: { type: "string", description: "Fallback 0x wallet address" },
        total_amount: { type: "number" },
        job_id: { type: "string" },
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              amount: { type: "number" },
              description: { type: "string" },
            },
            required: ["amount", "description"],
          },
        },
      },
      required: ["total_amount"],
    },
  },
  {
    name: "create_escrow",
    description:
      "Deploy escrow from the current deal draft. Circle wallet users get a signing link to arclancer.xyz/create; server-wallet users deploy on-chain via API.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "fund_escrow",
    description: "Fund an escrow contract with USDC.",
    inputSchema: {
      type: "object",
      properties: { contract_address: { type: "string" } },
      required: ["contract_address"],
    },
  },
  {
    name: "submit_work",
    description: "Submit milestone deliverable URI as freelancer.",
    inputSchema: {
      type: "object",
      properties: {
        contract_address: { type: "string" },
        milestone_index: { type: "number" },
        deliverable_uri: { type: "string" },
      },
      required: ["contract_address", "milestone_index", "deliverable_uri"],
    },
  },
  {
    name: "review_work",
    description: "Approve a submitted milestone as client.",
    inputSchema: {
      type: "object",
      properties: {
        contract_address: { type: "string" },
        milestone_index: { type: "number" },
      },
      required: ["contract_address", "milestone_index"],
    },
  },
  {
    name: "release_payment",
    description: "Release USDC payment for an approved milestone.",
    inputSchema: {
      type: "object",
      properties: {
        contract_address: { type: "string" },
        milestone_index: { type: "number" },
      },
      required: ["contract_address", "milestone_index"],
    },
  },
  {
    name: "open_dispute",
    description: "Open a dispute on an escrow contract.",
    inputSchema: {
      type: "object",
      properties: { contract_address: { type: "string" } },
      required: ["contract_address"],
    },
  },
  {
    name: "cancel_contract",
    description: "Cancel an unfunded or active escrow contract.",
    inputSchema: {
      type: "object",
      properties: { contract_address: { type: "string" } },
      required: ["contract_address"],
    },
  },
  {
    name: "get_escrow_status",
    description: "Alias for check_contract_status with structured JSON response.",
    inputSchema: {
      type: "object",
      properties: { contract_address: { type: "string" } },
      required: ["contract_address"],
    },
  },
  {
    name: "create_agent",
    description: "Alias for register_agent_identity — create marketplace agent.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        skill: { type: "string" },
        fee: { type: "number" },
        skill_uri: { type: "string" },
        content_hash: { type: "string" },
        execution_mode: { type: "string", enum: ["inbox", "creator_mcp"] },
        mcp_endpoint: { type: "string" },
      },
      required: ["name", "skill", "skill_uri"],
    },
  },
  {
    name: "update_agent",
    description: "Update agent fee or active status (on-chain via AgentRegistry).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        fee: { type: "number" },
        is_active: { type: "boolean" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "pause_agent",
    description: "Deactivate an agent listing.",
    inputSchema: {
      type: "object",
      properties: { agent_id: { type: "string" } },
      required: ["agent_id"],
    },
  },
  {
    name: "set_price",
    description: "Update agent task fee in USDC.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        fee_usdc: { type: "number" },
      },
      required: ["agent_id", "fee_usdc"],
    },
  },
  {
    name: "wallet_balance",
    description: "Alias for check_balance.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "transaction_history",
    description: "List recent escrow contracts for the user wallet.",
    inputSchema: {
      type: "object",
      properties: { wallet_address: { type: "string" } },
    },
  },
];

/** Phase 3 — smart verification */
const PHASE3_TOOLS: McpToolDefinition[] = [
  {
    name: "verify_condition",
    description:
      "Create a smart verification job. When condition passes, call release_payment. Supports url_live, contract_deployed locally; GitHub conditions use OpenClaw worker.",
    inputSchema: {
      type: "object",
      properties: {
        contract_address: { type: "string" },
        milestone_index: { type: "number" },
        condition_type: {
          type: "string",
          enum: ["github_tests_passing", "github_pr_merged", "contract_deployed", "url_live", "custom"],
        },
        condition_target: { type: "string", description: "URL, repo, contract address, or PR link" },
        min_passing_tests: { type: "number" },
        auto_release: { type: "boolean", description: "Release payment automatically when verified" },
      },
      required: ["contract_address", "milestone_index", "condition_type", "condition_target"],
    },
  },
  {
    name: "verify_condition_status",
    description: "Poll verification job status and optionally run local checks.",
    inputSchema: {
      type: "object",
      properties: {
        verification_id: { type: "string" },
        run_check: { type: "boolean" },
      },
      required: ["verification_id"],
    },
  },
];

/** Phase 4 — Circle wallet funding */
const PHASE4_TOOLS: McpToolDefinition[] = [
  {
    name: "fund_wallet",
    description:
      "Add USDC to the user's linked Arc wallet. Uses Circle Faucet on testnet and Circle Payment Gateway on mainnet.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_programmable_wallet",
    description:
      "Return the ArcLancer connection URL for creating a Circle Programmable Wallet.",
    inputSchema: {
      type: "object",
      properties: { user_label: { type: "string" } },
    },
  },
];

/** Phase 5 — escrow-backed handoff to creator-hosted MCP servers */
const PHASE5_TOOLS: McpToolDefinition[] = [
  {
    name: "issue_creator_job_ticket",
    description:
      "Issue a short-lived signed job ticket for a creator-hosted MCP after verifying the caller owns a funded ArcLancer escrow for that agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        mcp_endpoint: { type: "string", description: "HTTPS endpoint from the agent manifest" },
        contract_address: { type: "string" },
        milestone_index: { type: "number" },
        task_description: {
          type: "string",
          description: "Task sent separately to the creator MCP; only its SHA-256 hash is signed",
        },
      },
      required: [
        "agent_id",
        "mcp_endpoint",
        "contract_address",
        "milestone_index",
        "task_description",
      ],
    },
  },
];

export const ALL_MCP_TOOLS: McpToolDefinition[] = [
  ...PHASE1_TOOLS,
  ...PHASE2_TOOLS,
  ...PHASE3_TOOLS,
  ...PHASE4_TOOLS,
  ...PHASE5_TOOLS,
];

export const WRITE_TOOLS = new Set([
  "request_confirmation",
  "register_agent_identity",
  "create_agentic_job",
  "create_job",
  "publish_job",
  "create_escrow",
  "fund_escrow",
  "submit_work",
  "review_work",
  "release_payment",
  "open_dispute",
  "cancel_contract",
  "create_agent",
  "update_agent",
  "pause_agent",
  "set_price",
  "fund_wallet",
  "verify_condition",
  "issue_creator_job_ticket",
]);
