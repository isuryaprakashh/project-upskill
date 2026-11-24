# Mobile app

React Native + Expo (SDK 58) + TypeScript. Same backend, same course content and same sign-in as the web app.

## Run it on your phone

```bash
npm install                 # once, inside this mobile folder
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm start                   # shows a QR code
```

1. Install **Expo Go** from the App Store or Google Play.
2. In `.env`, set `EXPO_PUBLIC_API_URL` to your computer's local IP address, like `http://192.168.1.20:4000`. On a phone, `localhost` means the phone itself.
3. Make sure your phone and computer are on the same Wi-Fi.
4. Scan the QR code. Android: in Expo Go. iPhone: with the Camera app.

If your store's Expo Go doesn't support SDK 58 yet, use an Android emulator, or build a development app with `npx eas-cli@latest build --profile development`.

## Layout

- `src/app/`: screens (every file is a route)
  - `(auth)/`: sign in and create account
  - `(tabs)/`: Today, Tracks, Career, Library
  - `session/[id].tsx`: a lesson or session
  - `more/[page].tsx`: reading list, notebook, how it works, account
- `src/lib/api.ts`: talks to the backend; tokens are kept in encrypted storage
- `src/lib/progress.ts`: saves progress on the phone, then syncs
- `src/components/`: buttons, cards, the sketch renderer, the speaking screen
- `src/theme.ts`: colours and spacing from `DESIGN.md`

## Checks

```bash
npm run typecheck
npx expo lint
```
