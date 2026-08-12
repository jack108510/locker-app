-- Locker production schema for the public crowdsourced test-bank app.
-- Safe to rerun. Uses public anon inserts for a low-friction social experiment.

create extension if not exists pgcrypto;

create table if not exists public.locker_profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  pseudonym text not null,
  school text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locker_materials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.locker_profiles(id) on delete set null,
  title text not null,
  material_type text not null check (material_type in ('assignment','quiz','exam','review-packet','practice-test','worksheet')),
  school text not null,
  course text not null default 'General',
  teacher text,
  pseudonym text not null default 'Anonymous',
  status text not null default 'pending' check (status in ('approved','pending','blocked')),
  moderation_reason text,
  tags text[] not null default '{}',
  ocr_text text,
  preview text not null default '',
  pages int not null default 1,
  upvotes int not null default 0,
  saves int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locker_reports (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.locker_materials(id) on delete cascade,
  profile_id uuid references public.locker_profiles(id) on delete set null,
  reason text not null default 'reported',
  created_at timestamptz not null default now()
);

create table if not exists public.locker_votes (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.locker_materials(id) on delete cascade,
  profile_id uuid references public.locker_profiles(id) on delete set null,
  device_id text,
  created_at timestamptz not null default now(),
  unique(material_id, device_id)
);

create or replace view public.locker_stats as
select
  (select count(*)::int from public.locker_materials where status <> 'blocked') as submitted,
  (select count(*)::int from public.locker_materials where status = 'approved') as approved,
  (select count(distinct school)::int from public.locker_materials where status = 'approved') as schools;

alter table public.locker_profiles enable row level security;
alter table public.locker_materials enable row level security;
alter table public.locker_reports enable row level security;
alter table public.locker_votes enable row level security;

drop policy if exists "locker profiles public read" on public.locker_profiles;
drop policy if exists "locker profiles public insert" on public.locker_profiles;
drop policy if exists "locker profiles public update" on public.locker_profiles;
drop policy if exists "locker materials approved read" on public.locker_materials;
drop policy if exists "locker materials public insert" on public.locker_materials;
drop policy if exists "locker reports public insert" on public.locker_reports;
drop policy if exists "locker votes public insert" on public.locker_votes;
drop policy if exists "locker votes public read" on public.locker_votes;

create policy "locker profiles public read" on public.locker_profiles for select using (true);
create policy "locker profiles public insert" on public.locker_profiles for insert with check (true);
create policy "locker profiles public update" on public.locker_profiles for update using (true) with check (true);

create policy "locker materials approved read" on public.locker_materials for select using (status = 'approved');
create policy "locker materials public insert" on public.locker_materials for insert with check (status in ('approved','pending','blocked'));

create policy "locker reports public insert" on public.locker_reports for insert with check (true);
create policy "locker votes public insert" on public.locker_votes for insert with check (true);
create policy "locker votes public read" on public.locker_votes for select using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.locker_profiles to anon, authenticated;
grant select, insert on public.locker_materials to anon, authenticated;
grant select on public.locker_stats to anon, authenticated;
grant select, insert on public.locker_votes to anon, authenticated;
grant insert on public.locker_reports to anon, authenticated;

insert into public.locker_profiles (username, pseudonym, school)
values ('seed-harbourfox', 'HarbourFox42', 'Halifax West High School')
on conflict (username) do nothing;

insert into public.locker_materials (title, material_type, school, course, teacher, pseudonym, status, tags, ocr_text, preview, pages, upvotes, saves)
select 'Chemistry 12 Bonding Quiz — Fall 2022', 'quiz', 'Halifax West High School', 'Chemistry 12', 'Ms. Clarke', 'HarbourFox42', 'approved',
       array['bonding','VSEPR','quiz','Chemistry 12','Ms. Clarke'],
       'Bonding polarity molecular shapes VSEPR intermolecular forces multiple choice short answer.',
       'Scanned past quiz covering bonding, polarity, molecular shapes, and intermolecular forces. Useful for seeing how questions were worded.',
       7, 58, 34
where not exists (select 1 from public.locker_materials where title = 'Chemistry 12 Bonding Quiz — Fall 2022');

insert into public.locker_materials (title, material_type, school, course, teacher, pseudonym, status, tags, ocr_text, preview, pages, upvotes, saves)
select 'Biology 11 Cell Unit Assignment', 'assignment', 'Halifax West High School', 'Biology 11', 'Mr. Bennett', 'NorthOwl19', 'approved',
       array['cells','organelles','assignment','Biology 11','Mr. Bennett'],
       'Cell organelles membrane transport microscope terms diagrams assignment.',
       'Old assignment page covering organelles, membrane transport, microscope terms, and diagrams from the cell unit.',
       3, 41, 29
where not exists (select 1 from public.locker_materials where title = 'Biology 11 Cell Unit Assignment');

insert into public.locker_materials (title, material_type, school, course, teacher, pseudonym, status, tags, ocr_text, preview, pages, upvotes, saves)
select 'Math 11 Functions Quiz — 2021', 'quiz', 'Citadel High School', 'Math 11', 'Ms. Rivera', 'FogHawk77', 'approved',
       array['functions','quadratics','graphs','Math 11','Ms. Rivera'],
       'Functions transformations graphing domain range quadratics quiz.',
       'Past quiz scan with functions, transformations, graphing, and domain/range questions.',
       5, 36, 22
where not exists (select 1 from public.locker_materials where title = 'Math 11 Functions Quiz — 2021');
