import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'
import crypto from 'node:crypto'
import Papa from 'papaparse'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function env(name) {
  return process.env[name] || ''
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2))
  return {
    dryRun: args.has('--dry-run'),
    orders: (() => {
      for (const a of args) {
        if (a.startsWith('--orders=')) return Math.max(0, Number(a.slice('--orders='.length)) || 0)
      }
      return 0
    })(),
    csv: (() => {
      for (const a of args) {
        if (a.startsWith('--csv=')) return a.slice('--csv='.length)
      }
      return 'public/data/global_sports_footwear_sales_2018_2026.csv'
    })(),
    only: (() => {
      for (const a of args) {
        if (a.startsWith('--only=')) return a.slice('--only='.length)
      }
      return ''
    })(),
  }
}

const { dryRun, only, orders, csv } = parseArgs(process.argv)

// Auth for Admin SDK:
// - Prefer GOOGLE_APPLICATION_CREDENTIALS (service account json path)
// - Fallback to Application Default Credentials
const credsPath = env('GOOGLE_APPLICATION_CREDENTIALS')

if (credsPath) {
  if (!fs.existsSync(credsPath)) {
    console.error(`GOOGLE_APPLICATION_CREDENTIALS not found: ${credsPath}`)
    process.exit(1)
  }
  const json = JSON.parse(fs.readFileSync(credsPath, 'utf8'))
  initializeApp({ credential: cert(json) })
} else {
  initializeApp({ credential: applicationDefault() })
}

const db = getFirestore()

const products = [
  {
    id: 1,
    name: 'Air Jordan 1 Retro High OG',
    brand: 'Jordan',
    size: '10',
    price: 289,
    retailPrice: 180,
    condition: 'DS',
    image: '/images/shoes/pexels-jonathanborba-12031204.jpg',
    platform: 'StockX',
    colorway: 'Chicago / Red Black',
    sku: '555088-101',
    seller: 'KickVault',
    soldCount: 142,
    description:
      'The iconic AJ1 High OG in classic colorway. Deadstock, never worn. Original box included with all accessories.',
  },
  {
    id: 2,
    name: 'Nike Dunk Low Retro',
    brand: 'Nike',
    size: '9.5',
    price: 145,
    retailPrice: 110,
    condition: 'New',
    image: '/images/shoes/pexels-mohammad-khan-3488802-5470890.jpg',
    platform: 'GOAT',
    colorway: 'White / Black Panda',
    sku: 'DD1391-100',
    seller: 'SoleSource',
    soldCount: 87,
    description:
      'Clean Panda Dunk Low. Tried on once indoors. No creases, no dirt. Box slightly dented but shoe is perfect.',
  },
  {
    id: 3,
    name: 'Adidas Yeezy Boost 350 V2',
    brand: 'Adidas',
    size: '11',
    price: 320,
    retailPrice: 230,
    condition: 'DS',
    image: '/images/shoes/pexels-delot-15467344.jpg',
    platform: 'StockX',
    colorway: 'Zebra',
    sku: 'CP9654',
    seller: 'YZYDealer',
    soldCount: 205,
    description:
      'Zebra 350 V2 — one of the most sought-after Yeezy colorways. Deadstock with original receipt.',
  },
  {
    id: 4,
    name: 'Jordan 4 Retro Military Blue',
    brand: 'Jordan',
    size: '10.5',
    price: 410,
    retailPrice: 210,
    condition: 'DS',
    image: '/images/shoes/pexels-perfect-lens-15939920.jpg',
    platform: 'eBay',
    colorway: 'Military Blue',
    sku: 'DH6927-111',
    seller: 'RetroRacks',
    soldCount: 63,
    description:
      'OG Military Blue 4 — cleaned up retro of the classic 1989 colorway. DS with box and extra laces.',
  },
  {
    id: 5,
    name: 'Nike Air Max 90',
    brand: 'Nike',
    size: '9',
    price: 110,
    retailPrice: 130,
    condition: 'Used',
    image: '/images/shoes/pexels-shyam-mishra-203327-13691725.jpg',
    platform: 'Local',
    colorway: 'Infrared',
    sku: 'CT1685-100',
    seller: 'FlipKing',
    soldCount: 31,
    description:
      'Light use, still looking clean. Minor sole yellowing, no major scuffs. Great daily beater.',
  },
  {
    id: 6,
    name: 'New Balance 550 White Green',
    brand: 'New Balance',
    size: '10',
    price: 130,
    retailPrice: 110,
    condition: 'New',
    image: '/images/shoes/pexels-ahmad-saeed-143458323-10373341.jpg',
    platform: 'GOAT',
    colorway: 'White / Green',
    sku: 'BB550WT1',
    seller: 'NB Vault',
    soldCount: 54,
    description:
      'Clean 550 colorway in crispy white/green. Brand new, never worn. Original box and paper.',
  },
  {
    id: 7,
    name: 'Air Jordan 3 Retro Fire Red',
    brand: 'Jordan',
    size: '11',
    price: 375,
    retailPrice: 200,
    condition: 'DS',
    image: '/images/shoes/pexels-jonathanborba-12031204.jpg',
    platform: 'StockX',
    colorway: 'Fire Red',
    sku: 'CT8532-160',
    seller: 'KickVault',
    soldCount: 98,
    description:
      'Fire Red 3 — one of the cleanest retros of the year. Elephant print looking sharp, all OG receipts included.',
  },
  {
    id: 8,
    name: 'Nike SB Dunk Low Travis Scott',
    brand: 'Nike',
    size: '10',
    price: 850,
    retailPrice: 150,
    condition: 'DS',
    image: '/images/shoes/pexels-mohammad-khan-3488802-5470890.jpg',
    platform: 'StockX',
    colorway: 'Brown / Sail',
    sku: 'CT5053-200',
    seller: 'CactusKicks',
    soldCount: 19,
    description:
      'Highly coveted Travis Scott SB collab. Reverse Swoosh, hidden pocket under the tongue. DS, never worn.',
  },
  {
    id: 9,
    name: 'Adidas Forum Low x Bad Bunny',
    brand: 'Adidas',
    size: '9',
    price: 290,
    retailPrice: 160,
    condition: 'New',
    image: '/images/shoes/pexels-delot-15467344.jpg',
    platform: 'GOAT',
    colorway: 'Easter Egg',
    sku: 'GW0265',
    seller: 'SoleSource',
    soldCount: 44,
    description:
      'Bad Bunny x Forum Low in the Easter Egg colorway. Tried on once for photos. Pristine condition.',
  },
]

const vendors = [
  {
    id: 1,
    name: 'KickVault',
    location: 'Atlanta, GA',
    specialty: ['Jordan', 'Nike SB'],
    rating: 4.9,
    reviewCount: 312,
    totalSales: 1840,
    joinedYear: 2019,
    badge: 'Top Seller',
    description:
      'One of the most trusted Jordan resellers in the southeast. KickVault specializes in OG colorways, grails, and limited drops. All shoes authenticated before listing.',
    contact: 'kickvault@soletrack.com',
    platforms: ['StockX', 'GOAT', 'eBay'],
    minOrder: 1,
    topBrands: ['Jordan', 'Nike'],
  },
  {
    id: 2,
    name: 'SoleSource',
    location: 'Los Angeles, CA',
    specialty: ['Nike', 'Adidas'],
    rating: 4.7,
    reviewCount: 198,
    totalSales: 972,
    joinedYear: 2020,
    badge: 'Verified',
    description:
      'West Coast sneaker connect. Consistent supply of Dunks, Air Force 1s, and Yeezy drops. Ships same day on all confirmed orders.',
    contact: 'solesource@soletrack.com',
    platforms: ['GOAT', 'Local', 'Instagram'],
    minOrder: 2,
    topBrands: ['Nike', 'Adidas'],
  },
  {
    id: 3,
    name: 'YZYDealer',
    location: 'Chicago, IL',
    specialty: ['Adidas', 'Yeezy'],
    rating: 4.8,
    reviewCount: 441,
    totalSales: 3210,
    joinedYear: 2018,
    badge: 'Top Seller',
    description:
      'The go-to source for Yeezy supply. Every colorway since 2018, in most sizes. Bulk deals available for flippers. No fakes — every pair verified.',
    contact: 'yzydealer@soletrack.com',
    platforms: ['StockX', 'eBay'],
    minOrder: 1,
    topBrands: ['Adidas'],
  },
  {
    id: 4,
    name: 'RetroRacks',
    location: 'New York, NY',
    specialty: ['Jordan', 'Nike Retro'],
    rating: 4.6,
    reviewCount: 127,
    totalSales: 620,
    joinedYear: 2021,
    badge: 'Verified',
    description:
      'Specializing in retro Jordan 3s, 4s, and 5s. RetroRacks keeps inventory lean and quality high. Great source for resellers focused on classic silhouettes.',
    contact: 'retrorack@soletrack.com',
    platforms: ['eBay', 'StockX', 'Local'],
    minOrder: 1,
    topBrands: ['Jordan'],
  },
  {
    id: 5,
    name: 'CactusKicks',
    location: 'Houston, TX',
    specialty: ['Travis Scott Collab', 'Nike SB'],
    rating: 5.0,
    reviewCount: 76,
    totalSales: 284,
    joinedYear: 2022,
    badge: 'New',
    description:
      'Boutique vendor specializing in high-heat collabs. Travis Scott, Off-White, and other designer collaborations. Limited supply, serious buyers only.',
    contact: 'cactuskicks@soletrack.com',
    platforms: ['StockX', 'GOAT'],
    minOrder: 1,
    topBrands: ['Nike', 'Jordan'],
  },
  {
    id: 6,
    name: 'NB Vault',
    location: 'Boston, MA',
    specialty: ['New Balance', 'Saucony'],
    rating: 4.5,
    reviewCount: 89,
    totalSales: 415,
    joinedYear: 2021,
    badge: 'Verified',
    description:
      'The best NB connect in New England. Stocking 550s, 990s, 993s, and more. Also carries limited Saucony drops. Wholesale pricing for bulk buyers.',
    contact: 'nbvault@soletrack.com',
    platforms: ['GOAT', 'Local'],
    minOrder: 3,
    topBrands: ['New Balance', 'Saucony'],
  },
]

function toNumber(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v)
  return NaN
}

function readOrdersCsv(csvPath, limit) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`)
  }
  const content = fs.readFileSync(csvPath, 'utf8')
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
  const data = Array.isArray(parsed.data) ? parsed.data : []

  const out = []
  for (const r of data) {
    if (limit && out.length >= limit) break
    if (!r.order_id || !r.order_date) continue

    out.push({
      order_id: String(r.order_id),
      order_date: String(r.order_date),
      year: String(r.order_date).slice(0, 4),
      brand: String(r.brand ?? ''),
      model_name: String(r.model_name ?? ''),
      category: String(r.category ?? ''),
      gender: String(r.gender ?? ''),
      size: String(r.size ?? ''),
      color: String(r.color ?? ''),
      base_price_usd: Number.isFinite(toNumber(r.base_price_usd)) ? toNumber(r.base_price_usd) : 0,
      discount_percent: Number.isFinite(toNumber(r.discount_percent)) ? toNumber(r.discount_percent) : 0,
      final_price_usd: Number.isFinite(toNumber(r.final_price_usd)) ? toNumber(r.final_price_usd) : 0,
      units_sold: Number.isFinite(toNumber(r.units_sold)) ? toNumber(r.units_sold) : 0,
      revenue_usd: Number.isFinite(toNumber(r.revenue_usd)) ? toNumber(r.revenue_usd) : 0,
      payment_method: String(r.payment_method ?? ''),
      sales_channel: String(r.sales_channel ?? ''),
      country: String(r.country ?? ''),
      customer_income_level: String(r.customer_income_level ?? ''),
      customer_rating: Number.isFinite(toNumber(r.customer_rating)) ? toNumber(r.customer_rating) : 0,
    })
  }

  return out
}

function shoeDocIdFromRow(r) {
  const key = `${r.brand}|${r.model_name}|${r.category}|${r.gender}|${r.color}`
  return crypto.createHash('sha1').update(key).digest('hex')
}

function aggregateShoesFromOrders(orderRows) {
  const m = new Map()
  for (const r of orderRows) {
    const id = shoeDocIdFromRow(r)
    const cur = m.get(id)
    if (!cur) {
      m.set(id, {
        id,
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
      })
      continue
    }
    cur.orders += 1
    cur.total_units += r.units_sold
    cur.total_revenue_usd += r.revenue_usd
    cur.sum_final_price_usd += r.final_price_usd
    cur.sum_discount_percent += r.discount_percent
    cur.sum_customer_rating += r.customer_rating
  }

  return Array.from(m.values()).map((s) => ({
    id: s.id,
    brand: s.brand,
    model_name: s.model_name,
    category: s.category,
    gender: s.gender,
    color: s.color,
    orders: s.orders,
    total_units: s.total_units,
    total_revenue_usd: s.total_revenue_usd,
    avg_final_price_usd: s.orders ? s.sum_final_price_usd / s.orders : 0,
    avg_discount_percent: s.orders ? s.sum_discount_percent / s.orders : 0,
    avg_customer_rating: s.orders ? s.sum_customer_rating / s.orders : 0,
    updatedAt: new Date().toISOString(),
  }))
}

async function writeCollection(name, docs) {
  console.log(`\n== ${name} (${docs.length}) ==`)
  for (const d of docs) {
    const docId = String(d.id)
    const ref = db.collection(name).doc(docId)
    if (dryRun) {
      console.log(`[dry-run] set ${name}/${docId}`)
    } else {
      await ref.set(d, { merge: true })
      console.log(`set ${name}/${docId}`)
    }
  }
}

async function writeMany(collectionName, docs, idField) {
  console.log(`\n== ${collectionName} (${docs.length}) ==`)
  const chunkSize = 450
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize)
    if (dryRun) {
      console.log(`[dry-run] batch ${collectionName} ${i + 1}-${i + chunk.length}`)
      continue
    }
    const batch = db.batch()
    for (const d of chunk) {
      const id = String(d[idField])
      batch.set(db.collection(collectionName).doc(id), d, { merge: true })
    }
    await batch.commit()
    console.log(`batch ${collectionName} ${i + 1}-${i + chunk.length}`)
  }
}

async function main() {
  if (!only || only === 'products') await writeCollection('products', products)
  if (!only || only === 'vendors') await writeCollection('vendors', vendors)

  const shouldSeedOrders = (!only || only === 'orders' || only === 'shoes') && orders > 0
  if (shouldSeedOrders) {
    const isWindowsAbs = /^[A-Za-z]:[\\/]/.test(csv)
    const csvPath = isWindowsAbs
      ? csv
      : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', csv)
    const orderRows = readOrdersCsv(csvPath, orders)

    const ordersDocs = orderRows.map((r) => ({
      ...r,
      shoe_id: shoeDocIdFromRow(r),
      seededAt: new Date().toISOString(),
    }))

    if (!only || only === 'orders') await writeMany('orders', ordersDocs, 'order_id')

    const shoesDocs = aggregateShoesFromOrders(orderRows)
    if (!only || only === 'shoes') await writeMany('shoes', shoesDocs, 'id')
  }

  console.log('\nDone.')
  if (dryRun) console.log('Note: this was a dry run, nothing was written.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
