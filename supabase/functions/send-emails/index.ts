// Sends queued transactional email (email_outbox) through Resend.
// Triggered by pg_cron every 5 minutes and right after run-due-rounds.
import { createClient } from 'npm:@supabase/supabase-js@2'

import { type OutboxStore, processOutbox, resendMailer } from '../_shared/email/outbox.ts'

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const store: OutboxStore = {
    async claim(limit) {
      const { data, error } = await db
        .from('email_outbox')
        .select('id, kind, to_email, locale, payload, attempts')
        .eq('status', 'queued')
        .lt('attempts', 5)
        .order('created_at')
        .limit(limit)
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({ id: r.id, kind: r.kind, toEmail: r.to_email, locale: r.locale, payload: r.payload, attempts: r.attempts }))
    },
    async markSent(id) {
      await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', id)
    },
    async markFailed(id, message, attempts, final) {
      await db.from('email_outbox').update({ attempts, last_error: message, status: final ? 'failed' : 'queued' }).eq('id', id)
    },
  }

  const result = await processOutbox(store, resendMailer(Deno.env.get('RESEND_API_KEY')!), {
    siteUrl: Deno.env.get('SITE_URL') ?? 'https://nakavu.app',
    from: Deno.env.get('MAIL_FROM') ?? 'Nakavu <hello@nakavu.app>',
  })
  return Response.json(result)
})
