/**
 * Captura las tres variantes de la pantalla de acceso **con** el ayudante
 * "Try a demo account" visible (VITE_SHOW_DEMO_ACCOUNTS=1, que es el valor por
 * defecto del producto).
 *
 * Se ejecuta aparte de capture.mjs para no renumerar las 75 capturas del run
 * principal: estas se añaden al final como 76, 77 y 78.
 *
 * Requiere el servidor levantado con el flag activado:
 *   VITE_API_URL=... VITE_SHOW_DEMO_ACCOUNTS=1 npx vite --port 5199 --strictPort
 *
 * Uso:
 *   WEB_URL=http://127.0.0.1:5199 OUT_DIR=.../screenshots/raw node capture-login-variants.mjs
 */

import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const WEB = process.env.WEB_URL ?? 'http://127.0.0.1:5199'
const OUT = path.resolve(process.env.OUT_DIR ?? './raw')

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const SCALE = 2

const KILL_MOTION = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  * { caret-color: transparent !important; }
`

const SHOTS = [
  { file: '76-login-demo-accounts-desktop.png', device: DESKTOP, theme: 'light' },
  { file: '77-login-demo-accounts-dark-desktop.png', device: DESKTOP, theme: 'dark' },
  { file: '78-login-demo-accounts-mobile.png', device: MOBILE, theme: 'light' },
]

const browser = await chromium.launch()
await fs.mkdir(OUT, { recursive: true })

for (const shot of SHOTS) {
  const isMobile = shot.device === MOBILE
  const context = await browser.newContext({
    viewport: shot.device,
    deviceScaleFactor: SCALE,
    colorScheme: shot.theme,
    isMobile,
    hasTouch: isMobile,
    locale: 'en-US',
    timezoneId: 'UTC',
  })
  await context.addInitScript((preference) => {
    try {
      localStorage.setItem('network-theme', JSON.stringify({ state: { preference }, version: 2 }))
    } catch {
      /* ignore */
    }
  }, shot.theme)

  const page = await context.newPage()
  await page.goto(`${WEB}/login`)
  await page.getByText('Try a demo account').waitFor({ timeout: 20000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.addStyleTag({ content: KILL_MOTION }).catch(() => {})
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(450)
  await page.screenshot({ path: path.join(OUT, shot.file), animations: 'disabled' })
  console.log(`  + ${shot.file}`)
  await context.close()
}

await browser.close()
console.log('done')
