import { ApiError, createClient } from '@upskill/shared';
import { secure } from './secure';

export const client = createClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000', store: secure });
export { ApiError };
export const {
  load: loadSession, getSession, subscribe: subscribeSession, register, login, logout,
  listJobs, saveJob, deleteJob, listHackathons, saveHackathon, deleteHackathon,
} = client;
