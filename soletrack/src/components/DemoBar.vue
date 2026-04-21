<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  isDemoMode,
  isDemoBuyer,
  enableDemoMode,
  enableDemoBuyerMode,
} from '@/lib/demo'

const show = isDemoMode()
const currentRole: 'seller' | 'buyer' = isDemoBuyer() ? 'buyer' : 'seller'

const LABELS = { seller: 'Seller', buyer: 'Buyer' } as const
const COLORS = { seller: '#f5a623', buyer: '#7ecfff' } as const

const router = useRouter()

function switchTo(r: 'seller' | 'buyer') {
  if (r === currentRole) return
  if (r === 'seller') enableDemoMode()
  else enableDemoBuyerMode()

  // Stay on current page where it makes sense, redirect for role-specific pages
  const path = router.currentRoute.value.path
  const sellerPages = ['/vendor-orders', '/sell', '/account']
  const buyerPages = ['/orders']

  if (r === 'seller' && buyerPages.includes(path)) {
    window.location.assign('/vendor-orders')
  } else if (r === 'buyer' && sellerPages.includes(path)) {
    window.location.assign('/orders')
  } else {
    window.location.reload()
  }
}

function resetDemo() {
  window.localStorage.removeItem('soletrack_demo_orders_v1')
  window.localStorage.removeItem('soletrack_demo_messages_v1')
  enableDemoMode()
  window.location.assign('/browse')
}
</script>

<template>
  <div v-if="show" class="demo-bar" role="status" aria-label="Demo mode controls">
    <div class="demo-bar-inner">
      <div class="left-group">
        <span class="demo-pill">DEMO</span>
        <span class="role-label" :style="{ color: COLORS[currentRole] }">
          {{ LABELS[currentRole] }}
        </span>
      </div>

      <div class="role-switcher">
        <span class="switcher-label">Switch role:</span>
        <button
          v-for="r in (['seller', 'buyer'] as const)"
          :key="r"
          class="role-btn"
          :class="{ active: r === currentRole }"
          :style="r === currentRole ? { borderColor: COLORS[r], color: COLORS[r], background: `${COLORS[r]}14` } : {}"
          @click="switchTo(r)"
        >
          {{ LABELS[r] }}
        </button>
      </div>

      <button class="reset-btn" @click="resetDemo">
        Reset Demo
      </button>
    </div>
  </div>
</template>

<style scoped>
.demo-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgb(6, 15, 7);
  border-top: 1px solid rgba(156, 255, 0, 0.15);
}

.demo-bar-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.left-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.demo-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(156, 255, 0, 0.25);
  color: var(--accent);
  background: transparent;
}

.role-label {
  font-size: 0.85rem;
  font-weight: 900;
}

.role-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: center;
  flex-wrap: wrap;
}

.switcher-label {
  font-size: 0.78rem;
  color: var(--muted);
  margin-right: 2px;
}

.role-btn {
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  min-height: 30px;
}

.role-btn:hover:not(.active) {
  border-color: rgba(255, 255, 255, 0.25);
  color: var(--text);
}

.role-btn.active {
  font-weight: 900;
  cursor: default;
}

.reset-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 80, 80, 0.25);
  background: transparent;
  color: rgba(255, 120, 120, 0.8);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  min-height: 30px;
  flex-shrink: 0;
}

.reset-btn:hover {
  border-color: rgba(255, 80, 80, 0.45);
  color: #ff8080;
  background: rgba(255, 80, 80, 0.06);
}

@media (max-width: 560px) {
  .switcher-label { display: none; }
  .demo-bar-inner { gap: 10px; }
}
</style>
