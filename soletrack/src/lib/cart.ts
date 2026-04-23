import { computed, ref, watch } from 'vue'

export type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  image?: string
  vendorUid?: string
  vendorName?: string
  maxQty?: number
}

const STORAGE_KEY = 'soletrack_cart_v2'
const LEGACY_KEY = 'soletrack_cart_v1'

function normalizeMaxQty(maxQty: unknown, vendorUid?: string): number | undefined {
  const n = Number(maxQty)
  if (Number.isFinite(n) && n > 0) return Math.floor(n)
  // Marketplace listings are single-pair by default unless explicitly overridden.
  if (typeof vendorUid === 'string' && vendorUid.length > 0) return 1
  return undefined
}

function clampQty(qty: number, maxQty?: number) {
  const base = Math.max(1, Math.floor(Number.isFinite(qty) ? qty : 1))
  if (typeof maxQty === 'number' && maxQty > 0) return Math.min(base, maxQty)
  return base
}

function loadCart(): CartItem[] {
  const parse = (raw: string | null): CartItem[] => {
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x.id === 'string')
      .map((x) => {
        const vendorUid = typeof x.vendorUid === 'string' ? String(x.vendorUid) : undefined
        const maxQty = normalizeMaxQty((x as any).maxQty, vendorUid)
        return {
          id: String(x.id),
          name: String(x.name ?? ''),
          price: Number(x.price ?? 0),
          qty: clampQty(Number(x.qty ?? 1), maxQty),
          image: x.image ? String(x.image) : undefined,
          vendorUid,
          vendorName: typeof x.vendorName === 'string' ? String(x.vendorName) : undefined,
          maxQty,
        }
      })
  }

  try {
    const v2 = parse(localStorage.getItem(STORAGE_KEY))
    if (v2.length) return v2
    const v1 = parse(localStorage.getItem(LEGACY_KEY))
    if (v1.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v1))
      localStorage.removeItem(LEGACY_KEY)
    }
    return v1
  } catch {
    return []
  }
}

const items = ref<CartItem[]>(loadCart())

watch(
  items,
  (v) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  },
  { deep: true },
)

export function useCart() {
  const totalCount = computed(() => items.value.reduce((a, i) => a + i.qty, 0))
  const subtotal = computed(() => items.value.reduce((a, i) => a + i.qty * i.price, 0))

  function add(item: Omit<CartItem, 'qty'>, qty = 1) {
    const itemMaxQty = normalizeMaxQty(item.maxQty, item.vendorUid)
    const q = clampQty(qty, itemMaxQty)
    const existing = items.value.find((i) => i.id === item.id)
    if (existing) {
      const maxQty = normalizeMaxQty(item.maxQty ?? existing.maxQty, item.vendorUid ?? existing.vendorUid)
      existing.maxQty = maxQty
      existing.qty = clampQty(existing.qty + q, maxQty)
      existing.price = item.price
      existing.name = item.name
      existing.image = item.image
      existing.vendorUid = item.vendorUid
      existing.vendorName = item.vendorName
      return
    }
    items.value.push({ ...item, qty: q, maxQty: itemMaxQty })
  }

  function remove(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function setQty(id: string, qty: number) {
    const it = items.value.find((i) => i.id === id)
    if (!it) return
    const maxQty = normalizeMaxQty(it.maxQty, it.vendorUid)
    it.maxQty = maxQty
    it.qty = clampQty(qty, maxQty)
  }

  function clear() {
    items.value = []
  }

  return { items, totalCount, subtotal, add, remove, setQty, clear }
}
