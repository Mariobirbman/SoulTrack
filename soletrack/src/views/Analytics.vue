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
const isLiveMarketplaceData = computed(() => firebaseConfigured && !!db)
const marketplaceDataModeLabel = computed(() =>
  isLiveMarketplaceData.value ? 'Live Firestore (approved listings)' : 'Demo fallback data'
)

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

const listingShareByBrand = computed(() => {
  const map: Record<string, { count: number; totalPrice: number }> = {}
  for (const p of marketplaceProducts.value) {
    const b = p.brand || 'Unknown'
    if (!map[b]) map[b] = { count: 0, totalPrice: 0 }
    map[b]!.count += 1
    map[b]!.totalPrice += p.price ?? 0
  }
  const totalListings = marketplaceProducts.value.length
  return Object.entries(map)
    .map(([brand, { count, totalPrice }]) => ({
      brand,
      count,
      avgPrice: Math.round(totalPrice / count),
      pct: totalListings ? Math.round((count / totalListings) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

const listingTrend = computed(() => monthlyListings.value.slice(-6))
const listingTrendMaxCount = computed(() => Math.max(...listingTrend.value.map((m) => m.count), 1))

// AnalyticsData table rows — focused recent listing trend
const analyticsData = computed(() =>
  listingTrend.value.map((m) => ({
    month: m.month,
    averagePrice: m.avgPrice,
    totalListings: m.count,
  }))
)

// ── Global market stats from the 30K CSV ─────────────────────────────────────

const revenueByBrand = computed(() => {
  const map: Record<string, number> = {}
  for (const r of filteredOrders.value) {
    map[r.brand] = (map[r.brand] ?? 0) + r.revenue_usd
  }
  const total = Object.values(map).reduce((a, b) => a + b, 0)
  return Object.entries(map)
    .map(([brand, rev]) => ({ brand, rev, pct: total ? Math.round((rev / total) * 100) : 0 }))
    .sort((a, b) => b.rev - a.rev)
})

const revenueByCategory = computed(() => {
  const map: Record<string, { rev: number; units: number }> = {}
  for (const r of filteredOrders.value) {
    const cat = r.category || 'Other'
    if (!map[cat]) map[cat] = { rev: 0, units: 0 }
    map[cat]!.rev += r.revenue_usd
    map[cat]!.units += r.units_sold
  }
  const total = Object.values(map).reduce((a, b) => a + b.rev, 0)
  return Object.entries(map)
    .map(([cat, { rev, units }]) => ({ cat, rev, units, pct: total ? Math.round((rev / total) * 100) : 0 }))
    .sort((a, b) => b.rev - a.rev)
})

const topCountries = computed(() => {
  const map: Record<string, number> = {}
  for (const r of filteredOrders.value) map[r.country] = (map[r.country] ?? 0) + r.revenue_usd
  const total = Object.values(map).reduce((a, b) => a + b, 0)
  return Object.entries(map)
    .map(([country, rev]) => ({ country, rev, pct: total ? Math.round((rev / total) * 100) : 0 }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 8)
})

const channelSplit = computed(() => {
  let online = 0, retail = 0
  for (const r of filteredOrders.value) {
    if (r.sales_channel === 'Online') online += r.revenue_usd
    else retail += r.revenue_usd
  }
  const total = online + retail
  return {
    online, retail, total,
    onlinePct: total ? Math.round((online / total) * 100) : 0,
    retailPct: total ? Math.round((retail / total) * 100) : 0,
  }
})

const yearlyRevenue = computed(() => {
  const map: Record<string, { rev: number; orders: number }> = {}
  for (const r of filteredOrders.value) {
    const yr = r.order_date.slice(0, 4)
    if (!map[yr]) map[yr] = { rev: 0, orders: 0 }
    map[yr]!.rev += r.revenue_usd
    map[yr]!.orders += 1
  }
  return Object.entries(map)
    .map(([yr, { rev, orders }]) => ({ yr, rev, orders }))
    .sort((a, b) => a.yr.localeCompare(b.yr))
})

const maxYearRev = computed(() => Math.max(...yearlyRevenue.value.map((y) => y.rev), 1))
const maxBrandRev = computed(() => Math.max(...revenueByBrand.value.map((b) => b.rev), 1))
const maxCatRev = computed(() => Math.max(...revenueByCategory.value.map((c) => c.rev), 1))
const maxCountryRev = computed(() => Math.max(...topCountries.value.map((c) => c.rev), 1))

const incomeBreakdown = computed(() => {
  const map: Record<string, number> = {}
  for (const r of filteredOrders.value) {
    const lvl = r.customer_income_level || 'Unknown'
    map[lvl] = (map[lvl] ?? 0) + r.revenue_usd
  }
  const total = Object.values(map).reduce((a, b) => a + b, 0)
  return Object.entries(map)
    .map(([lvl, rev]) => ({ lvl, rev, pct: total ? Math.round((rev / total) * 100) : 0 }))
    .sort((a, b) => b.rev - a.rev)
})

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

const DASHBOARD_SAMPLE_LIMIT = 1200

// Representative subset used by the dashboard panels to keep comparisons readable.
const dashboardRows = computed<SalesOrderRow[]>(() => {
  const source = filteredOrders.value
  if (source.length <= DASHBOARD_SAMPLE_LIMIT) return source

  const step = Math.ceil(source.length / DASHBOARD_SAMPLE_LIMIT)
  const sample: SalesOrderRow[] = []
  for (let i = 0; i < source.length; i += step) {
    sample.push(source[i]!)
    if (sample.length === DASHBOARD_SAMPLE_LIMIT) break
  }
  return sample
})

const dashboardSampleMeta = computed(() => {
  const total = filteredOrders.value.length
  const used = dashboardRows.value.length
  return {
    total,
    used,
    pct: total ? Math.round((used / total) * 100) : 0,
  }
})

const dashboardTotals = computed(() => {
  let revenue = 0
  let units = 0
  let ratingSum = 0
  for (const r of dashboardRows.value) {
    revenue += r.revenue_usd
    units += r.units_sold
    ratingSum += r.customer_rating
  }
  const orders = dashboardRows.value.length
  return {
    revenue,
    units,
    orders,
    avgRating: orders ? ratingSum / orders : 0,
    avgOrderValue: orders ? revenue / orders : 0,
  }
})

const dashboardYearlyRevenue = computed(() => {
  const map: Record<string, { rev: number; orders: number }> = {}
  for (const r of dashboardRows.value) {
    const yr = r.order_date.slice(0, 4)
    if (!map[yr]) map[yr] = { rev: 0, orders: 0 }
    map[yr]!.rev += r.revenue_usd
    map[yr]!.orders += 1
  }
  return Object.entries(map)
    .map(([yr, { rev, orders }]) => ({ yr, rev, orders }))
    .sort((a, b) => a.yr.localeCompare(b.yr))
})

const dashboardYearRange = computed(() => {
  if (!dashboardYearlyRevenue.value.length) return { min: 0, span: 1 }
  const values = dashboardYearlyRevenue.value.map((y) => y.rev)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return { min, span: Math.max(1, max - min) }
})

function yearBarHeight(value: number) {
  const { min, span } = dashboardYearRange.value
  return 22 + Math.round(((value - min) / span) * 78)
}

const dashboardBrandShare = computed(() => {
  const map: Record<string, number> = {}
  for (const r of dashboardRows.value) map[r.brand] = (map[r.brand] ?? 0) + r.revenue_usd
  const total = Object.values(map).reduce((a, b) => a + b, 0)
  return Object.entries(map)
    .map(([brand, rev]) => ({ brand, rev, pct: total ? Math.round((rev / total) * 100) : 0 }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 6)
})

const dashboardTopMarkets = computed(() => {
  const map: Record<string, number> = {}
  for (const r of dashboardRows.value) map[r.country] = (map[r.country] ?? 0) + r.revenue_usd
  const total = Object.values(map).reduce((a, b) => a + b, 0)
  return Object.entries(map)
    .map(([country, rev]) => ({ country, rev, pct: total ? Math.round((rev / total) * 100) : 0 }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 6)
})

const dashboardChannelSplit = computed(() => {
  let online = 0
  let retail = 0
  for (const r of dashboardRows.value) {
    if (r.sales_channel === 'Online') online += r.revenue_usd
    else retail += r.revenue_usd
  }
  const total = online + retail
  return {
    online,
    retail,
    onlinePct: total ? Math.round((online / total) * 100) : 0,
    retailPct: total ? Math.round((retail / total) * 100) : 0,
  }
})

const visibleTotals = computed(() =>
  activeTab.value === 'marketplace'
    ? {
        revenue: dashboardTotals.value.revenue,
        units: dashboardTotals.value.units,
        orders: dashboardTotals.value.orders,
        avgRating: dashboardTotals.value.avgRating,
      }
    : totals.value
)

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
        <p class="sub">Two data sources: a 30,000-order footwear dataset (2018–2026) and live SoleTrack listings. The dashboard uses a representative subset after filtering to keep decisions clear.</p>
      </div>
    </div>

    <div class="explainer">
      <span>This is <strong>market research data</strong> from a filtered subset of the larger dataset. It is <strong>not a store</strong>. To buy shoes, go to <router-link to="/browse" class="explainer-link">Browse</router-link>.</span>
    </div>

    <div class="data-mode" :class="isLiveMarketplaceData ? 'live' : 'demo'">
      <strong>SoleTrack listing source:</strong>
      <span>{{ marketplaceDataModeLabel }}</span>
    </div>

    <div class="panel">
      <div class="toolbar">
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'marketplace' }" @click="activeTab='marketplace'">Market Overview</button>
          <button class="tab" :class="{ active: activeTab === 'shoes' }" @click="activeTab='shoes'; resetPaging(); setSort('total_revenue_usd')">Shoe Catalog</button>
          <button class="tab" :class="{ active: activeTab === 'orders' }" @click="activeTab='orders'; resetPaging(); setSort('revenue_usd')">Order Data</button>
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
          <div class="stat__value">{{ fmtNum(visibleTotals.orders) }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Units</div>
          <div class="stat__value">{{ fmtNum(visibleTotals.units) }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Revenue</div>
          <div class="stat__value">{{ fmtUSD(visibleTotals.revenue) }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Avg Rating</div>
          <div class="stat__value">{{ visibleTotals.avgRating.toFixed(2) }}</div>
        </div>
      </div>

      <div class="module-guide">
        <div class="module-guide__title">Analytics Modules</div>
        <div class="module-guide__grid">
          <article class="module-card" :class="{ active: activeTab === 'marketplace' }">
            <h3>Market Overview</h3>
            <p>Condensed executive view of trends using a representative sample from filtered orders.</p>
            <p class="module-meta">Used for: fast business decisions and stakeholder updates.</p>
            <p class="module-meta">Source: global dataset subset + SoleTrack listings.</p>
          </article>
          <article class="module-card" :class="{ active: activeTab === 'shoes' }">
            <h3>Shoe Catalog</h3>
            <p>Aggregated product-level view with pricing movement simulation and demand signals.</p>
            <p class="module-meta">Used for: spotting high-performing models and pricing ranges.</p>
            <p class="module-meta">Source: filtered global dataset (aggregated by shoe key).</p>
          </article>
          <article class="module-card" :class="{ active: activeTab === 'orders' }">
            <h3>Order Data</h3>
            <p>Row-level transactional records with search, filters, sorting, and paging controls.</p>
            <p class="module-meta">Used for: detailed validation and operational investigation.</p>
            <p class="module-meta">Source: filtered global dataset (raw order rows).</p>
          </article>
        </div>
      </div>

      <!-- ── Market Data Dashboard Tab ── -->
      <div v-if="activeTab === 'marketplace'" class="dash">

        <div v-if="loading" class="status">Loading market data…</div>
        <div v-else-if="error" class="status error">{{ error }}</div>

        <template v-else>

          <div class="dash-section-label">Executive Snapshot</div>
          <div class="subset-note">
            Using <strong>{{ fmtNum(dashboardSampleMeta.used) }}</strong> sampled orders from
            <strong>{{ fmtNum(dashboardSampleMeta.total) }}</strong> filtered rows ({{ dashboardSampleMeta.pct }}% sample)
            to keep comparisons readable.
          </div>

          <div class="kpi-row kpi-row--executive">
            <div class="kpi">
              <div class="kpi__label">Sample Orders</div>
              <div class="kpi__val">{{ fmtNum(dashboardTotals.orders) }}</div>
              <div class="kpi__sub">representative subset</div>
            </div>
            <div class="kpi">
              <div class="kpi__label">Sample Revenue</div>
              <div class="kpi__val">{{ fmtUSD(dashboardTotals.revenue) }}</div>
              <div class="kpi__sub">from filtered scope</div>
            </div>
            <div class="kpi">
              <div class="kpi__label">Avg Order Value</div>
              <div class="kpi__val">{{ fmtUSD(dashboardTotals.avgOrderValue) }}</div>
              <div class="kpi__sub">subset basis</div>
            </div>
            <div class="kpi">
              <div class="kpi__label">Online Share</div>
              <div class="kpi__val">{{ dashboardChannelSplit.onlinePct }}%</div>
              <div class="kpi__sub">{{ fmtUSD(dashboardChannelSplit.online) }}</div>
            </div>
            <div class="kpi">
              <div class="kpi__label">Avg Rating</div>
              <div class="kpi__val accent-val">{{ dashboardTotals.avgRating.toFixed(2) }} ★</div>
              <div class="kpi__sub">customer score</div>
            </div>
          </div>

          <div class="dash-two-col" style="margin-top:16px">
            <div class="mkt-card">
              <h2 class="mkt-title">Revenue Trend by Year</h2>
              <p class="mkt-sub">Trend from the sampled order subset</p>
              <div v-if="dashboardYearlyRevenue.length" class="yoy-chart">
                <div v-for="y in dashboardYearlyRevenue" :key="y.yr" class="yoy-col">
                  <div class="yoy-bar-wrap">
                    <div class="yoy-bar" :style="{ height: `${yearBarHeight(y.rev)}%` }"></div>
                  </div>
                  <div class="yoy-val">{{ (y.rev / 1_000_000).toFixed(1) }}M</div>
                  <div class="yoy-label">{{ y.yr }}</div>
                </div>
              </div>
              <p v-else class="muted small">No trend data for current filters.</p>
            </div>

            <div class="mkt-card">
              <h2 class="mkt-title">Sales Channel Mix</h2>
              <p class="mkt-sub">Revenue split in the sampled subset</p>
              <div class="channel-pills">
                <div class="channel-pill online">
                  <span class="ch-label">Online</span>
                  <span class="ch-pct">{{ dashboardChannelSplit.onlinePct }}%</span>
                  <span class="ch-rev muted">{{ fmtUSD(dashboardChannelSplit.online) }}</span>
                </div>
                <div class="channel-pill retail">
                  <span class="ch-label">Retail</span>
                  <span class="ch-pct">{{ dashboardChannelSplit.retailPct }}%</span>
                  <span class="ch-rev muted">{{ fmtUSD(dashboardChannelSplit.retail) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="dash-two-col" style="margin-top:16px">
            <div class="mkt-card">
              <h2 class="mkt-title">Top Brands</h2>
              <p class="mkt-sub">Share of sampled revenue (top 6)</p>
              <div v-if="dashboardBrandShare.length" class="bar-chart">
                <div v-for="b in dashboardBrandShare" :key="b.brand" class="bar-row-v2">
                  <div class="brv2-header">
                    <span class="brv2-name">{{ b.brand }}</span>
                    <span class="brv2-pct">{{ b.pct }}%</span>
                    <span class="brv2-rev muted">{{ fmtUSD(b.rev) }}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" :style="{ width: `${Math.max(8, b.pct)}%` }"></div>
                  </div>
                </div>
              </div>
              <p v-else class="muted small">No brand data for current filters.</p>
            </div>

            <div class="mkt-card">
              <h2 class="mkt-title">Top Markets</h2>
              <p class="mkt-sub">Share of sampled revenue (top 6 countries)</p>
              <div v-if="dashboardTopMarkets.length" class="bar-chart">
                <div v-for="c in dashboardTopMarkets" :key="c.country" class="bar-row-v2">
                  <div class="brv2-header">
                    <span class="brv2-name">{{ c.country }}</span>
                    <span class="brv2-pct">{{ c.pct }}%</span>
                    <span class="brv2-rev muted">{{ fmtUSD(c.rev) }}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill country-fill" :style="{ width: `${Math.max(8, c.pct)}%` }"></div>
                  </div>
                </div>
              </div>
              <p v-else class="muted small">No market data for current filters.</p>
            </div>
          </div>

          <div class="dash-section-label" style="margin-top:24px">SoleTrack Listings</div>
          <div class="dash-two-col">
            <div class="mkt-card">
              <h2 class="mkt-title">Listings by Brand</h2>
              <p class="mkt-sub">{{ marketplaceProducts.length }} approved listing{{ marketplaceProducts.length !== 1 ? 's' : '' }} on SoleTrack</p>
              <div v-if="listingShareByBrand.length" class="bar-chart">
                <div v-for="b in listingShareByBrand" :key="b.brand" class="bar-row-v2">
                  <div class="brv2-header">
                    <span class="brv2-name">{{ b.brand }}</span>
                    <span class="brv2-pct">{{ b.pct }}%</span>
                    <span class="brv2-rev muted">{{ b.count }} listing{{ b.count !== 1 ? 's' : '' }} • avg {{ fmtUSD(b.avgPrice) }}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill cat-fill" :style="{ width: `${Math.max(8, b.pct)}%` }"></div>
                  </div>
                </div>
              </div>
              <p v-else class="muted small">No listings yet.</p>
            </div>

            <div class="mkt-card">
              <h2 class="mkt-title">Recent Listing Activity</h2>
              <p class="mkt-sub">Last 6 months of approved listings</p>
              <div v-if="listingTrend.length" class="bar-chart">
                <div v-for="m in listingTrend" :key="m.month" class="bar-row-v2">
                  <div class="brv2-header">
                    <span class="brv2-name">{{ m.month }}</span>
                    <span class="brv2-pct">{{ m.count }} listed</span>
                    <span class="brv2-rev muted">avg {{ fmtUSD(m.avgPrice) }}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill country-fill" :style="{ width: `${Math.round((m.count / listingTrendMaxCount) * 100)}%` }"></div>
                  </div>
                </div>
              </div>
              <p v-else class="muted small">No monthly data yet.</p>
            </div>
          </div>

          <!-- AnalyticsData table -->
          <div class="mkt-card" style="margin-top:16px">
            <h2 class="mkt-title">Analytics Data Table</h2>
            <p class="mkt-sub">Recent monthly summary — avg listing price + total listings (last 6 months)</p>
            <div class="table-wrap" v-if="analyticsData.length">
              <table class="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Avg Price</th>
                    <th>Total Listings</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in analyticsData" :key="row.month">
                    <td class="mono">{{ row.month }}</td>
                    <td>{{ fmtUSD(row.averagePrice) }}</td>
                    <td>{{ row.totalListings }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="muted small">No analytics data yet.</p>
          </div>

        </template>
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
.data-mode {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  border: 1px solid rgba(126, 207, 255, 0.2);
  background: rgba(126, 207, 255, 0.08);
  padding: 10px 12px;
  margin-bottom: 14px;
  color: var(--muted);
  font-size: 0.82rem;
}
.data-mode strong { color: var(--text); }
.data-mode.live { border-color: rgba(156,255,0,0.22); background: rgba(156,255,0,0.08); }
.data-mode.demo { border-color: rgba(245,166,35,0.22); background: rgba(245,166,35,0.08); }
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
.module-guide {
  margin: 6px 0 18px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.015);
}
.module-guide__title {
  color: var(--text);
  font-weight: 800;
  font-size: 0.86rem;
  margin-bottom: 10px;
}
.module-guide__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.module-card {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 11px;
  background: rgba(255,255,255,0.02);
}
.module-card.active {
  border-color: rgba(156,255,0,0.26);
  box-shadow: inset 0 0 0 1px rgba(156,255,0,0.14);
}
.module-card h3 {
  margin: 0 0 6px;
  color: var(--text);
  font-size: 0.86rem;
}
.module-card p {
  margin: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.4;
}
.module-card .module-meta {
  margin-top: 6px;
  font-size: 0.75rem;
}
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
  .module-guide__grid { grid-template-columns: 1fr; }
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

/* ── Market Dashboard ── */
.dash { padding: 4px 0; }

.dash-section-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.subset-note {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(126, 207, 255, 0.26);
  background: rgba(126, 207, 255, 0.08);
  color: var(--muted);
  font-size: 0.82rem;
}

.subset-note strong { color: var(--text); }

/* KPI row */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin-bottom: 6px;
}
@media (max-width: 900px) { .kpi-row { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 520px)  { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
.kpi-row--executive { grid-template-columns: repeat(5, 1fr); }
@media (max-width: 900px) { .kpi-row--executive { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 520px)  { .kpi-row--executive { grid-template-columns: repeat(2, 1fr); } }

.kpi {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(156,255,0,0.12);
  border-radius: 8px;
  padding: 14px;
}
.kpi__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 6px;
}
.kpi__val {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.2;
  margin-bottom: 3px;
}
.kpi__val.accent-val { color: var(--accent); }
.kpi__sub { font-size: 0.72rem; color: var(--muted); }

/* Year-over-year bar chart */
.mkt-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(156,255,0,0.12);
  border-radius: 8px;
  padding: 16px;
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

.yoy-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  padding-top: 10px;
}
.yoy-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.yoy-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.yoy-bar {
  width: 100%;
  background: var(--accent);
  border-radius: 3px 3px 0 0;
  min-height: 3px;
  transition: height 0.3s ease;
  opacity: 0.85;
}
.yoy-val { font-size: 0.65rem; font-weight: 700; color: var(--text); margin-top: 4px; }
.yoy-label { font-size: 0.62rem; color: var(--muted); margin-top: 2px; }

/* Two-column layout */
.dash-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 720px) { .dash-two-col { grid-template-columns: 1fr; } }

/* Bar rows v2 */
.bar-chart { display: flex; flex-direction: column; gap: 12px; }
.bar-row-v2 { display: flex; flex-direction: column; gap: 5px; }
.brv2-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 0.82rem;
}
.brv2-name { color: var(--text); font-weight: 700; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.brv2-pct { color: var(--accent); font-weight: 900; font-size: 0.85rem; flex-shrink: 0; }
.brv2-rev { font-size: 0.75rem; flex-shrink: 0; }

.bar-track {
  background: rgba(156,255,0,0.07);
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.5s ease;
}
.bar-fill.cat-fill { background: #7ecfff; }
.bar-fill.country-fill { background: #f5a623; }

/* Income / buyer segments */
.income-cards { display: flex; flex-direction: column; gap: 10px; }
.income-seg {
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.02);
}
.income-seg.high { border-color: rgba(156,255,0,0.2); }
.income-seg.medium { border-color: rgba(100,180,255,0.18); }
.income-seg.low { border-color: rgba(255,180,0,0.15); }
.income-lvl { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 2px; }
.income-rev { font-size: 1rem; font-weight: 900; color: var(--text); }
.income-pct { font-size: 0.72rem; color: var(--muted); margin-bottom: 6px; }
.income-bar-track { background: rgba(255,255,255,0.06); border-radius: 3px; height: 4px; overflow: hidden; }
.income-bar-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.5s ease; }
.income-seg.medium .income-bar-fill { background: #7ecfff; }
.income-seg.low .income-bar-fill { background: #f5a623; }

/* Channel split */
.channel-pills { display: flex; gap: 10px; flex-wrap: wrap; }
.channel-pill {
  flex: 1;
  min-width: 100px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.channel-pill.online { border-color: rgba(156,255,0,0.2); }
.channel-pill.retail { border-color: rgba(100,180,255,0.18); }
.ch-label { font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.ch-pct { font-size: 1.2rem; font-weight: 900; color: var(--text); }
.channel-pill.online .ch-pct { color: var(--accent); }
.channel-pill.retail .ch-pct { color: #7ecfff; }
.ch-rev { font-size: 0.75rem; }

.mkt-table-wrap { margin-top: 16px; }
.small { font-size: 0.82rem; }
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
