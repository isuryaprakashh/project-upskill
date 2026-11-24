import { emptyProgress, mergeProgress } from '@upskill/shared';
import type { ProgressData } from '@upskill/shared';
import { useSyncExternalStore } from 'react';
import { ApiError, getProgress, getSession, putProgress } from './api';

export type SyncStatus = 'saved' | 'syncing' | 'offline';

let userId: string | null = null;
let data: ProgressData = emptyProgress();
let version = 0;
let status: SyncStatus = 'saved';
let timer: ReturnType<typeof setTimeout> | null = null;
let queue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const key = () => `upskill-progress:${userId}`;

function persist() {
  try { localStorage.setItem(key(), JSON.stringify({ data, version })); } catch { /* storage unavailable */ }
}
function setStatus(s: SyncStatus) {
  if (status !== s) { status = s; emit(); }
}

/** Loads this user's saved copy from the device, then merges with the server. */
export async function startProgress() {
  const s = getSession();
  userId = s?.user.id ?? null;
  data = emptyProgress();
  version = 0;
  if (!userId) { emit(); return; }
  try {
    const saved = JSON.parse(localStorage.getItem(key()) ?? 'null') as { data: ProgressData; version: number } | null;
    if (saved?.data) { data = { ...emptyProgress(), ...saved.data }; version = saved.version ?? 0; }
  } catch { /* start fresh */ }
  emit();
  await pull();
}

async function pull() {
  setStatus('syncing');
  try {
    const server = await getProgress();
    const merged = mergeProgress(data, { ...emptyProgress(), ...server.data });
    const changed = JSON.stringify(merged) !== JSON.stringify(server.data);
    data = merged;
    version = server.version;
    persist();
    emit();
    if (changed) await queuePush(); else setStatus('saved');
  } catch {
    setStatus('offline');
  }
}

/** Runs saves one after another, so two saves never race each other. */
function queuePush() {
  queue = queue.then(() => push());
  return queue;
}

async function push(retry = true): Promise<void> {
  if (!userId) return;
  setStatus('syncing');
  try {
    const r = await putProgress(version, data);
    version = r.version;
    persist();
    setStatus('saved');
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && retry) {
      // Another device saved first: merge with its copy and try once more.
      const latest = e.body as { version: number; data: ProgressData };
      data = mergeProgress(data, { ...emptyProgress(), ...latest.data });
      version = latest.version;
      persist();
      emit();
      return push(false);
    }
    setStatus('offline');
  }
}

/** Change progress. Saved on this device at once, then synced a moment later. */
export function updateProgress(fn: (p: ProgressData) => ProgressData) {
  data = fn(data);
  persist();
  emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void queuePush(); }, 1200);
}

export const retrySync = () => pull();

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useProgress = () => useSyncExternalStore(subscribe, () => data);
export const useSyncStatus = () => useSyncExternalStore(subscribe, () => status);
