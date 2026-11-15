import { createRequire } from 'node:module'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const output = process.env.CAPTURE_DIR
const url = process.env.CAPTURE_URL
if (!output || !url) throw new Error('Set CAPTURE_URL and CAPTURE_DIR.')
let parsedUrl
try {
  parsedUrl = new URL(url)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported URL protocol')
} catch (error) {
  console.error(`Invalid CAPTURE_URL: ${error.message}`)
  process.exit(1)
}

const runtime = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
const { chromium } = require('playwright')
const config = JSON.parse(readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
if (process.platform === 'linux') process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim()
mkdirSync(output, { recursive: true })
const temporary = error => Object.assign(error, { exitCode: 75 })
let browser

try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(error => { throw temporary(error) })
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } }).catch(error => { throw temporary(error) })
    page.setDefaultTimeout(30000)
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    let response
    try {
      response = await page.goto(url, { waitUntil: 'load', timeout: 45000 })
    } catch (error) {
      await page.close().catch(() => {})
      throw temporary(error)
    }
    if (!response?.ok()) {
      const status = response?.status()
      await page.close().catch(() => {})
      throw Object.assign(new Error(`HTTP ${status ?? 'no response'} loading ${url}`), {
        exitCode: !status || [408, 429, 500, 502, 503, 504].includes(status) ? 75 : 1
      })
    }

    try {
      await page.locator('#game').waitFor({ state: 'visible' })
      await page.waitForFunction(() => {
        const canvas = document.querySelector('#scene')
        if (!canvas || canvas.width < window.innerWidth * 0.9 || canvas.height < window.innerHeight * 0.9) return false
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        if (!gl) return false
        const pixel = new Uint8Array(4)
        gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        return pixel[0] + pixel[1] + pixel[2] > 15
      }, undefined, { timeout: 30000 })
      await page.waitForFunction(() => document.fonts.status === 'loaded', undefined, { timeout: 15000 })
    } catch (error) {
      await page.close().catch(() => {})
      throw Object.assign(new Error(`The game did not render on ${name}: ${error.message}`), { exitCode: 1 })
    }
    if (pageErrors.length) {
      await page.close().catch(() => {})
      throw new Error(`Browser rendering error on ${name}: ${pageErrors.join('; ')}`)
    }

    await page.screenshot({ path: join(output, `final-${name}.png`), fullPage: true, timeout: 30000 }).catch(error => {
      throw temporary(error)
    })
    console.log(`Captured ${name} view (${width}x${height}) from ${url}`)
    await page.close()
  }
} catch (error) {
  console.error(error)
  process.exitCode = error.exitCode || 1
} finally {
  await browser?.close().catch(error => {
    console.error(error)
    process.exitCode ||= 75
  })
}
