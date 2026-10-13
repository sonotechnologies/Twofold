import { File } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { PostgrestError } from '@supabase/supabase-js';

import { newId } from '@/lib/ids';
import { supabase } from '@/lib/supabase';

import type { Backend, WhatsAppStart } from './backend';
import { ApiError, type Couple, type Home, type Invite, type InvitePreview, type Message, type Profile, type QuestionState } from './types';

const MEDIA_BUCKET = 'couple-media';
const PROFILE_COLUMNS = 'id, name, avatar_config, mood';

function fail(error: PostgrestError | { message: string; hint?: string } | null): never {
  throw new ApiError(error?.message ?? 'Something went wrong', (error as PostgrestError | null)?.hint ?? undefined);
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) fail(error);
  return data as T;
}

/** Composite-returning RPCs come back as an object, or an object of nulls for "none". */
function rowOrNull<T extends { id?: unknown; code?: unknown }>(row: T | null): T | null {
  return row && (row.id ?? row.code) != null ? row : null;
}

/** Edge function errors carry a JSON body like {"error":"not_configured"}. */
async function errorCode(error: unknown): Promise<string | undefined> {
  const res = (error as { context?: Response }).context;
  try {
    return res ? ((await res.json()) as { error?: string }).error : undefined;
  } catch {
    return undefined;
  }
}

const signedUrls = new Map<string, { url: string; expires: number }>();

export const supabaseBackend: Backend = {
  async getUserId() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  },

  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  },

  async startWhatsApp() {
    const { data, error } = await supabase.functions.invoke('wa-start', { method: 'POST' });
    if (error) {
      const code = await errorCode(error);
      fail({ message: code === 'not_configured' ? 'WhatsApp sign-in isn’t set up yet. Use Google for now.' : 'Couldn’t start WhatsApp sign-in. Check your connection.', hint: code });
    }
    return data as WhatsAppStart;
  },

  async completeWhatsApp({ token, secret }) {
    const { data, error } = await supabase.functions.invoke('wa-complete', { method: 'POST', body: { token, secret } });
    if (error) fail({ message: 'Couldn’t finish signing in. Check your connection.' });
    const res = data as { status: 'pending' | 'expired' | 'ok'; access_token?: string; refresh_token?: string };
    if (res.status !== 'ok') return res.status;
    const { error: sessionError } = await supabase.auth.setSession({ access_token: res.access_token!, refresh_token: res.refresh_token! });
    if (sessionError) fail(sessionError);
    return 'signedIn';
  },

  async signInWithGoogle() {
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) fail(error);
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return false;
    const code = new URL(result.url).searchParams.get('code');
    if (!code) fail({ message: 'Google sign-in did not complete' });
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) fail(exchangeError);
    return true;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async deleteAccount() {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) fail({ message: 'We couldn’t delete your account. Try again.' });
    await supabase.auth.signOut();
  },

  async getMyProfile() {
    const id = await this.getUserId();
    if (!id) return null;
    return this.getProfile(id);
  },

  async getProfile(id) {
    const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle();
    if (error) fail(error);
    return data as Profile | null;
  },

  async createProfile({ name, birthdate, avatar_config }) {
    const id = await this.getUserId();
    const { error } = await supabase.from('profiles').insert({ id, name: name.trim(), birthdate, avatar_config });
    if (error) fail(error);
  },

  async updateProfile(p) {
    const id = await this.getUserId();
    const { error } = await supabase.from('profiles').update(p).eq('id', id!);
    if (error) fail(error);
  },

  async getMyCouple() {
    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .in('status', ['pending', 'active'])
      .limit(1)
      .maybeSingle();
    if (error) fail(error);
    return data as Couple | null;
  },

  onCoupleChange(cb) {
    const channel = supabase
      .channel(`couples-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couples' }, () => cb())
      .subscribe();
    return () => void supabase.removeChannel(channel);
  },

  async getOpenInvite() {
    const { data, error } = await supabase
      .from('invites')
      .select('code, expires_at')
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) fail(error);
    return data as Invite | null;
  },

  async createInvite() {
    return rpc<Invite>('create_invite');
  },

  async revokeInvite() {
    await rpc('revoke_invite');
  },

  async previewInvite(code) {
    const rows = await rpc<InvitePreview[]>('preview_invite', { p_code: code });
    return rows[0] ?? null;
  },

  async redeemInvite(code) {
    return rowOrNull(await rpc<Couple>('redeem_invite', { p_code: code }));
  },

  async confirmCouple(id) {
    return rpc<Couple>('confirm_couple', { p_couple: id });
  },

  async declineCouple(id) {
    await rpc('decline_couple', { p_couple: id });
  },

  async setStartedOn(date) {
    await rpc('set_started_on', { p_date: date });
  },

  async getHome() {
    return rpc<Home | null>('couple_home');
  },

  async getQuestion() {
    return rpc<QuestionState | null>('daily_question_state');
  },

  async submitAnswer(answer) {
    return rpc<QuestionState>('submit_answer', { p_answer: answer });
  },

  async listMessages(coupleId, before, limit = 40) {
    let q = supabase
      .from('messages')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    if (before) q = q.lt('created_at', before);
    const { data, error } = await q;
    if (error) fail(error);
    return data as Message[];
  },

  async sendMessage(m) {
    const { data, error } = await supabase.from('messages').insert(m).select('*').single();
    if (error?.code === '23505') {
      // Already delivered by an earlier attempt (same client_id): fetch it instead.
      const { data: existing } = await supabase.from('messages').select('*').eq('client_id', m.client_id).single();
      if (existing) return existing as Message;
    }
    if (error) fail(error);
    return data as Message;
  },

  onMessage(coupleId, cb) {
    const channel = supabase
      .channel(`messages-${coupleId}`)
      .on(
        'postgres_changes',
        // INSERT for new messages, UPDATE for read receipts.
        { event: '*', schema: 'public', table: 'messages', filter: `couple_id=eq.${coupleId}` },
        (payload) => cb(payload.new as Message),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  },

  async markRead(coupleId) {
    await rpc('mark_read', { p_couple: coupleId });
  },

  async uploadMedia(coupleId, localUri, contentType, ext) {
    const bytes = await new File(localUri).arrayBuffer();
    const path = `${coupleId}/${newId()}.${ext}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, { contentType, upsert: false });
    if (error) fail(error);
    return path;
  },

  async mediaUrl(path) {
    const cached = signedUrls.get(path);
    if (cached && cached.expires > Date.now() + 60_000) return cached.url;
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 60 * 60);
    if (error || !data) fail(error);
    signedUrls.set(path, { url: data.signedUrl, expires: Date.now() + 60 * 60 * 1000 });
    return data.signedUrl;
  },

  presence(coupleId, userId, cb) {
    const channel = supabase.channel(`couple:${coupleId}`, {
      config: { private: true, presence: { key: userId, enabled: true } },
    });
    channel.on('presence', { event: 'sync' }, () => {
      const keys = Object.keys(channel.presenceState());
      cb(keys.some((k) => k !== userId));
    });
    // Private channels authorise with the user's JWT, so set it before joining.
    supabase.realtime.setAuth().then(() =>
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ at: Date.now() });
      }),
    );
    return () => void supabase.removeChannel(channel);
  },
};
