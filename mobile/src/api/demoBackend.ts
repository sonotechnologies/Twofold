// In-memory backend for trying the app without Supabase (EXPO_PUBLIC_DEMO=1).
// A scripted partner, Bella, joins your invite, confirms, replies to messages and answers questions.
// State resets when the app reloads. Rules mirror the SQL where it matters for the UI.
import type { Backend, NewMessage } from './backend';
import { ApiError, type Couple, type Home, type Invite, type Message, type Profile, type QuestionState } from './types';

const ME = 'demo-me';
const BELLA = 'demo-bella';
const bellaProfile: Profile = {
  id: BELLA,
  name: 'Bella',
  avatar_config: { skin: '#8D5A3B', hair: 'braids', outfit: 'ankara', c1: '#FF7A66', c2: '#E9B44C', hairColor: '#1B1110' },
  mood: 'feeling cozy',
};
const replies = [
  'Lol you’re so silly 😂',
  'Miss you already',
  'Third Mainland is not moving at all',
  'Don’t break the flame!',
  'Okay okay, I’ll call you tonight',
  'Suya on the way home?',
];

const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const uuid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const s = {
  userId: null as string | null,
  waReadyAt: 0,
  me: null as Profile | null,
  couple: null as Couple | null,
  invite: null as Invite | null,
  messages: [] as Message[],
  points: 1480,
  streak: { current: 41, longest: 41, lastBoth: day(-1) },
  activeToday: new Set<string>(),
  myAnswer: null as string | null,
  bellaAnswer: 'The way you sing every Burna song like you wrote it. Off-key, full confidence.',
};

const authListeners = new Set<(id: string | null) => void>();
const coupleListeners = new Set<() => void>();
const messageListeners = new Set<(m: Message) => void>();
const presenceListeners = new Set<(online: boolean) => void>();

const emitCouple = () => coupleListeners.forEach((cb) => cb());

function activate() {
  if (!s.couple) return;
  s.couple = { ...s.couple, status: 'active', a_confirmed_at: s.couple.a_confirmed_at ?? new Date().toISOString(), b_confirmed_at: s.couple.b_confirmed_at ?? new Date().toISOString(), linked_at: new Date().toISOString(), started_on: day(-217) };
  emitCouple();
  setTimeout(() => presenceListeners.forEach((cb) => cb(true)), 800);
}

function recordActivity(user: string) {
  s.activeToday.add(user);
  if (s.activeToday.size === 2 && s.streak.lastBoth !== day()) {
    s.streak.current = s.streak.lastBoth === day(-1) ? s.streak.current + 1 : 1;
    s.streak.longest = Math.max(s.streak.longest, s.streak.current);
    s.streak.lastBoth = day();
  }
}

function rankOf(p: number): Home['bond']['rank'] {
  return p >= 15000 ? 'soulmates' : p >= 5000 ? 'power_couple' : p >= 2000 ? 'ride_or_die' : p >= 500 ? 'sweethearts' : 'new_flame';
}
const floors = { new_flame: 0, sweethearts: 500, ride_or_die: 2000, power_couple: 5000, soulmates: 15000 } as const;
const nextOf = { new_flame: 'sweethearts', sweethearts: 'ride_or_die', ride_or_die: 'power_couple', power_couple: 'soulmates', soulmates: null } as const;

function question(): QuestionState {
  return {
    question_id: 1,
    text: 'What’s one thing I do that always makes you laugh?',
    category: 'fun',
    day: day(),
    day_number: 218,
    my_answer: s.myAnswer,
    partner_answered: true,
    partner_answer: s.myAnswer ? s.bellaAnswer : null,
    both_answered: !!s.myAnswer,
    next_at: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
  };
}

function pushMessage(m: Message) {
  s.messages.unshift(m);
  messageListeners.forEach((cb) => cb(m));
}

export const demoBackend: Backend = {
  async getUserId() {
    return s.userId;
  },
  onAuthChange(cb) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
  async startWhatsApp() {
    await wait(300);
    s.waReadyAt = Date.now() + 3000; // pretend the message arrives a few seconds after WhatsApp opens
    return { token: 'TF4K9X', secret: 'demo', waUrl: 'https://wa.me/2340000000000?text=Twofold%20code%3A%20TF4K9X', expiresAt: new Date(Date.now() + 600e3).toISOString() };
  },
  async completeWhatsApp() {
    await wait(200);
    if (Date.now() < s.waReadyAt) return 'pending';
    s.userId = ME;
    authListeners.forEach((cb) => cb(ME));
    return 'signedIn';
  },
  async signInWithGoogle() {
    await wait(500);
    s.userId = ME;
    authListeners.forEach((cb) => cb(ME));
    return true;
  },
  async signOut() {
    s.userId = null;
    authListeners.forEach((cb) => cb(null));
  },
  async deleteAccount() {
    Object.assign(s, { me: null, couple: null, invite: null, messages: [], myAnswer: null });
    await this.signOut();
  },

  async getMyProfile() {
    return s.userId ? s.me : null;
  },
  async getProfile(id) {
    return id === BELLA ? bellaProfile : id === ME ? s.me : null;
  },
  async createProfile({ name, birthdate, avatar_config }) {
    const age = (Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 18) throw new ApiError('You must be 18 or older to use Twofold', 'under_18');
    s.me = { id: ME, name: name.trim(), avatar_config: avatar_config as Profile['avatar_config'], mood: null };
  },
  async updateProfile(p) {
    if (s.me) s.me = { ...s.me, ...(p as Partial<Profile>) };
  },

  async getMyCouple() {
    return s.couple && s.couple.status !== 'ended' ? s.couple : null;
  },
  onCoupleChange(cb) {
    coupleListeners.add(cb);
    return () => coupleListeners.delete(cb);
  },
  async getOpenInvite() {
    return s.invite;
  },
  async createInvite() {
    await wait(300);
    s.invite = { code: '4K9X2P', expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() };
    // Bella enters the code a few seconds later.
    setTimeout(() => {
      if (!s.invite || s.couple) return;
      s.invite = null;
      s.couple = { id: 'demo-couple', partner_a: ME, partner_b: BELLA, status: 'pending', a_confirmed_at: null, b_confirmed_at: new Date().toISOString(), started_on: null, linked_at: null, ended_at: null };
      emitCouple();
    }, 7000);
    return s.invite;
  },
  async revokeInvite() {
    s.invite = null;
  },
  async previewInvite(code) {
    await wait(400);
    if (code.replace(/[^a-z0-9]/gi, '').length !== 6) return null;
    return { inviter_name: 'Bella', inviter_avatar: bellaProfile.avatar_config, expires_at: new Date(Date.now() + 3600e3).toISOString() };
  },
  async redeemInvite(code) {
    if (!(await this.previewInvite(code))) return null;
    s.couple = { id: 'demo-couple', partner_a: BELLA, partner_b: ME, status: 'pending', a_confirmed_at: null, b_confirmed_at: new Date().toISOString(), started_on: null, linked_at: null, ended_at: null };
    setTimeout(activate, 2500); // Bella confirms
    return s.couple;
  },
  async confirmCouple() {
    await wait(300);
    activate();
    return s.couple!;
  },
  async declineCouple() {
    s.couple = null;
    emitCouple();
  },
  async setStartedOn(date) {
    if (s.couple) s.couple = { ...s.couple, started_on: date };
  },

  async getHome() {
    if (!s.me || s.couple?.status !== 'active') return null;
    const rank = rankOf(s.points);
    const next = nextOf[rank];
    return {
      couple_id: s.couple.id,
      started_on: s.couple.started_on!,
      linked_at: s.couple.linked_at!,
      days_together: 218,
      me: { id: ME, name: s.me.name, avatar: s.me.avatar_config, mood: s.me.mood },
      partner: { id: BELLA, name: bellaProfile.name, avatar: bellaProfile.avatar_config, mood: bellaProfile.mood },
      streak: {
        current: s.streak.lastBoth >= day(-1) ? s.streak.current : 0,
        longest: s.streak.longest,
        done_today: s.streak.lastBoth === day(),
        me_active_today: s.activeToday.has(ME),
        partner_active_today: s.activeToday.has(BELLA),
      },
      bond: { points: s.points, rank, rank_floor: floors[rank], next_rank: next, next_threshold: next ? floors[next] : null },
      question: question(),
    };
  },
  async getQuestion() {
    return s.couple?.status === 'active' ? question() : null;
  },
  async submitAnswer(answer) {
    await wait(400);
    if (!s.myAnswer) {
      s.myAnswer = answer.trim();
      s.points += 15;
      recordActivity(ME);
    }
    return question();
  },

  async listMessages(_coupleId, before, limit = 40) {
    if (s.messages.length === 0 && !before) {
      const t = Date.now();
      s.messages = [
        { id: 'm2', couple_id: 'demo-couple', sender_id: BELLA, type: 'text', body: 'Third Mainland is not moving at all', media_url: null, media_meta: null, client_id: null, created_at: new Date(t - 4 * 60e3).toISOString(), read_at: null },
        { id: 'm1', couple_id: 'demo-couple', sender_id: ME, type: 'text', body: 'Leaving work now', media_url: null, media_meta: null, client_id: null, created_at: new Date(t - 9 * 60e3).toISOString(), read_at: new Date().toISOString() },
      ];
    }
    const older = before ? s.messages.filter((m) => m.created_at < before) : s.messages;
    return older.slice(0, limit);
  },
  async sendMessage(m: NewMessage) {
    await wait(250);
    const msg: Message = { id: uuid(), couple_id: m.couple_id, sender_id: ME, type: m.type, body: m.body ?? null, media_url: m.media_url ?? null, media_meta: m.media_meta ?? null, client_id: m.client_id, created_at: new Date().toISOString(), read_at: null };
    s.messages.unshift(msg);
    s.points += 1;
    recordActivity(ME);
    setTimeout(() => {
      recordActivity(BELLA);
      pushMessage({ id: uuid(), couple_id: m.couple_id, sender_id: BELLA, type: 'text', body: replies[Math.floor(Math.random() * replies.length)], media_url: null, media_meta: null, client_id: null, created_at: new Date().toISOString(), read_at: null });
    }, 2500);
    return msg;
  },
  onMessage(_coupleId, cb) {
    messageListeners.add(cb);
    return () => messageListeners.delete(cb);
  },
  async markRead() {
    s.messages.forEach((m) => {
      if (m.sender_id !== ME && !m.read_at) m.read_at = new Date().toISOString();
    });
  },
  async uploadMedia(_coupleId, localUri) {
    await wait(600);
    return localUri; // demo keeps the local file
  },
  async mediaUrl(path) {
    return path;
  },
  presence(_coupleId, _userId, cb) {
    presenceListeners.add(cb);
    if (s.couple?.status === 'active') setTimeout(() => cb(true), 300);
    return () => presenceListeners.delete(cb);
  },
};
