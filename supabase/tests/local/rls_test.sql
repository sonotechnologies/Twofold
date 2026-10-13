-- Phase 1 database tests: pairing rules, RLS isolation, answers reveal, scoring, breakup.
-- Run through run.sh. Any failed assertion stops the script with an error.

create schema test;
grant usage on schema test to anon, authenticated, service_role;

create function test.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
end $$;

-- Runs sql and asserts it raises (optionally with a given hint).
create function test.fails(sql text, msg text, want_hint text default null) returns void language plpgsql as $$
declare h text;
begin
  begin
    execute sql;
  exception when others then
    get stacked diagnostics h = pg_exception_hint;
    if want_hint is not null and h is distinct from want_hint then
      raise exception 'FAIL: % (wrong error: % / hint %)', msg, sqlerrm, h;
    end if;
    return;
  end;
  raise exception 'FAIL: % (no error raised)', msg;
end $$;
grant execute on all functions in schema test to anon, authenticated, service_role;

insert into auth.users (id, phone) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '2348000000001'), -- David
  ('bbbbbbbb-0000-0000-0000-000000000002', '2348000000002'), -- Bella
  ('eeeeeeee-0000-0000-0000-000000000003', '2348000000003'), -- Eve (outsider)
  ('cccccccc-0000-0000-0000-000000000004', '2348000000004'), -- Chidi (Eve's partner)
  ('11111111-0000-0000-0000-000000000005', '2348000000005'); -- under 18

-- ---------------------------------------------------------------- profiles & 18+
set role authenticated;
set request.jwt.claim.sub = '11111111-0000-0000-0000-000000000005';
select test.fails($$insert into public.profiles (id, name, birthdate) values (auth.uid(), 'Kid', current_date - interval '17 years')$$,
  'under-18 profile rejected', 'under_18');

set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.profiles (id, name, birthdate, avatar_config) values (auth.uid(), 'David', '1996-05-02', '{"hair":"fade"}');
select test.fails($$insert into public.profiles (id, name, birthdate) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Fake', '1990-01-01')$$,
  'cannot create a profile for someone else');
select test.fails($$select birthdate from public.profiles$$, 'birthdate is not readable');
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into public.profiles (id, name, birthdate) values (auth.uid(), 'Bella', '1997-08-19');
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
insert into public.profiles (id, name, birthdate) values (auth.uid(), 'Eve', '1995-01-01');
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000004';
insert into public.profiles (id, name, birthdate) values (auth.uid(), 'Chidi', '1994-03-03');

set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
select test.ok((select count(*) from public.profiles) = 1, 'unlinked user sees only own profile');

-- anon sees nothing and can call nothing
reset role; set role anon;
select test.fails($$select * from public.profiles$$, 'anon cannot read profiles');
select test.fails($$select public.create_invite()$$, 'anon cannot call RPCs');
reset role;

-- ---------------------------------------------------------------- pairing
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
create temp table t (k text primary key, v text);
grant all on t to authenticated;
insert into t select 'code', (public.create_invite()).code;
select test.ok((select v from t where k = 'code') ~ '^[A-HJ-NP-Z2-9]{6}$', 'invite code format');
select test.fails($$insert into public.invites (code, inviter_id) values ('ABCDEF', auth.uid())$$, 'no direct invite insert');
select test.fails($$select public.redeem_invite((select v from t where k = 'code'))$$, 'cannot redeem own code', 'own_code');

set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
select test.ok((select count(*) from public.invites) = 0, 'other users cannot list invites');
select test.ok((select count(*) from public.preview_invite('ZZZZZZ')) = 0, 'unknown code previews nothing');
select test.ok(public.redeem_invite('ZZZZZZ') is null, 'unknown code redeems nothing');

set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select test.ok((select inviter_name from public.preview_invite(lower((select v from t where k = 'code'))))= 'David',
  'preview shows inviter name (code is case-insensitive)');
insert into t select 'couple', (public.redeem_invite((select v from t where k = 'code'))).id;
select test.ok((select status from public.couples) = 'pending', 'redeem creates a pending couple');
select test.ok(public.couple_home() is null, 'pending couple has no home yet');
select test.fails($$insert into public.messages (couple_id, body) values ((select v::uuid from t where k = 'couple'), 'hi')$$,
  'cannot message while pending');

select test.ok((select count(*) from public.profiles) = 2, 'pending partners see each other (to confirm who it is)');

-- Eve tries the same (now used) code, and cannot see the couple
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
select test.ok(public.redeem_invite((select v from t where k = 'code')) is null, 'used code cannot be redeemed again');
select test.ok((select count(*) from public.couples) = 0, 'outsider cannot see the couple');

-- David confirms
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select test.ok((public.confirm_couple((select v::uuid from t where k = 'couple'))).status = 'active', 'both confirmed: active');
select test.ok((select count(*) from public.profiles) = 2, 'partners see each other');
select test.fails($$select public.create_invite()$$, 'linked user cannot create an invite', 'already_paired');
select test.fails($$update public.couples set status = 'ended'$$, 'no direct couple updates');

-- Eve links with Chidi; Eve cannot join David's couple and the two couples are isolated
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
insert into t select 'code2', (public.create_invite()).code;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000004';
insert into t select 'couple2', (public.redeem_invite((select v from t where k = 'code2'))).id;
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
select public.confirm_couple((select v::uuid from t where k = 'couple2'));

-- ---------------------------------------------------------------- messages & isolation
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into t select 'dc', (select id::text from public.couples where status = 'active');
insert into public.messages (couple_id, body, client_id)
values ((select v::uuid from t where k = 'dc'), 'Third Mainland is not moving at all', 'f0000000-0000-0000-0000-000000000001');
select test.fails($$insert into public.messages (couple_id, sender_id, body) values ((select v::uuid from t where k = 'dc'), 'bbbbbbbb-0000-0000-0000-000000000002', 'spoof')$$,
  'cannot send as partner');
select test.fails($$insert into public.messages (couple_id, body) values ((select v::uuid from t where k = 'couple2'), 'hello')$$,
  'cannot send into another couple');
select test.fails($$insert into public.messages (couple_id, type, media_url) values ((select v::uuid from t where k = 'dc'), 'image', (select v from t where k = 'couple2') || '/x.jpg')$$,
  'media path must be inside own couple folder');
select test.fails($$insert into public.messages (couple_id, type) values ((select v::uuid from t where k = 'dc'), 'gift')$$,
  'gifts are not enabled in Phase 1');
select test.fails($$insert into public.messages (couple_id, body, created_at) values ((select v::uuid from t where k = 'dc'), 'x', now() - interval '1 year')$$,
  'cannot backdate messages');

set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into public.messages (couple_id, body) values ((select v::uuid from t where k = 'dc'), 'I''ll have suya waiting');
select test.ok((select count(*) from public.messages) = 2, 'partner reads the chat');
select public.mark_read((select v::uuid from t where k = 'dc'));
select test.fails($$update public.messages set body = 'edited'$$, 'no direct message edits');

set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
select test.ok((select count(*) from public.messages) = 0, 'other couple cannot read messages');
select test.ok((select count(*) from public.profiles) = 2, 'other couple sees only themselves');
select test.ok((select count(*) from public.streaks) = 1 and (select count(*) from public.bond_score) = 1,
  'other couple sees only their own score rows');

-- ---------------------------------------------------------------- streak & points
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select test.ok((public.couple_home() -> 'streak' ->> 'current')::int = 1, 'both active today: streak 1');
select test.ok((public.couple_home() -> 'bond' ->> 'points')::int = 2, 'one point per message');
select test.ok((select read_at is not null from public.messages where body like 'Third%'), 'mark_read set read_at');

-- message points cap at 20 per person per day
do $$ begin
  for i in 1..30 loop
    insert into public.messages (couple_id, body) values ((select v::uuid from t where k = 'dc'), 'spam ' || i);
  end loop;
end $$;
select test.ok((public.couple_home() -> 'bond' ->> 'points')::int = 21, 'daily message points capped (20 David + 1 Bella)');

-- yesterday's streak continues; a gap resets it
reset role;
update public.streaks set current_days = 6, last_both_active_on = public.couple_today('Africa/Lagos') - 1
 where couple_id = (select v::uuid from t where k = 'dc');
delete from public.daily_activity where couple_id = (select v::uuid from t where k = 'dc');
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.messages (couple_id, body) values ((select v::uuid from t where k = 'dc'), 'morning');
select test.ok((public.couple_home() -> 'streak' ->> 'current')::int = 6, 'one partner alone does not extend');
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into public.messages (couple_id, body) values ((select v::uuid from t where k = 'dc'), 'morning love');
select test.ok((public.couple_home() -> 'streak' ->> 'current')::int = 7, 'both active: streak 7');
select test.ok((public.couple_home() -> 'bond' ->> 'points')::int = 22 + 50, '7-day milestone awards 50');

reset role;
update public.streaks set current_days = 9, last_both_active_on = public.couple_today('Africa/Lagos') - 3
 where couple_id = (select v::uuid from t where k = 'dc');
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select test.ok((public.couple_home() -> 'streak' ->> 'current')::int = 0, 'missed days show a broken flame');

-- ---------------------------------------------------------------- daily question
select test.ok((public.daily_question_state() ->> 'partner_answered')::boolean = false, 'no answers yet');
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select public.submit_answer('The way you sing every Burna song like you wrote it.');
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select test.ok((public.daily_question_state() ->> 'partner_answered')::boolean, 'I can see that she answered');
select test.ok(public.daily_question_state() ->> 'partner_answer' is null, 'but not what she answered');
select test.ok((select count(*) from public.answers) = 0, 'her answer row is hidden before I answer');
select test.ok((public.submit_answer('When you dance in the kitchen') ->> 'partner_answer') like 'The way you sing%',
  'revealed once I answer');
select test.ok((select count(*) from public.answers) = 2, 'both rows readable after answering');
select test.ok((public.couple_home() -> 'bond' ->> 'points')::int = 72 + 15, 'both answered: +15');
select public.submit_answer('trying to change it');
select test.ok((public.daily_question_state() ->> 'my_answer') = 'When you dance in the kitchen', 'answers are locked');
select test.ok((public.couple_home() -> 'bond' ->> 'points')::int = 87, 'question points awarded once');

-- ---------------------------------------------------------------- storage
insert into storage.objects (bucket_id, name) values ('couple-media', (select v from t where k = 'dc') || '/david.jpg');
select test.fails($$insert into storage.objects (bucket_id, name) values ('couple-media', (select v from t where k = 'couple2') || '/x.jpg')$$,
  'cannot upload into another couple folder');
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into storage.objects (bucket_id, name) values ('couple-media', (select v from t where k = 'dc') || '/bella.jpg');
select test.ok((select count(*) from storage.objects) = 2, 'partners read couple media');
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
select test.ok((select count(*) from storage.objects) = 0, 'outsiders read no media');

-- ---------------------------------------------------------------- realtime presence channel
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select set_config('realtime.topic', 'couple:' || (select v from t where k = 'dc'), false);
insert into realtime.messages (topic, extension) values (realtime.topic(), 'presence');
select test.ok((select count(*) from realtime.messages) = 1, 'partner can use own couple channel');
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
select test.ok((select count(*) from realtime.messages) = 0, 'outsider cannot read couple channel');
select test.fails($$insert into realtime.messages (topic, extension) values (realtime.topic(), 'presence')$$,
  'outsider cannot join couple channel');
select set_config('realtime.topic', '', false);

-- ---------------------------------------------------------------- breakup
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select public.end_couple();
select test.ok((select status from public.couples where id = (select v::uuid from t where k = 'dc')) = 'ended', 'either partner can end');
select test.fails($$insert into public.messages (couple_id, body) values ((select v::uuid from t where k = 'dc'), 'still there?')$$,
  'chat is read-only after ending');
select test.ok((select count(*) from public.messages) > 0, 'messages stay readable during the 30-day window');
select test.ok((select count(*) from storage.objects) = 1 and (select name from storage.objects) like '%/bella.jpg',
  'after ending, only own uploads are downloadable');
select test.ok(public.couple_home() is null, 'no home after ending');

set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select test.ok((select count(*) from public.messages) > 0, 'other partner also keeps read access');

reset role;
update public.couples set ended_at = now() - interval '31 days' where id = (select v::uuid from t where k = 'dc');
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select test.ok((select count(*) from public.messages) = 0, 'no access after 30 days');
select test.ok((select count(*) from public.profiles) = 1, 'ex profile hidden after 30 days');
-- free to pair again
select public.create_invite();

-- ---------------------------------------------------------------- account deletion
reset role;
delete from auth.users where id = 'cccccccc-0000-0000-0000-000000000004';
select test.ok((select status from public.couples where id = (select v::uuid from t where k = 'couple2')) = 'ended',
  'deleting an account ends its couple');

-- ---------------------------------------------------------------- WhatsApp verification
set role authenticated;
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000003';
select test.fails($$select * from public.wa_verifications$$, 'clients cannot read WhatsApp verifications');
select test.fails($$select public.wa_mark_verified('ABCDEF', '2348031234567')$$, 'clients cannot mark a token verified');
reset role;
set role service_role;
insert into public.wa_verifications (token, secret_hash) values ('ABCDEF', 'hash1');
select test.ok(public.wa_consume('ABCDEF', 'hash1') = '', 'unverified token reports waiting');
select test.ok(public.wa_consume('ABCDEF', 'wrong') is null, 'wrong secret is rejected');
select test.ok(public.wa_mark_verified('abcdef', '2348031234567'), 'webhook marks token verified (case-insensitive)');
select test.ok(not public.wa_mark_verified('ABCDEF', '2348000000000'), 'a verified token cannot be re-pointed');
select test.ok(public.wa_consume('ABCDEF', 'hash1') = '2348031234567', 'device with the secret gets the phone');
select test.ok(public.wa_consume('ABCDEF', 'hash1') is null, 'token is single-use');
insert into public.wa_verifications (token, secret_hash, expires_at) values ('XYZ234', 'h', now() - interval '1 minute');
select test.ok(not public.wa_mark_verified('XYZ234', '2348031234567'), 'expired token cannot be verified');
reset role;

\echo 'rls_test.sql: all assertions passed'
