<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/lib/auth'
import { useCart } from '@/lib/cart'
import { auth, db, demoMode, firebaseConfigured } from '@/lib/firebase'
import { addDemoOrder } from '@/lib/demoStore'

type CartLine = {
  id: string
  name: string
  price: number
  qty: number
  image?: string
  vendorUid?: string
  vendorName?: string
}

const router = useRouter()
const { user } = useAuth()
const { items, subtotal, clear } = useCart()

const pickupName = ref('')
const pickupEmail = ref(user.value?.email ?? '')
const pickupPreferredDateTime = ref('')
const notes = ref('')

const error = ref('')
const saving = ref(false)
const confirmed = ref(false)
const confirmedCheckoutId = ref('')

const lines = computed(() => items.value as unknown as CartLine[])
// In demo mode all items are valid; in Firebase mode filter out dataset catalog items
const invalidLines = computed(() =>
  demoMode ? [] : lines.value.filter((l) => !l.vendorUid || l.vendorUid.startsWith('__')),
)

const byVendor = computed(() => {
  const m = new Map<string, { vendorUid: string; vendorName: string; lines: CartLine[] }>()
  for (const l of lines.value) {
    if (!demoMode && (!l.vendorUid || l.vendorUid.startsWith('__'))) continue
    if (!l.vendorUid) continue
    const key = l.vendorUid
    const cur = m.get(key) ?? { vendorUid: l.vendorUid, vendorName: l.vendorName ?? 'Vendor', lines: [] as CartLine[] }
    cur.lines.push(l)
    m.set(key, cur)
  }
  return Array.from(m.values()).map((g) => ({
    ...g,
    total: g.lines.reduce((a, it) => a + it.qty * it.price, 0),
  }))
})

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function newCheckoutId() {
  const c = (globalThis as any).crypto
  if (c?.randomUUID) return c.randomUUID() as string
  return `chk_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

async function validateCartPrices(): Promise<string | null> {
  if (!db) return null
  const realLines = lines.value.filter((l) => l.vendorUid && !l.vendorUid.startsWith('__'))
  for (const l of realLines) {
    const snap = await getDoc(doc(db, 'products', l.id))
    if (!snap.exists()) return `Item "${l.name}" is no longer available.`
    const data = snap.data()
    const status = String(data.status ?? 'active')
    if (data.active === false || status === 'sold' || status === 'rejected') {
      return `Item "${l.name}" is no longer available for purchase.`
    }
    const serverPrice = Number(data.price ?? 0)
    if (Math.abs(serverPrice - l.price) > 0.01) {
      return `Price for "${l.name}" has changed to ${fmtUSD(serverPrice)}. Please refresh your cart.`
    }
  }
  return null
}

async function placeOrders() {
  error.value = ''
  if (!user.value) {
    router.push('/login')
    return
  }
  if (!lines.value.length) {
    error.value = 'Your cart is empty.'
    return
  }
  if (invalidLines.value.length) {
    error.value = 'Remove non-marketplace items from your cart to checkout.'
    return
  }
  if (!pickupName.value.trim()) {
    error.value = 'Your name is required for pickup.'
    return
  }
  if (!pickupEmail.value.trim()) {
    error.value = 'Email is required.'
    return
  }
  if (!pickupPreferredDateTime.value.trim()) {
    error.value = 'Preferred pickup date/time is required.'
    return
  }

  saving.value = true
  const checkoutId = newCheckoutId()

  // ── Demo mode: write orders to localStorage ──────────────────────────────
  if (demoMode) {
    for (const g of byVendor.value) {
      addDemoOrder({
        checkoutId,
        status: 'placed',
        buyerUid: user.value.uid,
        buyerEmail: user.value.email ?? null,
        vendorUid: g.vendorUid,
        vendorName: g.vendorName,
        pickupName: pickupName.value.trim(),
        pickupEmail: pickupEmail.value.trim(),
        pickupPreferredDateTime: pickupPreferredDateTime.value.trim(),
        notes: notes.value.trim(),
        items: g.lines.map((l) => ({
          productId: l.id,
          nameSnapshot: l.name,
          priceSnapshot: l.price,
          qty: l.qty,
          image: l.image ?? null,
        })),
        subtotal: g.total,
      })
    }
    clear()
    confirmedCheckoutId.value = checkoutId
    confirmed.value = true
    saving.value = false
    return
  }

  // ── Firebase mode ─────────────────────────────────────────────────────────
  if (!firebaseConfigured || !auth || !db) {
    error.value = 'Firebase is not configured yet.'
    saving.value = false
    return
  }

  const priceError = await validateCartPrices().catch(() => null)
  if (priceError) {
    error.value = priceError
    saving.value = false
    return
  }

  try {
    for (const g of byVendor.value) {
      await addDoc(collection(db, 'vendorOrders'), {
        checkoutId,
        status: 'placed',
        buyerUid: user.value.uid,
        buyerEmail: user.value.email ?? null,
        vendorUid: g.vendorUid,
        vendorName: g.vendorName,
        pickupName: pickupName.value.trim(),
        pickupEmail: pickupEmail.value.trim(),
        pickupPreferredDateTime: pickupPreferredDateTime.value.trim(),
        notes: notes.value.trim(),
        items: g.lines.map((l) => ({
          productId: l.id,
          nameSnapshot: l.name,
          priceSnapshot: l.price,
          qty: l.qty,
          image: l.image ?? null,
        })),
        subtotal: g.total,
        createdAt: serverTimestamp(),
      })
    }
    clear()
    router.push({ path: '/orders', query: { checkoutId } })
  } catch {
    error.value = 'Could not place order. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="checkout-page">

    <!-- ── Order confirmed screen ── -->
    <div v-if="confirmed" class="confirmed-screen">
      <div class="confirmed-icon">✓</div>
      <div class="confirmed-title">Order placed!</div>
      <p class="confirmed-sub">
        Your pickup request has been sent to the seller.<br>
        They'll accept it and let you know when it's ready.
      </p>
      <div class="confirmed-id">Checkout ID: <span class="mono">{{ confirmedCheckoutId }}</span></div>
      <div class="confirmed-actions">
        <router-link class="btn primary" :to="{ path: '/orders', query: { checkoutId: confirmedCheckoutId } }">View my orders</router-link>
        <router-link class="btn" to="/browse">Keep shopping</router-link>
      </div>
    </div>

    <template v-else>
    <div class="head">
      <div>
        <h1 class="title">Checkout</h1>
        <p class="sub">Demo checkout. No real payments.</p>
      </div>
      <router-link class="btn" to="/cart">Back to cart</router-link>
    </div>

    <div v-if="error" class="notice error">{{ error }}</div>

    <div v-if="invalidLines.length" class="notice muted">
      Some items in your cart are not purchasable (for example dataset catalog items). Remove them before checkout.
    </div>

    <div class="grid">
      <section class="panel">
        <h2 class="panel-title">Pickup details</h2>
        <div class="form">
          <div class="row">
            <label>Name</label>
            <input v-model="pickupName" type="text" placeholder="Your name" />
          </div>
          <div class="row">
            <label>Email</label>
            <input v-model="pickupEmail" type="email" placeholder="you@example.com" />
          </div>
          <div class="row">
            <label>Preferred pickup date/time</label>
            <input v-model="pickupPreferredDateTime" type="text" placeholder="e.g. Fri 4pm, or 2026-04-02 16:00" />
          </div>
          <div class="row">
            <label>Notes</label>
            <textarea v-model="notes" rows="3" placeholder="Any details for the vendor?"></textarea>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-title">Orders (per vendor)</h2>
        <div v-if="!byVendor.length" class="muted">No marketplace items in cart.</div>
        <div v-else class="vendors">
          <div class="vendor" v-for="v in byVendor" :key="v.vendorUid">
            <div class="vendor-head">
              <div class="vendor-name">{{ v.vendorName }}</div>
              <div class="vendor-total">{{ fmtUSD(v.total) }}</div>
            </div>
            <div class="lines">
              <div class="line" v-for="l in v.lines" :key="l.id">
                <span class="muted">{{ l.qty }}×</span>
                <span class="line-name">{{ l.name }}</span>
                <span class="line-price">{{ fmtUSD(l.qty * l.price) }}</span>
              </div>
            </div>
          </div>

          <div class="summary">
            <div class="sum-row">
              <span class="muted">Cart subtotal</span>
              <strong>{{ fmtUSD(subtotal) }}</strong>
            </div>
            <button class="btn primary" :disabled="saving || invalidLines.length > 0 || !byVendor.length" @click="placeOrders">
              {{ saving ? 'Placing order...' : 'Place demo order' }}
            </button>
          </div>
        </div>
      </section>
    </div>
    </template>
  </div>
</template>

<style scoped>
.checkout-page { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.title { margin: 0; color: var(--text); font-size: 1.8rem; }
.sub { margin: 6px 0 0; color: var(--muted); }

.notice { border-radius: 12px; padding: 10px 12px; border: 1px solid; margin: 10px 0; }
.notice.error { border-color: rgba(255,50,50,0.35); color: var(--danger); background: rgba(255,50,50,0.06); }
.notice.muted { border-color: rgba(var(--accent-rgb), 0.12); color: var(--muted); background: rgba(255,255,255,0.02); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }

.panel { border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: 16px; padding: 16px; background: rgba(255,255,255,0.02); }
.panel-title { margin: 0 0 12px; color: var(--text); font-size: 1.05rem; }

.form { display: grid; gap: 10px; }
.row { display: grid; gap: 6px; }
.row label { color: var(--muted); font-size: 0.82rem; }
.row input, .row textarea {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 0.95rem;
}

.vendors { display: grid; gap: 12px; }
.vendor { border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.02); }
.vendor-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.vendor-name { color: var(--text); font-weight: 900; }
.vendor-total { color: var(--accent); font-weight: 900; }
.lines { display: grid; gap: 6px; }
.line { display: grid; grid-template-columns: 34px 1fr auto; gap: 10px; align-items: center; }
.line-name { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line-price { color: var(--muted); font-weight: 800; }

.summary { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; }
.sum-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.muted { color: var(--muted); }

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
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; width: 100%; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* Confirmation screen */
.confirmed-screen {
  max-width: 480px;
  margin: 80px auto;
  text-align: center;
  padding: 0 16px;
}
.confirmed-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 1.6rem;
  line-height: 52px;
  margin: 0 auto 20px;
}
.confirmed-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--text);
  margin-bottom: 10px;
}
.confirmed-sub {
  color: var(--muted);
  line-height: 1.6;
  margin-bottom: 16px;
}
.confirmed-id {
  font-size: 0.82rem;
  color: var(--muted);
  margin-bottom: 24px;
}
.mono {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  color: var(--text);
}
.confirmed-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .checkout-page { padding: 20px 12px 60px; }
  .head { flex-wrap: wrap; }
  .panel { padding: 14px; }
  .line { grid-template-columns: 28px 1fr auto; }
}
</style>

