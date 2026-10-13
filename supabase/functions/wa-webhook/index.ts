// Step 2: Meta calls this when someone messages the Twofold WhatsApp number.
// GET  = Meta's one-time webhook verification (echo hub.challenge if the verify token matches).
// POST = inbound messages. We only read them; Twofold never replies, so verification costs nothing.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { inboundVerifications, validMetaSignature } from '../_shared/whatsapp.ts';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const ok =
      url.searchParams.get('hub.mode') === 'subscribe' &&
      url.searchParams.get('hub.verify_token') === Deno.env.get('WHATSAPP_VERIFY_TOKEN');
    return ok ? new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const raw = await req.text();
  if (!(await validMetaSignature(raw, req.headers.get('x-hub-signature-256'), Deno.env.get('META_APP_SECRET') ?? ''))) {
    return new Response('bad signature', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response('ok'); // malformed body: acknowledge so Meta doesn't retry forever
  }

  const found = inboundVerifications(payload);
  if (found.length) {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    for (const { phone, token } of found) {
      const { error } = await admin.rpc('wa_mark_verified', { p_token: token, p_phone: phone });
      if (error) console.error('wa_mark_verified failed', error.message);
    }
  }
  // Always 200 quickly; Meta retries non-2xx responses.
  return new Response('ok');
});
