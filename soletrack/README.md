# SoleTrack (app)

## Quick start
```sh
npm install
npm run dev
```

## Scripts
- `npm run dev` - local dev server
- `npm run build` - type-check + production build

## Notes (Windows `spawn EPERM`)
If Vite/esbuild fails with `spawn EPERM` in a OneDrive folder, move the repo to a path like `C:\dev\soletrack` or whitelist it in Windows Security “Controlled folder access”.
