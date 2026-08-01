import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  hashCreatorTask,
  issueCreatorJobTicket,
  verifyCreatorJobTicket,
} from "./creatorTickets.js";

const originalSecret = process.env.CREATOR_MCP_TICKET_SECRET;
const testSecret = randomBytes(32).toString("hex");
process.env.CREATOR_MCP_TICKET_SECRET = testSecret;

test.after(() => {
  if (originalSecret === undefined) delete process.env.CREATOR_MCP_TICKET_SECRET;
  else process.env.CREATOR_MCP_TICKET_SECRET = originalSecret;
});

const input = {
  agentId: "12",
  mcpEndpoint: "https://creator.example/mcp",
  escrowContract: "0x1111111111111111111111111111111111111111",
  milestoneIndex: 0,
  payer: "0x2222222222222222222222222222222222222222",
  payee: "0x3333333333333333333333333333333333333333",
  amountUsdc: 25,
  taskText: "Audit the escrow contract",
  ttlSeconds: 120,
};

test("issues and verifies an audience-bound short-lived ticket", () => {
  const { token, claims } = issueCreatorJobTicket(input);
  const secondIssue = issueCreatorJobTicket(input);
  const verified = verifyCreatorJobTicket(token, {
    expectedAudience: input.mcpEndpoint,
    expectedTaskSha256: hashCreatorTask(input.taskText),
  });

  assert.equal(verified.job_id, claims.job_id);
  assert.equal(verified.amount_usdc, "25.000000");
  assert.equal(verified.payment_kind, "funded_escrow");
  assert.equal(secondIssue.claims.job_id, claims.job_id);
  assert.notEqual(secondIssue.claims.jti, claims.jti);
  assert.ok(verified.exp - verified.iat <= 120);
});

test("rejects tampering, wrong audience, and expired tickets", () => {
  const { token, claims } = issueCreatorJobTicket(input);
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

  assert.throws(() => verifyCreatorJobTicket(tampered), /signature/);
  assert.throws(
    () => verifyCreatorJobTicket(token, { expectedAudience: "https://other.example/mcp" }),
    /audience/
  );
  assert.throws(
    () => verifyCreatorJobTicket(token, { nowSeconds: claims.exp + 10 }),
    /expired/
  );
});

test("requires a strong environment secret and HTTPS audience", () => {
  process.env.CREATOR_MCP_TICKET_SECRET = "short";
  assert.throws(() => issueCreatorJobTicket(input), /at least 32 bytes/);

  process.env.CREATOR_MCP_TICKET_SECRET = testSecret;
  assert.throws(
    () => issueCreatorJobTicket({ ...input, mcpEndpoint: "http://creator.example/mcp" }),
    /HTTPS/
  );
});
