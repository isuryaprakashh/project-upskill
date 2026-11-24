import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { Config } from './config.js';
import type { Store, User } from './store/types.js';

interface TokenPayload {
  sub: string;
  typ: 'access' | 'refresh';
  ver: number;
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const checkPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export function issueTokens(user: User, cfg: Config) {
  const base = { sub: user.id, ver: user.tokenVersion };
  return {
    accessToken: jwt.sign({ ...base, typ: 'access' }, cfg.accessSecret, { expiresIn: cfg.accessTtlSeconds }),
    refreshToken: jwt.sign({ ...base, typ: 'refresh' }, cfg.refreshSecret, { expiresIn: cfg.refreshTtlSeconds }),
    expiresIn: cfg.accessTtlSeconds,
  };
}

export function verifyToken(token: string, typ: 'access' | 'refresh', cfg: Config): TokenPayload | null {
  try {
    const p = jwt.verify(token, typ === 'access' ? cfg.accessSecret : cfg.refreshSecret) as TokenPayload;
    return p.typ === typ ? p : null;
  } catch {
    return null;
  }
}

export const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.createdAt });

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

/** Requires "Authorization: Bearer <access token>". Sets req.userId. */
export function requireAuth(store: Store, cfg: Config) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = token ? verifyToken(token, 'access', cfg) : null;
    if (!payload) return res.status(401).json({ error: 'Not signed in' });
    const user = await store.findUserById(payload.sub);
    if (!user || user.tokenVersion !== payload.ver) return res.status(401).json({ error: 'Session expired' });
    req.userId = user.id;
    next();
  };
}
