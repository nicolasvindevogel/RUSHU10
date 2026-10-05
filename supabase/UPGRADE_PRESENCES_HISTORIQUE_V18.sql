-- ============================================================
-- U10 HERSEAUX - V18 HISTORIQUE MENSUEL DES PRÉSENCES
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- ============================================================

create table if not exists public.attendance_month_notes (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  month_key text not null check(month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  note text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(team_id,player_id,month_key)
);

alter table public.attendance_month_notes enable row level security;

drop policy if exists attendance_month_notes_coach_select on public.attendance_month_notes;
drop policy if exists attendance_month_notes_coach_all on public.attendance_month_notes;

create policy attendance_month_notes_coach_select
on public.attendance_month_notes
for select to authenticated
using(public.is_team_coach(team_id));

create policy attendance_month_notes_coach_all
on public.attendance_month_notes
for all to authenticated
using(public.is_team_coach(team_id))
with check(public.is_team_coach(team_id));
