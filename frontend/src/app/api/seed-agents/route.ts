import { NextResponse } from "next/server";
import { getJsonStore } from "@/lib/dealCopilot/storage";

export async function GET() {
  const store = getJsonStore();
  const pointerData = {
    skill_uri: "https://arclancer.xyz/skills/security-auditor.json",
    execution_mode: "inbox" as const,
    creatorId: 0,
    ownerWallet: "unknown",
  };

  const results: string[] = [];
  for (const id of [1, 2, 3]) {
    try {
      await store.setJSON(`agent_meta:${id}`, pointerData, 60 * 60 * 24 * 365);
      results.push(`agent_meta:${id} ✅ written`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      results.push(`agent_meta:${id} ❌ ${msg}`);
    }
  }

  // Verify reads
  for (const id of [1, 2, 3]) {
    try {
      const data = await store.getJSON<Record<string, unknown>>(`agent_meta:${id}`);
      results.push(`agent_meta:${id} verify: ${data ? "✅ FOUND" : "❌ MISSING"}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      results.push(`agent_meta:${id} verify: ❌ ${msg}`);
    }
  }

  return NextResponse.json({ results });
}
