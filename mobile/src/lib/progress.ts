import AsyncStorage from '@react-native-async-storage/async-storage';
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
  AsyncStorage.setItem(key(), JSON.stringify({ data, version })).catch(() => { /* ignore */ });
}
function setStatus(s: SyncStatus) {
  if (status !== s) { status = s; emit(); }
}

/** Loads this user's copy from the phone, then merges with the server. */
export async function startProgress() {
  userId = getSession()?.user.id ?? null;
  data = emptyProgress();
  version = 0;
  if (!userId) { emit(); return; }
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(key())) ?? 'null') as { data: ProgressData; version: number } | null;
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

/** Change progress: saved on the phone at once, synced a moment later. */
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
