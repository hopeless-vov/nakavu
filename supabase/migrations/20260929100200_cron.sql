-- Scheduled work. Edge Functions are called through pg_net with a shared secret.
-- Before this runs in a project, store two Vault secrets (Dashboard → Vault, or SQL):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random string, same as the CRON_SECRET function secret>', 'cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.call_edge_function(fn text) returns bigint
language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
$$;

revoke execute on function public.call_edge_function(text) from public, anon, authenticated;

-- Rounds, reminders and nudges: five past every hour (rounds are scheduled on the hour).
select cron.schedule('nakavu-run-due-rounds', '5 * * * *', $$ select public.call_edge_function('run-due-rounds') $$);

-- The mailer drains the outbox every five minutes (invites, confirmations, retries).
select cron.schedule('nakavu-send-emails', '*/5 * * * *', $$ select public.call_edge_function('send-emails') $$);
