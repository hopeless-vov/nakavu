// Runs every due round, then queues reminders and "did you meet?" nudges.
// Called hourly by pg_cron (see migrations) with `Authorization: Bearer <CRON_SECRET>`.
import { createClient } from 'npm:@supabase/supabase-js@2'

import { runDueRounds } from '../_shared/rounds.ts'
import { supabaseRoundsDb } from '../_shared/supabase-db.ts'

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  try {
    const report = await runDueRounds(supabaseRoundsDb(db))
    // Kick the mailer so match emails go out right away.
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-emails`, { method: 'POST', headers: { authorization: `Bearer ${secret}` } }).catch(() => undefined)
    return Response.json(report)
  } catch (e) {
    console.error('run-due-rounds failed', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
})
