export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  tokenVersion: number;
  createdAt: string;
}

/** Everything the apps track for one learner. Mirrors the shape the web app already uses. */
export interface ProgressData {
  done: Record<string, boolean>;
  solved: Record<string, boolean>;
  notes: Record<string, string>;
  read: Record<string, boolean>;
  tchk: Record<string, boolean>;
  pos: Record<string, { t: string; s: number }>;
  speak: Record<string, { p: string; r: number[]; s: number }>;
  days: Record<string, number>;
  xp: number;
  streak: number;
  last: number | null;
  start: number | null;
}

export interface Progress {
  userId: string;
  version: number;
  data: ProgressData;
  updatedAt: string;
}

export interface Job {
  id: string;
  userId: string;
  company: string;
  role: string;
  loc: string;
  status: string;
  link: string;
  referral: string;
  applied: string;
  follow: string;
  notes: string;
  updatedAt: string;
}

export interface Hackathon {
  id: string;
  userId: string;
  name: string;
  platform: string;
  status: string;
  deadline: string;
  team: string;
  link: string;
  notes: string;
  updatedAt: string;
}

export type NewJob = Omit<Job, 'id' | 'userId' | 'updatedAt'>;
export type NewHackathon = Omit<Hackathon, 'id' | 'userId' | 'updatedAt'>;

export function emptyProgress(): ProgressData {
  return { done: {}, solved: {}, notes: {}, read: {}, tchk: {}, pos: {}, speak: {}, days: {}, xp: 0, streak: 0, last: null, start: null };
}

/** The storage contract. MongoDB in production, memory in tests. */
export interface Store {
  createUser(u: Omit<User, 'id'>): Promise<User | null>; // null when the email is taken
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  bumpTokenVersion(id: string): Promise<void>;

  getProgress(userId: string): Promise<Progress>;
  /** Saves only if expectedVersion matches. Returns the saved doc, or null on a version conflict. */
  saveProgress(userId: string, data: ProgressData, expectedVersion: number): Promise<Progress | null>;

  listJobs(userId: string): Promise<Job[]>;
  createJob(userId: string, j: NewJob): Promise<Job>;
  updateJob(userId: string, id: string, j: NewJob): Promise<Job | null>;
  deleteJob(userId: string, id: string): Promise<boolean>;

  listHackathons(userId: string): Promise<Hackathon[]>;
  createHackathon(userId: string, h: NewHackathon): Promise<Hackathon>;
  updateHackathon(userId: string, id: string, h: NewHackathon): Promise<Hackathon | null>;
  deleteHackathon(userId: string, id: string): Promise<boolean>;
}
