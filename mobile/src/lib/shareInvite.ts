import { Linking, Share } from 'react-native';

import { inviteMessage } from '@/constants/links';

export async function shareOnWhatsApp(code: string) {
  const url = `whatsapp://send?text=${encodeURIComponent(inviteMessage(code))}`;
  try {
    await Linking.openURL(url);
  } catch {
    // WhatsApp not installed: fall back to the system share sheet.
    await shareInvite(code);
  }
}

export async function shareInvite(code: string) {
  await Share.share({ message: inviteMessage(code) });
}
