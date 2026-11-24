import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { MemoryStore } from './store/memory.js';
import { MongoStore } from './store/mongo.js';

async function main() {
  const cfg = loadConfig();
  const mongo = cfg.store === 'mongo' ? await MongoStore.connect(cfg.mongoUri, cfg.mongoDb) : null;
  if (!mongo) console.warn('STORE=memory: data is kept in RAM and lost when the server stops.');
  const app = createApp(mongo ?? new MemoryStore(), cfg);
  const server = app.listen(cfg.port, () => console.log(`Upskill API listening on http://localhost:${cfg.port}`));

  const stop = async () => {
    server.close();
    await mongo?.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
