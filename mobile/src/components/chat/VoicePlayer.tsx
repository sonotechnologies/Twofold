import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { api } from '@/api';

// One shared player for the whole chat, so only one voice note plays at a time.
type Ctx = { playingId: string | null; progress: number; toggle: (id: string, path: string | null, localUri?: string) => void };

const VoiceContext = createContext<Ctx>({ playingId: null, progress: 0, toggle: () => {} });

export function VoicePlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  // Only "playing" while the player is actually playing, so a finished note shows play again.
  const playingId = status.playing ? loadedId : null;

  const toggle = useCallback(
    async (id: string, path: string | null, localUri?: string) => {
      if (playingId === id) {
        player.pause();
        return;
      }
      const uri = localUri ?? (path ? await api.mediaUrl(path) : null);
      if (!uri) return;
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      player.replace({ uri });
      player.play();
      setLoadedId(id);
    },
    [player, playingId],
  );

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const value = useMemo(() => ({ playingId, progress, toggle }), [playingId, progress, toggle]);
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export const useVoicePlayer = () => useContext(VoiceContext);
