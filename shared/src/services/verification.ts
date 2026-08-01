import type { JsonStore } from "../store/types.js";

export type VerificationConditionType =
  | "github_tests_passing"
  | "github_pr_merged"
  | "contract_deployed"
  | "url_live"
  | "custom";

export interface VerificationJob {
  id: string;
  escrowContractAddress: string;
  milestoneIndex: number;
  conditionType: VerificationConditionType;
  conditionTarget: string;
  /** Minimum passing tests for github_tests_passing */
  minPassingTests?: number;
  status: "pending" | "running" | "passed" | "failed" | "released";
  createdAt: number;
  updatedAt: number;
  result?: string;
}

const VERIFY_TTL = 60 * 60 * 24 * 7;
const VERIFY_QUEUE = "arclancer:verify:queue";

function verifyKey(id: string) {
  return `arclancer:verify:${id}`;
}

function randomVerifyId(): string {
  return `verify_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class VerificationService {
  constructor(private store: JsonStore) {}

  async createVerificationJob(input: {
    escrowContractAddress: string;
    milestoneIndex: number;
    conditionType: VerificationConditionType;
    conditionTarget: string;
    minPassingTests?: number;
  }): Promise<VerificationJob> {
    const id = randomVerifyId();
    const now = Date.now();
    const job: VerificationJob = {
      id,
      escrowContractAddress: input.escrowContractAddress,
      milestoneIndex: input.milestoneIndex,
      conditionType: input.conditionType,
      conditionTarget: input.conditionTarget,
      minPassingTests: input.minPassingTests,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    await this.store.setJSON(verifyKey(id), job, VERIFY_TTL);
    await this.store.rpush(VERIFY_QUEUE, job);

    const workerUrl = process.env.OPENCLAW_WORKER_URL?.trim();
    if (
      workerUrl &&
      (input.conditionType === "github_tests_passing" ||
        input.conditionType === "github_pr_merged" ||
        input.conditionType === "custom")
    ) {
      await this.store.rpush("arclancer:jobs", {
        type: "verify_condition",
        verificationId: id,
        conditionType: input.conditionType,
        conditionTarget: input.conditionTarget,
        minPassingTests: input.minPassingTests,
        escrowContractAddress: input.escrowContractAddress,
        milestoneIndex: input.milestoneIndex,
        queuedAt: Date.now(),
      });
      await this.updateVerificationJob(id, { status: "running" });
    }

    return job;
  }

  async getVerificationJob(id: string): Promise<VerificationJob | null> {
    return this.store.getJSON<VerificationJob>(verifyKey(id));
  }

  async updateVerificationJob(
    id: string,
    patch: Partial<VerificationJob>
  ): Promise<VerificationJob | null> {
    const existing = await this.getVerificationJob(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id, updatedAt: Date.now() };
    await this.store.setJSON(verifyKey(id), updated, VERIFY_TTL);
    return updated;
  }

  /** Lightweight local check — full worker integration uses OpenClaw queue */
  async evaluateCondition(job: VerificationJob): Promise<{ passed: boolean; detail: string }> {
    switch (job.conditionType) {
      case "url_live": {
        try {
          const res = await fetch(job.conditionTarget, { method: "HEAD" });
          const passed = res.ok;
          return {
            passed,
            detail: passed
              ? `URL ${job.conditionTarget} returned ${res.status}`
              : `URL check failed (${res.status})`,
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "fetch failed";
          return { passed: false, detail: msg };
        }
      }
      case "contract_deployed": {
        const rpc =
          process.env.ARC_TESTNET_RPC_URL?.trim() ||
          process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL?.trim() ||
          "https://rpc.testnet.arc.network";
        try {
          const res = await fetch(rpc, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_getCode",
              params: [job.conditionTarget, "latest"],
            }),
          });
          const data = (await res.json()) as { result?: string };
          const code = data.result ?? "0x";
          const passed = code !== "0x" && code.length > 4;
          return {
            passed,
            detail: passed
              ? `Contract code found at ${job.conditionTarget}`
              : "No contract bytecode at address",
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "rpc failed";
          return { passed: false, detail: msg };
        }
      }
      case "github_tests_passing":
      case "github_pr_merged":
      case "custom":
        return {
          passed: false,
          detail:
            "Condition queued for OpenClaw worker verification. Poll verify_condition_status or configure OPENCLAW_WORKER_URL.",
        };
      default:
        return { passed: false, detail: "Unknown condition type" };
    }
  }
}
