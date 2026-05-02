# Code Health + Scope Freeze Checklist

## Scope Freeze (Before Demo/Release)
1. Keep only auth/market-intel/UI files in the demo branch.
2. Do not bundle unrelated experiments/assets in the same PR.
3. Confirm `git diff --name-only` only contains intended paths.

## Known Risk Controls
1. Auth drift:
   - Use `isAuthBypassEnabled()` for all bypass decisions.
   - Do not add per-view hardcoded bypass logic.
2. Accessibility:
   - Ensure all input/select/textarea controls have associated labels or `aria-label`.
3. Text quality:
   - Run a quick mojibake scan before release (`Â`, `Ã`, replacement chars).

## Ship Gate
- `npm test` passes.
- `npx vue-tsc --noEmit` passes.
- Real login flow validated manually.
- Protected routes redirect correctly when bypass is off.
- Bypass behavior works only when `VITE_AUTH_BYPASS=1` in dev.

