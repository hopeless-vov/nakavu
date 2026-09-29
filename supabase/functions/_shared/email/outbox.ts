// Drains email_outbox: render each row, hand it to the mailer, record the result.

import { type Attachment, type EmailKind, renderEmail } from './templates.ts'

export const MAX_ATTEMPTS = 5

export interface OutboxRow {
  id: number
  kind: EmailKind
  toEmail: string
  locale: string
  payload: Record<string, unknown>
  attempts: number
}

export interface OutboxStore {
  /** Queued rows that still have attempts left, oldest first. */
  claim(limit: number): Promise<OutboxRow[]>
  markSent(id: number): Promise<void>
  markFailed(id: number, error: string, attempts: number, final: boolean): Promise<void>
}

export interface OutgoingEmail {
  from: string
  to: string
  subject: string
  html: string
  text: string
  headers: Record<string, string>
  attachments?: Attachment[]
}

export interface Mailer {
  send(email: OutgoingEmail): Promise<void>
}

export interface OutboxResult {
  sent: number
  failed: number
}

export async function processOutbox(store: OutboxStore, mailer: Mailer, opts: { siteUrl: string; from: string; limit?: number }): Promise<OutboxResult> {
  const result: OutboxResult = { sent: 0, failed: 0 }
  for (const row of await store.claim(opts.limit ?? 50)) {
    try {
      const email = renderEmail(row.kind, row.locale, row.payload, { siteUrl: opts.siteUrl })
      await mailer.send({ from: opts.from, to: row.toEmail, ...email })
      await store.markSent(row.id)
      result.sent++
    } catch (e) {
      const attempts = row.attempts + 1
      await store.markFailed(row.id, e instanceof Error ? e.message : String(e), attempts, attempts >= MAX_ATTEMPTS)
      result.failed++
    }
  }
  return result
}

/** Resend HTTP API mailer. */
export function resendMailer(apiKey: string, fetchImpl: typeof fetch = fetch): Mailer {
  return {
    async send(email) {
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: email.from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: email.headers,
          attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.content, content_type: a.contentType })),
        }),
      })
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
    },
  }
}
