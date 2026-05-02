<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useAuth } from '@/lib/auth'
import { db, demoMode, firebaseConfigured } from '@/lib/firebase'
import { getDemoVendorOrders } from '@/lib/demoStore'

import type { VendorOrder } from '@/lib/orderTypes'

const { user, ready } = useAuth()
const loading = ref(true)
const loadError = ref('')
const orders = ref<Array<{ id: string } & VendorOrder>>([])

let stop: (() => void) | null = null

function tsToMs(ts: any) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  if (typeof ts === 'string') return new Date(ts).getTime()
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

    // ── Demo mode ────────────────────────────────────────────────────────────
    if (demoMode) {
      orders.value = getDemoVendorOrders(user.value.uid) as any
      loading.value = false
      return
    }

    // ── Firebase mode ────────────────────────────────────────────────────────
    if (!firebaseConfigured || !db) {
      loadError.value = 'Firebase is not configured yet.'
      loading.value = false
      return
    }

    const q = query(collection(db, 'vendorOrders'), where('vendorUid', '==', user.value.uid))
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
        loadError.value = 'Could not load vendor orders.'
        loading.value = false
      },
    )
  })()
})

onBeforeUnmount(() => stop?.())

const total = computed(() => orders.value.reduce((a, o) => a + (Number(o.subtotal) || 0), 0))
</script>

<template>
  <div class="vendor-orders-page">
    <div class="head">
      <div>
        <h1 class="title">Vendor Orders</h1>
        <p class="sub">Orders placed on your listings.</p>
      </div>
      <router-link class="btn" to="/sell">Back to dashboard</router-link>
    </div>

    <div v-if="loadError" class="notice error">{{ loadError }}</div>
    <div v-else-if="loading" class="notice muted">Loading orders...</div>

    <div v-else-if="!orders.length" class="empty muted">
      No orders yet.
    </div>

    <div v-else class="list">
      <div class="sum muted">Total order value: <strong class="accent">${{ total.toFixed(2) }}</strong></div>
      <router-link class="order" v-for="o in orders" :key="o.id" :to="`/order/${o.id}`">
        <div class="left">
          <div class="buyer-name">{{ o.pickupName || 'Buyer' }}</div>
          <div class="muted small">{{ fmtDate(o.createdAt) }}</div>
        </div>
        <div class="right">
          <span class="status-chip" :class="o.status">{{ o.status || 'placed' }}</span>
          <div class="muted small pickup-time">{{ o.pickupPreferredDateTime || '—' }}</div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.vendor-orders-page { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.title { margin: 0; color: var(--text); font-size: 1.8rem; }
.sub { margin: 6px 0 0; color: var(--muted); }

.notice { border-radius: 12px; padding: 10px 12px; border: 1px solid; margin: 10px 0; }
.notice.error { border-color: rgba(255,50,50,0.35); color: var(--danger); background: rgba(255,50,50,0.06); }
.notice.muted { border-color: rgba(var(--accent-rgb), 0.12); color: var(--muted); background: rgba(255,255,255,0.02); }
.empty { padding: 40px 0; text-align: center; }
.muted { color: var(--muted); }
.small { font-size: 0.85rem; }
.accent { color: var(--accent); }

.list { display: grid; gap: 10px; }
.sum { margin-bottom: 6px; }
.order {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(255,255,255,0.02);
  text-decoration: none;
}
.order:hover { border-color: rgba(var(--accent-rgb), 0.22); }
.buyer-name { color: var(--text); font-weight: 900; }
.pickup-time { margin-top: 4px; }
.right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }

.status-chip {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.06);
  white-space: nowrap;
}
.status-chip.placed   { border-color: rgba(100,180,255,0.3); color: #7ecfff; background: rgba(100,180,255,0.07); }
.status-chip.accepted { border-color: rgba(255,180,0,0.3);   color: #f5a623; background: rgba(255,180,0,0.07); }
.status-chip.ready    { border-color: rgba(var(--accent-rgb),0.3);   color: var(--accent); background: rgba(var(--accent-rgb),0.07); }
.status-chip.picked_up { border-color: rgba(80,220,120,0.3); color: var(--success); background: rgba(80,220,120,0.07); }

.btn {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 900;
  text-decoration: none;
}
</style>

