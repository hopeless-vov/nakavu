import { esc, layout } from '../../supabase/functions/_shared/email/layout'
import { type Mailer, MAX_ATTEMPTS, type OutboxRow, type OutboxStore, processOutbox, resendMailer } from '../../supabase/functions/_shared/email/outbox'
import { asLocale, EMAIL_STRINGS, fill } from '../../supabase/functions/_shared/email/strings'
import { labels, localePath, matchIcs, renderEmail, toText } from '../../supabase/functions/_shared/email/templates'
import { LABELS } from '../../supabase/functions/_shared/lib/labels'
import { readFileSync } from 'node:fs'

const ctx = { siteUrl: 'https://nakavu.app' }
const partner = {
  name: 'Tomás Herrera', firstName: 'Tomás', email: 'tomas@nw.com', jobTitle: 'Data Engineer', department: 'risk', city: 'Lisbon',
  meetingFormat: 'in_person' as const, languages: ['en', 'pt'], interests: ['coffee', 'hiking'], askMeAbout: 'croissants & <fraud>', avatarUrl: null,
}
const matchPayload = {
  workspaceName: 'Northwind', workspaceSlug: 'northwind', roundAt: '2026-10-01T07:00:00.000Z', nextRoundAt: '2026-11-01T08:00:00.000Z',
  kind: 'work', firstName: 'Olena', myInterests: ['hiking'], timezone: 'Europe/Kyiv', partners: [partner],
  starters: [{ key: 'starters.sharedInterest', params: { interest: 'hiking' } }, { key: 'starters.theirTeam', params: { department: 'risk' } }, { key: 'starters.generic.2' }],
}

type Tree = { [k: string]: string | Tree }
const flatten = (t: Tree, p = ''): Record<string, string> =>
  Object.entries(t).reduce((acc, [k, v]) => (typeof v === 'string' ? { ...acc, [p + k]: v } : { ...acc, ...flatten(v, `${p}${k}.`) }), {})
const holes = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort()

describe('email strings', () => {
  it('have the same keys and placeholders in uk, en and nl', () => {
    const uk = flatten(EMAIL_STRINGS.uk as unknown as Tree)
    for (const code of ['en', 'nl'] as const) {
      const other = flatten(EMAIL_STRINGS[code] as unknown as Tree)
      expect(Object.keys(other).sort()).toEqual(Object.keys(uk).sort())
      for (const [k, v] of Object.entries(uk)) expect(holes(other[k]!), `${code}:${k}`).toEqual(holes(v))
    }
  })

  it('fill replaces known placeholders and keeps unknown ones', () => {
    expect(fill('Hi {name}, {x}', { name: 'Olena' })).toBe('Hi Olena, {x}')
    expect(fill('plain')).toBe('plain')
  })

  it('falls back to Ukrainian for unknown locales', () => {
    expect([asLocale('en'), asLocale('nl'), asLocale('de'), asLocale('')]).toEqual(['en', 'nl', 'uk', 'uk'])
  })

  it('labels are generated from the current locale files (run `npm run sync:shared`)', () => {
    for (const code of ['uk', 'en', 'nl'] as const) {
      const m = JSON.parse(readFileSync(`i18n/locales/${code}.json`, 'utf8'))
      expect(LABELS[code]).toEqual({ catalog: m.catalog, starters: m.starters })
    }
  })
})

describe('email helpers', () => {
  it('builds locale paths', () => {
    expect(localePath('uk', '/app')).toBe('/app')
    expect(localePath('nl', '/app')).toBe('/nl/app')
  })

  it('resolves labels and starters, keeping unknown values', () => {
    const l = labels('en')
    expect(l.interest('hiking')).toBe('Hiking')
    expect(l.interest('Birding')).toBe('Birding')
    expect(l.language('uk')).toBe('Ukrainian')
    expect(l.language('xx')).toBe('xx')
    expect(esc(null)).toBe('')
    expect(l.department('Treasury')).toBe('Treasury')
    expect(l.starter({ key: 'starters.sharedInterest', params: { interest: 'jazz' } })).toBe('You both picked “Jazz”. How did you get into it?')
    expect(l.starter({ key: 'starters.theirTeam', params: { department: 'risk' } })).toBe('What does a normal Tuesday look like in Risk?')
    expect(l.starter({ key: 'starters.sharedInterest' })).toContain('“”')
    expect(l.starter({ key: 'starters.theirTeam' })).toContain('in ?')
    expect(l.starter({ key: 'starters.generic.0' })).toBe('What’s the best work advice you’ve ever had?')
    expect(l.starter({ key: 'starters.generic.99' })).toBe('')
  })

  it('builds a weekday calendar event two days after the round', () => {
    const ics = matchIcs('u1', '2026-10-02T07:00:00Z', 'Coffee, with; Tomás', 'Line\nTwo')
    expect(ics).toContain('DTSTART:20261005T080000Z') // Fri 2 Oct + 2 → Sun → Mon 5 Oct
    expect(ics).toContain('SUMMARY:Coffee\\, with\\; Tomás')
    expect(ics).toContain('DESCRIPTION:Line\\nTwo')
  })

  it('turns HTML into readable text', () => {
    const text = toText('<style>x{}</style><div style="display:none">pre</div><h1>Hi &amp; bye</h1><p>A <a href="https://x.io/?a=1&amp;b=2">link</a></p><br>&lt;ok&gt; &quot;q&quot; &#39;s&#39;&nbsp;end')
    expect(text).toBe('Hi & bye\nA link (https://x.io/?a=1&b=2)\n\n<ok> "q" \'s\' end')
  })

  it('layout carries lang, preheader, dark-mode styles and footer links', () => {
    const html = layout({ lang: 'nl', title: 'T', preheader: 'Pre', body: '<p>Body</p>', footer: 'Foot', footerLinks: [{ label: 'Settings', href: 'https://x/s' }], siteUrl: 'https://x/' })
    expect(html).toContain('<html lang="nl"')
    expect(html).toContain('prefers-color-scheme:dark')
    expect(html).toContain('>Pre')
    expect(html).toContain('href="https://x/s"')
  })
})

describe('renderEmail', () => {
  it('renders the match email with partner card, shared interests, starters, mailto and .ics', () => {
    const m = renderEmail('match', 'uk', matchPayload, ctx)
    expect(m.subject).toBe('Ваша кава на жовтень: знайомтеся з Tomás')
    expect(m.html).toContain('Tomás Herrera')
    expect(m.html).toContain('Data Engineer, Ризики')
    expect(m.html).toContain('Lisbon · Наживо · Англійська, Португальська')
    expect(m.html).toContain('croissants &amp; &lt;fraud&gt;')
    expect(m.html).not.toContain('<fraud>')
    expect(m.html).toContain('✓ Походи')
    expect(m.html).toContain('Ви обоє вказали «Походи»')
    expect(m.html).toContain('mailto:tomas%40nw.com?subject=')
    expect(m.html).toContain('https://nakavu.app/app/workspaces?ws=northwind')
    expect(m.html).toContain('<html lang="uk"')
    expect(m.text).toContain('Tomás Herrera')
    expect(m.headers['List-Unsubscribe']).toBe('<https://nakavu.app/app/account>')
    expect(m.attachments![0]!.filename).toBe('nakavu-coffee.ics')
    expect(atob(m.attachments![0]!.content)).toContain('BEGIN:VCALENDAR')
  })

  it('renders a trio in English without shared interests, with an avatar photo', () => {
    const m = renderEmail('match', 'en', { ...matchPayload, myInterests: [], starters: [], partners: [{ ...partner, avatarUrl: 'https://cdn/a.png', askMeAbout: '', interests: [], jobTitle: '', department: '' }, { ...partner, firstName: 'Ann', name: 'Ann Lee', email: 'ann@nw.com' }] }, ctx)
    expect(m.subject).toBe('Your October coffee: meet Tomás & Ann')
    expect(m.html).toContain('<img src="https://cdn/a.png"')
    const nameless = renderEmail('match', 'en', { ...matchPayload, partners: [{ ...partner, name: '' }] }, ctx)
    expect(nameless.html).toContain('>?</div>')
    expect(m.html).toContain('mailto:tomas%40nw.com,ann%40nw.com')
    expect(m.html).not.toContain('A few ways to start')
    expect(m.html).toContain('https://nakavu.app/en/app')
  })

  it('renders no-match, reminder, feedback, invite, welcome and goodbye', () => {
    const noMatch = renderEmail('no_match', 'nl', { workspaceName: 'Club', nextRoundAt: '2026-11-01T08:00:00Z', firstName: 'Sem' }, ctx)
    expect(noMatch.subject).toBe('Deze keer geen match in “Club”')
    expect(noMatch.html).toContain('https://nakavu.app/nl/app/account')

    const reminder = renderEmail('reminder', 'en', { workspaceName: 'Northwind', workspaceSlug: 'nw', roundAt: '2026-10-01T07:00:00Z', firstName: 'Olena', timezone: 'Europe/Amsterdam' }, ctx)
    expect(reminder.html).toContain('Thursday 1 October')
    expect(reminder.html).toContain('/en/app/workspaces?ws=nw')

    const feedback = renderEmail('feedback', 'uk', { workspaceName: 'Northwind', roundAt: '2026-09-01', firstName: 'Olena', matchId: 'm 1', partners: ['Tomás Herrera', 'Ann Lee'] }, ctx)
    expect(feedback.subject).toBe('Ви вже зустрілися з Tomás & Ann?')
    expect(feedback.html).toContain('/app/history?match=m%201&amp;answer=met')
    expect(feedback.html).toContain('answer=skipped')

    const invite = renderEmail('invite', 'uk', { workspaceName: 'Northwind', inviterName: 'Priya', token: 'abc' }, ctx)
    expect(invite.subject).toBe('Priya запрошує вас на каву в «Northwind»')
    expect(invite.html).toContain('https://nakavu.app/join/abc')
    expect(invite.html).toContain('Ви отримали цей лист, бо ви у воркспейсі «Northwind»')

    const welcome = renderEmail('welcome', 'en', { firstName: 'Olena' }, ctx)
    expect(welcome.subject).toBe('Welcome to Nakavu, Olena!')
    expect(welcome.html).toContain('You’re getting this because you have a Nakavu account.')

    const goodbye = renderEmail('goodbye', 'nl', { firstName: '' }, ctx)
    expect(goodbye.subject).toBe('Je Nakavu-account is verwijderd')
    expect(goodbye.attachments).toBeUndefined()
  })
})

describe('processOutbox', () => {
  const row = (id: number, over: Partial<OutboxRow> = {}): OutboxRow => ({ id, kind: 'welcome', toEmail: `u${id}@x.io`, locale: 'en', payload: { firstName: 'A' }, attempts: 0, ...over })

  function fakes(rows: OutboxRow[], failOn: number[] = []) {
    const store = { claim: vi.fn(async () => rows), markSent: vi.fn(async () => undefined), markFailed: vi.fn(async () => undefined) } satisfies OutboxStore
    const mailer = { send: vi.fn(async (e: { to: string }) => { if (failOn.some((id) => e.to === `u${id}@x.io`)) throw new Error('boom') }) } satisfies Mailer
    return { store, mailer }
  }

  it('sends each row and records results, giving up after the last attempt', async () => {
    const { store, mailer } = fakes([row(1), row(2), row(3, { attempts: MAX_ATTEMPTS - 1 })], [2, 3])
    const result = await processOutbox(store, mailer, { siteUrl: 'https://x', from: 'Nakavu <hi@x>' })
    expect(result).toEqual({ sent: 1, failed: 2 })
    expect(store.claim).toHaveBeenCalledWith(50)
    expect(mailer.send.mock.calls[0]![0]).toMatchObject({ from: 'Nakavu <hi@x>', to: 'u1@x.io', subject: 'Welcome to Nakavu, A!' })
    expect(store.markSent).toHaveBeenCalledWith(1)
    expect(store.markFailed).toHaveBeenCalledWith(2, 'boom', 1, false)
    expect(store.markFailed).toHaveBeenCalledWith(3, 'boom', MAX_ATTEMPTS, true)
  })

  it('records non-Error failures too', async () => {
    const store = { claim: vi.fn(async () => [row(1)]), markSent: vi.fn(), markFailed: vi.fn(async () => undefined) }
    await processOutbox(store, { send: () => Promise.reject('nope') }, { siteUrl: 'x', from: 'y', limit: 5 })
    expect(store.claim).toHaveBeenCalledWith(5)
    expect(store.markFailed).toHaveBeenCalledWith(1, 'nope', 1, false)
  })
})

describe('resendMailer', () => {
  it('posts to the Resend API and surfaces errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }))
    const mailer = resendMailer('re_key', fetchImpl as unknown as typeof fetch)
    await mailer.send({ from: 'f', to: 't@x', subject: 's', html: 'h', text: 't', headers: { a: 'b' }, attachments: [{ filename: 'a.ics', content: 'QQ==', contentType: 'text/calendar' }] })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_key')
    expect(JSON.parse(init.body as string)).toMatchObject({ to: ['t@x'], attachments: [{ filename: 'a.ics', content_type: 'text/calendar' }] })

    await mailer.send({ from: 'f', to: 't', subject: 's', html: 'h', text: 't', headers: {} })
    expect(JSON.parse((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body as string).attachments).toBeUndefined()

    const failing = resendMailer('k', (async () => new Response('bad', { status: 422 })) as unknown as typeof fetch)
    await expect(failing.send({ from: 'f', to: 't', subject: 's', html: 'h', text: 't', headers: {} })).rejects.toThrow('Resend 422: bad')
  })

  it('uses the global fetch by default', () => {
    expect(resendMailer('k').send).toBeTypeOf('function')
  })
})
