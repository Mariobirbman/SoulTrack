const { chromium } = require('playwright')

const BASE = 'http://localhost:5174'

async function shot(page, url, file, opts = {}) {
  await page.goto(url, { waitUntil: 'networkidle' })
  const wait = opts.wait || 1200
  await page.waitForTimeout(wait)
  await page.screenshot({ path: file, fullPage: opts.fullPage || false })
  console.log('saved', file)
}

async function setDemo(page, role) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.evaluate((r) => {
    localStorage.setItem('soletrack_demo_mode', '1')
    if (r === 'buyer')  { localStorage.setItem('soletrack_demo_buyer', '1'); localStorage.removeItem('soletrack_demo_admin') }
    else if (r === 'admin') { localStorage.setItem('soletrack_demo_admin', '1'); localStorage.removeItem('soletrack_demo_buyer') }
    else { localStorage.removeItem('soletrack_demo_buyer'); localStorage.removeItem('soletrack_demo_admin') }
  }, role)
}

;(async () => {
  const browser = await chromium.launch()

  // ── Login page ─────────────────────────────────────────────────────
  const ctxLogin = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const pgLogin = await ctxLogin.newPage()
  await shot(pgLogin, BASE + '/login', 'demo-login.png')

  // ── Browse (buyer) ─────────────────────────────────────────────────
  const ctxBuyer = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const pgBuyer = await ctxBuyer.newPage()
  await setDemo(pgBuyer, 'buyer')
  await shot(pgBuyer, BASE + '/browse', 'demo-browse.png')

  // ── Item detail (buyer) ────────────────────────────────────────────
  await shot(pgBuyer, BASE + '/item/prod-1', 'demo-itemdetail.png')

  // ── Analytics buyer view (full page, long wait for CSV load) ──────
  await shot(pgBuyer, BASE + '/analytics', 'demo-analytics-buyer.png', { wait: 3500, fullPage: true })

  // ── Sell (seller) ──────────────────────────────────────────────────
  const ctxSeller = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const pgSell = await ctxSeller.newPage()
  await setDemo(pgSell, 'seller')
  await shot(pgSell, BASE + '/sell', 'demo-sell.png')

  // ── Admin kanban ───────────────────────────────────────────────────
  const ctxAdmin = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const pgAdmin = await ctxAdmin.newPage()
  await setDemo(pgAdmin, 'admin')
  await shot(pgAdmin, BASE + '/admin', 'demo-admin.png')

  await browser.close()
  console.log('done')
})()
