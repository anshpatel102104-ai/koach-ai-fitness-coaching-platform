// Smoke test: serve the production build with `vite preview`, load key public
// routes in headless Chromium, and fail on any uncaught page error or empty body.
// Guards against bundling regressions (e.g. circular manualChunks) that blank the app.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4173
const BASE = `http://localhost:${PORT}`
// `endsOn`: the pathname the visit must settle on (logged-out redirects).
const ROUTES = [
  { path: '/login' },
  { path: '/signup' },
  { path: '/signup?plan=pro&interval=monthly', endsOn: '/signup' },
  { path: '/forgot-password' },
  { path: '/reset-password' },
  { path: '/', endsOn: '/login' },
  { path: '/portal', endsOn: '/login' },
  { path: '/portal/workouts', endsOn: '/login' },
]
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium'

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
})

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('vite preview did not start')
}

let failed = false
let browser
try {
  await waitForServer()
  browser = await chromium.launch(
    existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {},
  )
  for (const { path: route, endsOn } of ROUTES) {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const bodyLen = await page.evaluate(() => document.body.innerText.trim().length)
    const rootKids = await page.evaluate(() => document.getElementById('root')?.children.length ?? 0)
    const finalPath = new URL(page.url()).pathname
    if (endsOn && finalPath !== endsOn) {
      failed = true
      console.error(`FAIL ${route}: ended on ${finalPath}, expected ${endsOn}`)
    } else if (errors.length) {
      failed = true
      console.error(`FAIL ${route}: page error(s): ${errors.join(' | ')}`)
    } else if (!bodyLen && !rootKids) {
      failed = true
      console.error(`FAIL ${route}: empty body`)
    } else {
      console.log(`PASS ${route} -> ${finalPath} (root children: ${rootKids}, text length: ${bodyLen})`)
    }
    await page.close()
  }
} catch (e) {
  failed = true
  console.error(e)
} finally {
  await browser?.close()
  preview.kill()
}
process.exit(failed ? 1 : 0)
