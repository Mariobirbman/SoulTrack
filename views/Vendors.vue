<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/lib/firebase'

interface Vendor {
  uid: string
  name: string
  location?: string
  specialty?: string[]
  rating?: number
  reviewCount?: number
  badge?: string
  description?: string
  contactEmail?: string
  platforms?: string[]
  minOrder?: number
  topBrands?: string[]
}

const vendors = ref<Vendor[]>([
  {
    uid: '__demo__kickvault',
    name: 'KickVault',
    location: 'Atlanta, GA',
    specialty: ['Jordan', 'Nike SB'],
    rating: 4.9,
    reviewCount: 312,
    badge: 'Top Seller',
    description: 'One of the most trusted Jordan resellers in the southeast. KickVault specializes in OG colorways, grails, and limited drops. All shoes authenticated before listing.',
    contactEmail: 'kickvault@soletrack.com',
    platforms: ['StockX', 'GOAT', 'eBay'],
    minOrder: 1,
    topBrands: ['Jordan', 'Nike'],
  },
  {
    uid: '__demo__solesource',
    name: 'SoleSource',
    location: 'Los Angeles, CA',
    specialty: ['Nike', 'Adidas'],
    rating: 4.7,
    reviewCount: 198,
    badge: 'Verified',
    description: 'West Coast sneaker connect. Consistent supply of Dunks, Air Force 1s, and Yeezy drops. Ships same day on all confirmed orders.',
    contactEmail: 'solesource@soletrack.com',
    platforms: ['GOAT', 'Local', 'Instagram'],
    minOrder: 2,
    topBrands: ['Nike', 'Adidas'],
  },
  {
    uid: '__demo__yzydealer',
    name: 'YZYDealer',
    location: 'Chicago, IL',
    specialty: ['Adidas', 'Yeezy'],
    rating: 4.8,
    reviewCount: 441,
    badge: 'Top Seller',
    description: 'The go-to source for Yeezy supply. Every colorway since 2018, in most sizes. Bulk deals available for flippers. No fakes — every pair verified.',
    contactEmail: 'yzydealer@soletrack.com',
    platforms: ['StockX', 'eBay'],
    minOrder: 1,
    topBrands: ['Adidas'],
  },
  {
    uid: '__demo__retroracks',
    name: 'RetroRacks',
    location: 'New York, NY',
    specialty: ['Jordan', 'Nike Retro'],
    rating: 4.6,
    reviewCount: 127,
    badge: 'Verified',
    description: 'Specializing in retro Jordan 3s, 4s, and 5s. RetroRacks keeps inventory lean and quality high. Great source for resellers focused on classic silhouettes.',
    contactEmail: 'retrorack@soletrack.com',
    platforms: ['eBay', 'StockX', 'Local'],
    minOrder: 1,
    topBrands: ['Jordan'],
  },
  {
    uid: '__demo__cactuskicks',
    name: 'CactusKicks',
    location: 'Houston, TX',
    specialty: ['Travis Scott Collab', 'Nike SB'],
    rating: 5.0,
    reviewCount: 76,
    badge: 'New',
    description: 'Boutique vendor specializing in high-heat collabs. Travis Scott, Off-White, and other designer collaborations. Limited supply, serious buyers only.',
    contactEmail: 'cactuskicks@soletrack.com',
    platforms: ['StockX', 'GOAT'],
    minOrder: 1,
    topBrands: ['Nike', 'Jordan'],
  },
  {
    uid: '__demo__nbvault',
    name: 'NB Vault',
    location: 'Boston, MA',
    specialty: ['New Balance', 'Saucony'],
    rating: 4.5,
    reviewCount: 89,
    badge: 'Verified',
    description: 'The best NB connect in New England. Stocking 550s, 990s, 993s, and more. Also carries limited Saucony drops. Wholesale pricing for bulk buyers.',
    contactEmail: 'nbvault@soletrack.com',
    platforms: ['GOAT', 'Local'],
    minOrder: 3,
    topBrands: ['New Balance', 'Saucony'],
  },
])

const copiedEmail = ref<string | null>(null)
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

const loading = ref(false)
const loadError = ref('')

let stopVendorsListener: (() => void) | null = null
onMounted(() => {
  loading.value = true
  if (!firebaseConfigured || !db) {
    loadError.value = 'Firebase is not configured (showing demo data).'
    loading.value = false
    return
  }
  const q = query(collection(db, 'vendors'))
  stopVendorsListener = onSnapshot(
    q,
    (snap) => {
      const remote = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Vendor, 'uid'>) }))
      if (remote.length) vendors.value = remote
      loadError.value = ''
      loading.value = false
    },
    () => {
      loadError.value = 'Could not load vendors from the database (showing demo data).'
      loading.value = false
    },
  )
})
onBeforeUnmount(() => stopVendorsListener?.())

const searchQuery = ref('')
const selectedBadge = ref('All')
const sortBy = ref('rating')

const badgeOptions = ['All', 'Top Seller', 'Verified', 'New']

const filtered = computed(() => {
  let list = vendors.value.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                        String(v.location ?? '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                        (v.specialty ?? []).some(s => s.toLowerCase().includes(searchQuery.value.toLowerCase()))
    const matchBadge = selectedBadge.value === 'All' || v.badge === selectedBadge.value
    return matchSearch && matchBadge
  })

  if (sortBy.value === 'rating') list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  if (sortBy.value === 'reviews') list = [...list].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
  if (sortBy.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))

  return list
})

function stars(rating?: number) {
  if (!rating) return ''
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '')
}

const badgeColor: Record<string, string> = {
  'Top Seller': 'var(--accent)',
  'Verified': 'var(--success)',
  'New': 'var(--muted)',
}

const verifiedCount = computed(() => vendors.value.filter((v) => v.badge === 'Verified').length)
const topSellerCount = computed(() => vendors.value.filter((v) => v.badge === 'Top Seller').length)
const avgRating = computed(() => {
  const list = vendors.value.map((v) => v.rating).filter((r): r is number => typeof r === 'number' && r > 0)
  if (!list.length) return 0
  return list.reduce((a, r) => a + r, 0) / list.length
})
</script>

<template>
  <div class="vendors-page">

    <div class="vendors-hero">
      <div class="vendors-hero__grid"></div>
      <div class="vendors-hero__content">
        <h1 class="vendors-title">Trusted <span class="accent">Vendors</span></h1>
        <p class="vendors-lead">Connect with verified suppliers and keep your inventory stacked.</p>
      </div>
    </div>

    <div class="vendors-body">

      <!-- Stats bar -->
      <div class="vendor-stats-row">
        <div class="vstat">
          <span class="vstat-value">{{ vendors.length }}</span>
          <span class="vstat-label">Active Vendors</span>
        </div>
        <div class="vstat">
          <span class="vstat-value">{{ verifiedCount }}</span>
          <span class="vstat-label">Verified</span>
        </div>
        <div class="vstat">
          <span class="vstat-value">{{ topSellerCount }}</span>
          <span class="vstat-label">Top Sellers</span>
        </div>
        <div class="vstat">
          <span class="vstat-value">{{ avgRating ? avgRating.toFixed(1) : '0.0' }}★</span>
          <span class="vstat-label">Avg Rating</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <input
          id="vendors-search"
          name="vendorsSearch"
          v-model="searchQuery"
          class="search-input"
          type="text"
          placeholder="Search vendors, cities, brands..."
        />
        <select id="vendors-badge" name="vendorsBadge" v-model="selectedBadge" class="filter-select">
          <option v-for="b in badgeOptions" :key="b">{{ b }}</option>
        </select>
        <select id="vendors-sort" name="vendorsSort" v-model="sortBy" class="filter-select">
          <option value="rating">Top Rated</option>
          <option value="reviews">Most Reviews</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      <p class="results-count" v-if="loadError">{{ loadError }}</p>
      <p class="results-count" v-else-if="loading">Loading vendors...</p>
      <p class="results-count" v-else>{{ filtered.length }} vendor{{ filtered.length !== 1 ? 's' : '' }} found</p>

      <!-- Vendor grid -->
      <div class="vendor-grid">
        <div class="vendor-card" v-for="v in filtered" :key="v.uid">

          <div class="vendor-card-header">
            <div class="vendor-avatar">{{ v.name[0] }}</div>
            <div class="vendor-title-block">
              <div class="vendor-name-row">
                <h3 class="vendor-name">{{ v.name }}</h3>
                <span v-if="v.badge" class="vendor-badge" :style="{ color: badgeColor[v.badge], borderColor: badgeColor[v.badge] }">
                  {{ v.badge }}
                </span>
              </div>
              <p v-if="v.location" class="vendor-location">📍 {{ v.location }}</p>
            </div>
          </div>

          <div v-if="v.rating" class="vendor-rating-row">
            <span class="stars">{{ stars(v.rating) }}</span>
            <span class="rating-num">{{ v.rating }}</span>
            <span v-if="v.reviewCount != null" class="review-count">({{ v.reviewCount }} reviews)</span>
          </div>

          <p v-if="v.description" class="vendor-desc">{{ v.description }}</p>

          <div class="vendor-meta-grid">
            <div class="vmeta" v-if="v.reviewCount != null">
              <span class="vmeta-label">Reviews</span>
              <span class="vmeta-value">{{ v.reviewCount }}</span>
            </div>
            <div class="vmeta" v-if="v.minOrder != null">
              <span class="vmeta-label">Min Order</span>
              <span class="vmeta-value">{{ v.minOrder }} pair{{ v.minOrder !== 1 ? 's' : '' }}</span>
            </div>
            <div class="vmeta" v-if="v.platforms?.length">
              <span class="vmeta-label">Platforms</span>
              <span class="vmeta-value">{{ v.platforms.length }}</span>
            </div>
          </div>

          <div class="vendor-tags-row" v-if="v.topBrands?.length">
            <span class="tag brand-tag" v-for="b in v.topBrands" :key="b">{{ b }}</span>
          </div>

          <div class="vendor-platforms" v-if="v.platforms?.length">
            <span class="platform-tag" v-for="pl in v.platforms" :key="pl">{{ pl }}</span>
          </div>

          <div class="vendor-footer">
            <router-link :to="`/vendor/${v.uid}`" class="btn primary">Visit shop</router-link>
            <button
              v-if="v.contactEmail"
              type="button"
              class="btn"
              @click="copyEmail(v.contactEmail)"
              :title="v.contactEmail"
            >
              {{ copiedEmail === v.contactEmail ? 'Copied' : 'Copy email' }}
            </button>
          </div>

        </div>
      </div>

      <div class="empty-state" v-if="!filtered.length">
        <p class="empty-icon">🏪</p>
        <p>No vendors match your search.</p>
        <button class="btn" @click="searchQuery = ''; selectedBadge = 'All'">Clear filters</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.vendors-page { background: var(--bg); }

.vendors-hero {
  position: relative;
  min-height: 36vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 56px;
  text-align: center;
}

.vendors-hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(100, 200, 100, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(100, 200, 100, 0.06) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%);
}

.vendors-hero__content { position: relative; z-index: 1; }

.vendors-title {
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  color: var(--text);
}

.accent { color: var(--accent); }

.vendors-lead {
  font-size: 1.1rem;
  color: var(--muted);
  margin: 0;
  max-width: 50ch;
}

.vendors-body {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.vendor-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 36px;
}

.vstat {
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.05) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-top: 2px solid var(--accent);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.vstat-value { font-size: 1.6rem; font-weight: 700; color: var(--accent); }
.vstat-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

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

.results-count { color: var(--muted); font-size: 0.85rem; margin: 0 0 24px; }

.vendor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.vendor-card {
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.04) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-radius: 16px;
  padding: 24px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vendor-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(156, 255, 0, 0.1);
}

.vendor-card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.vendor-avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), rgba(156, 255, 0, 0.3));
  color: #0b1205;
  font-weight: 800;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vendor-title-block { flex: 1; }

.vendor-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.vendor-name { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text); }

.vendor-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 99px;
  border: 1px solid;
  letter-spacing: 0.04em;
}

.vendor-location { margin: 4px 0 0; font-size: 0.8rem; color: var(--muted); }

.vendor-rating-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stars { color: var(--accent); font-size: 0.9rem; letter-spacing: 1px; }
.rating-num { font-weight: 700; color: var(--text); font-size: 0.9rem; }
.review-count { color: var(--muted); font-size: 0.8rem; }

.vendor-desc {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.vendor-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.vmeta {
  background: rgba(156, 255, 0, 0.04);
  border: 1px solid rgba(156, 255, 0, 0.1);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vmeta-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.vmeta-value { font-size: 0.9rem; font-weight: 700; color: var(--text); }

.vendor-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 99px;
}

.brand-tag {
  background: rgba(156, 255, 0, 0.1);
  color: var(--accent);
  border: 1px solid rgba(156, 255, 0, 0.25);
}

.vendor-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.platform-tag {
  font-size: 0.7rem;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 8px;
}

.vendor-footer {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 9px 18px; border-radius: 8px; border: 1px solid var(--border);
  background: transparent; color: var(--text);
  cursor: pointer; font-weight: 600; font-size: 0.88rem; text-decoration: none;
  transition: opacity 0.2s;
}

.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn:hover { opacity: 0.85; }

.empty-state { text-align: center; padding: 64px 24px; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }
.empty-icon { font-size: 3rem; margin: 0; }
</style>
