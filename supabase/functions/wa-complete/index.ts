// Step 3: the app polls this with its token + secret. Once the WhatsApp message has arrived it returns
// a Supabase session for the account tied to that number (creating the account on first sign-in).
import { createClient } from 'npm:@supabase/supabase-js@2';

import { sha256Hex } from '../_shared/whatsapp.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Accounts made through WhatsApp get a placeholder email (".invalid" never receives mail). Supabase needs
// an email to issue a one-time sign-in link, which this function redeems immediately on the server.
const placeholderEmail = (phone: string) => `wa${phone}@whatsapp.twofold.invalid`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: { token?: unknown; secret?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (typeof body.token !== 'string' || typeof body.secret !== 'string') return json({ error: 'bad_request' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: phone, error } = await admin.rpc('wa_consume', { p_token: body.token, p_secret_hash: await sha256Hex(body.secret) });
  if (error) {
    console.error('wa_consume failed', error.message);
    return json({ error: 'server_error' }, 500);
  }
  if (phone === null) return json({ status: 'expired' });
  if (phone === '') return json({ status: 'pending' });

  // Find or create the account for this number.
  let email: string;
  const { data: identity } = await admin.from('wa_identities').select('user_id').eq('phone', phone).maybeSingle();
  if (identity) {
    const { data: existing, error: getErr } = await admin.auth.admin.getUserById(identity.user_id);
    if (getErr || !existing.user) return json({ error: 'server_error' }, 500);
    email = existing.user.email ?? placeholderEmail(phone);
    if (!existing.user.email) await admin.auth.admin.updateUserById(identity.user_id, { email, email_confirm: true });
  } else {
    email = placeholderEmail(phone);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      phone: `+${phone}`,
      phone_confirm: true,
      app_metadata: { signup: 'whatsapp' },
    });
    if (createErr || !created.user) {
      console.error('createUser failed', createErr?.message);
      return json({ error: 'server_error' }, 500);
    }
    const { error: linkErr } = await admin.from('wa_identities').insert({ phone, user_id: created.user.id });
    if (linkErr) {
      console.error('wa_identities insert failed', linkErr.message);
      return json({ error: 'server_error' }, 500);
    }
  }

  // Mint a session: generate a one-time sign-in link and redeem it right here.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !link.properties?.hashed_token) {
    console.error('generateLink failed', linkError?.message);
    return json({ error: 'server_error' }, 500);
  }
  // A separate client so the new session never touches the admin client's state.
  const redeemer = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: verified, error: verifyError } = await redeemer.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
  if (verifyError || !verified.session) {
    console.error('verifyOtp failed', verifyError?.message);
    return json({ error: 'server_error' }, 500);
  }

  return json({
    status: 'ok',
    phone: `+${phone}`,
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
