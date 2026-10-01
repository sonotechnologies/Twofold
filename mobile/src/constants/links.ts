// Public links used in invites and share cards.
// TODO before launch: replace with the real store / landing page URL.
export const GET_TWOFOLD_URL = 'https://twofold.app';

export const formatCode = (code: string) => (code.length === 6 ? `${code.slice(0, 3)}·${code.slice(3)}` : code);

export function inviteMessage(code: string) {
  return `Join me on Twofold, our little world for two 💛\n\nOur couple code: ${formatCode(code)}\n\nGet the app at ${GET_TWOFOLD_URL} and tap "I have an invite code". If you already have it: twofold://join?code=${code}`;
}
