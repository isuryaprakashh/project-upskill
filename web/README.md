# Web app

React + TypeScript + Vite.

```bash
copy .env.example .env
npm run dev      # http://localhost:5173
npm run build    # type-check, then build into dist/
```

## Layout

- `src/lib/api.ts`: talks to the backend, renews tokens automatically
- `src/lib/progress.ts`: saves progress on the device and syncs it
- `src/lib/course.ts`: helpers for reading course content
- `src/components/`: the shell, speaking sheet and small UI pieces
- `src/pages/`: Today, Tracks, Session, Career, Library, sign-in
- `src/styles.css`: the design system (see `DESIGN.md` in the repo root)
