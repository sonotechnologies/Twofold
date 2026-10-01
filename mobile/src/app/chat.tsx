import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import type { ChatItem } from '@/api';
import { AvatarBadge } from '@/components/avatar/Avatar';
import { StreakChip } from '@/components/brand/chips';
import { Heartbeat } from '@/components/brand/motion';
import { Composer } from '@/components/chat/Composer';
import { DayDivider, MessageBubble } from '@/components/chat/MessageBubble';
import { VoicePlayerProvider } from '@/components/chat/VoicePlayer';
import { BackButton } from '@/components/ui/BackButton';
import { Text } from '@/components/ui/Text';
import { useChat } from '@/state/useChat';
import { useHome, usePresence } from '@/state/useHome';
import { useSession } from '@/state/session';
import { usePartnerProfile } from '@/state/usePartner';
import { useTheme } from '@/theme/ThemeProvider';

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function Chat() {
  const { t, isDark } = useTheme();
  const { userId, couple } = useSession();
  const partner = usePartnerProfile();
  const { home } = useHome();
  const online = usePresence(couple?.id, userId);
  const { items, loadingOlder, offline, loadOlder, send, retry } = useChat(couple?.id, userId);
  const [error, setError] = useState<string | null>(null);

  // "Seen" goes under my newest message once my partner has read it.
  const seenId = useMemo(() => {
    const lastMine = items.find((m) => m.sender_id === userId && !m.pending);
    return lastMine?.read_at ? lastMine.id : undefined;
  }, [items, userId]);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatItem; index: number }) => {
      const older = items[index + 1];
      const showDay = !older || new Date(older.created_at).toDateString() !== new Date(item.created_at).toDateString();
      return (
        <View>
          {showDay ? <DayDivider label={dayLabel(item.created_at)} /> : null}
          <MessageBubble item={item} mine={item.sender_id === userId} seen={item.id === seenId} onRetry={retry} />
        </View>
      );
    },
    [items, userId, seenId, retry],
  );

  const showError = (m: string) => {
    setError(m);
    setTimeout(() => setError(null), 4000);
  };

  return (
    <VoicePlayerProvider>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.header, { borderBottomColor: t.ln }]}>
          <BackButton plain />
          <AvatarBadge config={partner?.avatar_config} background={t.room} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="h3" style={{ lineHeight: 20 }}>
              {partner?.name ?? ' '}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {online ? <Heartbeat size={8} /> : null}
              <Text variant="caption" tone="mu" style={{ fontSize: 12, lineHeight: 14 }}>
                {offline ? 'Offline · messages will send when you reconnect' : online ? 'Online now' : partner?.mood ?? 'Away'}
              </Text>
            </View>
          </View>
          {home ? <StreakChip days={home.streak.current} size="sm" /> : null}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            inverted
            data={items}
            keyExtractor={(m) => m.client_id ?? m.id}
            renderItem={renderItem}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.4}
            contentContainerStyle={styles.list}
            ListFooterComponent={loadingOlder ? <ActivityIndicator color={t.co} style={{ margin: 12 }} /> : null}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text variant="h3" style={{ textAlign: 'center' }}>
                  Say hi to {partner?.name ?? 'your partner'}
                </Text>
                <Text variant="caption" tone="mu" style={{ textAlign: 'center' }}>
                  Only the two of you can ever read this chat.
                </Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            windowSize={9}
          />
          <View style={styles.composer}>
            {error ? (
              <Text variant="caption" color={t.co} style={{ marginBottom: 6 }}>
                {error}
              </Text>
            ) : null}
            <Composer
              disabled={!couple}
              onSendText={(body) => send({ type: 'text', body })}
              onSendImage={(localUri, meta) => send({ type: 'image', localUri, meta })}
              onSendVoice={(localUri, meta) => send({ type: 'voice', localUri, meta })}
              onError={showError}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </VoicePlayerProvider>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1 },
  list: { paddingHorizontal: 14, paddingVertical: 14, gap: 8, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32, transform: [{ scaleY: -1 }] },
  composer: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },
});
