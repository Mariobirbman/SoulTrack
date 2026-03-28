const FIVE_MIN_MS = 5 * 60 * 1000

function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function priceBucketStart(nowMs = Date.now(), periodMs = FIVE_MIN_MS) {
  return Math.floor(nowMs / periodMs) * periodMs
}

export type PriceMove = {
  base: number
  current: number
  previous: number
  deltaAbs: number
  deltaPct: number
  direction: 'up' | 'down' | 'flat'
  bucketStartMs: number
  nextBucketMs: number
}

/**
 * Simulates a market-like price that updates every 5 minutes without writing to the DB.
 * Deterministic: same (key, bucket) -> same price.
 */
export function simulatePrice(basePrice: number, key: string, nowMs = Date.now()): PriceMove {
  const base = Math.max(0, Number.isFinite(basePrice) ? basePrice : 0)
  const bucketStartMs = priceBucketStart(nowMs)
  const prevBucketStartMs = bucketStartMs - FIVE_MIN_MS

  // Volatility scales a bit with price (caps keep it realistic).
  const vol = clamp(0.03 + (base / 1200) * 0.03, 0.03, 0.08) // 3%..8%

  const priceForBucket = (bucketMs: number) => {
    const seed = hashString(`${key}|${bucketMs}`)
    const rand = mulberry32(seed)
    // Triangular-ish distribution centered at 0 for more "small moves".
    const r = (rand() + rand() + rand()) / 3
    const move = (r - 0.5) * 2 // -1..1
    const factor = 1 + move * vol
    return Math.max(1, Math.round(base * factor * 100) / 100)
  }

  const current = priceForBucket(bucketStartMs)
  const previous = priceForBucket(prevBucketStartMs)
  const deltaAbs = Math.round((current - previous) * 100) / 100
  const deltaPct = previous ? (deltaAbs / previous) * 100 : 0
  const direction: PriceMove['direction'] =
    deltaAbs > 0.001 ? 'up' : deltaAbs < -0.001 ? 'down' : 'flat'

  return {
    base,
    current,
    previous,
    deltaAbs,
    deltaPct,
    direction,
    bucketStartMs,
    nextBucketMs: bucketStartMs + FIVE_MIN_MS,
  }
}

