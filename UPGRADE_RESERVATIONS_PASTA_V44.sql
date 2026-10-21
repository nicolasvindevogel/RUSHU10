-- ============================================================
-- U10 HERSEAUX - V44 RESERVATIONS REPAS PASTA 2026
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Prérequis : v42/v43 installés.
-- ============================================================

create table if not exists public.pasta_reservations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  pasta_adult integer not null default 0 check(pasta_adult between 0 and 20),
  pasta_child integer not null default 0 check(pasta_child between 0 and 20),
  english_adult integer not null default 0 check(english_adult between 0 and 20),
  english_child integer not null default 0 check(english_child between 0 and 20),
  player_meal integer not null default 1 check(player_meal between 0 and 1),
  parent_paid_at timestamptz,
  payment_verified_at timestamptz,
  payment_verified_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id,player_id)
);

alter table public.pasta_reservations enable row level security;

-- Lecture directe réservée aux coachs. Les parents utilisent les RPC ci-dessous.
drop policy if exists pasta_reservations_coach_select on public.pasta_reservations;
create policy pasta_reservations_coach_select
on public.pasta_reservations for select to authenticated
using(public.is_team_coach(team_id));

-- Identifie le joueur lié à l'accès parent actuellement actif.
create or replace function public.current_parent_player_id(p_team_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_key text;
  v_player uuid;
begin
  v_key:=public.current_parent_identity_key(p_team_id);
  if v_key is null then return null; end if;

  select ai.player_id into v_player
  from public.app_identities ai
  where ai.identity_key=v_key
    and ai.team_id=p_team_id
    and ai.identity_type='player'
    and ai.active=true;

  return v_player;
end;
$$;

create or replace function public.parent_get_pasta_reservation(p_team_id uuid)
returns table(
  id uuid,
  player_id uuid,
  pasta_adult integer,
  pasta_child integer,
  english_adult integer,
  english_child integer,
  player_meal integer,
  parent_paid_at timestamptz,
  payment_verified_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_player uuid;
begin
  v_player:=public.current_parent_player_id(p_team_id);
  if v_player is null then raise exception 'Accès parent requis'; end if;
  return query
    select r.id,r.player_id,r.pasta_adult,r.pasta_child,r.english_adult,r.english_child,r.player_meal,r.parent_paid_at,r.payment_verified_at,r.created_at,r.updated_at
    from public.pasta_reservations r
    where r.team_id=p_team_id and r.player_id=v_player;
end;
$$;

create or replace function public.parent_save_pasta_reservation(
  p_team_id uuid,
  p_pasta_adult integer,
  p_pasta_child integer,
  p_english_adult integer,
  p_english_child integer,
  p_player_meal integer
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_player uuid;
  v_existing public.pasta_reservations%rowtype;
begin
  -- Clôture parents : lundi 9 novembre 2026 à 23:59 (heure belge).
  if now() > '2026-11-09 23:59:59+01'::timestamptz then
    raise exception 'Les réservations parents sont clôturées. Contactez un coach.';
  end if;

  v_player:=public.current_parent_player_id(p_team_id);
  if v_player is null then raise exception 'Accès parent requis'; end if;

  if coalesce(p_pasta_adult,0) not between 0 and 20
     or coalesce(p_pasta_child,0) not between 0 and 20
     or coalesce(p_english_adult,0) not between 0 and 20
     or coalesce(p_english_child,0) not between 0 and 20
     or coalesce(p_player_meal,0) not between 0 and 1 then
    raise exception 'Quantités invalides';
  end if;

  select * into v_existing from public.pasta_reservations where team_id=p_team_id and player_id=v_player;

  insert into public.pasta_reservations(
    team_id,player_id,pasta_adult,pasta_child,english_adult,english_child,player_meal,
    parent_paid_at,payment_verified_at,payment_verified_by,updated_by,updated_at
  ) values(
    p_team_id,v_player,p_pasta_adult,p_pasta_child,p_english_adult,p_english_child,p_player_meal,
    null,null,null,auth.uid(),now()
  )
  on conflict(team_id,player_id) do update set
    pasta_adult=excluded.pasta_adult,
    pasta_child=excluded.pasta_child,
    english_adult=excluded.english_adult,
    english_child=excluded.english_child,
    player_meal=excluded.player_meal,
    -- Si les quantités changent, le montant doit être recontrôlé.
    parent_paid_at=case when
      pasta_reservations.pasta_adult is distinct from excluded.pasta_adult or
      pasta_reservations.pasta_child is distinct from excluded.pasta_child or
      pasta_reservations.english_adult is distinct from excluded.english_adult or
      pasta_reservations.english_child is distinct from excluded.english_child or
      pasta_reservations.player_meal is distinct from excluded.player_meal
      then null else pasta_reservations.parent_paid_at end,
    payment_verified_at=case when
      pasta_reservations.pasta_adult is distinct from excluded.pasta_adult or
      pasta_reservations.pasta_child is distinct from excluded.pasta_child or
      pasta_reservations.english_adult is distinct from excluded.english_adult or
      pasta_reservations.english_child is distinct from excluded.english_child or
      pasta_reservations.player_meal is distinct from excluded.player_meal
      then null else pasta_reservations.payment_verified_at end,
    payment_verified_by=case when
      pasta_reservations.pasta_adult is distinct from excluded.pasta_adult or
      pasta_reservations.pasta_child is distinct from excluded.pasta_child or
      pasta_reservations.english_adult is distinct from excluded.english_adult or
      pasta_reservations.english_child is distinct from excluded.english_child or
      pasta_reservations.player_meal is distinct from excluded.player_meal
      then null else pasta_reservations.payment_verified_by end,
    updated_by=auth.uid(),updated_at=now();

  return true;
end;
$$;

create or replace function public.parent_declare_pasta_paid(p_team_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_player uuid;
begin
  v_player:=public.current_parent_player_id(p_team_id);
  if v_player is null then raise exception 'Accès parent requis'; end if;

  update public.pasta_reservations
  set parent_paid_at=now(),updated_by=auth.uid(),updated_at=now()
  where team_id=p_team_id and player_id=v_player;

  if not found then raise exception 'Aucune réservation à payer'; end if;
  return true;
end;
$$;

create or replace function public.coach_pasta_overview(p_team_id uuid)
returns table(
  player_id uuid,
  first_name text,
  last_name text,
  reservation_id uuid,
  pasta_adult integer,
  pasta_child integer,
  english_adult integer,
  english_child integer,
  player_meal integer,
  total_meals integer,
  total_amount numeric,
  parent_paid_at timestamptz,
  payment_verified_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.is_team_coach(p_team_id) then raise exception 'Accès coach requis'; end if;
  return query
  select
    p.id,p.first_name,p.last_name,r.id,
    coalesce(r.pasta_adult,0),coalesce(r.pasta_child,0),coalesce(r.english_adult,0),coalesce(r.english_child,0),coalesce(r.player_meal,0),
    coalesce(r.pasta_adult,0)+coalesce(r.pasta_child,0)+coalesce(r.english_adult,0)+coalesce(r.english_child,0)+coalesce(r.player_meal,0),
    (coalesce(r.pasta_adult,0)+coalesce(r.english_adult,0))*15.00 + (coalesce(r.pasta_child,0)+coalesce(r.english_child,0))*13.00,
    r.parent_paid_at,r.payment_verified_at,r.updated_at
  from public.players p
  left join public.pasta_reservations r on r.player_id=p.id and r.team_id=p_team_id
  where p.team_id=p_team_id and p.active=true
  order by lower(p.first_name),lower(coalesce(p.last_name,''));
end;
$$;

create or replace function public.coach_save_pasta_reservation(
  p_player_id uuid,
  p_pasta_adult integer,
  p_pasta_child integer,
  p_english_adult integer,
  p_english_child integer,
  p_player_meal integer
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_team uuid;
begin
  select team_id into v_team from public.players where id=p_player_id and active=true;
  if v_team is null or not public.is_team_coach(v_team) then raise exception 'Accès coach requis'; end if;

  if coalesce(p_pasta_adult,0) not between 0 and 20
     or coalesce(p_pasta_child,0) not between 0 and 20
     or coalesce(p_english_adult,0) not between 0 and 20
     or coalesce(p_english_child,0) not between 0 and 20
     or coalesce(p_player_meal,0) not between 0 and 1 then
    raise exception 'Quantités invalides';
  end if;

  insert into public.pasta_reservations(team_id,player_id,pasta_adult,pasta_child,english_adult,english_child,player_meal,updated_by,updated_at)
  values(v_team,p_player_id,p_pasta_adult,p_pasta_child,p_english_adult,p_english_child,p_player_meal,auth.uid(),now())
  on conflict(team_id,player_id) do update set
    pasta_adult=excluded.pasta_adult,
    pasta_child=excluded.pasta_child,
    english_adult=excluded.english_adult,
    english_child=excluded.english_child,
    player_meal=excluded.player_meal,
    parent_paid_at=case when
      pasta_reservations.pasta_adult is distinct from excluded.pasta_adult or
      pasta_reservations.pasta_child is distinct from excluded.pasta_child or
      pasta_reservations.english_adult is distinct from excluded.english_adult or
      pasta_reservations.english_child is distinct from excluded.english_child or
      pasta_reservations.player_meal is distinct from excluded.player_meal
      then null else pasta_reservations.parent_paid_at end,
    payment_verified_at=case when
      pasta_reservations.pasta_adult is distinct from excluded.pasta_adult or
      pasta_reservations.pasta_child is distinct from excluded.pasta_child or
      pasta_reservations.english_adult is distinct from excluded.english_adult or
      pasta_reservations.english_child is distinct from excluded.english_child or
      pasta_reservations.player_meal is distinct from excluded.player_meal
      then null else pasta_reservations.payment_verified_at end,
    payment_verified_by=case when
      pasta_reservations.pasta_adult is distinct from excluded.pasta_adult or
      pasta_reservations.pasta_child is distinct from excluded.pasta_child or
      pasta_reservations.english_adult is distinct from excluded.english_adult or
      pasta_reservations.english_child is distinct from excluded.english_child or
      pasta_reservations.player_meal is distinct from excluded.player_meal
      then null else pasta_reservations.payment_verified_by end,
    updated_by=auth.uid(),updated_at=now();
  return true;
end;
$$;

create or replace function public.coach_set_pasta_payment_verified(p_player_id uuid,p_verified boolean)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_team uuid;
begin
  select team_id into v_team from public.players where id=p_player_id;
  if v_team is null or not public.is_team_coach(v_team) then raise exception 'Accès coach requis'; end if;

  if p_verified then
    update public.pasta_reservations set payment_verified_at=now(),payment_verified_by=auth.uid(),updated_at=now()
    where team_id=v_team and player_id=p_player_id and parent_paid_at is not null;
    if not found then raise exception 'Le parent doit d’abord annoncer le virement'; end if;
  else
    update public.pasta_reservations set payment_verified_at=null,payment_verified_by=null,updated_at=now()
    where team_id=v_team and player_id=p_player_id;
  end if;
  return true;
end;
$$;

grant execute on function public.current_parent_player_id(uuid) to authenticated;
grant execute on function public.parent_get_pasta_reservation(uuid) to authenticated;
grant execute on function public.parent_save_pasta_reservation(uuid,integer,integer,integer,integer,integer) to authenticated;
grant execute on function public.parent_declare_pasta_paid(uuid) to authenticated;
grant execute on function public.coach_pasta_overview(uuid) to authenticated;
grant execute on function public.coach_save_pasta_reservation(uuid,integer,integer,integer,integer,integer) to authenticated;
grant execute on function public.coach_set_pasta_payment_verified(uuid,boolean) to authenticated;
