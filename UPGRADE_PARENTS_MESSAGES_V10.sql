-- ============================================================
-- U10 HERSEAUX - V10 ACCÈS PARENTS + MESSAGERIE PRIVÉE
-- À exécuter UNE FOIS dans Supabase > SQL Editor
-- après les upgrades précédents.
-- ============================================================

-- Correction du prénom du coach.
update public.app_identities
set display_name='THERY Thibault', updated_at=now()
where identity_key='coach-thibaut';

-- Création/liaison des identités parents à partir de l'effectif existant.
insert into public.app_identities(team_id,identity_key,display_name,identity_type,player_id)
select
  p.team_id,
  'player-' || case lower(p.first_name)
    when 'fabio' then 'fabio'
    when 'soan' then 'soan'
    when 'thélyo' then 'thelyo'
    when 'maé' then 'mae'
    when 'maloys' then 'maloys'
    when 'baptiste' then 'baptiste'
    when 'ihsan' then 'ihsan'
    when 'alessio' then 'alessio'
    when 'valentin' then 'valentin'
    when 'lionel' then 'lionel'
    when 'ilyan' then 'ilyan'
    when 'naëlyo' then 'naelyo'
    when 'théophile' then 'theophile'
    when 'nabil' then 'nabil'
    when 'amadeo' then 'amadeo'
    when 'vianney' then 'vianney'
    when 'antonin' then 'antonin'
    when 'giulian' then 'giulian'
    when 'tony' then 'tony'
    when 'basile' then 'basile'
    when 'yacine' then 'yacine'
    when 'elom' then 'elom'
    else lower(regexp_replace(p.first_name,'[^a-zA-Z0-9]+','','g'))
  end,
  p.first_name,
  'player',
  p.id
from public.players p
where p.team_id='8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid
  and p.active=true
on conflict(identity_key) do update
set display_name=excluded.display_name,
    player_id=excluded.player_id,
    team_id=excluded.team_id,
    active=true,
    updated_at=now();

-- Statut de connexion : coach OU parent.
create or replace function public.identity_login_status(p_identity_key text)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_row public.app_identities%rowtype;
begin
  if auth.uid() is null then raise exception 'Session requise'; end if;

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

-- Première activation du PIN.
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

-- Connexion ultérieure. Le même PIN peut rattacher un nouveau téléphone.
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

  update public.app_identities
  set auth_user_id=auth.uid(),updated_at=now()
  where id=v_row.id;

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

grant execute on function public.identity_login_status(text) to authenticated;
grant execute on function public.activate_identity(text,text) to authenticated;
grant execute on function public.login_identity(text,text) to authenticated;

-- Messagerie : une conversation unique par joueur, visible par son/ses parents et les 3 coachs.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null unique references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check(sender_role in ('parent','coach')),
  sender_name text,
  body text not null check(length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
on public.messages(conversation_id,created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_insert_parent on public.conversations;
drop policy if exists conversations_coach_all on public.conversations;
drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;

create policy conversations_select on public.conversations
for select to authenticated
using(
  public.is_team_coach(team_id)
  or public.is_guardian(player_id)
);

create policy conversations_insert_parent on public.conversations
for insert to authenticated
with check(
  public.is_guardian(player_id)
  and public.player_team(player_id)=team_id
);

create policy conversations_coach_all on public.conversations
for all to authenticated
using(public.is_team_coach(team_id))
with check(public.is_team_coach(team_id));

create policy messages_select on public.messages
for select to authenticated
using(
  exists(
    select 1 from public.conversations c
    where c.id=messages.conversation_id
      and (public.is_team_coach(c.team_id) or public.is_guardian(c.player_id))
  )
);

create policy messages_insert on public.messages
for insert to authenticated
with check(
  sender_user_id=auth.uid()
  and exists(
    select 1 from public.conversations c
    where c.id=messages.conversation_id
      and (
        (sender_role='coach' and public.is_team_coach(c.team_id))
        or
        (sender_role='parent' and public.is_guardian(c.player_id))
      )
  )
);

-- Met à jour l'ordre des conversations lors d'un nouveau message.
create or replace function public.touch_conversation_on_message()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.conversations set updated_at=now() where id=new.conversation_id;
  return new;
end; $$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_on_message();

-- Active les événements temps réel pour les nouveaux messages (si pas déjà présent).
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then
    null;
  end;
end $$;
