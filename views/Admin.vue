<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { useAuth } from '@/lib/auth'
import { useRole } from '@/lib/role'
import { db, demoMode, firebaseConfigured } from '@/lib/firebase'
import {
  approveDemoProduct,
  getDemoPendingProducts,
  getOrSeedDemoProducts,
  rejectDemoProduct,
} from '@/lib/demoStore'

type ProductDoc = {
  id: string
  vendorUid: string
  vendorName?: string
  name: string
  brand?: string
  size?: string
  price: number
  condition?: string
  image?: string
  status: string
  createdAt?: any
}

const router = useRouter()
const { user, ready } = useAuth()
const { isAdmin } = useRole()

const loading = ref(true)
const error = ref('')
const pending = ref<ProductDoc[]>([])
const allProducts = ref<ProductDoc[]>([])

const rejectId = ref<string | null>(null)
const rejectNote = ref('')

let stopListener: (() => void) | null = null

onMounted(() => {
  ;(async () => {
    await ready
    if (!user.value) {
      router.push('/login')
      return
    }

    if (demoMode) {
      allProducts.value = getOrSeedDemoProducts() as any
      pending.value = getDemoPendingProducts() as any
      loading.value = false
      return
    }

    if (!firebaseConfigured || !db) {
      error.value = 'Firebase is not configured.'
      loading.value = false
      return
    }

    if (!isAdmin.value) {
      error.value = 'You do not have admin access. Ask a current admin to set role: admin on your user document.'
      loading.value = false
      return
    }

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'))
    stopListener = onSnapshot(
      q,
      (snap) => {
        allProducts.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductDoc, 'id'>) }))
        pending.value = allProducts.value.filter((p) => p.status === 'pending')
        loading.value = false
      },
      () => {
        error.value = 'Could not load products.'
        loading.value = false
      },
    )
  })()
})

onBeforeUnmount(() => stopListener?.())

async function approve(id: string) {
  if (demoMode) {
    approveDemoProduct(id)
    allProducts.value = getOrSeedDemoProducts() as any
    pending.value = getDemoPendingProducts() as any
    return
  }
  if (!db || !user.value) return
  try {
    await updateDoc(doc(db, 'products', id), { status: 'approved', updatedAt: serverTimestamp() })
    await addDoc(collection(db, 'adminActions'), {
      adminId: user.value.uid,
      itemId: id,
      action: 'approve',
      note: null,
      createdAt: serverTimestamp(),
    })
  } catch {
    error.value = 'Could not approve listing.'
  }
}

function openReject(id: string) {
  rejectId.value = id
  rejectNote.value = ''
}

function cancelReject() {
  rejectId.value = null
  rejectNote.value = ''
}

async function confirmReject() {
  if (!rejectId.value) return
  const id = rejectId.value

  if (demoMode) {
    rejectDemoProduct(id, rejectNote.value)
    allProducts.value = getOrSeedDemoProducts() as any
    pending.value = getDemoPendingProducts() as any
    rejectId.value = null
    rejectNote.value = ''
    return
  }

  if (!db || !user.value) return
  try {
    await updateDoc(doc(db, 'products', id), { status: 'rejected', updatedAt: serverTimestamp() })
    await addDoc(collection(db, 'adminActions'), {
      adminId: user.value.uid,
      itemId: id,
      action: 'reject',
      note: rejectNote.value || null,
      createdAt: serverTimestamp(),
    })
    rejectId.value = null
    rejectNote.value = ''
  } catch {
    error.value = 'Could not reject listing.'
  }
}

const counts = computed(() => {
  const c = { pending: 0, approved: 0, rejected: 0, sold: 0 }
  for (const p of allProducts.value) {
    const key = p.status as keyof typeof c
    if (key in c) c[key]++
  }
  return c
})

const avgByBrand = computed(() => {
  const map = new Map<string, { sum: number; count: number }>()
  for (const p of allProducts.value.filter((p) => p.status === 'approved')) {
    const b = p.brand || 'Other'
    const cur = map.get(b) ?? { sum: 0, count: 0 }
    cur.sum += p.price
    cur.count++
    map.set(b, cur)
  }
  return Array.from(map.entries())
    .map(([brand, { sum, count }]) => ({ brand, avg: Math.round(sum / count), count }))
    .sort((a, b) => b.avg - a.avg)
})
</script>

<template>
  <div class="admin-page">
    <div class="page-head">
      <h1>Admin Review</h1>
      <p class="sub">Review pending listings before they appear in Browse.</p>
    </div>

    <div v-if="demoMode" class="demo-banner">
      Demo mode — approve or reject the listings below. Approved listings become visible on Browse.
    </div>

    <div v-if="error" class="notice error">{{ error }}</div>

    <div v-if="loading" class="loading">Loading…</div>

    <template v-else-if="!error">
      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-num">{{ counts.pending }}</span>
          <span class="stat-lbl">pending</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ counts.approved }}</span>
          <span class="stat-lbl">approved</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ counts.rejected }}</span>
          <span class="stat-lbl">rejected</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ counts.sold }}</span>
          <span class="stat-lbl">sold</span>
        </div>
      </div>

      <!-- Pending queue -->
      <section class="section">
        <h2 class="section-title">Pending Listings</h2>

        <div v-if="pending.length === 0" class="empty">
          No listings awaiting review.
        </div>

        <div class="queue" v-else>
          <div class="listing-row" v-for="p in pending" :key="p.id">
            <img
              class="listing-img"
              :src="p.image || '/images/shoes/pexels-jonathanborba-12031204.jpg'"
              :alt="p.name"
            />
            <div class="listing-info">
              <div class="listing-name">{{ p.name }}</div>
              <div class="listing-meta">
                {{ p.brand || '—' }} · Size {{ p.size || '—' }} · ${{ p.price }} · {{ p.condition || '—' }}
              </div>
              <div class="listing-vendor">by {{ p.vendorName || 'Unknown vendor' }}</div>
            </div>
            <div class="listing-actions">
              <button class="btn approve" @click="approve(p.id)">Approve</button>
              <button class="btn reject" @click="openReject(p.id)">Reject</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats: avg price by brand -->
      <section class="section" v-if="avgByBrand.length">
        <h2 class="section-title">Avg Price by Brand (approved listings)</h2>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Avg Price</th>
              <th>Listings</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in avgByBrand" :key="row.brand">
              <td class="td-brand">{{ row.brand }}</td>
              <td>${{ row.avg }}</td>
              <td>{{ row.count }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Reject modal -->
    <div class="modal-overlay" v-if="rejectId" @click.self="cancelReject">
      <div class="modal">
        <h3>Reject listing</h3>
        <p class="modal-sub">Optionally provide a reason. The vendor will not be notified in demo mode.</p>
        <div class="form-row">
          <label>Reason (optional)</label>
          <textarea v-model="rejectNote" rows="3" placeholder="e.g. Price too high, missing details…"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn reject" @click="confirmReject">Confirm reject</button>
          <button class="btn" @click="cancelReject">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page { max-width: 900px; margin: 0 auto; padding: 28px 16px 80px; }

.page-head { margin-bottom: 20px; }
.page-head h1 { margin: 0; font-size: clamp(1.4rem, 3vw, 2rem); color: var(--text); }
.sub { margin: 6px 0 0; color: var(--muted); font-size: 0.9rem; }

.demo-banner {
  padding: 10px 14px;
  border: 1px solid rgba(156, 255, 0, 0.2);
  border-radius: 8px;
  background: rgba(156, 255, 0, 0.05);
  color: var(--muted);
  font-size: 0.88rem;
  margin-bottom: 20px;
}

.notice.error {
  padding: 10px 14px;
  border: 1px solid rgba(255, 50, 50, 0.35);
  border-radius: 8px;
  background: rgba(255, 50, 50, 0.06);
  color: var(--danger);
  margin-bottom: 16px;
}

.loading { color: var(--muted); padding: 40px 0; }

/* Stats bar */
.stats-bar {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 28px;
}
.stat-item { display: flex; flex-direction: column; gap: 2px; }
.stat-num { font-size: 1.5rem; font-weight: 700; color: var(--text); }
.stat-lbl { font-size: 0.8rem; color: var(--muted); }

/* Sections */
.section { margin-bottom: 40px; }
.section-title { margin: 0 0 14px; font-size: 1rem; color: var(--text); font-weight: 700; }

.empty { color: var(--muted); font-size: 0.9rem; padding: 20px 0; }

/* Pending queue */
.queue { display: grid; gap: 8px; }
.listing-row {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}
@media (max-width: 560px) {
  .listing-row { grid-template-columns: 56px 1fr; }
  .listing-actions { grid-column: 1 / -1; display: flex; gap: 8px; }
}

.listing-img {
  width: 72px;
  height: 54px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid rgba(156, 255, 0, 0.1);
}
.listing-info { min-width: 0; }
.listing-name { font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.listing-meta { font-size: 0.84rem; color: var(--muted); margin-top: 2px; }
.listing-vendor { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }

.listing-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* Buttons */
.btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
}
.btn.approve {
  border-color: rgba(80, 200, 120, 0.35);
  color: var(--success);
  background: rgba(80, 200, 120, 0.06);
}
.btn.approve:hover { background: rgba(80, 200, 120, 0.12); }
.btn.reject {
  border-color: rgba(255, 50, 50, 0.35);
  color: var(--danger);
  background: rgba(255, 50, 50, 0.06);
}
.btn.reject:hover { background: rgba(255, 50, 50, 0.12); }

/* Stats table */
.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.stats-table th {
  text-align: left;
  padding: 10px 14px;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.stats-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text);
}
.stats-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
.td-brand { font-weight: 700; }

/* Reject modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 16px;
}
.modal {
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
}
.modal h3 { margin: 0 0 6px; color: var(--text); font-size: 1rem; }
.modal-sub { margin: 0 0 16px; color: var(--muted); font-size: 0.85rem; }
.form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-row label { font-size: 0.8rem; color: var(--muted); }
.form-row textarea {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
  resize: vertical;
}
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
</style>
