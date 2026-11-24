import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { MemoryStore } from '../src/store/memory.js';
import { emptyProgress } from '../src/store/types.js';

const cfg: Config = {
  store: 'memory', port: 0, mongoUri: '', mongoDb: '', accessSecret: 'test-access-secret', refreshSecret: 'test-refresh-secret',
  corsOrigins: ['http://localhost:5173'], adminEmails: ['boss@example.com'], accessTtlSeconds: 900, refreshTtlSeconds: 3600,
};

let app: ReturnType<typeof createApp>;
beforeEach(() => {
  app = createApp(new MemoryStore(), cfg, { rateLimit: false });
});

async function signUp(email = 'sam@example.com') {
  const r = await request(app).post('/auth/register').send({ email, name: 'Sam', password: 'correct-horse' });
  return r.body as { accessToken: string; refreshToken: string; user: { id: string; email: string } };
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('accounts', () => {
  it('registers, and never returns the password hash', async () => {
    const r = await request(app).post('/auth/register').send({ email: 'Sam@Example.com ', name: 'Sam', password: 'correct-horse' });
    expect(r.status).toBe(201);
    expect(r.body.user.email).toBe('sam@example.com');
    expect(JSON.stringify(r.body)).not.toContain('passwordHash');
    expect(r.body.accessToken).toBeTruthy();
  });

  it('rejects a duplicate email, a short password and a bad email', async () => {
    await signUp();
    expect((await request(app).post('/auth/register').send({ email: 'sam@example.com', name: 'S', password: 'correct-horse' })).status).toBe(409);
    expect((await request(app).post('/auth/register').send({ email: 'a@b.co', name: 'S', password: 'short' })).status).toBe(400);
    expect((await request(app).post('/auth/register').send({ email: 'nope', name: 'S', password: 'correct-horse' })).status).toBe(400);
  });

  it('logs in with the right password only, with one message for both failures', async () => {
    await signUp();
    const ok = await request(app).post('/auth/login').send({ email: 'sam@example.com', password: 'correct-horse' });
    expect(ok.status).toBe(200);
    const wrongPw = await request(app).post('/auth/login').send({ email: 'sam@example.com', password: 'wrong' });
    const wrongEmail = await request(app).post('/auth/login').send({ email: 'nobody@example.com', password: 'correct-horse' });
    expect(wrongPw.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect(wrongPw.body.error).toBe(wrongEmail.body.error);
  });

  it('protects /me and rejects a refresh token used as an access token', async () => {
    const s = await signUp();
    expect((await request(app).get('/me')).status).toBe(401);
    expect((await request(app).get('/me').set(bearer(s.refreshToken))).status).toBe(401);
    const me = await request(app).get('/me').set(bearer(s.accessToken));
    expect(me.body.user.email).toBe('sam@example.com');
  });

  it('refreshes tokens, and logout invalidates old ones', async () => {
    const s = await signUp();
    const r = await request(app).post('/auth/refresh').send({ refreshToken: s.refreshToken });
    expect(r.status).toBe(200);
    expect((await request(app).post('/auth/refresh').send({ refreshToken: s.accessToken })).status).toBe(401);
    expect((await request(app).post('/auth/logout').set(bearer(s.accessToken))).status).toBe(204);
    expect((await request(app).get('/me').set(bearer(s.accessToken))).status).toBe(401);
    expect((await request(app).post('/auth/refresh').send({ refreshToken: s.refreshToken })).status).toBe(401);
  });
});

describe('progress', () => {
  it('starts empty, saves, and reads back', async () => {
    const s = await signUp();
    const first = await request(app).get('/progress').set(bearer(s.accessToken));
    expect(first.body.version).toBe(0);
    const data = { ...emptyProgress(), done: { w1d1: true }, xp: 30, streak: 1, last: 20780, notes: { w1d1: 'off by one' } };
    const put = await request(app).put('/progress').set(bearer(s.accessToken)).send({ version: 0, data });
    expect(put.status).toBe(200);
    expect(put.body.version).toBe(1);
    const again = await request(app).get('/progress').set(bearer(s.accessToken));
    expect(again.body.data.done.w1d1).toBe(true);
    expect(again.body.data.notes.w1d1).toBe('off by one');
  });

  it('returns 409 with the latest data when another device saved first', async () => {
    const s = await signUp();
    const a = { ...emptyProgress(), xp: 10 };
    const b = { ...emptyProgress(), xp: 20 };
    expect((await request(app).put('/progress').set(bearer(s.accessToken)).send({ version: 0, data: a })).status).toBe(200);
    const stale = await request(app).put('/progress').set(bearer(s.accessToken)).send({ version: 0, data: b });
    expect(stale.status).toBe(409);
    expect(stale.body.version).toBe(1);
    expect(stale.body.data.xp).toBe(10);
    expect((await request(app).put('/progress').set(bearer(s.accessToken)).send({ version: 1, data: b })).status).toBe(200);
  });

  it('rejects invalid data and keeps users separate', async () => {
    const s = await signUp();
    const t = await signUp('tara@example.com');
    const bad = await request(app).put('/progress').set(bearer(s.accessToken)).send({ version: 0, data: { ...emptyProgress(), xp: -5 } });
    expect(bad.status).toBe(400);
    await request(app).put('/progress').set(bearer(s.accessToken)).send({ version: 0, data: { ...emptyProgress(), xp: 99 } });
    const other = await request(app).get('/progress').set(bearer(t.accessToken));
    expect(other.body.data.xp).toBe(0);
  });
});

describe('jobs and hackathons', () => {
  it('creates, lists, updates and deletes a job', async () => {
    const s = await signUp();
    const made = await request(app).post('/jobs').set(bearer(s.accessToken)).send({ company: 'Acme', role: 'SDE Intern' });
    expect(made.status).toBe(201);
    expect(made.body.job.status).toBe('Saved');
    const id = made.body.job.id;
    const upd = await request(app).put(`/jobs/${id}`).set(bearer(s.accessToken)).send({ company: 'Acme', role: 'SDE Intern', status: 'Applied', applied: '2026-11-24' });
    expect(upd.body.job.status).toBe('Applied');
    expect((await request(app).get('/jobs').set(bearer(s.accessToken))).body.jobs).toHaveLength(1);
    expect((await request(app).delete(`/jobs/${id}`).set(bearer(s.accessToken))).status).toBe(204);
    expect((await request(app).get('/jobs').set(bearer(s.accessToken))).body.jobs).toHaveLength(0);
  });

  it('never lets one user read, change or delete another user\u2019s job', async () => {
    const s = await signUp();
    const t = await signUp('tara@example.com');
    const id = (await request(app).post('/jobs').set(bearer(s.accessToken)).send({ company: 'Acme', role: 'Dev' })).body.job.id;
    expect((await request(app).get('/jobs').set(bearer(t.accessToken))).body.jobs).toHaveLength(0);
    expect((await request(app).put(`/jobs/${id}`).set(bearer(t.accessToken)).send({ company: 'X', role: 'Y' })).status).toBe(404);
    expect((await request(app).delete(`/jobs/${id}`).set(bearer(t.accessToken))).status).toBe(404);
  });

  it('validates job input', async () => {
    const s = await signUp();
    expect((await request(app).post('/jobs').set(bearer(s.accessToken)).send({ company: '', role: 'Dev' })).status).toBe(400);
    expect((await request(app).post('/jobs').set(bearer(s.accessToken)).send({ company: 'A', role: 'B', status: 'Hired!!' })).status).toBe(400);
  });

  it('handles hackathons the same way', async () => {
    const s = await signUp();
    const made = await request(app).post('/hackathons').set(bearer(s.accessToken)).send({ name: 'HackIndia', deadline: '2026-12-05' });
    expect(made.status).toBe(201);
    const id = made.body.hackathon.id;
    const upd = await request(app).put(`/hackathons/${id}`).set(bearer(s.accessToken)).send({ name: 'HackIndia', status: 'Registered' });
    expect(upd.body.hackathon.status).toBe('Registered');
    expect((await request(app).delete(`/hackathons/${id}`).set(bearer(s.accessToken))).status).toBe(204);
  });
});

describe('admin', () => {
  it('only lets admin emails in, and never leaks password hashes', async () => {
    const boss = await signUp('Boss@Example.com');
    const sam = await signUp('sam@example.com');
    expect(boss.user).toMatchObject({ isAdmin: true });
    expect(sam.user).toMatchObject({ isAdmin: false });
    expect((await request(app).get('/admin/stats').set(bearer(sam.accessToken))).status).toBe(403);
    expect((await request(app).get('/admin/users').set(bearer(sam.accessToken))).status).toBe(403);
    expect((await request(app).get('/admin/users')).status).toBe(401);

    await request(app).put('/progress').set(bearer(sam.accessToken)).send({ version: 0, data: { ...emptyProgress(), done: { w1d1: true, w1d2: true }, solved: { lc1: true }, xp: 50 } });
    await request(app).post('/jobs').set(bearer(sam.accessToken)).send({ company: 'Acme', role: 'Dev' });

    const stats = await request(app).get('/admin/stats').set(bearer(boss.accessToken));
    expect(stats.status).toBe(200);
    expect(stats.body.totals).toMatchObject({ users: 2, newThisWeek: 2, activeThisWeek: 1, sessionsDone: 2, problemsSolved: 1, jobsTracked: 1 });
    expect(stats.body.signups).toHaveLength(14);
    expect(stats.body.signups[13].count).toBe(2);

    const users = await request(app).get('/admin/users').set(bearer(boss.accessToken));
    const row = users.body.users.find((u: { email: string }) => u.email === 'sam@example.com');
    expect(row).toMatchObject({ done: 2, solved: 1, xp: 50, jobs: 1 });
    expect(JSON.stringify(users.body)).not.toContain('passwordHash');
    expect((await request(app).get('/me').set(bearer(boss.accessToken))).body.user.isAdmin).toBe(true);
  });
});

describe('basics', () => {
  it('answers health checks, unknown routes and broken JSON', async () => {
    expect((await request(app).get('/health')).body.ok).toBe(true);
    expect((await request(app).get('/nope')).status).toBe(404);
    const r = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(r.status).toBe(400);
  });
});
