-- Twofold · Phase 1 core schema
--
-- Tables: profiles, couples, invites, messages, streaks, bond_score, bond_events,
--         daily_activity, daily_questions, answers.
--
-- Security model
--   * RLS is on for every table. A user only sees rows for a couple they belong to.
--   * Clients write directly only to: their own profile, and messages (while the couple is active).
--     Everything else (pairing, answers, streaks, points) goes through SECURITY DEFINER functions,
--     so the rules live in one place and cannot be bypassed from the app.
--   * After a couple ends, messages stay readable (read-only) for 30 days, then the shared space is
--     purged (Phase 2 job). Writes stop instantly.
--   * Birthdates are write-only for clients (never readable through the API).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.couple_status as enum ('pending', 'active', 'ended');
create type public.message_type as enum ('text', 'image', 'voice', 'sticker', 'gift');
create type public.couple_rank as enum ('new_flame', 'sweethearts', 'ride_or_die', 'power_couple', 'soulmates');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 40),
  birthdate       date not null,
  avatar_config   jsonb not null default '{}'::jsonb,
  mood            text check (char_length(mood) <= 24),
  mood_updated_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.couples (
  id             uuid primary key default gen_random_uuid(),
  partner_a      uuid references public.profiles (id) on delete set null, -- inviter
  partner_b      uuid references public.profiles (id) on delete set null, -- joined with the code
  status         public.couple_status not null default 'pending',
  a_confirmed_at timestamptz,
  b_confirmed_at timestamptz,
  started_on     date,                                   -- their anniversary; defaults to the link date
  timezone       text not null default 'Africa/Lagos',   -- streak day boundary
  created_at     timestamptz not null default now(),
  linked_at      timestamptz,
  ended_at       timestamptz,
  ended_by       uuid references public.profiles (id) on delete set null,
  constraint couples_distinct_partners check (partner_a <> partner_b),
  constraint couples_partners_present check (status = 'ended' or (partner_a is not null and partner_b is not null)),
  constraint couples_active_shape check (status <> 'active' or (linked_at is not null and started_on is not null)),
  constraint couples_ended_shape check ((status = 'ended') = (ended_at is not null))
);
create index couples_partner_a_idx on public.couples (partner_a);
create index couples_partner_b_idx on public.couples (partner_b);

create table public.invites (
  code        text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  inviter_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '24 hours',
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles (id) on delete set null,
  revoked_at  timestamptz
);
create unique index invites_one_open_per_user on public.invites (inviter_id)
  where redeemed_at is null and revoked_at is null;

-- Failed or successful code lookups, used to rate-limit guessing.
create table public.invite_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index invite_attempts_user_time_idx on public.invite_attempts (user_id, attempted_at desc);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  sender_id  uuid default auth.uid() references public.profiles (id) on delete set null,
  type       public.message_type not null default 'text',
  body       text check (char_length(body) <= 4000),
  media_url  text,  -- object path inside the private "couple-media" bucket: "<couple_id>/<file>"
  media_meta jsonb, -- { width, height } for images, { duration_ms, waveform } for voice
  client_id  uuid,  -- generated on device so offline retries are idempotent
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  constraint messages_shape check (
    (type = 'text'  and body is not null and char_length(btrim(body)) > 0 and media_url is null) or
    (type in ('image', 'voice') and media_url is not null) or
    (type in ('sticker', 'gift'))
  ),
  constraint messages_media_in_couple_folder check (
    media_url is null or split_part(media_url, '/', 1) = couple_id::text
  )
);
create index messages_couple_created_idx on public.messages (couple_id, created_at desc, id desc);
create unique index messages_client_id_idx on public.messages (sender_id, client_id) where client_id is not null;

create table public.streaks (
  couple_id           uuid primary key references public.couples (id) on delete cascade,
  current_days        int not null default 0 check (current_days >= 0),
  longest_days        int not null default 0 check (longest_days >= 0),
  last_both_active_on date,
  freezes_left        int not null default 0 check (freezes_left >= 0), -- Premium, Phase 3
  updated_at          timestamptz not null default now()
);

create table public.bond_score (
  couple_id  uuid primary key references public.couples (id) on delete cascade,
  points     int not null default 0 check (points >= 0),
  rank       public.couple_rank not null default 'new_flame',
  updated_at timestamptz not null default now()
);

-- Ledger of every point award. Makes daily caps and "award once" rules enforceable and auditable.
create table public.bond_events (
  id         bigint generated always as identity primary key,
  couple_id  uuid not null references public.couples (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  kind       text not null, -- message | question | streak_milestone | (Phase 2+) pet_fed | memory ...
  points     int not null,
  day        date not null,
  ref        text,          -- de-duplication key, e.g. "q:<question_id>" or "streak:30"
  created_at timestamptz not null default now()
);
create index bond_events_cap_idx on public.bond_events (couple_id, user_id, kind, day);
create unique index bond_events_once_idx on public.bond_events (couple_id, kind, ref) where ref is not null;

-- One row per partner per couple-day on which they interacted (sent a message, answered, ...).
create table public.daily_activity (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  day       date not null,
  primary key (couple_id, day, user_id)
);

create table public.daily_questions (
  id       int generated always as identity primary key,
  seq      int not null unique, -- rotation order
  text     text not null,
  category text not null
);

create table public.answers (
  question_id int not null references public.daily_questions (id),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  day         date not null,
  answer      text not null check (char_length(btrim(answer)) between 1 and 200),
  created_at  timestamptz not null default now(),
  primary key (couple_id, question_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Rank thresholds from the product brief. Tune after testing.
create function public.rank_for_points(p int) returns public.couple_rank
language sql immutable set search_path = '' as $$
  select case
    when p >= 15000 then 'soulmates'::public.couple_rank
    when p >= 5000  then 'power_couple'::public.couple_rank
    when p >= 2000  then 'ride_or_die'::public.couple_rank
    when p >= 500   then 'sweethearts'::public.couple_rank
    else 'new_flame'::public.couple_rank
  end
$$;

create function public.rank_threshold(r public.couple_rank) returns int
language sql immutable set search_path = '' as $$
  select case r
    when 'new_flame'    then 0
    when 'sweethearts'  then 500
    when 'ride_or_die'  then 2000
    when 'power_couple' then 5000
    when 'soulmates'    then 15000
  end
$$;

create function public.next_rank(r public.couple_rank) returns public.couple_rank
language sql immutable set search_path = '' as $$
  select case r
    when 'new_flame'    then 'sweethearts'::public.couple_rank
    when 'sweethearts'  then 'ride_or_die'::public.couple_rank
    when 'ride_or_die'  then 'power_couple'::public.couple_rank
    when 'power_couple' then 'soulmates'::public.couple_rank
    else null
  end
$$;

create function public.couple_today(tz text) returns date
language sql stable set search_path = '' as $$
  select (now() at time zone coalesce(tz, 'Africa/Lagos'))::date
$$;

-- Is the current user a partner in this couple, and is it active? Used by write policies.
create function public.is_active_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.couples c
    where c.id = cid and c.status = 'active'
      and (select auth.uid()) in (c.partner_a, c.partner_b)
  )
$$;

-- Can the current user read this couple's shared content? Active, or ended less than 30 days ago.
create function public.can_read_couple(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.couples c
    where c.id = cid
      and (select auth.uid()) in (c.partner_a, c.partner_b)
      and (c.status = 'active' or (c.status = 'ended' and c.linked_at is not null and c.ended_at > now() - interval '30 days'))
  )
$$;

-- The current user's open (pending or active) couple, if any.
create function public.my_open_couple() returns public.couples
language sql stable security definer set search_path = '' as $$
  select c.* from public.couples c
  where c.status in ('pending', 'active')
    and (select auth.uid()) in (c.partner_a, c.partner_b)
  limit 1
$$;

create function public.try_uuid(t text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return t::uuid;
exception when others then
  return null;
end
$$;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

create function public.tg_profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.birthdate is distinct from old.birthdate then
    if new.birthdate > (current_date - interval '18 years')::date then
      raise exception 'You must be 18 or older to use Twofold' using errcode = 'P0001', hint = 'under_18';
    end if;
  end if;
  if new.mood is distinct from (case when tg_op = 'UPDATE' then old.mood end) then
    new.mood_updated_at := now();
  end if;
  new.updated_at := now();
  return new;
end
$$;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.tg_profiles_guard();

-- A user can be in only one pending-or-active couple at a time.
create function public.tg_couples_single_open() returns trigger
language plpgsql set search_path = '' as $$
declare
  lo uuid := least(new.partner_a, new.partner_b);
  hi uuid := greatest(new.partner_a, new.partner_b);
begin
  if new.status in ('pending', 'active') then
    -- Serialise concurrent pairing attempts for the same people (ordered to avoid deadlocks).
    perform pg_advisory_xact_lock(hashtextextended(lo::text, 0));
    perform pg_advisory_xact_lock(hashtextextended(hi::text, 0));
    if exists (
      select 1 from public.couples c
      where c.id <> new.id and c.status in ('pending', 'active')
        and (c.partner_a in (new.partner_a, new.partner_b) or c.partner_b in (new.partner_a, new.partner_b))
    ) then
      raise exception 'Already linked or pairing with someone' using errcode = 'P0001', hint = 'already_paired';
    end if;
  end if;
  return new;
end
$$;
create trigger couples_single_open before insert or update of status, partner_a, partner_b on public.couples
  for each row execute function public.tg_couples_single_open();

-- Deleting an account ends its couple first, so the partner keeps a read-only space.
create function public.tg_profiles_end_couples() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.couples
     set status = 'ended', ended_at = now()
   where status in ('pending', 'active') and old.id in (partner_a, partner_b);
  update public.invites set revoked_at = now()
   where inviter_id = old.id and redeemed_at is null and revoked_at is null;
  return old;
end
$$;
create trigger profiles_end_couples before delete on public.profiles
  for each row execute function public.tg_profiles_end_couples();

-- ---------------------------------------------------------------------------
-- Scoring internals (not callable by clients)
-- ---------------------------------------------------------------------------

-- Award points once per ref, or up to daily_cap points per user per kind per day.
create function public.award_points(
  cid uuid, uid uuid, p_kind text, pts int, p_ref text default null, p_daily_cap int default null
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  tz text;
  today date;
  used int;
  granted int := pts;
  inserted int;
begin
  select c.timezone into tz from public.couples c where c.id = cid and c.status = 'active';
  if not found then return 0; end if;
  today := public.couple_today(tz);

  if p_daily_cap is not null then
    select coalesce(sum(e.points), 0) into used from public.bond_events e
     where e.couple_id = cid and e.user_id is not distinct from uid and e.kind = p_kind and e.day = today;
    granted := least(pts, p_daily_cap - used);
    if granted <= 0 then return 0; end if;
  end if;

  insert into public.bond_events (couple_id, user_id, kind, points, day, ref)
  values (cid, uid, p_kind, granted, today, p_ref)
  on conflict (couple_id, kind, ref) where ref is not null do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 0; end if;

  update public.bond_score b
     set points = b.points + granted,
         rank = public.rank_for_points(b.points + granted),
         updated_at = now()
   where b.couple_id = cid;
  return granted;
end
$$;

-- Record that a partner interacted today; grow the streak when both have.
create function public.record_activity(cid uuid, uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  tz text;
  today date;
  both_today boolean;
  s public.streaks;
  milestone int;
begin
  select c.timezone into tz from public.couples c where c.id = cid and c.status = 'active';
  if not found then return; end if;
  today := public.couple_today(tz);

  insert into public.daily_activity (couple_id, user_id, day) values (cid, uid, today)
  on conflict do nothing;

  select count(*) = 2 into both_today from public.daily_activity a where a.couple_id = cid and a.day = today;
  if not both_today then return; end if;

  select * into s from public.streaks where couple_id = cid for update;
  if s.last_both_active_on is not distinct from today then return; end if;

  if s.last_both_active_on = today - 1 then
    s.current_days := s.current_days + 1;
  else
    s.current_days := 1;
  end if;
  update public.streaks
     set current_days = s.current_days,
         longest_days = greatest(longest_days, s.current_days),
         last_both_active_on = today,
         updated_at = now()
   where couple_id = cid;

  -- Streak milestones. ref includes the streak start so a new run can earn them again.
  foreach milestone in array array[7, 30, 100, 365] loop
    if s.current_days = milestone then
      perform public.award_points(
        cid, null, 'streak_milestone',
        case milestone when 7 then 50 when 30 then 150 when 100 then 500 else 1500 end,
        'streak:' || milestone || ':' || (today - milestone + 1)
      );
    end if;
  end loop;
end
$$;

create function public.tg_messages_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.sender_id is not null then
    perform public.record_activity(new.couple_id, new.sender_id);
    perform public.award_points(new.couple_id, new.sender_id, 'message', 1, null, 20);
  end if;
  return null;
end
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.tg_messages_after_insert();

-- ---------------------------------------------------------------------------
-- Client API (RPC)
-- ---------------------------------------------------------------------------

-- Create (or replace) my invite code. Expires in 24 hours.
create function public.create_invite() returns public.invites
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  new_code text;
  bytes bytea;
  inv public.invites;
  i int;
begin
  if me is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles p where p.id = me) then
    raise exception 'Finish your profile first' using errcode = 'P0001', hint = 'no_profile';
  end if;
  if (public.my_open_couple()).id is not null then
    raise exception 'Already linked or pairing with someone' using errcode = 'P0001', hint = 'already_paired';
  end if;

  update public.invites set revoked_at = now()
   where inviter_id = me and redeemed_at is null and revoked_at is null;

  loop
    bytes := extensions.gen_random_bytes(6);
    new_code := '';
    for i in 0..5 loop
      new_code := new_code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    begin
      insert into public.invites (code, inviter_id) values (new_code, me) returning * into inv;
      return inv;
    exception when unique_violation then
      -- code collision: try again
    end;
  end loop;
end
$$;

create function public.revoke_invite() returns void
language sql security definer set search_path = '' as $$
  update public.invites set revoked_at = now()
   where inviter_id = auth.uid() and redeemed_at is null and revoked_at is null
$$;

-- Internal: validate a code for the current user, with guess rate-limiting.
-- Returns null for an unknown or expired code instead of raising, so the attempt is still recorded.
create function public.lookup_invite(p_code text) returns public.invites
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  inv public.invites;
  recent int;
begin
  if me is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles p where p.id = me) then
    raise exception 'Finish your profile first' using errcode = 'P0001', hint = 'no_profile';
  end if;

  select count(*) into recent from public.invite_attempts
   where user_id = me and attempted_at > now() - interval '1 hour';
  if recent >= 15 then
    raise exception 'Too many tries. Wait a little and try again.' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.invite_attempts (user_id) values (me);

  select * into inv from public.invites i
   where i.code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found or inv.redeemed_at is not null or inv.revoked_at is not null or inv.expires_at < now() then
    return null;
  end if;
  if inv.inviter_id = me then
    raise exception 'That is your own code' using errcode = 'P0001', hint = 'own_code';
  end if;
  return inv;
end
$$;

-- Show who a code belongs to before linking. Name and avatar only. No rows = invalid or expired code.
create function public.preview_invite(p_code text)
returns table (inviter_name text, inviter_avatar jsonb, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invites;
begin
  inv := public.lookup_invite(p_code);
  if inv is null then return; end if;
  return query select p.name, p.avatar_config, inv.expires_at from public.profiles p where p.id = inv.inviter_id;
end
$$;

-- Enter a code: creates a pending couple, confirmed by me. The inviter then confirms.
-- Returns null for an invalid or expired code.
create function public.redeem_invite(p_code text) returns public.couples
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  inv public.invites;
  c public.couples;
begin
  inv := public.lookup_invite(p_code);
  if inv is null then return null; end if;
  if (public.my_open_couple()).id is not null then
    raise exception 'Already linked or pairing with someone' using errcode = 'P0001', hint = 'already_paired';
  end if;

  update public.invites set redeemed_at = now(), redeemed_by = me where code = inv.code;
  insert into public.couples (partner_a, partner_b, status, b_confirmed_at)
  values (inv.inviter_id, me, 'pending', now())
  returning * into c;
  return c;
end
$$;

-- Confirm a pending couple. When both have confirmed it becomes active.
create function public.confirm_couple(p_couple uuid) returns public.couples
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.couples;
begin
  select * into c from public.couples where id = p_couple for update;
  if not found or me not in (c.partner_a, c.partner_b) then
    raise exception 'Couple not found' using errcode = 'P0001', hint = 'not_found';
  end if;
  if c.status <> 'pending' then return c; end if;

  if me = c.partner_a then c.a_confirmed_at := coalesce(c.a_confirmed_at, now()); end if;
  if me = c.partner_b then c.b_confirmed_at := coalesce(c.b_confirmed_at, now()); end if;

  if c.a_confirmed_at is not null and c.b_confirmed_at is not null then
    c.status := 'active';
    c.linked_at := now();
    c.started_on := coalesce(c.started_on, public.couple_today(c.timezone));
    insert into public.streaks (couple_id) values (c.id) on conflict do nothing;
    insert into public.bond_score (couple_id) values (c.id) on conflict do nothing;
  end if;

  update public.couples
     set a_confirmed_at = c.a_confirmed_at, b_confirmed_at = c.b_confirmed_at,
         status = c.status, linked_at = c.linked_at, started_on = c.started_on
   where id = c.id
  returning * into c;
  return c;
end
$$;

-- Decline or cancel a pending link. Either side can do this.
create function public.decline_couple(p_couple uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.couples set status = 'ended', ended_at = now(), ended_by = auth.uid()
   where id = p_couple and status = 'pending' and auth.uid() in (partner_a, partner_b);
end
$$;

-- End the relationship. Either partner, no approval needed. (UI ships in Phase 2.)
create function public.end_couple() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  update public.couples set status = 'ended', ended_at = now(), ended_by = me
   where status in ('pending', 'active') and me in (partner_a, partner_b);
end
$$;

-- Set the anniversary ("together since"). Cannot be in the future.
create function public.set_started_on(p_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.couples := public.my_open_couple();
begin
  if c is null or c.status <> 'active' then
    raise exception 'No active couple' using errcode = 'P0001', hint = 'no_couple';
  end if;
  if p_date > public.couple_today(c.timezone) or p_date < date '1950-01-01' then
    raise exception 'Pick a date in the past' using errcode = 'P0001', hint = 'bad_date';
  end if;
  update public.couples set started_on = p_date where id = c.id;
end
$$;

-- Mark the partner's messages as read up to now.
create function public.mark_read(p_couple uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_member(p_couple) then return; end if;
  update public.messages set read_at = now()
   where couple_id = p_couple and read_at is null and sender_id is distinct from auth.uid();
end
$$;

-- Today's question for a couple: rotates through daily_questions by seq.
create function public.question_for_day(d date) returns public.daily_questions
language sql stable security definer set search_path = '' as $$
  select q.* from public.daily_questions q
  order by q.seq
  offset ((d - date '2026-01-01') % greatest((select count(*) from public.daily_questions), 1))
  limit 1
$$;

-- Today's question plus answer state. The partner's answer is only included once I have answered.
create function public.daily_question_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.couples := public.my_open_couple();
  today date;
  q public.daily_questions;
  mine public.answers;
  theirs public.answers;
  partner uuid;
begin
  if c is null or c.status <> 'active' then return null; end if;
  today := public.couple_today(c.timezone);
  q := public.question_for_day(today);
  if q is null then return null; end if;
  partner := case when c.partner_a = me then c.partner_b else c.partner_a end;

  select * into mine from public.answers a where a.couple_id = c.id and a.question_id = q.id and a.user_id = me;
  select * into theirs from public.answers a where a.couple_id = c.id and a.question_id = q.id and a.user_id = partner;

  return jsonb_build_object(
    'question_id', q.id,
    'text', q.text,
    'category', q.category,
    'day', today,
    'day_number', today - c.started_on + 1,
    'my_answer', mine.answer,
    'partner_answered', theirs.user_id is not null,
    'partner_answer', case when mine.user_id is not null then theirs.answer end,
    'both_answered', mine.user_id is not null and theirs.user_id is not null,
    'next_at', ((today + 1)::timestamp at time zone c.timezone)
  );
end
$$;

-- Lock in my answer for today's question. Answers cannot be edited afterwards.
create function public.submit_answer(p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.couples := public.my_open_couple();
  today date;
  q public.daily_questions;
  answered int;
begin
  if c is null or c.status <> 'active' then
    raise exception 'No active couple' using errcode = 'P0001', hint = 'no_couple';
  end if;
  today := public.couple_today(c.timezone);
  q := public.question_for_day(today);

  insert into public.answers (question_id, couple_id, user_id, day, answer)
  values (q.id, c.id, me, today, btrim(p_answer))
  on conflict do nothing;

  perform public.record_activity(c.id, me);

  select count(*) into answered from public.answers a where a.couple_id = c.id and a.question_id = q.id;
  if answered = 2 then
    perform public.award_points(c.id, null, 'question', 15, 'q:' || q.id || ':' || today);
  end if;

  return public.daily_question_state();
end
$$;

-- Everything the Home screen needs in one round trip (helps on slow networks).
create function public.couple_home() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.couples := public.my_open_couple();
  today date;
  s public.streaks;
  b public.bond_score;
  partner uuid;
  streak_now int;
  nr public.couple_rank;
begin
  if c is null or c.status <> 'active' then return null; end if;
  today := public.couple_today(c.timezone);
  partner := case when c.partner_a = me then c.partner_b else c.partner_a end;
  select * into s from public.streaks where couple_id = c.id;
  select * into b from public.bond_score where couple_id = c.id;
  -- A streak survives until the end of the day after the last day both were active.
  streak_now := case when s.last_both_active_on >= today - 1 then s.current_days else 0 end;
  nr := public.next_rank(b.rank);

  return jsonb_build_object(
    'couple_id', c.id,
    'started_on', c.started_on,
    'linked_at', c.linked_at,
    'days_together', today - c.started_on + 1,
    'me', (select jsonb_build_object('id', p.id, 'name', p.name, 'avatar', p.avatar_config, 'mood', p.mood)
             from public.profiles p where p.id = me),
    'partner', (select jsonb_build_object('id', p.id, 'name', p.name, 'avatar', p.avatar_config, 'mood', p.mood)
                  from public.profiles p where p.id = partner),
    'streak', jsonb_build_object(
      'current', streak_now,
      'longest', s.longest_days,
      'done_today', s.last_both_active_on = today,
      'me_active_today', exists (select 1 from public.daily_activity a where a.couple_id = c.id and a.day = today and a.user_id = me),
      'partner_active_today', exists (select 1 from public.daily_activity a where a.couple_id = c.id and a.day = today and a.user_id = partner)
    ),
    'bond', jsonb_build_object(
      'points', b.points,
      'rank', b.rank,
      'rank_floor', public.rank_threshold(b.rank),
      'next_rank', nr,
      'next_threshold', case when nr is not null then public.rank_threshold(nr) end
    ),
    'question', public.daily_question_state()
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.couples         enable row level security;
alter table public.invites         enable row level security;
alter table public.invite_attempts enable row level security;
alter table public.messages        enable row level security;
alter table public.streaks         enable row level security;
alter table public.bond_score      enable row level security;
alter table public.bond_events     enable row level security;
alter table public.daily_activity  enable row level security;
alter table public.daily_questions enable row level security;
alter table public.answers         enable row level security;

-- Start from nothing, then grant exactly what the app needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- profiles: I manage my own; I can see my partner's while pairing (so the inviter can see who entered
-- their code), while active, and for 30 days after ending. Birthdate is write-only.
grant select (id, name, avatar_config, mood, mood_updated_at, created_at, updated_at) on public.profiles to authenticated;
grant insert (id, name, birthdate, avatar_config, mood) on public.profiles to authenticated;
grant update (name, avatar_config, mood) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.couples c
      where (select auth.uid()) in (c.partner_a, c.partner_b)
        and profiles.id in (c.partner_a, c.partner_b)
        and (c.status = 'pending' or public.can_read_couple(c.id))
    )
  );
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- couples: members can see their couple rows (including pending and ended). Changes only via RPC.
grant select on public.couples to authenticated;
create policy couples_select on public.couples for select to authenticated
  using ((select auth.uid()) in (partner_a, partner_b));

-- invites: I can see my own codes. Created/redeemed only via RPC.
grant select on public.invites to authenticated;
create policy invites_select on public.invites for select to authenticated
  using (inviter_id = (select auth.uid()));

-- messages: read while active (and read-only for 30 days after ending); send only while active.
grant select on public.messages to authenticated;
grant insert (couple_id, sender_id, type, body, media_url, media_meta, client_id) on public.messages to authenticated;
create policy messages_select on public.messages for select to authenticated
  using (public.can_read_couple(couple_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and type in ('text', 'image', 'voice') -- stickers and gifts arrive in later phases
    and public.is_active_member(couple_id)
  );

-- streaks, bond score: readable by members. Written only by scoring functions.
grant select on public.streaks, public.bond_score to authenticated;
create policy streaks_select on public.streaks for select to authenticated
  using (public.can_read_couple(couple_id));
create policy bond_score_select on public.bond_score for select to authenticated
  using (public.can_read_couple(couple_id));

-- answers: my own always; my partner's only after I have answered the same question.
grant select on public.answers to authenticated;
create function public.has_answered(qid int, cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.answers a where a.question_id = qid and a.couple_id = cid and a.user_id = (select auth.uid()))
$$;
create policy answers_select on public.answers for select to authenticated
  using (
    public.can_read_couple(couple_id)
    and (user_id = (select auth.uid()) or public.has_answered(question_id, couple_id))
  );

-- invite_attempts, bond_events, daily_activity, daily_questions: no client access (RLS on, no policies).

-- ---------------------------------------------------------------------------
-- Function privileges: nothing is callable unless granted here.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_active_member(uuid),
  public.can_read_couple(uuid),
  public.has_answered(int, uuid),
  public.my_open_couple(),
  public.try_uuid(text),
  public.rank_for_points(int),
  public.rank_threshold(public.couple_rank),
  public.next_rank(public.couple_rank),
  public.create_invite(),
  public.revoke_invite(),
  public.preview_invite(text),
  public.redeem_invite(text),
  public.confirm_couple(uuid),
  public.decline_couple(uuid),
  public.end_couple(),
  public.set_started_on(date),
  public.mark_read(uuid),
  public.daily_question_state(),
  public.submit_answer(text),
  public.couple_home()
to authenticated;

-- Supabase grants table and function access to anon/authenticated by default. Stop that for objects
-- created by later migrations too: every new table or function must grant access explicitly.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: new messages and couple status changes (pairing confirmations, breakups).
-- Realtime applies the same RLS select policies.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages, public.couples;
