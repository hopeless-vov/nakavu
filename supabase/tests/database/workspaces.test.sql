begin;
select plan(33);

-- ── helpers (live only inside this transaction) ────────────────────────
create function pg_temp.user_(email text, locale text default null) returns uuid
language sql as $$
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), email, 'authenticated', 'authenticated',
          case when locale is null then '{}'::jsonb else jsonb_build_object('locale', locale) end)
  returning id
$$;

create function pg_temp.as_(uid uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create function pg_temp.as_anon() returns void
language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  select set_config('role', 'anon', true);
$$;

create function pg_temp.as_postgres() returns void
language sql as $$
  select set_config('role', 'postgres', true);
  select set_config('request.jwt.claims', '', true);
$$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon;

insert into ids values
  ('priya', pg_temp.user_('priya@northwind.com', 'en')),
  ('tomas', pg_temp.user_('tomas@northwind.com')),
  ('outsider', pg_temp.user_('eve@gmail.com')),
  ('friend', pg_temp.user_('olena@gmail.com'));

-- ── profiles ───────────────────────────────────────────────────────────
select is((select locale from profiles where id = (select v from ids where k = 'priya')), 'en',
  'sign-up metadata sets the profile locale');
select is((select locale from profiles where id = (select v from ids where k = 'tomas')), 'uk',
  'locale defaults to uk');
select is((select email::text from profiles where id = (select v from ids where k = 'tomas')), 'tomas@northwind.com',
  'profile copies the auth email');

-- ── create_workspace ───────────────────────────────────────────────────
select pg_temp.as_((select v from ids where k = 'priya'));

insert into ids select 'nw', (create_workspace('Northwind Group', 'work', 2::smallint, 'monthly', 1::smallint, 9::smallint,
  'Europe/Amsterdam', array[' @Northwind.com', 'northwind.com', ''], now() + interval '2 days')).id;

select is((select slug from workspaces where id = (select v from ids where k = 'nw')), 'northwind-group', 'slug from name');
select is((select allowed_domains from workspaces where id = (select v from ids where k = 'nw')), array['northwind.com'],
  'domains are trimmed, lower-cased and de-duplicated');
select is((select role::text from memberships where workspace_id = (select v from ids where k = 'nw')), 'owner',
  'creator becomes owner');

select matches((create_workspace('Northwind Group', 'friends', 3::smallint, 'weekly', 5::smallint, 18::smallint,
  'Europe/Kyiv', '{}', now() + interval '1 day')).slug, '^northwind-group-[0-9a-f]{4}$', 'slug collisions get a suffix');

select throws_ok($$ select create_workspace('Past', 'work', 2::smallint, 'monthly', 1::smallint, 9::smallint,
  'UTC', '{}', now() - interval '1 minute') $$, '22023', 'first round must be in the future',
  'first round cannot be in the past');

select throws_ok($$ select create_workspace('Bad day', 'work', 2::smallint, 'weekly', 12::smallint, 9::smallint,
  'UTC', '{}', now() + interval '1 day') $$, '23514', null, 'weekly schedules need an ISO weekday');

select throws_ok($$ insert into workspaces (name, slug, next_round_at) values ('x', 'xx', now()) $$, '42501', null,
  'clients cannot insert workspaces directly');

select pg_temp.as_anon();
select throws_ok($$ select create_workspace('Anon', 'work', 2::smallint, 'monthly', 1::smallint, 9::smallint,
  'UTC', '{}', now() + interval '1 day') $$, '42501', null, 'anon cannot create workspaces');

-- ── preview + join ─────────────────────────────────────────────────────
select is((select name from workspace_preview((select invite_token from workspaces where slug = 'northwind-group' limit 1)) ),
  null, 'anon cannot read the workspaces table');
select pg_temp.as_postgres();
create temp table tok as select invite_token as t from workspaces where slug = 'northwind-group';
grant select on tok to anon, authenticated;

select pg_temp.as_anon();
select is((select name from workspace_preview((select t from tok))), 'Northwind Group', 'anon can preview by token');
select is((select member_count from workspace_preview((select t from tok))), 1::bigint, 'preview shows member count');
select is((select count(*) from workspace_preview('nope')), 0::bigint, 'unknown token previews nothing');

select pg_temp.as_((select v from ids where k = 'outsider'));
select is((select count(*) from workspaces), 0::bigint, 'outsiders see no workspaces');
select throws_ok($$ select join_workspace((select t from tok)) $$, '42501', 'email domain not allowed',
  'link respects allowed domains');
select throws_ok($$ select join_workspace('nope') $$, 'P0002', 'invite not found', 'unknown token fails');

select pg_temp.as_((select v from ids where k = 'tomas'));
select is((join_workspace((select t from tok))).name, 'Northwind Group', 'allowed domain joins');
select lives_ok($$ select join_workspace((select t from tok)) $$, 'joining twice is harmless');

-- personal invite bypasses the domain rule
select pg_temp.as_((select v from ids where k = 'priya'));
insert into invites (workspace_id, email, invited_by)
  values ((select v from ids where k = 'nw'), 'eve@gmail.com', (select v from ids where k = 'priya'));
select pg_temp.as_postgres();
create temp table inv as select token as t from invites where email = 'eve@gmail.com';
grant select on inv to authenticated;
select pg_temp.as_((select v from ids where k = 'outsider'));
select is((join_workspace((select t from inv))).slug, 'northwind-group', 'personal invite ignores the domain list');
select pg_temp.as_postgres();
select isnt((select accepted_at from invites where email = 'eve@gmail.com'), null, 'invite is marked accepted');

-- ── visibility ─────────────────────────────────────────────────────────
select pg_temp.as_((select v from ids where k = 'tomas'));
select is((select count(*) from profiles where id in (select v from ids where k in ('priya', 'outsider'))), 2::bigint,
  'coworkers can read each other''s profiles');
select is((select count(*) from profiles where id = (select v from ids where k = 'friend')), 0::bigint,
  'strangers'' profiles are hidden');
select throws_ok($$ select count(*) from email_outbox $$, '42501', null, 'nobody can read the outbox');

-- ── membership switches ────────────────────────────────────────────────
update memberships set skip_next_round = true where user_id = auth.uid();
update memberships set include_in_matching = false where user_id = auth.uid();
select is((select skip_next_round from memberships where user_id = auth.uid()), false, 'pausing clears skip');

update memberships set include_in_matching = false where user_id = (select v from ids where k = 'priya');
select is((select include_in_matching from memberships where user_id = (select v from ids where k = 'priya')), true,
  'members cannot pause other people (RLS hides the row)');
select throws_ok($$ update memberships set role = 'admin' where user_id = auth.uid() $$, '42501',
  'only admins can change roles', 'members cannot promote themselves');

select pg_temp.as_((select v from ids where k = 'priya'));
update memberships set role = 'admin' where user_id = (select v from ids where k = 'tomas');
select is((select role::text from memberships where user_id = (select v from ids where k = 'tomas')), 'admin',
  'admins can promote');
select throws_ok($$ update memberships set role = 'member' where user_id = auth.uid()
  and workspace_id = (select v from ids where k = 'nw') $$, 'P0001', 'a workspace needs at least one owner',
  'the last owner cannot step down');

select throws_ok($$ select leave_workspace((select v from ids where k = 'nw')) $$, 'P0001',
  'transfer ownership before leaving', 'sole owner must hand over first');

select pg_temp.as_((select v from ids where k = 'tomas'));
select isnt(regenerate_invite_token((select v from ids where k = 'nw')), (select t from tok), 'admins can rotate the invite link');

select pg_temp.as_((select v from ids where k = 'outsider'));
select throws_ok($$ select regenerate_invite_token((select v from ids where k = 'nw')) $$, '42501', 'admins only', 'members cannot rotate the link');
select * from finish();
rollback;
