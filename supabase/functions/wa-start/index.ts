// Step 1 of "Verify with WhatsApp": create a short token and the wa.me link the app opens.
// Public (no JWT): the person isn't signed in yet. The device keeps `secret`; only its hash is stored.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { makeToken, sha256Hex, toHex, verificationMessage } from '../_shared/whatsapp.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const businessNumber = (Deno.env.get('WHATSAPP_BUSINESS_NUMBER') ?? '').replace(/\D/g, '');
  if (!businessNumber) return json({ error: 'not_configured' }, 503);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const secret = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const secretHash = await sha256Hex(secret);

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = makeToken(crypto.getRandomValues(new Uint8Array(6)));
    const { data, error } = await admin
      .from('wa_verifications')
      .insert({ token, secret_hash: secretHash })
      .select('expires_at')
      .single();
    if (error?.code === '23505') continue; // token collision, try another
    if (error) {
      console.error('wa-start insert failed', error.message);
      return json({ error: 'server_error' }, 500);
    }
    const waUrl = `https://wa.me/${businessNumber}?text=${encodeURIComponent(verificationMessage(token))}`;
    return json({ token, secret, waUrl, expiresAt: data.expires_at });
  }
  return json({ error: 'server_error' }, 500);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
