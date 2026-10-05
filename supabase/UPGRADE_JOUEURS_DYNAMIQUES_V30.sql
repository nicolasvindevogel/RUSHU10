-- ============================================================
-- U10 HERSEAUX - V30 JOUEURS DYNAMIQUES + MODIFICATION PRENOM
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Script idempotent.
-- ============================================================

-- Crée une identité de connexion stable pour tout nouveau joueur.
-- La clé utilise l'UUID du joueur : une correction de prénom ne casse donc jamais son accès.
create or replace function public.sync_player_login_identity()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_key text;
begin
  -- Si une identité existe déjà pour ce joueur, on conserve sa clé actuelle
  -- (important pour les anciens joueurs player-fabio, player-soan, etc.).
  select identity_key into v_key
  from public.app_identities
  where player_id=new.id
  limit 1;

  if v_key is null then
    v_key := 'player-' || new.id::text;
    insert into public.app_identities(
      team_id,identity_key,display_name,identity_type,player_id,active
    )
    values(
      new.team_id,v_key,new.first_name,'player',new.id,new.active
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

drop trigger if exists trg_sync_player_login_identity on public.players;
create trigger trg_sync_player_login_identity
after insert or update of first_name,active,team_id
on public.players
for each row execute function public.sync_player_login_identity();

-- Rattrape tous les joueurs déjà ajoutés avant cette version (ex. Mael).
insert into public.app_identities(
  team_id,identity_key,display_name,identity_type,player_id,active
)
select
  p.team_id,
  'player-' || p.id::text,
  p.first_name,
  'player',
  p.id,
  p.active
from public.players p
where not exists(
  select 1 from public.app_identities ai where ai.player_id=p.id
)
on conflict(identity_key) do nothing;

-- Synchronise le prénom et le statut pour toutes les identités joueurs existantes.
update public.app_identities ai
set display_name=p.first_name,
    team_id=p.team_id,
    active=p.active,
    updated_at=now()
from public.players p
where ai.player_id=p.id
  and ai.identity_type='player';

-- Retourne uniquement les profils nécessaires à l'écran de connexion.
-- SECURITY DEFINER permet de charger la liste AVANT que le parent soit membre de l'équipe.
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
