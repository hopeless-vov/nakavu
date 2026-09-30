// Renders every transactional email to { subject, html, text }. Pure: the
// mailer passes the outbox row in, nothing here talks to the network.

import { LABELS } from '../lib/labels.ts'
import type { Starter } from '../lib/starters.ts'
import { avatar, button, card, chip, esc, heading, label, layout, paragraph } from './layout.ts'
import { asLocale, EMAIL_STRINGS, type EmailLocale, fill } from './strings.ts'

export type EmailKind = 'match' | 'no_match' | 'reminder' | 'feedback' | 'invite' | 'welcome' | 'goodbye'

export interface RenderContext {
  siteUrl: string
}

export interface Attachment {
  filename: string
  content: string
  contentType: string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
  attachments?: Attachment[]
  headers: Record<string, string>
}

interface Partner {
  name: string
  firstName: string
  email: string
  jobTitle: string
  department: string
  city: string
  meetingFormat: 'in_person' | 'online' | 'both'
  languages: string[]
  interests: string[]
  askMeAbout: string
  avatarUrl: string | null
}

// deno-lint-ignore no-explicit-any
type Payload = Record<string, any>

export function localePath(locale: EmailLocale, path: string): string {
  return `${locale === 'uk' ? '' : `/${locale}`}${path}`
}

function dict<T extends Record<string, string>>(obj: T, key: string): string | undefined {
  return (obj as Record<string, string>)[key]
}

export function labels(locale: EmailLocale) {
  const l = LABELS[locale]
  return {
    interest: (k: string) => dict(l.catalog.interests, k) ?? k,
    language: (k: string) => dict(l.catalog.languages, k) ?? k,
    department: (k: string) => dict(l.catalog.departments, k) ?? k,
    starter(s: Starter): string {
      if (s.key === 'starters.sharedInterest') return fill(l.starters.sharedInterest, { interest: this.interest(s.params?.interest ?? '') })
      if (s.key === 'starters.theirTeam') return fill(l.starters.theirTeam, { department: this.department(s.params?.department ?? '') })
      return l.starters.generic[Number(s.key.split('.').pop())] ?? ''
    },
  }
}

const INTL_LOCALE: Record<EmailLocale, string> = { uk: 'uk-UA', en: 'en-GB', nl: 'nl-NL' }

function formatDate(locale: EmailLocale, iso: string, timeZone: string | undefined, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...opts, timeZone: timeZone || 'Europe/Amsterdam' }).format(new Date(iso))
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

/** RFC 5545 event: a 30-minute placeholder two weekdays after the round, 10:00 UTC. */
export function matchIcs(uid: string, roundAt: string, title: string, description: string): string {
  const d = new Date(roundAt)
  d.setUTCDate(d.getUTCDate() + 2)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(8, 0, 0, 0)
  const end = new Date(d.getTime() + 30 * 60_000)
  const stamp = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const clean = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nakavu//Coffee roulette//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${uid}@nakavu.app`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, `SUMMARY:${clean(title)}`, `DESCRIPTION:${clean(description)}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n')
}

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** Plain-text version: strip tags, keep line breaks and link targets. */
export function toText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<div style="display:none[\s\S]*?<\/div>/, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_m, href: string, text: string) => `${text.replace(/<[^>]+>/g, '').trim()} (${href.replace(/&amp;/g, '&')})`)
    .replace(/<(br|\/p|\/h1|\/tr|\/li)[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

export function renderEmail(kind: EmailKind, rawLocale: string, p: Payload, ctx: RenderContext): RenderedEmail {
  const locale = asLocale(rawLocale)
  const s = EMAIL_STRINGS[locale]
  const L = labels(locale)
  const url = (path: string) => `${ctx.siteUrl.replace(/\/+$/, '')}${localePath(locale, path)}`
  const settingsUrl = url('/app/account')
  const skipUrl = p.workspaceSlug ? url(`/app/workspaces?ws=${encodeURIComponent(p.workspaceSlug)}`) : settingsUrl
  const headers = { 'List-Unsubscribe': `<${settingsUrl}>` }
  const footerLinks = [{ label: s.common.settings, href: settingsUrl }]
  const wsFooter = p.workspaceName ? fill(s.common.footer, { workspace: p.workspaceName }) : s.common.footerGeneric

  const finish = (subject: string, preheader: string, body: string, links = footerLinks, attachments?: Attachment[]): RenderedEmail => {
    const html = layout({ lang: locale, title: subject, preheader, body, footer: wsFooter, footerLinks: links, siteUrl: url('/') })
    return { subject, html, text: toText(html), headers, ...(attachments ? { attachments } : {}) }
  }

  switch (kind) {
    case 'match': {
      const partners = p.partners as Partner[]
      const names = partners.map((x) => x.firstName).join(' & ')
      const mine = new Set((p.myInterests as string[]).map((x) => x.toLowerCase()))
      const shared = [...new Set(partners.flatMap((x) => x.interests).filter((i) => mine.has(i.toLowerCase())))]
      const month = formatDate(locale, p.roundAt, p.timezone, { month: 'long' })
      const deadline = formatDate(locale, p.nextRoundAt, p.timezone, { day: 'numeric', month: 'long' })
      const subject = fill(s.match.subject, { month, names })
      const preheader = shared.length ? fill(s.match.preheader, { shared: shared.map(L.interest).join(', ') }) : s.match.preheaderNone
      const mailto = `mailto:${partners.map((x) => encodeURIComponent(x.email)).join(',')}?subject=${encodeURIComponent(s.match.mailSubject)}&body=${encodeURIComponent(fill(s.match.mailBody, { names, me: p.firstName }))}`

      const people = partners
        .map((x) => {
          const role = [x.jobTitle, x.department && L.department(x.department)].filter(Boolean).join(', ')
          const facts = [x.city, s.common.formats[x.meetingFormat], x.languages.map(L.language).join(', ')].filter(Boolean).join(' · ')
          const chips = [...x.interests].sort((a, b) => Number(mine.has(b.toLowerCase())) - Number(mine.has(a.toLowerCase()))).map((i) => chip(L.interest(i), mine.has(i.toLowerCase()))).join('')
          return card(`<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:14px;vertical-align:top">${avatar(initials(x.name), x.avatarUrl)}</td><td style="vertical-align:middle">
<p class="fg" style="margin:0;font:500 22px/1.2 'Lora',Georgia,serif;color:#2B1D14">${esc(x.name)}</p>
${role ? `<p class="muted" style="margin:4px 0 0;font:400 15px/1.4 Inter,Arial,sans-serif;color:#6B5646">${esc(role)}</p>` : ''}
<p class="muted" style="margin:4px 0 0;font:400 13px/1.4 Inter,Arial,sans-serif;color:#6B5646">${esc(facts)}</p></td></tr></table>
${x.askMeAbout ? `<p class="muted" style="margin:16px 0 0;font:600 11px/1 Inter,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#6B5646">${esc(s.match.ask)}</p><p class="fg" style="margin:6px 0 0;font:italic 500 18px/1.4 'Lora',Georgia,serif;color:#2B1D14">${esc(x.askMeAbout)}</p>` : ''}
${chips ? `<div style="margin-top:14px">${chips}</div>` : ''}`)
        })
        .join('')
      const starters = (p.starters as Starter[]).map((x) => L.starter(x)).filter(Boolean)
      const startersHtml = starters.length
        ? label(s.match.starters) + starters.map((t, i) => `<p class="fg" style="margin:0 0 10px;font:400 16px/1.5 Inter,Arial,sans-serif;color:#2B1D14"><span style="color:#B5482A;font:500 17px 'Lora',Georgia,serif">${i + 1}.</span>&nbsp; ${esc(t)}</p>`).join('')
        : ''
      const body = [
        paragraph(esc(fill(s.match.greeting, { name: p.firstName, workspace: p.workspaceName })), true),
        heading(esc(fill(s.match.title, { names })).replace(esc(names), `<em style="color:#B5482A">${esc(names)}</em>`)),
        people,
        startersHtml,
        `<div style="margin:24px 0 8px">${button(fill(s.match.cta, { names }), mailto)}${button(s.common.open, url('/app'), 'secondary')}</div>`,
        paragraph(esc(fill(s.match.note, { deadline })), true),
      ].join('')
      const ics = matchIcs(`${p.roundAt}-${partners.map((x) => x.email).join('-')}`, p.roundAt, fill(s.match.title, { names }), `Nakavu · ${p.workspaceName} · ${partners.map((x) => x.name).join(', ')}`)
      return finish(subject, preheader, body, [{ label: s.common.skip, href: skipUrl }, ...footerLinks], [{ filename: 'nakavu-coffee.ics', content: toBase64(ics), contentType: 'text/calendar' }])
    }

    case 'no_match': {
      const next = formatDate(locale, p.nextRoundAt, p.timezone, { day: 'numeric', month: 'long' })
      const body = heading(esc(s.no_match.title)) + paragraph(esc(fill(s.no_match.body, { name: p.firstName, workspace: p.workspaceName, next }))) + button(s.no_match.cta, url('/app/account'))
      return finish(fill(s.no_match.subject, { workspace: p.workspaceName }), fill(s.no_match.preheader, { next }), body)
    }

    case 'reminder': {
      const date = formatDate(locale, p.roundAt, p.timezone, { weekday: 'long', day: 'numeric', month: 'long' })
      const body = heading(esc(s.reminder.title)) + paragraph(esc(fill(s.reminder.body, { name: p.firstName, date, workspace: p.workspaceName }))) + button(s.reminder.cta, skipUrl, 'secondary') + paragraph(esc(s.reminder.secondary), true)
      return finish(fill(s.reminder.subject, { workspace: p.workspaceName }), s.reminder.preheader, body)
    }

    case 'feedback': {
      const names = (p.partners as string[]).map((n) => n.split(' ')[0]).join(' & ')
      const answer = (a: string) => url(`/app/history?match=${encodeURIComponent(p.matchId)}&answer=${a}`)
      const body = heading(esc(fill(s.feedback.title, { names }))) + paragraph(esc(fill(s.feedback.body, { name: p.firstName }))) + `<div style="margin:8px 0">${button(s.feedback.met, answer('met'))}${button(s.feedback.notYet, answer('not_yet'), 'secondary')}${button(s.feedback.skipped, answer('skipped'), 'secondary')}</div>`
      return finish(fill(s.feedback.subject, { names }), s.feedback.preheader, body)
    }

    case 'invite': {
      const body = heading(esc(fill(s.invite.title, { workspace: p.workspaceName }))) + paragraph(esc(fill(s.invite.body, { inviter: p.inviterName, workspace: p.workspaceName }))) + button(s.invite.cta, url(`/join/${encodeURIComponent(p.token)}`)) + paragraph(esc(s.invite.note), true)
      return finish(fill(s.invite.subject, { inviter: p.inviterName, workspace: p.workspaceName }), s.invite.preheader, body, [])
    }

    case 'welcome': {
      const body = heading(esc(s.welcome.title)) + paragraph(esc(fill(s.welcome.body, { name: p.firstName }))) + button(s.welcome.cta, url('/app'))
      return finish(fill(s.welcome.subject, { name: p.firstName }), s.welcome.preheader, body)
    }

    case 'goodbye': {
      const body = heading(esc(fill(s.goodbye.title, { name: p.firstName || '' }).trim())) + paragraph(esc(s.goodbye.body))
      return finish(s.goodbye.subject, s.goodbye.preheader, body, [])
    }
  }
}

export type { EmailLocale }
