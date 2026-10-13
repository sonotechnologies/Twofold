// Public links used in invites and share cards.
// The Play Store address is fixed by the app ID (app.json → android.package), so it works as soon as
// the app is published.
export const ANDROID_PACKAGE = 'com.sonotechnologies.twofold';
export const GET_TWOFOLD_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export const formatCode = (code: string) => (code.length === 6 ? `${code.slice(0, 3)}·${code.slice(3)}` : code);

export function inviteMessage(code: string) {
  return `Join me on Twofold, our little world for two 💛\n\nOur couple code: ${formatCode(code)}\n\nGet the app at ${GET_TWOFOLD_URL} and tap "I have an invite code". If you already have it: twofold://join?code=${code}`;
}
