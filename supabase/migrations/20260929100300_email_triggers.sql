-- Transactional emails that start from a database change go through the outbox
-- (rendered and sent by the send-emails Edge Function).

-- Personal invite → invite email, in the inviter's language.
create function public.enqueue_invite_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inviter public.profiles;
  ws public.workspaces;
begin
  select * into inviter from public.profiles where id = new.invited_by;
  select * into ws from public.workspaces where id = new.workspace_id;
  insert into public.email_outbox (kind, to_email, locale, payload, dedupe_key)
  values (
    'invite',
    new.email,
    coalesce(inviter.locale, 'uk'),
    jsonb_build_object(
      'workspaceName', ws.name,
      'inviterName', coalesce(nullif(btrim(inviter.first_name || ' ' || inviter.last_name), ''), inviter.email::text, 'Nakavu'),
      'token', new.token
    ),
    'invite:' || new.id
  )
  on conflict (dedupe_key) do nothing;
  return new;
end $$;

create trigger invites_enqueue_email after insert on public.invites
  for each row execute function public.enqueue_invite_email();

-- Finished onboarding → welcome email (once).
create function public.enqueue_welcome_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.email_outbox (kind, user_id, to_email, locale, payload, dedupe_key)
  values ('welcome', new.id, new.email, new.locale, jsonb_build_object('firstName', new.first_name), 'welcome:' || new.id)
  on conflict (dedupe_key) do nothing;
  return new;
end $$;

create trigger profiles_enqueue_welcome after update of onboarded_at on public.profiles
  for each row when (old.onboarded_at is null and new.onboarded_at is not null)
  execute function public.enqueue_welcome_email();

-- Account deletion → goodbye email. Queued without user_id so it survives the cascade.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  ws uuid;
  me public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into me from public.profiles where id = auth.uid();
  insert into public.email_outbox (kind, to_email, locale, payload, dedupe_key)
  values ('goodbye', me.email, coalesce(me.locale, 'uk'), jsonb_build_object('firstName', me.first_name), 'goodbye:' || auth.uid())
  on conflict (dedupe_key) do nothing;

  -- Hand ownership to the longest-standing admin/member so workspaces survive.
  for ws in select workspace_id from public.memberships where user_id = auth.uid() and role = 'owner' loop
    if (select count(*) from public.memberships where workspace_id = ws and role = 'owner') = 1 then
      update public.memberships set role = 'owner'
       where (workspace_id, user_id) = (
         select workspace_id, user_id from public.memberships
          where workspace_id = ws and user_id <> auth.uid()
          order by (role = 'admin') desc, joined_at
          limit 1);
    end if;
  end loop;
  delete from public.workspaces w where not exists (
    select 1 from public.memberships m where m.workspace_id = w.id and m.user_id <> auth.uid()
  ) and exists (select 1 from public.memberships m where m.workspace_id = w.id and m.user_id = auth.uid());
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_my_account() from anon;
