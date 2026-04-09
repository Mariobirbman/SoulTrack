import type { DemoProduct } from './demoMarketplace'

export type DemoUser = {
  uid: string
  displayName: string
  email: string
}

export type DemoSale = {
  id: string
  shoe: string
  size: string
  buyPrice: number
  sellPrice: number
  date: string
  platform: string
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

export function getOrSeedDemoUser(): DemoUser {
  if (typeof window === 'undefined') {
    return { uid: '__demo__me', displayName: 'Demo Reseller', email: 'demo@soletrack.app' }
  }
  const existing = safeJsonParse<DemoUser>(window.localStorage.getItem(USER_KEY))
  if (existing?.uid && existing.displayName && existing.email) return existing
  const seeded: DemoUser = { uid: '__demo__me', displayName: 'Demo Reseller', email: 'demo@soletrack.app' }
  window.localStorage.setItem(USER_KEY, safeJsonStringify(seeded))
  return seeded
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

export function getOrSeedDemoProducts(): Array<{ id: string } & Omit<DemoProduct, 'id'>> {
  if (typeof window === 'undefined') return []
  const existing = safeJsonParse<Array<{ id: string } & Omit<DemoProduct, 'id'>>>(
    window.localStorage.getItem(PRODUCTS_KEY),
  )
  if (Array.isArray(existing) && existing.length) return existing

  const v = getOrSeedDemoVendor()
  const seeded: Array<{ id: string } & Omit<DemoProduct, 'id'>> = [
    {
      id: 'prod-1',
      vendorUid: '__demo__me',
      vendorName: v.name,
      name: 'Jordan 4 Retro “Midnight”',
      brand: 'Jordan',
      size: '10.5',
      price: 365,
      retailPrice: 210,
      condition: 'New',
      image: '/images/shoes/generated-09.webp',
      platform: 'Local',
      colorway: 'Black / Blue',
      sku: 'DJ-004',
      soldCount: 12,
      description: 'Brand new pair. Box included. Same-day meetup.',
    },
    {
      id: 'prod-2',
      vendorUid: '__demo__me',
      vendorName: v.name,
      name: 'Nike Dunk Low “Forest”',
      brand: 'Nike',
      size: '9.5',
      price: 155,
      retailPrice: 115,
      condition: 'New',
      image: '/images/shoes/generated-10.webp',
      platform: 'Local',
      colorway: 'White / Green',
      sku: 'NK-204',
      soldCount: 22,
      description: 'Clean colorway, great flip. Pickup preferred.',
    },
  ]
  window.localStorage.setItem(PRODUCTS_KEY, safeJsonStringify(seeded))
  return seeded
}

export function saveDemoProducts(products: Array<{ id: string } & Omit<DemoProduct, 'id'>>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCTS_KEY, safeJsonStringify(products))
}

export function upsertDemoProduct(p: { id?: string } & Omit<DemoProduct, 'id'>) {
  const current = getOrSeedDemoProducts()
  const id = p.id ?? `prod-${Date.now()}`
  const next = current.some((x) => x.id === id)
    ? current.map((x) => (x.id === id ? { id, ...p } : x))
    : [{ id, ...p }, ...current]
  saveDemoProducts(next)
  return next
}

export function deleteDemoProduct(id: string) {
  const current = getOrSeedDemoProducts()
  const next = current.filter((p) => p.id !== id)
  saveDemoProducts(next)
  return next
}

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
      image: '/images/shoes/generated-11.webp',
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
      image: '/images/shoes/generated-12.webp',
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
      image: '/images/shoes/generated-06.webp',
      description: 'Brand new pair. Great starter flip.',
      platform: 'Local',
    },
  ]
  const next = [...samples.map((s, i) => ({ id: `prod-${Date.now()}-${i}`, ...s })), ...current]
  saveDemoProducts(next)
  return next
}

