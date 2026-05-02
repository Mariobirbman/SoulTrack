export interface BrandStat {
  avgPrice: number
  totalOrders: number
  topCategory: string
}

type BrandStatsMap = Record<string, BrandStat>

const BRAND_STATS_URL = '/data/brandStats.json'
let statsPromise: Promise<BrandStatsMap> | null = null

// Sub-brands not in the CSV — map to parent brand for market intel
const BRAND_ALIASES: Record<string, string> = {
  jordan: 'nike',
  yeezy: 'adidas',
  converse: 'nike',
}

function normalizeBrand(brand: string) {
  return brand.trim().toLowerCase()
}

function resolveKey(key: string): string {
  return BRAND_ALIASES[key] ?? key
}

export async function loadBrandStats(): Promise<BrandStatsMap> {
  if (statsPromise) return statsPromise

  statsPromise = fetch(BRAND_STATS_URL).then(async (res) => {
    if (!res.ok) throw new Error(`Failed to fetch brand stats: ${res.status}`)
    return (await res.json()) as BrandStatsMap
  })

  return statsPromise
}

export async function getBrandStat(brand: string): Promise<BrandStat | null> {
  const key = normalizeBrand(brand)
  if (!key) return null
  const stats = await loadBrandStats()
  return stats[resolveKey(key)] ?? null
}

export async function getDelta(listingPrice: number, brand: string): Promise<number | null> {
  const stat = await getBrandStat(brand)
  if (!stat || stat.avgPrice <= 0) return null

  const raw = ((listingPrice - stat.avgPrice) / stat.avgPrice) * 100
  return Math.round(raw * 10) / 10
}

export function __resetBrandStatsForTests() {
  statsPromise = null
}
