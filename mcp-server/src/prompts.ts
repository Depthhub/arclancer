export const MCP_PROMPTS = [
  {
    name: "hire_freelancer",
    description: "Guided flow to search agents, create escrow draft, and confirm hire on Arc.",
    arguments: [
      { name: "skill", description: "Required skill (e.g. React, Solidity)", required: false },
      { name: "budget_usdc", description: "Budget in USDC", required: false },
    ],
  },
  {
    name: "create_agent",
    description: "Register a new AI agent on the ArcLancer marketplace.",
    arguments: [
      { name: "name", description: "Agent name", required: true },
      { name: "skill", description: "What the agent does", required: true },
      { name: "skill_uri", description: "Public skill or manifest URI", required: true },
      { name: "execution_mode", description: "inbox or creator_mcp", required: false },
      { name: "mcp_endpoint", description: "Creator MCP endpoint when applicable", required: false },
      { name: "fee_usdc", description: "Task fee in USDC", required: false },
    ],
  },
  {
    name: "check_escrow_status",
    description: "Query escrow contract status and milestones on Arc Testnet.",
    arguments: [
      { name: "contract_address", description: "Escrow contract 0x address", required: true },
    ],
  },
] as const;

export function renderPrompt(
  name: string,
  args: Record<string, string | undefined>
): { messages: Array<{ role: "user"; content: { type: "text"; text: string } }> } | null {
  switch (name) {
    case "hire_freelancer":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                "Help me hire on ArcLancer (Arc Testnet, USDC escrow).",
                args.skill ? `Skill needed: ${args.skill}` : "Find the best match for my requirements.",
                args.budget_usdc ? `Budget: $${args.budget_usdc} USDC` : "",
                "",
                "Steps:",
                "1. search_registered_agents or recommend_agents",
                "2. create_deal_draft with freelancer_username (e.g. samuel) and milestones (must sum to 98% of total)",
                "3. show_deal_summary",
                "4. request_confirmation for deploy_contract",
                "5. create_escrow then fund_escrow",
                "",
                "Never execute on-chain writes without request_confirmation first.",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          },
        ],
      };
    case "create_agent":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                "Register an AI agent on ArcLancer marketplace.",
                `Name: ${args.name ?? "(required)"}`,
                `Skill: ${args.skill ?? "(required)"}`,
                `Skill URI: ${args.skill_uri ?? "(required)"}`,
                `Execution: ${args.execution_mode ?? "inbox"}`,
                args.mcp_endpoint ? `Creator MCP endpoint: ${args.mcp_endpoint}` : "",
                args.fee_usdc ? `Fee: $${args.fee_usdc} USDC per task` : "Fee: set a reasonable USDC task fee",
                "",
                "Use register_agent_identity, then request_confirmation before on-chain mint. Never collect a full prompt or API key.",
              ].filter(Boolean).join("\n"),
            },
          },
        ],
      };
    case "check_escrow_status":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Check escrow contract ${args.contract_address ?? "0x..."} on Arc Testnet. Use get_escrow_status or check_contract_status and summarize milestones, funding, and payment state.`,
            },
          },
        ],
      };
    default:
      return null;
  }
}
