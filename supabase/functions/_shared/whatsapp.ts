// Pure helpers for "Verify with WhatsApp". No Deno or Supabase imports, so they run under Node tests too.

export const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const TOKEN_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/** 6-character token from random bytes (32-symbol alphabet, so byte % 32 is unbiased). */
export function makeToken(random: Uint8Array): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += TOKEN_ALPHABET[random[i] % 32];
  return out;
}

export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/** The pre-filled message the user sends. Keep in sync with extractToken. */
export function verificationMessage(token: string): string {
  return `Twofold code: ${token}\n\nSend this message to confirm it's you.`;
}

/** Finds the token in a message, tolerating case changes, spaces and a middle dot ("4K9·X2P"). */
export function extractToken(text: string): string | null {
  const upper = text.toUpperCase();
  const afterLabel = upper.match(/CODE\W*([A-Z0-9]{3})[\s·.\-]?([A-Z0-9]{3})(?![A-Z0-9])/);
  const candidate = afterLabel ? afterLabel[1] + afterLabel[2] : upper.replace(/[^A-Z0-9]/g, '');
  return TOKEN_RE.test(candidate) ? candidate : null;
}

/** WhatsApp sender ids are digits in international format ("2348031234567"). */
export function normalizePhone(from: string): string | null {
  const digits = from.replace(/\D/g, '');
  return /^[0-9]{7,15}$/.test(digits) ? digits : null;
}

type InboundText = { phone: string; token: string };

/** Pulls (sender, token) pairs out of a WhatsApp Cloud API webhook payload. Ignores everything else. */
export function inboundVerifications(payload: unknown): InboundText[] {
  const found: InboundText[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return found;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const messages = (change as { value?: { messages?: unknown[] } })?.value?.messages;
      if (!Array.isArray(messages)) continue;
      for (const m of messages as { from?: string; type?: string; text?: { body?: string } }[]) {
        if (m?.type !== 'text' || typeof m.from !== 'string' || typeof m.text?.body !== 'string') continue;
        const phone = normalizePhone(m.from);
        const token = extractToken(m.text.body);
        if (phone && token) found.push({ phone, token });
      }
    }
  }
  return found;
}

/** Checks Meta's X-Hub-Signature-256 header ("sha256=<hex HMAC of the raw body with the app secret>"). */
export async function validMetaSignature(rawBody: string, header: string | null, appSecret: string): Promise<boolean> {
  if (!header?.startsWith('sha256=') || !appSecret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const given = header.slice('sha256='.length).toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
