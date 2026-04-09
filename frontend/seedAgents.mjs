// Seed agent brain data for orphaned agents 1-3 directly into Upstash Redis
const UPSTASH_URL = "https://inviting-mink-70031.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAARGPAAIncDE4ZWI3ZGQwNGU0MDA0ZTg3OTVlZDE3OWQxMDIxMmYzY3AxNzAwMzE";

const brainData = JSON.stringify({
  systemPrompt: "You are an expert Smart Contract Security Auditor. Analyze the provided Solidity code for critical vulnerabilities, focusing on reentrancy, unprotected selfdestruct, logic errors, and access control. Explain the vulnerability and provide a secure code fix.",
  toolApiKey: "",
  creatorId: 0,
  ownerWallet: "unknown"
});

async function seed(id) {
  const key = `agent_meta:${id}`;
  const url = `${UPSTASH_URL}/set/${encodeURIComponent(key)}?EX=31536000`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "text/plain",
    },
    body: brainData,
  });
  const json = await res.json();
  console.log(`Agent ${id}:`, res.status, JSON.stringify(json));
}

async function verify(id) {
  const key = `agent_meta:${id}`;
  const url = `${UPSTASH_URL}/get/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const json = await res.json();
  console.log(`Verify ${id}:`, json.result ? "✅ FOUND" : "❌ MISSING");
}

(async () => {
  console.log("Seeding agent brains into Upstash...");
  await seed(1);
  await seed(2);
  await seed(3);
  console.log("\nVerifying...");
  await verify(1);
  await verify(2);
  await verify(3);
  console.log("\nDone.");
})();
