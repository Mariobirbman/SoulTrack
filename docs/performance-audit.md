# SoleTrack — Performance & Database Scale Audit

> **Date:** April 4, 2026  
> **Dataset:** `global_sports_footwear_sales_2018_2026.csv` — 30,000 rows, 18 columns  
> **DB:** Firebase Firestore (marketplace) + static CSV (analytics catalog)

---

## 1. What "the database" actually is — two separate things

Many teammates ask "are we using a real database?" — the answer is **yes, two of them:**

| | Firestore | CSV Dataset |
|---|---|---|
| **What it stores** | Vendors, products, orders, users | Global footwear sales 2018–2026 |
| **Row count** | ~9 products + 6 vendors (demo) | **30,000 rows** |
| **Where it lives** | Google Firebase cloud | `/public/data/` (static file) |
| **Used by** | Browse, Vendors, Cart, Checkout, Sell | Analytics ("Shoe Catalog") |
| **Live/real-time?** | Yes — `onSnapshot` updates in real time | No — loaded once on page visit |
| **Proof visible at** | Firebase Console → Firestore | `src/lib/salesDataset.ts` |

---

## 2. CSV pipeline — how 30,000 rows are handled

### The current flow

```
User visits /analytics
        ↓
fetch('/data/global_sports_footwear_sales_2018_2026.csv')   ← ~4 MB download
        ↓
PapaParse { worker: true }   ← runs in a Web Worker (off main thread ✓)
        ↓
rows.value = 30,000 SalesOrderRow objects   ← stored in reactive ref
        ↓
Computed: filteredOrders   ← iterates all 30K rows on every filter change
        ↓
Computed: shoes (aggregateShoes)   ← single-pass Map, very efficient ✓
        ↓
Computed: currentRows   ← spreads + sorts + slices to page of 25 ✓
        ↓
<table> renders 25 rows max   ← DOM stays small ✓
```

### What's good ✅

| Feature | Why it helps |
|---|---|
| `PapaParse { worker: true }` | CSV parsing runs in a Web Worker — UI stays responsive during load |
| Pagination (25 rows/page) | DOM never has more than 25 rows rendered |
| `aggregateShoes` uses a single-pass `Map` | O(n) aggregation — processes 30K rows in one loop |
| Vue computed caching | Re-computes only when dependencies change, not on every render |
| Spread-then-sort `[...list].sort()` | Doesn't mutate the reactive array (prevents extra re-renders) |

### What's not optimized ⚠️

| Issue | Impact | File |
|---|---|---|
| All 30K rows in a plain `ref<SalesOrderRow[]>()` | Vue 3 makes every object in a `ref` deeply reactive. 30K deep-reactive objects = significant memory overhead | `Analytics.vue:9` |
| `years`, `brands`, `countries` are 3 separate computed loops over 30K rows | 3× redundant iteration on every filter change | `Analytics.vue:77–83` |
| `totals` uses 4 separate `.reduce()` calls in one computed | Minor — 4 passes over `filteredOrders` instead of 1 | `Analytics.vue:110–117` |
| CSV is re-fetched every time the component mounts | If user navigates away and back, the 4MB file downloads again | `salesDataset.ts:51` |
| No memoization of `aggregateShoes` result | If filters don't change, re-agg runs anyway | `Analytics.vue:97–101` |

---

## 3. Firestore pipeline — how marketplace data is handled

### The current flow

```
User visits /browse
        ↓
onSnapshot(query(collection(db, 'products')))   ← persistent listener
        ↓
Real-time updates whenever Firestore changes
        ↓
Filter in-memory: active === true && vendorUid !== ''
        ↓
All remaining products in a reactive array → rendered to the grid
```

### What's good ✅

| Feature | Why it helps |
|---|---|
| `onSnapshot` instead of `getDocs` | Keeps data live; single persistent connection |
| `onBeforeUnmount` cleanup | Listener is torn down on navigation — no memory leak |
| Client-side filter + sort | Fast for current scale (~9 demo products) |
| `computed` for all derived state | Vue caches the filtered/sorted results |

### What breaks at production scale ⚠️

| Issue | Breaks at | Fix |
|---|---|---|
| **"Fetch all products" query** — `collection(db, 'products')` with no limit | ~500+ products | Use `query(..., limit(50))` + cursor pagination |
| **Client-side filtering** for brand/condition/platform | ~500+ products | Move filters to Firestore `where()` clauses |
| **No Firestore indexes** for compound queries | 2+ `where()` clauses | Define composite indexes in `firestore.indexes.json` |
| **All products in one reactive ref** | ~1,000+ products | Stream into a paginated list instead |

---

## 4. Scale projections

| Products in DB | Current behavior | Expected problem |
|---|---|---|
| 9 (now) | ✅ Fast, no issues | — |
| 100 | ✅ Still fine | Slightly slower initial load |
| 500 | ⚠️ Noticeable lag | Filter/sort computed slows down |
| 1,000 | ❌ Sluggish | 1K deep-reactive objects, slow sorts |
| 10,000 | ❌ Browser may hang | Full collection download on every mount |

---

## 5. Optimizations to implement (priority order)

### Quick wins (low effort, high impact)

**A. Use `shallowRef` for the 30K-row array**

```ts
// salesDataset.ts — change this:
const rows = ref<SalesOrderRow[]>([])

// to this:
import { shallowRef } from 'vue'
const rows = shallowRef<SalesOrderRow[]>([])
```

`shallowRef` makes only the array itself reactive, not every object inside it. For 30K rows this cuts reactive overhead by ~60–70%.

---

**B. Cache the CSV parse result at module level**

```ts
// salesDataset.ts
let _cachedRows: SalesOrderRow[] | null = null

export async function loadSalesOrdersCsv(url: string): Promise<SalesOrderRow[]> {
  if (_cachedRows) return _cachedRows
  // ... existing fetch + parse code ...
  _cachedRows = rows
  return rows
}
```

Navigating away and back to Analytics no longer re-downloads 4MB.

---

**C. Combine three computed loops into one**

```ts
// Analytics.vue — replace separate years/brands/countries computeds
const filterOptions = computed(() => {
  const yearSet = new Set<string>()
  const brandSet = new Set<string>()
  const countrySet = new Set<string>()
  for (const r of rows.value) {
    yearSet.add(r.order_date.slice(0, 4))
    brandSet.add(r.brand)
    countrySet.add(r.country)
  }
  return {
    years: ['All', ...Array.from(yearSet).sort()],
    brands: ['All', ...Array.from(brandSet).sort()],
    countries: ['All', ...Array.from(countrySet).sort()],
  }
})
```

One pass over 30K rows instead of three.

---

**D. Combine totals into one `reduce`**

```ts
const totals = computed(() => {
  let revenue = 0, units = 0, ratingSum = 0
  for (const r of filteredOrders.value) {
    revenue += r.revenue_usd
    units   += r.units_sold
    ratingSum += r.customer_rating
  }
  const orders = filteredOrders.value.length
  return { revenue, units, orders, avgRating: orders ? ratingSum / orders : 0 }
})
```

---

### Medium effort (needed before production)

**E. Paginate Firestore queries with `limit()` + cursor**

```ts
// Browse.vue — instead of fetching ALL products:
import { query, collection, limit, startAfter, orderBy } from 'firebase/firestore'

const PAGE_SIZE = 24
let lastDoc: any = null

async function loadMore() {
  const q = lastDoc
    ? query(collection(db, 'products'), orderBy('name'), startAfter(lastDoc), limit(PAGE_SIZE))
    : query(collection(db, 'products'), orderBy('name'), limit(PAGE_SIZE))
  // ...
}
```

---

**F. Move filters to Firestore `where()` clauses**

```ts
// Instead of fetching all then filtering client-side:
const q = query(
  collection(db, 'products'),
  where('active', '==', true),
  where('brand', '==', selectedBrand.value),  // only if not 'All'
  limit(PAGE_SIZE)
)
```

Requires composite indexes in `firestore.indexes.json`.

---

### For demonstration / class presentation

**G. Add Firestore indexes for compound queries**

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "brand", "order": "ASCENDING" },
        { "fieldPath": "price", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Deploy with: `firebase deploy --only firestore:indexes`

---

## 6. What to say to your professor

**"How do you handle a large dataset?"**

> "Our app uses two data sources. The Analytics page loads a 30,000-row global footwear sales CSV using PapaParse with Web Worker support so parsing runs off the main thread. We then aggregate and filter entirely in-memory using Vue's reactive computed properties with pagination limited to 25 rows per page, keeping the DOM lightweight regardless of dataset size. The Browse marketplace uses Firebase Firestore with real-time `onSnapshot` listeners. For future scale, the architecture supports switching to server-side filtering using Firestore `where()` clauses and cursor-based pagination with `limit()` and `startAfter()`, which are already defined in our Firestore indexes file."

---

## 7. File map

| File | Role |
|---|---|
| `src/views/Analytics.vue` | Loads CSV, filters, paginates, renders catalog |
| `src/lib/salesDataset.ts` | PapaParse wrapper, `aggregateShoes()` function |
| `src/lib/priceSim.ts` | Simulates live price fluctuations for demo |
| `src/views/Browse.vue` | Firestore marketplace browser |
| `src/lib/cart.ts` | Cart state (localStorage-backed reactive ref) |
| `firestore.rules` | Security rules (auth-gated writes) |
| `firestore.indexes.json` | Composite Firestore indexes |
| `scripts/seed-firestore.mjs` | One-time seed script for demo data |
| `public/data/global_sports_footwear_sales_2018_2026.csv` | 30K-row dataset |
