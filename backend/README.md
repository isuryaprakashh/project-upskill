# Backend

Node + TypeScript API for Project Upskill.

```bash
copy .env.example .env   # then fill it in
npm run dev              # start with auto-reload
npm test                 # 13 tests, no database needed
npm run build && npm start
```

## Layout

- `src/app.ts`: every route, plus error handling
- `src/auth.ts`: password hashing, tokens, the sign-in guard
- `src/schemas.ts`: input validation (zod)
- `src/store/types.ts`: the storage contract
- `src/store/mongo.ts`: MongoDB storage
- `src/store/memory.ts`: in-memory storage for tests and `STORE=memory`
- `test/api.test.ts`: the tests

The tests use the in-memory store. The MongoDB store follows the same contract but hasn't been run against a live cluster yet, so try sign-up, saving progress and the job tracker once after you connect yours.
