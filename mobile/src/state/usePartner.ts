import { useEffect, useState } from 'react';

import { api, type Profile } from '@/api';

import { useSession } from './session';

export function usePartnerProfile() {
  const { partnerId } = useSession();
  const [loaded, setLoaded] = useState<Profile | null>(null);
  useEffect(() => {
    if (!partnerId) return;
    let live = true;
    api.getProfile(partnerId).then((p) => live && setLoaded(p)).catch(() => {});
    return () => {
      live = false;
    };
  }, [partnerId]);
  // Ignore a profile left over from a previous partner.
  return loaded && loaded.id === partnerId ? loaded : null;
}
