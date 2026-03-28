<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/lib/firebase'

interface Product {
  id: number
  name: string
  brand: string
  size: string
  price: number
  retailPrice: number
  condition: 'New' | 'Used' | 'DS'
  image: string
  platform: string
  colorway: string
  sku: string
  seller: string
  soldCount: number
  description: string
}

const products = ref<Product[]>([
  {
    id: 1,
    name: 'Air Jordan 1 Retro High OG',
    brand: 'Jordan',
    size: '10',
    price: 289,
    retailPrice: 180,
    condition: 'DS',
    image: '/images/shoes/pexels-jonathanborba-12031204.jpg',
    platform: 'StockX',
    colorway: 'Chicago / Red Black',
    sku: '555088-101',
    seller: 'KickVault',
    soldCount: 142,
    description: 'The iconic AJ1 High OG in classic colorway. Deadstock, never worn. Original box included with all accessories.',
  },
  {
    id: 2,
    name: 'Nike Dunk Low Retro',
    brand: 'Nike',
    size: '9.5',
    price: 145,
    retailPrice: 110,
    condition: 'New',
    image: '/images/shoes/pexels-mohammad-khan-3488802-5470890.jpg',
    platform: 'GOAT',
    colorway: 'White / Black Panda',
    sku: 'DD1391-100',
    seller: 'SoleSource',
    soldCount: 87,
    description: 'Clean Panda Dunk Low. Tried on once indoors. No creases, no dirt. Box slightly dented but shoe is perfect.',
  },
  {
    id: 3,
    name: 'Adidas Yeezy Boost 350 V2',
    brand: 'Adidas',
    size: '11',
    price: 320,
    retailPrice: 230,
    condition: 'DS',
    image: '/images/shoes/pexels-delot-15467344.jpg',
    platform: 'StockX',
    colorway: 'Zebra',
    sku: 'CP9654',
    seller: 'YZYDealer',
    soldCount: 205,
    description: 'Zebra 350 V2 — one of the most sought-after Yeezy colorways. Deadstock with original receipt.',
  },
  {
    id: 4,
    name: 'Jordan 4 Retro Military Blue',
    brand: 'Jordan',
    size: '10.5',
    price: 410,
    retailPrice: 210,
    condition: 'DS',
    image: '/images/shoes/pexels-perfect-lens-15939920.jpg',
    platform: 'eBay',
    colorway: 'Military Blue',
    sku: 'DH6927-111',
    seller: 'RetroRacks',
    soldCount: 63,
    description: 'OG Military Blue 4 — cleaned up retro of the classic 1989 colorway. DS with box and extra laces.',
  },
  {
    id: 5,
    name: 'Nike Air Max 90',
    brand: 'Nike',
    size: '9',
    price: 110,
    retailPrice: 130,
    condition: 'Used',
    image: '/images/shoes/pexels-shyam-mishra-203327-13691725.jpg',
    platform: 'Local',
    colorway: 'Infrared',
    sku: 'CT1685-100',
    seller: 'FlipKing',
    soldCount: 31,
    description: 'Light use, still looking clean. Minor sole yellowing, no major scuffs. Great daily beater.',
  },
  {
    id: 6,
    name: 'New Balance 550 White Green',
    brand: 'New Balance',
    size: '10',
    price: 130,
    retailPrice: 110,
    condition: 'New',
    image: '/images/shoes/pexels-ahmad-saeed-143458323-10373341.jpg',
    platform: 'GOAT',
    colorway: 'White / Green',
    sku: 'BB550WT1',
    seller: 'NB Vault',
    soldCount: 54,
    description: 'Clean 550 colorway in crispy white/green. Brand new, never worn. Original box and paper.',
  },
  {
    id: 7,
    name: 'Air Jordan 3 Retro Fire Red',
    brand: 'Jordan',
    size: '11',
    price: 375,
    retailPrice: 200,
    condition: 'DS',
    image: '/images/shoes/pexels-jonathanborba-12031204.jpg',
    platform: 'StockX',
    colorway: 'Fire Red',
    sku: 'CT8532-160',
    seller: 'KickVault',
    soldCount: 98,
    description: 'Fire Red 3 — one of the cleanest retros of the year. Elephant print looking sharp, all OG receipts included.',
  },
  {
    id: 8,
    name: 'Nike SB Dunk Low Travis Scott',
    brand: 'Nike',
    size: '10',
    price: 850,
    retailPrice: 150,
    condition: 'DS',
    image: '/images/shoes/pexels-mohammad-khan-3488802-5470890.jpg',
    platform: 'StockX',
    colorway: 'Brown / Sail',
    sku: 'CT5053-200',
    seller: 'CactusKicks',
    soldCount: 19,
    description: 'Highly coveted Travis Scott SB collab. Reverse Swoosh, hidden pocket under the tongue. DS, never worn.',
  },
  {
    id: 9,
    name: 'Adidas Forum Low x Bad Bunny',
    brand: 'Adidas',
    size: '9',
    price: 290,
    retailPrice: 160,
    condition: 'New',
    image: '/images/shoes/pexels-delot-15467344.jpg',
    platform: 'GOAT',
    colorway: 'Easter Egg',
    sku: 'GW0265',
    seller: 'SoleSource',
    soldCount: 44,
    description: 'Bad Bunny x Forum Low in the Easter Egg colorway. Tried on once for photos. Pristine condition.',
  },
])

const loading = ref(false)
const loadError = ref('')

let stopProductsListener: (() => void) | null = null
onMounted(() => {
  loading.value = true
  if (!firebaseConfigured || !db) {
    loadError.value = 'Firebase is not configured (showing demo data).'
    loading.value = false
    return
  }
  const q = query(collection(db, 'products'), orderBy('id'))
  stopProductsListener = onSnapshot(
    q,
    (snap) => {
      const remote = snap.docs.map((d) => d.data() as Product)
      if (remote.length) products.value = remote
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

const searchQuery = ref('')
const selectedBrand = ref('All')
const selectedCondition = ref('All')
const selectedPlatform = ref('All')
const sortBy = ref('price-asc')
const expandedId = ref<number | null>(null)

const brands = ['All', 'Jordan', 'Nike', 'Adidas', 'New Balance']
const conditions = ['All', 'DS', 'New', 'Used']
const platformOptions = ['All', 'StockX', 'GOAT', 'eBay', 'Local']

const filtered = computed(() => {
  let list = products.value.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                        p.brand.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                        p.colorway.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchBrand = selectedBrand.value === 'All' || p.brand === selectedBrand.value
    const matchCond = selectedCondition.value === 'All' || p.condition === selectedCondition.value
    const matchPlat = selectedPlatform.value === 'All' || p.platform === selectedPlatform.value
    return matchSearch && matchBrand && matchCond && matchPlat
  })

  if (sortBy.value === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
  if (sortBy.value === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
  if (sortBy.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  if (sortBy.value === 'profit') list = [...list].sort((a, b) => (b.price - b.retailPrice) - (a.price - a.retailPrice))

  return list
})

const watchlist = ref<number[]>([])

function toggleWatchlist(id: number) {
  if (watchlist.value.includes(id)) {
    watchlist.value = watchlist.value.filter(w => w !== id)
  } else {
    watchlist.value.push(id)
  }
}

function isWatched(id: number) {
  return watchlist.value.includes(id)
}

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

const conditionColor: Record<string, string> = {
  DS: 'var(--accent)',
  New: 'var(--success)',
  Used: 'var(--muted)',
}

function profitMargin(p: { price: number; retailPrice: number }) {
  return Math.round(((p.price - p.retailPrice) / p.retailPrice) * 100)
}
</script>

<template>
  <div class="browse-page">

    <div class="browse-header">
      <h1 class="browse-title">Browse Products</h1>
      <p class="browse-sub">Find your next flip or add to your collection.</p>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        v-model="searchQuery"
        class="search-input"
        type="text"
        placeholder="Search shoes, brands, colorways..."
      />
      <select v-model="selectedBrand" class="filter-select">
        <option v-for="b in brands" :key="b">{{ b }}</option>
      </select>
      <select v-model="selectedCondition" class="filter-select">
        <option v-for="c in conditions" :key="c">{{ c }}</option>
      </select>
      <select v-model="selectedPlatform" class="filter-select">
        <option v-for="pl in platformOptions" :key="pl">{{ pl }}</option>
      </select>
      <select v-model="sortBy" class="filter-select">
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="name">Name A-Z</option>
        <option value="profit">Best Flip Margin</option>
      </select>
    </div>

    <p class="results-count" v-if="loadError">{{ loadError }}</p>
    <p class="results-count" v-else-if="loading">Loading productsâ€¦</p>
    <p class="results-count" v-else>{{ filtered.length }} product{{ filtered.length !== 1 ? 's' : '' }} found</p>

    <!-- Grid -->
    <div class="product-grid" v-if="filtered.length">
      <div class="product-card" v-for="p in filtered" :key="p.id">
        <div class="product-img-wrap">
          <img :src="p.image" :alt="p.name" class="product-img" />
          <button
            class="watchlist-btn"
            :class="{ watched: isWatched(p.id) }"
            @click="toggleWatchlist(p.id)"
            :title="isWatched(p.id) ? 'Remove from watchlist' : 'Add to watchlist'"
          >
            {{ isWatched(p.id) ? '★' : '☆' }}
          </button>
          <span class="condition-badge" :style="{ color: conditionColor[p.condition], borderColor: conditionColor[p.condition] }">
            {{ p.condition }}
          </span>
          <span class="margin-badge" :class="profitMargin(p) > 0 ? 'pos' : 'neg'">
            {{ profitMargin(p) > 0 ? '+' : '' }}{{ profitMargin(p) }}% vs retail
          </span>
        </div>

        <div class="product-info">
          <div class="product-top">
            <p class="product-brand">{{ p.brand }}</p>
            <span class="product-platform-tag">{{ p.platform }}</span>
          </div>
          <h3 class="product-name">{{ p.name }}</h3>
          <p class="product-colorway">{{ p.colorway }}</p>

          <div class="product-meta">
            <span class="meta-item">Size US {{ p.size }}</span>
            <span class="meta-item">SKU: {{ p.sku }}</span>
            <span class="meta-item">{{ p.soldCount }} sold</span>
          </div>

          <div class="price-row">
            <div>
              <p class="price-label">Ask Price</p>
              <p class="product-price">${{ p.price }}</p>
            </div>
            <div>
              <p class="price-label">Retail</p>
              <p class="retail-price">${{ p.retailPrice }}</p>
            </div>
          </div>

          <div class="seller-row">
            <span class="seller-name">Sold by {{ p.seller }}</span>
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
            <router-link to="/login" class="btn primary btn-sm">Buy Now</router-link>
            <router-link to="/login" class="btn btn-sm">Make Offer</router-link>
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
</style>
