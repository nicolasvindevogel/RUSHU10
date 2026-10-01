-- ============================================================
-- U10 HERSEAUX - V12 COACHS PARENTS + MULTI-APPAREILS
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- ============================================================

-- 1. Une identité peut désormais être utilisée sur plusieurs téléphones.
create table if not exists public.app_identity_sessions (
  identity_key text not null references public.app_identities(identity_key) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  primary key(identity_key,auth_user_id)
);

alter table public.app_identity_sessions enable row level security;

drop policy if exists identity_sessions_self_select on public.app_identity_sessions;
create policy identity_sessions_self_select
on public.app_identity_sessions
for select to authenticated
using(auth_user_id=auth.uid());

-- Récupère les anciennes sessions déjà existantes.
insert into public.app_identity_sessions(identity_key,auth_user_id)
select identity_key,auth_user_id
from public.app_identities
where auth_user_id is not null
on conflict(identity_key,auth_user_id) do nothing;

-- 2. Liaison coach -> enfant.
create table if not exists public.coach_children (
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_identity_key text not null references public.app_identities(identity_key) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(coach_identity_key,player_id)
);

alter table public.coach_children enable row level security;

drop policy if exists coach_children_select on public.coach_children;
create policy coach_children_select
on public.coach_children
for select to authenticated
using(public.is_team_coach(team_id));

-- Nicolas -> Giulian
insert into public.coach_children(team_id,coach_identity_key,player_id)
select p.team_id,'coach-nicolas',p.id
from public.players p
where p.team_id='8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid
  and lower(p.first_name)=lower('Giulian')
limit 1
on conflict(coach_identity_key,player_id) do nothing;

-- Thibault -> Valentin
insert into public.coach_children(team_id,coach_identity_key,player_id)
select p.team_id,'coach-thibaut',p.id
from public.players p
where p.team_id='8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid
  and lower(p.first_name)=lower('Valentin')
limit 1
on conflict(coach_identity_key,player_id) do nothing;

-- Maxime -> Soan
insert into public.coach_children(team_id,coach_identity_key,player_id)
select p.team_id,'coach-maxime',p.id
from public.players p
where p.team_id='8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid
  and lower(p.first_name)=lower('Soan')
limit 1
on conflict(coach_identity_key,player_id) do nothing;

-- 3. Activation : crée une session supplémentaire sans supprimer les autres téléphones.
create or replace function public.activate_identity(p_identity_key text,p_pin text)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_row public.app_identities%rowtype;
  v_role text;
begin
  if auth.uid() is null then raise exception 'Session requise'; end if;
  if p_pin !~ '^[0-9]{6}$' then raise exception 'Le code doit contenir exactement 6 chiffres'; end if;

  select * into v_row
  from public.app_identities
  where identity_key=p_identity_key and active=true
  for update;

  if not found then raise exception 'Profil introuvable'; end if;
  if v_row.pin_hash is not null then raise exception 'Un code a déjà été créé pour ce profil'; end if;

  v_role := case when v_row.identity_type='coach' then 'coach' else 'parent' end;

  update public.app_identities
  set pin_hash=extensions.crypt(p_pin,extensions.gen_salt('bf')),
      auth_user_id=auth.uid(),
      updated_at=now()
  where id=v_row.id;

  insert into public.app_identity_sessions(identity_key,auth_user_id,last_login_at)
  values(v_row.identity_key,auth.uid(),now())
  on conflict(identity_key,auth_user_id)
  do update set last_login_at=now();

  insert into public.profiles(id,full_name,role)
  values(auth.uid(),v_row.display_name,v_role)
  on conflict(id) do update set full_name=excluded.full_name,role=excluded.role;

  insert into public.team_members(team_id,user_id,role)
  values(v_row.team_id,auth.uid(),v_role)
  on conflict(team_id,user_id) do update set role=excluded.role;

  if v_row.identity_type='player' and v_row.player_id is not null then
    insert into public.player_guardians(player_id,user_id,relation)
    values(v_row.player_id,auth.uid(),'parent')
    on conflict(player_id,user_id) do nothing;
  end if;

  return true;
end;
$$;

-- 4. Connexion : le même PIN peut fonctionner sur plusieurs téléphones simultanément.
create or replace function public.login_identity(p_identity_key text,p_pin text)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_row public.app_identities%rowtype;
  v_role text;
begin
  if auth.uid() is null then raise exception 'Session requise'; end if;
  if p_pin !~ '^[0-9]{6}$' then raise exception 'Code incorrect'; end if;

  select * into v_row
  from public.app_identities
  where identity_key=p_identity_key and active=true;

  if not found then raise exception 'Profil introuvable'; end if;
  if v_row.pin_hash is null then raise exception 'Première connexion : créez d''abord votre code'; end if;
  if v_row.pin_hash <> extensions.crypt(p_pin,v_row.pin_hash) then raise exception 'Code incorrect'; end if;

  v_role := case when v_row.identity_type='coach' then 'coach' else 'parent' end;

  -- auth_user_id reste renseigné pour compatibilité, mais les sessions réelles sont
  -- conservées dans app_identity_sessions.
  update public.app_identities
  set auth_user_id=auth.uid(),updated_at=now()
  where id=v_row.id;

  insert into public.app_identity_sessions(identity_key,auth_user_id,last_login_at)
  values(v_row.identity_key,auth.uid(),now())
  on conflict(identity_key,auth_user_id)
  do update set last_login_at=now();

  insert into public.profiles(id,full_name,role)
  values(auth.uid(),v_row.display_name,v_role)
  on conflict(id) do update set full_name=excluded.full_name,role=excluded.role;

  insert into public.team_members(team_id,user_id,role)
  values(v_row.team_id,auth.uid(),v_role)
  on conflict(team_id,user_id) do update set role=excluded.role;

  if v_row.identity_type='player' and v_row.player_id is not null then
    insert into public.player_guardians(player_id,user_id,relation)
    values(v_row.player_id,auth.uid(),'parent')
    on conflict(player_id,user_id) do nothing;
  end if;

  return true;
end;
$$;

grant execute on function public.activate_identity(text,text) to authenticated;
grant execute on function public.login_identity(text,text) to authenticated;
