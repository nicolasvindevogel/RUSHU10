-- ============================================================
-- U10 HERSEAUX - UPGRADE PRESENCES + MATCHS + CALENDRIER
-- À exécuter UNE FOIS dans Supabase > SQL Editor
-- après SETUP_COACH.sql.
-- ============================================================

alter table public.events
  add column if not exists match_kind text;

do $$
begin
  if not exists(
    select 1 from pg_constraint where conname='events_match_kind_check'
  ) then
    alter table public.events
      add constraint events_match_kind_check
      check (match_kind is null or match_kind in ('championship','friendly'));
  end if;
end $$;

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

create policy match_players_select on public.match_players
for select to authenticated
using(public.is_team_member(public.event_team(event_id)));

create policy match_players_coach_all on public.match_players
for all to authenticated
using(public.is_team_coach(public.event_team(event_id)))
with check(
  public.is_team_coach(public.event_team(event_id))
  and public.player_team(player_id)=public.event_team(event_id)
);

-- Calendrier de base saison 2026-2027 :
-- entraînement chaque mardi et jeudi ; match chaque samedi.
-- On ne crée rien si un événement du même type existe déjà à cette date.
with dates as (
  select d::date as day
  from generate_series('2026-08-01'::date,'2027-06-30'::date,'1 day'::interval) d
)
insert into public.events(team_id,type,title,event_date,start_time,match_kind)
select
  '8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,
  case when extract(isodow from day)=6 then 'match' else 'training' end,
  case when extract(isodow from day)=6 then 'Match' else 'Entraînement' end,
  day,
  null,
  case when extract(isodow from day)=6 then 'championship' else null end
from dates
where extract(isodow from day) in (2,4,6)
and not exists(
  select 1 from public.events e
  where e.team_id='8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid
    and e.event_date=dates.day
    and e.type=case when extract(isodow from dates.day)=6 then 'match' else 'training' end
);
