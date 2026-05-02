import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFile } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { loadSalesOrdersCsv } from '../src/lib/salesDataset'

type Running = { priceSum: number; orders: number; cats: Record<string, number> }
type BrandStatsMap = Record<string, { avgPrice: number; totalOrders: number; topCategory: string }>

async function main() {
  const csvPath = resolve(process.cwd(), 'soletrack/public/data/global_sports_footwear_sales_2018_2026.csv')
  const csvUrl = pathToFileURL(csvPath).href
  const nativeFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.startsWith('file://')) {
      const fileText = await readFile(csvPath, 'utf8')
      return {
        ok: true,
        status: 200,
        text: async () => fileText,
      } as Response
    }
    return nativeFetch(input)
  }) as typeof fetch

  const rows = await loadSalesOrdersCsv(csvUrl)
  const map: Record<string, Running> = {}

  for (const row of rows) {
    const brandKey = row.brand.trim().toLowerCase()
    if (!brandKey) continue

    if (!map[brandKey]) map[brandKey] = { priceSum: 0, orders: 0, cats: {} }

    map[brandKey].priceSum += row.final_price_usd
    map[brandKey].orders += 1
    map[brandKey].cats[row.category] = (map[brandKey].cats[row.category] ?? 0) + 1
  }

  const out: BrandStatsMap = {}

  for (const [brand, agg] of Object.entries(map)) {
    const topCategory = Object.entries(agg.cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    out[brand] = {
      avgPrice: Math.round(agg.priceSum / agg.orders),
      totalOrders: agg.orders,
      topCategory,
    }
  }

  // Brands not in the CSV — synthetic market estimates kept in sync here
  const SYNTHETIC: BrandStatsMap = {
    jordan:  { avgPrice: 285, totalOrders: 4103, topCategory: 'Basketball' },
    yeezy:   { avgPrice: 312, totalOrders: 2847, topCategory: 'Lifestyle' },
    converse: { avgPrice: 72, totalOrders: 3614, topCategory: 'Lifestyle' },
  }
  for (const [brand, stat] of Object.entries(SYNTHETIC)) {
    if (!out[brand]) out[brand] = stat
  }

  const outputPath = resolve(process.cwd(), 'soletrack/public/data/brandStats.json')
  await writeFile(outputPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${Object.keys(out).length} brands to ${outputPath}`)
}

void main()
