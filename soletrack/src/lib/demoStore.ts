import type { DemoProduct } from './demoMarketplace'
import { isDemoBuyer } from './demo'

export type DemoUser = {
  uid: string
  displayName: string
  email: string
}

export type DemoSale = {
  id: string
  shoe: string
  size: string
  buyPrice: number | null
  sellPrice: number
  date: string
  platform: string
  qty?: number
  source?: 'manual' | 'order'
  orderId?: string
  checkoutId?: string
}

export type DemoVendorProfile = {
  name: string
  location?: string
  description?: string
  contactEmail?: string
  minOrder?: number
}

const USER_KEY = 'soletrack_demo_user_v1'
const SALES_KEY = 'soletrack_demo_sales_v1'
const VENDOR_KEY = 'soletrack_demo_vendor_v1'
const PRODUCTS_KEY = 'soletrack_demo_products_v1'
const ORDERS_KEY = 'soletrack_demo_orders_v1'
const MESSAGES_KEY = 'soletrack_demo_messages_v1'
export const DEMO_SELLER_UID = '__demo__me'
export const DEMO_BUYER_UID = '__demo__buyer'

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function safeJsonStringify(v: unknown) {
  try {
    return JSON.stringify(v)
  } catch {
    return ''
  }
}

export const DEMO_BUYER_USER: DemoUser = {
  uid: DEMO_BUYER_UID,
  displayName: 'Demo Buyer',
  email: 'buyer@soletrack.app',
}

function migrateDemoSellerUidReferences(fromUid: string, toUid: string) {
  if (typeof window === 'undefined' || !fromUid || !toUid || fromUid === toUid) return

  const storedProducts = safeJsonParse<Array<Record<string, unknown>>>(
    window.localStorage.getItem(PRODUCTS_KEY),
  )
  if (Array.isArray(storedProducts) && storedProducts.length) {
    let changed = false
    const nextProducts = storedProducts.map((p) => {
      if (p.vendorUid === fromUid) {
        changed = true
        return { ...p, vendorUid: toUid }
      }
      return p
    })
    if (changed) window.localStorage.setItem(PRODUCTS_KEY, safeJsonStringify(nextProducts))
  }

  const storedOrders = safeJsonParse<Array<Record<string, unknown>>>(window.localStorage.getItem(ORDERS_KEY))
  if (Array.isArray(storedOrders) && storedOrders.length) {
    let changed = false
    const nextOrders = storedOrders.map((o) => {
      if (o.vendorUid === fromUid) {
        changed = true
        return { ...o, vendorUid: toUid }
      }
      return o
    })
    if (changed) window.localStorage.setItem(ORDERS_KEY, safeJsonStringify(nextOrders))
  }
}

export function getOrSeedDemoUser(): DemoUser {
  if (typeof window === 'undefined') {
    return { uid: DEMO_SELLER_UID, displayName: 'Demo Reseller', email: 'demo@soletrack.app' }
  }
  const existing = safeJsonParse<DemoUser>(window.localStorage.getItem(USER_KEY))
  if (existing?.uid && existing.displayName && existing.email) {
    const normalized: DemoUser = {
      uid: DEMO_SELLER_UID,
      displayName: existing.displayName,
      email: existing.email,
    }
    if (existing.uid !== normalized.uid) {
      migrateDemoSellerUidReferences(existing.uid, normalized.uid)
      window.localStorage.setItem(USER_KEY, safeJsonStringify(normalized))
    }
    return normalized
  }
  const seeded: DemoUser = { uid: DEMO_SELLER_UID, displayName: 'Demo Reseller', email: 'demo@soletrack.app' }
  window.localStorage.setItem(USER_KEY, safeJsonStringify(seeded))
  return seeded
}

/** Returns the active demo user — buyer persona if buyer mode is on, seller/vendor otherwise. */
export function getCurrentDemoUser(): DemoUser {
  if (isDemoBuyer()) return DEMO_BUYER_USER
  return getOrSeedDemoUser()
}

export function getOrSeedDemoSales(): DemoSale[] {
  if (typeof window === 'undefined') return []
  const existing = safeJsonParse<DemoSale[]>(window.localStorage.getItem(SALES_KEY))
  if (Array.isArray(existing) && existing.length) return existing

  const seeded: DemoSale[] = [
    {
      id: 'sale-1',
      shoe: 'Nike Dunk Low Retro',
      size: '9.5',
      buyPrice: 120,
      sellPrice: 175,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString().slice(0, 10),
      platform: 'GOAT',
    },
    {
      id: 'sale-2',
      shoe: 'Air Jordan 1 High OG',
      size: '10',
      buyPrice: 210,
      sellPrice: 330,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString().slice(0, 10),
      platform: 'StockX',
    },
    {
      id: 'sale-3',
      shoe: 'New Balance 550',
      size: '10',
      buyPrice: 95,
      sellPrice: 155,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString().slice(0, 10),
      platform: 'eBay',
    },
  ]
  window.localStorage.setItem(SALES_KEY, safeJsonStringify(seeded))
  return seeded
}

export function saveDemoSales(sales: DemoSale[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SALES_KEY, safeJsonStringify(sales))
}

export function addDemoSale(sale: Omit<DemoSale, 'id'>) {
  const current = getOrSeedDemoSales()
  const id = `sale-${Date.now()}`
  const next = [{ id, ...sale }, ...current]
  saveDemoSales(next)
  return next
}

export function deleteDemoSale(id: string) {
  const current = getOrSeedDemoSales()
  const next = current.filter((s) => s.id !== id)
  saveDemoSales(next)
  return next
}

export function getOrSeedDemoVendor(): DemoVendorProfile {
  if (typeof window === 'undefined') return { name: 'Demo Vault', minOrder: 1 }
  const existing = safeJsonParse<DemoVendorProfile>(window.localStorage.getItem(VENDOR_KEY))
  if (existing?.name) return existing
  const seeded: DemoVendorProfile = {
    name: 'Demo Vault',
    location: 'Newark, NJ',
    description: 'Small batch vendor for presentation. Fast pickup, clean pairs, and quick replies.',
    contactEmail: 'demo.vault@soletrack.app',
    minOrder: 1,
  }
  window.localStorage.setItem(VENDOR_KEY, safeJsonStringify(seeded))
  return seeded
}

export function saveDemoVendor(vendor: DemoVendorProfile) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VENDOR_KEY, safeJsonStringify(vendor))
}

// Products stored in demo mode include a `status` field for listing availability.
type DemoProductStored = { id: string; status?: string } & Omit<DemoProduct, 'id'>

export function getOrSeedDemoProducts(): DemoProductStored[] {
  if (typeof window === 'undefined') return []
  const existing = safeJsonParse<DemoProductStored[]>(window.localStorage.getItem(PRODUCTS_KEY))
  if (Array.isArray(existing) && existing.length) return existing

  const v = getOrSeedDemoVendor()

  // Seed active listings (immediately visible in Browse).
  const seeded: DemoProductStored[] = [
    {
      id: 'prod-1',
      vendorUid: DEMO_SELLER_UID,
      vendorName: v.name,
      name: 'Jordan 4 Retro "Midnight"',
      brand: 'Jordan',
      size: '10.5',
      price: 365,
      retailPrice: 210,
      condition: 'New',
      image: '/images/shoes/pexels-dl-jordan-10963373.jpg',
      platform: 'Local',
      colorway: 'Black / Blue',
      sku: 'DJ-004',
      soldCount: 12,
      description: 'Brand new pair. Box included. Same-day meetup.',
      status: 'active',
    },
    {
      id: 'prod-2',
      vendorUid: DEMO_SELLER_UID,
      vendorName: v.name,
      name: 'Nike Dunk Low "Forest"',
      brand: 'Nike',
      size: '9.5',
      price: 155,
      retailPrice: 115,
      condition: 'New',
      image: '/images/shoes/pexels-dl-nike-dunk-20298291.jpg',
      platform: 'Local',
      colorway: 'White / Green',
      sku: 'NK-204',
      soldCount: 22,
      description: 'Clean colorway, great flip. Pickup preferred.',
      status: 'active',
    },
    // Additional active listings for richer demo browsing.
    {
      id: 'prod-3',
      vendorUid: DEMO_SELLER_UID,
      vendorName: v.name,
      name: 'Adidas Yeezy Boost 350 V2 "Bone"',
      brand: 'Adidas',
      size: '10',
      price: 280,
      retailPrice: 230,
      condition: 'DS',
      image: '/images/shoes/pexels-dl-yeezy-28488349.jpg',
      platform: 'Local',
      colorway: 'Bone / White',
      sku: 'AD-350',
      description: 'Deadstock, never tried on. Receipt included.',
      status: 'active',
    },
    {
      id: 'prod-4',
      vendorUid: DEMO_SELLER_UID,
      vendorName: v.name,
      name: 'New Balance 992 Grey',
      brand: 'New Balance',
      size: '11',
      price: 320,
      retailPrice: 185,
      condition: 'New',
      image: '/images/shoes/pexels-dl-nb-19882421.jpg',
      platform: 'Local',
      colorway: 'Grey / Silver',
      sku: 'NB-992',
      description: 'Retail price was $185. Asking $320. Box included.',
      status: 'active',
    },
  ]
  window.localStorage.setItem(PRODUCTS_KEY, safeJsonStringify(seeded))
  return seeded
}

export function saveDemoProducts(products: DemoProductStored[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCTS_KEY, safeJsonStringify(products))
}

export function upsertDemoProduct(p: { id?: string; status?: string } & Omit<DemoProduct, 'id'>) {
  const current = getOrSeedDemoProducts()
  const id = p.id ?? `prod-${Date.now()}`
  const entry: DemoProductStored = { id, status: p.status ?? 'active', ...p }
  const next = current.some((x) => x.id === id)
    ? current.map((x) => (x.id === id ? entry : x))
    : [entry, ...current]
  saveDemoProducts(next)
  return next
}

export function deleteDemoProduct(id: string) {
  const current = getOrSeedDemoProducts()
  const next = current.filter((p) => p.id !== id)
  saveDemoProducts(next)
  return next
}

// ─── Demo Orders ─────────────────────────────────────────────────────────────

export type DemoOrderItem = {
  productId: string
  nameSnapshot: string
  priceSnapshot: number
  qty: number
  image?: string | null
}

export type DemoOrder = {
  id: string
  checkoutId: string
  status: string
  buyerUid: string
  buyerEmail?: string | null
  vendorUid: string
  vendorName: string
  pickupName: string
  pickupEmail: string
  pickupPreferredDateTime: string
  notes?: string
  items: DemoOrderItem[]
  subtotal: number
  createdAt: string // ISO string
}

export type DemoMessage = {
  id: string
  senderUid: string
  text: string
  createdAt: string // ISO string
}

export function getDemoOrders(): DemoOrder[] {
  if (typeof window === 'undefined') return []
  const existing = safeJsonParse<DemoOrder[]>(window.localStorage.getItem(ORDERS_KEY))
  if (Array.isArray(existing) && existing.length) return existing

  // Seed a pre-existing order so the demo works immediately without manual checkout
  const seededOrder: DemoOrder = {
    id: 'order-demo-seed-1',
    checkoutId: 'demo-checkout-001',
    status: 'placed',
    buyerUid: DEMO_BUYER_UID,
    buyerEmail: 'buyer@soletrack.app',
    vendorUid: DEMO_SELLER_UID,
    vendorName: 'Demo Vault',
    pickupName: 'Demo Buyer',
    pickupEmail: 'buyer@soletrack.app',
    pickupPreferredDateTime: 'Sat 2pm',
    notes: 'Looking forward to picking these up!',
    items: [
      {
        productId: 'prod-1',
        nameSnapshot: 'Jordan 4 Retro "Midnight"',
        priceSnapshot: 365,
        qty: 1,
        image: '/images/shoes/pexels-dl-jordan-10963373.jpg',
      },
    ],
    subtotal: 365,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  }
  window.localStorage.setItem(ORDERS_KEY, safeJsonStringify([seededOrder]))

  // Seed chat messages for this order if none exist yet
  const existingMsgs = safeJsonParse<Record<string, DemoMessage[]>>(window.localStorage.getItem(MESSAGES_KEY))
  if (!existingMsgs?.['order-demo-seed-1']) {
    const seededMsgs: Record<string, DemoMessage[]> = {
      ...(existingMsgs ?? {}),
      'order-demo-seed-1': [
        {
          id: 'msg-seed-1',
          senderUid: '__demo__buyer',
          text: 'Hi! Just placed my order for the Jordan 4 Midnight. Would Saturday around 2pm work for pickup?',
          createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        },
        {
          id: 'msg-seed-2',
          senderUid: DEMO_SELLER_UID,
          text: "Hey! Saturday 2pm works great. I'll have the box ready. See you then!",
          createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        },
      ],
    }
    window.localStorage.setItem(MESSAGES_KEY, safeJsonStringify(seededMsgs))
  }

  return [seededOrder]
}

function saveDemoOrders(orders: DemoOrder[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ORDERS_KEY, safeJsonStringify(orders))
}

export function getDemoBuyerOrders(buyerUid: string): DemoOrder[] {
  return getDemoOrders().filter((o) => o.buyerUid === buyerUid)
}

export function getDemoVendorOrders(vendorUid: string): DemoOrder[] {
  return getDemoOrders().filter((o) => o.vendorUid === vendorUid)
}

export function getDemoOrderById(id: string): DemoOrder | null {
  return getDemoOrders().find((o) => o.id === id) ?? null
}

export function addDemoOrder(order: Omit<DemoOrder, 'id' | 'createdAt'>): DemoOrder {
  const current = getDemoOrders()
  const newOrder: DemoOrder = {
    ...order,
    id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  }
  saveDemoOrders([newOrder, ...current])
  return newOrder
}

function upsertDemoSalesFromPickedUpOrder(orderId: string, order: DemoOrder) {
  const current = getOrSeedDemoSales()
  const withoutCurrentOrder = current.filter((s) => !(s.source === 'order' && s.orderId === orderId))
  const soldDate = new Date().toISOString().slice(0, 10)

  const orderSales: DemoSale[] = order.items.map((item, index) => {
    const qty = Math.max(1, Number(item.qty) || 1)
    return {
      id: `sale-order-${orderId}-${index}`,
      shoe: item.nameSnapshot || 'Shoe',
      size: '-',
      buyPrice: null,
      sellPrice: (Number(item.priceSnapshot) || 0) * qty,
      date: soldDate,
      platform: 'Pickup',
      qty,
      source: 'order',
      orderId,
      checkoutId: order.checkoutId,
    }
  })

  const next = [...orderSales, ...withoutCurrentOrder]
  saveDemoSales(next)
  return next
}

function markDemoOrderProductsSold(order: DemoOrder) {
  const currentProducts = getOrSeedDemoProducts()
  const soldIds = new Set(order.items.map((item) => String(item.productId || '')).filter(Boolean))
  if (!soldIds.size) return

  const nextProducts = currentProducts.map((product) => {
    if (!soldIds.has(product.id)) return product
    return {
      ...product,
      status: 'sold',
      active: false,
    }
  })
  saveDemoProducts(nextProducts)
}

export function updateDemoOrderStatus(id: string, status: string): DemoOrder | null {
  const current = getDemoOrders()
  const target = current.find((o) => o.id === id)
  if (!target) return null

  const previousStatus = String(target.status ?? '')
  const updatedOrder: DemoOrder = { ...target, status }
  const next = current.map((o) => (o.id === id ? updatedOrder : o))
  saveDemoOrders(next)

  if (status === 'picked_up' && previousStatus !== 'picked_up') {
    upsertDemoSalesFromPickedUpOrder(id, updatedOrder)
    markDemoOrderProductsSold(updatedOrder)
  }

  return updatedOrder
}

// ─── Demo Chat Messages ───────────────────────────────────────────────────────

function getAllDemoMessages(): Record<string, DemoMessage[]> {
  if (typeof window === 'undefined') return {}
  return safeJsonParse<Record<string, DemoMessage[]>>(window.localStorage.getItem(MESSAGES_KEY)) ?? {}
}

function saveAllDemoMessages(all: Record<string, DemoMessage[]>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MESSAGES_KEY, safeJsonStringify(all))
}

export function getDemoMessages(orderId: string): DemoMessage[] {
  return getAllDemoMessages()[orderId] ?? []
}

export function addDemoMessage(
  orderId: string,
  msg: Omit<DemoMessage, 'id' | 'createdAt'>,
): DemoMessage[] {
  const all = getAllDemoMessages()
  const current = all[orderId] ?? []
  const newMsg: DemoMessage = {
    ...msg,
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  }
  all[orderId] = [...current, newMsg]
  saveAllDemoMessages(all)
  return all[orderId]!
}

// ─── Sample Listings ──────────────────────────────────────────────────────────

export function addDemoSampleListings(vendorUid: string, vendorName: string) {
  const current = getOrSeedDemoProducts()
  const samples: Array<Omit<DemoProduct, 'id'>> = [
    {
      vendorUid,
      vendorName,
      name: 'Nike Dunk Low Retro',
      brand: 'Nike',
      size: '10',
      price: 165,
      condition: 'New',
      image: '/images/shoes/pexels-dl-af1-33597709.jpg',
      description: 'Clean, ready for pickup. Box included.',
      platform: 'Local',
    },
    {
      vendorUid,
      vendorName,
      name: 'Air Jordan 1 Retro High OG',
      brand: 'Jordan',
      size: '10.5',
      price: 305,
      condition: 'DS',
      image: '/images/shoes/pexels-dl-jordan-11718014.jpg',
      description: 'Deadstock, never worn. Local pickup only.',
      platform: 'Local',
    },
    {
      vendorUid,
      vendorName,
      name: 'New Balance 550 White Green',
      brand: 'New Balance',
      size: '9.5',
      price: 140,
      condition: 'New',
      image: '/images/shoes/pexels-dl-nb-30755567.jpg',
      description: 'Brand new pair. Great starter flip.',
      platform: 'Local',
    },
  ]
  // In demo mode we publish immediately so new listings are visible in Browse.
  const next = [...samples.map((s, i) => ({ id: `prod-${Date.now()}-${i}`, status: 'active', ...s })), ...current]
  saveDemoProducts(next)
  return next
}

