import type { Hackathon, HackathonInput, Job, JobInput, ProgressData, User } from '@upskill/shared';

const API: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';
const KEY = 'upskill-auth';

interface Session { user: User; accessToken: string; refreshToken: string }

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: unknown = null) {
    super(message);
  }
}

let session: Session | null = read();
const listeners = new Set<() => void>();

function read(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
  } catch {
    return null;
  }
}
function write(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export const getSession = () => session;
export const subscribeSession = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

async function send(path: string, method: string, body: unknown, token?: string) {
  let res: Response;
  try {
    res = await fetch(API + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection.');
  }
  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? 'Request failed', data);
  return data;
}

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  if (!session) return false;
  refreshing ??= (async () => {
    try {
      const d = (await send('/auth/refresh', 'POST', { refreshToken: session!.refreshToken })) as Session;
      write({ user: d.user, accessToken: d.accessToken, refreshToken: d.refreshToken });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) write(null);
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Calls the API as the signed-in user, renewing the access token once if it expired. */
async function authed<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!session) throw new ApiError(401, 'Not signed in');
  try {
    return (await send(path, method, body, session.accessToken)) as T;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && (await refresh()) && session) return (await send(path, method, body, session.accessToken)) as T;
    throw e;
  }
}

export async function register(name: string, email: string, password: string) {
  write((await send('/auth/register', 'POST', { name, email, password })) as Session);
}
export async function login(email: string, password: string) {
  write((await send('/auth/login', 'POST', { email, password })) as Session);
}
export async function logout() {
  try { await authed('/auth/logout', 'POST'); } catch { /* sign out locally anyway */ }
  write(null);
}

export const getProgress = () => authed<{ version: number; data: ProgressData }>('/progress');
export const putProgress = (version: number, data: ProgressData) => authed<{ version: number }>('/progress', 'PUT', { version, data });

export const listJobs = async () => (await authed<{ jobs: Job[] }>('/jobs')).jobs;
export const saveJob = async (j: JobInput, id?: string) => (await authed<{ job: Job }>(id ? `/jobs/${id}` : '/jobs', id ? 'PUT' : 'POST', j)).job;
export const deleteJob = (id: string) => authed<null>(`/jobs/${id}`, 'DELETE');

export const listHackathons = async () => (await authed<{ hackathons: Hackathon[] }>('/hackathons')).hackathons;
export const saveHackathon = async (h: HackathonInput, id?: string) => (await authed<{ hackathon: Hackathon }>(id ? `/hackathons/${id}` : '/hackathons', id ? 'PUT' : 'POST', h)).hackathon;
export const deleteHackathon = (id: string) => authed<null>(`/hackathons/${id}`, 'DELETE');
