<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db, demoMode, firebaseConfigured } from '@/lib/firebase'
import { useCart } from '@/lib/cart'
import { demoProductsForVendor, demoVendorByUid } from '@/lib/demoMarketplace'
import { getOrSeedDemoProducts, getOrSeedDemoUser, getOrSeedDemoVendor } from '@/lib/demoStore'

type VendorProfile = {
  name: string
  location?: string
  description?: string
  contactEmail?: string
  minOrder?: number
}

type ProductDoc = {
  vendorUid: string
  vendorName: string
  name: string
  brand?: string
  size?: string
  price: number
  condition?: string
  image?: string
  description?: string
  active?: boolean
}

const route = useRoute()
const router = useRouter()
const vendorUid = computed(() => String(route.params.uid || ''))

const vendor = ref<VendorProfile | null>(null)
const products = ref<Array<{ id: string } & ProductDoc>>([])
const loading = ref(true)
const loadError = ref('')

const { add: addToCart } = useCart()

let stopVendorListener: (() => void) | null = null
let stopProductsListener: (() => void) | null = null

const copiedEmail = ref<string | null>(null)
const FALLBACK_IMAGE = '/images/shoes/pexels-jonathanborba-12031204.jpg'

function productImage(p: ProductDoc) {
  const gallery = Array.isArray((p as any).images)
    ? (p as any).images.map((src: unknown) => String(src)).filter(Boolean)
    : []
  return gallery[0] || p.image || FALLBACK_IMAGE
}

async function copyEmail(email: string) {
  copiedEmail.value = null
  try {
    await navigator.clipboard.writeText(email)
    copiedEmail.value = email
    window.setTimeout(() => {
      if (copiedEmail.value === email) copiedEmail.value = null
    }, 1400)
  } catch {
    // ignore
  }
}

onMounted(() => {
  const uid = vendorUid.value
  const demoVendor = uid.startsWith('__demo__') ? demoVendorByUid(uid) : null
  const demoUserUid = demoMode ? getOrSeedDemoUser().uid : ''

  if (demoVendor) {
    vendor.value = demoVendor
    products.value = demoProductsForVendor(uid).map((p) => ({ id: p.id, ...(p as any) }))
    loading.value = false
    return
  }

  if (demoMode && uid === demoUserUid) {
    const v = getOrSeedDemoVendor()
    vendor.value = v
    products.value = getOrSeedDemoProducts()
      .filter((p) => p.vendorUid === demoUserUid)
      .map((p) => ({ id: p.id, ...(p as any) }))
      .filter((p) => {
        const status = String((p as any).status ?? 'active')
        return (p as any).active !== false && status !== 'sold' && status !== 'rejected'
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    loading.value = false
    return
  }

  if (!firebaseConfigured || !db) {
    loadError.value = 'Firebase is not configured yet.'
    loading.value = false
    return
  }

  stopVendorListener = onSnapshot(
    doc(db, 'vendors', vendorUid.value),
    (snap) => {
      vendor.value = snap.exists() ? (snap.data() as VendorProfile) : null
      loading.value = false
    },
    () => {
      loadError.value = 'Could not load vendor.'
      loading.value = false
    },
  )

  const q = query(collection(db, 'products'), where('vendorUid', '==', vendorUid.value))
  stopProductsListener = onSnapshot(
    q,
    (snap) => {
      products.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as ProductDoc) }))
        .filter((p) => {
          const status = String((p as any).status ?? 'active')
          return p.active !== false && status !== 'sold' && status !== 'rejected'
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    () => {
      loadError.value = 'Could not load products.'
    },
  )
})

onBeforeUnmount(() => {
  stopVendorListener?.()
  stopProductsListener?.()
})

const cartToast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function addItem(p: { id: string } & ProductDoc) {
  addToCart({
    id: p.id,
    name: p.name,
    price: p.price,
    image: productImage(p),
    vendorUid: p.vendorUid,
    vendorName: p.vendorName,
    maxQty: 1,
  })
  cartToast.value = `"${p.name}" added to cart`
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { cartToast.value = '' }, 2500)
}

function buyNow(p: { id: string } & ProductDoc) {
  addItem(p)
  router.push('/cart')
}
</script>

<template>
  <div class="shop-page">
    <Transition name="toast">
      <div v-if="cartToast" class="cart-toast">{{ cartToast }}</div>
    </Transition>

    <div v-if="loadError" class="notice error">{{ loadError }}</div>

    <div v-else-if="loading" class="notice muted">Loading vendor...</div>

    <template v-else>
      <header class="hero" v-if="vendor">
        <div class="hero__grid"></div>
        <div class="hero__content">
          <div class="kicker">Vendor shop</div>
          <h1 class="title">{{ vendor.name }}</h1>
          <p v-if="vendor.location" class="sub">Location: {{ vendor.location }}</p>
          <p v-if="vendor.description" class="desc">{{ vendor.description }}</p>
          <div class="actions">
            <router-link class="btn primary" to="/cart">View cart</router-link>
            <button
              v-if="vendor.contactEmail"
              class="btn"
              type="button"
              @click="copyEmail(vendor.contactEmail)"
              :title="vendor.contactEmail"
            >
              {{ copiedEmail === vendor.contactEmail ? 'Copied' : 'Copy email' }}
            </button>
          </div>
        </div>
      </header>

      <div v-else class="notice muted">
        This vendor profile does not exist yet.
      </div>

      <section class="body">
        <h2 class="h2">Listings</h2>

        <div v-if="!products.length" class="empty muted">No active listings yet.</div>

        <div v-else class="grid">
          <div class="card" v-for="p in products" :key="p.id">
            <img class="img" :src="productImage(p)" :alt="p.name" />
            <div class="info">
              <div class="top">
                <div class="name">{{ p.name }}</div>
                <div class="price">${{ p.price }}</div>
              </div>
              <div class="meta muted">
                <span>{{ p.brand || '—' }}</span>
                <span>·</span>
                <span>{{ p.size || '—' }}</span>
                <span v-if="p.condition">· {{ p.condition }}</span>
              </div>
              <p v-if="p.description" class="desc2 muted">{{ p.description }}</p>
              <div class="card-actions">
                <button class="btn primary sm" @click="addItem(p)">Add to cart</button>
                <button class="btn sm" @click="buyNow(p)">Buy now</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.shop-page { background: var(--bg); }
.notice { max-width: 1100px; margin: 14px auto; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(156, 255, 0, 0.12); }
.notice.error { border-color: rgba(255,50,50,0.35); color: var(--danger); background: rgba(255,50,50,0.06); }
.notice.muted { color: var(--muted); background: rgba(255,255,255,0.02); }

.hero {
  position: relative;
  min-height: 34vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 70px 24px 48px;
  text-align: center;
}
.hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(100, 200, 100, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(100, 200, 100, 0.06) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%);
}
.hero__content { position: relative; z-index: 1; max-width: 900px; }
.kicker { color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.72rem; }
.title { margin: 6px 0 8px; color: var(--text); font-size: clamp(2rem, 6vw, 3.4rem); letter-spacing: -0.02em; }
.sub { margin: 0; color: var(--muted); }
.desc { margin: 12px auto 0; max-width: 70ch; color: var(--muted); line-height: 1.6; }
.actions { margin-top: 18px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

.body { max-width: 1100px; margin: 0 auto; padding: 38px 16px 80px; }
.h2 { margin: 0 0 14px; color: var(--text); font-size: 1.2rem; }
.empty { padding: 28px 0; }
.muted { color: var(--muted); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); gap: 16px; }
.card { border: 1px solid rgba(156, 255, 0, 0.12); border-radius: 16px; overflow: hidden; background: rgba(255,255,255,0.02); }
.img { width: 100%; height: 190px; object-fit: cover; display: block; }
.info { padding: 14px; }
.top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.name { color: var(--text); font-weight: 900; }
.price { color: var(--accent); font-weight: 900; }
.meta { margin-top: 6px; font-size: 0.85rem; display: flex; gap: 6px; flex-wrap: wrap; }
.desc2 { margin: 10px 0 0; font-size: 0.85rem; line-height: 1.6; }
.card-actions { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(156, 255, 0, 0.15);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 900;
  text-decoration: none;
}
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn.sm { padding: 8px 12px; font-size: 0.85rem; }

.cart-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: #0b1205;
  font-weight: 700;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 0.9rem;
  z-index: 200;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  white-space: nowrap;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }

@media (max-width: 600px) {
  .hero { padding: 52px 16px 32px; min-height: auto; }
  .body { padding: 24px 12px 60px; }
  .card-actions { flex-direction: column; }
  .card-actions .btn { width: 100%; }
}
</style>
