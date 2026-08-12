-- Update Locker from broad public test bank to per-school database with answer-bearing material types.

alter table public.locker_materials
  drop constraint if exists locker_materials_material_type_check;

alter table public.locker_materials
  add constraint locker_materials_material_type_check
  check (material_type in (
    'assignment', 'assignment-answers',
    'quiz', 'quiz-answers',
    'exam', 'exam-answers',
    'worksheet', 'worksheet-answers'
  ));

update public.locker_materials
set material_type = 'quiz-answers',
    tags = array(select distinct unnest(tags || array['answers']))
where title = 'Chemistry 12 Bonding Quiz — Fall 2022';

update public.locker_materials
set material_type = 'assignment-answers',
    tags = array(select distinct unnest(tags || array['answers']))
where title = 'Biology 11 Cell Unit Assignment';

update public.locker_materials
set material_type = 'quiz-answers',
    tags = array(select distinct unnest(tags || array['answers']))
where title = 'Math 11 Functions Quiz — 2021';
