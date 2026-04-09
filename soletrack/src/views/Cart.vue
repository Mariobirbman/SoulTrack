<script setup lang="ts">
import { computed } from 'vue'
import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth'
import { firebaseConfigured } from '@/lib/firebase'

const { items, subtotal, totalCount, remove, setQty, clear } = useCart()
const { user } = useAuth()

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const hasItems = computed(() => items.value.length > 0)
const checkoutReady = computed(() => firebaseConfigured && hasItems.value)
</script>

<template>
  <div class="cart-page">
    <div class="header">
      <div>
        <h1 class="title">Cart</h1>
        <p class="sub">{{ totalCount }} item(s)</p>
      </div>
      <button class="btn danger" :disabled="!hasItems" @click="clear">Clear</button>
    </div>

    <div v-if="!hasItems" class="empty">
      <p class="empty-icon">🛒</p>
      <p>Your cart is empty.</p>
      <router-link class="btn primary" to="/analytics">Browse catalog</router-link>
    </div>

    <div v-else class="grid">
      <div class="items">
        <div class="row" v-for="it in items" :key="it.id">
          <img v-if="it.image" class="img" :src="it.image" :alt="it.name" />
          <div class="meta">
            <div class="name">{{ it.name }}</div>
            <div class="price muted">{{ fmtUSD(it.price) }} each</div>
          </div>
          <div class="qty">
            <label class="muted" :for="`qty-${it.id}`">Qty</label>
            <input
              class="qty-input"
              :id="`qty-${it.id}`"
              type="number"
              min="1"
              :value="it.qty"
              @input="setQty(it.id, Number(($event.target as HTMLInputElement).value))"
            />
          </div>
          <div class="line">{{ fmtUSD(it.qty * it.price) }}</div>
          <button class="remove" @click="remove(it.id)" title="Remove">✕</button>
        </div>
      </div>

      <aside class="summary">
        <h2 class="sum-title">Summary</h2>
        <div class="sum-row">
          <span class="muted">Subtotal</span>
          <strong>{{ fmtUSD(subtotal) }}</strong>
        </div>
        <div v-if="!firebaseConfigured" class="sum-note muted">Checkout is disabled until Firebase is configured.</div>
        <div v-else class="sum-note muted">Demo checkout (pickup-style). No real payments.</div>

        <router-link v-if="checkoutReady && user" class="btn primary" to="/checkout">Checkout</router-link>
        <router-link v-else-if="checkoutReady && !user" class="btn primary" to="/login">Login to checkout</router-link>
        <button v-else class="btn primary" disabled>Checkout</button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cart-page { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.title { margin: 0; color: var(--text); font-size: 1.8rem; }
.sub { margin: 6px 0 0; color: var(--muted); }

.grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

.items { border: 1px solid rgba(156, 255, 0, 0.12); border-radius: 16px; overflow: hidden; }
.row {
  display: grid;
  grid-template-columns: 76px 1fr 110px 120px 40px;
  gap: 12px;
  align-items: center;
  padding: 12px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  background: rgba(255,255,255,0.02);
}
.row:last-child { border-bottom: none; }

@media (max-width: 600px) {
  .row {
    grid-template-columns: 60px 1fr 36px;
    grid-template-rows: auto auto;
  }
  .img { width: 60px; height: 48px; grid-row: 1 / 3; }
  .meta { grid-column: 2; grid-row: 1; }
  .qty { grid-column: 2; grid-row: 2; flex-direction: row; align-items: center; }
  .line { display: none; }
  .remove { grid-column: 3; grid-row: 1; }
}
.img { width: 76px; height: 56px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(156, 255, 0, 0.10); }
.meta { min-width: 0; }
.name { color: var(--text); font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.price { font-size: 0.85rem; margin-top: 2px; }
.qty { display: flex; flex-direction: column; gap: 6px; }
.qty-input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
}
.line { text-align: right; font-weight: 900; color: var(--text); }
.remove { border: none; background: transparent; color: var(--muted); cursor: pointer; font-size: 1.1rem; }
.remove:hover { color: var(--danger); }

.summary { border: 1px solid rgba(156, 255, 0, 0.12); border-radius: 16px; padding: 16px; background: rgba(255,255,255,0.02); }
.sum-title { margin: 0 0 12px; color: var(--text); font-size: 1.1rem; }
.sum-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.sum-note { font-size: 0.85rem; margin: 12px 0 14px; }

.btn { padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(156, 255, 0, 0.15); background: transparent; color: var(--text); cursor: pointer; font-weight: 900; }
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; width: 100%; }
.btn.danger { border-color: rgba(255, 50, 50, 0.35); color: var(--danger); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.empty { text-align: center; padding: 64px 24px; color: var(--muted); display: flex; flex-direction: column; gap: 14px; align-items: center; }
.empty-icon { font-size: 3rem; margin: 0; }
.muted { color: var(--muted); }
</style>
