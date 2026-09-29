-- Nakavu schema: people, workspaces, memberships, invites, rounds and matches.
-- Every table has RLS on. Anything that needs to cross a policy boundary
-- (creating a workspace with its owner, joining by token, stats) is a
-- SECURITY DEFINER function with its own checks.

create extension if not exists citext with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ── Types ──────────────────────────────────────────────────────────────
create type public.meeting_format as enum ('in_person', 'online', 'both');
create type public.workspace_kind as enum ('work', 'friends');
create type public.cadence as enum ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly');
create type public.member_role as enum ('owner', 'admin', 'member');
create type public.match_feedback as enum ('met', 'not_yet', 'skipped');
create type public.round_status as enum ('pending', 'done');

-- ── Profiles ───────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null,
  first_name text not null default '' check (char_length(first_name) <= 60),
  last_name text not null default '' check (char_length(last_name) <= 60),
  job_title text not null default '' check (char_length(job_title) <= 80),
  department text not null default '' check (char_length(department) <= 60),
  city text not null default '' check (char_length(city) <= 60),
  meeting_format public.meeting_format not null default 'both',
  languages text[] not null default '{}' check (cardinality(languages) <= 20),
  interests text[] not null default '{}' check (cardinality(interests) <= 30),
  ask_me_about text not null default '' check (char_length(ask_me_about) <= 80),
  avatar_url text,
  locale text not null default 'uk' check (locale in ('uk', 'en', 'nl')),
  timezone text not null default 'Europe/Amsterdam',
  notify_match boolean not null default true,
  notify_reminder boolean not null default true,
  notify_feedback boolean not null default true,
  notify_product boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.languages is 'ISO 639-1 codes the person is happy to chat in.';

-- ── Workspaces ─────────────────────────────────────────────────────────
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  kind public.workspace_kind not null default 'work',
  logo_url text,
  allowed_domains text[] not null default '{}',
  group_size smallint not null default 2 check (group_size in (2, 3)),
  cadence public.cadence not null default 'monthly',
  -- monthly/bimonthly/quarterly: day of month 1–28; weekly/biweekly: ISO weekday 1–7
  anchor_day smallint not null default 1 check (anchor_day between 1 and 28),
  round_hour smallint not null default 9 check (round_hour between 0 and 23),
  timezone text not null default 'Europe/Amsterdam',
  next_round_at timestamptz not null,
  invite_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cadence in ('monthly', 'bimonthly', 'quarterly') or anchor_day between 1 and 7)
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  include_in_matching boolean not null default true,
  skip_next_round boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email extensions.citext not null,
  invited_by uuid references public.profiles (id) on delete set null,
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  accepted_at timestamptz,
  unique (workspace_id, email)
);

-- ── Rounds & matches ───────────────────────────────────────────────────
create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  scheduled_for timestamptz not null,
  status public.round_status not null default 'pending',
  ran_at timestamptz,
  participant_count integer not null default 0,
  unmatched_count integer not null default 0,
  unique (workspace_id, scheduled_for)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index matches_round_idx on public.matches (round_id);

create table public.match_members (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  feedback public.match_feedback,
  feedback_at timestamptz,
  primary key (match_id, user_id)
);

create index match_members_user_idx on public.match_members (user_id);

-- Outgoing transactional mail. Only the service role reads/writes it.
create table public.email_outbox (
  id bigint generated always as identity primary key,
  kind text not null,
  user_id uuid references public.profiles (id) on delete cascade,
  to_email extensions.citext not null,
  locale text not null default 'uk',
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts smallint not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  -- one mail of a kind per person per round/invite, so retries never double-send
  dedupe_key text unique
);

-- ── Helpers ────────────────────────────────────────────────────────────
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();

create function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.workspace_id = ws and m.user_id = auth.uid())
$$;

create function public.is_admin(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  )
$$;

create function public.shares_workspace(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on b.workspace_id = a.workspace_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

create function public.in_match(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.match_members mm where mm.match_id = m and mm.user_id = auth.uid())
$$;

-- New auth user → profile row (email + preferred locale from sign-up metadata).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, locale)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'uk')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Members may change their own matching switches; only admins change roles.
create function public.guard_membership_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role then
    if not public.is_admin(old.workspace_id) then
      raise exception 'only admins can change roles' using errcode = '42501';
    end if;
    if old.role = 'owner' and (select count(*) from public.memberships
        where workspace_id = old.workspace_id and role = 'owner') = 1 then
      raise exception 'a workspace needs at least one owner' using errcode = 'P0001';
    end if;
  end if;
  if (new.include_in_matching, new.skip_next_round) is distinct from (old.include_in_matching, old.skip_next_round)
     and old.user_id <> auth.uid() and auth.role() <> 'service_role' then
    raise exception 'only the member can change their matching settings' using errcode = '42501';
  end if;
  -- Pausing clears a pending skip: there is nothing to skip.
  if not new.include_in_matching then
    new.skip_next_round := false;
  end if;
  return new;
end $$;

create trigger memberships_guard before update on public.memberships
  for each row execute function public.guard_membership_update();

-- ── RPC: workspaces ────────────────────────────────────────────────────
create function public.slugify(value text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(trim(both '-' from left(regexp_replace(lower(extensions.unaccent(value)), '[^a-z0-9]+', '-', 'g'), 48)), ''), 'workspace')
$$;

create function public.create_workspace(
  p_name text,
  p_kind public.workspace_kind,
  p_group_size smallint,
  p_cadence public.cadence,
  p_anchor_day smallint,
  p_round_hour smallint,
  p_timezone text,
  p_allowed_domains text[],
  p_next_round_at timestamptz
) returns public.workspaces
language plpgsql security definer set search_path = '' as $$
declare
  base text := public.slugify(p_name);
  candidate text := base;
  ws public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_next_round_at <= now() then
    raise exception 'first round must be in the future' using errcode = '22023';
  end if;
  while exists (select 1 from public.workspaces w where w.slug = candidate) loop
    candidate := base || '-' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 4);
  end loop;

  insert into public.workspaces (name, slug, kind, group_size, cadence, anchor_day, round_hour, timezone,
                                 allowed_domains, next_round_at, created_by)
  values (btrim(p_name), candidate, p_kind, p_group_size, p_cadence, p_anchor_day, p_round_hour, p_timezone,
          (select coalesce(array_agg(distinct lower(btrim(d, ' @'))), '{}') from unnest(p_allowed_domains) d where btrim(d, ' @') <> ''),
          p_next_round_at, auth.uid())
  returning * into ws;

  insert into public.memberships (workspace_id, user_id, role) values (ws.id, auth.uid(), 'owner');
  return ws;
end $$;

-- Public preview for /join/:token — only what the join screen needs.
create function public.workspace_preview(p_token text)
returns table (id uuid, name text, slug text, kind public.workspace_kind, logo_url text,
               member_count bigint, allowed_domains text[], next_round_at timestamptz, invited_email text)
language sql stable security definer set search_path = '' as $$
  select w.id, w.name, w.slug, w.kind, w.logo_url,
         (select count(*) from public.memberships m where m.workspace_id = w.id),
         w.allowed_domains, w.next_round_at, i.email::text
  from public.workspaces w
  left join public.invites i on i.token = p_token and i.workspace_id = w.id and i.expires_at > now()
  where w.invite_token = p_token or i.id is not null
  limit 1
$$;

create function public.join_workspace(p_token text) returns public.workspaces
language plpgsql security definer set search_path = '' as $$
declare
  ws public.workspaces;
  inv public.invites;
  my_email text;
  domain text;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select email into my_email from auth.users where id = auth.uid();
  domain := lower(split_part(my_email, '@', 2));

  select * into inv from public.invites where token = p_token and expires_at > now();
  if found then
    select * into ws from public.workspaces where id = inv.workspace_id;
  else
    select * into ws from public.workspaces where invite_token = p_token;
  end if;
  if ws.id is null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  -- Personal invites skip the domain check; the link respects it.
  if inv.id is null and cardinality(ws.allowed_domains) > 0 and not (domain = any (ws.allowed_domains)) then
    raise exception 'email domain not allowed' using errcode = '42501', hint = array_to_string(ws.allowed_domains, ',');
  end if;

  insert into public.memberships (workspace_id, user_id) values (ws.id, auth.uid())
  on conflict do nothing;
  if inv.id is not null then
    update public.invites set accepted_at = coalesce(accepted_at, now()) where id = inv.id;
  end if;
  return ws;
end $$;

create function public.leave_workspace(p_workspace uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  my_role public.member_role;
begin
  select role into my_role from public.memberships where workspace_id = p_workspace and user_id = auth.uid();
  if my_role is null then
    raise exception 'not a member' using errcode = 'P0002';
  end if;
  if my_role = 'owner'
     and (select count(*) from public.memberships where workspace_id = p_workspace and role = 'owner') = 1
     and (select count(*) from public.memberships where workspace_id = p_workspace) > 1 then
    raise exception 'transfer ownership before leaving' using errcode = 'P0001';
  end if;
  delete from public.match_members mm using public.matches m
    where mm.match_id = m.id and m.workspace_id = p_workspace and mm.user_id = auth.uid();
  delete from public.memberships where workspace_id = p_workspace and user_id = auth.uid();
  -- The last person out turns off the lights.
  delete from public.workspaces w where w.id = p_workspace
    and not exists (select 1 from public.memberships m where m.workspace_id = p_workspace);
end $$;

create function public.regenerate_invite_token(p_workspace uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  token text;
begin
  if not public.is_admin(p_workspace) then
    raise exception 'admins only' using errcode = '42501';
  end if;
  update public.workspaces set invite_token = encode(extensions.gen_random_bytes(12), 'hex')
    where id = p_workspace returning invite_token into token;
  return token;
end $$;

-- ── RPC: matches ───────────────────────────────────────────────────────
create function public.set_match_feedback(p_match uuid, p_feedback public.match_feedback) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.match_members set feedback = p_feedback, feedback_at = now()
    where match_id = p_match and user_id = auth.uid();
  if not found then
    raise exception 'not your match' using errcode = 'P0002';
  end if;
end $$;

-- A person's matches with their partners, newest first (dashboard + history).
create function public.my_matches(p_limit integer default 50)
returns table (match_id uuid, workspace_id uuid, workspace_name text, round_at timestamptz,
               my_feedback public.match_feedback, partners jsonb)
language sql stable security definer set search_path = '' as $$
  select m.id, w.id, w.name, r.scheduled_for, me.feedback,
         (select jsonb_agg(jsonb_build_object(
                   'id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'email', p.email,
                   'job_title', p.job_title, 'department', p.department, 'city', p.city,
                   'meeting_format', p.meeting_format, 'languages', p.languages, 'interests', p.interests,
                   'ask_me_about', p.ask_me_about, 'avatar_url', p.avatar_url) order by p.first_name)
            from public.match_members o join public.profiles p on p.id = o.user_id
           where o.match_id = m.id and o.user_id <> auth.uid())
  from public.match_members me
  join public.matches m on m.id = me.match_id
  join public.rounds r on r.id = m.round_id
  join public.workspaces w on w.id = m.workspace_id
  where me.user_id = auth.uid()
  order by r.scheduled_for desc
  limit greatest(1, least(p_limit, 200))
$$;

-- ── RPC: admin stats ───────────────────────────────────────────────────
create function public.workspace_stats(p_workspace uuid)
returns table (members bigint, active bigint, paused bigint, skipping bigint, rounds jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin(p_workspace) then
    raise exception 'admins only' using errcode = '42501';
  end if;
  return query
  select
    count(*),
    count(*) filter (where m.include_in_matching and not m.skip_next_round),
    count(*) filter (where not m.include_in_matching),
    count(*) filter (where m.include_in_matching and m.skip_next_round),
    (select coalesce(jsonb_agg(x order by x.scheduled_for), '[]') from (
       select r.scheduled_for,
              r.participant_count,
              count(mm.*) filter (where mm.feedback is not null) as answered,
              count(mm.*) filter (where mm.feedback = 'met') as met
         from public.rounds r
         left join public.matches ma on ma.round_id = r.id
         left join public.match_members mm on mm.match_id = ma.id
        where r.workspace_id = p_workspace and r.status = 'done'
        group by r.id
        order by r.scheduled_for desc
        limit 6) x)
  from public.memberships m
  where m.workspace_id = p_workspace;
end $$;

-- ── RPC: account ───────────────────────────────────────────────────────
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  ws uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
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

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.rounds enable row level security;
alter table public.matches enable row level security;
alter table public.match_members enable row level security;
alter table public.email_outbox enable row level security;

create policy "read own and coworkers' profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_workspace(id));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members read their workspaces" on public.workspaces for select to authenticated
  using (public.is_member(id));
create policy "admins update workspaces" on public.workspaces for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));
create policy "owners delete workspaces" on public.workspaces for delete to authenticated
  using (exists (select 1 from public.memberships m where m.workspace_id = workspaces.id and m.user_id = auth.uid() and m.role = 'owner'));

create policy "members read memberships" on public.memberships for select to authenticated
  using (public.is_member(workspace_id));
create policy "members update own switches, admins update roles" on public.memberships for update to authenticated
  using (user_id = auth.uid() or public.is_admin(workspace_id));
create policy "admins remove members" on public.memberships for delete to authenticated
  using (public.is_admin(workspace_id) and user_id <> auth.uid());

create policy "admins manage invites" on public.invites for all to authenticated
  using (public.is_admin(workspace_id)) with check (public.is_admin(workspace_id) and invited_by = auth.uid());

create policy "members read rounds" on public.rounds for select to authenticated
  using (public.is_member(workspace_id));

create policy "participants read matches" on public.matches for select to authenticated
  using (public.in_match(id));
create policy "participants read match members" on public.match_members for select to authenticated
  using (public.in_match(match_id));

-- column-level safety: clients may only write these columns
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, job_title, department, city, meeting_format, languages, interests,
              ask_me_about, avatar_url, locale, timezone, notify_match, notify_reminder, notify_feedback,
              notify_product, onboarded_at) on public.profiles to authenticated;
revoke update on public.workspaces from authenticated;
grant update (name, kind, logo_url, allowed_domains, group_size, cadence, anchor_day, round_hour, timezone,
              next_round_at) on public.workspaces to authenticated;
revoke update on public.memberships from authenticated;
grant update (role, include_in_matching, skip_next_round) on public.memberships to authenticated;
revoke all on public.email_outbox from anon, authenticated;
revoke insert on public.workspaces, public.memberships, public.rounds, public.matches, public.match_members
  from authenticated;

grant execute on function public.workspace_preview(text) to anon, authenticated;
revoke execute on function public.delete_my_account() from anon;
revoke execute on function public.join_workspace(text) from anon;
revoke execute on function public.create_workspace(text, public.workspace_kind, smallint, public.cadence, smallint, smallint, text, text[], timestamptz) from anon;
