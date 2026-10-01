import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { api, type ChatItem, type MediaMeta, type Message, type MessageType } from '@/api';
import { readCache, writeCache } from '@/lib/cache';
import { newId } from '@/lib/ids';

const PAGE = 40;
const CACHED = 50;

type Outgoing =
  | { type: 'text'; body: string }
  | { type: 'image'; localUri: string; meta: MediaMeta }
  | { type: 'voice'; localUri: string; meta: MediaMeta };

/** Newest-first list, merging by id and by client_id (so optimistic sends are replaced, not duplicated). */
function merge(list: ChatItem[], incoming: ChatItem[]): ChatItem[] {
  const byKey = new Map<string, ChatItem>();
  for (const m of list) byKey.set(m.client_id ?? m.id, m);
  for (const m of incoming) {
    const key = m.client_id ?? m.id;
    const prev = byKey.get(key);
    // Keep the local file for a just-sent photo or voice note so it doesn't flash while the URL loads.
    byKey.set(key, prev?.localUri && !m.localUri ? { ...m, localUri: prev.localUri } : m);
  }
  return [...byKey.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

export function useChat(coupleId: string | undefined, me: string | null) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [offline, setOffline] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const cacheKey = `chat:${coupleId}`;

  const markRead = useCallback(() => {
    if (coupleId) api.markRead(coupleId).catch(() => {});
  }, [coupleId]);

  const loadLatest = useCallback(async () => {
    if (!coupleId) return;
    try {
      const latest = await api.listMessages(coupleId, undefined, PAGE);
      setItems((prev) => merge(prev, latest));
      setHasMore(latest.length === PAGE);
      setOffline(false);
      markRead();
    } catch {
      setOffline(true);
    }
  }, [coupleId, markRead]);

  // Cached messages first, then the network.
  useEffect(() => {
    if (!coupleId) return;
    readCache<Message[]>(cacheKey).then((cached) => cached && setItems((prev) => merge(cached, prev)));
    loadLatest();
  }, [coupleId, cacheKey, loadLatest]);

  // Realtime: new messages and read receipts.
  useEffect(() => {
    if (!coupleId) return;
    const off = api.onMessage(coupleId, (m) => {
      setItems((prev) => merge(prev, [m]));
      if (m.sender_id !== me && !m.read_at) markRead();
    });
    const sub = AppState.addEventListener('change', (s) => s === 'active' && loadLatest());
    return () => {
      off();
      sub.remove();
    };
  }, [coupleId, me, markRead, loadLatest]);

  // Keep a small offline copy of the latest confirmed messages.
  useEffect(() => {
    if (!coupleId) return;
    const id = setTimeout(() => {
      const confirmed = items.filter((m) => !m.pending).slice(0, CACHED).map(({ localUri: _l, pending: _p, ...m }) => m);
      writeCache(cacheKey, confirmed);
    }, 500);
    return () => clearTimeout(id);
  }, [items, coupleId, cacheKey]);

  const loadOlder = useCallback(async () => {
    if (!coupleId || !hasMore || loadingOlder) return;
    const oldest = itemsRef.current.filter((m) => !m.pending).at(-1);
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const older = await api.listMessages(coupleId, oldest.created_at, PAGE);
      setItems((prev) => merge(prev, older));
      setHasMore(older.length === PAGE);
    } catch {
      // try again on next scroll
    } finally {
      setLoadingOlder(false);
    }
  }, [coupleId, hasMore, loadingOlder]);

  const deliver = useCallback(
    async (item: ChatItem) => {
      if (!coupleId) return;
      setItems((prev) => merge(prev, [{ ...item, pending: 'sending' }]));
      try {
        let mediaUrl = item.media_url;
        if (item.localUri && !mediaUrl) {
          const isVoice = item.type === 'voice';
          mediaUrl = await api.uploadMedia(coupleId, item.localUri, isVoice ? 'audio/mp4' : 'image/jpeg', isVoice ? 'm4a' : 'jpg');
        }
        const saved = await api.sendMessage({
          couple_id: coupleId,
          type: item.type,
          body: item.body,
          media_url: mediaUrl,
          media_meta: item.media_meta,
          client_id: item.client_id!,
        });
        setItems((prev) => merge(prev, [{ ...saved, localUri: item.localUri }]));
      } catch {
        setItems((prev) => merge(prev, [{ ...item, pending: 'failed' }]));
      }
    },
    [coupleId],
  );

  const send = useCallback(
    (out: Outgoing) => {
      if (!coupleId) return;
      const type: MessageType = out.type;
      const item: ChatItem = {
        id: `local-${newId()}`,
        client_id: newId(),
        couple_id: coupleId,
        sender_id: me,
        type,
        body: out.type === 'text' ? out.body.trim() : null,
        media_url: null,
        media_meta: out.type === 'text' ? null : out.meta,
        localUri: out.type === 'text' ? undefined : out.localUri,
        created_at: new Date().toISOString(),
        read_at: null,
        pending: 'sending',
      };
      deliver(item);
    },
    [coupleId, me, deliver],
  );

  return { items, hasMore, loadingOlder, offline, loadOlder, send, retry: deliver };
}
