// Email-safe building blocks: table layout, inline styles, bulletproof buttons.
// Email clients don't support CSS variables, so colours are literal hex here —
// they mirror the app's light theme tokens, with a dark variant for clients
// that honour prefers-color-scheme (Apple Mail, iOS, some Outlook builds).

export const C = {
  bg: '#FAF5EC',
  surface: '#FFFDF9',
  surface2: '#F3EADC',
  line: '#E6D9C6',
  fg: '#2B1D14',
  muted: '#6B5646',
  accent: '#B5482A',
  onAccent: '#FFFFFF',
  sageSoft: '#E3EBDD',
  sageText: '#3F5A43',
  accentSoft: '#F7E1D5',
  accentText: '#9C3B20',
} as const

const SERIF = "'Lora', Georgia, 'Times New Roman', serif"
const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function button(label: string, href: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bg = variant === 'primary' ? C.accent : C.surface
  const fg = variant === 'primary' ? C.onAccent : C.fg
  const border = variant === 'primary' ? C.accent : C.line
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:4px 6px 4px 0"><tr><td class="btn-${variant}" bgcolor="${bg}" style="border-radius:999px;border:1px solid ${border}">
<a href="${esc(href)}" style="display:inline-block;padding:13px 24px;font:600 15px/1 ${SANS};color:${fg};text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`
}

export function chip(label: string, shared = false): string {
  const bg = shared ? C.sageSoft : C.surface2
  const fg = shared ? C.sageText : C.muted
  return `<span class="chip${shared ? ' chip-shared' : ''}" style="display:inline-block;margin:0 6px 6px 0;padding:5px 12px;border-radius:999px;background:${bg};color:${fg};font:500 13px/1.2 ${SANS}">${shared ? '✓ ' : ''}${esc(label)}</span>`
}

export function heading(text: string): string {
  return `<h1 class="fg" style="margin:0 0 12px;font:500 30px/1.15 ${SERIF};color:${C.fg};letter-spacing:-0.01em">${text}</h1>`
}

export function paragraph(text: string, muted = false): string {
  return `<p class="${muted ? 'muted' : 'fg'}" style="margin:0 0 16px;font:400 16px/1.6 ${SANS};color:${muted ? C.muted : C.fg}">${text}</p>`
}

export function label(text: string): string {
  return `<p class="muted" style="margin:24px 0 10px;font:600 12px/1 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${C.muted}">${esc(text)}</p>`
}

export function card(inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px"><tr><td class="surface2" style="background:${C.surface2};border-radius:18px;padding:20px 22px">${inner}</td></tr></table>`
}

export function avatar(initials: string, url?: string | null): string {
  if (url) return `<img src="${esc(url)}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:999px;object-fit:cover">`
  return `<div style="width:56px;height:56px;border-radius:999px;background:${C.accent};color:${C.onAccent};font:600 20px/56px ${SANS};text-align:center">${esc(initials)}</div>`
}

const CUP = `<svg width="30" height="30" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M5 13h17v5a8.5 8.5 0 0 1-17 0z" fill="${C.accent}"/><path d="M22 15h2a3 3 0 0 1 0 6h-2" fill="none" stroke="${C.accent}" stroke-width="2.5"/><path d="M10.5 4c-1.5 2 1.5 3 0 5M16 4c-1.5 2 1.5 3 0 5" fill="none" stroke="#8FA88D" stroke-width="2" stroke-linecap="round"/></svg>`

export interface LayoutOptions {
  lang: string
  title: string
  preheader: string
  body: string
  footer: string
  footerLinks: { label: string; href: string }[]
  siteUrl: string
}

export function layout(o: LayoutOptions): string {
  const links = o.footerLinks.map((l) => `<a href="${esc(l.href)}" style="color:${C.muted};text-decoration:underline">${esc(l.label)}</a>`).join(' &nbsp;·&nbsp; ')
  return `<!doctype html>
<html lang="${esc(o.lang)}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Lora:ital,wght@0,500;1,500&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;background:${C.bg}}
  a{color:${C.accent}}
  @media (max-width:600px){.container{width:100%!important}.pad{padding:28px 22px!important}}
  @media (prefers-color-scheme:dark){
    body,.bg{background:#1B1310!important}
    .surface{background:#261B16!important;border-color:#3D2E25!important}
    .surface2,.chip{background:#31241D!important}
    .chip-shared{background:#2B3829!important;color:#BFD6BB!important}
    .fg{color:#F5EADC!important}
    .muted{color:#C9B5A2!important}
    .btn-primary{background:#E68A63!important;border-color:#E68A63!important}
    .btn-primary a{color:#1B1310!important}
    .btn-secondary{background:#261B16!important;border-color:#3D2E25!important}
    .btn-secondary a{color:#F5EADC!important}
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:${C.bg}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px">
    <tr><td style="padding:0 8px 18px">
      <a href="${esc(o.siteUrl)}" style="text-decoration:none;font:600 22px/1 ${SERIF};color:${C.fg}" class="fg">${CUP}&nbsp;Nakavu</a>
    </td></tr>
    <tr><td class="surface pad" style="background:${C.surface};border:1px solid ${C.line};border-radius:28px;padding:40px 40px 32px">
      ${o.body}
    </td></tr>
    <tr><td style="padding:22px 16px 0;font:400 13px/1.6 ${SANS};color:${C.muted}" class="muted" align="center">
      ${esc(o.footer)}<br>${links}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}
