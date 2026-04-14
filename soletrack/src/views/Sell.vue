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

const productForm = ref<Omit<ProductDoc, 'vendorUid' | 'vendorName'>>({
  name: '',
  brand: '',
  size: '',
  price: 0,
  condition: 'New',
  image: '',
  description: '',
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
    active: true,
  }
}

function startEdit(p: { id: string } & ProductDoc) {
  editingId.value = p.id
  productForm.value = {
    name: p.name,
    brand: p.brand ?? '',
    size: p.size ?? '',
    price: p.price,
    condition: p.condition ?? 'New',
    image: p.image ?? '',
    description: p.description ?? '',
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
        image: 'https://images.unsplash.com/photo-g1vk_Bef2Xk?w=600&q=80&auto=format&fit=crop',
        description: 'Clean, ready for pickup. Box included.',
      },
      {
        name: 'Air Jordan 1 Retro High OG',
        brand: 'Jordan',
        size: '10.5',
        price: 305,
        condition: 'DS',
        image: 'https://images.unsplash.com/photo-aDZ5YIuedQg?w=600&q=80&auto=format&fit=crop',
        description: 'Deadstock, never worn. Local pickup only.',
      },
      {
        name: 'New Balance 550 White Green',
        brand: 'New Balance',
        size: '9.5',
        price: 140,
        condition: 'New',
        image: 'https://images.unsplash.com/photo-3bBihBr7wRE?w=600&q=80&auto=format&fit=crop',
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
    <div class="head">
      <div>
        <h1 class="title">Sell on <span class="accent">SoleTrack</span></h1>
        <p class="sub">Create your vendor profile and list products for demo checkout.</p>
      </div>
      <div class="head-actions">
        <router-link v-if="uid" class="btn" :to="`/vendor/${uid}`">View shop</router-link>
        <router-link v-if="uid" class="btn" to="/vendor-orders">View orders</router-link>
      </div>
    </div>

    <div v-if="error" class="notice error">{{ error }}</div>
    <div v-if="status" class="notice ok">{{ status }}</div>

    <div class="grid">
      <section class="panel">
        <h2 class="panel-title">Vendor profile</h2>

        <div class="form">
          <div class="row">
            <label>Shop name</label>
            <input v-model="vendor.name" type="text" placeholder="Your shop name" />
          </div>
          <div class="row">
            <label>Location</label>
            <input v-model="vendor.location" type="text" placeholder="City, State" />
          </div>
          <div class="row">
            <label>Contact email</label>
            <input v-model="vendor.contactEmail" type="email" placeholder="you@example.com" />
          </div>
          <div class="row">
            <label>Minimum order (pairs)</label>
            <input v-model="vendor.minOrder" type="number" min="1" />
          </div>
          <div class="row">
            <label>Description</label>
            <textarea v-model="vendor.description" rows="4" placeholder="What do you sell? Pickup hours?"></textarea>
          </div>
        </div>

        <div class="actions">
          <button class="btn primary" :disabled="!canUseMarketplace" @click="saveVendor">Save vendor</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">Your products</h2>
          <button class="btn" :disabled="!canUseMarketplace" @click="addSampleListings">Add sample listings</button>
        </div>

        <div class="product-form">
          <div class="form-grid">
            <div class="row">
              <label>Product name</label>
              <input v-model="productForm.name" type="text" placeholder="e.g. Air Jordan 1 High OG" />
            </div>
            <div class="row">
              <label>Brand</label>
              <input v-model="productForm.brand" type="text" placeholder="Nike / Jordan / Adidas" />
            </div>
            <div class="row">
              <label>Size</label>
              <input v-model="productForm.size" type="text" placeholder="10 / 10.5" />
            </div>
            <div class="row">
              <label>Condition</label>
              <select v-model="productForm.condition">
                <option>New</option>
                <option>Used</option>
                <option>DS</option>
              </select>
            </div>
            <div class="row">
              <label>Price</label>
              <input v-model="productForm.price" type="number" min="1" step="1" />
            </div>
            <div class="row">
              <label>Image URL</label>
              <input v-model="productForm.image" type="text" placeholder="/images/shoes/..." />
            </div>
          </div>
          <div class="row">
            <label>Description</label>
            <textarea v-model="productForm.description" rows="3" placeholder="Short description"></textarea>
          </div>
          <div class="row inline">
            <label>
              <input v-model="productForm.active" type="checkbox" />
              Active listing
            </label>
          </div>
          <div class="actions">
            <button class="btn primary" :disabled="!canUseMarketplace" @click="saveProduct">
              {{ editingId ? 'Update product' : 'List product' }}
            </button>
            <button v-if="editingId" class="btn" @click="resetProductForm">Cancel</button>
          </div>
        </div>

        <div class="list" v-if="products.length">
          <div class="item" v-for="p in products" :key="p.id">
            <img class="thumb" :src="p.image || '/images/shoes/pexels-jonathanborba-12031204.jpg'" :alt="p.name" />
            <div class="meta">
              <div class="name">{{ p.name }}</div>
              <div class="muted">{{ p.brand || '—' }} · {{ p.size || '—' }} · ${{ p.price }}</div>
            </div>
            <div class="right">
              <span class="status-badge" :class="p.status || 'approved'">
                {{ p.status === 'pending' ? 'Pending' : p.status === 'rejected' ? 'Rejected' : p.status === 'sold' ? 'Sold' : 'Active' }}
              </span>
              <button class="btn sm" @click="startEdit(p)" :disabled="p.status === 'sold'">Edit</button>
              <button
                v-if="p.status !== 'sold'"
                class="btn sm"
                @click="markAsSold(p.id)"
                title="Mark as sold"
              >Sold</button>
              <button class="btn sm danger" @click="removeProduct(p.id)">Delete</button>
            </div>
          </div>
        </div>
        <div class="empty muted" v-else>
          No products yet. Add one above to start selling.
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sell-page { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
.title { margin: 0; color: var(--text); font-size: clamp(1.4rem, 3vw, 2.1rem); }
.accent { color: var(--accent); }
.sub { margin: 6px 0 0; color: var(--muted); }
.head-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }

@media (max-width: 600px) {
  .sell-page { padding: 20px 12px 60px; }
  .head { flex-direction: column; align-items: flex-start; }
  .head-actions { width: 100%; }
  .head-actions .btn { width: 100%; text-align: center; justify-content: center; }
  .actions { justify-content: stretch; }
  .actions .btn { flex: 1; }
  .item { grid-template-columns: 52px 1fr; }
  .right { grid-column: 1 / -1; justify-content: flex-start; }
}

.panel {
  border: 1px solid rgba(156, 255, 0, 0.12);
  border-radius: 16px;
  padding: 16px;
  background: rgba(255,255,255,0.02);
}
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.panel-title { margin: 0 0 12px; color: var(--text); font-size: 1.05rem; }

.notice { border-radius: 12px; padding: 10px 12px; border: 1px solid; margin: 10px 0; }
.notice.error { border-color: rgba(255,50,50,0.35); color: var(--danger); background: rgba(255,50,50,0.06); }
.notice.ok { border-color: rgba(80,220,120,0.35); color: var(--success); background: rgba(80,220,120,0.06); }

.form { display: grid; gap: 10px; }
.row { display: grid; gap: 6px; }
.row.inline { display: flex; align-items: center; gap: 10px; }
.row label { color: var(--muted); font-size: 0.82rem; }
.row input, .row textarea, .row select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 0.95rem;
}
.actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px; flex-wrap: wrap; }

.product-form { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 14px; margin-top: 10px; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (max-width: 520px) { .form-grid { grid-template-columns: 1fr; } }

.list { margin-top: 14px; display: grid; gap: 10px; }
.item {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
}
.thumb { width: 64px; height: 48px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(156, 255, 0, 0.10); }
.meta { min-width: 0; }
.name { color: var(--text); font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.muted { color: var(--muted); font-size: 0.85rem; }
.right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

.status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(156, 255, 0, 0.25);
  color: var(--accent);
  background: rgba(156, 255, 0, 0.06);
}
.status-badge.pending { border-color: rgba(255, 180, 0, 0.3); color: #f5a623; background: rgba(255, 180, 0, 0.06); }
.status-badge.rejected { border-color: rgba(255, 50, 50, 0.3); color: var(--danger); background: rgba(255, 50, 50, 0.06); }
.status-badge.sold { border-color: rgba(150, 150, 150, 0.3); color: var(--muted); background: rgba(150, 150, 150, 0.05); }

.btn {
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
.btn.danger { border-color: rgba(255,50,50,0.35); color: var(--danger); }
.btn.sm { padding: 6px 10px; font-size: 0.8rem; font-weight: 800; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.empty { margin-top: 14px; }
</style>
