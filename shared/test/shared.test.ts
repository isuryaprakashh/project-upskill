import { describe, expect, it, vi } from 'vitest';
import {
  ApiError, bump, checklistKeys, content, createClient, createProgressSync, currentStreak, emptyProgress,
  indexOf, mergeProgress, nextSession, sessionById, speakSeconds, startLabel, trackFor, trackProgress, week,
} from '../src';
import type { KeyValueStore, ProgressData } from '../src';

const memStore = (): KeyValueStore & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, get: async (k) => map.get(k) ?? null, set: async (k, v) => { map.set(k, v); }, del: async (k) => { map.delete(k); } };
};

describe('course content', () => {
  it('has every track and unique ids', () => {
    const counts = Object.fromEntries(Object.entries(content.sessions).map(([k, v]) => [k, v.length]));
    expect(counts).toEqual({ dsa: 72, sd: 48, build: 24, research: 12, review: 12 });
    const ids = Object.values(content.sessions).flat().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('finds sessions and their positions', () => {
    const s = sessionById('w1d1')!;
    expect(s.title).toMatch(/Big-O/);
    expect(indexOf(s)).toBe(0);
    expect(sessionById('nope')).toBeNull();
  });
  it('keeps old research checklist keys', () => {
    expect(checklistKeys(sessionById('r2')!)).toContain('research-1-0');
    expect(checklistKeys(sessionById('sd1')!)[0]).toBe('sd1-0');
  });
});

describe('schedule and streaks', () => {
  it('picks the right track for each day', () => {
    expect([1, 2, 3, 4, 5, 6].map((d) => trackFor(d, 1))).toEqual(['dsa', 'sd', 'dsa', 'sd', 'dsa', 'build']);
    expect(trackFor(0, 1)).toBe('research');
    expect(trackFor(0, 2)).toBe('review');
  });
  it('counts weeks from the start day, capped at 24', () => {
    const p = { ...emptyProgress(), start: 100 };
    expect(week(p, 100)).toBe(1);
    expect(week(p, 107)).toBe(2);
    expect(week(p, 100 + 7 * 40)).toBe(24);
    expect([week(p, 50), speakSeconds(1), speakSeconds(9), speakSeconds(17)]).toEqual([1, 60, 120, 180]);
  });
  it('grows a streak on consecutive days and resets after a gap', () => {
    let p = bump(emptyProgress(), 30, 10);
    expect([p.streak, p.xp, p.start]).toEqual([1, 30, 10]);
    p = bump(p, 10, 10);
    expect(p.streak).toBe(1);
    p = bump(p, 10, 11);
    expect(p.streak).toBe(2);
    expect(currentStreak(p, 12)).toBe(2);
    expect(currentStreak(p, 13)).toBe(0);
    expect(bump(p, 0, 15).streak).toBe(1);
  });
  it('finds the next unfinished session and the right button label', () => {
    const p = { ...emptyProgress(), done: { w1d1: true }, pos: { w1d2: { t: 'learn', s: 2 } } };
    const n = nextSession(content, p, 'dsa')!;
    expect(n.id).toBe('w1d2');
    expect(startLabel(n, p)).toBe('Continue at step 3 of 6');
    expect(startLabel(sessionById('w1d3')!, p)).toBe('Start lesson');
    expect(trackProgress(p, 'dsa').text).toBe('1/72');
  });
});

describe('merging two devices', () => {
  it('never loses work from either side', () => {
    const a: ProgressData = { ...emptyProgress(), done: { x: true }, notes: { x: 'short' }, xp: 50, streak: 3, last: 20, start: 5, pos: { y: { t: 'learn', s: 1 } } };
    const b: ProgressData = { ...emptyProgress(), done: { y: true }, notes: { x: 'a longer note' }, xp: 70, streak: 1, last: 18, start: 3, solved: { lc1: true } };
    const m = mergeProgress(a, b);
    expect(m.done).toEqual({ x: true, y: true });
    expect(m.notes.x).toBe('a longer note');
    expect([m.xp, m.streak, m.last, m.start]).toEqual([70, 3, 20, 3]);
    expect(m.solved.lc1).toBe(true);
    expect(m.pos.y).toBeUndefined(); // y is done, so its bookmark is dropped
  });
  it('lets a reset win over an older copy, in either order', () => {
    const old: ProgressData = { ...emptyProgress(), done: { w1d1: true }, xp: 90, epoch: 0 };
    const reset: ProgressData = { ...emptyProgress(), epoch: 1, start: 50 };
    expect(mergeProgress(old, reset).done).toEqual({});
    expect(mergeProgress(reset, old).done).toEqual({});
    expect(mergeProgress(reset, old).epoch).toBe(1);
  });
  it('keeps the further-along lesson position', () => {
    const a = { ...emptyProgress(), pos: { z: { t: 'learn', s: 1 } } };
    const b = { ...emptyProgress(), pos: { z: { t: 'learn', s: 4 } } };
    expect(mergeProgress(a, b).pos.z.s).toBe(4);
  });
});

/** A tiny fake backend, enough to test the client and sync. */
function fakeServer() {
  let version = 0;
  let data = emptyProgress();
  let accessOk = true;
  const calls: string[] = [];
  const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
  const fetch = vi.fn(async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    const path = url.replace('http://api', '');
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${path}`);
    const body = init?.body ? JSON.parse(init.body) : null;
    const user = { id: 'u1', email: 'a@b.co', name: 'A', createdAt: '' };
    if (path === '/auth/login') return reply(200, { user, accessToken: 'A1', refreshToken: 'R1' });
    if (path === '/auth/refresh') return reply(200, { user, accessToken: 'A2', refreshToken: 'R2' });
    if (!accessOk && init?.headers?.Authorization === 'Bearer A1') return reply(401, { error: 'Session expired' });
    if (path === '/progress' && method === 'GET') return reply(200, { version, data });
    if (path === '/progress' && method === 'PUT') {
      if (body.version !== version) return reply(409, { error: 'Out of date', version, data });
      version += 1; data = body.data; return reply(200, { version });
    }
    if (path === '/jobs') return reply(200, { jobs: [] });
    return reply(404, { error: 'Not found' });
  });
  return { fetch, calls, expireAccess: () => { accessOk = false; }, server: () => ({ version, data }), otherDevice: (d: ProgressData) => { version += 1; data = d; } };
}

describe('api client', () => {
  it('saves the session and restores it on the next start', async () => {
    const store = memStore();
    const s = fakeServer();
    const c1 = createClient({ baseUrl: 'http://api', store, fetch: s.fetch });
    await c1.login('a@b.co', 'pw');
    const c2 = createClient({ baseUrl: 'http://api', store, fetch: s.fetch });
    await c2.load();
    expect(c2.getSession()?.user.id).toBe('u1');
  });
  it('renews an expired access token once, transparently', async () => {
    const s = fakeServer();
    const c = createClient({ baseUrl: 'http://api', store: memStore(), fetch: s.fetch });
    await c.login('a@b.co', 'pw');
    s.expireAccess();
    expect(await c.listJobs()).toEqual([]);
    expect(s.calls).toContain('POST /auth/refresh');
    expect(c.getSession()?.accessToken).toBe('A2');
  });
  it('turns network failures into a friendly error', async () => {
    const c = createClient({ baseUrl: 'http://api', store: memStore(), fetch: async () => { throw new Error('offline'); } });
    await expect(c.login('a', 'b')).rejects.toMatchObject({ status: 0 });
    await expect(c.listJobs()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('progress sync', () => {
  it('saves locally at once, then syncs to the server', async () => {
    const s = fakeServer();
    const store = memStore();
    const client = createClient({ baseUrl: 'http://api', store, fetch: s.fetch });
    await client.login('a@b.co', 'pw');
    const sync = createProgressSync({ client, store, pushDelayMs: 5, persistDelayMs: 1 });
    await sync.start();
    sync.update((p) => ({ ...p, done: { w1d1: true } }));
    expect(sync.getData().done.w1d1).toBe(true);
    await sync.flush();
    expect(s.server().data.done.w1d1).toBe(true);
    expect(sync.getStatus()).toBe('saved');
  });
  it('merges when another device saved first', async () => {
    const s = fakeServer();
    const client = createClient({ baseUrl: 'http://api', store: memStore(), fetch: s.fetch });
    await client.login('a@b.co', 'pw');
    const sync = createProgressSync({ client, store: memStore(), pushDelayMs: 5 });
    await sync.start();
    s.otherDevice({ ...emptyProgress(), done: { phone: true } });
    sync.update((p) => ({ ...p, done: { ...p.done, laptop: true } }));
    await sync.flush();
    expect(s.server().data.done).toEqual({ phone: true, laptop: true });
  });
  it('resets everywhere, even when another device still has old progress', async () => {
    const s = fakeServer();
    const client = createClient({ baseUrl: 'http://api', store: memStore(), fetch: s.fetch });
    await client.login('a@b.co', 'pw');
    const laptop = createProgressSync({ client, store: memStore(), pushDelayMs: 5 });
    await laptop.start();
    laptop.update((p) => ({ ...p, done: { w1d1: true }, xp: 30 }));
    await laptop.flush();
    const phone = createProgressSync({ client, store: memStore(), pushDelayMs: 5 });
    await phone.start();
    expect(phone.getData().done.w1d1).toBe(true);
    await laptop.reset();
    expect(s.server().data.done).toEqual({});
    phone.update((p) => ({ ...p, notes: { x: 'old phone note' } }));
    await phone.flush();
    expect(s.server().data.done).toEqual({});
    expect(s.server().data.epoch).toBe(1);
    expect(phone.getData().done).toEqual({});
  });
  it('reports offline and keeps working without a server', async () => {
    const client = createClient({ baseUrl: 'http://api', store: memStore(), fetch: async () => { throw new Error('x'); } });
    const store = memStore();
    store.map.set('upskill-auth', JSON.stringify({ user: { id: 'u1' }, accessToken: 'A', refreshToken: 'R' }));
    const c = createClient({ baseUrl: 'http://api', store, fetch: async () => { throw new Error('x'); } });
    await c.load();
    const sync = createProgressSync({ client: c, store, pushDelayMs: 5 });
    await sync.start();
    expect(sync.getStatus()).toBe('offline');
    sync.update((p) => ({ ...p, xp: 5 }));
    expect(sync.getData().xp).toBe(5);
    expect(client).toBeTruthy();
  });
});
