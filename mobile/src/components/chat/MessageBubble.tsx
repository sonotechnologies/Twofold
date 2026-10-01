import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { api, type ChatItem } from '@/api';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { useVoicePlayer } from './VoicePlayer';

type Props = { item: ChatItem; mine: boolean; seen?: boolean; onRetry?: (item: ChatItem) => void };

const MAX_W = 250;

export const MessageBubble = memo(function MessageBubble({ item, mine, seen, onRetry }: Props) {
  const { t } = useTheme();
  const bg = mine ? t.meBub : t.themBub;
  const ink = mine ? t.meInk : t.themInk;
  const corners = mine ? styles.mine : styles.theirs;
  const failed = item.pending === 'failed';

  let content: React.ReactNode = null;
  if (item.type === 'text') {
    content = (
      <View style={[styles.text, corners, { backgroundColor: bg }]}>
        <Text color={ink} style={{ lineHeight: 22 }} selectable>
          {item.body}
        </Text>
      </View>
    );
  } else if (item.type === 'image') {
    content = <ImageBubble item={item} corners={corners} />;
  } else if (item.type === 'voice') {
    content = <VoiceBubble item={item} corners={corners} bg={bg} ink={ink} />;
  }

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', opacity: item.pending === 'sending' ? 0.7 : 1 }}>
      {content}
      {failed ? (
        <Pressable onPress={() => onRetry?.(item)} accessibilityRole="button" hitSlop={8}>
          <Text variant="caption" color={t.co} style={{ fontSize: 12, marginTop: 4 }}>
            Not sent. Tap to retry
          </Text>
        </Pressable>
      ) : seen ? (
        <Text variant="caption" tone="mu" style={{ fontSize: 11, marginTop: 3 }}>
          Seen
        </Text>
      ) : null}
    </View>
  );
});

function useMediaUri(item: ChatItem) {
  const [uri, setUri] = useState<string | null>(item.localUri ?? null);
  useEffect(() => {
    if (item.localUri || !item.media_url) return;
    let live = true;
    api.mediaUrl(item.media_url).then((u) => live && setUri(u)).catch(() => {});
    return () => {
      live = false;
    };
  }, [item.media_url, item.localUri]);
  return uri;
}

function ImageBubble({ item, corners }: { item: ChatItem; corners: object }) {
  const { t } = useTheme();
  const uri = useMediaUri(item);
  const w = item.media_meta?.width ?? 4;
  const h = item.media_meta?.height ?? 3;
  const width = 220;
  const height = Math.max(120, Math.min(300, (width * h) / w));
  return (
    <View style={[corners, { width, height, overflow: 'hidden', backgroundColor: t.sf2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width, height }} contentFit="cover" transition={150} cachePolicy="disk" accessibilityLabel="Photo" />
      ) : null}
    </View>
  );
}

function VoiceBubble({ item, corners, bg, ink }: { item: ChatItem; corners: object; bg: string; ink: string }) {
  const { playingId, progress, toggle } = useVoicePlayer();
  const playing = playingId === item.id;
  const wave = item.media_meta?.waveform ?? [8, 14, 20, 12, 22, 16, 10, 18, 24, 14, 8, 16, 20, 12, 6, 14, 18, 10, 8];
  const secs = Math.round((item.media_meta?.duration_ms ?? 0) / 1000);
  const played = playing ? Math.floor(progress * wave.length) : -1;

  return (
    <Pressable
      onPress={() => toggle(item.id, item.media_url, item.localUri)}
      accessibilityRole="button"
      accessibilityLabel={`${playing ? 'Pause' : 'Play'} voice note, ${secs} seconds`}
      style={[corners, styles.voice, { backgroundColor: bg }]}
    >
      <View style={[styles.play, { backgroundColor: ink }]}>
        {playing ? (
          <View style={{ flexDirection: 'row', gap: 3 }}>
            <View style={{ width: 3.5, height: 12, borderRadius: 1, backgroundColor: bg }} />
            <View style={{ width: 3.5, height: 12, borderRadius: 1, backgroundColor: bg }} />
          </View>
        ) : (
          <View style={[styles.triangle, { borderLeftColor: bg }]} />
        )}
      </View>
      <View style={styles.wave}>
        {wave.map((hgt, i) => (
          <View key={i} style={{ width: 3, height: hgt, borderRadius: 2, backgroundColor: ink, opacity: played >= i ? 1 : 0.55 }} />
        ))}
      </View>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12 }} color={ink}>
        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
      </Text>
    </Pressable>
  );
}

export function DayDivider({ label }: { label: string }) {
  const { t } = useTheme();
  return (
    <View style={[styles.day, { backgroundColor: t.sf2 }]}>
      <Text variant="caption" tone="mu" style={{ fontFamily: fonts.bodySemibold, fontSize: 12, lineHeight: 14 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { maxWidth: MAX_W, paddingVertical: 11, paddingHorizontal: 15 },
  theirs: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomRightRadius: 22, borderBottomLeftRadius: 8 },
  mine: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 8 },
  voice: { width: 230, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingLeft: 9, paddingRight: 14 },
  play: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  triangle: { width: 0, height: 0, borderLeftWidth: 10, borderTopWidth: 6, borderBottomWidth: 6, borderTopColor: 'transparent', borderBottomColor: 'transparent', marginLeft: 3 },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, overflow: 'hidden' },
  day: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginVertical: 6 },
});
