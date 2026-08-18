-- Multi-page scan + assignment database metadata migration.
-- Safe to rerun before deploying the app version that selects these columns.

alter table public.locker_materials
  add column if not exists grade_level text,
  add column if not exists unit_topic text,
  add column if not exists material_year text,
  add column if not exists image_url text,
  add column if not exists image_urls text[] not null default '{}';

update public.locker_materials
set image_urls = array[image_url]
where image_url is not null
  and (image_urls is null or cardinality(image_urls) = 0);

update public.locker_materials
set grade_level = coalesce(grade_level, case
    when course ~* '\\b12\\b' then 'Grade 12'
    when course ~* '\\b11\\b' then 'Grade 11'
    when course ~* '\\b10\\b' then 'Grade 10'
    when course ~* '\\b9\\b' then 'Grade 9'
    else null
  end),
  material_year = coalesce(material_year, substring(title from '(20[0-9]{2}|19[0-9]{2})'));

comment on column public.locker_materials.grade_level is 'Optional grade label extracted from OCR or entered by uploader, e.g. Grade 11.';
comment on column public.locker_materials.unit_topic is 'Optional unit/topic label for searching school materials.';
comment on column public.locker_materials.material_year is 'Optional year/semester context for past material.';
comment on column public.locker_materials.image_urls is 'Ordered public URLs for multi-page scan images.';
