-- ============================================================
-- U10 HERSEAUX - V38 LISTE HEBDOMADAIRE DES PRESENCES PARENTS
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Script idempotent.
-- ============================================================

-- Les parents peuvent voir, pour les événements d'une semaine,
-- uniquement qui est Présent / Absent.
-- Les commentaires des autres familles ne sont jamais renvoyés.
create or replace function public.parent_week_availability(
  p_start date,
  p_end date
)
returns table(
  event_id uuid,
  player_id uuid,
  status text
)
language sql
stable
security definer
set search_path=public
as $$
  select a.event_id, a.player_id, a.status
  from public.availability a
  join public.events e on e.id=a.event_id
  join public.players p on p.id=a.player_id
  where e.team_id=p.team_id
    and public.is_team_member(e.team_id)
    and e.event_date between p_start and p_end
    and p.active=true
    and a.status in ('present','absent');
$$;

grant execute on function public.parent_week_availability(date,date) to authenticated;
