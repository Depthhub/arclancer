import {
  createHmac,
  randomUUID,
  timingSafeEqual,
  createHash,
} from "node:crypto";

const TICKET_ISSUER = "arclancer";
const TICKET_VERSION = 1;
const DEFAULT_TTL_SECONDS = 300;
const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 900;
const MAX_TOKEN_LENGTH = 8192;

export interface CreatorJobTicketClaims {
  v: 1;
  iss: "arclancer";
  aud: string;
  sub: string;
  jti: string;
  iat: number;
  nbf: number;
  exp: number;
  job_id: string;
  agent_id: string;
  escrow_contract: string;
  milestone_index: number;
  payer: string;
  payee: string;
  amount_usdc: string;
  task_sha256: string;
  payment_kind: "funded_escrow";
}

export interface IssueCreatorJobTicketInput {
  agentId: string;
  mcpEndpoint: string;
  escrowContract: string;
  milestoneIndex: number;
  payer: string;
  payee: string;
  amountUsdc: number;
  taskText: string;
  ttlSeconds?: number;
}

export interface VerifyCreatorJobTicketOptions {
  expectedAudience?: string;
  expectedTaskSha256?: string;
  nowSeconds?: number;
  clockToleranceSeconds?: number;
}

function ticketSecret(): string {
  const secret = process.env.CREATOR_MCP_TICKET_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("CREATOR_MCP_TICKET_SECRET must be at least 32 bytes");
  }
  return secret;
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson(part: string): unknown {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function signature(signingInput: string): Buffer {
  return createHmac("sha256", ticketSecret()).update(signingInput).digest();
}

function assertAddress(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error(`${field} must be an EVM address`);
  }
  return normalized;
}

export function normalizeCreatorMcpEndpoint(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("mcp_endpoint must be a valid URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("mcp_endpoint must use HTTPS");
  }
  if (url.username || url.password || url.hash) {
    throw new Error("mcp_endpoint must not contain credentials or a fragment");
  }
  return url.toString();
}

export function hashCreatorTask(taskText: string): string {
  const task = taskText.trim();
  if (!task) throw new Error("task_description is required");
  return createHash("sha256").update(task, "utf8").digest("hex");
}

export function creatorJobId(
  agentId: string,
  escrowContract: string,
  milestoneIndex: number
): string {
  const material = `${agentId}:${escrowContract.toLowerCase()}:${milestoneIndex}`;
  return `job_${createHash("sha256").update(material, "utf8").digest("hex").slice(0, 32)}`;
}

export function creatorTicketTtlSeconds(requested?: number): number {
  const configured = Number(process.env.CREATOR_MCP_TICKET_TTL_SECONDS);
  const candidate = requested ?? configured;
  if (!Number.isFinite(candidate)) return DEFAULT_TTL_SECONDS;
  return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, Math.floor(candidate)));
}

export function issueCreatorJobTicket(input: IssueCreatorJobTicketInput): {
  token: string;
  claims: CreatorJobTicketClaims;
} {
  const now = Math.floor(Date.now() / 1000);
  const ttl = creatorTicketTtlSeconds(input.ttlSeconds);
  const endpoint = normalizeCreatorMcpEndpoint(input.mcpEndpoint);
  const payer = assertAddress(input.payer, "payer");
  const payee = assertAddress(input.payee, "payee");
  const escrowContract = assertAddress(input.escrowContract, "escrow_contract");

  if (!Number.isInteger(input.milestoneIndex) || input.milestoneIndex < 0) {
    throw new Error("milestone_index must be a non-negative integer");
  }
  if (!Number.isFinite(input.amountUsdc) || input.amountUsdc <= 0) {
    throw new Error("amount_usdc must be positive");
  }

  const claims: CreatorJobTicketClaims = {
    v: TICKET_VERSION,
    iss: TICKET_ISSUER,
    aud: endpoint,
    sub: `agent:${input.agentId}`,
    jti: randomUUID(),
    iat: now,
    nbf: now - 5,
    exp: now + ttl,
    job_id: creatorJobId(input.agentId, escrowContract, input.milestoneIndex),
    agent_id: input.agentId,
    escrow_contract: escrowContract,
    milestone_index: input.milestoneIndex,
    payer,
    payee,
    amount_usdc: input.amountUsdc.toFixed(6),
    task_sha256: hashCreatorTask(input.taskText),
    payment_kind: "funded_escrow",
  };
  const header = encode({ alg: "HS256", typ: "ARCLANCER-CREATOR-JOB", v: TICKET_VERSION });
  const payload = encode(claims);
  const signingInput = `${header}.${payload}`;
  return {
    token: `${signingInput}.${signature(signingInput).toString("base64url")}`,
    claims,
  };
}

export function verifyCreatorJobTicket(
  token: string,
  options: VerifyCreatorJobTicketOptions = {}
): CreatorJobTicketClaims {
  if (!token || token.length > MAX_TOKEN_LENGTH) throw new Error("Invalid creator job ticket");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Invalid creator job ticket");
  }

  const signingInput = `${parts[0]}.${parts[1]}`;
  const actualSignature = Buffer.from(parts[2], "base64url");
  const expectedSignature = signature(signingInput);
  if (
    actualSignature.toString("base64url") !== parts[2] ||
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new Error("Invalid creator job ticket signature");
  }

  const header = decodeJson(parts[0]) as Record<string, unknown>;
  const claims = decodeJson(parts[1]) as Partial<CreatorJobTicketClaims>;
  if (
    header.alg !== "HS256" ||
    header.typ !== "ARCLANCER-CREATOR-JOB" ||
    header.v !== TICKET_VERSION ||
    claims.v !== TICKET_VERSION ||
    claims.iss !== TICKET_ISSUER
  ) {
    throw new Error("Unsupported creator job ticket");
  }

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = Math.min(30, Math.max(0, options.clockToleranceSeconds ?? 5));
  if (
    typeof claims.iat !== "number" ||
    typeof claims.nbf !== "number" ||
    typeof claims.exp !== "number" ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > MAX_TTL_SECONDS ||
    claims.nbf > now + tolerance ||
    claims.exp <= now - tolerance
  ) {
    throw new Error("Creator job ticket is expired or not active");
  }

  if (
    typeof claims.aud !== "string" ||
    typeof claims.jti !== "string" ||
    typeof claims.job_id !== "string" ||
    typeof claims.agent_id !== "string" ||
    typeof claims.sub !== "string" ||
    typeof claims.milestone_index !== "number" ||
    typeof claims.amount_usdc !== "string" ||
    typeof claims.task_sha256 !== "string" ||
    claims.payment_kind !== "funded_escrow"
  ) {
    throw new Error("Creator job ticket claims are incomplete");
  }
  assertAddress(String(claims.escrow_contract ?? ""), "escrow_contract");
  assertAddress(String(claims.payer ?? ""), "payer");
  assertAddress(String(claims.payee ?? ""), "payee");

  if (
    options.expectedAudience &&
    claims.aud !== normalizeCreatorMcpEndpoint(options.expectedAudience)
  ) {
    throw new Error("Creator job ticket audience mismatch");
  }
  if (
    options.expectedTaskSha256 &&
    claims.task_sha256 !== options.expectedTaskSha256.toLowerCase()
  ) {
    throw new Error("Creator job ticket task mismatch");
  }
  return claims as CreatorJobTicketClaims;
}
