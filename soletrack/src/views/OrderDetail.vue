<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
  writeBatch,
} from 'firebase/firestore'
import { useAuth } from '@/lib/auth'
import { db, demoMode, firebaseConfigured } from '@/lib/firebase'
import {
  computeItemSellPrice,
  findActiveProposal,
  groupMessages,
  isNearBottom,
  shouldAutoScrollOnAppend,
  shouldSendOnEnter,
  validateComposerInput,
  type ChatMessage,
  type GroupedChatMessage,
} from '@/lib/orderChat'
import type { VendorOrder } from '@/lib/orderTypes'
import {
  addDemoMessage,
  getDemoMessages,
  getDemoOrderById,
  updateDemoOrderPrice,
  updateDemoOrderStatus,
} from '@/lib/demoStore'

const route = useRoute()
const router = useRouter()
const { user, ready } = useAuth()

const id = computed(() => String(route.params.id || ''))
const loading = ref(true)
const loadError = ref('')
const order = ref<VendorOrder | null>(null)

const messages = ref<Array<{ id: string } & ChatMessage>>([])
const msg = ref('')
const sending = ref(false)
const messagesLoading = ref(true)
const messagesError = ref('')
const composerError = ref('')
const composerMaxLen = 500
const streamEl = ref<HTMLElement | null>(null)
const showJumpToLatest = ref(false)
const wasNearBottom = ref(true)
const hadInitialAutoScroll = ref(false)

// ── Price negotiation state ───────────────────────────────────────────────────
const showPriceInput = ref(false)
const priceInput = ref('')
const proposing = ref(false)
const accepting = ref(false)
const declining = ref(false)
const proposeError = ref('')

let stopOrder: (() => void) | null = null
let stopMsgs: (() => void) | null = null

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
function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const isVendorView = computed(() => !!user.value && !!order.value && user.value.uid === order.value.vendorUid)
const backLink = computed(() => (isVendorView.value ? '/vendor-orders' : '/orders'))
const chatRoleLabel = computed(() => (isVendorView.value ? 'Seller view' : 'Buyer view'))
const chatPeerLabel = computed(() => (isVendorView.value ? 'Buyer' : 'Seller'))
const chatOnlineLabel = computed(() => (firebaseConfigured && !demoMode ? 'Live' : 'Demo'))
const groupedMessages = computed<GroupedChatMessage[]>(() => groupMessages(messages.value as any, user.value?.uid ?? null))
const canSend = computed(() => validateComposerInput(msg.value, composerMaxLen).ok && !sending.value)
const composerHint = computed(() => `${msg.value.trim().length}/${composerMaxLen}`)
const hasMessages = computed(() => groupedMessages.value.length > 0)

// Price negotiation can only happen while order is placed or accepted (not after ready/picked_up)
const canNegotiate = computed(() => {
  const s = order.value?.status
  return s === 'placed' || s === 'accepted'
})

const activeProposal = computed(() => findActiveProposal(messages.value))

const effectivePrice = computed(() =>
  order.value ? (order.value.agreedPrice ?? Number(order.value.subtotal) ?? 0) : 0,
)
const priceWasNegotiated = computed(() => order.value?.agreedPrice != null)

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

async function markPickedUpAndLogSales(orderId: string, currentOrder: VendorOrder, vendorUid: string) {
  const firestore = db
  if (!firestore) return
  const batch = writeBatch(firestore)
  const soldDate = new Date().toISOString().slice(0, 10)

  const originalSubtotal = currentOrder.items.reduce(
    (a, item) => a + (Number(item.priceSnapshot) || 0) * Math.max(1, Number(item.qty) || 1),
    0,
  )
  const orderTotal = Number(currentOrder.agreedPrice ?? currentOrder.subtotal) || originalSubtotal

  currentOrder.items.forEach((item, index) => {
    const qty = Math.max(1, Number(item.qty) || 1)
    const sellPrice = computeItemSellPrice(Number(item.priceSnapshot) || 0, qty, originalSubtotal, orderTotal)

    const saleRef = doc(firestore, 'users', vendorUid, 'sales', `order-${orderId}-${index}`)
    batch.set(saleRef, {
      shoe: item.nameSnapshot || 'Shoe',
      size: '-',
      buyPrice: null,
      sellPrice,
      date: soldDate,
      platform: 'Pickup',
      qty,
      source: 'order',
      orderId,
      checkoutId: currentOrder.checkoutId || '',
      createdAt: serverTimestamp(),
    }, { merge: true })

    if (item.productId) {
      const productRef = doc(firestore, 'products', String(item.productId))
      batch.set(productRef, {
        status: 'sold',
        active: false,
        soldAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }
  })

  const orderRef = doc(firestore, 'vendorOrders', orderId)
  batch.update(orderRef, { status: 'picked_up', pickedUpAt: serverTimestamp() })
  await batch.commit()
}

async function advanceStatus() {
  if (!order.value || !nextStatus.value) return
  advancing.value = true
  advanceError.value = ''
  try {
    if (demoMode) {
      const updated = updateDemoOrderStatus(id.value, nextStatus.value)
      if (updated) order.value = { ...order.value, status: updated.status }
      return
    }
    if (!firebaseConfigured || !db || !user.value) return
    if (nextStatus.value === 'picked_up') {
      if (user.value.uid !== order.value.vendorUid) {
        throw new Error('Only the vendor can mark this order as picked up.')
      }
      await markPickedUpAndLogSales(id.value, order.value, user.value.uid)
      return
    }
    await updateDoc(doc(db, 'vendorOrders', id.value), { status: nextStatus.value })
  } catch {
    advanceError.value = 'Could not update order status. Please try again.'
  } finally {
    advancing.value = false
  }
}

// ── Price negotiation functions ───────────────────────────────────────────────

async function sendProposal() {
  const price = parseFloat(priceInput.value)
  if (!price || price <= 0 || price > 10000) {
    proposeError.value = 'Enter a valid price between $1 and $10,000.'
    return
  }
  if (!user.value) return
  proposing.value = true
  proposeError.value = ''
  const proposedPrice = Math.round(price * 100) / 100
  const text = `Proposed price: ${fmtUSD(proposedPrice)}`
  try {
    if (demoMode) {
      const updated = addDemoMessage(id.value, {
        senderUid: user.value.uid,
        text,
        type: 'price_proposal',
        proposedPrice,
      })
      messages.value = updated.map((m) => ({ ...m })) as any
      showPriceInput.value = false
      priceInput.value = ''
      return
    }
    if (!firebaseConfigured || !db) return
    await addDoc(collection(db, 'vendorOrders', id.value, 'messages'), {
      senderUid: user.value.uid,
      text,
      type: 'price_proposal',
      proposedPrice,
      createdAt: serverTimestamp(),
    })
    showPriceInput.value = false
    priceInput.value = ''
  } catch {
    proposeError.value = 'Could not send proposal. Please retry.'
  } finally {
    proposing.value = false
  }
}

async function acceptProposal(proposal: { id: string } & ChatMessage) {
  if (!proposal.proposedPrice || !user.value || !order.value) return
  accepting.value = true
  proposeError.value = ''
  const price = proposal.proposedPrice
  try {
    if (demoMode) {
      updateDemoOrderPrice(id.value, price)
      order.value = { ...order.value, agreedPrice: price }
      const updated = addDemoMessage(id.value, {
        senderUid: user.value.uid,
        text: `Price locked at ${fmtUSD(price)}`,
        type: 'price_locked',
        proposedPrice: price,
      })
      messages.value = updated.map((m) => ({ ...m })) as any
      return
    }
    if (!firebaseConfigured || !db) return
    await updateDoc(doc(db, 'vendorOrders', id.value), {
      agreedPrice: price,
      updatedAt: serverTimestamp(),
    })
    await addDoc(collection(db, 'vendorOrders', id.value, 'messages'), {
      senderUid: user.value.uid,
      text: `Price locked at ${fmtUSD(price)}`,
      type: 'price_locked',
      proposedPrice: price,
      createdAt: serverTimestamp(),
    })
  } catch {
    proposeError.value = 'Could not accept proposal. Please retry.'
  } finally {
    accepting.value = false
  }
}

async function declineProposal(proposal: { id: string } & ChatMessage) {
  if (!proposal.proposedPrice || !user.value) return
  declining.value = true
  proposeError.value = ''
  const price = proposal.proposedPrice
  try {
    if (demoMode) {
      const updated = addDemoMessage(id.value, {
        senderUid: user.value.uid,
        text: `Declined ${fmtUSD(price)}`,
        type: 'price_declined',
        proposedPrice: price,
      })
      messages.value = updated.map((m) => ({ ...m })) as any
      return
    }
    if (!firebaseConfigured || !db) return
    await addDoc(collection(db, 'vendorOrders', id.value, 'messages'), {
      senderUid: user.value.uid,
      text: `Declined ${fmtUSD(price)}`,
      type: 'price_declined',
      proposedPrice: price,
      createdAt: serverTimestamp(),
    })
  } catch {
    proposeError.value = 'Could not decline proposal. Please retry.'
  } finally {
    declining.value = false
  }
}

// ── Chat / lifecycle ──────────────────────────────────────────────────────────

onMounted(() => {
  ;(async () => {
    await ready
    if (!user.value) {
      router.push('/login')
      return
    }

    if (demoMode) {
      const demoOrder = getDemoOrderById(id.value)
      if (!demoOrder) {
        loadError.value = 'Order not found.'
        loading.value = false
        messagesLoading.value = false
        return
      }
      order.value = demoOrder as any
      messages.value = getDemoMessages(id.value).map((m) => ({ ...m })) as any
      messagesLoading.value = false
      messagesError.value = ''
      loading.value = false
      return
    }

    if (!firebaseConfigured || !db) {
      loadError.value = 'Firebase is not configured yet.'
      loading.value = false
      messagesLoading.value = false
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
        messages.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChatMessage) }))
        messagesLoading.value = false
        messagesError.value = ''
      },
      () => {
        messagesLoading.value = false
        messagesError.value = 'Could not load messages. Check your connection.'
      },
    )
  })()
})

onBeforeUnmount(() => {
  stopOrder?.()
  stopMsgs?.()
})

function updateScrollState() {
  const el = streamEl.value
  if (!el) return
  const near = isNearBottom(el.scrollTop, el.clientHeight, el.scrollHeight)
  wasNearBottom.value = near
  showJumpToLatest.value = !near
}

async function scrollToLatest(force = false) {
  const el = streamEl.value
  if (!el) return
  if (!force && !wasNearBottom.value) return
  await nextTick()
  el.scrollTop = el.scrollHeight
  updateScrollState()
}

watch(
  () => messages.value.length,
  async (nextCount, prevCount) => {
    const should = shouldAutoScrollOnAppend(
      wasNearBottom.value,
      !hadInitialAutoScroll.value,
      prevCount > 0,
      nextCount > prevCount,
    )
    if (should) await scrollToLatest(true)
    hadInitialAutoScroll.value = true
  },
)

async function send() {
  const check = validateComposerInput(msg.value, composerMaxLen)
  if (!check.ok) {
    composerError.value = check.reason
    return
  }
  const text = msg.value.trim()
  if (!user.value) return
  sending.value = true
  composerError.value = ''
  try {
    if (demoMode) {
      const updated = addDemoMessage(id.value, { senderUid: user.value.uid, text })
      messages.value = updated.map((m) => ({ ...m })) as any
      msg.value = ''
      return
    }
    if (!firebaseConfigured || !db) return
    await addDoc(collection(db, 'vendorOrders', id.value, 'messages'), {
      senderUid: user.value.uid,
      text,
      createdAt: serverTimestamp(),
    })
    msg.value = ''
  } catch {
    composerError.value = 'Could not send message. Please retry.'
  } finally {
    sending.value = false
  }
}

function handleComposerKeydown(e: KeyboardEvent) {
  if (shouldSendOnEnter(e.key, e.shiftKey)) {
    e.preventDefault()
    void send()
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
            {{ advancing ? 'Updating...' : STATUS_NEXT_LABEL[order.status] }}
          </button>
        </div>

        <div v-if="order.status === 'picked_up'" class="sold-confirm">
          <span class="sold-icon">✓</span>
          <div>
            <div class="sold-title">Sale logged — {{ fmtUSD(effectivePrice) }}</div>
            <div class="sold-sub muted small">Recorded in your sales history</div>
          </div>
          <router-link class="btn sold-link" to="/account">View Sales</router-link>
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
            <span class="muted">{{ priceWasNegotiated ? 'Agreed Price' : 'Subtotal' }}</span>
            <strong :class="{ 'price-agreed': priceWasNegotiated }">{{ fmtUSD(effectivePrice) }}</strong>
          </div>
          <div v-if="priceWasNegotiated" class="negotiated-note muted small">
            Negotiated · Original: {{ fmtUSD(Number(order.subtotal) || 0) }}
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

      <section class="panel chat" aria-label="Direct messages">
        <div class="chat-head">
          <div>
            <h2 class="panel-title">Direct Messages</h2>
            <p class="chat-sub">{{ chatRoleLabel }} · {{ chatPeerLabel }} conversation for pickup details</p>
          </div>
          <div class="chat-badges">
            <span class="chat-badge">{{ chatOnlineLabel }}</span>
            <span class="chat-badge">Order {{ order.checkoutId }}</span>
          </div>
        </div>

        <div v-if="messagesError" class="notice error">{{ messagesError }}</div>
        <div v-else-if="messagesLoading" class="messages loading" aria-live="polite">
          <div class="skeleton" v-for="i in 3" :key="`sk-${i}`"></div>
        </div>
        <div v-else-if="!hasMessages" class="empty-chat">
          <p class="muted">No messages yet. Start with pickup timing or arrival instructions.</p>
        </div>
        <div v-else ref="streamEl" class="messages" role="log" aria-live="polite" @scroll="updateScrollState">
          <div
            v-for="m in groupedMessages"
            :key="m.id"
            class="msg"
            :class="{ mine: m.mine, 'group-start': m.groupStart, 'group-end': m.groupEnd }"
          >
            <!-- Price proposal bubble -->
            <div v-if="m.type === 'price_proposal'" class="bubble proposal-bubble" :class="{ mine: m.mine }">
              <div class="proposal-label">Price Proposal</div>
              <div class="proposal-price">{{ fmtUSD(m.proposedPrice ?? 0) }}</div>
              <div v-if="!m.mine && activeProposal?.id === m.id" class="proposal-actions">
                <button
                  class="btn accept-btn"
                  :disabled="accepting || declining"
                  @click="acceptProposal(m)"
                >{{ accepting ? '…' : 'Accept' }}</button>
                <button
                  class="btn decline-btn"
                  :disabled="accepting || declining"
                  @click="declineProposal(m)"
                >{{ declining ? '…' : 'Decline' }}</button>
              </div>
              <div v-else-if="m.mine && activeProposal?.id === m.id" class="proposal-pending muted small">
                Awaiting response…
              </div>
              <div v-if="m.showTimestamp" class="time muted">{{ fmtDate(m.createdAt) }}</div>
            </div>

            <!-- Price locked bubble -->
            <div v-else-if="m.type === 'price_locked'" class="bubble locked-bubble">
              <div class="locked-label">Price Agreed</div>
              <div class="locked-price">{{ fmtUSD(m.proposedPrice ?? 0) }}</div>
              <div v-if="m.showTimestamp" class="time muted">{{ fmtDate(m.createdAt) }}</div>
            </div>

            <!-- Price declined bubble -->
            <div v-else-if="m.type === 'price_declined'" class="bubble declined-bubble">
              <div class="muted small">Offer declined: {{ fmtUSD(m.proposedPrice ?? 0) }}</div>
              <div v-if="m.showTimestamp" class="time muted">{{ fmtDate(m.createdAt) }}</div>
            </div>

            <!-- Regular text bubble -->
            <div v-else class="bubble">
              <div class="text">{{ m.text }}</div>
              <div v-if="m.showTimestamp" class="time muted">{{ fmtDate(m.createdAt) }}</div>
            </div>
          </div>
        </div>
        <button v-if="showJumpToLatest" class="jump-latest" type="button" @click="scrollToLatest(true)">Jump to latest</button>

        <form class="composer" @submit.prevent="send">
          <!-- Price proposal controls (above textarea, only during negotiable statuses) -->
          <div v-if="canNegotiate" class="propose-area">
            <div v-if="!showPriceInput" class="propose-trigger">
              <button class="btn propose-btn" type="button" @click="showPriceInput = true">$ Propose Price</button>
            </div>
            <template v-else>
              <div class="propose-input-row">
                <span class="dollar-sign">$</span>
                <label class="sr-only" for="propose-price-input">Proposed price</label>
                <input
                  id="propose-price-input"
                  v-model="priceInput"
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  placeholder="0.00"
                  class="price-input"
                  @keydown.escape="showPriceInput = false; priceInput = ''"
                />
                <button class="btn primary" type="button" :disabled="proposing" @click="sendProposal">
                  {{ proposing ? 'Sending…' : 'Send' }}
                </button>
                <button class="btn" type="button" @click="showPriceInput = false; priceInput = ''">Cancel</button>
              </div>
              <p v-if="proposeError" class="compose-error">{{ proposeError }}</p>
            </template>
          </div>

          <label class="sr-only" for="order-dm-input">Message {{ chatPeerLabel.toLowerCase() }}</label>
          <textarea
            id="order-dm-input"
            v-model="msg"
            rows="2"
            maxlength="500"
            placeholder="Message about pickup details..."
            @keydown="handleComposerKeydown"
          />
          <div class="composer-meta">
            <p class="muted small">{{ composerHint }} · Enter to send, Shift+Enter for new line</p>
            <button class="btn primary" type="submit" :disabled="!canSend">
              {{ sending ? 'Sending...' : 'Send' }}
            </button>
          </div>
          <p v-if="composerError" class="compose-error">{{ composerError }}</p>
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
.notice.muted { border-color: rgba(var(--accent-rgb), 0.12); color: var(--muted); background: rgba(255,255,255,0.02); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }

.panel { border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: 16px; padding: 16px; background: rgba(255,255,255,0.02); }
.panel-title { margin: 0 0 12px; color: var(--text); font-size: 1.05rem; }
.link { color: var(--accent); text-decoration: none; font-weight: 900; }
.link:hover { text-decoration: underline; text-underline-offset: 2px; }

.items { display: grid; gap: 10px; }
.item { display: grid; grid-template-columns: 64px 1fr auto; gap: 12px; align-items: center; padding: 10px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
.thumb { width: 64px; height: 48px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(var(--accent-rgb), 0.10); }
.meta { min-width: 0; }
.name { color: var(--text); font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.line { font-weight: 900; color: var(--text); }
.sum { display: flex; justify-content: space-between; align-items: baseline; margin-top: 12px; }
.price-agreed { color: var(--success); }
.negotiated-note { margin-top: 4px; }

.kv { display: grid; grid-template-columns: 130px 1fr; gap: 10px; }
.k { color: var(--muted); font-size: 0.82rem; }
.v { color: var(--text); font-weight: 700; }

.status-panel { margin-bottom: 16px; }
.status-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.status-chip { font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb), 0.25); color: var(--accent); background: rgba(var(--accent-rgb), 0.06); white-space: nowrap; }
.status-chip.placed { border-color: rgba(100,180,255,0.3); color: #7ecfff; background: rgba(100,180,255,0.07); }
.status-chip.accepted { border-color: rgba(255,180,0,0.3); color: #f5a623; background: rgba(255,180,0,0.07); }
.status-chip.ready { border-color: rgba(var(--accent-rgb),0.3); color: var(--accent); background: rgba(var(--accent-rgb),0.07); }
.status-chip.picked_up { border-color: rgba(80,220,120,0.3); color: var(--success); background: rgba(80,220,120,0.07); }

.timeline { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; padding-bottom: 6px; }
.step-line { position: absolute; top: 11px; left: 12.5%; right: 12.5%; height: 2px; background: rgba(255,255,255,0.08); z-index: 0; }
.step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.step-dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.15); background: var(--card); transition: background 0.2s, border-color 0.2s; }
.step.done .step-dot { border-color: var(--accent); background: rgba(var(--accent-rgb), 0.18); }
.step.active .step-dot { border-color: var(--accent); background: var(--accent); }
.step-label { font-size: 0.72rem; color: var(--muted); text-align: center; line-height: 1.3; }
.step.done .step-label { color: var(--text); font-weight: 700; }
.step.active .step-label { color: var(--accent); font-weight: 900; }

.advance-row { margin-top: 14px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.adv-error { font-size: 0.85rem; color: var(--danger); }

.sold-confirm { margin-top: 14px; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(80,220,120,0.35); background: rgba(80,220,120,0.06); }
.sold-icon { font-size: 1.2rem; color: var(--success); font-weight: 900; flex-shrink: 0; }
.sold-title { font-weight: 900; color: var(--success); }
.sold-sub { margin-top: 2px; }
.sold-link { margin-left: auto; font-size: 0.85rem; padding: 6px 12px; min-height: unset; border-color: rgba(80,220,120,0.4); color: var(--success); }

.chat { margin-top: 16px; }
.chat-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.chat-sub { margin: 4px 0 0; color: var(--muted); font-size: 0.8rem; }
.chat-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.chat-badge { font-size: 0.72rem; color: var(--text); border: 1px solid rgba(var(--accent-rgb), 0.2); background: rgba(var(--accent-rgb), 0.08); border-radius: 999px; padding: 3px 9px; }

.messages { max-height: 340px; overflow: auto; display: grid; gap: 6px; padding: 6px; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; }
.messages.loading { gap: 10px; }
.skeleton { height: 42px; border-radius: 10px; background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04)); background-size: 200% 100%; animation: pulse 1.2s infinite; }
.msg { display: flex; }
.msg.mine { justify-content: flex-end; }
.bubble { max-width: min(74ch, 88%); border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); border-radius: 14px; padding: 10px 12px; }
.msg.mine .bubble { border-color: rgba(var(--accent-rgb), 0.22); background: rgba(var(--accent-rgb), 0.06); }
.text { color: var(--text); white-space: pre-wrap; }
.time { margin-top: 6px; font-size: 0.72rem; }
.empty-chat { border: 1px dashed rgba(255,255,255,0.14); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.jump-latest { margin-top: 8px; align-self: flex-end; font-size: 0.78rem; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); color: var(--muted); background: var(--surface-1); cursor: pointer; transition: color 0.15s, background 0.15s; }
.jump-latest:hover { color: var(--text); background: var(--surface-2); }

/* Proposal bubbles */
.proposal-bubble { border-color: rgba(245,166,35,0.35); background: rgba(245,166,35,0.06); max-width: min(56ch, 88%); }
.proposal-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #f5a623; margin-bottom: 4px; }
.proposal-price { font-size: 1.3rem; font-weight: 900; color: var(--text); margin-bottom: 8px; }
.proposal-actions { display: flex; gap: 8px; margin-bottom: 4px; }
.proposal-pending { margin-top: 2px; }
.accept-btn { background: rgba(80,220,120,0.15); border-color: rgba(80,220,120,0.4); color: var(--success); font-size: 0.85rem; padding: 6px 14px; min-height: unset; }
.accept-btn:hover:not(:disabled) { background: rgba(80,220,120,0.25); }
.decline-btn { background: rgba(255,50,50,0.08); border-color: rgba(255,50,50,0.3); color: var(--danger); font-size: 0.85rem; padding: 6px 14px; min-height: unset; }
.decline-btn:hover:not(:disabled) { background: rgba(255,50,50,0.15); }

/* Locked bubble */
.locked-bubble { border-color: rgba(80,220,120,0.4); background: rgba(80,220,120,0.06); max-width: min(56ch, 88%); }
.locked-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--success); margin-bottom: 4px; }
.locked-price { font-size: 1.3rem; font-weight: 900; color: var(--success); }

/* Declined bubble */
.declined-bubble { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.01); opacity: 0.65; max-width: min(56ch, 88%); }

/* Composer */
.composer { display: grid; gap: 8px; margin-top: 12px; position: sticky; bottom: 0; background: linear-gradient(180deg, rgba(22,27,23,0.0), rgba(22,27,23,0.92) 28%); padding-top: 8px; }
.composer textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-size: 0.95rem; min-height: 44px; max-height: 140px; resize: vertical; }
.composer textarea:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.42); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12); }
.composer-meta { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.compose-error { margin: 0; color: var(--danger); font-size: 0.82rem; }

/* Price propose area */
.propose-area { border: 1px dashed rgba(245,166,35,0.25); border-radius: 10px; padding: 8px 10px; background: rgba(245,166,35,0.03); }
.propose-trigger { display: flex; align-items: center; }
.propose-btn { font-size: 0.85rem; padding: 6px 12px; border-color: rgba(245,166,35,0.35); color: #f5a623; min-height: unset; }
.propose-btn:hover { background: rgba(245,166,35,0.08); }
.propose-input-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dollar-sign { color: var(--muted); font-weight: 700; }
.price-input { width: 110px; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-size: 0.95rem; }
.price-input:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.42); }
/* Remove number input spinners */
.price-input::-webkit-inner-spin-button,
.price-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }

.btn { padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.15); background: transparent; color: var(--text); cursor: pointer; font-weight: 900; text-decoration: none; min-height: 42px; }
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

@media (max-width: 700px) {
  .messages { max-height: 44vh; }
  .bubble { max-width: 92%; }
  .propose-input-row { flex-direction: column; align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
