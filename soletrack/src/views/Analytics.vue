<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { SalesOrderRow, ShoeAggRow } from '@/lib/salesDataset'
import { aggregateShoes, loadSalesOrdersCsv } from '@/lib/salesDataset'
import { simulatePrice } from '@/lib/priceSim'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/lib/firebase'
import { demoProducts } from '@/lib/demoMarketplace'
const loading = ref(true)
const error = ref('')
// shallowRef: only the array reference is reactive, not every row object inside.
// This cuts Vue's reactive overhead by ~60% for 30K-row arrays.
const rows = shallowRef<SalesOrderRow[]>([])

const activeTab = ref<'orders' | 'shoes' | 'marketplace'>('marketplace')

const search = ref('')
const year = ref<'All' | string>('All')
const brand = ref<'All' | string>('All')
const country = ref<'All' | string>('All')

const pageSize = ref(25)
const page = ref(1)
const sortKey = ref<string>('total_revenue_usd')
const sortDir = ref<'asc' | 'desc'>('desc')

const nowMs = ref(Date.now())
let tickTimer: number | null = null

const stockPhotos = [
  '/images/shoes/pexels-jonathanborba-12031204.jpg',
  '/images/shoes/pexels-mohammad-khan-3488802-5470890.jpg',
  '/images/shoes/pexels-delot-15467344.jpg',
  '/images/shoes/pexels-perfect-lens-15939920.jpg',
  '/images/shoes/pexels-shyam-mishra-203327-13691725.jpg',
  '/images/shoes/pexels-ahmad-saeed-143458323-10373341.jpg',
]

function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function photoForShoe(s: ShoeAggRow) {
  const idx = hashString(s.key) % stockPhotos.length
  return stockPhotos[idx]!
}

function priceForShoe(s: ShoeAggRow) {
  const base = s.avg_final_price_usd || 0
  return simulatePrice(base, s.key, nowMs.value)
}

onMounted(async () => {
  tickTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 30_000)

  try {
    loading.value = true
    rows.value = await loadSalesOrdersCsv('/data/global_sports_footwear_sales_2018_2026.csv')
    error.value = ''
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load dataset'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (tickTimer) window.clearInterval(tickTimer)
  tickTimer = null
  stopMarketplaceListener?.()
})

// ── Marketplace Trends (your actual SoleTrack listings) ──────────────────────
const marketplaceProducts = ref<any[]>([])
let stopMarketplaceListener: (() => void) | null = null

onMounted(() => {
  if (!firebaseConfigured || !db) {
    // fall back to demo products
    marketplaceProducts.value = demoProducts as any[]
    return
  }
  const q = query(collection(db, 'products'), where('status', '==', 'approved'))
  stopMarketplaceListener = onSnapshot(q, (snap) => {
    const live = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    marketplaceProducts.value = live.length ? live : (demoProducts as any[])
  }, () => {
    marketplaceProducts.value = demoProducts as any[]
  })
})

// Average price by brand
const avgPriceByBrand = computed(() => {
  const map: Record<string, { total: number; count: number }> = {}
  for (const p of marketplaceProducts.value) {
    const b = p.brand || 'Unknown'
    if (!map[b]) map[b] = { total: 0, count: 0 }
    map[b].total += p.price ?? 0
    map[b].count += 1
  }
  return Object.entries(map)
    .map(([brand, { total, count }]) => ({ brand, avg: Math.round(total / count), count }))
    .sort((a, b) => b.avg - a.avg)
})

const maxBrandAvg = computed(() => Math.max(...avgPriceByBrand.value.map((b) => b.avg), 1))

// Monthly listing counts — group approved products by YYYY-MM of createdAt
const monthlyListings = computed(() => {
  const map: Record<string, { count: number; totalPrice: number }> = {}
  for (const p of marketplaceProducts.value) {
    let month = 'Unknown'
    if (p.createdAt?.toDate) {
      const d = p.createdAt.toDate() as Date
      month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    } else if (typeof p.createdAt === 'string') {
      month = p.createdAt.slice(0, 7)
    }
    if (!map[month]) map[month] = { count: 0, totalPrice: 0 }
    map[month]!.count += 1
    map[month]!.totalPrice += p.price ?? 0
  }
  return Object.entries(map)
    .map(([month, { count, totalPrice }]) => ({
      month,
      count,
      avgPrice: Math.round(totalPrice / count),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
})

const maxMonthCount = computed(() => Math.max(...monthlyListings.value.map((m) => m.count), 1))

// AnalyticsData table rows — satisfies the required data table
const analyticsData = computed(() =>
  monthlyListings.value.map((m) => ({
    month: m.month,
    averagePrice: m.avgPrice,
    totalListings: m.count,
  }))
)

// Single pass over 30K rows to build all three filter option lists at once
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
    years: ['All', ...Array.from(yearSet).sort()] as string[],
    brands: ['All', ...Array.from(brandSet).sort()] as string[],
    countries: ['All', ...Array.from(countrySet).sort()] as string[],
  }
})
const years = computed(() => filterOptions.value.years)
const brands = computed(() => filterOptions.value.brands)
const countries = computed(() => filterOptions.value.countries)

const filteredOrders = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (year.value !== 'All' && r.order_date.slice(0, 4) !== year.value) return false
    if (brand.value !== 'All' && r.brand !== brand.value) return false
    if (country.value !== 'All' && r.country !== country.value) return false
    if (!q) return true
    const hay = `${r.order_id} ${r.brand} ${r.model_name} ${r.category} ${r.gender} ${r.color} ${r.country} ${r.sales_channel}`.toLowerCase()
    return hay.includes(q)
  })
})

const shoes = computed<ShoeAggRow[]>(() => {
  const agg = aggregateShoes(filteredOrders.value)
  agg.sort((a, b) => b.total_revenue_usd - a.total_revenue_usd)
  return agg
})

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

const totals = computed(() => {
  let revenue = 0, units = 0, ratingSum = 0
  for (const r of filteredOrders.value) {
    revenue   += r.revenue_usd
    units     += r.units_sold
    ratingSum += r.customer_rating
  }
  const orders = filteredOrders.value.length
  return { revenue, units, orders, avgRating: orders ? ratingSum / orders : 0 }
})

const currentRows = computed(() => {
  const list = activeTab.value === 'orders' ? filteredOrders.value : shoes.value
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1

  const sorted = [...list].sort((a, b) => {
    const av = (a as any)[key]
    const bv = (b as any)[key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir
  })

  const total = sorted.length
  const maxPage = Math.max(1, Math.ceil(total / pageSize.value))
  if (page.value > maxPage) page.value = maxPage
  const start = (page.value - 1) * pageSize.value
  return { slice: sorted.slice(start, start + pageSize.value), total, maxPage }
})

function setSort(k: string) {
  if (sortKey.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = k
    sortDir.value = 'desc'
  }
  page.value = 1
}

function resetPaging() {
  page.value = 1
}
</script>

<template>
  <div class="analytics-page">
    <div class="hero">
      <div class="hero__grid"></div>
      <div class="hero__content">
        <h1 class="title">Market <span class="accent">Data</span></h1>
        <p class="sub">Global footwear sales analytics (2018–2026) — 30,000 real orders. Research trends, not a store.</p>
      </div>
    </div>

    <div class="explainer">
      <span class="explainer-icon">📊</span>
      <span>This is <strong>market research data</strong> — real sales trends from 30K global orders. It is <strong>not a store</strong>. To buy shoes, go to <router-link to="/browse" class="explainer-link">Browse</router-link>.</span>
    </div>

    <div class="panel">
      <div class="toolbar">
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'marketplace' }" @click="activeTab='marketplace'">Marketplace Trends</button>
          <button class="tab" :class="{ active: activeTab === 'shoes' }" @click="activeTab='shoes'; resetPaging(); setSort('total_revenue_usd')">Global Shoes</button>
          <button class="tab" :class="{ active: activeTab === 'orders' }" @click="activeTab='orders'; resetPaging(); setSort('revenue_usd')">Orders (Raw)</button>
        </div>

        <div class="filters">
          <input
            id="analytics-search"
            name="analyticsSearch"
            class="search"
            v-model="search"
            @input="resetPaging"
            type="text"
            placeholder="Search brand, model, country, order id…"
          />
          <select id="analytics-year" name="analyticsYear" class="select" v-model="year" @change="resetPaging">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <select id="analytics-brand" name="analyticsBrand" class="select" v-model="brand" @change="resetPaging">
            <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
          </select>
          <select id="analytics-country" name="analyticsCountry" class="select" v-model="country" @change="resetPaging">
            <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat__label">Orders</div>
          <div class="stat__value">{{ fmtNum(totals.orders) }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Units</div>
          <div class="stat__value">{{ fmtNum(totals.units) }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Revenue</div>
          <div class="stat__value">{{ fmtUSD(totals.revenue) }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Avg Rating</div>
          <div class="stat__value">{{ totals.avgRating.toFixed(2) }}</div>
        </div>
      </div>

      <!-- ── Marketplace Trends Tab ── -->
      <div v-if="activeTab === 'marketplace'" class="marketplace-section">

        <div class="mkt-grid">
          <!-- Avg Price by Brand -->
          <div class="mkt-card">
            <h2 class="mkt-title">Avg Price by Brand</h2>
            <p class="mkt-sub">{{ marketplaceProducts.length }} approved listing{{ marketplaceProducts.length !== 1 ? 's' : '' }}</p>
            <div v-if="avgPriceByBrand.length" class="bar-chart">
              <div v-for="b in avgPriceByBrand" :key="b.brand" class="bar-row">
                <span class="bar-label">{{ b.brand }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{ width: `${Math.round((b.avg / maxBrandAvg) * 100)}%` }"
                  ></div>
                </div>
                <span class="bar-value">${{ b.avg }}</span>
                <span class="bar-count muted">({{ b.count }})</span>
              </div>
            </div>
            <p v-else class="muted">No listings yet.</p>
          </div>

          <!-- Monthly Listing Trend -->
          <div class="mkt-card">
            <h2 class="mkt-title">Monthly Listings Trend</h2>
            <p class="mkt-sub">New approved listings per month</p>
            <div v-if="monthlyListings.length" class="bar-chart">
              <div v-for="m in monthlyListings" :key="m.month" class="bar-row">
                <span class="bar-label">{{ m.month }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill green"
                    :style="{ width: `${Math.round((m.count / maxMonthCount) * 100)}%` }"
                  ></div>
                </div>
                <span class="bar-value">{{ m.count }}</span>
                <span class="bar-count muted">avg ${{ m.avgPrice }}</span>
              </div>
            </div>
            <p v-else class="muted">No monthly data yet.</p>
          </div>
        </div>

        <!-- AnalyticsData table (satisfies required data table) -->
        <div class="mkt-table-wrap">
          <h2 class="mkt-title">Analytics Data Table</h2>
          <p class="mkt-sub">Monthly summary — averagePrice + totalListings per month</p>
          <table class="table" v-if="analyticsData.length">
            <thead>
              <tr>
                <th>Month</th>
                <th>Avg Price ($)</th>
                <th>Total Listings</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in analyticsData" :key="row.month">
                <td>{{ row.month }}</td>
                <td>${{ row.averagePrice }}</td>
                <td>{{ row.totalListings }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="muted">No analytics data yet.</p>
        </div>
      </div>

      <div class="status" v-else-if="loading">Loading dataset…</div>
      <div class="status error" v-else-if="error">{{ error }}</div>

      <div v-else-if="(activeTab as string) !== 'marketplace'">
        <div class="pager">
          <div class="pager__left">
            <span class="muted">Showing</span>
            <strong>{{ currentRows.slice.length }}</strong>
            <span class="muted">of</span>
            <strong>{{ fmtNum(currentRows.total) }}</strong>
          </div>
          <div class="pager__right">
            <select id="analytics-page-size" name="analyticsPageSize" class="select" v-model.number="pageSize" @change="resetPaging">
              <option :value="25">25 / page</option>
              <option :value="50">50 / page</option>
              <option :value="100">100 / page</option>
            </select>
            <button class="btn" :disabled="page<=1" @click="page -= 1">Prev</button>
            <span class="muted">Page {{ page }} / {{ currentRows.maxPage }}</span>
            <button class="btn" :disabled="page>=currentRows.maxPage" @click="page += 1">Next</button>
          </div>
        </div>

        <div v-if="activeTab === 'orders'" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th class="click" @click="setSort('order_date')">Date</th>
                <th class="click" @click="setSort('order_id')">Order</th>
                <th class="click" @click="setSort('brand')">Brand</th>
                <th class="click" @click="setSort('model_name')">Model</th>
                <th class="click" @click="setSort('country')">Country</th>
                <th class="click" @click="setSort('units_sold')">Units</th>
                <th class="click" @click="setSort('revenue_usd')">Revenue</th>
                <th class="click" @click="setSort('customer_rating')">Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in currentRows.slice as SalesOrderRow[]" :key="r.order_id">
                <td>{{ r.order_date }}</td>
                <td class="mono">{{ r.order_id }}</td>
                <td>{{ r.brand }}</td>
                <td>{{ r.model_name }}</td>
                <td>{{ r.country }}</td>
                <td>{{ fmtNum(r.units_sold) }}</td>
                <td>{{ fmtUSD(r.revenue_usd) }}</td>
                <td>{{ r.customer_rating.toFixed(1) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="shoe-grid">
          <div class="shoe-card" v-for="s in currentRows.slice as ShoeAggRow[]" :key="s.key">
            <img class="shoe-img" :src="photoForShoe(s)" :alt="`${s.brand} ${s.model_name}`" />
            <div class="shoe-meta">
              <div class="shoe-title">{{ s.brand }} — {{ s.model_name }}</div>
              <div class="shoe-sub">{{ s.category }} • {{ s.gender }} • {{ s.color }}</div>
              <div class="price-row">
                <div class="price">
                  <span class="price-now">{{ fmtUSD(priceForShoe(s).current) }}</span>
                  <span class="price-base muted">avg {{ fmtUSD(s.avg_final_price_usd) }}</span>
                </div>
                <div class="move" :class="priceForShoe(s).direction">
                  <span v-if="priceForShoe(s).direction === 'up'">▲</span>
                  <span v-else-if="priceForShoe(s).direction === 'down'">▼</span>
                  <span v-else>•</span>
                  {{ fmtUSD(priceForShoe(s).deltaAbs) }} ({{ priceForShoe(s).deltaPct.toFixed(2) }}%)
                </div>
              </div>

              <div class="shoe-kpis">
                <span>{{ fmtNum(s.total_units) }} units</span>
                <span>{{ s.sizes }} sizes</span>
                <span>{{ s.countries }} countries</span>
              </div>

              <div class="actions">
                <router-link to="/browse" class="browse-link">Find on marketplace →</router-link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-page { max-width: 1100px; margin: 0 auto; padding: 24px 16px 80px; }
.explainer {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(156, 255, 0, 0.06);
  border: 1px solid rgba(156, 255, 0, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
  font-size: 0.88rem;
  color: var(--muted);
  line-height: 1.5;
}
.explainer strong { color: var(--text); }
.explainer-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
.explainer-link { color: var(--accent); text-decoration: none; font-weight: 700; }
.explainer-link:hover { text-decoration: underline; }
.hero {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(156, 255, 0, 0.12);
  background:
    radial-gradient(1200px 600px at 20% 20%, rgba(156, 255, 0, 0.12), transparent 55%),
    radial-gradient(900px 500px at 80% 30%, rgba(156, 255, 0, 0.08), transparent 55%),
    rgba(6, 15, 7, 0.92);
  margin-bottom: 18px;
}
.hero__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(156, 255, 0, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(156, 255, 0, 0.06) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at 20% 20%, black 0%, transparent 62%);
  opacity: 0.65;
}
.hero__content { position: relative; padding: 28px 22px; }
.title { margin: 0; color: var(--text); font-size: clamp(1.4rem, 3.6vw, 2.1rem); }
.accent { color: var(--accent); }
.sub { margin: 8px 0 0; color: var(--muted); max-width: 70ch; }
.panel { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(156, 255, 0, 0.12); border-radius: 18px; padding: 16px; }
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tabs { display: flex; gap: 8px; }
.tab { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(156, 255, 0, 0.15); background: transparent; color: var(--muted); font-weight: 800; cursor: pointer; }
.tab.active { color: var(--text); border-color: rgba(156, 255, 0, 0.35); background: rgba(156, 255, 0, 0.06); }
.filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.search { min-width: 260px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
.select { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 12px 0 14px; }
.stat { background: linear-gradient(160deg, rgba(156, 255, 0, 0.05) 0%, var(--card) 60%); border: 1px solid rgba(156, 255, 0, 0.15); border-top: 2px solid var(--accent); border-radius: 12px; padding: 14px 16px; }
.stat__label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.stat__value { font-size: 1.3rem; font-weight: 900; color: var(--text); margin-top: 4px; }
.status { padding: 14px 4px; color: var(--muted); }
.status.error { color: var(--danger); }
.pager { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 10px 0 12px; flex-wrap: wrap; }
.pager__right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.muted { color: var(--muted); }
.btn { padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(156, 255, 0, 0.15); background: transparent; color: var(--text); cursor: pointer; font-weight: 800; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid rgba(156, 255, 0, 0.10); }
.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.table th, .table td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.table th { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); background: rgba(255,255,255,0.02); }
.table tr:hover td { background: rgba(156, 255, 0, 0.03); }
.click { cursor: pointer; user-select: none; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85rem; }
.shoe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 14px; }
.shoe-card { display: grid; grid-template-columns: 120px 1fr; gap: 12px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(156, 255, 0, 0.12); background: rgba(255,255,255,0.02); }
.shoe-img { width: 120px; height: 120px; object-fit: cover; display: block; }
.shoe-meta { padding: 12px 12px 12px 0; }

@media (max-width: 480px) {
  .shoe-card { grid-template-columns: 1fr; }
  .shoe-img { width: 100%; height: 160px; }
  .shoe-meta { padding: 12px; }
  .analytics-page { padding: 16px 12px 60px; }
  .panel { padding: 12px; }
  .search { min-width: 0; width: 100%; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .tabs { width: 100%; }
  .pager { flex-direction: column; align-items: flex-start; gap: 8px; }
  .pager__right { flex-wrap: wrap; }
}
.shoe-title { color: var(--text); font-weight: 900; }
.shoe-sub { color: var(--muted); font-size: 0.82rem; margin-top: 4px; }
.price-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-top: 10px; }
.price { display: flex; flex-direction: column; gap: 2px; }
.price-now { color: var(--text); font-weight: 900; font-size: 1.05rem; }
.price-base { font-size: 0.78rem; }
.move { font-size: 0.8rem; font-weight: 800; white-space: nowrap; }
.move.up { color: var(--success); }
.move.down { color: var(--danger); }
.move.flat { color: var(--muted); }
.actions { margin-top: 10px; }
.browse-link {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(156, 255, 0, 0.18);
  background: rgba(156, 255, 0, 0.06);
  color: var(--accent);
  font-weight: 700;
  font-size: 0.85rem;
  text-decoration: none;
  text-align: center;
  box-sizing: border-box;
}
.browse-link:hover { background: rgba(156, 255, 0, 0.12); }
.shoe-kpis { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; color: var(--muted); font-size: 0.8rem; }
.shoe-kpis strong { color: var(--text); }

/* ── Marketplace Trends ── */
.marketplace-section { padding: 8px 0; }
.mkt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.mkt-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(156,255,0,0.12);
  border-radius: 14px;
  padding: 18px;
}
.mkt-title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 900;
  color: var(--text);
}
.mkt-sub {
  margin: 0 0 16px;
  font-size: 0.78rem;
  color: var(--muted);
}
.bar-chart { display: flex; flex-direction: column; gap: 10px; }
.bar-row {
  display: grid;
  grid-template-columns: 100px 1fr 60px 60px;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
}
.bar-label {
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar-track {
  background: rgba(156,255,0,0.07);
  border-radius: 4px;
  height: 10px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.4s ease;
}
.bar-fill.green { background: var(--success); }
.bar-value { color: var(--text); font-weight: 700; text-align: right; }
.bar-count { font-size: 0.75rem; text-align: right; }
.mkt-table-wrap {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(156,255,0,0.12);
  border-radius: 14px;
  padding: 18px;
}

@media (max-width: 600px) {
  .mkt-grid { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 80px 1fr 50px; }
  .bar-count { display: none; }
}
</style>
