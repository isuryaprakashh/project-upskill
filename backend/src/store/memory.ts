import { randomUUID } from 'node:crypto';
import { emptyProgress } from './types.js';
import type { Hackathon, Job, NewHackathon, NewJob, Progress, ProgressData, Store, User } from './types.js';

/** In-memory store for tests and quick local runs. Data is lost on restart. */
export class MemoryStore implements Store {
  private users = new Map<string, User>();
  private progress = new Map<string, Progress>();
  private jobs = new Map<string, Job>();
  private hacks = new Map<string, Hackathon>();

  async createUser(u: Omit<User, 'id'>) {
    if ([...this.users.values()].some((x) => x.email === u.email)) return null;
    const user: User = { ...u, id: randomUUID() };
    this.users.set(user.id, user);
    return user;
  }
  async findUserByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }
  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }
  async bumpTokenVersion(id: string) {
    const u = this.users.get(id);
    if (u) u.tokenVersion += 1;
  }

  async getProgress(userId: string) {
    return this.progress.get(userId) ?? { userId, version: 0, data: emptyProgress(), updatedAt: new Date(0).toISOString() };
  }
  async saveProgress(userId: string, data: ProgressData, expectedVersion: number) {
    const cur = await this.getProgress(userId);
    if (cur.version !== expectedVersion) return null;
    const next: Progress = { userId, version: cur.version + 1, data, updatedAt: new Date().toISOString() };
    this.progress.set(userId, next);
    return next;
  }

  async listJobs(userId: string) {
    return [...this.jobs.values()].filter((j) => j.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async createJob(userId: string, j: NewJob) {
    const job: Job = { ...j, id: randomUUID(), userId, updatedAt: new Date().toISOString() };
    this.jobs.set(job.id, job);
    return job;
  }
  async updateJob(userId: string, id: string, j: NewJob) {
    const cur = this.jobs.get(id);
    if (!cur || cur.userId !== userId) return null;
    const job: Job = { ...cur, ...j, updatedAt: new Date().toISOString() };
    this.jobs.set(id, job);
    return job;
  }
  async deleteJob(userId: string, id: string) {
    const cur = this.jobs.get(id);
    if (!cur || cur.userId !== userId) return false;
    return this.jobs.delete(id);
  }

  async listHackathons(userId: string) {
    return [...this.hacks.values()].filter((h) => h.userId === userId).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  }
  async createHackathon(userId: string, h: NewHackathon) {
    const hack: Hackathon = { ...h, id: randomUUID(), userId, updatedAt: new Date().toISOString() };
    this.hacks.set(hack.id, hack);
    return hack;
  }
  async updateHackathon(userId: string, id: string, h: NewHackathon) {
    const cur = this.hacks.get(id);
    if (!cur || cur.userId !== userId) return null;
    const hack: Hackathon = { ...cur, ...h, updatedAt: new Date().toISOString() };
    this.hacks.set(id, hack);
    return hack;
  }
  async deleteHackathon(userId: string, id: string) {
    const cur = this.hacks.get(id);
    if (!cur || cur.userId !== userId) return false;
    return this.hacks.delete(id);
  }
}
