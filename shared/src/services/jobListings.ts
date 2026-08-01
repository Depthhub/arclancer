import type { JsonStore } from "../store/types.js";

export interface JobListing {
  id: string;
  title: string;
  description: string;
  budgetUsdc: number;
  deadlineDays: number;
  clientSessionId: string;
  clientUserId: number;
  status: "draft" | "published" | "filled" | "cancelled";
  milestones?: Array<{ amount: number; description: string }>;
  hiredFreelancerAddress?: string;
  escrowContractAddress?: string;
  createdAt: number;
  updatedAt: number;
}

const JOB_TTL = 60 * 60 * 24 * 90;
const JOB_INDEX_KEY = "arclancer:jobs:index";

function jobKey(id: string) {
  return `arclancer:job:${id}`;
}

function randomJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class JobListingService {
  constructor(private store: JsonStore) {}

  private async readIndex(): Promise<string[]> {
    return (await this.store.getJSON<string[]>(JOB_INDEX_KEY)) ?? [];
  }

  private async writeIndex(ids: string[]) {
    await this.store.setJSON(JOB_INDEX_KEY, ids, JOB_TTL);
  }

  async createJob(input: {
    title: string;
    description: string;
    budgetUsdc: number;
    deadlineDays: number;
    clientSessionId: string;
    clientUserId: number;
    milestones?: Array<{ amount: number; description: string }>;
    publish?: boolean;
  }): Promise<JobListing> {
    const id = randomJobId();
    const now = Date.now();
    const job: JobListing = {
      id,
      title: input.title,
      description: input.description,
      budgetUsdc: input.budgetUsdc,
      deadlineDays: input.deadlineDays,
      clientSessionId: input.clientSessionId,
      clientUserId: input.clientUserId,
      status: input.publish ? "published" : "draft",
      milestones: input.milestones,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.setJSON(jobKey(id), job, JOB_TTL);
    const index = await this.readIndex();
    index.unshift(id);
    await this.writeIndex(index);
    return job;
  }

  async getJob(id: string): Promise<JobListing | null> {
    return this.store.getJSON<JobListing>(jobKey(id));
  }

  async updateJob(id: string, patch: Partial<JobListing>): Promise<JobListing | null> {
    const existing = await this.getJob(id);
    if (!existing) return null;
    const updated: JobListing = { ...existing, ...patch, id, updatedAt: Date.now() };
    await this.store.setJSON(jobKey(id), updated, JOB_TTL);
    return updated;
  }

  async publishJob(id: string): Promise<JobListing | null> {
    return this.updateJob(id, { status: "published" });
  }

  async cancelJob(id: string): Promise<JobListing | null> {
    return this.updateJob(id, { status: "cancelled" });
  }

  async searchJobs(query?: string): Promise<JobListing[]> {
    const index = await this.readIndex();
    const jobs: JobListing[] = [];
    for (const id of index) {
      const job = await this.getJob(id);
      if (!job || job.status !== "published") continue;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${job.title} ${job.description}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      jobs.push(job);
    }
    return jobs;
  }
}
