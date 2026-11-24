import { z } from 'zod';

const str = (max: number) => z.string().trim().max(max);
const flags = z.record(z.string().max(120), z.boolean());

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: str(80).min(1),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10).max(2000) });

export const progressDataSchema = z.object({
  done: flags.default({}),
  solved: flags.default({}),
  notes: z.record(z.string().max(120), z.string().max(2000)).default({}),
  read: z.record(z.string().max(400), z.boolean()).default({}),
  tchk: flags.default({}),
  pos: z.record(z.string().max(120), z.object({ t: z.string().max(20), s: z.number().int().min(0).max(20) })).default({}),
  speak: z.record(z.string().max(20), z.object({ p: z.string().max(300), r: z.array(z.number().int().min(0).max(5)).length(3), s: z.number().int().min(0).max(600) })).default({}),
  days: z.record(z.string().max(20), z.number().int()).default({}),
  xp: z.number().int().min(0).max(10_000_000).default(0),
  streak: z.number().int().min(0).max(100_000).default(0),
  last: z.number().int().nullable().default(null),
  start: z.number().int().nullable().default(null),
  epoch: z.number().int().min(0).max(1_000_000).default(0),
});

export const saveProgressSchema = z.object({
  version: z.number().int().min(0),
  data: progressDataSchema,
});

export const jobSchema = z.object({
  company: str(120).min(1),
  role: str(160).min(1),
  loc: str(40).default('Remote'),
  status: z.enum(['Saved', 'Applied', 'OA', 'Interview', 'Offer', 'Rejected']).default('Saved'),
  link: str(600).default(''),
  referral: str(120).default(''),
  applied: str(10).default(''),
  follow: str(10).default(''),
  notes: str(2000).default(''),
});

export const hackathonSchema = z.object({
  name: str(160).min(1),
  platform: str(80).default(''),
  status: z.enum(['Interested', 'Registered', 'Submitted', 'Result']).default('Interested'),
  deadline: str(10).default(''),
  team: str(160).default(''),
  link: str(600).default(''),
  notes: str(2000).default(''),
});
