// Renders the Open Graph images (1200×630) for each locale into public/og/<locale>.png.
// Run after changing the headline copy: `npm run og`.
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Inlined as data URIs: a setContent() page cannot load file:// URLs.
const font = (p) => `data:font/woff2;base64,${readFileSync(resolve('node_modules', p)).toString('base64')}`
const lora = font('@fontsource-variable/lora/files/lora-cyrillic-wght-normal.woff2')
const loraLatin = font('@fontsource-variable/lora/files/lora-latin-wght-normal.woff2')
const loraItalic = font('@fontsource-variable/lora/files/lora-latin-wght-italic.woff2')
const loraItalicCyr = font('@fontsource-variable/lora/files/lora-cyrillic-wght-italic.woff2')
const inter = font('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
const interCyr = font('@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2')

const html = (m) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Lora;src:url(${loraLatin}) format('woff2');font-weight:400 700;unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Lora;src:url(${lora}) format('woff2');font-weight:400 700;unicode-range:U+0400-04FF}
@font-face{font-family:Lora;font-style:italic;src:url(${loraItalic}) format('woff2');font-weight:400 700;unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Lora;font-style:italic;src:url(${loraItalicCyr}) format('woff2');font-weight:400 700;unicode-range:U+0400-04FF}
@font-face{font-family:Inter;src:url(${inter}) format('woff2');font-weight:100 900;unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Inter;src:url(${interCyr}) format('woff2');font-weight:100 900;unicode-range:U+0400-04FF}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#FAF5EC;font-family:Inter;color:#2B1D14;position:relative;overflow:hidden}
.blob{position:absolute;border-radius:50%;filter:blur(60px)}
.b1{width:620px;height:620px;background:#F7E1D5;right:-160px;top:-220px}
.b2{width:460px;height:460px;background:#E3EBDD;left:-160px;bottom:-240px}
.wrap{position:relative;padding:72px 80px;height:100%;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:14px;font:600 34px Lora}
h1{margin-top:auto;font:500 76px/1.04 Lora;letter-spacing:-.02em;max-width:880px}
em{color:#B5482A}
p{margin-top:26px;font-size:28px;color:#6B5646}
.cups{position:absolute;right:70px;bottom:120px;width:300px}
</style></head><body><div class="blob b1"></div><div class="blob b2"></div>
<div class="wrap"><div class="brand"><svg width="44" height="44" viewBox="0 0 32 32"><path d="M5 13h17v5a8.5 8.5 0 0 1-17 0z" fill="#B5482A"/><path d="M22 15h2a3 3 0 0 1 0 6h-2" fill="none" stroke="#B5482A" stroke-width="2.5"/><path d="M10.5 4c-1.5 2 1.5 3 0 5M16 4c-1.5 2 1.5 3 0 5" fill="none" stroke="#8FA88D" stroke-width="2" stroke-linecap="round"/></svg>Nakavu</div>
<h1>${m.title.replace('{never}', `<em>${m.never}</em>`)}</h1><p>${m.tagline}</p></div>
<svg class="cups" viewBox="0 0 400 240"><g transform="rotate(8 150 200)"><path d="M92 118h112v34a56 56 0 0 1-112 0z" fill="#B5482A"/><path d="M204 130h10a18 18 0 0 1 0 36h-12" stroke="#B5482A" stroke-width="9" fill="none" stroke-linecap="round"/></g><g transform="rotate(-8 252 200)"><path d="M198 118h112v34a56 56 0 0 1-112 0z" fill="#8FA88D"/><path d="M198 130h-10a18 18 0 0 0 0 36h12" stroke="#8FA88D" stroke-width="9" fill="none" stroke-linecap="round"/></g><path d="M201 44c-6-7-17-2-12 7l12 11 12-11c5-9-6-14-12-7z" fill="#B5482A"/></svg>
</body></html>`

mkdirSync('public/og', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const locale of ['uk', 'en', 'nl']) {
  const messages = JSON.parse(readFileSync(`i18n/locales/${locale}.json`, 'utf8'))
  await page.setContent(html({ title: messages.landing.hero.title, never: messages.landing.hero.never, tagline: messages.brand.tagline }), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `public/og/${locale}.png` })
  console.log(`public/og/${locale}.png`)
}
await browser.close()
