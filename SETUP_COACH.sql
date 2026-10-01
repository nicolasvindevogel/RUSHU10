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
