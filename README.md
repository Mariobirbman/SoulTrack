# SoleTrack

## Project location
The app lives in `soletrack/` (Vue 3 + TypeScript + Vite + Vue Router).

## Firebase (DB + login)
The app is wired for Firebase Authentication + Cloud Firestore. Setup guide:
- `docs/firebase-setup.md`

## Dataset analytics (tables + shoes)
The global sales CSV is included and rendered on `/analytics`:
- `docs/dataset-analytics.md`

## Running locally
From `soletrack/`:
- `npm install` (or `npm ci`)
- `npm run dev`

## If you see `Error: spawn EPERM` (Vite/esbuild)
On some Windows setups (often with OneDrive/Defender “Controlled folder access” or similar restrictions), Vite/esbuild can fail to spawn its background service.

Common fixes:
- Move the repo to a non-OneDrive path like `C:\dev\soletrack` and try again.
- Temporarily disable/whitelist the project for “Controlled folder access”/antivirus.
- Use Node.js LTS (e.g., Node 20 or 22) instead of Node 24 if your environment is locked down.

## Team workflow (GitHub)
- Create a branch per change (example: `feature/navbar-mobile`)
- Open a PR for review
- Don’t commit secrets (API keys, `.env` files)

## Optional: Antigravity skills
If you use Antigravity skills in your local AI tooling, see:
- `docs/antigravity-skills.md`

## Production + audit
- `docs/production-checklist.md`
- `docs/site-audit.md`
