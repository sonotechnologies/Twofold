# Twofold · Supabase backend (Phase 1)

Postgres schema, Row Level Security, storage and realtime rules, plus one edge function.

## Schema

| Table | Purpose | Client access |
| --- | --- | --- |
| `profiles` | name, avatar (JSON), mood, birthdate (18+ enforced) | own row read/write; partner read. Birthdate is write-only |
| `couples` | partner_a (inviter), partner_b, status pending/active/ended, started_on (anniversary), timezone | members read; changes only via RPC |
| `invites` | 6-char code, expires in 24h | inviter reads own; create/redeem via RPC |
| `messages` | text / image / voice (sticker, gift reserved), media path, read_at | read while active (+30 days read-only after ending); insert while active |
| `streaks` | current, longest, last day both were active, freezes | members read |
| `bond_score` | points and rank | members read |
| `bond_events` | ledger of every point award (caps, de-duplication) | none |
| `daily_activity` | which partner interacted on which couple-day | none |
| `daily_questions` / `answers` | rotating question; answers hidden until both answered | via RPC |
| `invite_attempts` | rate-limits code guessing (15/hour) | none |

Rules enforced in the database (not the app):

- One pending-or-active couple per person (trigger with advisory locks).
- Pairing: inviter creates a code, partner enters it, **both confirm** (`redeem_invite` → `confirm_couple`).
- Either partner can end the couple (`end_couple`). Chat becomes read-only; each person can download only their own uploads for 30 days.
- Deleting an account ends its couple first, so the partner keeps the read-only window.
- Streak grows when both partners interact on the same day (Africa/Lagos midnight by default; per-couple `timezone` column ready).
- Points: +1 per message (max 20 per person per day), +15 when both answer the daily question, +50/+150/+500/+1,500 at 7/30/100/365-day flames. Ranks at 0 / 500 / 2,000 / 5,000 / 15,000.
- Storage bucket `couple-media` is private; objects live under `<couple_id>/` and are served with signed URLs.
- Presence uses a private realtime channel `couple:<id>` that only the two partners can join.
- Every function and table starts with no access; grants are explicit (default privileges are revoked too).

Client RPCs: `create_invite`, `revoke_invite`, `preview_invite`, `redeem_invite`, `confirm_couple`, `decline_couple`,
`end_couple`, `set_started_on`, `mark_read`, `daily_question_state`, `submit_answer`, `couple_home`.

## Setup

1. Create a Supabase project (free tier) and link it: `npx supabase link --project-ref <ref>`.
2. Apply migrations: `npx supabase db push`.
3. Deploy the account-deletion function: `npx supabase functions deploy delete-account`.
4. Auth → Providers:
   - **Phone**: needs an SMS provider (Twilio, Vonage, MessageBird or Textlocal). **These are paid**, so none is configured yet.
     Until you choose one, test numbers in `config.toml` (`2348000000001` etc., code `123456`) work locally, and you can add the same test numbers in the dashboard.
   - **Google**: create an OAuth client in Google Cloud (free) and set the client ID/secret.
   - Add `twofold://auth-callback` to the redirect URLs.

## Tests

`tests/local/run.sh` applies every migration to a throwaway database on any local Postgres (no Docker needed) and runs
`rls_test.sql`: pairing rules, 18+ check, isolation between couples, answer reveal, point caps, streaks, storage,
realtime channel access, breakup and account deletion.

```bash
supabase/tests/local/run.sh    # needs psql with a superuser connection (PG* env vars are respected)
```
