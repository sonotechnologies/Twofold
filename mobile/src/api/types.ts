// Shapes returned by the backend (see supabase/migrations). Keep in sync with the SQL.

export type CoupleStatus = 'pending' | 'active' | 'ended';
export type MessageType = 'text' | 'image' | 'voice' | 'sticker' | 'gift';
export type Rank = 'new_flame' | 'sweethearts' | 'ride_or_die' | 'power_couple' | 'soulmates';

export type Profile = {
  id: string;
  name: string;
  avatar_config: Record<string, unknown>;
  mood: string | null;
};

export type Couple = {
  id: string;
  partner_a: string | null;
  partner_b: string | null;
  status: CoupleStatus;
  a_confirmed_at: string | null;
  b_confirmed_at: string | null;
  started_on: string | null;
  linked_at: string | null;
  ended_at: string | null;
};

export type Invite = { code: string; expires_at: string };

export type InvitePreview = { inviter_name: string; inviter_avatar: Record<string, unknown>; expires_at: string };

export type MediaMeta = { width?: number; height?: number; duration_ms?: number; waveform?: number[] };

export type Message = {
  id: string;
  couple_id: string;
  sender_id: string | null;
  type: MessageType;
  body: string | null;
  media_url: string | null;
  media_meta: MediaMeta | null;
  client_id: string | null;
  created_at: string;
  read_at: string | null;
};

/** A message as shown in the app: may still be sending from this device. */
export type ChatItem = Message & { pending?: 'sending' | 'failed'; localUri?: string };

export type QuestionState = {
  question_id: number;
  text: string;
  category: string;
  day: string;
  day_number: number;
  my_answer: string | null;
  partner_answered: boolean;
  partner_answer: string | null;
  both_answered: boolean;
  next_at: string;
};

export type PersonSummary = { id: string; name: string; avatar: Record<string, unknown>; mood: string | null };

export type Home = {
  couple_id: string;
  started_on: string;
  linked_at: string;
  days_together: number;
  me: PersonSummary;
  partner: PersonSummary;
  streak: { current: number; longest: number; done_today: boolean; me_active_today: boolean; partner_active_today: boolean };
  bond: { points: number; rank: Rank; rank_floor: number; next_rank: Rank | null; next_threshold: number | null };
  question: QuestionState | null;
};

/** Error raised by RPCs; `code` is the SQL hint (e.g. "already_paired", "under_18"). */
export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}
