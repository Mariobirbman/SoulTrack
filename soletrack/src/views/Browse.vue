<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/lib/firebase'
import { useCart } from '@/lib/cart'
import { demoProducts } from '@/lib/demoMarketplace'
import type { DemoProduct } from '@/lib/demoMarketplace'
import { getOrSeedDemoProducts } from '@/lib/demoStore'

type Product = DemoProduct

const products = ref<Product[]>(demoProducts)

const loading = ref(false)
const loadError = ref('')

let stopProductsListener: (() => void) | null = null
onMounted(() => {
  loading.value = true
  if (!firebaseConfigured || !db) {
    // Show fixed demo marketplace + any user-approved demo-store listings
    const approvedFromStore = getOrSeedDemoProducts().filter((p) => (p as any).status === 'approved')
    const demoIds = new Set(demoProducts.map((d) => d.id))
    const storeOnly = approvedFromStore.filter((p) => !demoIds.has(p.id))
    products.value = [...(storeOnly as any), ...demoProducts]
    loadError.value = ''
    loading.value = false
    return
  }
  // Only show admin-approved listings in the public feed
  const q = query(collection(db, 'products'), where('status', '==', 'approved'))
  stopProductsListener = onSnapshot(
    q,
    (snap) => {
      const approved = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
        .filter((p) => typeof (p as any).vendorUid === 'string' && (p as any).vendorUid.length > 0)
      // Always show fixed demos; prepend any real approved listings on top
      const demoIds = new Set(demoProducts.map((d) => d.id))
      const realOnly = approved.filter((p) => !demoIds.has(p.id))
      products.value = [...realOnly, ...demoProducts]
      loadError.value = ''
      loading.value = false
    },
    () => {
      loadError.value = 'Could not load products from the database (showing demo data).'
      loading.value = false
    },
  )
})
onBeforeUnmount(() => stopProductsListener?.())

const route = useRoute()
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const vendorFilterUid = ref(typeof route.query.vendor === 'string' ? route.query.vendor : '')

watch(
  () => route.query.q,
  (q) => {
    searchQuery.value = typeof q === 'string' ? q : ''
  },
)
watch(
  () => route.query.vendor,
  (v) => {
    vendorFilterUid.value = typeof v === 'string' ? v : ''
  },
)
const selectedBrand = ref('All')
const selectedCondition = ref('All')
const selectedPlatform = ref('All')
const sortBy = ref('price-asc')
const expandedId = ref<string | null>(null)

const brands = computed(() => ['All', ...Array.from(new Set(products.value.map((p) => p.brand).filter(Boolean))).sort()])
const conditions = ['All', 'DS', 'New', 'Used']
const platformOptions = computed(() => ['All', ...Array.from(new Set(products.value.map((p) => p.platform).filter(Boolean))).sort()])

const filtered = computed(() => {
  let list = products.value.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                        p.brand.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                        String(p.colorway ?? '').toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchBrand = selectedBrand.value === 'All' || p.brand === selectedBrand.value
    const matchCond = selectedCondition.value === 'All' || p.condition === selectedCondition.value
    const matchPlat = selectedPlatform.value === 'All' || p.platform === selectedPlatform.value
    const matchVendor = !vendorFilterUid.value || p.vendorUid === vendorFilterUid.value
    return matchSearch && matchBrand && matchCond && matchPlat && matchVendor
  })

  if (sortBy.value === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
  if (sortBy.value === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
  if (sortBy.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  if (sortBy.value === 'profit')
    list = [...list].sort((a, b) => (b.price - (b.retailPrice ?? 0)) - (a.price - (a.retailPrice ?? 0)))

  return list
})

const watchlist = ref<string[]>([])

function toggleWatchlist(id: string) {
  if (watchlist.value.includes(id)) {
    watchlist.value = watchlist.value.filter(w => w !== id)
  } else {
    watchlist.value.push(id)
  }
}

function isWatched(id: string) {
  return watchlist.value.includes(id)
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

const conditionColor: Record<string, string> = {
  DS: 'var(--accent)',
  New: 'var(--success)',
  Used: 'var(--muted)',
}

function profitMargin(p: { price: number; retailPrice?: number }) {
  if (!p.retailPrice || p.retailPrice <= 0) return 0
  return Math.round(((p.price - p.retailPrice) / p.retailPrice) * 100)
}

const { add: addToCart } = useCart()
const cartToast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function addProductToCart(p: Product) {
  addToCart({
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.image,
    vendorUid: p.vendorUid,
    vendorName: p.vendorName,
  })
  cartToast.value = `"${p.name}" added to cart`
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { cartToast.value = '' }, 2500)
}
</script>

<template>
  <div class="browse-page">
    <Transition name="toast">
      <div v-if="cartToast" class="cart-toast">{{ cartToast }}</div>
    </Transition>

    <div class="browse-header">
      <h1 class="browse-title">Browse Products</h1>
      <p class="browse-sub">Find your next flip or add to your collection.</p>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        id="browse-search"
        name="browseSearch"
        v-model="searchQuery"
        class="search-input"
        type="text"
        placeholder="Search shoes, brands, colorways..."
      />
      <select id="browse-brand" name="browseBrand" v-model="selectedBrand" class="filter-select">
        <option v-for="b in brands" :key="b">{{ b }}</option>
      </select>
      <select id="browse-condition" name="browseCondition" v-model="selectedCondition" class="filter-select">
        <option v-for="c in conditions" :key="c">{{ c }}</option>
      </select>
      <select id="browse-platform" name="browsePlatform" v-model="selectedPlatform" class="filter-select">
        <option v-for="pl in platformOptions" :key="pl">{{ pl }}</option>
      </select>
      <select id="browse-sort" name="browseSort" v-model="sortBy" class="filter-select">
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="name">Name A-Z</option>
        <option value="profit">Best Flip Margin</option>
      </select>
    </div>

    <p class="results-count" v-if="loadError">{{ loadError }}</p>
    <p class="results-count" v-else-if="loading">Loading products...</p>
    <p class="results-count" v-else>{{ filtered.length }} product{{ filtered.length !== 1 ? 's' : '' }} found</p>

    <!-- Grid -->
    <div class="product-grid" v-if="filtered.length">
      <div class="product-card" v-for="p in filtered" :key="p.id">
        <div class="product-img-wrap">
          <img :src="p.image || '/images/shoes/pexels-jonathanborba-12031204.jpg'" :alt="p.name" class="product-img" />
          <button
            class="watchlist-btn"
            :class="{ watched: isWatched(p.id) }"
            @click="toggleWatchlist(p.id)"
            :title="isWatched(p.id) ? 'Remove from watchlist' : 'Add to watchlist'"
          >
            {{ isWatched(p.id) ? '★' : '☆' }}
          </button>
          <span
            class="condition-badge"
            :style="{ color: conditionColor[p.condition || 'New'], borderColor: conditionColor[p.condition || 'New'] }"
          >
            {{ p.condition || 'New' }}
          </span>
          <span v-if="p.retailPrice" class="margin-badge" :class="profitMargin(p) > 0 ? 'pos' : 'neg'">
            {{ profitMargin(p) > 0 ? '+' : '' }}{{ profitMargin(p) }}% vs retail
          </span>
        </div>

        <div class="product-info">
          <div class="product-top">
            <p class="product-brand">{{ p.brand }}</p>
            <span class="product-platform-tag">{{ p.platform || 'Pickup' }}</span>
          </div>
          <h3 class="product-name">{{ p.name }}</h3>
          <p v-if="p.colorway" class="product-colorway">{{ p.colorway }}</p>

          <div class="product-meta">
            <span v-if="p.size" class="meta-item">Size US {{ p.size }}</span>
            <span v-if="p.sku" class="meta-item">SKU: {{ p.sku }}</span>
            <span v-if="p.soldCount" class="meta-item">{{ p.soldCount }} sold</span>
          </div>

          <div class="price-row">
            <div>
              <p class="price-label">Ask Price</p>
              <p class="product-price">${{ p.price }}</p>
            </div>
            <div v-if="p.retailPrice">
              <p class="price-label">Retail</p>
              <p class="retail-price">${{ p.retailPrice }}</p>
            </div>
          </div>

          <div v-if="p.vendorName" class="seller-row">
            <span class="seller-name">
              Sold by
              <router-link
                v-if="p.vendorUid"
                class="seller-link"
                :to="`/vendor/${p.vendorUid}`"
              >
                {{ p.vendorName }}
              </router-link>
              <span v-else>{{ p.vendorName }}</span>
            </span>
          </div>

          <button class="expand-btn" @click="toggleExpand(p.id)">
            {{ expandedId === p.id ? 'Hide details' : 'View details' }}
          </button>
          <Transition name="slide">
            <div class="product-desc" v-if="expandedId === p.id">
              <p>{{ p.description }}</p>
            </div>
          </Transition>

          <div class="product-footer">
            <button class="btn primary btn-sm" @click="addProductToCart(p)">Add to cart</button>
            <router-link
              v-if="p.vendorUid"
              :to="`/vendor/${p.vendorUid}`"
              class="btn btn-sm"
            >
              View vendor
            </router-link>
            <router-link v-else to="/vendors" class="btn btn-sm">Vendors</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div class="empty-state" v-else>
      <p class="empty-icon">🔍</p>
      <p>No products match your filters.</p>
      <button class="btn" @click="searchQuery = ''; selectedBrand = 'All'; selectedCondition = 'All'; selectedPlatform = 'All'">Clear filters</button>
    </div>

    <!-- Watchlist bar -->
    <div class="watchlist-bar" v-if="watchlist.length">
      <span>★ {{ watchlist.length }} item{{ watchlist.length !== 1 ? 's' : '' }} in watchlist</span>
      <button class="btn-clear" @click="watchlist = []">Clear</button>
    </div>

  </div>
</template>

<style scoped>
.browse-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 16px 80px;
}

.browse-header { margin-bottom: 28px; }
.browse-title { margin: 0; font-size: clamp(1.4rem, 3vw, 2rem); color: var(--text); }
.browse-sub { margin: 6px 0 0; color: var(--muted); }

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 0.95rem;
}

.search-input::placeholder { color: var(--muted); }

.filter-select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 0.9rem;
  cursor: pointer;
}

.results-count { color: var(--muted); font-size: 0.85rem; margin: 0 0 20px; }

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 20px;
}

.product-card {
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.04) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(156, 255, 0, 0.1);
}

.product-img-wrap {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.product-card:hover .product-img { transform: scale(1.04); }

.watchlist-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(6, 15, 7, 0.7);
  border: 1px solid rgba(156, 255, 0, 0.3);
  color: var(--muted);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.1rem;
  transition: color 0.2s, background 0.2s;
}

.watchlist-btn.watched { color: var(--accent); background: rgba(156, 255, 0, 0.15); }

.condition-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid;
  background: rgba(6, 15, 7, 0.75);
  letter-spacing: 0.05em;
}

.margin-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(6, 15, 7, 0.8);
  border: 1px solid;
}
.margin-badge.pos { color: var(--success); border-color: var(--success); }
.margin-badge.neg { color: var(--danger); border-color: var(--danger); }

.product-info { padding: 16px; }

.product-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.product-brand { margin: 0; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

.product-platform-tag {
  font-size: 0.7rem;
  color: var(--accent);
  border: 1px solid rgba(156, 255, 0, 0.3);
  border-radius: 6px;
  padding: 2px 7px;
  font-weight: 600;
}

.product-name { margin: 0 0 2px; font-size: 0.95rem; font-weight: 700; color: var(--text); line-height: 1.3; }
.product-colorway { margin: 0 0 10px; font-size: 0.8rem; color: var(--muted); }

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 0.72rem;
  color: var(--muted);
  background: rgba(156, 255, 0, 0.05);
  border: 1px solid rgba(156, 255, 0, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
}

.price-row {
  display: flex;
  gap: 24px;
  margin-bottom: 10px;
}

.price-label { margin: 0 0 2px; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.product-price { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--accent); }
.retail-price { margin: 0; font-size: 1rem; font-weight: 600; color: var(--muted); text-decoration: line-through; }

.seller-row { margin-bottom: 10px; }
.seller-name { font-size: 0.78rem; color: var(--muted); }
.seller-link { color: var(--accent); text-decoration: none; font-weight: 800; margin-left: 6px; }
.seller-link:hover { text-decoration: underline; text-underline-offset: 2px; }

.expand-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0 0 8px;
  transition: color 0.2s;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.expand-btn:hover { color: var(--accent); }

.product-desc {
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 10px;
  padding: 10px;
  background: rgba(156, 255, 0, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(156, 255, 0, 0.08);
}
.product-desc p { margin: 0; }

.product-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.btn {
  display: inline-flex; align-items: center; padding: 8px 16px;
  border-radius: 8px; border: 1px solid var(--border);
  background: transparent; color: var(--text);
  cursor: pointer; font-weight: 600; font-size: 0.9rem; text-decoration: none;
}

.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn-sm { padding: 6px 12px; font-size: 0.8rem; }

.empty-state { text-align: center; padding: 64px 24px; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }
.empty-icon { font-size: 3rem; margin: 0; }

.watchlist-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--card);
  border: 1px solid rgba(156, 255, 0, 0.3);
  border-radius: 999px;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--accent);
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.btn-clear { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 0.85rem; }
.btn-clear:hover { color: var(--danger); }

.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }

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
  .browse-page { padding: 20px 12px 60px; }
  .search-input { min-width: 0; width: 100%; }
  .filter-select { flex: 1; min-width: 0; }
  .product-footer { flex-direction: column; }
  .product-footer .btn { width: 100%; justify-content: center; }
}
</style>
