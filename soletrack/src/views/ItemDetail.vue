<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/lib/firebase'
import { useCart } from '@/lib/cart'
import { demoProducts } from '@/lib/demoMarketplace'
import { getOrSeedDemoProducts } from '@/lib/demoStore'

const route = useRoute()
const { add: addToCart } = useCart()

const product = ref<any>(null)
const loading = ref(true)
const error = ref('')
const cartToast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

const conditionColor: Record<string, string> = {
  DS: 'var(--accent)',
  New: 'var(--success)',
  Used: 'var(--muted)',
}

const margin = computed(() => {
  if (!product.value?.retailPrice || product.value.retailPrice <= 0) return null
  return Math.round(((product.value.price - product.value.retailPrice) / product.value.retailPrice) * 100)
})

onMounted(async () => {
  const id = route.params.id as string

  // Check demo products first (demo store + fixed demos)
  const allDemo = [...getOrSeedDemoProducts(), ...demoProducts]
  const demoHit = allDemo.find((p) => p.id === id)
  if (demoHit) {
    product.value = demoHit
    loading.value = false
    return
  }

  if (!firebaseConfigured || !db) {
    error.value = 'Product not found.'
    loading.value = false
    return
  }

  try {
    const snap = await getDoc(doc(db, 'products', id))
    if (snap.exists()) {
      product.value = { id: snap.id, ...snap.data() }
    } else {
      error.value = 'Product not found.'
    }
  } catch {
    error.value = 'Could not load product. Try again later.'
  } finally {
    loading.value = false
  }
})

function handleAddToCart() {
  if (!product.value) return
  addToCart({
    id: product.value.id,
    name: product.value.name,
    price: product.value.price,
    image: product.value.image,
    vendorUid: product.value.vendorUid,
    vendorName: product.value.vendorName,
  })
  cartToast.value = `"${product.value.name}" added to cart`
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { cartToast.value = '' }, 2500)
}
</script>

<template>
  <div class="item-page">

    <Transition name="toast">
      <div v-if="cartToast" class="cart-toast">{{ cartToast }}</div>
    </Transition>

    <div v-if="loading" class="state-msg">Loading product…</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>

    <template v-else-if="product">
      <!-- Back -->
      <router-link to="/browse" class="back-link">← Back to Browse</router-link>

      <div class="detail-grid">

        <!-- Left: Image -->
        <div class="img-col">
          <div class="img-wrap">
            <img
              :src="product.image || '/images/shoes/pexels-jonathanborba-12031204.jpg'"
              :alt="product.name"
              class="product-img"
            />
            <span
              v-if="product.condition"
              class="condition-badge"
              :style="{ color: conditionColor[product.condition] ?? 'var(--muted)', borderColor: conditionColor[product.condition] ?? 'var(--muted)' }"
            >
              {{ product.condition }}
            </span>
            <span v-if="margin !== null" class="margin-badge" :class="margin > 0 ? 'pos' : 'neg'">
              {{ margin > 0 ? '+' : '' }}{{ margin }}% vs retail
            </span>
          </div>
        </div>

        <!-- Right: Info -->
        <div class="info-col">
          <p class="brand-label">{{ product.brand }}</p>
          <h1 class="product-name">{{ product.name }}</h1>
          <p v-if="product.colorway" class="colorway">{{ product.colorway }}</p>

          <!-- Status badge -->
          <span class="status-badge" :class="product.status">{{ product.status }}</span>

          <!-- Meta pills -->
          <div class="meta-row">
            <span v-if="product.size" class="meta-pill">Size US {{ product.size }}</span>
            <span v-if="product.sku" class="meta-pill">SKU: {{ product.sku }}</span>
            <span v-if="product.platform" class="meta-pill">{{ product.platform }}</span>
            <span v-if="product.category" class="meta-pill">{{ product.category }}</span>
            <span v-if="product.soldCount" class="meta-pill">{{ product.soldCount }} sold</span>
          </div>

          <!-- Price block -->
          <div class="price-block">
            <div>
              <p class="price-label">Ask Price</p>
              <p class="price">${{ product.price }}</p>
            </div>
            <div v-if="product.retailPrice">
              <p class="price-label">Retail</p>
              <p class="retail">${{ product.retailPrice }}</p>
            </div>
          </div>

          <!-- Description -->
          <div v-if="product.description" class="description">
            <p class="section-label">Description</p>
            <p>{{ product.description }}</p>
          </div>

          <!-- Seller -->
          <div v-if="product.vendorName" class="seller-block">
            <p class="section-label">Seller</p>
            <p class="seller-name">
              <router-link
                v-if="product.vendorUid"
                :to="`/vendor/${product.vendorUid}`"
                class="seller-link"
              >{{ product.vendorName }}</router-link>
              <span v-else>{{ product.vendorName }}</span>
            </p>
          </div>

          <!-- Actions -->
          <div class="actions">
            <button
              class="btn primary"
              :disabled="product.status === 'sold'"
              @click="handleAddToCart"
            >
              {{ product.status === 'sold' ? 'Sold Out' : 'Add to Cart' }}
            </button>
            <router-link
              v-if="product.vendorUid"
              :to="`/vendor/${product.vendorUid}`"
              class="btn"
            >
              View Vendor
            </router-link>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
.item-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 16px 80px;
}

.back-link {
  display: inline-block;
  color: var(--muted);
  text-decoration: none;
  font-size: 0.88rem;
  margin-bottom: 24px;
  transition: color 0.2s;
}
.back-link:hover { color: var(--accent); }

.state-msg {
  text-align: center;
  padding: 80px 24px;
  color: var(--muted);
  font-size: 1rem;
}
.state-msg.error { color: var(--danger); }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
}

/* Image */
.img-col {}
.img-wrap {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  aspect-ratio: 4/3;
  border: 1px solid rgba(156, 255, 0, 0.15);
}
.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.condition-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid;
  background: rgba(6, 15, 7, 0.75);
  letter-spacing: 0.05em;
}
.margin-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 7px;
  background: rgba(6, 15, 7, 0.8);
  border: 1px solid;
}
.margin-badge.pos { color: var(--success); border-color: var(--success); }
.margin-badge.neg { color: var(--danger); border-color: var(--danger); }

/* Info */
.brand-label {
  margin: 0 0 4px;
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.product-name {
  margin: 0 0 4px;
  font-size: clamp(1.3rem, 3vw, 1.9rem);
  font-weight: 900;
  color: var(--text);
  line-height: 1.2;
}
.colorway {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--muted);
}

.status-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 3px 10px;
  border-radius: 6px;
  margin-bottom: 16px;
}
.status-badge.approved  { background: rgba(156,255,0,0.12); color: var(--accent); border: 1px solid rgba(156,255,0,0.3); }
.status-badge.pending   { background: rgba(255,200,0,0.1);  color: #f5c542;       border: 1px solid rgba(255,200,0,0.3); }
.status-badge.sold      { background: rgba(255,80,80,0.1);  color: var(--danger); border: 1px solid rgba(255,80,80,0.3); }
.status-badge.rejected  { background: rgba(255,80,80,0.1);  color: var(--danger); border: 1px solid rgba(255,80,80,0.3); }

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}
.meta-pill {
  font-size: 0.75rem;
  color: var(--muted);
  background: rgba(156, 255, 0, 0.05);
  border: 1px solid rgba(156, 255, 0, 0.12);
  padding: 4px 10px;
  border-radius: 7px;
}

.price-block {
  display: flex;
  gap: 32px;
  align-items: baseline;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(156, 255, 0, 0.04);
  border: 1px solid rgba(156, 255, 0, 0.12);
  border-radius: 12px;
}
.price-label {
  margin: 0 0 3px;
  font-size: 0.68rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.price {
  margin: 0;
  font-size: 2rem;
  font-weight: 900;
  color: var(--accent);
}
.retail {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--muted);
  text-decoration: line-through;
}

.section-label {
  margin: 0 0 6px;
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.description {
  margin-bottom: 20px;
  padding: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(156,255,0,0.08);
  border-radius: 10px;
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.6;
}
.description p { margin: 0; }

.seller-block {
  margin-bottom: 24px;
}
.seller-name {
  margin: 0;
  font-size: 0.92rem;
  color: var(--muted);
}
.seller-link {
  color: var(--accent);
  font-weight: 800;
  text-decoration: none;
}
.seller-link:hover { text-decoration: underline; text-underline-offset: 2px; }

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;
}
.btn.primary {
  background: var(--accent);
  border-color: transparent;
  color: #0b1205;
}
.btn.primary:hover { background: #a8e600; }
.btn.primary:disabled {
  background: var(--muted);
  cursor: not-allowed;
  opacity: 0.6;
}
.btn:not(.primary):hover { border-color: rgba(156,255,0,0.4); }

/* Toast */
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

@media (max-width: 700px) {
  .detail-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .item-page { padding: 20px 12px 60px; }
  .price { font-size: 1.6rem; }
}
</style>
