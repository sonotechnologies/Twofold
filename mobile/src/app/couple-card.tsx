import { useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { CoupleCard, cardSize, type CardFormat } from '@/components/cards/CoupleCard';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useHome } from '@/state/useHome';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

// Output sizes: 1080×1920 for Stories/Status, 1080×1080 for feed posts.
const exportSize = { story: { width: 1080, height: 1920 }, square: { width: 1080, height: 1080 } };

export default function CoupleCardScreen() {
  const { t } = useTheme();
  const { home } = useHome();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [format, setFormat] = useState<CardFormat>('story');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<View>(null);

  const size = cardSize(format);
  const scale = Math.min((screenW - 48) / size.width, (screenH * 0.58) / size.height, 1);

  async function share() {
    if (!cardRef.current) return;
    setSharing(true);
    setError(null);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, ...exportSize[format] });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your couple card', UTI: 'public.png' });
      } else {
        setError('Sharing isn’t available on this device.');
      }
    } catch {
      setError('We couldn’t create the image. Try again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button label="Share card" onPress={share} loading={sharing} disabled={!home} />
          <Button kind="ghost" style={{ borderWidth: 0 }} label="Done" onPress={() => router.back()} />
        </>
      }
    >
      <View style={{ gap: 16, flex: 1 }}>
        <Text variant="h1">Your couple card</Text>
        <View style={[styles.toggle, { backgroundColor: t.sf }]}>
          {(['story', 'square'] as const).map((f) => {
            const on = f === format;
            return (
              <Pressable key={f} onPress={() => setFormat(f)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.seg, on && { backgroundColor: t.pb }]}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14 }} color={on ? t.pbInk : t.ink2}>
                  {f === 'story' ? 'Story · 9:16' : 'Post · 1:1'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {home ? (
            <View style={{ width: size.width * scale, height: size.height * scale }}>
              <View style={{ width: size.width, height: size.height, transform: [{ scale }], transformOrigin: 'top left' }}>
                <CoupleCard
                  ref={cardRef}
                  format={format}
                  names={[home.me.name, home.partner.name]}
                  avatars={[home.me.avatar, home.partner.avatar]}
                  rank={home.bond.rank}
                  streak={home.streak.current}
                  daysTogether={home.days_together}
                  still={sharing}
                />
              </View>
            </View>
          ) : null}
        </View>
        {error ? (
          <Text variant="caption" color={t.co} style={{ textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', padding: 5, borderRadius: 999, gap: 6 },
  seg: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
