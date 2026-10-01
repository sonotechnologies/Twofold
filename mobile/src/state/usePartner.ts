import { useEffect, useState } from 'react';

import { api, type Profile } from '@/api';

import { useSession } from './session';

export function usePartnerProfile() {
  const { partnerId } = useSession();
  const [partner, setPartner] = useState<Profile | null>(null);
  useEffect(() => {
    if (!partnerId) return setPartner(null);
    let live = true;
    api.getProfile(partnerId).then((p) => live && setPartner(p)).catch(() => {});
    return () => {
      live = false;
    };
  }, [partnerId]);
  return partner;
}
