import { NextResponse } from "next/server";
import { getJsonStore } from "@/lib/dealCopilot/storage";

export async function GET() {
  const store = getJsonStore();
  const brainData = {
    systemPrompt:
      "You are an expert Smart Contract Security Auditor. Analyze the provided Solidity code for critical vulnerabilities, focusing on reentrancy, unprotected selfdestruct, logic errors, and access control. Explain the vulnerability and provide a secure code fix.",
    toolApiKey: "",
    creatorId: 0,
    ownerWallet: "unknown",
  };

  const results: string[] = [];
  for (const id of [1, 2, 3]) {
    try {
      await store.setJSON(`agent_meta:${id}`, brainData, 60 * 60 * 24 * 365);
      results.push(`agent_meta:${id} ✅ written`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      results.push(`agent_meta:${id} ❌ ${msg}`);
    }
  }

  // Verify reads
  for (const id of [1, 2, 3]) {
    try {
      const data = await store.getJSON<any>(`agent_meta:${id}`);
      results.push(`agent_meta:${id} verify: ${data ? "✅ FOUND" : "❌ MISSING"}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      results.push(`agent_meta:${id} verify: ❌ ${msg}`);
    }
  }

  return NextResponse.json({ results });
}
