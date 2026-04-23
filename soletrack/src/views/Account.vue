<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useAuth } from '@/lib/auth'
import { auth, db, demoMode, firebaseConfigured } from '@/lib/firebase'
import { disableDemoMode } from '@/lib/demo'
import { upsertUserProfile } from '@/lib/profile'
import { deleteDemoSale, getOrSeedDemoSales } from '@/lib/demoStore'

const router = useRouter()

interface Sale {
  id: string
  shoe: string
  size: string
  buyPrice: number | null
  sellPrice: number
  date: string
  platform: string
  qty: number
  source: 'manual' | 'order' | string
  orderId?: string
  checkoutId?: string
}

const { user, ready } = useAuth()
const loading = ref(true)
const formError = ref('')
const sales = ref<Sale[]>([])

let stopSalesListener: (() => void) | null = null

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeSale(raw: Record<string, unknown>, id: string): Sale {
  return {
    id,
    shoe: String(raw.shoe ?? 'Shoe'),
    size: String(raw.size ?? '-'),
    buyPrice: numOrNull(raw.buyPrice),
    sellPrice: Number(raw.sellPrice ?? 0),
    date: String(raw.date ?? ''),
    platform: String(raw.platform ?? 'Pickup'),
    qty: Math.max(1, Number(raw.qty ?? 1) || 1),
    source: String(raw.source ?? 'manual'),
    orderId: raw.orderId ? String(raw.orderId) : undefined,
    checkoutId: raw.checkoutId ? String(raw.checkoutId) : undefined,
  }
}

onMounted(() => {
  ;(async () => {
    await ready
    if (demoMode) {
      sales.value = getOrSeedDemoSales().map((sale) =>
        normalizeSale(sale as unknown as Record<string, unknown>, sale.id),
      )
      loading.value = false
      return
    }

    if (!firebaseConfigured || !auth || !db) {
      loading.value = false
      formError.value = 'Firebase is not configured yet. Add soletrack/.env.local to enable account sales.'
      return
    }

    if (!user.value) {
      router.push('/login')
      return
    }

    await upsertUserProfile(user.value)

    const salesRef = collection(db, 'users', user.value.uid, 'sales')
    const q = query(salesRef, orderBy('createdAt', 'desc'))
    stopSalesListener = onSnapshot(
      q,
      (snap) => {
        sales.value = snap.docs.map((d) => normalizeSale(d.data() as Record<string, unknown>, d.id))
        loading.value = false
      },
      () => {
        loading.value = false
      },
    )
  })()
})

onBeforeUnmount(() => stopSalesListener?.())

async function deleteSale(id: string) {
  if (demoMode) {
    sales.value = deleteDemoSale(id).map((sale) =>
      normalizeSale(sale as unknown as Record<string, unknown>, sale.id),
    )
    return
  }
  if (!user.value) {
    router.push('/login')
    return
  }
  try {
    if (!db) return
    await deleteDoc(doc(db, 'users', user.value.uid, 'sales', id))
  } catch {
    formError.value = 'Could not delete sale. Please try again.'
  }
}

const profit = (sale: Sale): number | null => (sale.buyPrice === null ? null : sale.sellPrice - sale.buyPrice)
const profitClass = (sale: Sale) => {
  const p = profit(sale)
  if (p === null) return 'muted'
  return p >= 0 ? 'pos' : 'neg'
}
const profitLabel = (sale: Sale) => {
  const p = profit(sale)
  return p === null ? '-' : fmt(p)
}
const fmt = (n: number) => (n >= 0 ? '$' : '-$') + Math.abs(n).toFixed(2)

const totalSales = computed(() => sales.value.length)
const totalRevenue = computed(() => sales.value.reduce((sum, sale) => sum + sale.sellPrice, 0))
const salesWithCostBasis = computed(() => sales.value.filter((sale) => profit(sale) !== null))
const totalProfit = computed(() =>
  salesWithCostBasis.value.reduce((sum, sale) => sum + (profit(sale) ?? 0), 0),
)
const bestSale = computed(() => {
  if (!salesWithCostBasis.value.length) return null
  return salesWithCostBasis.value.reduce((best, sale) =>
    (profit(sale) ?? -Infinity) > (profit(best) ?? -Infinity) ? sale : best,
  )
})

async function logout() {
  if (demoMode) {
    disableDemoMode()
    window.location.assign('/login')
    return
  }
  if (auth) await signOut(auth)
  router.push('/login')
}
</script>

<template>
  <div class="account-page">
    <div class="account-header">
      <div>
        <h1 class="account-title">Welcome back, {{ user?.displayName || 'Reseller' }}</h1>
        <p class="account-sub">{{ user?.email }}</p>
      </div>
      <button class="btn-logout" @click="logout">Log out</button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-label">Total Sales</span>
        <span class="stat-value">{{ totalSales }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Revenue</span>
        <span class="stat-value">{{ fmt(totalRevenue) }}</span>
      </div>
      <div class="stat-card" :class="totalProfit >= 0 ? 'pos-card' : 'neg-card'">
        <span class="stat-label">Total Profit</span>
        <span class="stat-value" :class="salesWithCostBasis.length ? (totalProfit >= 0 ? 'pos' : 'neg') : 'muted'">
          {{ salesWithCostBasis.length ? fmt(totalProfit) : 'N/A' }}
        </span>
        <span class="stat-note" v-if="!salesWithCostBasis.length">Needs cost basis values</span>
      </div>
      <div class="stat-card accent-card" v-if="bestSale">
        <span class="stat-label">Best Sale</span>
        <span class="stat-value pos">+{{ fmt(profit(bestSale) ?? 0) }}</span>
        <span class="stat-note">{{ bestSale.shoe }}</span>
      </div>
    </div>

    <div class="section-header">
      <h2 class="section-title">Sales Log</h2>
      <span class="section-note">Auto-logged when an order is marked picked up.</span>
    </div>

    <p class="error" v-if="formError">{{ formError }}</p>

    <div class="sales-table-wrap" v-if="!loading && sales.length">
      <table class="sales-table">
        <thead>
          <tr>
            <th>Shoe</th>
            <th>Size</th>
            <th>Qty</th>
            <th>Sell</th>
            <th>Buy</th>
            <th>Profit</th>
            <th>Date</th>
            <th>Source</th>
            <th>Platform</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sale in sales" :key="sale.id">
            <td class="td-shoe">{{ sale.shoe }}</td>
            <td>{{ sale.size || '-' }}</td>
            <td>{{ sale.qty || 1 }}</td>
            <td>{{ fmt(sale.sellPrice) }}</td>
            <td>{{ sale.buyPrice === null ? '-' : fmt(sale.buyPrice) }}</td>
            <td class="td-profit" :class="profitClass(sale)">{{ profitLabel(sale) }}</td>
            <td>{{ sale.date || '-' }}</td>
            <td class="td-source">{{ sale.source === 'order' ? 'Order pickup' : 'Manual' }}</td>
            <td>{{ sale.platform || '-' }}</td>
            <td><button class="btn-delete" @click="deleteSale(sale.id)" title="Remove">X</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="empty-state" v-if="loading">
      <p class="empty-icon">...</p>
      <p>Loading your sales...</p>
    </div>

    <div class="empty-state" v-if="!loading && !sales.length">
      <p class="empty-icon">[]</p>
      <p>No sales logged yet. Mark an order as picked up to create a sale record automatically.</p>
    </div>
  </div>
</template>

<style scoped>
.account-page {
  max-width: 1024px;
  margin: 0 auto;
  padding: 32px 16px 80px;
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 32px;
}

.account-title { margin: 0; font-size: clamp(1.4rem, 3vw, 2rem); color: var(--text); }
.account-sub { margin: 4px 0 0; color: var(--muted); font-size: 0.9rem; }

.btn-logout {
  background: transparent;
  border: 1px solid rgba(156, 255, 0, 0.2);
  color: var(--muted);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: color 0.2s, border-color 0.2s;
}
.btn-logout:hover { color: var(--danger); border-color: var(--danger); }

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.stat-card {
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.05) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-top: 2px solid var(--accent);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pos-card { border-top-color: var(--success); }
.neg-card { border-top-color: var(--danger); }
.accent-card { border-top-color: var(--accent); }

.stat-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.stat-value { font-size: 1.6rem; font-weight: 700; color: var(--text); }
.stat-value.pos { color: var(--success); }
.stat-value.neg { color: var(--danger); }
.stat-note { font-size: 0.8rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.section-title { margin: 0; font-size: 1.2rem; color: var(--text); }
.section-note { color: var(--muted); font-size: 0.82rem; }
.error { color: var(--danger); margin: 0 0 12px; font-size: 0.9rem; }

.sales-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(156, 255, 0, 0.12); }
.sales-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.sales-table th {
  background: var(--card);
  color: var(--muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(156, 255, 0, 0.08);
}
.sales-table td { padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: var(--text); }
.sales-table tbody tr:hover { background: rgba(156, 255, 0, 0.03); }
.td-shoe { font-weight: 800; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-source { white-space: nowrap; }
.td-profit.pos { color: var(--success); font-weight: 900; }
.td-profit.neg { color: var(--danger); font-weight: 900; }
.muted { color: var(--muted); }

.btn-delete {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.2s;
}
.btn-delete:hover { color: var(--danger); }

.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.empty-icon { font-size: 2.2rem; margin: 0; }

@media (max-width: 600px) {
  .account-page { padding: 20px 12px 60px; }
  .stats-row { grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  .stat-card { padding: 14px 16px; }
  .stat-value { font-size: 1.3rem; }
  .sales-table th, .sales-table td { padding: 10px 8px; font-size: 0.8rem; }
}
</style>
