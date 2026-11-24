# Project Upskill

A 24-week course that takes you from "where do I start?" to interview-ready, with one backend shared by a web app and a mobile app.

## What's in this repo

| Folder | What it is | Status |
|---|---|---|
| `backend/` | Node + TypeScript API (Express, MongoDB, JWT login) | Built, 13 tests passing |
| `web/` | React + TypeScript web app (Vite) | Built, tested end to end |
| `shared/` | The whole course as data, plus TypeScript types and shared logic | Built |
| `mobile/` | React Native app (Expo SDK 58) | Built, tested in a phone-sized browser |
| `workers/jobs/` | Cloudflare Worker that collects fresher-friendly remote jobs | Built |
| `legacy/` | The original single-file app, still usable on its own | Reference |

## Run it on your computer

You need [Node.js 20 or newer](https://nodejs.org).

```bash
# 1. Install everything (run once, from this folder)
npm install

# 2. Set up the backend
cd backend
copy .env.example .env        # macOS/Linux: cp .env.example .env
# Open .env and fill in MONGODB_URI and the two JWT secrets.
# No database yet? Add the line STORE=memory to try it with nothing saved.
npm run dev                   # API on http://localhost:4000

# 3. In a second terminal, start the web app
cd web
copy .env.example .env
npm run dev                   # opens on http://localhost:5173
```

Create an account in the web app and you're in. Sign in on another browser to see your progress follow you.

```bash
# 4. Optional: the mobile app (see mobile/README.md for phone setup)
cd mobile
npm install
npm start
```

## Useful commands

| Command (from the repo root) | What it does |
|---|---|
| `npm test` | Runs the backend tests |
| `npm run check` | Builds and checks everything: shared, backend tests, web, mobile types |
| `npm run build` | Type-checks and builds everything |
| `npm run dev:backend` / `npm run dev:web` / `npm run dev:mobile` | Starts one part |

## How the pieces fit

- **Accounts:** email and password. Passwords are hashed with bcrypt. Login returns a short-lived access token and a 30-day refresh token.
- **Progress:** each app saves on the device first, so it works offline, then syncs. If two devices save at once, the server answers "out of date" and the app merges both copies, so nothing is lost.
- **Course content** lives in `shared/src/content.json`. Web and mobile both read it, so they always match.
- **Mobile** is its own npm project (it uses React 19 while web uses React 18), and reads `shared/` through a local link.
- **Jobs and hackathons** are stored per user in MongoDB.

## The API

| Method and path | Purpose |
|---|---|
| `POST /auth/register`, `POST /auth/login` | Create an account, sign in |
| `POST /auth/refresh`, `POST /auth/logout` | Renew tokens, sign out everywhere |
| `GET /me` | The signed-in user |
| `GET /progress`, `PUT /progress` | Read and save progress (with a version number) |
| `GET/POST /jobs`, `PUT/DELETE /jobs/:id` | Job tracker |
| `GET/POST /hackathons`, `PUT/DELETE /hackathons/:id` | Hackathon tracker |

## Deploying

- **Web:** Cloudflare Pages. Build command `npm run build -w web`, output folder `web/dist`. Set `VITE_API_URL` to your API's address.
- **Backend:** any Node host (Render, Railway, Fly.io). Run `npm run build -w backend`, then `npm run start -w backend`. Set the variables from `backend/.env.example`, and add your web address to `CORS_ORIGINS`.
- **Jobs Worker:** `cd workers/jobs && npx wrangler deploy`, then give it a custom domain.

## Security checklist

- [ ] Change the MongoDB password that was shared in chat, before first use.
- [ ] Never commit `.env`. It is already in `.gitignore`.
- [ ] Use two different long random strings for the JWT secrets.
- [ ] In MongoDB Atlas, restrict Network Access to your backend host when you deploy.
