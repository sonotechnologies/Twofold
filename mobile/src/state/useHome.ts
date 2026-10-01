import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { api, type Home } from '@/api';
import { readCache, writeCache } from '@/lib/cache';

// Home data: shows the cached copy instantly, then refreshes whenever the screen is focused.
export function useHome() {
  const [home, setHome] = useState<Home | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    readCache<Home>('home').then((cached) => cached && setHome((h) => h ?? cached));
  }, []);

  const reload = useCallback(async () => {
    try {
      const fresh = await api.getHome();
      setHome(fresh);
      setOffline(false);
      if (fresh) writeCache('home', fresh);
    } catch {
      setOffline(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { home, offline, reload };
}

export function usePresence(coupleId: string | undefined, userId: string | null) {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    if (!coupleId || !userId) return;
    return api.presence(coupleId, userId, setOnline);
  }, [coupleId, userId]);
  return online;
}
