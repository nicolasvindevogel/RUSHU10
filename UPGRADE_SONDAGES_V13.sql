-- ============================================================
-- U10 HERSEAUX - V13 SONDAGES
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- ============================================================

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  question text not null,
  allow_multiple boolean not null default false,
  closes_at timestamptz,
  status text not null default 'open' check(status in ('open','closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  answered_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(poll_id,option_id,player_id)
);

create index if not exists poll_options_poll_idx on public.poll_options(poll_id,position);
create index if not exists poll_responses_poll_idx on public.poll_responses(poll_id,player_id);

create or replace function public.poll_team(p_poll uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select team_id from public.polls where id=p_poll;
$$;

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_responses enable row level security;

drop policy if exists polls_select on public.polls;
drop policy if exists polls_coach_all on public.polls;
drop policy if exists poll_options_select on public.poll_options;
drop policy if exists poll_options_coach_all on public.poll_options;
drop policy if exists poll_responses_select on public.poll_responses;
drop policy if exists poll_responses_insert on public.poll_responses;
drop policy if exists poll_responses_delete on public.poll_responses;

create policy polls_select on public.polls
for select to authenticated
using(public.is_team_member(team_id));

create policy polls_coach_all on public.polls
for all to authenticated
using(public.is_team_coach(team_id))
with check(public.is_team_coach(team_id));

create policy poll_options_select on public.poll_options
for select to authenticated
using(public.is_team_member(public.poll_team(poll_id)));

create policy poll_options_coach_all on public.poll_options
for all to authenticated
using(public.is_team_coach(public.poll_team(poll_id)))
with check(public.is_team_coach(public.poll_team(poll_id)));

create policy poll_responses_select on public.poll_responses
for select to authenticated
using(
  public.is_team_coach(public.poll_team(poll_id))
  or public.is_guardian(player_id)
);

create policy poll_responses_insert on public.poll_responses
for insert to authenticated
with check(
  answered_by=auth.uid()
  and public.is_guardian(player_id)
  and public.player_team(player_id)=public.poll_team(poll_id)
  and exists(
    select 1 from public.polls p
    where p.id=poll_responses.poll_id
      and p.status='open'
      and (p.closes_at is null or p.closes_at>=now())
  )
);

create policy poll_responses_delete on public.poll_responses
for delete to authenticated
using(
  public.is_team_coach(public.poll_team(poll_id))
  or (
    public.is_guardian(player_id)
    and exists(
      select 1 from public.polls p
      where p.id=poll_responses.poll_id
        and p.status='open'
        and (p.closes_at is null or p.closes_at>=now())
    )
  )
);
