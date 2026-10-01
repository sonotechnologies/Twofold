import { createContext, useContext, useState, type ReactNode } from 'react';

import { defaultAvatar, type AvatarConfig } from '@/components/avatar/avatarOptions';

// Holds the profile being built across onboarding screens until "Looks like me" saves it.
type Draft = { name: string; birthdate: string; avatar: AvatarConfig };

const DraftContext = createContext<{ draft: Draft; update: (d: Partial<Draft>) => void } | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ name: '', birthdate: '', avatar: defaultAvatar });
  return <DraftContext.Provider value={{ draft, update: (d) => setDraft((prev) => ({ ...prev, ...d })) }}>{children}</DraftContext.Provider>;
}

export function useOnboardingDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useOnboardingDraft must be used inside OnboardingDraftProvider');
  return ctx;
}
