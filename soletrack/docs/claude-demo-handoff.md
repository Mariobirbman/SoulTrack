# Claude Code Handoff: Demo Video Execution (v2)

## Objective

Record a clean product demo showing the full SoleTrack flow:
seller lists → admin approves → buyer browses with market context → checkout → DM.

## Source of Truth

- Runbook: `soletrack/docs/demo-video-runbook.md`
- Scope guardrails: `soletrack/docs/code-health-release-checklist.md`

## Do Not Change

- Do not modify UI logic, schema, or Firestore message structure.
- Do not add new features for the recording pass.
- Do not mix unrelated refactors into the demo branch.

## Required Validation Before Recording

1. `npm test`
2. `npx vue-tsc --noEmit`
3. Manual smoke (all three demo roles):
   - `/login` — Demo Mode box shows Seller/Buyer/Admin buttons
   - `/sell` — Market Insight badge reactive on brand/price change
   - `/admin` — Kanban shows Pending/Active/Rejected columns, Approve works
   - `/browse` — Approved listings visible, price tiers colored
   - `/item/:id` — Market Intel block above Ask Price
   - `/analytics` — Decision Hub (3 cards) + role toggle + Deep Dive
   - `/order/:id` — grouped bubbles, jump-to-latest, multiline composer

## Recording Flow

1. Open `/login` → show Demo Mode box → click Seller.
2. `/sell` → list a shoe → show Market Insight badge update live.
3. Switch to Admin via DemoBar → `/admin` → approve the listing.
4. Switch to Buyer via DemoBar → `/browse` → show approved listing + price tiers.
5. Click into item → show Market Intel block.
6. Narrate data pipeline: CSV → brandStats.json → four surfaces.
7. `/analytics` → show Decision Hub → switch role → show recommendations change → open Deep Dive.
8. Cart → Checkout → `/order/:id` → show DM polish.
9. Reset demo / incognito → show auth redirect to `/login`.
10. End on terminal: `npm test` + `vue-tsc --noEmit` passing.

## Narration Cues

- "Demo mode runs entirely in localStorage — no Firebase credentials needed."
- "Listing approval is gated: nothing goes live until an admin approves it in the Kanban."
- "Market data comes from a 30K-row CSV pre-aggregated at build time. Same JSON feeds Browse, Item Detail, Sell, and Analytics."
- "Decision Hub is role-aware — buyers see buy signals, sellers see listing guidance, same underlying data."
- "Deep Dive keeps detailed charts available without overwhelming the default view."
- "Direct messaging uses grouped bubble treatment and a jump-to-latest anchor for long conversations."

## Done Criteria

- No console errors during full run.
- All three demo roles shown (Seller, Buyer, Admin).
- Admin approval loop demonstrated.
- Data pipeline narrated.
- Both buyer and seller perspectives shown in Analytics.
- Recording ends with explicit test/type-check evidence.
