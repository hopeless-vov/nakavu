// Supabase Auth email templates (Go templates), generated from the same email
// layout as transactional mail. Each file carries uk/en/nl and picks one with
// `.Data.locale` (set at sign-up from the interface language).
//
// Links go to our /auth/confirm page with `token_hash` — it verifies only when
// the person clicks, so corporate link scanners can't burn the token — and every
// sign-in email also shows the 6-digit code.

import { button, heading, layout, paragraph } from './layout.ts'
import type { EmailLocale } from './strings.ts'

export type AuthTemplate = 'magic_link' | 'confirmation' | 'invite' | 'email_change' | 'reauthentication'

const COPY = {
  uk: {
    footer: 'Ви отримали цей лист, бо хтось увів цю адресу в Nakavu. Якщо це були не ви — просто проігноруйте його.',
    code: 'Або введіть код',
    codeOnly: 'Ваш код',
    expires: 'Посилання й код діють 15 хвилин і спрацюють один раз.',
    magic_link: { preheader: 'Ваше посилання та код для входу в Nakavu.', title: 'Вхід у Nakavu', body: 'Натисніть кнопку, щоб увійти. Паролі не потрібні.', cta: 'Увійти в Nakavu' },
    confirmation: { preheader: 'Підтвердьте пошту, щоб почати пити каву з колегами.', title: 'Ласкаво просимо до Nakavu!', body: 'Підтвердьте адресу — і за хвилину ви будете в грі.', cta: 'Підтвердити й увійти' },
    invite: { preheader: 'Вас запросили до Nakavu.', title: 'Вас запросили до Nakavu', body: 'Кавова рулетка для команд і друзів: раз на раунд ми знайомимо вас із кимось за кавою.', cta: 'Прийняти запрошення' },
    email_change: { preheader: 'Підтвердьте нову адресу для Nakavu.', title: 'Підтвердьте нову пошту', body: 'Ви змінюєте адресу пошти в Nakavu на {{ .NewEmail }}. Натисніть кнопку, щоб підтвердити.', cta: 'Підтвердити нову пошту' },
    reauthentication: { preheader: 'Код підтвердження для Nakavu.', title: 'Підтвердіть, що це ви', body: 'Введіть цей код у Nakavu, щоб продовжити.', cta: '' },
  },
  en: {
    footer: 'You’re getting this because someone entered this address on Nakavu. If it wasn’t you, just ignore this email.',
    code: 'Or enter this code',
    codeOnly: 'Your code',
    expires: 'The link and code work for 15 minutes, once.',
    magic_link: { preheader: 'Your Nakavu sign-in link and code.', title: 'Sign in to Nakavu', body: 'Tap the button to sign in. No password needed.', cta: 'Sign in to Nakavu' },
    confirmation: { preheader: 'Confirm your email to start having coffee with colleagues.', title: 'Welcome to Nakavu!', body: 'Confirm your address and you’ll be in within a minute.', cta: 'Confirm and sign in' },
    invite: { preheader: 'You’ve been invited to Nakavu.', title: 'You’re invited to Nakavu', body: 'Coffee roulette for teams and friends: every round we introduce you to someone over coffee.', cta: 'Accept the invite' },
    email_change: { preheader: 'Confirm your new Nakavu email address.', title: 'Confirm your new email', body: 'You’re changing your Nakavu email to {{ .NewEmail }}. Tap the button to confirm.', cta: 'Confirm new email' },
    reauthentication: { preheader: 'Your Nakavu confirmation code.', title: 'Confirm it’s you', body: 'Enter this code in Nakavu to continue.', cta: '' },
  },
  nl: {
    footer: 'Je krijgt deze mail omdat iemand dit adres op Nakavu invulde. Was jij het niet? Negeer deze mail dan gewoon.',
    code: 'Of vul deze code in',
    codeOnly: 'Je code',
    expires: 'De link en code zijn 15 minuten geldig en werken één keer.',
    magic_link: { preheader: 'Je inloglink en code voor Nakavu.', title: 'Inloggen bij Nakavu', body: 'Klik op de knop om in te loggen. Geen wachtwoord nodig.', cta: 'Inloggen bij Nakavu' },
    confirmation: { preheader: 'Bevestig je e-mail en drink koffie met collega’s.', title: 'Welkom bij Nakavu!', body: 'Bevestig je adres en binnen een minuut doe je mee.', cta: 'Bevestigen en inloggen' },
    invite: { preheader: 'Je bent uitgenodigd voor Nakavu.', title: 'Je bent uitgenodigd voor Nakavu', body: 'Koffieroulette voor teams en vrienden: elke ronde stellen we je aan iemand voor bij de koffie.', cta: 'Uitnodiging accepteren' },
    email_change: { preheader: 'Bevestig je nieuwe e-mailadres voor Nakavu.', title: 'Bevestig je nieuwe e-mail', body: 'Je wijzigt je e-mailadres bij Nakavu naar {{ .NewEmail }}. Klik op de knop om te bevestigen.', cta: 'Nieuw e-mailadres bevestigen' },
    reauthentication: { preheader: 'Je bevestigingscode voor Nakavu.', title: 'Bevestig dat jij het bent', body: 'Vul deze code in bij Nakavu om verder te gaan.', cta: '' },
  },
} as const

/** Trilingual, language-neutral subjects (Supabase subjects are not per-user templates). */
export const AUTH_SUBJECTS: Record<AuthTemplate, string> = {
  magic_link: 'Nakavu — вхід · sign in · inloggen',
  confirmation: 'Nakavu — підтвердіть пошту · confirm your email · bevestig je e-mail',
  invite: 'Nakavu — запрошення · invitation · uitnodiging',
  email_change: 'Nakavu — нова пошта · new email · nieuw e-mailadres',
  reauthentication: 'Nakavu — код · code · code',
}

const TYPE: Record<Exclude<AuthTemplate, 'reauthentication'>, string> = {
  magic_link: 'email',
  confirmation: 'email',
  invite: 'invite',
  email_change: 'email_change',
}

/** Our confirm page. The app always passes a redirect with ?next=…, so we append with &. */
function confirmUrl(template: Exclude<AuthTemplate, 'reauthentication'>): string {
  const params = `token_hash={{ .TokenHash }}&type=${TYPE[template]}`
  return `{{ if .RedirectTo }}{{ .RedirectTo }}&${params}{{ else }}{{ .SiteURL }}/auth/confirm?next=/app&${params}{{ end }}`
}

function codeBlock(label: string): string {
  return `<p class="muted" style="margin:24px 0 8px;font:600 12px/1 Inter,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#6B5646">${label}</p>
<p class="fg" style="margin:0 0 16px;font:500 36px/1 'Lora',Georgia,serif;letter-spacing:.3em;color:#2B1D14">{{ .Token }}</p>`
}

function renderOne(template: AuthTemplate, locale: EmailLocale): string {
  const c = COPY[locale]
  const t = c[template]
  const body =
    template === 'reauthentication'
      ? heading(t.title) + paragraph(t.body) + codeBlock(c.codeOnly)
      : heading(t.title) +
        paragraph(t.body) +
        button(t.cta, confirmUrl(template)) +
        (template === 'magic_link' || template === 'confirmation' ? codeBlock(c.code) : '') +
        paragraph(c.expires, true)
  return layout({ lang: locale, title: t.title, preheader: t.preheader, body, footer: c.footer, footerLinks: [], siteUrl: '{{ .SiteURL }}' })
}

/** One Go template file with all three languages. */
export function buildAuthTemplate(template: AuthTemplate): string {
  return [
    `{{/* Generated by scripts/build-auth-templates.ts — do not edit by hand. */}}`,
    // printf turns a missing locale into a string, so eq never compares against nil.
    '{{ $locale := printf "%v" .Data.locale }}{{ if eq $locale "en" }}',
    renderOne(template, 'en'),
    '{{ else if eq $locale "nl" }}',
    renderOne(template, 'nl'),
    `{{ else }}`,
    renderOne(template, 'uk'),
    `{{ end }}`,
    '',
  ].join('\n')
}

export const AUTH_TEMPLATES: AuthTemplate[] = ['magic_link', 'confirmation', 'invite', 'email_change', 'reauthentication']
