-- ============================================================
-- U10 HERSEAUX - V39 VALIDATION DES COMPOSITIONS PAR 3 COACHS
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Script idempotent.
-- ============================================================

create table if not exists public.match_lineup_approvals (
  event_id uuid not null references public.events(id) on delete cascade,
  coach_identity_key text not null references public.app_identities(identity_key) on delete cascade,
  approved_at timestamptz not null default now(),
  primary key(event_id,coach_identity_key)
);

alter table public.match_lineup_approvals enable row level security;

drop policy if exists match_lineup_approvals_coach_select on public.match_lineup_approvals;
create policy match_lineup_approvals_coach_select
on public.match_lineup_approvals
for select to authenticated
using(public.is_team_coach(public.event_team(event_id)));

-- Pas de policy INSERT/UPDATE/DELETE directe :
-- les validations passent exclusivement par la RPC sécurisée.

create or replace function public.current_coach_identity_key(p_team_id uuid)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_key text;
begin
  -- Priorité à la session d'identité la plus récente.
  select ai.identity_key into v_key
  from public.app_identity_sessions s
  join public.app_identities ai on ai.identity_key=s.identity_key
  where s.auth_user_id=auth.uid()
    and ai.team_id=p_team_id
    and ai.identity_type='coach'
    and ai.active=true
    and ai.identity_key in ('coach-nicolas','coach-thibaut','coach-maxime')
  order by s.last_login_at desc
  limit 1;

  if v_key is null then
    select ai.identity_key into v_key
    from public.app_identities ai
    where ai.auth_user_id=auth.uid()
      and ai.team_id=p_team_id
      and ai.identity_type='coach'
      and ai.active=true
      and ai.identity_key in ('coach-nicolas','coach-thibaut','coach-maxime')
    limit 1;
  end if;

  return v_key;
end;
$$;

create or replace function public.is_match_lineup_published(p_event_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_team uuid;
  v_count integer;
begin
  select e.team_id into v_team
  from public.events e
  where e.id=p_event_id and e.type='match';

  if v_team is null or not public.is_team_member(v_team) then
    return false;
  end if;

  select count(distinct a.coach_identity_key) into v_count
  from public.match_lineup_approvals a
  where a.event_id=p_event_id
    and a.coach_identity_key in ('coach-nicolas','coach-thibaut','coach-maxime');

  return v_count=3;
end;
$$;

create or replace function public.match_lineup_approval_status(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_team uuid;
  v_keys text[];
  v_count integer;
begin
  select e.team_id into v_team
  from public.events e
  where e.id=p_event_id and e.type='match';

  if v_team is null or not public.is_team_coach(v_team) then
    raise exception 'Accès coach requis';
  end if;

  select
    coalesce(array_agg(a.coach_identity_key order by a.approved_at),'{}'::text[]),
    count(distinct a.coach_identity_key)
  into v_keys,v_count
  from public.match_lineup_approvals a
  where a.event_id=p_event_id
    and a.coach_identity_key in ('coach-nicolas','coach-thibaut','coach-maxime');

  return jsonb_build_object(
    'approved_keys',to_jsonb(v_keys),
    'approved_count',v_count,
    'published',v_count=3
  );
end;
$$;

create or replace function public.set_match_lineup_approval(
  p_event_id uuid,
  p_approved boolean
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_team uuid;
  v_key text;
  v_players integer;
begin
  select e.team_id into v_team
  from public.events e
  where e.id=p_event_id and e.type='match';

  if v_team is null or not public.is_team_coach(v_team) then
    raise exception 'Accès coach requis';
  end if;

  v_key:=public.current_coach_identity_key(v_team);
  if v_key is null then
    raise exception 'Profil coach introuvable';
  end if;

  if p_approved then
    select count(*) into v_players
    from public.match_players mp
    where mp.event_id=p_event_id;

    if v_players=0 then
      raise exception 'La composition est vide';
    end if;

    insert into public.match_lineup_approvals(event_id,coach_identity_key,approved_at)
    values(p_event_id,v_key,now())
    on conflict(event_id,coach_identity_key)
    do update set approved_at=excluded.approved_at;
  else
    delete from public.match_lineup_approvals
    where event_id=p_event_id
      and coach_identity_key=v_key;
  end if;

  return true;
end;
$$;

create or replace function public.published_match_lineups()
returns table(event_id uuid)
language sql
stable
security definer
set search_path=public
as $$
  select e.id
  from public.events e
  where e.type='match'
    and public.is_team_member(e.team_id)
    and (
      select count(distinct a.coach_identity_key)
      from public.match_lineup_approvals a
      where a.event_id=e.id
        and a.coach_identity_key in ('coach-nicolas','coach-thibaut','coach-maxime')
    )=3;
$$;

grant execute on function public.is_match_lineup_published(uuid) to authenticated;
grant execute on function public.match_lineup_approval_status(uuid) to authenticated;
grant execute on function public.set_match_lineup_approval(uuid,boolean) to authenticated;
grant execute on function public.published_match_lineups() to authenticated;

-- Toute modification réelle d'une composition annule les validations.
create or replace function public.invalidate_match_lineup_approvals()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_event uuid;
begin
  v_event:=coalesce(new.event_id,old.event_id);
  delete from public.match_lineup_approvals where event_id=v_event;
  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_invalidate_match_lineup_approvals on public.match_players;
create trigger trg_invalidate_match_lineup_approvals
after insert or update or delete on public.match_players
for each row execute function public.invalidate_match_lineup_approvals();

-- Les parents ne peuvent plus lire une composition avant publication.
drop policy if exists match_players_select on public.match_players;
create policy match_players_select
on public.match_players
for select to authenticated
using(
  public.is_team_coach(public.event_team(event_id))
  or (
    public.is_team_member(public.event_team(event_id))
    and public.is_match_lineup_published(event_id)
  )
);
