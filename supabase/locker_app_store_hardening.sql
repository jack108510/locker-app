-- Supabase storage + moderation additions for App Store UGC readiness.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('locker-scans', 'locker-scans', true, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.locker_materials
  add column if not exists image_url text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists removed_at timestamptz;

alter table public.locker_reports
  add column if not exists status text not null default 'open' check (status in ('open','reviewed','dismissed'));

drop policy if exists "locker scans public read" on storage.objects;
drop policy if exists "locker scans public insert" on storage.objects;

create policy "locker scans public read" on storage.objects
for select using (bucket_id = 'locker-scans');

create policy "locker scans public insert" on storage.objects
for insert with check (
  bucket_id = 'locker-scans'
  and lower((storage.foldername(name))[1]) in ('public', 'pending')
);

create or replace view public.locker_moderation_queue as
select
  m.id,
  m.title,
  m.material_type,
  m.school,
  m.course,
  m.teacher,
  m.status,
  m.moderation_reason,
  m.image_url,
  m.preview,
  m.created_at,
  count(r.id)::int as report_count
from public.locker_materials m
left join public.locker_reports r on r.material_id = m.id and r.status = 'open'
where m.status = 'pending' or r.id is not null
and m.removed_at is null
group by m.id;

grant select on public.locker_moderation_queue to anon, authenticated;
