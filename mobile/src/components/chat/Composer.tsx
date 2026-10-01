import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import type { MediaMeta } from '@/api';
import { Pulse } from '@/components/brand/motion';
import { Text } from '@/components/ui/Text';
import { pickImage, toWaveform, voiceRecordingOptions } from '@/lib/media';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

type Props = {
  disabled?: boolean;
  onSendText: (text: string) => void;
  onSendImage: (uri: string, meta: MediaMeta) => void;
  onSendVoice: (uri: string, meta: MediaMeta) => void;
  onError: (message: string) => void;
};

const MAX_VOICE_MS = 3 * 60 * 1000;

export function Composer({ disabled, onSendText, onSendImage, onSendVoice, onError }: Props) {
  const { t } = useTheme();
  const [text, setText] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorder = useAudioRecorder(voiceRecordingOptions);
  const recState = useAudioRecorderState(recorder, 100);
  const levels = useRef<number[]>([]);

  useEffect(() => {
    if (recording && recState.metering != null) levels.current.push(recState.metering);
    if (recording && recState.durationMillis >= MAX_VOICE_MS) stopRecording(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState.durationMillis]);

  async function attach(source: 'library' | 'camera') {
    setAttachOpen(false);
    try {
      const img = await pickImage(source);
      if (img) onSendImage(img.uri, { width: img.width, height: img.height });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Couldn’t open your photos.');
    }
  }

  async function startRecording() {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return onError('Allow microphone access in Settings to send voice notes.');
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      levels.current = [];
      recorder.record();
      setRecording(true);
    } catch {
      onError('Couldn’t start recording.');
    }
  }

  async function stopRecording(send: boolean) {
    if (!recording) return;
    const duration = recState.durationMillis;
    setRecording(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (send && recorder.uri && duration > 700) {
        onSendVoice(recorder.uri, { duration_ms: Math.round(duration), waveform: toWaveform(levels.current) });
      }
    } catch {
      onError('Couldn’t save that voice note.');
    }
  }

  const secs = Math.floor(recState.durationMillis / 1000);
  const hasText = text.trim().length > 0;

  return (
    <View style={{ gap: 8 }}>
      {attachOpen ? (
        <View style={[styles.attach, { backgroundColor: t.sf, borderColor: t.ln }]}>
          <AttachOption label="Photo library" onPress={() => attach('library')} />
          <AttachOption label="Take a photo" onPress={() => attach('camera')} />
        </View>
      ) : null}

      <View style={styles.row}>
        {recording ? (
          <>
            <Pressable onPress={() => stopRecording(false)} accessibilityRole="button" accessibilityLabel="Cancel voice note" style={[styles.round, { backgroundColor: t.sf }]}>
              <Text style={styles.icon} tone="ink2">
                ×
              </Text>
            </Pressable>
            <View style={[styles.field, { backgroundColor: t.sf, gap: 10 }]}>
              <Pulse duration={1000}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brand.coral }} />
              </Pulse>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15 }}>
                Recording {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
              </Text>
            </View>
            <SendButton onPress={() => stopRecording(true)} label="Send voice note" />
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setAttachOpen((o) => !o)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="Attach a photo"
              style={[styles.round, { backgroundColor: t.sf }]}
            >
              <Text style={styles.icon} tone="ink2">
                {attachOpen ? '×' : '+'}
              </Text>
            </Pressable>
            <View style={[styles.field, { backgroundColor: t.sf }]}>
              <TextInput
                value={text}
                onChangeText={setText}
                editable={!disabled}
                placeholder={disabled ? 'Chat is read-only' : 'Message'}
                placeholderTextColor={t.mu}
                selectionColor={t.co}
                multiline
                {...(Platform.OS === 'web' ? ({ rows: 1 } as object) : {})}
                maxLength={4000}
                style={[styles.input, { color: t.ink }]}
                accessibilityLabel="Message"
              />
            </View>
            {hasText ? (
              <SendButton
                label="Send"
                onPress={() => {
                  onSendText(text);
                  setText('');
                }}
              />
            ) : (
              <Pressable
                onPress={startRecording}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Record a voice note"
                style={[styles.round, { backgroundColor: t.co }]}
              >
                <Mic color={brand.wineDeep} />
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function AttachOption({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

function SendButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.round, { backgroundColor: t.co }]}>
      <View style={styles.sendArrow} />
    </Pressable>
  );
}

function Mic({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 9, height: 14, borderRadius: 5, backgroundColor: color }} />
      <View style={{ width: 15, height: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 2, borderTopWidth: 0, borderColor: color, marginTop: -5 }} />
      <View style={{ width: 2, height: 3, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  icon: { fontFamily: fonts.body, fontSize: 26, lineHeight: 30 },
  field: { flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 20, maxHeight: 120, paddingVertical: 11, outlineWidth: 0 },
  sendArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: brand.wineDeep,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  attach: { borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start', paddingVertical: 4 },
});
