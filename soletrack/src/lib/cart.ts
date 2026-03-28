import { computed, ref, watch } from 'vue'

export type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  image?: string
}

const STORAGE_KEY = 'soletrack_cart_v1'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x.id === 'string')
      .map((x) => ({
        id: String(x.id),
        name: String(x.name ?? ''),
        price: Number(x.price ?? 0),
        qty: Math.max(1, Number(x.qty ?? 1)),
        image: x.image ? String(x.image) : undefined,
      }))
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
    const q = Math.max(1, Math.floor(qty))
    const existing = items.value.find((i) => i.id === item.id)
    if (existing) {
      existing.qty += q
      existing.price = item.price
      existing.name = item.name
      existing.image = item.image
      return
    }
    items.value.push({ ...item, qty: q })
  }

  function remove(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function setQty(id: string, qty: number) {
    const q = Math.max(1, Math.floor(qty))
    const it = items.value.find((i) => i.id === id)
    if (!it) return
    it.qty = q
  }

  function clear() {
    items.value = []
  }

  return { items, totalCount, subtotal, add, remove, setQty, clear }
}

