<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useRoute } from 'vue-router'
import { useAuth } from '@/lib/auth'
import { db, demoMode, firebaseConfigured } from '@/lib/firebase'
import { isDemoBuyer } from '@/lib/demo'
import { getDemoBuyerOrders, getDemoVendorOrders } from '@/lib/demoStore'

type VendorOrder = {
  checkoutId: string
  status: string
  buyerUid: string
  buyerEmail?: string
  vendorUid: string
  vendorName?: string
  pickupName?: string
  pickupPreferredDateTime?: string
  createdAt?: any
  subtotal?: number
}

const route = useRoute()
const highlightCheckoutId = computed(() => (typeof route.query.checkoutId === 'string' ? route.query.checkoutId : ''))

const { user, ready } = useAuth()
const loading = ref(true)
const loadError = ref('')
const orders = ref<Array<{ id: string } & VendorOrder>>([])
const demoAsBuyer = ref(true)

const showingIncomingDemoOrders = computed(() => demoMode && !demoAsBuyer.value)
const title = computed(() => (showingIncomingDemoOrders.value ? 'Incoming Orders' : 'My Orders'))
const subtitle = computed(() =>
  showingIncomingDemoOrders.value
    ? 'Pickup requests placed on your listings.'
    : 'Your orders, grouped by checkout session.',
)

let stop: (() => void) | null = null

function tsToMs(ts: any) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  if (typeof ts === 'string') return new Date(ts).getTime() // ISO string (demo mode)
  return 0
}

function fmtDate(ts: any) {
  const ms = tsToMs(ts)
  if (!ms) return ''
  return new Date(ms).toLocaleString()
}

onMounted(() => {
  ;(async () => {
    await ready
    if (!user.value) {
      loadError.value = 'Login required.'
      loading.value = false
      return
    }

    // ── Demo mode: load from localStorage ───────────────────────────────────
    if (demoMode) {
      demoAsBuyer.value = isDemoBuyer()
      orders.value = (
        demoAsBuyer.value ? getDemoBuyerOrders(user.value.uid) : getDemoVendorOrders(user.value.uid)
      ) as any
      loading.value = false
      return
    }

    // ── Firebase mode ────────────────────────────────────────────────────────
    if (!firebaseConfigured || !db) {
      loadError.value = 'Firebase is not configured yet.'
      loading.value = false
      return
    }

    const q = query(collection(db, 'vendorOrders'), where('buyerUid', '==', user.value.uid))
    stop = onSnapshot(
      q,
      (snap) => {
        orders.value = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as VendorOrder) }))
          .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt))
        loading.value = false
        loadError.value = ''
      },
      () => {
        loadError.value = 'Could not load your orders.'
        loading.value = false
      },
    )
  })()
})

onBeforeUnmount(() => stop?.())

const grouped = computed(() => {
  const m = new Map<string, Array<{ id: string } & VendorOrder>>()
  for (const o of orders.value) {
    const key = o.checkoutId || 'unknown'
    const cur = m.get(key) ?? []
    cur.push(o)
    m.set(key, cur)
  }
  return Array.from(m.entries())
    .map(([checkoutId, list]) => ({
      checkoutId,
      list: list.sort((a, b) =>
        showingIncomingDemoOrders.value
          ? (a.pickupName ?? '').localeCompare(b.pickupName ?? '')
          : (a.vendorName ?? '').localeCompare(b.vendorName ?? ''),
      ),
      createdAt: list.reduce((best, o) => (tsToMs(o.createdAt) > tsToMs(best) ? o.createdAt : best), list[0]!.createdAt),
    }))
    .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt))
})
</script>

<template>
  <div class="orders-page">
    <div class="head">
      <div>
        <h1 class="title">{{ title }}</h1>
        <p class="sub">{{ subtitle }}</p>
      </div>
      <router-link class="btn" to="/browse">Continue shopping</router-link>
    </div>

    <div v-if="loadError" class="notice error">{{ loadError }}</div>
    <div v-else-if="loading" class="notice muted">Loading orders...</div>

    <div v-else-if="!orders.length" class="empty muted">
      {{ showingIncomingDemoOrders ? 'No incoming orders yet.' : 'No orders yet. Add items to your cart and checkout.' }}
    </div>

    <div v-else class="sessions">
      <div class="session" v-for="s in grouped" :key="s.checkoutId" :class="{ highlight: s.checkoutId && s.checkoutId === highlightCheckoutId }">
        <div class="session-head">
          <div>
            <div class="kicker">Checkout</div>
            <div class="checkout-id">{{ s.checkoutId }}</div>
          </div>
          <div class="muted">{{ fmtDate(s.createdAt) }}</div>
        </div>

        <div class="list">
          <router-link class="order" v-for="o in s.list" :key="o.id" :to="`/order/${o.id}`">
            <div class="left">
              <div class="vendor">
                {{ showingIncomingDemoOrders ? (o.pickupName || o.buyerEmail || 'Buyer') : (o.vendorName || 'Vendor') }}
              </div>
              <div class="muted small">
                Status: {{ o.status || 'placed' }}
                <template v-if="showingIncomingDemoOrders && o.buyerEmail">· {{ o.buyerEmail }}</template>
              </div>
            </div>
            <div class="right muted">{{ o.pickupPreferredDateTime || '' }}</div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-page { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.title { margin: 0; color: var(--text); font-size: 1.8rem; }
.sub { margin: 6px 0 0; color: var(--muted); }

.notice { border-radius: 12px; padding: 10px 12px; border: 1px solid; margin: 10px 0; }
.notice.error { border-color: rgba(255,50,50,0.35); color: var(--danger); background: rgba(255,50,50,0.06); }
.notice.muted { border-color: rgba(156, 255, 0, 0.12); color: var(--muted); background: rgba(255,255,255,0.02); }
.empty { padding: 40px 0; text-align: center; }
.muted { color: var(--muted); }
.small { font-size: 0.85rem; }

.sessions { display: grid; gap: 12px; }
.session { border: 1px solid rgba(156, 255, 0, 0.12); border-radius: 16px; padding: 14px; background: rgba(255,255,255,0.02); }
.session.highlight { border-color: rgba(156, 255, 0, 0.35); box-shadow: 0 0 0 1px rgba(156, 255, 0, 0.12) inset; }
.session-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.kicker { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.7rem; color: var(--muted); }
.checkout-id { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--text); font-weight: 900; }

.list { display: grid; gap: 8px; }
.order {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  text-decoration: none;
}
.order:hover { border-color: rgba(156, 255, 0, 0.22); }
.vendor { color: var(--text); font-weight: 900; }
.right { text-align: right; font-size: 0.85rem; }

.btn {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(156, 255, 0, 0.15);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 900;
  text-decoration: none;
}
</style>

