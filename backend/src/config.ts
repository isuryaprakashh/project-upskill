import 'dotenv/config';

export interface Config {
  /** "mongo" in production. "memory" keeps data in RAM, handy for trying the API with no database. */
  store: 'mongo' | 'memory';
  port: number;
  mongoUri: string;
  mongoDb: string;
  accessSecret: string;
  refreshSecret: string;
  corsOrigins: string[];
  /** Emails that can open the admin dashboard. */
  adminEmails: string[];
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

function need(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith('change-me')) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

export function loadConfig(): Config {
  const store = process.env.STORE === 'memory' ? 'memory' : 'mongo';
  return {
    store,
    port: Number(process.env.PORT ?? 4000),
    mongoUri: store === 'mongo' ? need('MONGODB_URI') : '',
    mongoDb: process.env.MONGODB_DB ?? 'upskill',
    accessSecret: need('JWT_ACCESS_SECRET'),
    refreshSecret: need('JWT_REFRESH_SECRET'),
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
    adminEmails: (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    accessTtlSeconds: 15 * 60,
    refreshTtlSeconds: 30 * 24 * 60 * 60,
  };
}
