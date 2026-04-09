/**
 * SoleTrack — Firestore seed script
 *
 * Writes demo vendors + products to your live Firestore database.
 * This uses the Firebase Admin SDK, which bypasses security rules and
 * lets us create multi-vendor data that looks realistic.
 *
 * HOW TO RUN:
 *   1. Go to Firebase Console → Project Settings → Service accounts
 *   2. Click "Generate new private key" → download the JSON file
 *   3. Save it as  scripts/service-account.json  (never commit this!)
 *   4. From the repo root:
 *        cd scripts
 *        npm install firebase-admin
 *        cd ..
 *        node scripts/seed-firestore.mjs
 *
 * Re-running is safe — all writes are upserts (setDoc with merge).
 */

import { readFileSync, existsSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ── Service account ──────────────────────────────────────────────────────────
const KEY_PATH = new URL('./service-account.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

if (!existsSync(KEY_PATH)) {
  console.error('\n❌  Service account key not found at:', KEY_PATH)
  console.error('   Download it from Firebase Console → Project Settings → Service accounts\n')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(KEY_PATH, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// ── Demo image URLs (Unsplash — free to use) ─────────────────────────────────
const IMG = {
  aj1:    'https://images.unsplash.com/photo-aDZ5YIuedQg?w=600&q=80&auto=format&fit=crop',
  dunk:   'https://images.unsplash.com/photo-g1vk_Bef2Xk?w=600&q=80&auto=format&fit=crop',
  yeezy:  'https://images.unsplash.com/photo-hVlyfxnH56k?w=600&q=80&auto=format&fit=crop',
  j4:     'https://images.unsplash.com/photo-F45w1xY42BY?w=600&q=80&auto=format&fit=crop',
  am90:   'https://images.unsplash.com/photo-Ao1AP2UvVnE?w=600&q=80&auto=format&fit=crop',
  nb550:  'https://images.unsplash.com/photo-3bBihBr7wRE?w=600&q=80&auto=format&fit=crop',
  j3:     'https://images.unsplash.com/photo-bIrDx0cAr14?w=600&q=80&auto=format&fit=crop',
  sbdunk: 'https://images.unsplash.com/photo-sA5wcAu4CBA?w=600&q=80&auto=format&fit=crop',
  forum:  'https://images.unsplash.com/photo-NRA25SWe71o?w=600&q=80&auto=format&fit=crop',
}

// ── Vendors ───────────────────────────────────────────────────────────────────
const VENDORS = [
  {
    id: 'demo-vendor-kickvault',
    name: 'KickVault',
    location: 'Atlanta, GA',
    specialty: ['Jordan', 'Nike SB'],
    rating: 4.9,
    reviewCount: 312,
    badge: 'Top Seller',
    description: 'One of the most trusted Jordan resellers in the southeast. KickVault specializes in OG colorways, grails, and limited drops. All shoes authenticated before listing.',
    contactEmail: 'kickvault@soletrack.com',
    platforms: ['StockX', 'GOAT', 'eBay'],
    minOrder: 1,
    topBrands: ['Jordan', 'Nike'],
  },
  {
    id: 'demo-vendor-solesource',
    name: 'SoleSource',
    location: 'Los Angeles, CA',
    specialty: ['Nike', 'Adidas'],
    rating: 4.7,
    reviewCount: 198,
    badge: 'Verified',
    description: 'West Coast sneaker connect. Consistent supply of Dunks, Air Force 1s, and Yeezy drops. Ships same day on all confirmed orders.',
    contactEmail: 'solesource@soletrack.com',
    platforms: ['GOAT', 'Local', 'Instagram'],
    minOrder: 2,
    topBrands: ['Nike', 'Adidas'],
  },
  {
    id: 'demo-vendor-yzydealer',
    name: 'YZYDealer',
    location: 'Chicago, IL',
    specialty: ['Adidas', 'Yeezy'],
    rating: 4.8,
    reviewCount: 441,
    badge: 'Top Seller',
    description: 'The go-to source for Yeezy supply. Every colorway since 2018, in most sizes. Bulk deals available for flippers. No fakes — every pair verified.',
    contactEmail: 'yzydealer@soletrack.com',
    platforms: ['StockX', 'eBay'],
    minOrder: 1,
    topBrands: ['Adidas'],
  },
  {
    id: 'demo-vendor-retroracks',
    name: 'RetroRacks',
    location: 'New York, NY',
    specialty: ['Jordan', 'Nike Retro'],
    rating: 4.6,
    reviewCount: 127,
    badge: 'Verified',
    description: 'Specializing in retro Jordan 3s, 4s, and 5s. RetroRacks keeps inventory lean and quality high.',
    contactEmail: 'retrorack@soletrack.com',
    platforms: ['eBay', 'StockX', 'Local'],
    minOrder: 1,
    topBrands: ['Jordan'],
  },
  {
    id: 'demo-vendor-cactuskicks',
    name: 'CactusKicks',
    location: 'Houston, TX',
    specialty: ['Travis Scott Collab', 'Nike SB'],
    rating: 5.0,
    reviewCount: 76,
    badge: 'New',
    description: 'Boutique vendor specializing in high-heat collabs. Travis Scott, Off-White, and other designer collaborations. Limited supply, serious buyers only.',
    contactEmail: 'cactuskicks@soletrack.com',
    platforms: ['StockX', 'GOAT'],
    minOrder: 1,
    topBrands: ['Nike', 'Jordan'],
  },
  {
    id: 'demo-vendor-nbvault',
    name: 'NB Vault',
    location: 'Boston, MA',
    specialty: ['New Balance', 'Saucony'],
    rating: 4.5,
    reviewCount: 89,
    badge: 'Verified',
    description: 'The best NB connect in New England. Stocking 550s, 990s, 993s, and more. Wholesale pricing for bulk buyers.',
    contactEmail: 'nbvault@soletrack.com',
    platforms: ['GOAT', 'Local'],
    minOrder: 3,
    topBrands: ['New Balance', 'Saucony'],
  },
]

// ── Products ──────────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: 'demo-product-1',
    vendorUid: 'demo-vendor-kickvault',
    vendorName: 'KickVault',
    name: 'Air Jordan 1 Retro High OG',
    brand: 'Jordan',
    size: '10',
    price: 289,
    retailPrice: 180,
    condition: 'DS',
    image: IMG.aj1,
    platform: 'StockX',
    colorway: 'Chicago / Red Black',
    sku: '555088-101',
    soldCount: 142,
    active: true,
    description: 'The iconic AJ1 High OG in classic colorway. Deadstock, never worn. Original box included with all accessories.',
  },
  {
    id: 'demo-product-2',
    vendorUid: 'demo-vendor-solesource',
    vendorName: 'SoleSource',
    name: 'Nike Dunk Low Retro',
    brand: 'Nike',
    size: '9.5',
    price: 145,
    retailPrice: 110,
    condition: 'New',
    image: IMG.dunk,
    platform: 'GOAT',
    colorway: 'White / Black Panda',
    sku: 'DD1391-100',
    soldCount: 87,
    active: true,
    description: 'Clean Panda Dunk Low. Tried on once indoors. No creases, no dirt. Box slightly dented but shoe is perfect.',
  },
  {
    id: 'demo-product-3',
    vendorUid: 'demo-vendor-yzydealer',
    vendorName: 'YZYDealer',
    name: 'Adidas Yeezy Boost 350 V2',
    brand: 'Adidas',
    size: '11',
    price: 320,
    retailPrice: 230,
    condition: 'DS',
    image: IMG.yeezy,
    platform: 'StockX',
    colorway: 'Zebra',
    sku: 'CP9654',
    soldCount: 205,
    active: true,
    description: 'Zebra 350 V2 — one of the most sought-after Yeezy colorways. Deadstock with original receipt.',
  },
  {
    id: 'demo-product-4',
    vendorUid: 'demo-vendor-retroracks',
    vendorName: 'RetroRacks',
    name: 'Jordan 4 Retro Military Blue',
    brand: 'Jordan',
    size: '10.5',
    price: 410,
    retailPrice: 210,
    condition: 'DS',
    image: IMG.j4,
    platform: 'eBay',
    colorway: 'Military Blue',
    sku: 'DH6927-111',
    soldCount: 63,
    active: true,
    description: 'OG Military Blue 4 — cleaned up retro of the classic 1989 colorway. DS with box and extra laces.',
  },
  {
    id: 'demo-product-5',
    vendorUid: 'demo-vendor-solesource',
    vendorName: 'SoleSource',
    name: 'Nike Air Max 90',
    brand: 'Nike',
    size: '9',
    price: 110,
    retailPrice: 130,
    condition: 'Used',
    image: IMG.am90,
    platform: 'Local',
    colorway: 'Infrared',
    sku: 'CT1685-100',
    soldCount: 31,
    active: true,
    description: 'Light use, still looking clean. Minor sole yellowing, no major scuffs. Great daily beater.',
  },
  {
    id: 'demo-product-6',
    vendorUid: 'demo-vendor-nbvault',
    vendorName: 'NB Vault',
    name: 'New Balance 550 White Green',
    brand: 'New Balance',
    size: '10',
    price: 130,
    retailPrice: 110,
    condition: 'New',
    image: IMG.nb550,
    platform: 'GOAT',
    colorway: 'White / Green',
    sku: 'BB550WT1',
    soldCount: 54,
    active: true,
    description: 'Clean 550 colorway in crispy white/green. Brand new, never worn. Original box and paper.',
  },
  {
    id: 'demo-product-7',
    vendorUid: 'demo-vendor-kickvault',
    vendorName: 'KickVault',
    name: 'Air Jordan 3 Retro Fire Red',
    brand: 'Jordan',
    size: '11',
    price: 375,
    retailPrice: 200,
    condition: 'DS',
    image: IMG.j3,
    platform: 'StockX',
    colorway: 'Fire Red',
    sku: 'CT8532-160',
    soldCount: 98,
    active: true,
    description: 'Fire Red 3 — one of the cleanest retros of the year. Elephant print looking sharp, all OG receipts included.',
  },
  {
    id: 'demo-product-8',
    vendorUid: 'demo-vendor-cactuskicks',
    vendorName: 'CactusKicks',
    name: 'Nike SB Dunk Low (Special Release)',
    brand: 'Nike',
    size: '10',
    price: 850,
    retailPrice: 150,
    condition: 'DS',
    image: IMG.sbdunk,
    platform: 'StockX',
    colorway: 'Brown / Sail',
    sku: 'CT5053-200',
    soldCount: 19,
    active: true,
    description: 'Highly coveted limited SB collab. Reverse Swoosh, hidden pocket under the tongue. DS, never worn.',
  },
  {
    id: 'demo-product-9',
    vendorUid: 'demo-vendor-solesource',
    vendorName: 'SoleSource',
    name: 'Adidas Forum Low x Bad Bunny',
    brand: 'Adidas',
    size: '9',
    price: 290,
    retailPrice: 160,
    condition: 'New',
    image: IMG.forum,
    platform: 'GOAT',
    colorway: 'Easter Egg',
    sku: 'GW0265',
    soldCount: 44,
    active: true,
    description: 'Bad Bunny x Forum Low in the Easter Egg colorway. Tried on once for photos. Pristine condition.',
  },
]

// ── Write to Firestore ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  Seeding SoleTrack Firestore database...\n')

  console.log('📦  Writing vendors...')
  for (const { id, ...data } of VENDORS) {
    await db.collection('vendors').doc(id).set(data, { merge: true })
    console.log(`   ✓ ${data.name}`)
  }

  console.log('\n👟  Writing products...')
  for (const { id, ...data } of PRODUCTS) {
    await db.collection('products').doc(id).set(data, { merge: true })
    console.log(`   ✓ ${data.name}`)
  }

  console.log('\n✅  Done! Open your app and visit /browse to see live data from Firestore.\n')
  process.exit(0)
}

seed().catch((err) => {
  console.error('\n❌  Seed failed:', err.message, '\n')
  process.exit(1)
})
