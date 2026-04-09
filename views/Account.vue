<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useAuth } from '@/lib/auth'
import { auth, db, demoMode, firebaseConfigured } from '@/lib/firebase'
import { upsertUserProfile } from '@/lib/profile'
import { disableDemoMode } from '@/lib/demo'
import { addDemoSale, deleteDemoSale, getOrSeedDemoSales } from '@/lib/demoStore'

const router = useRouter()

interface Sale {
  id: string
  shoe: string
  size: string
  buyPrice: number
  sellPrice: number
  date: string
  platform: string
}

const { user, ready } = useAuth()
const sales = ref<Sale[]>([])
const showAddSale = ref(false)
const formError = ref('')
const loading = ref(true)

const newShoe = ref('')
const newSize = ref('')
const newBuyPrice = ref('')
const newSellPrice = ref('')
const newDate = ref(new Date().toISOString().slice(0, 10))
const newPlatform = ref('StockX')

const platforms = ['StockX', 'GOAT', 'eBay', 'Facebook Marketplace', 'Local', 'Other']

let stopSalesListener: (() => void) | null = null

onMounted(() => {
  ;(async () => {
    await ready
    if (demoMode) {
      sales.value = getOrSeedDemoSales()
      loading.value = false
      return
    }
    if (!firebaseConfigured || !auth || !db) {
      loading.value = false
      formError.value = 'Firebase is not configured yet. Add soletrack/.env.local to enable account sales.'
      return
    }
    const firestore = db
    if (!user.value) {
      router.push('/login')
      return
    }

    await upsertUserProfile(user.value)

    const salesRef = collection(firestore, 'users', user.value.uid, 'sales')
    const q = query(salesRef, orderBy('createdAt', 'desc'))
    stopSalesListener = onSnapshot(
      q,
      (snap) => {
        sales.value = snap.docs.map((d) => {
          const data = d.data() as Omit<Sale, 'id'> & { createdAt?: unknown }
          return { id: d.id, ...data }
        })
        loading.value = false
      },
      () => {
        loading.value = false
      },
    )
  })()
})

onBeforeUnmount(() => stopSalesListener?.())

async function addSale() {
  formError.value = ''
  if (!newShoe.value.trim()) { formError.value = 'Shoe name is required'; return }
  if (!newSize.value.trim()) { formError.value = 'Size is required'; return }
  if (!newBuyPrice.value || isNaN(+newBuyPrice.value)) { formError.value = 'Enter a valid buy price'; return }
  if (!newSellPrice.value || isNaN(+newSellPrice.value)) { formError.value = 'Enter a valid sell price'; return }
  if (demoMode) {
    sales.value = addDemoSale({
      shoe: newShoe.value.trim(),
      size: newSize.value.trim(),
      buyPrice: parseFloat(newBuyPrice.value),
      sellPrice: parseFloat(newSellPrice.value),
      date: newDate.value,
      platform: newPlatform.value,
    })
    newShoe.value = ''
    newSize.value = ''
    newBuyPrice.value = ''
    newSellPrice.value = ''
    newDate.value = new Date().toISOString().slice(0, 10)
    newPlatform.value = 'StockX'
    showAddSale.value = false
    return
  }
  if (!user.value) { router.push('/login'); return }
  if (!db) { formError.value = 'Database not available.'; return }

  try {
    const salesRef = collection(db, 'users', user.value.uid, 'sales')
    await addDoc(salesRef, {
      shoe: newShoe.value.trim(),
      size: newSize.value.trim(),
      buyPrice: parseFloat(newBuyPrice.value),
      sellPrice: parseFloat(newSellPrice.value),
      date: newDate.value,
      platform: newPlatform.value,
      createdAt: serverTimestamp(),
    })

    newShoe.value = ''
    newSize.value = ''
    newBuyPrice.value = ''
    newSellPrice.value = ''
    newDate.value = new Date().toISOString().slice(0, 10)
    newPlatform.value = 'StockX'
    showAddSale.value = false
  } catch {
    formError.value = 'Could not save sale. Please try again.'
  }
}

async function deleteSale(id: string) {
  if (demoMode) {
    sales.value = deleteDemoSale(id)
    return
  }
  if (!user.value) { router.push('/login'); return }
  try {
    if (!db) return
    await deleteDoc(doc(db, 'users', user.value.uid, 'sales', id))
  } catch {
    formError.value = 'Could not delete sale. Please try again.'
  }
}

const profit = (s: Sale) => s.sellPrice - s.buyPrice
const fmt = (n: number) => (n >= 0 ? '$' : '-$') + Math.abs(n).toFixed(2)

const totalSales = computed(() => sales.value.length)
const totalRevenue = computed(() => sales.value.reduce((a, s) => a + s.sellPrice, 0))
const totalProfit = computed(() => sales.value.reduce((a, s) => a + profit(s), 0))
const bestSale = computed(() => !sales.value.length ? null : sales.value.reduce((b, s) => profit(s) > profit(b) ? s : b))
const projectedProfit = computed(() => {
  const b = parseFloat(newBuyPrice.value)
  const s = parseFloat(newSellPrice.value)
  return (!isNaN(b) && !isNaN(s)) ? s - b : null
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
        <h1 class="account-title">
          Welcome back, {{ user?.displayName || 'Reseller' }} 👋
        </h1>
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
        <span class="stat-value" :class="totalProfit >= 0 ? 'pos' : 'neg'">{{ fmt(totalProfit) }}</span>
      </div>
      <div class="stat-card accent-card" v-if="bestSale">
        <span class="stat-label">Best Sale</span>
        <span class="stat-value pos">+{{ fmt(profit(bestSale)) }}</span>
        <span class="stat-note">{{ bestSale.shoe }}</span>
      </div>
    </div>

    <div class="section-header">
      <h2 class="section-title">Sales Log</h2>
      <button class="btn primary" @click="showAddSale = !showAddSale">
        {{ showAddSale ? '✕ Cancel' : '+ Add Sale' }}
      </button>
    </div>

    <Transition name="slide">
      <div class="add-sale-form" v-if="showAddSale">
        <h3>Log a New Sale</h3>
        <div class="form-grid">
          <div class="form-row">
            <label>Shoe Name</label>
            <input v-model="newShoe" type="text" placeholder="e.g. Air Jordan 1 Retro High OG" />
          </div>
          <div class="form-row">
            <label>Size (US)</label>
            <input v-model="newSize" type="text" placeholder="e.g. 10" />
          </div>
          <div class="form-row">
            <label>Buy Price</label>
            <input v-model="newBuyPrice" type="number" inputmode="decimal" placeholder="e.g. 180" />
          </div>
          <div class="form-row">
            <label>Sell Price</label>
            <input v-model="newSellPrice" type="number" inputmode="decimal" placeholder="e.g. 290" />
          </div>
          <div class="form-row">
            <label>Date Sold</label>
            <input v-model="newDate" type="date" />
          </div>
          <div class="form-row">
            <label>Platform</label>
            <select v-model="newPlatform">
              <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>

        <p
          v-if="projectedProfit !== null"
          class="profit-preview"
          :class="projectedProfit >= 0 ? 'pos' : 'neg'"
        >
          Projected Profit: {{ fmt(projectedProfit) }}
        </p>

        <p class="error" v-if="formError">{{ formError }}</p>
        <div class="actions-row">
          <button class="btn primary" @click="addSale">Save Sale</button>
        </div>
      </div>
    </Transition>

    <div class="sales-table-wrap" v-if="!loading && sales.length">
      <table class="sales-table">
        <thead>
          <tr>
            <th>Shoe</th>
            <th>Size</th>
            <th>Buy</th>
            <th>Sell</th>
            <th>Profit</th>
            <th>Date</th>
            <th>Platform</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sales" :key="s.id">
            <td class="td-shoe">{{ s.shoe }}</td>
            <td>{{ s.size }}</td>
            <td>{{ fmt(s.buyPrice) }}</td>
            <td>{{ fmt(s.sellPrice) }}</td>
            <td class="td-profit" :class="profit(s) >= 0 ? 'pos' : 'neg'">{{ fmt(profit(s)) }}</td>
            <td>{{ s.date }}</td>
            <td>{{ s.platform }}</td>
            <td><button class="btn-delete" @click="deleteSale(s.id)" title="Remove">✕</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="empty-state" v-if="loading">
      <p class="empty-icon">⏳</p>
      <p>Loading your sales…</p>
    </div>

    <div class="empty-state" v-if="!loading && !sales.length && !showAddSale">
      <p class="empty-icon">📦</p>
      <p>No sales logged yet. Start tracking your flips!</p>
      <button class="btn primary" @click="showAddSale = true">Log your first sale</button>
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

.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { margin: 0; font-size: 1.2rem; color: var(--text); }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 8px 16px;
  border-radius: 8px; border: 1px solid var(--border);
  background: transparent; color: var(--text);
  cursor: pointer; font-weight: 700; font-size: 0.9rem; text-decoration: none;
}
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }

.add-sale-form {
  background: var(--card);
  border: 1px solid rgba(156, 255, 0, 0.2);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}
.add-sale-form h3 { margin: 0 0 16px; color: var(--text); font-size: 1rem; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }

.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 0.8rem; color: var(--muted); }
.form-row input, .form-row select {
  padding: 8px 10px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--bg);
  color: var(--text); font-size: 0.95rem;
}

.profit-preview { margin: 0 0 12px; font-weight: 900; font-size: 1rem; }
.profit-preview.pos { color: var(--success); }
.profit-preview.neg { color: var(--danger); }
.error { color: var(--danger); margin: 0 0 12px; font-size: 0.9rem; }

.actions-row { display: flex; justify-content: flex-end; }

.sales-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(156, 255, 0, 0.12); }
.sales-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.sales-table th {
  background: var(--card); color: var(--muted); font-size: 0.75rem;
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid rgba(156, 255, 0, 0.08);
}
.sales-table td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text); }
.sales-table tbody tr:hover { background: rgba(156, 255, 0, 0.03); }
.td-shoe { font-weight: 800; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-profit.pos { color: var(--success); font-weight: 900; }
.td-profit.neg { color: var(--danger); font-weight: 900; }
.pos { color: var(--success); }
.neg { color: var(--danger); }

.btn-delete { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: color 0.2s; }
.btn-delete:hover { color: var(--danger); }

.empty-state { text-align: center; padding: 64px 24px; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }
.empty-icon { font-size: 3rem; margin: 0; }

.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
