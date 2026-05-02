# Demo Video Runbook (v2 — Post Full-Rehaul)

## Goal

Show a working sneaker marketplace from listing to purchase, with three differentiated layers:
1. **Data pipeline** — 30K-row CSV → brandStats.json → four live surfaces
2. **Role-aware UI** — buyer and seller see different recommendations everywhere
3. **Full admin loop** — pending listing → admin approval → live in Browse

## Pre-Flight

1. Start dev server: `npm run dev` (default port 5174 or 5199).
2. Run:
   - `npm test`
   - `npx vue-tsc --noEmit`
3. Open browser DevTools console, clear logs.
4. Use demo mode (no real Firebase needed):
   - Hit `/login` and click **Seller**, **Buyer**, or **Admin** buttons in the Demo Mode box.
   - Or use the **DemoBar** at the bottom to switch roles mid-session.

## Demo Script

### 1. Demo Mode Intro (30 sec)
- Open `/login`.
- Point out the Demo Mode box with three buttons: Seller, Buyer, Admin.
- Click **Seller** — lands on `/account` or `/sell`.
- Checkpoint: DemoBar appears at bottom showing role badge.
- Narration: "All data is localStorage-only. No real accounts needed for grading."

### 2. Seller Lists a Shoe (1 min)
- Go to `/sell`.
- In Shop Profile section, show vendor name pre-filled ("Demo Vault").
- In New Listing form:
  - Pick a brand from the dropdown.
  - Select a model preset — title auto-fills.
  - Set a price.
- Checkpoint: **Market Insight badge** appears in the preview card on the right showing brand avg, delta, and recommendation.
- Checkpoint: No delta sentence when price is 0 or empty.
- Submit the listing.
- Checkpoint: listing enters the admin approval queue (status: pending).

### 3. Admin Approval Kanban (1 min)
- Switch role to **Admin** via the DemoBar at bottom.
- Go to `/admin`.
- Checkpoint: Kanban shows three columns — **Pending**, **Active**, **Rejected**.
- Checkpoint: the listing just submitted appears in Pending.
- Click **Approve**.
- Checkpoint: listing moves to Active column. Toast confirms.
- Narration: "Nothing goes live in Browse without admin approval."

### 4. Buyer Browses + Market Intel (1 min)
- Switch role to **Buyer** via DemoBar.
- Go to `/browse`.
- Checkpoint: product grid shows the approved listing.
- Checkpoint: price color tiers — green (fair), yellow (above avg), red (high risk) — sourced from brandStats.json.
- Click a product card.
- Checkpoint: **Market Intel block** above Ask Price shows:
  - Avg Price
  - Brand Sales
  - Delta label (above/below/at market)
- Narration: "Price context is baked in at every step — Browse, Item Detail, and Sell."

### 5. Data Pipeline Story (30 sec narration)
- Narration: "All market data flows from one source: a 30K-row CSV of historical sales, pre-aggregated at build time into `public/data/brandStats.json` via `scripts/buildBrandStats.ts`. That JSON feeds four live surfaces: Browse price tiers, Item Detail market intel, Sell insight badge, and Analytics Decision Hub. One data layer, four consumer surfaces."

### 6. Analytics Decision Hub (1.5 min)
- Stay in **Buyer** role.
- Go to `/analytics`.
- Checkpoint: **Decision Hub** is the first visible section with exactly 3 cards: Price, Timing, Demand.
- Checkpoint: each card shows recommendation, reason, metrics, and confidence level.
- Switch to **Seller** via the role toggle at the top of the page.
- Checkpoint: recommendation text changes (e.g. "List now" vs "Good time to buy").
- Click **Open Deep Dive Data**.
- Checkpoint: detailed charts and tables expand. Not visible by default — keeps the top view clean.
- Narration: "The Decision Hub is role-aware. Same data, different framing depending on whether you're buying or selling."

### 7. Checkout + DM Polish (1.5 min)
- Add a product to cart from Browse.
- Go to `/cart` → proceed to `/checkout`.
- Checkpoint: order created, redirect to `/orders` or `/order/:id`.
- Open an order detail at `/order/:id`.
- Checkpoint: chat header shows role context (Buyer/Seller), order badge, and live/demo badge.
- Checkpoint: multiline composer present with hint text (Enter to send, Shift+Enter for newline).
- Send a message.
- Checkpoint: message appears with grouped bubble treatment.
- Scroll up in chat history, then send another message.
- Checkpoint: **"Jump to latest"** button appears when not near bottom.

### 8. Auth Protection Proof (30 sec)
- Switch DemoBar to off (Reset Demo) or open incognito.
- Navigate to `/sell` or `/account`.
- Checkpoint: redirects to `/login` (no bypass).

### 9. Close with Test Evidence
- Show terminal: `npm test` passing.
- Show terminal: `npx vue-tsc --noEmit` clean.

## Data Pipeline Reference

```
scripts/buildBrandStats.ts
  → reads: (CSV sales data source)
  → writes: public/data/brandStats.json

public/data/brandStats.json
  → consumed by: src/lib/useBrandStats.ts

useBrandStats.ts feeds:
  1. Browse.vue         — price color tiers on cards
  2. ItemDetail.vue     — Market Intel block above Ask Price
  3. Sell.vue           — Market Insight badge in live preview
  4. Analytics.vue      — Decision Hub (3-card summary) + Deep Dive
```

## Recording Checklist

- [ ] No runtime errors in console during full run
- [ ] All 3 demo roles shown (Seller, Buyer, Admin)
- [ ] Admin Kanban approval loop shown
- [ ] Data pipeline narrated at step 5
- [ ] Decision Hub role switch shown
- [ ] DM grouped bubbles + jump-to-latest shown
- [ ] Auth redirect confirmed
- [ ] `npm test` + `vue-tsc --noEmit` shown passing
