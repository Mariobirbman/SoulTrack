export interface BrandStat {
  avgPrice: number
  totalOrders: number
  topCategory: string
  byType?: Record<string, { avgPrice: number; totalOrders: number }>
}

type BrandStatsMap = Record<string, BrandStat>

const BRAND_STATS_URL = '/data/brandStats.json'
let statsPromise: Promise<BrandStatsMap> | null = null

function normalizeBrand(brand: string) {
  return brand.trim().toLowerCase()
}

function normalizeType(shoeType?: string) {
  return String(shoeType ?? '').trim().toLowerCase()
}

function inferTypeFromText(input?: string) {
  const text = normalizeType(input)
  if (!text) return ''
  if (text.includes('running') || text.includes('vomero') || text.includes('kayano') || text.includes('ultra')) return 'running'
  if (text.includes('basketball') || text.includes('jordan') || text.includes('dunk') || text.includes('mb.03')) return 'basketball'
  if (text.includes('training') || text.includes('gt-2160') || text.includes('nano')) return 'training'
  if (text.includes('gym')) return 'gym'
  if (text.includes('lifestyle') || text.includes('af1') || text.includes('air force') || text.includes('cortez') || text.includes('club c') || text.includes('classic')) return 'lifestyle'
  if (text.includes('skate') || text.includes('sb')) return 'skate'
  return ''
}

function withTypeAdjustedPrice(stat: BrandStat, shoeType?: string): BrandStat {
  const inferredType = inferTypeFromText(shoeType)
  if (!inferredType) return stat
  const typeStat = stat.byType?.[inferredType]
  if (!typeStat || typeStat.avgPrice <= 0 || typeStat.totalOrders <= 0) return stat
  return {
    avgPrice: typeStat.avgPrice,
    totalOrders: typeStat.totalOrders,
    topCategory: inferredType,
    byType: stat.byType,
  }
}

export async function loadBrandStats(): Promise<BrandStatsMap> {
  if (statsPromise) return statsPromise

  statsPromise = fetch(BRAND_STATS_URL).then(async (res) => {
    if (!res.ok) throw new Error(`Failed to fetch brand stats: ${res.status}`)
    return (await res.json()) as BrandStatsMap
  })

  return statsPromise
}

export async function getBrandStat(brand: string, shoeType?: string): Promise<BrandStat | null> {
  const key = normalizeBrand(brand)
  if (!key) return null
  const stats = await loadBrandStats()
  const baseStat = stats[key] ?? null
  if (!baseStat) return null
  return withTypeAdjustedPrice(baseStat, shoeType)
}

export async function getDelta(listingPrice: number, brand: string, shoeType?: string): Promise<number | null> {
  const stat = await getBrandStat(brand, shoeType)
  if (!stat || stat.avgPrice <= 0) return null

  const raw = ((listingPrice - stat.avgPrice) / stat.avgPrice) * 100
  return Math.round(raw * 10) / 10
}

export function __resetBrandStatsForTests() {
  statsPromise = null
}
