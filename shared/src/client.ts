import type { Hackathon, HackathonInput, Job, JobInput, ProgressData, User } from './types';

/** Where an app keeps small strings: localStorage on the web, encrypted storage on phones. */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

export interface AuthSession { user: User; accessToken: string; refreshToken: string }

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: unknown = null) {
    super(message);
  }
}

type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** One API client for web and mobile. Keeps the session, and renews expired access tokens once. */
export function createClient(opts: { baseUrl: string; store: KeyValueStore; key?: string; fetch?: Fetch }) {
  const KEY = opts.key ?? 'upskill-auth';
  const doFetch: Fetch = opts.fetch ?? ((u, i) => globalThis.fetch(u, i));
  let session: AuthSession | null = null;
  let loaded: Promise<void> | null = null;
  let refreshing: Promise<boolean> | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  async function write(s: AuthSession | null) {
    session = s;
    try {
      if (s) await opts.store.set(KEY, JSON.stringify(s));
      else await opts.store.del(KEY);
    } catch { /* storage unavailable: keep the session in memory */ }
    emit();
  }

  async function send(path: string, method: string, body: unknown, token?: string) {
    let res: Awaited<ReturnType<Fetch>>;
    try {
      res = await doFetch(opts.baseUrl + path, {
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

  function refresh(): Promise<boolean> {
    if (!session) return Promise.resolve(false);
    refreshing ??= (async () => {
      try {
        const d = (await send('/auth/refresh', 'POST', { refreshToken: session!.refreshToken })) as AuthSession;
        await write({ user: d.user, accessToken: d.accessToken, refreshToken: d.refreshToken });
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await write(null);
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  async function authed<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!session) throw new ApiError(401, 'Not signed in');
    try {
      return (await send(path, method, body, session.accessToken)) as T;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && (await refresh()) && session) return (await send(path, method, body, session.accessToken)) as T;
      throw e;
    }
  }

  return {
    /** Reads the saved sign-in once. Safe to call many times. */
    load() {
      loaded ??= (async () => {
        try {
          const raw = await opts.store.get(KEY);
          if (raw && !session) session = JSON.parse(raw) as AuthSession;
        } catch { /* nothing saved */ }
        emit();
      })();
      return loaded;
    },
    getSession: () => session,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },

    register: async (name: string, email: string, password: string) => write((await send('/auth/register', 'POST', { name, email, password })) as AuthSession),
    login: async (email: string, password: string) => write((await send('/auth/login', 'POST', { email, password })) as AuthSession),
    async logout() {
      try { await authed('/auth/logout', 'POST'); } catch { /* sign out locally anyway */ }
      await write(null);
    },

    getProgress: () => authed<{ version: number; data: ProgressData }>('/progress'),
    putProgress: (version: number, data: ProgressData) => authed<{ version: number }>('/progress', 'PUT', { version, data }),

    listJobs: async () => (await authed<{ jobs: Job[] }>('/jobs')).jobs,
    saveJob: async (j: JobInput, id?: string) => (await authed<{ job: Job }>(id ? `/jobs/${id}` : '/jobs', id ? 'PUT' : 'POST', j)).job,
    deleteJob: (id: string) => authed<null>(`/jobs/${id}`, 'DELETE'),

    listHackathons: async () => (await authed<{ hackathons: Hackathon[] }>('/hackathons')).hackathons,
    saveHackathon: async (h: HackathonInput, id?: string) => (await authed<{ hackathon: Hackathon }>(id ? `/hackathons/${id}` : '/hackathons', id ? 'PUT' : 'POST', h)).hackathon,
    deleteHackathon: (id: string) => authed<null>(`/hackathons/${id}`, 'DELETE'),
  };
}

export type Client = ReturnType<typeof createClient>;
