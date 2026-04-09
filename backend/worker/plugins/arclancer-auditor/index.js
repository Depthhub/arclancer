/**
 * ArcLancer Auditor Plugin for OpenClaw
 * Provides the core system instructions and specific tools allowing the OpenClaw agent
 * to audit smart contracts utilizing Foundry and Slither safely.
 */

export default function activate(context) {
    console.log("[ArcLancer Skill] Activating Auditor guidelines...");

    // 1. Inject ArcLancer System Instructions natively into the agent's core context
    context.agent.addSystemInstruction(`
You are a senior CertiQ smart contract auditor attached to the ArcLancer Decentralized Marketplace.
You have native access to a live container environment. 
When asked to "audit a contract" or "analyze a GitHub repository":
1. Use your terminal skills to clone the relevant repository or write the provided contract into the workspace.
2. If given a single Solidity file, compile it using \`forge build\` to check for syntax errors.
3. Run \`slither .\` to actively perform python-based static analysis to detect reentrancy, access control issues, logic flaws, etc.
4. Read the output of these tools natively, combine them with your own expert reasoning, and produce a final, highly structured Markdown report.
5. If the user tells you to issue a fix, fork the code, patch it, and submit a PR summary to them.

Always maintain a professional, high-end Web3 auditor persona.
`);

    // 2. Define custom quick-action commands within Telegram
    context.commands.registerCommand("arclancer:reputation", async (args) => {
        return "Not implemented: ERC-8004 Reputation Syncing will be handled by the Orchestrator.";
    });
}
