// Run with: node --experimental-strip-types --test supabase/functions/_shared/whatsapp.test.ts
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

import { extractToken, inboundVerifications, makeToken, normalizePhone, validMetaSignature, verificationMessage } from './whatsapp.ts';

test('makeToken uses only the unambiguous alphabet', () => {
  const token = makeToken(new Uint8Array([0, 31, 32, 255, 8, 14]));
  assert.match(token, /^[A-HJ-NP-Z2-9]{6}$/);
});

test('extractToken reads the pre-filled message and common edits', () => {
  assert.equal(extractToken(verificationMessage('4K9X2P')), '4K9X2P');
  assert.equal(extractToken('twofold code: 4k9x2p'), '4K9X2P');
  assert.equal(extractToken('Twofold code: 4K9·X2P'), '4K9X2P');
  assert.equal(extractToken('4K9X2P'), '4K9X2P');
  assert.equal(extractToken('hello there'), null);
  assert.equal(extractToken('Twofold code: 0O1I00'), null); // letters outside the alphabet
});

test('normalizePhone keeps international digits only', () => {
  assert.equal(normalizePhone('2348031234567'), '2348031234567');
  assert.equal(normalizePhone('+234 803 123 4567'), '2348031234567');
  assert.equal(normalizePhone('abc'), null);
});

test('inboundVerifications extracts text messages from a Cloud API webhook', () => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              messages: [
                { from: '2348031234567', type: 'text', text: { body: verificationMessage('ABC234') } },
                { from: '2348031234567', type: 'image', image: {} },
                { from: '2348000000000', type: 'text', text: { body: 'hi' } },
              ],
              statuses: [{ id: 'x' }],
            },
          },
        ],
      },
    ],
  };
  assert.deepEqual(inboundVerifications(payload), [{ phone: '2348031234567', token: 'ABC234' }]);
  assert.deepEqual(inboundVerifications({}), []);
  assert.deepEqual(inboundVerifications(null), []);
});

test('validMetaSignature accepts only the correct HMAC', async () => {
  const body = '{"entry":[]}';
  const sig = 'sha256=' + createHmac('sha256', 'app-secret').update(body).digest('hex');
  assert.equal(await validMetaSignature(body, sig, 'app-secret'), true);
  assert.equal(await validMetaSignature(body, sig, 'other-secret'), false);
  assert.equal(await validMetaSignature(body + ' ', sig, 'app-secret'), false);
  assert.equal(await validMetaSignature(body, null, 'app-secret'), false);
  assert.equal(await validMetaSignature(body, sig, ''), false);
});
