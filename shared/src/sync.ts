import { ApiError } from './client';
import type { Client, KeyValueStore } from './client';
import { emptyProgress, mergeProgress, today } from './logic';
import type { ProgressData } from './types';

export type SyncStatus = 'saved' | 'syncing' | 'offline';

/**
 * Offline-first progress: every change is saved on the device straight away,
 * then sent to the server a moment later. Conflicts between devices are merged.
 */
export function createProgressSync(opts: { client: Client; store: KeyValueStore; pushDelayMs?: number; persistDelayMs?: number }) {
  const { client, store } = opts;
  let userId: string | null = null;
  let data: ProgressData = emptyProgress();
  let version = 0;
  let status: SyncStatus = 'saved';
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let queue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const key = () => `upskill-progress:${userId}`;

  function persistNow() {
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    if (userId) store.set(key(), JSON.stringify({ data, version })).catch(() => { /* ignore */ });
  }
  /** Typing a note fires many updates; write to storage at most a few times a second. */
  function persistSoon() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persistNow, opts.persistDelayMs ?? 300);
  }
  function setStatus(s: SyncStatus) {
    if (status !== s) { status = s; emit(); }
  }

  async function push(retry = true): Promise<void> {
    if (!userId) return;
    setStatus('syncing');
    try {
      const r = await client.putProgress(version, data);
      version = r.version;
      persistNow();
      setStatus('saved');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && retry) {
        // Another device saved first: merge with its copy, then try once more.
        const latest = e.body as { version: number; data: ProgressData };
        data = mergeProgress(data, { ...emptyProgress(), ...latest.data });
        version = latest.version;
        persistNow();
        emit();
        return push(false);
      }
      setStatus('offline');
    }
  }
  /** Saves run one after another so two saves never race. */
  const queuePush = () => (queue = queue.then(() => push()));

  async function pull() {
    setStatus('syncing');
    try {
      const server = await client.getProgress();
      const remote = { ...emptyProgress(), ...server.data };
      const merged = mergeProgress(data, remote);
      const changed = JSON.stringify(merged) !== JSON.stringify(remote);
      data = merged;
      version = server.version;
      persistNow();
      emit();
      if (changed) await queuePush(); else setStatus('saved');
    } catch {
      setStatus('offline');
    }
  }

  return {
    /** Loads the signed-in user's copy from the device, then merges with the server. */
    async start() {
      userId = client.getSession()?.user.id ?? null;
      data = emptyProgress();
      version = 0;
      if (!userId) { emit(); return; }
      try {
        const saved = JSON.parse((await store.get(key())) ?? 'null') as { data: ProgressData; version: number } | null;
        if (saved?.data) { data = { ...emptyProgress(), ...saved.data }; version = saved.version ?? 0; }
      } catch { /* start fresh */ }
      emit();
      await pull();
    },
    update(fn: (p: ProgressData) => ProgressData) {
      data = fn(data);
      persistSoon();
      emit();
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => { void queuePush(); }, opts.pushDelayMs ?? 1200);
    },
    /** Clears all progress on every device. Jobs and hackathons are kept. */
    async reset() {
      data = { ...emptyProgress(), start: today(), epoch: (data.epoch ?? 0) + 1 };
      persistNow();
      emit();
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
      await queuePush();
    },
    retry: pull,
    /** Waits for any scheduled save to finish (used by tests and before signing out). */
    async flush() {
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; await queuePush(); }
      await queue;
    },
    getData: () => data,
    getStatus: () => status,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}

export type ProgressSync = ReturnType<typeof createProgressSync>;
