begin;
select plan(7);

create function pg_temp.user_(email text, locale text) returns uuid
language sql as $$
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (gen_random_uuid(), email, 'authenticated', 'authenticated', jsonb_build_object('locale', locale))
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
insert into ids values ('olena', pg_temp.user_('olena@acme.io', 'nl'));
update profiles set first_name = 'Olena', last_name = 'Koval' where id = (select v from ids where k = 'olena');

-- invite email
select pg_temp.as_((select v from ids where k = 'olena'));
insert into ids select 'ws', (create_workspace('Acme', 'work', 2::smallint, 'monthly', 1::smallint, 9::smallint,
  'UTC', '{}', now() + interval '1 day')).id;
insert into invites (workspace_id, email, invited_by)
  values ((select v from ids where k = 'ws'), 'taras@acme.io', (select v from ids where k = 'olena'));
select pg_temp.as_postgres();

select is((select kind from email_outbox where to_email = 'taras@acme.io'), 'invite', 'a personal invite queues an invite email');
select is((select locale from email_outbox where to_email = 'taras@acme.io'), 'nl', 'the invite uses the inviter''s language');
select is((select payload ->> 'inviterName' from email_outbox where to_email = 'taras@acme.io'), 'Olena Koval', 'the invite names the inviter');
select is((select payload ->> 'token' from email_outbox where to_email = 'taras@acme.io'),
  (select token from invites where email = 'taras@acme.io'), 'the invite carries the personal token');

-- welcome email, once
update profiles set onboarded_at = now() where id = (select v from ids where k = 'olena');
update profiles set onboarded_at = now() where id = (select v from ids where k = 'olena');
select is((select count(*) from email_outbox where kind = 'welcome'), 1::bigint, 'finishing onboarding queues one welcome email');

-- goodbye email survives account deletion
select pg_temp.as_((select v from ids where k = 'olena'));
select delete_my_account();
select pg_temp.as_postgres();
select is((select to_email::text from email_outbox where kind = 'goodbye'), 'olena@acme.io', 'deleting an account queues a goodbye email');
select is((select count(*) from email_outbox where kind = 'welcome'), 0::bigint, 'personal rows are removed with the profile');

select * from finish();
rollback;
