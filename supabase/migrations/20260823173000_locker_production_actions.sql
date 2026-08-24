-- Locker production actions: moderation, reports, saves, source blocks, and counters.
-- Safe to rerun.

alter table public.locker_reports
  add column if not exists status text not null default 'open',
  add column if not exists handled_at timestamptz,
  add column if not exists handled_reason text;

alter table public.locker_reports
  drop constraint if exists locker_reports_status_check;

alter table public.locker_reports
  add constraint locker_reports_status_check
  check (status in ('open', 'reviewing', 'resolved', 'dismissed'));

create table if not exists public.locker_saves (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.locker_materials(id) on delete cascade,
  profile_id uuid references public.locker_profiles(id) on delete set null,
  device_id text,
  created_at timestamptz not null default now(),
  unique(material_id, device_id)
);

create table if not exists public.locker_source_blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.locker_profiles(id) on delete cascade,
  device_id text,
  blocked_pseudonym text not null,
  created_at timestamptz not null default now(),
  unique(device_id, blocked_pseudonym)
);

create index if not exists locker_materials_school_status_created_idx on public.locker_materials (school, status, created_at desc);
create index if not exists locker_materials_text_search_idx on public.locker_materials using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(course,'') || ' ' || coalesce(teacher,'') || ' ' || coalesce(unit_topic,'') || ' ' || coalesce(ocr_text,'')));
create index if not exists locker_reports_material_status_idx on public.locker_reports (material_id, status, created_at desc);
create index if not exists locker_saves_material_idx on public.locker_saves (material_id);
create index if not exists locker_source_blocks_device_idx on public.locker_source_blocks (device_id);

alter table public.locker_saves enable row level security;
alter table public.locker_source_blocks enable row level security;

drop policy if exists "locker materials moderator update" on public.locker_materials;
drop policy if exists "locker reports public read" on public.locker_reports;
drop policy if exists "locker reports public update" on public.locker_reports;
drop policy if exists "locker saves public read" on public.locker_saves;
drop policy if exists "locker saves public insert" on public.locker_saves;
drop policy if exists "locker saves public delete" on public.locker_saves;
drop policy if exists "locker source blocks public read" on public.locker_source_blocks;
drop policy if exists "locker source blocks public insert" on public.locker_source_blocks;
drop policy if exists "locker source blocks public delete" on public.locker_source_blocks;

-- MVP/admin-surface policies. Tighten behind Supabase Auth roles before a public launch.
create policy "locker materials moderator update" on public.locker_materials for update using (true) with check (true);
create policy "locker reports public read" on public.locker_reports for select using (true);
create policy "locker reports public update" on public.locker_reports for update using (true) with check (true);
create policy "locker saves public read" on public.locker_saves for select using (true);
create policy "locker saves public insert" on public.locker_saves for insert with check (true);
create policy "locker saves public delete" on public.locker_saves for delete using (true);
create policy "locker source blocks public read" on public.locker_source_blocks for select using (true);
create policy "locker source blocks public insert" on public.locker_source_blocks for insert with check (true);
create policy "locker source blocks public delete" on public.locker_source_blocks for delete using (true);

grant select, insert, delete on public.locker_saves to anon, authenticated;
grant select, insert, delete on public.locker_source_blocks to anon, authenticated;
grant select, insert, update on public.locker_reports to anon, authenticated;
grant update on public.locker_materials to anon, authenticated;

create or replace function public.locker_recount_material_counters(target_material uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.locker_materials
  set upvotes = (select count(*)::int from public.locker_votes where material_id = target_material),
      saves = (select count(*)::int from public.locker_saves where material_id = target_material),
      updated_at = now()
  where id = target_material;
end;
$$;

create or replace function public.locker_vote_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.locker_recount_material_counters(coalesce(new.material_id, old.material_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.locker_save_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.locker_recount_material_counters(coalesce(new.material_id, old.material_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists locker_votes_recount on public.locker_votes;
create trigger locker_votes_recount
after insert or delete on public.locker_votes
for each row execute function public.locker_vote_counter_trigger();

drop trigger if exists locker_saves_recount on public.locker_saves;
create trigger locker_saves_recount
after insert or delete on public.locker_saves
for each row execute function public.locker_save_counter_trigger();

select public.locker_recount_material_counters(id) from public.locker_materials;
