-- Minimal stand-in for the parts of Supabase the migrations depend on, so they can be tested
-- against plain Postgres (no Docker). Mirrors Supabase's default grants, so the migrations'
-- revokes are exercised too.
set client_min_messages = error;
do $$ begin
  -- Roles are cluster-wide, so they may exist from an earlier run.
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key, phone text, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema extensions;
create extension pgcrypto schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
  name text not null, owner_id text default (auth.uid())::text, created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select, insert on storage.objects to authenticated;

create publication supabase_realtime;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Realtime authorization (private channels) checks policies on realtime.messages.
create schema realtime;
create table realtime.messages (id bigint generated always as identity primary key, topic text, extension text, payload jsonb);
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as
  $$ select nullif(current_setting('realtime.topic', true), '') $$;
grant usage on schema realtime to authenticated;
grant select, insert on realtime.messages to authenticated;
grant execute on function realtime.topic() to authenticated;
