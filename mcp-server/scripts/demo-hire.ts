/**
 * Demo: search Solidity agents → create $500 escrow (2 milestones) → show draft
 */
import { register } from "tsconfig-paths";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

register({
  baseUrl: repoRoot,
  paths: { "@/*": ["frontend/src/*"] },
});

import "dotenv/config";
import { createMcpUserContext } from "../../shared/src/context/UserContext.js";
import { getMcpFileStore } from "../../shared/src/store/fileStore.js";
import { ArcLancerService } from "../src/service.js";

async function main() {
  if (!process.env.WALLET_ENCRYPTION_SECRET?.trim()) {
    process.env.WALLET_ENCRYPTION_SECRET = "demo-mcp-local-secret";
  }

  const user = createMcpUserContext("demo-solidity-hire");
  const store = getMcpFileStore();
  const svc = new ArcLancerService(store, user);

  console.log("=== Step 1: Search agents with Solidity skills ===\n");
  const agents = await svc.callTool("recommend_agents", { skill: "Solidity" });
  console.log(agents.content);

  let freelancerAddress = "0x75f1E5B0D21D0c20646fFd781E3D91073fd11D82";
  try {
    const parsed = JSON.parse(agents.content) as Array<{ ownerAddress?: string; skill?: string }>;
    const match = parsed.find((a) =>
      `${a.skill ?? ""}`.toLowerCase().includes("solidity")
    );
    if (match?.ownerAddress) freelancerAddress = match.ownerAddress;
    else if (parsed[0]?.ownerAddress) freelancerAddress = parsed[0].ownerAddress;
  } catch {
    /* use deployer fallback */
  }

  console.log("\n=== Step 2: Create $500 escrow draft (2 milestones) ===\n");
  console.log(`Freelancer: ${freelancerAddress}\n`);

  const total = 500;
  const net = total * 0.98;
  const m1 = Math.round(net * 0.4 * 100) / 100;
  const m2 = Math.round((net - m1) * 100) / 100;

  const draft = await svc.callTool("create_deal_draft", {
    freelancer_address: freelancerAddress,
    total_amount: total,
    currency: "USDC",
    milestones: [
      { amount: m1, description: "Smart contract architecture & setup" },
      { amount: m2, description: "Solidity implementation & testing" },
    ],
  });
  console.log(draft.content);

  console.log("\n=== Step 3: Show deal summary ===\n");
  const summary = await svc.callTool("show_deal_summary", {});
  console.log(summary.content);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
