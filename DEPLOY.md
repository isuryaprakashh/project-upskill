# Going live: one database, one backend, web and iPhone

```
iPhone app ─┐
            ├──>  Backend on Render  ──>  MongoDB Atlas
Web app ────┘     (free)                   (free, 512 MB)
```

Both apps talk to the same backend, so the same account and progress show up everywhere.
Do the steps in order. About 30 minutes the first time.

## 1. MongoDB Atlas (the database)

1. **Change your database password first** (it was shared in a chat). Atlas: *Database Access* > your user > *Edit* > *Edit Password*.
2. *Network Access* > *Add IP Address* > **Allow access from anywhere** (`0.0.0.0/0`).
   Render's free plan has no fixed IP address, so this is required. Your strong password is what protects the database.
3. *Database* > *Connect* > *Drivers*. Copy the connection string and put your new password in it.

## 2. Backend on Render

1. Sign up at render.com with your GitHub account (isuryaprakashh). No card needed.
2. *New* > *Blueprint* > pick `project-upskill`. Render reads `render.yaml`.
3. When asked, fill in:
   - `MONGODB_URI`: the string from step 1.
   - `CORS_ORIGINS`: leave as `http://localhost:5173` for now. You'll update it in step 3.
   The two JWT secrets are generated for you.
4. Wait for the deploy, then open `https://<your-service>.onrender.com/health`. It should say `{"ok":true}`.

**Free plan note:** the server sleeps after 15 minutes with no visitors. The first request after that takes about a minute; the apps show "The server is waking up" while you wait. Render's paid plan removes the sleep.

## 3. Web app on Cloudflare Pages

1. Cloudflare dashboard > *Workers & Pages* > *Create* > *Pages* > connect to Git > `project-upskill`.
2. Settings:
   - Build command: `npm ci && npm run build -w web`
   - Build output directory: `web/dist`
   - Environment variable: `VITE_API_URL` = your Render address, like `https://upskill-api.onrender.com`
   - Environment variable: `NODE_VERSION` = `22`
3. Deploy. Then *Custom domains* > add something like `upskill.yourdomain.com` (your domain already uses Cloudflare DNS, so it's one click).
4. Back in Render, set `CORS_ORIGINS` to your web address, for example `https://upskill.yourdomain.com,https://project-upskill.pages.dev`. Save, and Render redeploys.

## 4. On your iPhone

### Option A: Home Screen app (free, no expiry, recommended)

Open your web address in **Safari** > Share > **Add to Home Screen**. It opens full screen with its own icon.

### Option B: the native app, sideloaded (paused for now; free, refresh every 7 days)

1. In GitHub: *Settings* > *Secrets and variables* > *Actions* > *Variables* > add `API_URL` = your Render address.
2. *Actions* tab > **iOS app for sideloading** > *Run workflow*. When it finishes, download `ProjectUpskill-ipa` from the run page and unzip it to get `ProjectUpskill.ipa`.
3. Install **SideStore** on your iPhone (follow the official guide at sidestore.io; it needs a computer once for setup).
4. Open the `.ipa` in SideStore and sign in with your Apple ID.
5. Turn on *Settings* > *Privacy & Security* > *Developer Mode* if iOS asks.

With a free Apple ID, sideloaded apps expire after 7 days. SideStore can refresh them over Wi-Fi from the phone itself.

**About this workflow:** it was written for this project but hasn't been run yet. If a step fails, the error on the Actions page says why. The most likely cause is the Xcode version on GitHub's Macs: Expo SDK 58 is built for iOS 27, so it needs Xcode 27.

### Option C: the paid route

The Apple Developer Program lets Expo's cloud service (EAS) build a signed app you install from a link, valid for a year, plus TestFlight. Run `npx eas-cli@latest build --platform ios --profile preview` in `mobile/`.

## Checklist

- [ ] Atlas password changed, network access open, connection string copied
- [ ] Render `/health` returns ok
- [ ] Web app loads on your domain and you can create an account
- [ ] `CORS_ORIGINS` on Render includes your web address
- [ ] Same account works on your iPhone
