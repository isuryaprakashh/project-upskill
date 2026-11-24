import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { checkPassword, hashPassword, issueTokens, publicUser, requireAuth, verifyToken } from './auth.js';
import type { Config } from './config.js';
import { hackathonSchema, jobSchema, loginSchema, refreshSchema, registerSchema, saveProgressSchema } from './schemas.js';
import type { Store } from './store/types.js';

/** Lets async route handlers throw; errors go to the error handler below. */
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler => (req, res, next) => {
  fn(req, res).catch(next);
};

export function createApp(store: Store, cfg: Config, opts: { rateLimit?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: cfg.corsOrigins, credentials: false }));
  app.use(express.json({ limit: '300kb' }));

  const auth = requireAuth(store, cfg);
  const authLimiter: RequestHandler =
    opts.rateLimit === false
      ? (_req, _res, next) => next()
      : rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  /* ---------- accounts ---------- */
  app.post('/auth/register', authLimiter, wrap(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const user = await store.createUser({
      email: body.email,
      name: body.name,
      passwordHash: await hashPassword(body.password),
      tokenVersion: 0,
      createdAt: new Date().toISOString(),
    });
    if (!user) return res.status(409).json({ error: 'An account with that email already exists' });
    res.status(201).json({ user: publicUser(user), ...issueTokens(user, cfg) });
  }));

  app.post('/auth/login', authLimiter, wrap(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await store.findUserByEmail(body.email);
    // Same message for a wrong email or a wrong password, so attackers can't tell which accounts exist.
    if (!user || !(await checkPassword(body.password, user.passwordHash))) return res.status(401).json({ error: 'Wrong email or password' });
    res.json({ user: publicUser(user), ...issueTokens(user, cfg) });
  }));

  app.post('/auth/refresh', authLimiter, wrap(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const payload = verifyToken(refreshToken, 'refresh', cfg);
    const user = payload ? await store.findUserById(payload.sub) : null;
    if (!payload || !user || user.tokenVersion !== payload.ver) return res.status(401).json({ error: 'Please sign in again' });
    res.json({ user: publicUser(user), ...issueTokens(user, cfg) });
  }));

  /** Signs out everywhere: every token issued before now stops working. */
  app.post('/auth/logout', auth, wrap(async (req, res) => {
    await store.bumpTokenVersion(req.userId!);
    res.status(204).end();
  }));

  app.get('/me', auth, wrap(async (req, res) => {
    const user = await store.findUserById(req.userId!);
    res.json({ user: publicUser(user!) });
  }));

  /* ---------- progress ---------- */
  app.get('/progress', auth, wrap(async (req, res) => {
    const p = await store.getProgress(req.userId!);
    res.json({ version: p.version, data: p.data, updatedAt: p.updatedAt });
  }));

  app.put('/progress', auth, wrap(async (req, res) => {
    const body = saveProgressSchema.parse(req.body);
    const saved = await store.saveProgress(req.userId!, body.data, body.version);
    if (!saved) {
      // Another device saved first. Send the latest so the app can merge and retry.
      const cur = await store.getProgress(req.userId!);
      return res.status(409).json({ error: 'Out of date', version: cur.version, data: cur.data, updatedAt: cur.updatedAt });
    }
    res.json({ version: saved.version, updatedAt: saved.updatedAt });
  }));

  /* ---------- jobs ---------- */
  app.get('/jobs', auth, wrap(async (req, res) => res.json({ jobs: await store.listJobs(req.userId!) })));
  app.post('/jobs', auth, wrap(async (req, res) => res.status(201).json({ job: await store.createJob(req.userId!, jobSchema.parse(req.body)) })));
  app.put('/jobs/:id', auth, wrap(async (req, res) => {
    const job = await store.updateJob(req.userId!, req.params.id, jobSchema.parse(req.body));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  }));
  app.delete('/jobs/:id', auth, wrap(async (req, res) => {
    if (!(await store.deleteJob(req.userId!, req.params.id))) return res.status(404).json({ error: 'Job not found' });
    res.status(204).end();
  }));

  /* ---------- hackathons ---------- */
  app.get('/hackathons', auth, wrap(async (req, res) => res.json({ hackathons: await store.listHackathons(req.userId!) })));
  app.post('/hackathons', auth, wrap(async (req, res) => res.status(201).json({ hackathon: await store.createHackathon(req.userId!, hackathonSchema.parse(req.body)) })));
  app.put('/hackathons/:id', auth, wrap(async (req, res) => {
    const hackathon = await store.updateHackathon(req.userId!, req.params.id, hackathonSchema.parse(req.body));
    if (!hackathon) return res.status(404).json({ error: 'Hackathon not found' });
    res.json({ hackathon });
  }));
  app.delete('/hackathons/:id', auth, wrap(async (req, res) => {
    if (!(await store.deleteHackathon(req.userId!, req.params.id))) return res.status(404).json({ error: 'Hackathon not found' });
    res.status(204).end();
  }));

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return res.status(400).json({ error: first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Invalid request' });
    }
    if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our side' });
  });

  return app;
}
