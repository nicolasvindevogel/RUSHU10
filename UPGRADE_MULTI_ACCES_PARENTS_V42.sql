-- ============================================================
-- U10 HERSEAUX - V42 PLUSIEURS ACCES PARENTS PAR JOUEUR
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Script conçu pour conserver tous les accès existants.
-- ============================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 1. Distinguer l'accès principal existant des accès supplémentaires
-- ------------------------------------------------------------
alter table public.app_identities
add column if not exists is_primary boolean not null default false;

-- Pour chaque joueur, l'identité existante la plus ancienne devient l'accès principal.
with ranked as (
  select
    ai.id,
    row_number() over(
      partition by ai.player_id
      order by ai.created_at asc, ai.id asc
    ) as rn
  from public.app_identities ai
  where ai.identity_type='player'
    and ai.player_id is not null
)
update public.app_identities ai
set is_primary=true
from ranked r
where r.id=ai.id
  and r.rn=1
  and ai.is_primary=false;

create unique index if not exists app_identities_one_primary_player_uidx
on public.app_identities(player_id)
where identity_type='player' and is_primary=true;

-- Le trigger de synchronisation ne touche plus aux accès supplémentaires.
create or replace function public.sync_player_login_identity()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_key text;
begin
  select identity_key into v_key
  from public.app_identities
  where player_id=new.id
    and identity_type='player'
    and is_primary=true
  limit 1;

  if v_key is null then
    v_key := 'player-' || new.id::text;

    insert into public.app_identities(
      team_id,identity_key,display_name,identity_type,player_id,active,is_primary
    )
    values(
      new.team_id,v_key,new.first_name,'player',new.id,new.active,true
    )
    on conflict(identity_key) do nothing;
  else
    update public.app_identities
    set team_id=new.team_id,
        display_name=new.first_name,
        player_id=new.id,
        active=new.active,
        updated_at=now()
    where identity_key=v_key;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. RPC coach : gérer les accès parents
-- ------------------------------------------------------------
create or replace function public.list_player_parent_accesses(p_player_id uuid)
returns table(
  identity_key text,
  display_name text,
  is_primary boolean,
  has_pin boolean,
  active boolean
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_team uuid;
begin
  select team_id into v_team from public.players where id=p_player_id;

  if v_team is null or not public.is_team_coach(v_team) then
    raise exception 'Accès coach requis';
  end if;

  return query
  select
    ai.identity_key,
    ai.display_name,
    ai.is_primary,
    (ai.pin_hash is not null) as has_pin,
    ai.active
  from public.app_identities ai
  where ai.player_id=p_player_id
    and ai.identity_type='player'
  order by ai.is_primary desc, ai.created_at asc;
end;
$$;

create or replace function public.coach_parent_access_overview(p_team_id uuid)
returns table(
  player_id uuid,
  access_count bigint
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.is_team_coach(p_team_id) then
    raise exception 'Accès coach requis';
  end if;

  return query
  select
    p.id,
    count(ai.id)
  from public.players p
  left join public.app_identities ai
    on ai.player_id=p.id
   and ai.identity_type='player'
   and ai.active=true
  where p.team_id=p_team_id
    and p.active=true
  group by p.id;
end;
$$;

create or replace function public.create_parent_access(
  p_player_id uuid,
  p_label text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_player public.players%rowtype;
  v_key text;
  v_display text;
begin
  select * into v_player
  from public.players
  where id=p_player_id and active=true;

  if not found then
    raise exception 'Joueur introuvable';
  end if;

  if not public.is_team_coach(v_player.team_id) then
    raise exception 'Accès coach requis';
  end if;

  p_label:=btrim(coalesce(p_label,''));
  if length(p_label)<2 or length(p_label)>40 then
    raise exception 'Le nom de l''accès doit contenir entre 2 et 40 caractères';
  end if;

  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'Le PIN doit contenir exactement 6 chiffres';
  end if;

  v_key:='player-parent-' || gen_random_uuid()::text;
  v_display:=v_player.first_name || ' – ' || p_label;

  insert into public.app_identities(
    team_id,
    identity_key,
    display_name,
    identity_type,
    player_id,
    pin_hash,
    active,
    is_primary,
    created_at,
    updated_at
  )
  values(
    v_player.team_id,
    v_key,
    v_display,
    'player',
    v_player.id,
    extensions.crypt(p_pin,extensions.gen_salt('bf')),
    true,
    false,
    now(),
    now()
  );

  return jsonb_build_object(
    'identity_key',v_key,
    'display_name',v_display
  );
end;
$$;

create or replace function public.reset_parent_access_pin(
  p_identity_key text,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_identity public.app_identities%rowtype;
begin
  select * into v_identity
  from public.app_identities
  where identity_key=p_identity_key
    and identity_type='player'
    and active=true;

  if not found then
    raise exception 'Accès parent introuvable';
  end if;

  if not public.is_team_coach(v_identity.team_id) then
    raise exception 'Accès coach requis';
  end if;

  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'Le PIN doit contenir exactement 6 chiffres';
  end if;

  update public.app_identities
  set pin_hash=extensions.crypt(p_pin,extensions.gen_salt('bf')),
      updated_at=now()
  where identity_key=p_identity_key;

  return true;
end;
$$;

grant execute on function public.list_player_parent_accesses(uuid) to authenticated;
grant execute on function public.coach_parent_access_overview(uuid) to authenticated;
grant execute on function public.create_parent_access(uuid,text,text) to authenticated;
grant execute on function public.reset_parent_access_pin(text,text) to authenticated;

-- ------------------------------------------------------------
-- 3. Identifier l'accès parent actuellement connecté
-- ------------------------------------------------------------
create or replace function public.current_parent_identity_key(p_team_id uuid)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_key text;
begin
  select ai.identity_key into v_key
  from public.app_identity_sessions s
  join public.app_identities ai on ai.identity_key=s.identity_key
  where s.auth_user_id=auth.uid()
    and ai.team_id=p_team_id
    and ai.identity_type='player'
    and ai.active=true
  order by s.last_login_at desc
  limit 1;

  return v_key;
end;
$$;

-- ------------------------------------------------------------
-- 4. Messagerie séparée par accès parent
-- ------------------------------------------------------------
alter table public.conversations
add column if not exists parent_identity_key text
references public.app_identities(identity_key) on delete cascade;

-- Les conversations déjà existantes restent attachées à l'accès principal historique.
update public.conversations c
set parent_identity_key=ai.identity_key
from public.app_identities ai
where c.parent_identity_key is null
  and ai.player_id=c.player_id
  and ai.identity_type='player'
  and ai.is_primary=true;

-- Ancienne contrainte : une seule conversation par joueur.
alter table public.conversations
drop constraint if exists conversations_player_id_key;

create unique index if not exists conversations_player_parent_identity_uidx
on public.conversations(player_id,parent_identity_key);

-- RLS : un parent ne voit que la conversation de SON accès.
drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_insert_parent on public.conversations;
drop policy if exists conversations_coach_all on public.conversations;
drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;

create policy conversations_select on public.conversations
for select to authenticated
using(
  public.is_team_coach(team_id)
  or parent_identity_key=public.current_parent_identity_key(team_id)
);

create policy conversations_insert_parent on public.conversations
for insert to authenticated
with check(
  parent_identity_key=public.current_parent_identity_key(team_id)
  and exists(
    select 1
    from public.app_identities ai
    where ai.identity_key=parent_identity_key
      and ai.player_id=conversations.player_id
      and ai.team_id=conversations.team_id
      and ai.active=true
  )
);

create policy conversations_coach_all on public.conversations
for all to authenticated
using(public.is_team_coach(team_id))
with check(public.is_team_coach(team_id));

create policy messages_select on public.messages
for select to authenticated
using(
  exists(
    select 1
    from public.conversations c
    where c.id=messages.conversation_id
      and (
        public.is_team_coach(c.team_id)
        or c.parent_identity_key=public.current_parent_identity_key(c.team_id)
      )
  )
);

create policy messages_insert on public.messages
for insert to authenticated
with check(
  sender_user_id=auth.uid()
  and exists(
    select 1
    from public.conversations c
    where c.id=messages.conversation_id
      and (
        (sender_role='coach' and public.is_team_coach(c.team_id))
        or
        (
          sender_role='parent'
          and c.parent_identity_key=public.current_parent_identity_key(c.team_id)
        )
      )
  )
);

-- Liste dédiée à l'écran messagerie coach.
create or replace function public.coach_conversation_list(p_team_id uuid)
returns table(
  id uuid,
  player_id uuid,
  player_first_name text,
  player_last_name text,
  parent_identity_key text,
  parent_display_name text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.is_team_coach(p_team_id) then
    raise exception 'Accès coach requis';
  end if;

  return query
  select
    c.id,
    c.player_id,
    p.first_name,
    p.last_name,
    c.parent_identity_key,
    coalesce(ai.display_name,p.first_name || ' – Parent'),
    c.updated_at
  from public.conversations c
  join public.players p on p.id=c.player_id
  left join public.app_identities ai on ai.identity_key=c.parent_identity_key
  where c.team_id=p_team_id
  order by c.updated_at desc;
end;
$$;

grant execute on function public.current_parent_identity_key(uuid) to authenticated;
grant execute on function public.coach_conversation_list(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. La liste de connexion continue à inclure TOUS les accès actifs
-- ------------------------------------------------------------
create or replace function public.list_login_identities()
returns table(
  identity_key text,
  display_name text,
  identity_type text
)
language sql
stable
security definer
set search_path=public
as $$
  select ai.identity_key,ai.display_name,ai.identity_type
  from public.app_identities ai
  where ai.team_id='8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid
    and ai.active=true
  order by
    case when ai.identity_type='coach' then 0 else 1 end,
    lower(ai.display_name);
$$;

grant execute on function public.list_login_identities() to authenticated;
