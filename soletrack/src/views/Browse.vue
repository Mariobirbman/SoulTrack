<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/lib/firebase'
import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth'
import { getDelta, loadBrandStats } from '@/lib/useBrandStats'
import { priceColorClass } from '@/lib/marketIntel'
import { demoProducts, type DemoProduct } from '@/lib/demoMarketplace'
import { getOrSeedDemoProducts } from '@/lib/demoStore'

type Product = DemoProduct

const products = ref<Product[]>([])

const loading = ref(false)
const loadError = ref('')

function isActiveListing(p: any) {
  const status = String(p?.status ?? 'active')
  return (status === 'approved' || status === 'active') && p?.active !== false
}

function mergeWithCuratedDemoPhotos(source: Product[]) {
  const byId = new Map<string, Product>()
  for (const item of demoProducts as Product[]) byId.set(item.id, item)
  for (const item of source) byId.set(item.id, item)
  return Array.from(byId.values())
}

let stopProductsListener: (() => void) | null = null
onMounted(async () => {
  try {
    await loadBrandStats()
  } catch {}
  loading.value = true
  if (!firebaseConfigured || !db) {
    // Demo mode: include local active listings and the curated demo photo catalog.
    const local = getOrSeedDemoProducts().filter((p: any) => isActiveListing(p)) as any
    products.value = mergeWithCuratedDemoPhotos(local)
    loadError.value = ''
    loading.value = false
    return
  }
  // Firebase mode: show active listings immediately.
  const q = query(collection(db, 'products'))
  stopProductsListener = onSnapshot(
    q,
    (snap) => {
      const live = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
        .filter((p) =>
          typeof (p as any).vendorUid === 'string'
          && (p as any).vendorUid.length > 0
          && isActiveListing(p),
        )
      products.value = mergeWithCuratedDemoPhotos(live as Product[])
      loadError.value = ''
      loading.value = false
    },
    () => {
      loadError.value = 'Could not load products from the database.'
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
const priceClassMap = ref<Record<string, string>>({})

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


const conditionColor: Record<string, string> = {
  DS: 'var(--accent)',
  New: 'var(--success)',
  Used: 'var(--muted)',
}

const FALLBACK_IMAGE = '/images/shoes/pexels-jonathanborba-12031204.jpg'

function productImage(p: Product) {
  const gallery = Array.isArray((p as any).images)
    ? (p as any).images.map((src: unknown) => String(src)).filter(Boolean)
    : []
  return gallery[0] || p.image || FALLBACK_IMAGE
}

function profitMargin(p: { price: number; retailPrice?: number }) {
  if (!p.retailPrice || p.retailPrice <= 0) return 0
  return Math.round(((p.price - p.retailPrice) / p.retailPrice) * 100)
}

async function refreshPriceClasses(items: Product[]) {
  const updates = await Promise.all(
    items.map(async (p) => {
      const typeHint = String((p as any).category ?? (p as any).model ?? p.name ?? '')
      const delta = await getDelta(p.price, p.brand, typeHint)
      return [p.id, priceColorClass(delta)] as const
    }),
  )
  priceClassMap.value = Object.fromEntries(updates)
}

function priceClassForProduct(p: Product) {
  return priceClassMap.value[p.id] ?? ''
}

const { add: addToCart } = useCart()
const { user } = useAuth()
const cartToast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

/** True when the logged-in user owns this listing - show Edit instead of Add to Cart */
function isOwnProduct(p: Product): boolean {
  if (!user.value || !(p as any).vendorUid) return false
  return user.value.uid === (p as any).vendorUid
}

function addProductToCart(p: Product) {
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

watch(filtered, (items) => { void refreshPriceClasses(items) }, { immediate: true })
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
        aria-label="Search products"
        v-model="searchQuery"
        class="search-input"
        type="text"
        placeholder="Search shoes, brands, colorways..."
      />
      <select id="browse-brand" name="browseBrand" aria-label="Filter by brand" v-model="selectedBrand" class="filter-select">
        <option v-for="b in brands" :key="b">{{ b }}</option>
      </select>
      <select id="browse-condition" name="browseCondition" aria-label="Filter by condition" v-model="selectedCondition" class="filter-select">
        <option v-for="c in conditions" :key="c">{{ c }}</option>
      </select>
      <select id="browse-platform" name="browsePlatform" aria-label="Filter by platform" v-model="selectedPlatform" class="filter-select">
        <option v-for="pl in platformOptions" :key="pl">{{ pl }}</option>
      </select>
      <select id="browse-sort" name="browseSort" aria-label="Sort products" v-model="sortBy" class="filter-select">
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
          <img :src="productImage(p)" :alt="p.name" class="product-img" loading="lazy" />
          <button
            class="watchlist-btn"
            :class="{ watched: isWatched(p.id) }"
            @click="toggleWatchlist(p.id)"
            :title="isWatched(p.id) ? 'Remove from watchlist' : 'Add to watchlist'"
          >
            {{ isWatched(p.id) ? 'Saved' : 'Save' }}
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
              <p class="product-price" :class="priceClassForProduct(p)">${{ p.price }}</p>
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

          <div class="product-footer">
            <!-- Seller sees Edit instead of Add to cart on their own listings -->
            <router-link v-if="isOwnProduct(p)" to="/sell" class="btn own-btn btn-sm">&#x270F;&#xFE0F; Edit</router-link>
            <button v-else class="btn primary btn-sm" @click="addProductToCart(p)">Add to cart</button>
            <router-link :to="`/item/${p.id}`" class="btn btn-sm">View details</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div class="empty-state" v-else>
      <p>No products match your filters.</p>
      <button class="btn" @click="searchQuery = ''; selectedBrand = 'All'; selectedCondition = 'All'; selectedPlatform = 'All'">Clear filters</button>
    </div>

    <!-- Watchlist bar -->
    <div class="watchlist-bar" v-if="watchlist.length">
      <span>{{ watchlist.length }} item{{ watchlist.length !== 1 ? 's' : '' }} saved</span>
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
  appearance: none;
  color-scheme: dark;
  background-image:
    linear-gradient(45deg, transparent 50%, color-mix(in srgb, var(--muted) 76%, white 24%) 50%),
    linear-gradient(135deg, color-mix(in srgb, var(--muted) 76%, white 24%) 50%, transparent 50%);
  background-position:
    calc(100% - 16px) calc(50% - 2px),
    calc(100% - 11px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 34px;
}
.filter-select:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.4);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.14);
}
.filter-select option {
  background: var(--surface-1);
  color: var(--text);
}

.results-count { color: var(--muted); font-size: 0.85rem; margin: 0 0 20px; }

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 20px;
}

.product-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  transition: background 0.15s;
}

.product-card:hover {
  background: var(--surface-2);
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
}

.watchlist-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(6, 15, 7, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--muted);
  border-radius: 6px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.watchlist-btn.watched { color: var(--accent); border-color: rgba(var(--accent-rgb), 0.3); }

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

.product-brand { margin: 0; font-size: 0.78rem; color: var(--muted); font-weight: 600; }

.product-platform-tag {
  font-size: 0.7rem;
  color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
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
  background: rgba(255, 255, 255, 0.04);
  padding: 3px 8px;
  border-radius: 6px;
}

.price-row {
  display: flex;
  gap: 24px;
  margin-bottom: 10px;
}

.price-label { margin: 0 0 2px; font-size: 0.72rem; color: var(--muted); }
.product-price { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--accent); }
.price--great-deal { color: var(--success); font-weight: 600; }
.price--deal       { color: color-mix(in srgb, var(--success) 70%, transparent); }
.price--premium    { color: #f5a623; }
.price--high       { color: var(--danger); }
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
  background: rgba(var(--accent-rgb), 0.03);
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
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
.own-btn { color: var(--accent); border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.06); text-decoration: none; }
.own-btn:hover { background: rgba(var(--accent-rgb), 0.14); border-color: rgba(var(--accent-rgb), 0.6); }
.own-btn { color: var(--accent); border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.06); text-decoration: none; }
.own-btn:hover { background: rgba(var(--accent-rgb), 0.14); border-color: rgba(var(--accent-rgb), 0.6); }

.empty-state { text-align: center; padding: 64px 24px; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }
.empty-icon { font-size: 3rem; margin: 0; }

.watchlist-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--accent);
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
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
  border-radius: 8px;
  font-size: 0.9rem;
  z-index: 200;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
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
