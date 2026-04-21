import { createClient } from 'pexels'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../public/images/shoes')
const API_KEY = 'f9AtpDL3VYqN8aVVTkFOMB4quziE7wxOGi1scd1KkF6exLGrDVG3ta3H'

const client = createClient(API_KEY)

const SEARCHES = [
  { query: 'air jordan sneaker', tag: 'jordan', count: 4 },
  { query: 'nike dunk sneaker', tag: 'nike-dunk', count: 3 },
  { query: 'nike air force 1 sneaker', tag: 'af1', count: 3 },
  { query: 'adidas yeezy sneaker', tag: 'yeezy', count: 3 },
  { query: 'new balance sneaker', tag: 'nb', count: 3 },
  { query: 'sneaker shoe sole', tag: 'sneaker', count: 4 },
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        fs.unlinkSync(dest)
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', err => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  let downloaded = 0
  const results = []

  for (const { query, tag, count } of SEARCHES) {
    console.log(`\nSearching: "${query}"`)
    try {
      const res = await client.photos.search({ query, per_page: count + 3, orientation: 'square' })
      if (!('photos' in res)) { console.log('  no results'); continue }

      let got = 0
      for (const photo of res.photos) {
        if (got >= count) break
        const url = photo.src.large  // ~940px
        const fname = `pexels-dl-${tag}-${photo.id}.jpg`
        const dest = path.join(OUT_DIR, fname)

        if (fs.existsSync(dest)) {
          console.log(`  skip (exists): ${fname}`)
          got++
          continue
        }

        try {
          await download(url, dest)
          const kb = Math.round(fs.statSync(dest).size / 1024)
          console.log(`  ✓ ${fname}  (${kb} KB)`)
          results.push({ fname, photographer: photo.photographer, alt: photo.alt })
          got++
          downloaded++
        } catch (e) {
          console.log(`  error: ${e.message}`)
        }

        // small delay to be polite
        await new Promise(r => setTimeout(r, 200))
      }
    } catch (e) {
      console.log(`  fetch error: ${e.message}`)
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Downloaded ${downloaded} new photos to public/images/shoes/`)
  console.log('\nFile list for demoMarketplace.ts:')
  for (const r of results) {
    console.log(`  /images/shoes/${r.fname}  — ${r.photographer}`)
  }
}

run()
