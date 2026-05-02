<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isDemoMode } from '@/lib/demo'
import { useRole } from '@/lib/role'
import {
  getOrSeedAdminDemoQueue,
  getDemoAdminProducts,
  approveProductById,
  rejectProductById,
  restoreProductById,
} from '@/lib/demoStore'

const { isAdmin } = useRole()

type KanbanProduct = {
  id: string
  name: string
  brand: string
  size?: string
  price: number
  condition?: string
  image?: string
  vendorName: string
  vendorUid: string
  description?: string
  status?: string
}

const pending = ref<KanbanProduct[]>([])
const active = ref<KanbanProduct[]>([])
const rejected = ref<KanbanProduct[]>([])
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function flash(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2500)
}

function loadColumns() {
  const groups = getDemoAdminProducts()
  pending.value = groups.pending as KanbanProduct[]
  active.value = groups.active as KanbanProduct[]
  rejected.value = groups.rejected as KanbanProduct[]
}

onMounted(() => {
  if (!isDemoMode()) return
  getOrSeedAdminDemoQueue()
  loadColumns()
})

function approve(p: KanbanProduct) {
  approveProductById(p.id)
  loadColumns()
  flash(`"${p.name}" approved — now live in Browse.`)
}

function reject(p: KanbanProduct) {
  rejectProductById(p.id)
  loadColumns()
  flash(`"${p.name}" rejected.`)
}

function restore(p: KanbanProduct) {
  restoreProductById(p.id)
  loadColumns()
  flash(`"${p.name}" moved back to pending.`)
}

const FALLBACK = '/images/shoes/pexels-jonathanborba-12031204.jpg'

const totalPending = computed(() => pending.value.length)
</script>

<template>
  <div class="admin-page">
    <div v-if="!isAdmin" class="denied">
      <p>Admin access required.</p>
    </div>

    <template v-else>
      <div class="page-header">
        <div>
          <h1 class="page-title">Admin <span class="accent">Portal</span></h1>
          <p class="page-sub">Review and approve seller listings before they go live.</p>
        </div>
        <div v-if="totalPending > 0" class="pending-alert">
          {{ totalPending }} pending
        </div>
      </div>

      <Transition name="toast">
        <div v-if="toast" class="action-toast">{{ toast }}</div>
      </Transition>

      <div class="kanban">
        <!-- PENDING -->
        <div class="col">
          <div class="col-head pending-head">
            <span class="col-title">Pending</span>
            <span class="col-count">{{ pending.length }}</span>
          </div>

          <div v-if="!pending.length" class="col-empty">
            <span>Queue is clear</span>
          </div>

          <div v-else class="col-cards">
            <div class="kcard" v-for="p in pending" :key="p.id">
              <img
                class="kcard-img"
                :src="p.image || FALLBACK"
                :alt="p.name"
                @error="($event.target as HTMLImageElement).src = FALLBACK"
              />
              <div class="kcard-body">
                <div class="kcard-brand">{{ p.brand }}</div>
                <div class="kcard-name">{{ p.name }}</div>
                <div class="kcard-meta">
                  <span v-if="p.size">Size {{ p.size }}</span>
                  <span>${{ p.price }}</span>
                  <span v-if="p.condition" class="cond-chip" :class="(p.condition || '').toLowerCase()">{{ p.condition }}</span>
                </div>
                <div class="kcard-vendor">{{ p.vendorName }}</div>
                <p v-if="p.description" class="kcard-desc">{{ p.description }}</p>
              </div>
              <div class="kcard-actions">
                <button class="ka-btn approve" @click="approve(p)">Approve</button>
                <button class="ka-btn reject" @click="reject(p)">Reject</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ACTIVE -->
        <div class="col">
          <div class="col-head active-head">
            <span class="col-title">Active</span>
            <span class="col-count">{{ active.length }}</span>
          </div>

          <div v-if="!active.length" class="col-empty">
            <span>No active listings</span>
          </div>

          <div v-else class="col-cards">
            <div class="kcard" v-for="p in active" :key="p.id">
              <img
                class="kcard-img"
                :src="p.image || FALLBACK"
                :alt="p.name"
                @error="($event.target as HTMLImageElement).src = FALLBACK"
              />
              <div class="kcard-body">
                <div class="kcard-brand">{{ p.brand }}</div>
                <div class="kcard-name">{{ p.name }}</div>
                <div class="kcard-meta">
                  <span v-if="p.size">Size {{ p.size }}</span>
                  <span>${{ p.price }}</span>
                  <span v-if="p.condition" class="cond-chip" :class="(p.condition || '').toLowerCase()">{{ p.condition }}</span>
                </div>
                <div class="kcard-vendor">{{ p.vendorName }}</div>
              </div>
              <div class="kcard-actions">
                <button class="ka-btn reject" @click="reject(p)">Remove</button>
              </div>
            </div>
          </div>
        </div>

        <!-- REJECTED -->
        <div class="col">
          <div class="col-head rejected-head">
            <span class="col-title">Rejected</span>
            <span class="col-count">{{ rejected.length }}</span>
          </div>

          <div v-if="!rejected.length" class="col-empty">
            <span>Nothing rejected</span>
          </div>

          <div v-else class="col-cards">
            <div class="kcard rejected-card" v-for="p in rejected" :key="p.id">
              <img
                class="kcard-img"
                :src="p.image || FALLBACK"
                :alt="p.name"
                @error="($event.target as HTMLImageElement).src = FALLBACK"
              />
              <div class="kcard-body">
                <div class="kcard-brand">{{ p.brand }}</div>
                <div class="kcard-name">{{ p.name }}</div>
                <div class="kcard-meta">
                  <span v-if="p.size">Size {{ p.size }}</span>
                  <span>${{ p.price }}</span>
                </div>
                <div class="kcard-vendor">{{ p.vendorName }}</div>
              </div>
              <div class="kcard-actions">
                <button class="ka-btn restore" @click="restore(p)">Restore</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 16px 100px;
}

.denied {
  text-align: center;
  padding: 80px 24px;
  color: var(--muted);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.02em;
}
.accent { color: var(--accent); }
.page-sub { margin: 5px 0 0; color: var(--muted); font-size: 0.88rem; }

.pending-alert {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(245, 166, 35, 0.35);
  background: rgba(245, 166, 35, 0.08);
  color: #f5a623;
  font-weight: 800;
  font-size: 0.85rem;
  white-space: nowrap;
  align-self: center;
}

/* Kanban layout */
.kanban {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 860px) {
  .kanban { grid-template-columns: 1fr; }
}

.col {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.pending-head  { background: rgba(245, 166, 35, 0.07); }
.active-head   { background: rgba(var(--accent-rgb), 0.07); }
.rejected-head { background: rgba(255, 107, 107, 0.07); }

.col-title {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text);
}

.col-count {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted);
}

.col-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--muted);
  font-size: 0.85rem;
}

.col-cards {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--border);
}

/* Card */
.kcard {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg);
  transition: background 0.15s;
}
.kcard:hover { background: var(--surface-1, rgba(255,255,255,0.02)); }
.rejected-card { opacity: 0.65; }

.kcard-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
  display: block;
}

.kcard-body { flex: 1; min-width: 0; }

.kcard-brand {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 3px;
}

.kcard-name {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 6px;
  line-height: 1.3;
}

.kcard-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  font-size: 0.8rem;
  color: var(--muted);
}

.cond-chip {
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--muted);
}
.cond-chip.ds  { color: var(--accent); border-color: rgba(var(--accent-rgb),0.25); }
.cond-chip.new { color: #7ecfff; border-color: rgba(126,207,255,0.25); }

.kcard-vendor {
  font-size: 0.76rem;
  color: var(--muted);
  margin-bottom: 4px;
}

.kcard-desc {
  font-size: 0.78rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Actions */
.kcard-actions {
  display: flex;
  gap: 8px;
}

.ka-btn {
  flex: 1;
  padding: 8px 10px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s, background 0.15s;
  white-space: nowrap;
}
.ka-btn:hover { opacity: 0.85; }

.approve {
  background: var(--accent);
  color: #0b1205;
}
.reject {
  background: transparent;
  border-color: rgba(255, 80, 80, 0.35);
  color: rgba(255, 120, 120, 0.9);
}
.reject:hover { background: rgba(255, 80, 80, 0.06); }
.restore {
  background: transparent;
  border-color: rgba(245, 166, 35, 0.35);
  color: #f5a623;
}
.restore:hover { background: rgba(245, 166, 35, 0.06); }

/* Toast */
.action-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: #0b1205;
  font-weight: 700;
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 0.88rem;
  z-index: 200;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(6px); }
</style>
