import { ApiError, createClient } from '@upskill/shared';
import type { KeyValueStore } from '@upskill/shared';

/** Browser storage, wrapped in the shared async interface. */
export const browserStore: KeyValueStore = {
  get: async (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: async (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
  del: async (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const client = createClient({ baseUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000', store: browserStore });
export { ApiError };
export const {
  load: loadSession, getSession, subscribe: subscribeSession, register, login, logout,
  listJobs, saveJob, deleteJob, listHackathons, saveHackathon, deleteHackathon, adminStats, adminUsers,
} = client;
