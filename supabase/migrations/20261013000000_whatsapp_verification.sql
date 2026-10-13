-- Twofold · "Verify with WhatsApp" (reverse verification).
--
-- Instead of texting a code (paid), the app shows a short token and opens WhatsApp with a pre-filled
-- message to the Twofold business number. Meta delivers that inbound message to the wa-webhook edge
-- function, which records the sender's number against the token. The app then exchanges the token
-- (plus a secret only that device knows) for a session via wa-complete. No outbound message is sent.
--
-- Both tables are server-only: RLS on, no policies, no grants. Edge functions use the service role.

create table public.wa_verifications (
  token        text primary key check (token ~ '^[A-HJ-NP-Z2-9]{6}$'),
  secret_hash  text not null,                -- sha256 of the device secret, hex
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '10 minutes',
  phone        text,                         -- E.164 without "+", from the WhatsApp sender
  verified_at  timestamptz,
  consumed_at  timestamptz
);
create index wa_verifications_expires_idx on public.wa_verifications (expires_at);

-- One account per WhatsApp number.
create table public.wa_identities (
  phone      text primary key check (phone ~ '^[0-9]{7,15}$'),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.wa_verifications enable row level security;
alter table public.wa_identities enable row level security;
revoke all on public.wa_verifications, public.wa_identities from anon, authenticated;

-- Called by wa-webhook: attach the sender's number to a pending token. Returns true if it matched.
create function public.wa_mark_verified(p_token text, p_phone text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  updated int;
begin
  update public.wa_verifications
     set phone = p_phone, verified_at = now()
   where token = upper(p_token) and verified_at is null and expires_at > now();
  get diagnostics updated = row_count;
  return updated = 1;
end
$$;

-- Called by wa-complete: if verified and the secret matches, consume the token and return the phone.
create function public.wa_consume(p_token text, p_secret_hash text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v public.wa_verifications;
begin
  select * into v from public.wa_verifications where token = upper(p_token) for update;
  if not found or v.secret_hash <> p_secret_hash or v.consumed_at is not null or v.expires_at < now() then
    return null;
  end if;
  if v.verified_at is null then
    return '';  -- still waiting for the WhatsApp message
  end if;
  update public.wa_verifications set consumed_at = now() where token = v.token;
  return v.phone;
end
$$;

revoke execute on function public.wa_mark_verified(text, text), public.wa_consume(text, text) from public, anon, authenticated;
grant execute on function public.wa_mark_verified(text, text), public.wa_consume(text, text) to service_role;
