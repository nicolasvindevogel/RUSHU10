-- ============================================================
-- U10 HERSEAUX - V9 ESPACE ENTRAINEMENTS + FICHIERS SUPABASE
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Crée les tables, le bucket privé et les règles d'accès coach.
-- ============================================================

create table if not exists public.training_program (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  month_num integer not null check(month_num between 1 and 12),
  month_label text not null,
  theme text not null,
  objectives text not null,
  unique(team_id,month_num)
);

create table if not exists public.training_documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  session_date date not null,
  title text not null,
  notes text,
  storage_path text not null unique,
  original_name text not null,
  file_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.training_program enable row level security;
alter table public.training_documents enable row level security;

drop policy if exists training_program_select on public.training_program;
drop policy if exists training_program_coach_all on public.training_program;
drop policy if exists training_documents_select on public.training_documents;
drop policy if exists training_documents_coach_all on public.training_documents;

create policy training_program_select on public.training_program
for select to authenticated
using(public.is_team_member(team_id));

create policy training_program_coach_all on public.training_program
for all to authenticated
using(public.is_team_coach(team_id))
with check(public.is_team_coach(team_id));

create policy training_documents_select on public.training_documents
for select to authenticated
using(public.is_team_member(team_id));

create policy training_documents_coach_all on public.training_documents
for all to authenticated
using(public.is_team_coach(team_id))
with check(public.is_team_coach(team_id));

insert into public.training_program(team_id,month_num,month_label,theme,objectives)
values
('8d92c6e8-33f3-4d8f-9dd1-010202620270',9,'Septembre','Sensibilisation & Conduite','Maîtrise des surfaces de contact (intérieur, extérieur, semelle) et conduite de balle tête levée.'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',10,'Octobre','Le Dribble (1v1)','Oser le duel, apprendre les feintes (crochet, passement de jambes) et changer de rythme après le dribble.'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',11,'Novembre','La Prise de balle','Qualité du contrôle orienté (le ballon doit être mis dans la direction de la future action).'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',12,'Décembre','La Passe & l''Appel','Précision de la passe courte (intérieur du pied) et notion de "donner et suivre son ballon".'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',1,'Janvier','Jeu réduit & Appuis','Coordination dans les petits espaces et jeu avec un appui (partenaire pour faire un 2 contre 1).'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',2,'Février','Prise d''information','Analyse du jeu : regarder autour de soi avant de recevoir le ballon (le "scan").'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',3,'Mars','La Finition (Frappes)','Tir de précision et de puissance des deux pieds. Apprendre à placer son corps face au but.'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',4,'Avril','Occupation de l''espace','Notion d''écartement (jouer sur la largeur) et comprendre son rôle selon sa zone sur le terrain.'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',5,'Mai','Transition & Récupération','Apprendre à défendre debout (sans se jeter) et réagir vite à la perte du ballon.'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270',6,'Juin','Synthèse & Matchs','Application libre de tous les thèmes via des mini-tournois et des jeux à thèmes ludiques.')
on conflict(team_id,month_num) do update set
  month_label=excluded.month_label,
  theme=excluded.theme,
  objectives=excluded.objectives;

-- Bucket privé pour les fichiers de séances
insert into storage.buckets(id,name,public,file_size_limit)
values('training-files','training-files',false,52428800)
on conflict(id) do update set public=false, file_size_limit=52428800;

-- Le chemin des fichiers commence par l'UUID de l'équipe.
drop policy if exists training_files_read on storage.objects;
drop policy if exists training_files_insert on storage.objects;
drop policy if exists training_files_update on storage.objects;
drop policy if exists training_files_delete on storage.objects;

create policy training_files_read on storage.objects
for select to authenticated
using(
  bucket_id='training-files'
  and public.is_team_member((storage.foldername(name))[1]::uuid)
);

create policy training_files_insert on storage.objects
for insert to authenticated
with check(
  bucket_id='training-files'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
);

create policy training_files_update on storage.objects
for update to authenticated
using(
  bucket_id='training-files'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
)
with check(
  bucket_id='training-files'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
);

create policy training_files_delete on storage.objects
for delete to authenticated
using(
  bucket_id='training-files'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
);
