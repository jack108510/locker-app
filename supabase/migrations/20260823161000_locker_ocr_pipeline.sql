-- Locker OCR quality-gate + vision-fallback metadata.
-- Safe to rerun. Apply before relying on extraction_status/ocr_source analytics.

alter table public.locker_materials
  add column if not exists raw_ocr_text text,
  add column if not exists ocr_source text not null default 'tesseract',
  add column if not exists ocr_quality text not null default 'unchecked',
  add column if not exists ocr_confidence numeric,
  add column if not exists ai_review jsonb not null default '{}'::jsonb,
  add column if not exists vision_text text,
  add column if not exists extraction_status text not null default 'ocr_good';

alter table public.locker_materials
  drop constraint if exists locker_materials_ocr_source_check;

alter table public.locker_materials
  add constraint locker_materials_ocr_source_check
  check (ocr_source in ('tesseract', 'local_quality_gate', 'ai_review', 'vision_model'));

alter table public.locker_materials
  drop constraint if exists locker_materials_ocr_quality_check;

alter table public.locker_materials
  add constraint locker_materials_ocr_quality_check
  check (ocr_quality in ('unchecked', 'good', 'needs_vision', 'rescued', 'failed'));

alter table public.locker_materials
  drop constraint if exists locker_materials_extraction_status_check;

alter table public.locker_materials
  add constraint locker_materials_extraction_status_check
  check (extraction_status in ('pending', 'ocr_good', 'needs_vision', 'vision_done', 'failed'));

update public.locker_materials
set raw_ocr_text = coalesce(raw_ocr_text, ocr_text),
    ocr_quality = case
      when ocr_text is null or length(trim(ocr_text)) = 0 then 'failed'
      else 'good'
    end,
    extraction_status = case
      when ocr_text is null or length(trim(ocr_text)) = 0 then 'failed'
      else 'ocr_good'
    end
where raw_ocr_text is null;

comment on column public.locker_materials.raw_ocr_text is 'Unmodified first-pass OCR text from Tesseract before AI cleanup or vision fallback.';
comment on column public.locker_materials.ocr_source is 'Final extraction source: tesseract/local_quality_gate/ai_review/vision_model.';
comment on column public.locker_materials.ocr_quality is 'Quality outcome of the OCR pipeline.';
comment on column public.locker_materials.ai_review is 'JSON signals/reason from Locker OCR AI quality gate.';
comment on column public.locker_materials.vision_text is 'Vision fallback extraction text when used.';
comment on column public.locker_materials.extraction_status is 'Pipeline state for indexing/moderation analytics.';
