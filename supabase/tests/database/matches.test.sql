begin;
select plan(19);

create function pg_temp.user_(email text) returns uuid
language sql as $$
  insert into auth.users (id, email, aud, role) values (gen_random_uuid(), email, 'authenticated', 'authenticated')
  returning id
$$;
create function pg_temp.as_(uid uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.as_postgres() returns void
language sql as $$
  select set_config('role', 'postgres', true);
  select set_config('request.jwt.claims', '', true);
$$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
insert into ids values
  ('ana', pg_temp.user_('ana@acme.io')),
  ('ben', pg_temp.user_('ben@acme.io')),
  ('cat', pg_temp.user_('cat@acme.io')),
  ('dan', pg_temp.user_('dan@acme.io'));

update profiles set first_name = 'Ben', interests = '{Jazz}' where id = (select v from ids where k = 'ben');

-- workspace with ana as owner, everyone else a member (set up as postgres)
insert into workspaces (id, name, slug, next_round_at)
  values (gen_random_uuid(), 'Acme', 'acme', now() + interval '1 day')
  returning id as v \gset ws_
insert into ids values ('ws', :'ws_v');
insert into memberships (workspace_id, user_id, role) values
  (:'ws_v', (select v from ids where k = 'ana'), 'owner'),
  (:'ws_v', (select v from ids where k = 'ben'), 'member'),
  (:'ws_v', (select v from ids where k = 'cat'), 'member'),
  (:'ws_v', (select v from ids where k = 'dan'), 'member');
update memberships set include_in_matching = false where user_id = (select v from ids where k = 'dan');
update memberships set skip_next_round = true where user_id = (select v from ids where k = 'cat');
update memberships set joined_at = now() + interval '1 hour' where user_id = (select v from ids where k = 'dan');

-- one finished round: ana × ben
insert into rounds (id, workspace_id, scheduled_for, status, participant_count)
  values (gen_random_uuid(), :'ws_v', now() - interval '3 days', 'done', 2) returning id as v \gset round_
insert into matches (id, round_id, workspace_id) values (gen_random_uuid(), :'round_v', :'ws_v') returning id as v \gset match_
insert into ids values ('match', :'match_v');
insert into match_members (match_id, user_id) values
  (:'match_v', (select v from ids where k = 'ana')),
  (:'match_v', (select v from ids where k = 'ben'));

-- ── matches ────────────────────────────────────────────────────────────
select pg_temp.as_((select v from ids where k = 'ana'));
select is((select count(*) from my_matches()), 1::bigint, 'my_matches lists my match');
select is((select partners -> 0 ->> 'first_name' from my_matches()), 'Ben', 'partner details are included');
select is((select jsonb_array_length(partners) from my_matches()), 1, 'I am not listed as my own partner');
select is((select workspace_name from my_matches()), 'Acme', 'workspace name is included');

select lives_ok($$ select set_match_feedback((select v from ids where k = 'match'), 'met') $$, 'I can answer for my match');
select is((select my_feedback::text from my_matches()), 'met', 'feedback is stored');

select pg_temp.as_((select v from ids where k = 'cat'));
select is((select count(*) from matches), 0::bigint, 'others cannot see the match');
select is((select count(*) from match_members), 0::bigint, 'others cannot see match members');
select throws_ok($$ select set_match_feedback((select v from ids where k = 'match'), 'met') $$, 'P0002',
  'not your match', 'others cannot answer');
select throws_ok($$ select * from workspace_stats((select v from ids where k = 'ws')) $$, '42501', 'admins only',
  'members cannot read stats');

-- ── stats ──────────────────────────────────────────────────────────────
select pg_temp.as_((select v from ids where k = 'ana'));
select results_eq($$ select members, active, paused, skipping from workspace_stats((select v from ids where k = 'ws')) $$,
  $$ values (4::bigint, 2::bigint, 1::bigint, 1::bigint) $$, 'stats count active, paused and skipping members');
select is((select (rounds -> 0 ->> 'met')::int from workspace_stats((select v from ids where k = 'ws'))), 1,
  'stats count people who met');

select throws_ok($$ update memberships set include_in_matching = false where user_id = (select v from ids where k = 'ben') $$,
  '42501', 'only the member can change their matching settings', 'admins cannot pause other people');

-- ── leaving ────────────────────────────────────────────────────────────
select pg_temp.as_((select v from ids where k = 'ben'));
select lives_ok($$ select leave_workspace((select v from ids where k = 'ws')) $$, 'members can leave');
select pg_temp.as_postgres();
select is((select count(*) from match_members where user_id = (select v from ids where k = 'ben')), 0::bigint,
  'leaving removes my match history in that workspace');

-- ── deleting an account hands ownership over ───────────────────────────
select pg_temp.as_((select v from ids where k = 'ana'));
select lives_ok($$ select delete_my_account() $$, 'owner can delete their account');
select pg_temp.as_postgres();
select is((select count(*) from auth.users where email = 'ana@acme.io'), 0::bigint, 'auth user is gone');
select is((select p.email::text from memberships m join profiles p on p.id = m.user_id
           where m.workspace_id = (select v from ids where k = 'ws') and m.role = 'owner'), 'cat@acme.io',
  'the longest-standing remaining member becomes owner');

-- last person out deletes the workspace
delete from memberships where user_id = (select v from ids where k = 'dan');
select pg_temp.as_((select v from ids where k = 'cat'));
select leave_workspace((select v from ids where k = 'ws'));
select pg_temp.as_postgres();
select is((select count(*) from workspaces where slug = 'acme'), 0::bigint, 'the last person leaving deletes the workspace');

select * from finish();
rollback;
