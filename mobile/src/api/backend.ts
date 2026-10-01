import type { Couple, Home, Invite, InvitePreview, MediaMeta, Message, MessageType, Profile, QuestionState } from './types';

export type NewMessage = {
  couple_id: string;
  type: MessageType;
  body?: string | null;
  media_url?: string | null;
  media_meta?: MediaMeta | null;
  client_id: string;
};

/** Everything the app asks of the server. Implemented by Supabase and by the offline demo. */
export interface Backend {
  // auth
  getUserId(): Promise<string | null>;
  onAuthChange(cb: (userId: string | null) => void): () => void;
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<void>;
  /** Returns false if the person closed the Google sheet. */
  signInWithGoogle(): Promise<boolean>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;

  // profile
  getMyProfile(): Promise<Profile | null>;
  createProfile(p: { name: string; birthdate: string; avatar_config: object }): Promise<void>;
  updateProfile(p: Partial<{ name: string; avatar_config: object; mood: string | null }>): Promise<void>;
  getProfile(id: string): Promise<Profile | null>;

  // pairing
  /** My pending or active couple. */
  getMyCouple(): Promise<Couple | null>;
  onCoupleChange(cb: () => void): () => void;
  getOpenInvite(): Promise<Invite | null>;
  createInvite(): Promise<Invite>;
  revokeInvite(): Promise<void>;
  /** null = invalid or expired code. */
  previewInvite(code: string): Promise<InvitePreview | null>;
  /** null = invalid or expired code. */
  redeemInvite(code: string): Promise<Couple | null>;
  confirmCouple(id: string): Promise<Couple>;
  declineCouple(id: string): Promise<void>;
  setStartedOn(date: string): Promise<void>;

  // home & daily question
  getHome(): Promise<Home | null>;
  getQuestion(): Promise<QuestionState | null>;
  submitAnswer(answer: string): Promise<QuestionState>;

  // chat
  /** Newest first. Pass the oldest loaded created_at to page back. */
  listMessages(coupleId: string, before?: string, limit?: number): Promise<Message[]>;
  sendMessage(m: NewMessage): Promise<Message>;
  /** New messages and changes (read receipts). */
  onMessage(coupleId: string, cb: (m: Message) => void): () => void;
  markRead(coupleId: string): Promise<void>;
  /** Uploads a local file into the couple's private folder and returns its storage path. */
  uploadMedia(coupleId: string, localUri: string, contentType: string, ext: string): Promise<string>;
  /** Short-lived URL for a stored file. */
  mediaUrl(path: string): Promise<string>;
  /** Partner online status for the couple's private channel. */
  presence(coupleId: string, userId: string, cb: (partnerOnline: boolean) => void): () => void;
}
