import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { api, type Couple, type Profile } from '@/api';
import { clearCache } from '@/lib/cache';

/** Where the person is in the journey; drives routing. */
export type Stage =
  | 'loading'
  | 'signedOut'
  | 'needsProfile' // signed in, no profile yet (name, birthday, avatar)
  | 'unpaired' // has a profile, no couple
  | 'awaitingPartner' // pending couple; partner still has to confirm
  | 'needsMyConfirm' // pending couple; partner entered my code, I confirm
  | 'active';

type Session = {
  stage: Stage;
  userId: string | null;
  profile: Profile | null;
  couple: Couple | null;
  partnerId: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

function stageFor(userId: string | null, profile: Profile | null, couple: Couple | null): Stage {
  if (!userId) return 'signedOut';
  if (!profile) return 'needsProfile';
  if (!couple) return 'unpaired';
  if (couple.status === 'active') return 'active';
  const iAmA = couple.partner_a === userId;
  const mine = iAmA ? couple.a_confirmed_at : couple.b_confirmed_at;
  return mine ? 'awaitingPartner' : 'needsMyConfirm';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loaded, setLoaded] = useState(false);
  const userRef = useRef<string | null>(null);

  const load = useCallback(async (uid: string | null) => {
    userRef.current = uid;
    if (!uid) {
      setUserId(null);
      setProfile(null);
      setCouple(null);
      setLoaded(true);
      return;
    }
    try {
      const [p, c] = await Promise.all([api.getMyProfile(), api.getMyCouple()]);
      if (userRef.current !== uid) return;
      setUserId(uid);
      setProfile(p);
      setCouple(c);
    } catch {
      // Offline: keep what we have; screens show cached data.
      setUserId(uid);
    } finally {
      setLoaded(true);
    }
  }, []);

  const refresh = useCallback(() => load(userRef.current), [load]);

  useEffect(() => {
    api.getUserId().then(load);
    return api.onAuthChange((uid) => {
      if (uid !== userRef.current) load(uid);
    });
  }, [load]);

  // Pairing confirmations and breakups arrive in realtime; also re-check when the app returns.
  useEffect(() => {
    if (!userId) return;
    const off = api.onCoupleChange(refresh);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      off();
      sub.remove();
    };
  }, [userId, refresh]);

  const signOut = useCallback(async () => {
    await api.signOut();
    await clearCache();
    await load(null);
  }, [load]);

  const value = useMemo<Session>(() => {
    const stage = loaded ? stageFor(userId, profile, couple) : 'loading';
    const partnerId = couple && userId ? (couple.partner_a === userId ? couple.partner_b : couple.partner_a) : null;
    return { stage, userId, profile, couple, partnerId, refresh, signOut };
  }, [loaded, userId, profile, couple, refresh, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}
