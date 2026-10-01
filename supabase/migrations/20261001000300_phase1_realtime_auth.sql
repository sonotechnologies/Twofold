-- Twofold · private realtime channel per couple ("couple:<couple_id>"), used for online presence.
-- Only the two active partners may join, read presence or track themselves on it.

create function public.realtime_couple_topic_ok(topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(topic, ':', 1) = 'couple'
     and public.is_active_member(public.try_uuid(split_part(topic, ':', 2)))
$$;

grant execute on function public.realtime_couple_topic_ok(text) to authenticated;

create policy couple_channel_read on realtime.messages for select to authenticated
  using (realtime.messages.extension in ('presence', 'broadcast') and public.realtime_couple_topic_ok((select realtime.topic())));

create policy couple_channel_write on realtime.messages for insert to authenticated
  with check (realtime.messages.extension in ('presence', 'broadcast') and public.realtime_couple_topic_ok((select realtime.topic())));
