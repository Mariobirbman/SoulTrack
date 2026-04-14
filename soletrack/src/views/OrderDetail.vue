<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { useAuth } from '@/lib/auth'
import { db, firebaseConfigured } from '@/lib/firebase'

type VendorOrder = {
  checkoutId: string
  status: string
  buyerUid: string
  buyerEmail?: string | null
  vendorUid: string
  vendorName?: string
  pickupName?: string
  pickupEmail?: string
  pickupPreferredDateTime?: string
  notes?: string
  items: Array<{ productId: string; nameSnapshot: string; priceSnapshot: number; qty: number; image?: string | null }>
  createdAt?: any
  subtotal?: number
}

type Message = {
  senderUid: string
  text: string
  createdAt?: any
}

const route = useRoute()
const router = useRouter()
const { user, ready } = useAuth()

const id = computed(() => String(route.params.id || ''))
const loading = ref(true)
const loadError = ref('')
const order = ref<VendorOrder | null>(null)

const messages = ref<Array<{ id: string } & Message>>([])
const msg = ref('')
const sending = ref(false)

let stopOrder: (() => void) | null = null
let stopMsgs: (() => void) | null = null

function tsToMs(ts: any) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  return 0
}
function fmtDate(ts: any) {
  const ms = tsToMs(ts)
  if (!ms) return ''
  return new Date(ms).toLocaleString()
}
function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const isVendorView = computed(() => !!user.value && !!order.value && user.value.uid === order.value.vendorUid)
const backLink = computed(() => (isVendorView.value ? '/vendor-orders' : '/orders'))

const STATUS_STEPS = ['placed', 'accepted', 'ready', 'picked_up'] as const
const STATUS_LABELS: Record<string, string> = {
  placed: 'Order Placed',
  accepted: 'Accepted by Vendor',
  ready: 'Ready for Pickup',
  picked_up: 'Picked Up',
}
const STATUS_NEXT_LABEL: Record<string, string> = {
  placed: 'Accept Order',
  accepted: 'Mark Ready for Pickup',
  ready: 'Mark as Picked Up',
}

const currentStepIndex = computed(() => STATUS_STEPS.indexOf((order.value?.status ?? 'placed') as any))
const nextStatus = computed<string | null>(() => STATUS_STEPS[currentStepIndex.value + 1] ?? null)

const advancing = ref(false)
const advanceError = ref('')

async function advanceStatus() {
  if (!firebaseConfigured || !db || !user.value || !order.value || !nextStatus.value) return
  advancing.value = true
  advanceError.value = ''
  try {
    await updateDoc(doc(db, 'vendorOrders', id.value), { status: nextStatus.value })
  } catch {
    advanceError.value = 'Could not update order status. Please try again.'
  } finally {
    advancing.value = false
  }
}

onMounted(() => {
  ;(async () => {
    await ready
    if (!firebaseConfigured || !db) {
      loadError.value = 'Firebase is not configured yet.'
      loading.value = false
      return
    }
    if (!user.value) {
      router.push('/login')
      return
    }

    stopOrder = onSnapshot(
      doc(db, 'vendorOrders', id.value),
      (snap) => {
        if (!snap.exists()) {
          loadError.value = 'Order not found (or you do not have access).'
          order.value = null
          loading.value = false
          return
        }
        order.value = snap.data() as VendorOrder
        loading.value = false
        loadError.value = ''
      },
      () => {
        loadError.value = 'Could not load order.'
        loading.value = false
      },
    )

    const msgsQ = query(collection(db, 'vendorOrders', id.value, 'messages'), orderBy('createdAt'))
    stopMsgs = onSnapshot(
      msgsQ,
      (snap) => {
        messages.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Message) }))
      },
      () => {
        // ignore chat load errors for now
      },
    )
  })()
})

onBeforeUnmount(() => {
  stopOrder?.()
  stopMsgs?.()
})

async function send() {
  if (!firebaseConfigured || !db || !user.value) return
  const text = msg.value.trim()
  if (!text) return
  sending.value = true
  try {
    await addDoc(collection(db, 'vendorOrders', id.value, 'messages'), {
      senderUid: user.value.uid,
      text,
      createdAt: serverTimestamp(),
    })
    msg.value = ''
  } catch {
    // keep it simple for demo
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="order-page">
    <div class="head">
      <router-link class="btn" :to="backLink">Back</router-link>
      <div class="grow">
        <h1 class="title">Order</h1>
        <p v-if="order" class="sub muted">{{ order.checkoutId }} · {{ fmtDate(order.createdAt) }}</p>
      </div>
    </div>

    <div v-if="loadError" class="notice error">{{ loadError }}</div>
    <div v-else-if="loading" class="notice muted">Loading order...</div>

    <template v-else-if="order">
      <!-- Status timeline -->
      <section class="panel status-panel">
        <div class="status-header">
          <h2 class="panel-title" style="margin:0">Order Status</h2>
          <span class="status-chip" :class="order.status">{{ STATUS_LABELS[order.status] ?? order.status }}</span>
        </div>

        <div class="timeline">
          <div
            v-for="(step, i) in STATUS_STEPS"
            :key="step"
            class="step"
            :class="{ done: i <= currentStepIndex, active: i === currentStepIndex }"
          >
            <div class="step-dot"></div>
            <div class="step-label">{{ STATUS_LABELS[step] }}</div>
          </div>
          <div class="step-line"></div>
        </div>

        <div v-if="isVendorView && nextStatus" class="advance-row">
          <div v-if="advanceError" class="adv-error">{{ advanceError }}</div>
          <button class="btn primary" :disabled="advancing" @click="advanceStatus">
            {{ advancing ? 'Updating…' : STATUS_NEXT_LABEL[order.status] }}
          </button>
        </div>
      </section>

      <div class="grid">
        <section class="panel">
          <h2 class="panel-title">Items</h2>
          <div class="items">
            <div class="item" v-for="it in order.items" :key="it.productId">
              <img class="thumb" :src="it.image || '/images/shoes/pexels-jonathanborba-12031204.jpg'" :alt="it.nameSnapshot" />
              <div class="meta">
                <div class="name">{{ it.nameSnapshot }}</div>
                <div class="muted small">{{ it.qty }}× · {{ fmtUSD(it.priceSnapshot) }} each</div>
              </div>
              <div class="line">{{ fmtUSD(it.qty * it.priceSnapshot) }}</div>
            </div>
          </div>
          <div class="sum">
            <span class="muted">Subtotal</span>
            <strong>{{ fmtUSD(Number(order.subtotal) || 0) }}</strong>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel-title">Pickup</h2>
          <div class="kv">
            <div class="k">Vendor</div>
            <div class="v">
              <router-link class="link" :to="`/vendor/${order.vendorUid}`">{{ order.vendorName || 'Vendor' }}</router-link>
            </div>
            <div class="k">Name</div>
            <div class="v">{{ order.pickupName || '—' }}</div>
            <div class="k">Email</div>
            <div class="v">{{ order.pickupEmail || '—' }}</div>
            <div class="k">Preferred time</div>
            <div class="v">{{ order.pickupPreferredDateTime || '—' }}</div>
            <div class="k">Notes</div>
            <div class="v">{{ order.notes || '—' }}</div>
          </div>
        </section>
      </div>

      <section class="panel chat">
        <h2 class="panel-title">Chat</h2>
        <div class="messages">
          <div class="msg" v-for="m in messages" :key="m.id" :class="{ mine: user?.uid === m.senderUid }">
            <div class="bubble">
              <div class="text">{{ m.text }}</div>
              <div class="time muted">{{ fmtDate(m.createdAt) }}</div>
            </div>
          </div>
        </div>

        <form class="composer" @submit.prevent="send">
          <input v-model="msg" type="text" placeholder="Message…" />
          <button class="btn primary" type="submit" :disabled="sending || !msg.trim()">
            Send
          </button>
        </form>
      </section>
    </template>
  </div>
</template>

<style scoped>
.order-page { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }
.head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.grow { flex: 1; min-width: 0; }
.title { margin: 0; color: var(--text); font-size: 1.8rem; }
.sub { margin: 6px 0 0; }
.muted { color: var(--muted); }
.small { font-size: 0.85rem; }

.notice { border-radius: 12px; padding: 10px 12px; border: 1px solid; margin: 10px 0; }
.notice.error { border-color: rgba(255,50,50,0.35); color: var(--danger); background: rgba(255,50,50,0.06); }
.notice.muted { border-color: rgba(156, 255, 0, 0.12); color: var(--muted); background: rgba(255,255,255,0.02); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }

.panel { border: 1px solid rgba(156, 255, 0, 0.12); border-radius: 16px; padding: 16px; background: rgba(255,255,255,0.02); }
.panel-title { margin: 0 0 12px; color: var(--text); font-size: 1.05rem; }
.link { color: var(--accent); text-decoration: none; font-weight: 900; }
.link:hover { text-decoration: underline; text-underline-offset: 2px; }

.items { display: grid; gap: 10px; }
.item {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}
.thumb { width: 64px; height: 48px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(156, 255, 0, 0.10); }
.meta { min-width: 0; }
.name { color: var(--text); font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.line { font-weight: 900; color: var(--text); }
.sum { display: flex; justify-content: space-between; align-items: baseline; margin-top: 12px; }

.kv { display: grid; grid-template-columns: 130px 1fr; gap: 10px; }
.k { color: var(--muted); font-size: 0.82rem; }
.v { color: var(--text); font-weight: 700; }

/* Status timeline */
.status-panel { margin-bottom: 16px; }
.status-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }

.status-chip {
  font-size: 0.78rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(156, 255, 0, 0.25);
  color: var(--accent);
  background: rgba(156, 255, 0, 0.06);
  white-space: nowrap;
}
.status-chip.placed   { border-color: rgba(100,180,255,0.3); color: #7ecfff; background: rgba(100,180,255,0.07); }
.status-chip.accepted { border-color: rgba(255,180,0,0.3);   color: #f5a623; background: rgba(255,180,0,0.07); }
.status-chip.ready    { border-color: rgba(156,255,0,0.3);   color: var(--accent); background: rgba(156,255,0,0.07); }
.status-chip.picked_up { border-color: rgba(80,220,120,0.3); color: var(--success); background: rgba(80,220,120,0.07); }

.timeline {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  padding-bottom: 6px;
}
.step-line {
  position: absolute;
  top: 11px;
  left: 12.5%;
  right: 12.5%;
  height: 2px;
  background: rgba(255,255,255,0.08);
  z-index: 0;
}
.step {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  background: var(--card);
  transition: background 0.2s, border-color 0.2s;
}
.step.done .step-dot {
  border-color: var(--accent);
  background: rgba(156, 255, 0, 0.18);
}
.step.active .step-dot {
  border-color: var(--accent);
  background: var(--accent);
}
.step-label {
  font-size: 0.72rem;
  color: var(--muted);
  text-align: center;
  line-height: 1.3;
}
.step.done .step-label { color: var(--text); font-weight: 700; }
.step.active .step-label { color: var(--accent); font-weight: 900; }

.advance-row { margin-top: 14px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.adv-error { font-size: 0.85rem; color: var(--danger); }

.chat { margin-top: 16px; }
.messages { max-height: 320px; overflow: auto; display: grid; gap: 8px; padding: 4px; }
.msg { display: flex; }
.msg.mine { justify-content: flex-end; }
.bubble {
  max-width: 78ch;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  border-radius: 14px;
  padding: 10px 12px;
}
.msg.mine .bubble { border-color: rgba(156, 255, 0, 0.22); background: rgba(156, 255, 0, 0.06); }
.text { color: var(--text); white-space: pre-wrap; }
.time { margin-top: 6px; font-size: 0.72rem; }

.composer { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-top: 12px; }
.composer input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 0.95rem;
}

.btn {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(156, 255, 0, 0.15);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 900;
  text-decoration: none;
  height: 42px;
}
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
</style>

