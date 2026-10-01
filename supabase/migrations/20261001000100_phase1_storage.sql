-- Twofold · Phase 1 storage
--
-- Private bucket for chat photos and voice notes. Object paths are "<couple_id>/<uuid>.<ext>".
--   * Active partners can upload to and read their couple's folder.
--   * After a breakup, each person can still download only the files they uploaded, for 30 days.
--   * Nothing is public; the app reads files through short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-media', 'couple-media', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg']
)
on conflict (id) do nothing;

create function public.storage_couple_id(object_name text) returns uuid
language sql immutable set search_path = '' as $$
  select public.try_uuid(split_part(object_name, '/', 1))
$$;

create function public.can_read_couple_object(object_name text, object_owner text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.couples c
    where c.id = public.storage_couple_id(object_name)
      and (select auth.uid()) in (c.partner_a, c.partner_b)
      and (
        c.status = 'active'
        or (c.status = 'ended' and c.linked_at is not null
            and c.ended_at > now() - interval '30 days'
            and object_owner = (select auth.uid())::text)
      )
  )
$$;

grant execute on function public.storage_couple_id(text), public.can_read_couple_object(text, text) to authenticated;

create policy couple_media_select on storage.objects for select to authenticated
  using (bucket_id = 'couple-media' and public.can_read_couple_object(name, owner_id));

create policy couple_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'couple-media' and public.is_active_member(public.storage_couple_id(name)));
