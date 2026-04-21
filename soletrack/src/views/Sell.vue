<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useAuth } from '@/lib/auth'
import { db, demoMode, firebaseConfigured } from '@/lib/firebase'
import {
  addDemoSampleListings,
  deleteDemoProduct,
  getOrSeedDemoProducts,
  getOrSeedDemoVendor,
  saveDemoVendor,
  upsertDemoProduct,
} from '@/lib/demoStore'

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
  status?: string
}

const BRANDS = ['Nike', 'Jordan', 'Adidas', 'New Balance', 'Yeezy', 'Puma', 'Reebok', 'Other'] as const
const COMMON_SIZES = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'] as const

const router = useRouter()
const { user, ready } = useAuth()

const status = ref('')
const error = ref('')

const vendorExists = ref(false)
const vendor = ref<VendorProfile>({
  name: '',
  location: '',
  description: '',
  contactEmail: '',
  minOrder: 1,
})

const products = ref<Array<{ id: string } & ProductDoc>>([])
const editingId = ref<string | null>(null)

const productForm = ref<Omit<ProductDoc, 'vendorUid' | 'vendorName'> & { colorway?: string; sku?: string }>({
  name: '',
  brand: '',
  size: '',
  price: 0,
  condition: 'New',
  image: '',
  description: '',
  colorway: '',
  sku: '',
  active: true,
})

const uid = computed(() => user.value?.uid ?? '')
const canUseMarketplace = computed(() => (demoMode ? !!uid.value : firebaseConfigured && !!db && !!uid.value))

let stopVendorListener: (() => void) | null = null
let stopProductsListener: (() => void) | null = null

onMounted(() => {
  ;(async () => {
    await ready
    if (demoMode) {
      if (!user.value) {
        router.push('/login')
        return
      }
      vendorExists.value = true
      vendor.value = getOrSeedDemoVendor()
      products.value = getOrSeedDemoProducts().filter((p) => p.vendorUid === user.value!.uid) as any
      return
    }
    if (!firebaseConfigured || !db) {
      error.value = 'Firebase is not configured yet. Add soletrack/.env.local to enable selling.'
      return
    }
    if (!user.value) {
      router.push('/login')
      return
    }

    const vendorRef = doc(db, 'vendors', user.value.uid)
    stopVendorListener = onSnapshot(
      vendorRef,
      (snap) => {
        vendorExists.value = snap.exists()
        if (!snap.exists()) {
          vendor.value = {
            name: user.value?.displayName || '',
            location: '',
            description: '',
            contactEmail: user.value?.email || '',
            minOrder: 1,
          }
          return
        }
        const data = snap.data() as Partial<VendorProfile>
        vendor.value = {
          name: String(data.name ?? ''),
          location: data.location ? String(data.location) : '',
          description: data.description ? String(data.description) : '',
          contactEmail: data.contactEmail ? String(data.contactEmail) : (user.value?.email || ''),
          minOrder: typeof data.minOrder === 'number' ? data.minOrder : 1,
        }
      },
      () => {
        error.value = 'Could not load your vendor profile.'
      },
    )

    const q = query(collection(db, 'products'), where('vendorUid', '==', user.value.uid))
    stopProductsListener = onSnapshot(
      q,
      (snap) => {
        products.value = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as ProductDoc) }))
          .sort((a, b) => a.name.localeCompare(b.name))
      },
      () => {
        error.value = 'Could not load your products.'
      },
    )
  })()
})

onBeforeUnmount(() => {
  stopVendorListener?.()
  stopProductsListener?.()
})

async function saveVendor() {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value || !user.value) return
  if (!vendor.value.name.trim()) {
    error.value = 'Shop name is required.'
    return
  }

  if (demoMode) {
    const v = {
      name: vendor.value.name.trim(),
      location: (vendor.value.location ?? '').trim(),
      description: (vendor.value.description ?? '').trim(),
      contactEmail: (vendor.value.contactEmail ?? '').trim(),
      minOrder: Math.max(1, Number(vendor.value.minOrder ?? 1) || 1),
    }
    vendor.value = v
    saveDemoVendor(v)
    status.value = 'Vendor profile saved (demo mode).'
    return
  }

  if (!db) return
  try {
    const payload: any = {
      name: vendor.value.name.trim(),
      location: (vendor.value.location ?? '').trim(),
      description: (vendor.value.description ?? '').trim(),
      contactEmail: (vendor.value.contactEmail ?? '').trim(),
      minOrder: Math.max(1, Number(vendor.value.minOrder ?? 1) || 1),
      updatedAt: serverTimestamp(),
    }
    if (!vendorExists.value) payload.createdAt = serverTimestamp()

    await setDoc(doc(db, 'vendors', user.value.uid), payload, { merge: true })
    status.value = 'Vendor profile saved.'
  } catch {
    error.value = 'Could not save your vendor profile.'
  }
}

function resetProductForm() {
  editingId.value = null
  productForm.value = {
    name: '',
    brand: '',
    size: '',
    price: 0,
    condition: 'New',
    image: '',
    description: '',
    colorway: '',
    sku: '',
    active: true,
  }
}

function startEdit(p: { id: string } & ProductDoc & { colorway?: string; sku?: string }) {
  editingId.value = p.id
  productForm.value = {
    name: p.name,
    brand: p.brand ?? '',
    size: p.size ?? '',
    price: p.price,
    condition: p.condition ?? 'New',
    image: p.image ?? '',
    description: p.description ?? '',
    colorway: (p as any).colorway ?? '',
    sku: (p as any).sku ?? '',
    active: p.active ?? true,
  }
  status.value = ''
  error.value = ''
}

async function saveProduct() {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value || !user.value) return
  const currentUser = user.value
  if (!vendor.value.name.trim()) {
    error.value = 'Save your vendor profile (shop name) before listing products.'
    return
  }
  if (!productForm.value.name.trim()) {
    error.value = 'Product name is required.'
    return
  }
  const price = Number(productForm.value.price)
  if (!Number.isFinite(price) || price <= 0) {
    error.value = 'Enter a valid price.'
    return
  }

  const payload: any = {
    vendorUid: currentUser.uid,
    vendorName: vendor.value.name.trim(),
    name: productForm.value.name.trim(),
    brand: (productForm.value.brand ?? '').trim(),
    size: (productForm.value.size ?? '').trim(),
    price,
    condition: (productForm.value.condition ?? '').trim(),
    image: (productForm.value.image ?? '').trim(),
    description: (productForm.value.description ?? '').trim(),
    colorway: ((productForm.value as any).colorway ?? '').trim(),
    sku: ((productForm.value as any).sku ?? '').trim(),
    active: productForm.value.active !== false,
    updatedAt: serverTimestamp(),
  }

  if (demoMode) {
    const demoPayload = editingId.value ? payload : { ...payload, status: 'pending' }
    const next = upsertDemoProduct({ id: editingId.value ?? undefined, ...demoPayload })
    products.value = (next.filter((p) => p.vendorUid === currentUser.uid) as any).sort((a: any, b: any) =>
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
    )
    status.value = editingId.value ? 'Product updated (demo mode).' : 'Product submitted for review (demo mode).'
    resetProductForm()
    return
  }

  if (!db) return
  try {
    if (editingId.value) {
      await updateDoc(doc(db, 'products', editingId.value), payload)
      status.value = 'Product updated.'
    } else {
      payload.createdAt = serverTimestamp()
      payload.status = 'pending'
      await addDoc(collection(db, 'products'), payload)
      status.value = 'Product submitted for review. An admin will approve it shortly.'
    }
    resetProductForm()
  } catch {
    error.value = 'Could not save product.'
  }
}

async function markAsSold(id: string) {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value) return
  if (demoMode) {
    const current = products.value.find((p) => p.id === id)
    if (!current) return
    // cast to any to satisfy DemoProduct's required brand field — product is already valid shape
    const next = upsertDemoProduct({ ...(current as any), status: 'sold' })
    products.value = (next.filter((p: any) => p.vendorUid === uid.value) as any).sort((a: any, b: any) =>
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
    )
    status.value = 'Marked as sold (demo mode).'
    return
  }
  if (!db) return
  try {
    await updateDoc(doc(db, 'products', id), { status: 'sold', active: false, updatedAt: serverTimestamp() })
    status.value = 'Listing marked as sold.'
  } catch {
    error.value = 'Could not update listing.'
  }
}

async function removeProduct(id: string) {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value) return
  if (demoMode) {
    const next = deleteDemoProduct(id)
    products.value = (next.filter((p) => p.vendorUid === uid.value) as any).sort((a: any, b: any) =>
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
    )
    status.value = 'Product removed (demo mode).'
    return
  }
  if (!db) return
  try {
    await deleteDoc(doc(db, 'products', id))
    status.value = 'Product removed.'
  } catch {
    error.value = 'Could not remove product.'
  }
}

async function addSampleListings() {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value || !user.value) return
  if (!vendor.value.name.trim()) {
    error.value = 'Save your vendor profile (shop name) first.'
    return
  }
  try {
    if (demoMode) {
      const next = addDemoSampleListings(user.value.uid, vendor.value.name.trim())
      products.value = (next.filter((p) => p.vendorUid === uid.value) as any).sort((a: any, b: any) =>
        String(a.name ?? '').localeCompare(String(b.name ?? '')),
      )
      status.value = 'Sample listings added (demo mode).'
      return
    }
    if (!db) return
    const samples = [
      {
        name: 'Nike Dunk Low Retro',
        brand: 'Nike',
        size: '10',
        price: 165,
        condition: 'New',
        image: '/images/shoes/pexels-dl-nike-dunk-20298285.jpg',
        description: 'Clean, ready for pickup. Box included.',
      },
      {
        name: 'Air Jordan 1 Retro High OG',
        brand: 'Jordan',
        size: '10.5',
        price: 305,
        condition: 'DS',
        image: '/images/shoes/pexels-dl-jordan-11281577.jpg',
        description: 'Deadstock, never worn. Local pickup only.',
      },
      {
        name: 'New Balance 550 White Green',
        brand: 'New Balance',
        size: '9.5',
        price: 140,
        condition: 'New',
        image: '/images/shoes/pexels-dl-nb-19882433.jpg',
        description: 'Brand new pair. Great starter flip.',
      },
    ]

    for (const s of samples) {
      await addDoc(collection(db, 'products'), {
        vendorUid: user.value.uid,
        vendorName: vendor.value.name.trim(),
        ...s,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    status.value = 'Sample listings added.'
  } catch {
    error.value = 'Could not add sample listings.'
  }
}
</script>

<template>
  <div class="sell-page">
    <div class="page-header">
      <div>
        <h1 class="title">Sell on <span class="accent">SoleTrack</span></h1>
        <p class="sub">Set up your shop and list sneakers for pickup.</p>
      </div>
      <div class="head-actions">
        <router-link v-if="uid" class="btn" :to="`/vendor/${uid}`">View shop</router-link>
        <router-link v-if="uid" class="btn" to="/vendor-orders">Orders</router-link>
      </div>
    </div>

    <div v-if="error" class="notice error">{{ error }}</div>
    <div v-if="status" class="notice ok">{{ status }}</div>

    <!-- ── Top: vendor profile (compact) ────────────────────────────────── -->
    <section class="card vendor-card">
      <div class="card-head">
        <span class="card-label">Shop profile</span>
        <button class="btn sm primary" :disabled="!canUseMarketplace" @click="saveVendor">Save</button>
      </div>
      <div class="vendor-grid">
        <div class="field">
          <label>Shop name</label>
          <input v-model="vendor.name" type="text" placeholder="Your shop name" />
        </div>
        <div class="field">
          <label>Location</label>
          <input v-model="vendor.location" type="text" placeholder="City, State" />
        </div>
        <div class="field">
          <label>Contact email</label>
          <input v-model="vendor.contactEmail" type="email" placeholder="you@example.com" />
        </div>
        <div class="field">
          <label>Min order (pairs)</label>
          <input v-model="vendor.minOrder" type="number" min="1" />
        </div>
        <div class="field full">
          <label>About your shop</label>
          <textarea v-model="vendor.description" rows="2" placeholder="What do you sell? Pickup hours? Specialties?"></textarea>
        </div>
      </div>
    </section>

    <!-- ── Listing form + live preview ──────────────────────────────────── -->
    <section class="card listing-card">
      <div class="card-head">
        <span class="card-label">{{ editingId ? 'Edit listing' : 'New listing' }}</span>
        <button class="btn sm" :disabled="!canUseMarketplace" @click="addSampleListings">Add samples</button>
      </div>

      <div class="listing-layout">
        <!-- Form -->
        <div class="listing-form">
          <div class="form-section-label">Shoe details</div>
          <div class="form-grid">
            <div class="field full">
              <label>Shoe name</label>
              <input v-model="productForm.name" type="text" placeholder="e.g. Air Jordan 1 Retro High OG" />
            </div>
            <div class="field full">
              <label>Brand</label>
              <div class="pill-row">
                <button
                  v-for="b in BRANDS"
                  :key="b"
                  type="button"
                  class="pill-btn"
                  :class="{ active: productForm.brand === b }"
                  @click="productForm.brand = b"
                >{{ b }}</button>
              </div>
              <input
                v-if="productForm.brand === 'Other' || !BRANDS.includes((productForm.brand ?? '') as any)"
                v-model="productForm.brand"
                type="text"
                placeholder="Enter brand name"
                style="margin-top:6px"
              />
            </div>
            <div class="field">
              <label>Colorway</label>
              <input v-model="(productForm as any).colorway" type="text" placeholder="e.g. Bred / Chicago" />
            </div>
            <div class="field">
              <label>Size (US)</label>
              <div class="pill-row pill-row--sm">
                <button
                  v-for="s in COMMON_SIZES"
                  :key="s"
                  type="button"
                  class="pill-btn pill-btn--sm"
                  :class="{ active: productForm.size === s }"
                  @click="productForm.size = s"
                >{{ s }}</button>
              </div>
              <input v-model="productForm.size" type="text" placeholder="Other size (e.g. W9)" style="margin-top:6px" />
            </div>
            <div class="field">
              <label>SKU / Style code</label>
              <input v-model="(productForm as any).sku" type="text" placeholder="555088-001" />
            </div>
          </div>

          <div class="form-section-label" style="margin-top:14px">Pricing &amp; condition</div>
          <div class="form-grid">
            <div class="field">
              <label>Asking price</label>
              <div class="price-wrap">
                <span class="price-prefix">$</span>
                <input v-model="productForm.price" type="number" min="1" step="1" class="price-input" />
              </div>
            </div>
            <div class="field">
              <label>Condition</label>
              <div class="condition-row">
                <button
                  v-for="c in ['DS', 'New', 'Used']"
                  :key="c"
                  class="cond-btn"
                  :class="{ active: productForm.condition === c }"
                  type="button"
                  @click="productForm.condition = c"
                >{{ c }}</button>
              </div>
            </div>
          </div>

          <div class="form-section-label" style="margin-top:14px">Media &amp; description</div>
          <div class="form-grid">
            <div class="field full">
              <label>Image URL</label>
              <input v-model="productForm.image" type="text" placeholder="/images/shoes/... or https://..." />
            </div>
            <div class="field full">
              <label>Description</label>
              <textarea v-model="productForm.description" rows="3" placeholder="Box included? Pickup location? Any flaws?"></textarea>
            </div>
          </div>

          <div class="form-footer">
            <label class="toggle-label">
              <input v-model="productForm.active" type="checkbox" />
              Active listing
            </label>
            <div class="form-actions">
              <button v-if="editingId" class="btn sm" @click="resetProductForm">Cancel</button>
              <button class="btn sm primary" :disabled="!canUseMarketplace" @click="saveProduct">
                {{ editingId ? 'Update' : 'Submit listing' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Live preview -->
        <div class="listing-preview">
          <div class="preview-label">Preview</div>
          <div class="preview-card">
            <div class="preview-img-wrap">
              <img
                class="preview-img"
                :src="productForm.image || '/images/shoes/pexels-jonathanborba-12031204.jpg'"
                alt="preview"
              />
              <span class="preview-cond" :class="(productForm.condition || 'New').toLowerCase()">
                {{ productForm.condition || 'New' }}
              </span>
            </div>
            <div class="preview-body">
              <div class="preview-name">{{ productForm.name || 'Shoe name' }}</div>
              <div class="preview-meta">
                <span>{{ (productForm as any).colorway || productForm.brand || 'Brand' }}</span>
                <span v-if="productForm.size"> · Size {{ productForm.size }}</span>
              </div>
              <div class="preview-price">${{ productForm.price > 0 ? productForm.price : '—' }}</div>
              <div class="preview-shop">{{ vendor.name || 'Your shop' }}</div>
            </div>
          </div>
          <p class="preview-note">This is how your listing will appear on Browse after approval.</p>
        </div>
      </div>
    </section>

    <!-- ── Your listings ─────────────────────────────────────────────────── -->
    <section class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-label">Your listings ({{ products.length }})</span>
      </div>

      <div v-if="products.some(p => p.status === 'pending')" class="notice pending-notice">
        Listings awaiting admin review are not visible to shoppers until approved.
      </div>

      <div class="listings-list" v-if="products.length">
        <div class="listing-row" v-for="p in products" :key="p.id">
          <img class="lr-img" :src="p.image || '/images/shoes/pexels-jonathanborba-12031204.jpg'" :alt="p.name" />
          <div class="lr-meta">
            <div class="lr-name">{{ p.name }}</div>
            <div class="lr-sub">
              {{ p.brand || '—' }}
              <template v-if="(p as any).colorway"> · {{ (p as any).colorway }}</template>
              · Size {{ p.size || '—' }} · ${{ p.price }}
            </div>
            <div v-if="p.status === 'pending'" class="hint-pending">Awaiting approval — not visible yet.</div>
            <div v-if="p.status === 'rejected'" class="hint-rejected">Rejected. Edit and resubmit.</div>
          </div>
          <div class="lr-right">
            <span class="status-badge" :class="p.status || 'approved'">
              {{ p.status === 'pending' ? 'Pending' : p.status === 'rejected' ? 'Rejected' : p.status === 'sold' ? 'Sold' : 'Active' }}
            </span>
            <button class="btn sm" @click="startEdit(p)" :disabled="p.status === 'sold'">Edit</button>
            <button v-if="p.status !== 'sold'" class="btn sm" @click="markAsSold(p.id)">Sold</button>
            <button class="btn sm danger" @click="removeProduct(p.id)">Delete</button>
          </div>
        </div>
      </div>
      <div class="empty" v-else>No listings yet. Submit one above.</div>
    </section>
  </div>
</template>

<style scoped>
.sell-page { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.title { margin: 0; color: var(--text); font-size: clamp(1.3rem, 3vw, 1.9rem); font-weight: 900; }
.accent { color: var(--accent); }
.sub { margin: 5px 0 0; color: var(--muted); font-size: 0.9rem; }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Cards */
.card {
  border: 1px solid rgba(156, 255, 0, 0.12);
  border-radius: 10px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: 14px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}
.card-label {
  font-size: 1rem;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.01em;
}

/* Notices */
.notice { border-radius: 6px; padding: 10px 12px; border: 1px solid; margin-bottom: 12px; font-size: 0.88rem; }
.notice.error { border-color: rgba(255,50,50,0.35); color: var(--danger); background: rgba(255,50,50,0.06); }
.notice.ok { border-color: rgba(80,220,120,0.35); color: var(--success); background: rgba(80,220,120,0.06); }
.pending-notice { border-color: rgba(255,180,0,0.3); color: #f5a623; background: rgba(255,180,0,0.05); }

/* Vendor profile compact grid */
.vendor-card { }
.vendor-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.vendor-grid .field.full { grid-column: 1 / -1; }
@media (max-width: 860px) { .vendor-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .vendor-grid { grid-template-columns: 1fr; } }

/* Fields */
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 0.78rem; color: var(--muted); font-weight: 600; }
.field input,
.field textarea,
.field select {
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(156, 255, 0, 0.1);
  background: rgba(255,255,255,0.03);
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.4;
  transition: border-color 0.15s;
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: rgba(156, 255, 0, 0.35);
}
.field textarea { resize: vertical; }

/* Listing form + preview layout */
.listing-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  align-items: start;
}
@media (max-width: 860px) { .listing-layout { grid-template-columns: 1fr; } }

.form-section-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.form-grid .field.full { grid-column: 1 / -1; }
@media (max-width: 520px) { .form-grid { grid-template-columns: 1fr; } }

/* Brand / size quick-select */
.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pill-btn {
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.10);
  background: transparent;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;
}
.pill-btn:hover { border-color: rgba(156,255,0,0.25); color: var(--text); }
.pill-btn.active {
  border-color: rgba(156,255,0,0.5);
  color: var(--text);
  background: rgba(156,255,0,0.06);
}
.pill-row--sm { gap: 4px; }
.pill-btn--sm { padding: 3px 9px; font-size: 0.75rem; }

/* Price input with $ prefix */
.price-wrap {
  display: flex;
  align-items: center;
  border: 1px solid rgba(156, 255, 0, 0.1);
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  overflow: hidden;
  transition: border-color 0.15s;
}
.price-wrap:focus-within { border-color: rgba(156, 255, 0, 0.35); }
.price-prefix {
  padding: 9px 0 9px 12px;
  color: var(--accent);
  font-weight: 900;
  font-size: 0.95rem;
  line-height: 1;
  user-select: none;
}
.price-input {
  border: none !important;
  background: transparent !important;
  padding: 9px 12px 9px 6px !important;
  flex: 1;
  min-width: 0;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: 0 !important;
}
.price-input:focus { outline: none; }

/* Condition selector */
.condition-row { display: flex; gap: 6px; }
.cond-btn {
  flex: 1;
  padding: 8px 6px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.10);
  background: transparent;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.cond-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(156,255,0,0.08);
}

/* Form footer */
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.05);
  flex-wrap: wrap;
}
.toggle-label { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 0.85rem; cursor: pointer; }
.form-actions { display: flex; gap: 8px; }

/* Live preview */
.listing-preview { }
.preview-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 8px;
}
.preview-card {
  border: 1px solid rgba(156, 255, 0, 0.14);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.02);
}
.preview-img-wrap { position: relative; }
.preview-img {
  width: 100%;
  height: 210px;
  object-fit: cover;
  display: block;
}
.preview-cond {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(0,0,0,0.55);
  color: var(--text);
}
.preview-cond.ds { color: var(--accent); }
.preview-cond.new { color: #7ecfff; }
.preview-cond.used { color: var(--muted); }
.preview-body { padding: 10px 12px 12px; }
.preview-name { font-weight: 900; color: var(--text); font-size: 0.95rem; margin-bottom: 3px; }
.preview-meta { font-size: 0.8rem; color: var(--muted); margin-bottom: 6px; }
.preview-price { font-size: 1.1rem; font-weight: 900; color: var(--text); margin-bottom: 4px; }
.preview-shop { font-size: 0.75rem; color: var(--muted); }
.preview-note { font-size: 0.72rem; color: var(--muted); margin-top: 8px; line-height: 1.5; }

/* Listings table */
.listings-list { display: grid; gap: 10px; margin-top: 4px; }
.listing-row {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(156, 255, 0, 0.1);
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
  transition: border-color 0.15s;
}
.listing-row:hover { border-color: rgba(156,255,0,0.2); }
@media (max-width: 600px) {
  .listing-row { grid-template-columns: 68px 1fr; }
  .lr-right { grid-column: 1 / -1; justify-content: flex-start; }
}
.lr-img { width: 80px; height: 60px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(156,255,0,0.12); }
.lr-meta { min-width: 0; }
.lr-name { font-weight: 900; color: var(--text); font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lr-sub { font-size: 0.8rem; color: var(--muted); margin-top: 3px; }
.hint-pending { font-size: 0.75rem; color: #f5a623; margin-top: 3px; }
.hint-rejected { font-size: 0.75rem; color: var(--danger); margin-top: 3px; }
.lr-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

/* Status badges */
.status-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(156,255,0,0.25);
  color: var(--accent);
  background: rgba(156,255,0,0.05);
  white-space: nowrap;
}
.status-badge.pending { border-color: rgba(255,180,0,0.3); color: #f5a623; background: rgba(255,180,0,0.05); }
.status-badge.rejected { border-color: rgba(255,50,50,0.3); color: var(--danger); background: rgba(255,50,50,0.05); }
.status-badge.sold { border-color: rgba(150,150,150,0.25); color: var(--muted); background: transparent; }

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(156,255,0,0.18);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 800;
  font-size: 0.88rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: border-color 0.15s, background 0.15s;
}
.btn:hover { border-color: rgba(156,255,0,0.32); background: rgba(156,255,0,0.04); }
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn.primary:hover { background: #b5ff33; }
.btn.danger { border-color: rgba(255,50,50,0.3); color: var(--danger); }
.btn.sm { padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.empty { color: var(--muted); font-size: 0.88rem; padding: 16px 0; }

@media (max-width: 600px) {
  .sell-page { padding: 20px 12px 60px; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .head-actions { width: 100%; }
}
</style>
