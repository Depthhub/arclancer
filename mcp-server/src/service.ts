import "dotenv/config";
import type { UserContext } from "../../shared/src/context/UserContext.js";
import { userContextToToolContext } from "../../shared/src/context/UserContext.js";
import type { JsonStore } from "../../shared/src/store/types.js";
import { JobListingService } from "../../shared/src/services/jobListings.js";
import { VerificationService } from "../../shared/src/services/verification.js";
import { fundWallet } from "../../shared/src/services/walletFunding.js";
import { executeToolForUser } from "../../frontend/src/lib/dealCopilot/agentTools.js";
import { getPrivateKey, getWallet, isWalletEnabled } from "../../frontend/src/lib/dealCopilot/wallet.js";
import {
  createEscrowContract,
  fundContract,
  submitMilestone,
  approveMilestone,
  releaseMilestonePayment,
  initiateDispute,
  cancelContract,
  checkBalance,
  executeUsdcTransfer,
} from "../../frontend/src/lib/dealCopilot/executor.js";
import { fetchContractDetails, fetchRegisteredAgents } from "../../frontend/src/lib/dealCopilot/chain.js";
import type { DealCopilotState, DealDraft } from "../../frontend/src/lib/dealCopilot/types.js";
import { getDealTtlSeconds } from "../../frontend/src/lib/dealCopilot/engine.js";
import { issueCreatorJobTicket } from "./creatorTickets.js";
import { resolveFreelancerInput } from "../../frontend/src/lib/profile/resolveFreelancer.js";

function storeKey(sessionId: string) {
  return `dealCopilot:state:${sessionId}`;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
  structured?: unknown;
}

export class ArcLancerService {
  private jobs: JobListingService;
  private verification: VerificationService;

  constructor(
    private store: JsonStore,
    private user: UserContext
  ) {
    this.jobs = new JobListingService(store);
    this.verification = new VerificationService(store);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      if (this.user.walletAddress) {
        if (name === "create_wallet" || name === "get_deposit_address") {
          return {
            content: `Circle Programmable Wallet on Arc: ${this.user.walletAddress}`,
            structured: {
              walletAddress: this.user.walletAddress,
              circleWalletId: this.user.circleWalletId,
            },
          };
        }
        if (name === "check_balance") {
          const balanceUsdc = await checkBalance(this.user.walletAddress);
          return {
            content: `$${balanceUsdc.toFixed(2)} USDC`,
            structured: { walletAddress: this.user.walletAddress, balanceUsdc },
          };
        }
      }

      // Phase 1 — delegate to existing Deal Copilot tools
      const phase1 = new Set([
        "create_wallet", "check_balance", "get_deposit_address",
        "create_deal_draft", "show_deal_summary", "edit_deal",
        "request_confirmation", "check_contract_status", "list_contracts",
        "search_registered_agents", "execute_agent_task",
        "register_agent_identity", "check_agent_reputation",
        "create_agentic_job", "check_agentic_job",
      ]);

      if (phase1.has(name)) {
        const text = await executeToolForUser(name, args, this.user, this.store as never);
        return { content: text, isError: text.startsWith("❌") || text.startsWith("Error:") };
      }

      switch (name) {
        case "wallet_balance":
          if (this.user.walletAddress) {
            return {
              content: `Linked Circle wallet: ${this.user.walletAddress}`,
              structured: { walletAddress: this.user.walletAddress },
            };
          }
          return this.wrap(await executeToolForUser("check_balance", {}, this.user, this.store as never));
        case "fund_wallet": {
          if (!this.user.walletAddress) {
            return {
              content:
                "Connect ArcLancer at https://arclancer.xyz/connect to link a Circle wallet before funding.",
              isError: true,
            };
          }
          const result = await fundWallet(this.user.walletAddress);
          return { content: JSON.stringify(result, null, 2), structured: result };
        }
        case "get_escrow_status": {
          const addr = String(args.contract_address ?? "");
          const text = await executeToolForUser(
            "check_contract_status",
            { contract_address: addr },
            this.user,
            this.store as never
          );
          if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
            try {
              const details = await fetchContractDetails(addr);
              return {
                content: text,
                structured: details,
              };
            } catch {
              return this.wrap(text);
            }
          }
          return this.wrap(text);
        }
        case "create_agent":
          return this.wrap(
            await executeToolForUser("register_agent_identity", args, this.user, this.store as never)
          );
        case "create_job": {
          const job = await this.jobs.createJob({
            title: String(args.title),
            description: String(args.description),
            budgetUsdc: Number(args.budget_usdc),
            deadlineDays: Number(args.deadline_days),
            clientSessionId: this.user.sessionId,
            clientUserId: this.user.userId,
            milestones: args.milestones as Array<{ amount: number; description: string }> | undefined,
            publish: Boolean(args.publish),
          });
          return { content: JSON.stringify(job, null, 2), structured: job };
        }
        case "publish_job": {
          const job = await this.jobs.publishJob(String(args.job_id));
          if (!job) return { content: "Job not found", isError: true };
          return { content: JSON.stringify(job, null, 2), structured: job };
        }
        case "search_jobs": {
          const jobs = await this.jobs.searchJobs(args.query ? String(args.query) : undefined);
          return { content: JSON.stringify(jobs, null, 2), structured: jobs };
        }
        case "recommend_agents": {
          const skill = String(args.skill ?? "").toLowerCase();
          const maxBudget = args.max_budget != null ? Number(args.max_budget) : undefined;
          const agents = await fetchRegisteredAgents();
          const filtered = agents.filter((a) => {
            if (!a.isActive) return false;
            if (skill && !`${a.name} ${a.skill}`.toLowerCase().includes(skill)) return false;
            if (maxBudget != null && a.taskFee > maxBudget) return false;
            return true;
          });
          return { content: JSON.stringify(filtered, null, 2), structured: filtered };
        }
        case "lookup_profile": {
          const resolved = await resolveFreelancerInput(String(args.username ?? ""));
          if (!resolved.ok) {
            return { content: resolved.error, isError: true };
          }
          const label = resolved.username ? `@${resolved.username}` : resolved.walletAddress;
          return {
            content: `${label} → ${resolved.walletAddress}`,
            structured: {
              username: resolved.username,
              walletAddress: resolved.walletAddress,
            },
          };
        }
        case "hire": {
          const hasFreelancer = args.freelancer_username || args.freelancer_address;
          if (hasFreelancer && args.total_amount) {
            const milestones =
              Array.isArray(args.milestones) && args.milestones.length > 0
                ? args.milestones
                : [{ amount: Number(args.total_amount) * 0.98, description: "Full delivery" }];
            return this.wrap(
              await executeToolForUser(
                "create_deal_draft",
                {
                  freelancer_username: args.freelancer_username,
                  freelancer_address: args.freelancer_address,
                  total_amount: args.total_amount,
                  milestones,
                },
                this.user,
                this.store as never
              )
            );
          }
          return {
            content: "Provide freelancer_username (e.g. samuel) and total_amount, or create a deal draft first.",
            isError: true,
          };
        }
        case "create_escrow":
          return this.executeConfirmedWrite("deploy_contract", () => this.deployFromDraft());
        case "fund_escrow":
          return this.executeDirectWrite(async (pk) =>
            fundContract(pk, String(args.contract_address))
          );
        case "submit_work":
          return this.executeDirectWrite(async (pk) =>
            submitMilestone(
              pk,
              String(args.contract_address),
              Number(args.milestone_index),
              String(args.deliverable_uri)
            )
          );
        case "review_work":
          return this.executeDirectWrite(async (pk) =>
            approveMilestone(pk, String(args.contract_address), Number(args.milestone_index))
          );
        case "release_payment":
          return this.executeDirectWrite(async (pk) =>
            releaseMilestonePayment(pk, String(args.contract_address), Number(args.milestone_index))
          );
        case "open_dispute":
          return this.executeDirectWrite(async (pk) =>
            initiateDispute(pk, String(args.contract_address))
          );
        case "cancel_contract":
          return this.executeDirectWrite(async (pk) =>
            cancelContract(pk, String(args.contract_address))
          );
        case "transaction_history":
          return this.wrap(
            await executeToolForUser(
              "list_contracts",
              { wallet_address: args.wallet_address as string | undefined },
              this.user,
              this.store as never
            )
          );
        case "update_agent":
        case "pause_agent":
        case "set_price":
          return {
            content:
              "Agent on-chain updates require wallet-connected web dashboard or Telegram confirmation flow. Use register_agent_identity for new agents.",
            isError: true,
          };
        case "verify_condition": {
          const job = await this.verification.createVerificationJob({
            escrowContractAddress: String(args.contract_address),
            milestoneIndex: Number(args.milestone_index),
            conditionType: args.condition_type as never,
            conditionTarget: String(args.condition_target),
            minPassingTests: args.min_passing_tests != null ? Number(args.min_passing_tests) : undefined,
          });
          if (args.auto_release) {
            await this.store.setJSON(`verify:auto_release:${job.id}`, {
              contract: args.contract_address,
              milestone: args.milestone_index,
            }, 604800);
          }
          return { content: JSON.stringify(job, null, 2), structured: job };
        }
        case "verify_condition_status": {
          const job = await this.verification.getVerificationJob(String(args.verification_id));
          if (!job) return { content: "Verification job not found", isError: true };
          if (args.run_check) {
            const result = await this.verification.evaluateCondition(job);
            const updated = await this.verification.updateVerificationJob(job.id, {
              status: result.passed ? "passed" : "running",
              result: result.detail,
            });
            if (result.passed) {
              const auto = await this.store.getJSON<{ contract: string; milestone: number }>(
                `verify:auto_release:${job.id}`
              );
              if (auto) {
                const release = await this.executeDirectWrite(async (pk) =>
                  releaseMilestonePayment(pk, auto.contract, auto.milestone)
                );
                await this.verification.updateVerificationJob(job.id, { status: "released" });
                return {
                  content: JSON.stringify({ verification: updated, release: release.content }, null, 2),
                  structured: { verification: updated, release },
                };
              }
            }
            return { content: JSON.stringify(updated, null, 2), structured: updated };
          }
          return { content: JSON.stringify(job, null, 2), structured: job };
        }
        case "create_programmable_wallet":
          return {
            content: JSON.stringify({
              status: "live_on_web",
              message:
                "Connect through arclancer.xyz/connect. Email OTP creates an Arc wallet and a connector token links that same Circle wallet to MCP.",
              connectUrl: process.env.NEXT_PUBLIC_APP_URL
                ? `${process.env.NEXT_PUBLIC_APP_URL}/connect`
                : "https://arclancer.xyz/connect",
              docs: "https://developers.circle.com/wallets/user-controlled/build-a-wallet-app",
            }, null, 2),
          };
        case "issue_creator_job_ticket": {
          const agentId = String(args.agent_id ?? "").trim();
          const contractAddress = String(args.contract_address ?? "").trim();
          const milestoneIndex = Number(args.milestone_index);
          const taskDescription = String(args.task_description ?? "").trim();
          if (!/^\d+$/.test(agentId)) {
            return { content: "agent_id must be a numeric agent id", isError: true };
          }
          if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
            return { content: "contract_address must be an EVM address", isError: true };
          }
          if (!Number.isInteger(milestoneIndex) || milestoneIndex < 0 || !taskDescription) {
            return {
              content: "milestone_index and task_description are required",
              isError: true,
            };
          }

          const [contract, agents] = await Promise.all([
            fetchContractDetails(contractAddress),
            fetchRegisteredAgents(),
          ]);
          const agent = agents.find((candidate) => String(candidate.id) === agentId);
          if (!agent?.isActive) {
            return { content: "Agent not found or inactive", isError: true };
          }
          if (!contract.funded || contract.status !== 0) {
            return { content: "Escrow must be funded and active", isError: true };
          }
          if (contract.freelancer.toLowerCase() !== agent.ownerAddress.toLowerCase()) {
            return {
              content: "Escrow freelancer does not match the registered agent owner",
              isError: true,
            };
          }
          const milestone = contract.milestones.find((item) => item.index === milestoneIndex);
          if (!milestone || milestone.paid) {
            return { content: "Milestone not found or already paid", isError: true };
          }
          if (agent.taskFee > 0 && milestone.amount < agent.taskFee) {
            return { content: "Escrow milestone does not cover the agent task fee", isError: true };
          }

          let payer = this.user.walletAddress;
          if (!payer && isWalletEnabled()) {
            const wallet = await getWallet(this.store as never, this.user.userId);
            payer = wallet?.address as `0x${string}` | undefined;
          }
          if (!payer || contract.client.toLowerCase() !== payer.toLowerCase()) {
            return {
              content: "The authenticated wallet must be the escrow client",
              isError: true,
            };
          }

          const ticket = issueCreatorJobTicket({
            agentId,
            mcpEndpoint: String(args.mcp_endpoint ?? ""),
            escrowContract: contract.address,
            milestoneIndex,
            payer,
            payee: agent.ownerAddress,
            amountUsdc: milestone.amount,
            taskText: taskDescription,
          });
          const result = {
            token: ticket.token,
            jobId: ticket.claims.job_id,
            expiresAt: new Date(ticket.claims.exp * 1000).toISOString(),
            mcpEndpoint: ticket.claims.aud,
            taskSha256: ticket.claims.task_sha256,
            paymentKind: ticket.claims.payment_kind,
          };
          return { content: JSON.stringify(result, null, 2), structured: result };
        }
        case "deposit":
          return this.wrap(
            await executeToolForUser("get_deposit_address", {}, this.user, this.store as never)
          );
        case "withdraw": {
          if (!isWalletEnabled()) return { content: "Wallet not enabled", isError: true };
          const wallet = await getWallet(this.store as never, this.user.userId);
          if (!wallet) return { content: "No wallet. Call create_wallet first.", isError: true };
          const to = String(args.to_address ?? "");
          const amount = Number(args.amount_usdc);
          if (!/^0x[a-fA-F0-9]{40}$/.test(to) || !amount || amount <= 0) {
            return { content: "Provide to_address and amount_usdc", isError: true };
          }
          const pk = getPrivateKey(wallet, this.user.userId) as `0x${string}`;
          const result = await executeUsdcTransfer(pk, to, amount);
          return {
            content: JSON.stringify(result, null, 2),
            isError: !result.success,
            structured: result,
          };
        }
        default:
          return { content: `Unknown tool: ${name}`, isError: true };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return { content: `ArcLancer error: ${msg}`, isError: true };
    }
  }

  private wrap(text: string): ToolResult {
    return { content: text, isError: text.startsWith("❌") || text.startsWith("Error:") };
  }

  private async deployFromDraft(): Promise<ToolResult> {
    const key = storeKey(this.user.sessionId);
    const state = await this.store.getJSON<DealCopilotState>(key);
    if (!state?.draft?.freelancerAddress || !state.draft.totalAmount) {
      return { content: "No complete deal draft. Use create_deal_draft first.", isError: true };
    }
    if (!isWalletEnabled()) return { content: "Wallet not enabled", isError: true };
    const wallet = await getWallet(this.store as never, this.user.userId);
    if (!wallet) return { content: "No wallet. Call create_wallet first.", isError: true };
    const pk = getPrivateKey(wallet, this.user.userId) as `0x${string}`;
    const result = await createEscrowContract(pk, state.draft);
    if (result.success && result.contractAddress) {
      state.draft.lastContractAddress = result.contractAddress;
      await this.store.setJSON(key, state, getDealTtlSeconds());
    }
    return {
      content: JSON.stringify(result, null, 2),
      isError: !result.success,
      structured: result,
    };
  }

  private async executeConfirmedWrite(
    expectedAction: string,
    fn: () => Promise<ToolResult>
  ): Promise<ToolResult> {
    const key = storeKey(this.user.sessionId);
    const state = await this.store.getJSON<DealCopilotState>(key);
    const pending = state?.draft?.pendingAction;
    if (!pending || pending.type !== expectedAction) {
      return {
        content: `Call request_confirmation with action_type "${expectedAction}" before this write.`,
        isError: true,
      };
    }
    const result = await fn();
    if (state?.draft) {
      delete state.draft.pendingAction;
      await this.store.setJSON(key, state, getDealTtlSeconds());
    }
    return result;
  }

  private async executeDirectWrite(
    fn: (pk: `0x${string}`) => Promise<{ success: boolean; error?: string; hash?: string; explorerUrl?: string }>
  ): Promise<ToolResult> {
    if (!isWalletEnabled()) return { content: "Wallet not enabled", isError: true };
    const wallet = await getWallet(this.store as never, this.user.userId);
    if (!wallet) return { content: "No wallet. Call create_wallet first.", isError: true };
    const pk = getPrivateKey(wallet, this.user.userId) as `0x${string}`;
    const result = await fn(pk);
    return {
      content: JSON.stringify(result, null, 2),
      isError: !result.success,
      structured: result,
    };
  }

  async readResource(uri: string): Promise<{ text: string; mimeType: string }> {
    if (uri === "arclancer://agents" || uri.startsWith("arclancer://agents/")) {
      if (uri === "arclancer://agents") {
        const agents = await fetchRegisteredAgents();
        return { text: JSON.stringify(agents, null, 2), mimeType: "application/json" };
      }
      const id = uri.replace("arclancer://agents/", "");
      const agents = await fetchRegisteredAgents();
      const agent = agents.find((a) => String(a.id) === id);
      if (!agent) return { text: JSON.stringify({ error: "Agent not found" }), mimeType: "application/json" };
      return { text: JSON.stringify(agent, null, 2), mimeType: "application/json" };
    }
    if (uri.startsWith("arclancer://contracts/")) {
      const address = uri.replace("arclancer://contracts/", "");
      const details = await fetchContractDetails(address);
      return { text: JSON.stringify(details, null, 2), mimeType: "application/json" };
    }
    if (uri.startsWith("arclancer://jobs/")) {
      const jobId = uri.replace("arclancer://jobs/", "");
      const job = await this.jobs.getJob(jobId);
      return { text: JSON.stringify(job ?? { error: "Not found" }, null, 2), mimeType: "application/json" };
    }
    return { text: JSON.stringify({ error: "Unknown resource URI" }), mimeType: "application/json" };
  }

  async listResources(): Promise<Array<{ uri: string; name: string; description?: string; mimeType: string }>> {
    const resources = [
      {
        uri: "arclancer://agents",
        name: "Agent Marketplace",
        description: "All registered AI agents on ArcLancer",
        mimeType: "application/json",
      },
    ];
    const agents = await fetchRegisteredAgents();
    for (const a of agents.slice(0, 20)) {
      resources.push({
        uri: `arclancer://agents/${a.id}`,
        name: `Agent: ${a.name}`,
        description: a.skill,
        mimeType: "application/json",
      });
    }
    const jobs = await this.jobs.searchJobs();
    for (const j of jobs.slice(0, 20)) {
      resources.push({
        uri: `arclancer://jobs/${j.id}`,
        name: `Job: ${j.title}`,
        description: j.description,
        mimeType: "application/json",
      });
    }
    return resources;
  }
}
