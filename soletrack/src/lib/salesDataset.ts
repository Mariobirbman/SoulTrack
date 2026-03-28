import Papa from 'papaparse'

export interface SalesOrderRow {
  order_id: string
  order_date: string // YYYY-MM-DD
  brand: string
  model_name: string
  category: string
  gender: string
  size: string
  color: string
  base_price_usd: number
  discount_percent: number
  final_price_usd: number
  units_sold: number
  revenue_usd: number
  payment_method: string
  sales_channel: string
  country: string
  customer_income_level: string
  customer_rating: number
}

export interface ShoeAggRow {
  key: string
  brand: string
  model_name: string
  category: string
  gender: string
  color: string
  orders: number
  total_units: number
  total_revenue_usd: number
  avg_final_price_usd: number
  avg_discount_percent: number
  avg_customer_rating: number
  sizes: number
  countries: number
}

function toNumber(v: unknown) {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v)
  return NaN
}

function safeAvg(sum: number, count: number) {
  return count ? sum / count : 0
}

export async function loadSalesOrdersCsv(url: string): Promise<SalesOrderRow[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`)
  const csv = await res.text()

  return await new Promise<SalesOrderRow[]>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(csv, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        const rows = (results.data || [])
          .filter((r) => r.order_id && r.order_date)
          .map((r) => {
            const base = toNumber(r.base_price_usd)
            const discount = toNumber(r.discount_percent)
            const final = toNumber(r.final_price_usd)
            const units = toNumber(r.units_sold)
            const revenue = toNumber(r.revenue_usd)
            const rating = toNumber(r.customer_rating)

            return {
              order_id: String(r.order_id ?? ''),
              order_date: String(r.order_date ?? ''),
              brand: String(r.brand ?? ''),
              model_name: String(r.model_name ?? ''),
              category: String(r.category ?? ''),
              gender: String(r.gender ?? ''),
              size: String(r.size ?? ''),
              color: String(r.color ?? ''),
              base_price_usd: Number.isFinite(base) ? base : 0,
              discount_percent: Number.isFinite(discount) ? discount : 0,
              final_price_usd: Number.isFinite(final) ? final : 0,
              units_sold: Number.isFinite(units) ? units : 0,
              revenue_usd: Number.isFinite(revenue) ? revenue : 0,
              payment_method: String(r.payment_method ?? ''),
              sales_channel: String(r.sales_channel ?? ''),
              country: String(r.country ?? ''),
              customer_income_level: String(r.customer_income_level ?? ''),
              customer_rating: Number.isFinite(rating) ? rating : 0,
            } satisfies SalesOrderRow
          })

        resolve(rows)
      },
      error: (err: Error) => reject(err),
    })
  })
}

export function aggregateShoes(rows: SalesOrderRow[]): ShoeAggRow[] {
  type Running = {
    brand: string
    model_name: string
    category: string
    gender: string
    color: string
    orders: number
    total_units: number
    total_revenue_usd: number
    sum_final_price_usd: number
    sum_discount_percent: number
    sum_customer_rating: number
    sizeSet: Set<string>
    countrySet: Set<string>
  }

  const m = new Map<string, Running>()
  for (const r of rows) {
    const key = [r.brand, r.model_name, r.category, r.gender, r.color].join('|')
    const cur = m.get(key)
    if (!cur) {
      m.set(key, {
        brand: r.brand,
        model_name: r.model_name,
        category: r.category,
        gender: r.gender,
        color: r.color,
        orders: 1,
        total_units: r.units_sold,
        total_revenue_usd: r.revenue_usd,
        sum_final_price_usd: r.final_price_usd,
        sum_discount_percent: r.discount_percent,
        sum_customer_rating: r.customer_rating,
        sizeSet: new Set([r.size]),
        countrySet: new Set([r.country]),
      })
      continue
    }

    cur.orders += 1
    cur.total_units += r.units_sold
    cur.total_revenue_usd += r.revenue_usd
    cur.sum_final_price_usd += r.final_price_usd
    cur.sum_discount_percent += r.discount_percent
    cur.sum_customer_rating += r.customer_rating
    cur.sizeSet.add(r.size)
    cur.countrySet.add(r.country)
  }

  return Array.from(m.entries()).map(([key, v]) => ({
    key,
    brand: v.brand,
    model_name: v.model_name,
    category: v.category,
    gender: v.gender,
    color: v.color,
    orders: v.orders,
    total_units: v.total_units,
    total_revenue_usd: v.total_revenue_usd,
    avg_final_price_usd: safeAvg(v.sum_final_price_usd, v.orders),
    avg_discount_percent: safeAvg(v.sum_discount_percent, v.orders),
    avg_customer_rating: safeAvg(v.sum_customer_rating, v.orders),
    sizes: v.sizeSet.size,
    countries: v.countrySet.size,
  }))
}

function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 360
}

export function shoePlaceholderDataUri(brand: string, model: string, color: string) {
  const hue = hashString(`${brand}|${model}|${color}`)
  const title = `${brand} ${model}`.trim()
  const sub = color.trim()
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 85% 55%)" stop-opacity="0.95"/>
      <stop offset="1" stop-color="hsl(${(hue + 60) % 360} 75% 45%)" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="n" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.18"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="640" height="420" fill="url(#g)"/>
  <rect width="640" height="420" filter="url(#n)"/>
  <g fill="rgba(11,18,5,0.78)">
    <path d="M120 260c92-18 168-32 244-90 34-26 58-28 96-10 41 20 66 54 74 82 6 22-8 40-34 44-148 24-268 24-392 0-26-5-33-17-28-26 7-14 19-24 40-30z"/>
    <path d="M190 204c10-6 18-2 26 6l34 34c4 4 4 10 0 14s-10 4-14 0l-32-32-24 14c-5 3-11 2-14-3s-2-11 3-14l21-13z"/>
  </g>
  <g font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" fill="rgba(255,255,255,0.92)">
    <text x="28" y="54" font-size="22" font-weight="800">${escapeXml(title)}</text>
    <text x="28" y="82" font-size="14" font-weight="600" fill="rgba(255,255,255,0.78)">${escapeXml(sub)}</text>
    <text x="28" y="400" font-size="12" fill="rgba(255,255,255,0.65)">Placeholder image (no photos in dataset)</text>
  </g>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
