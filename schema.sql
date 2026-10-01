-- U10 HERSEAUX - Schéma Supabase
-- À exécuter dans Supabase > SQL Editor, avant seed.sql
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'parent' check (role in ('parent','coach')),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text,
  join_code_hash text not null,
  coach_code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'parent' check (role in ('parent','coach')),
  created_at timestamptz not null default now(),
  primary key(team_id,user_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  first_name text not null,
  last_name text,
  number integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.player_guardians (
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  relation text default 'parent',
  created_at timestamptz not null default now(),
  primary key(player_id,user_id)
);

create table if not exists public.player_pin_hashes (
  player_id uuid primary key references public.players(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('training','match','tournament','other')),
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  meeting_time time,
  location text,
  address text,
  opponent text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('present','absent','maybe')),
  comment text,
  set_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(event_id,player_id)
);

create table if not exists public.attendance (
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('present','absent','excused','late')),
  notes text,
  marked_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(event_id,player_id)
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  eval_date date not null,
  eval_type text not null default 'training' check (eval_type in ('small_game','technical','match','training','other')),
  technique text check (technique in ('A','B','C')),
  game_intelligence text check (game_intelligence in ('A','B','C')),
  athletic text check (athletic in ('A','B','C')),
  attitude text check (attitude in ('A','B','C')),
  score_total integer check (score_total between 0 and 12),
  overall_level text check (overall_level in ('A','B','C')),
  remarks text,
  evaluated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(player_id,eval_date)
);

-- Profil automatique à la création d'un compte
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,role)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'parent')
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Helpers RLS
create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members tm where tm.team_id=p_team and tm.user_id=auth.uid());
$$;
create or replace function public.is_team_coach(p_team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members tm where tm.team_id=p_team and tm.user_id=auth.uid() and tm.role='coach');
$$;
create or replace function public.is_guardian(p_player uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.player_guardians pg where pg.player_id=p_player and pg.user_id=auth.uid());
$$;
create or replace function public.player_team(p_player uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select team_id from public.players where id=p_player;
$$;
create or replace function public.event_team(p_event uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select team_id from public.events where id=p_event;
$$;

-- RPC: rejoindre l'équipe par code
create or replace function public.join_team(p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into v_team from public.teams where join_code_hash = extensions.crypt(p_code, join_code_hash) limit 1;
  if v_team is null then raise exception 'Code équipe incorrect'; end if;
  insert into public.team_members(team_id,user_id,role) values(v_team,auth.uid(),'parent') on conflict(team_id,user_id) do nothing;
  return v_team;
end; $$;

-- RPC: activation du premier/des comptes coach
create or replace function public.claim_coach(p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into v_team from public.teams where coach_code_hash = extensions.crypt(p_code, coach_code_hash) limit 1;
  if v_team is null then raise exception 'Code coach incorrect'; end if;
  insert into public.team_members(team_id,user_id,role) values(v_team,auth.uid(),'coach')
  on conflict(team_id,user_id) do update set role='coach';
  update public.profiles set role='coach' where id=auth.uid();
  return v_team;
end; $$;

-- RPC coach: générer un nouveau code à 6 chiffres pour un joueur
create or replace function public.generate_player_pin(p_player_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare v_team uuid; v_pin text;
begin
  select team_id into v_team from public.players where id=p_player_id;
  if not public.is_team_coach(v_team) then raise exception 'Accès coach requis'; end if;
  v_pin := lpad((floor(random()*1000000))::int::text,6,'0');
  insert into public.player_pin_hashes(player_id,pin_hash,updated_at)
  values(p_player_id,extensions.crypt(v_pin,extensions.gen_salt('bf')),now())
  on conflict(player_id) do update set pin_hash=excluded.pin_hash,updated_at=now();
  return v_pin;
end; $$;

-- RPC parent: lier son compte à son enfant
create or replace function public.link_player_with_pin(p_player_id uuid,p_pin text)
returns void language plpgsql security definer set search_path=public as $$
declare v_team uuid; v_hash text;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select team_id into v_team from public.players where id=p_player_id and active=true;
  if v_team is null or not public.is_team_member(v_team) then raise exception 'Joueur inaccessible'; end if;
  select pin_hash into v_hash from public.player_pin_hashes where player_id=p_player_id;
  if v_hash is null or v_hash <> extensions.crypt(p_pin,v_hash) then raise exception 'Code joueur incorrect'; end if;
  insert into public.player_guardians(player_id,user_id) values(p_player_id,auth.uid()) on conflict do nothing;
end; $$;

grant execute on function public.join_team(text) to authenticated;
grant execute on function public.claim_coach(text) to authenticated;
grant execute on function public.generate_player_pin(uuid) to authenticated;
grant execute on function public.link_player_with_pin(uuid,text) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.players enable row level security;
alter table public.player_guardians enable row level security;
alter table public.player_pin_hashes enable row level security;
alter table public.events enable row level security;
alter table public.availability enable row level security;
alter table public.attendance enable row level security;
alter table public.evaluations enable row level security;

-- Nettoyage des anciennes policies portant les mêmes noms
drop policy if exists profiles_select on public.profiles; drop policy if exists profiles_update_self on public.profiles;
drop policy if exists teams_select on public.teams; drop policy if exists members_select on public.team_members;
drop policy if exists players_select on public.players; drop policy if exists players_coach_all on public.players;
drop policy if exists guardians_select on public.player_guardians; drop policy if exists guardians_delete on public.player_guardians;
drop policy if exists events_select on public.events; drop policy if exists events_coach_all on public.events;
drop policy if exists availability_select on public.availability; drop policy if exists availability_insert on public.availability; drop policy if exists availability_update on public.availability; drop policy if exists availability_delete on public.availability;
drop policy if exists attendance_select on public.attendance; drop policy if exists attendance_coach_all on public.attendance;
drop policy if exists evaluations_coach_all on public.evaluations;

create policy profiles_select on public.profiles for select to authenticated using (
  id=auth.uid() or exists(select 1 from public.team_members tm where tm.user_id=profiles.id and public.is_team_coach(tm.team_id))
);
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

create policy teams_select on public.teams for select to authenticated using(public.is_team_member(id));
create policy members_select on public.team_members for select to authenticated using(public.is_team_member(team_id));

create policy players_select on public.players for select to authenticated using(public.is_team_member(team_id));
create policy players_coach_all on public.players for all to authenticated using(public.is_team_coach(team_id)) with check(public.is_team_coach(team_id));

create policy guardians_select on public.player_guardians for select to authenticated using(user_id=auth.uid() or public.is_team_coach(public.player_team(player_id)));
create policy guardians_delete on public.player_guardians for delete to authenticated using(user_id=auth.uid() or public.is_team_coach(public.player_team(player_id)));

create policy events_select on public.events for select to authenticated using(public.is_team_member(team_id));
create policy events_coach_all on public.events for all to authenticated using(public.is_team_coach(team_id)) with check(public.is_team_coach(team_id));

create policy availability_select on public.availability for select to authenticated using(public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id)));
create policy availability_insert on public.availability for insert to authenticated with check((public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id))) and public.player_team(player_id)=public.event_team(event_id));
create policy availability_update on public.availability for update to authenticated using(public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id))) with check((public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id))) and public.player_team(player_id)=public.event_team(event_id));
create policy availability_delete on public.availability for delete to authenticated using(public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id)));

create policy attendance_select on public.attendance for select to authenticated using(public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id)));
create policy attendance_coach_all on public.attendance for all to authenticated using(public.is_team_coach(public.event_team(event_id))) with check(public.is_team_coach(public.event_team(event_id)) and public.player_team(player_id)=public.event_team(event_id));

create policy evaluations_coach_all on public.evaluations for all to authenticated using(public.is_team_coach(public.player_team(player_id))) with check(public.is_team_coach(public.player_team(player_id)));

-- player_pin_hashes : aucune lecture directe volontaire. Accès uniquement via RPC SECURITY DEFINER.


-- ============================================================
-- U10 HERSEAUX - CONNEXION COACH PAR NOM + CODE PIN 6 CHIFFRES
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Prérequis : schema.sql + seed.sql déjà exécutés.
-- ============================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  begin
    alter extension pgcrypto set schema extensions;
  exception when others then
    null;
  end;
end $$;

create table if not exists public.app_identities (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  identity_key text not null unique,
  display_name text not null,
  identity_type text not null check (identity_type in ('coach','player')),
  player_id uuid references public.players(id) on delete cascade,
  pin_hash text,
  auth_user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_identities(team_id,identity_key,display_name,identity_type)
values
('8d92c6e8-33f3-4d8f-9dd1-010202620270','coach-nicolas','VINDEVOGEL Nicolas','coach'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270','coach-thibaut','THERY Thibaut','coach'),
('8d92c6e8-33f3-4d8f-9dd1-010202620270','coach-maxime','DELANNOY Maxime','coach')
on conflict(identity_key) do update
set display_name=excluded.display_name,
    team_id=excluded.team_id,
    active=true,
    updated_at=now();

alter table public.app_identities enable row level security;

drop policy if exists app_identities_self_select on public.app_identities;
create policy app_identities_self_select
on public.app_identities
for select
to authenticated
using(auth_user_id=auth.uid());

create or replace function public.identity_login_status(p_identity_key text)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_row public.app_identities%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Session requise';
  end if;

  select * into v_row
  from public.app_identities
  where identity_key=p_identity_key and active=true;

  if not found then
    return jsonb_build_object('exists',false,'has_pin',false);
  end if;

  return jsonb_build_object(
    'exists',true,
    'has_pin',v_row.pin_hash is not null,
    'identity_type',v_row.identity_type,
    'display_name',v_row.display_name
  );
end;
$$;

create or replace function public.activate_identity(p_identity_key text,p_pin text)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_row public.app_identities%rowtype;
begin
  if auth.uid() is null then raise exception 'Session requise'; end if;
  if p_pin !~ '^[0-9]{6}$' then raise exception 'Le code doit contenir exactement 6 chiffres'; end if;

  select * into v_row
  from public.app_identities
  where identity_key=p_identity_key and active=true
  for update;

  if not found then raise exception 'Profil introuvable'; end if;
  if v_row.identity_type <> 'coach' then raise exception 'Accès parent pas encore activé'; end if;
  if v_row.pin_hash is not null then raise exception 'Un code a déjà été créé pour ce profil'; end if;

  update public.app_identities
  set pin_hash=extensions.crypt(p_pin,extensions.gen_salt('bf')),
      auth_user_id=auth.uid(),
      updated_at=now()
  where id=v_row.id;

  insert into public.profiles(id,full_name,role)
  values(auth.uid(),v_row.display_name,'coach')
  on conflict(id) do update set full_name=excluded.full_name,role='coach';

  insert into public.team_members(team_id,user_id,role)
  values(v_row.team_id,auth.uid(),'coach')
  on conflict(team_id,user_id) do update set role='coach';

  return true;
end;
$$;

create or replace function public.login_identity(p_identity_key text,p_pin text)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_row public.app_identities%rowtype;
begin
  if auth.uid() is null then raise exception 'Session requise'; end if;
  if p_pin !~ '^[0-9]{6}$' then raise exception 'Code incorrect'; end if;

  select * into v_row
  from public.app_identities
  where identity_key=p_identity_key and active=true;

  if not found or v_row.identity_type <> 'coach' then
    raise exception 'Profil introuvable';
  end if;

  if v_row.pin_hash is null then
    raise exception 'Première connexion : créez d''abord votre code';
  end if;

  if v_row.pin_hash <> extensions.crypt(p_pin,v_row.pin_hash) then
    raise exception 'Code incorrect';
  end if;

  update public.app_identities
  set auth_user_id=auth.uid(),
      updated_at=now()
  where id=v_row.id;

  insert into public.profiles(id,full_name,role)
  values(auth.uid(),v_row.display_name,'coach')
  on conflict(id) do update set full_name=excluded.full_name,role='coach';

  insert into public.team_members(team_id,user_id,role)
  values(v_row.team_id,auth.uid(),'coach')
  on conflict(team_id,user_id) do update set role='coach';

  return true;
end;
$$;

grant execute on function public.identity_login_status(text) to authenticated;
grant execute on function public.activate_identity(text,text) to authenticated;
grant execute on function public.login_identity(text,text) to authenticated;


-- Matchs / compositions
alter table public.events add column if not exists match_kind text;
create table if not exists public.match_players (
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  position_order integer,
  selected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(event_id,player_id)
);
alter table public.match_players enable row level security;
drop policy if exists match_players_select on public.match_players;
drop policy if exists match_players_coach_all on public.match_players;
create policy match_players_select on public.match_players for select to authenticated using(public.is_team_member(public.event_team(event_id)));
create policy match_players_coach_all on public.match_players for all to authenticated using(public.is_team_coach(public.event_team(event_id))) with check(public.is_team_coach(public.event_team(event_id)) and public.player_team(player_id)=public.event_team(event_id));


-- V9 : programme et fichiers d'entraînement
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

