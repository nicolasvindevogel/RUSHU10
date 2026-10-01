-- U10 HERSEAUX - Schéma Supabase
-- À exécuter dans Supabase > SQL Editor, avant seed.sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'parent' check (role in ('parent','coach')),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text,
  join_code_hash text not null,
  coach_code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'parent' check (role in ('parent','coach')),
  created_at timestamptz not null default now(),
  primary key(team_id,user_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  first_name text not null,
  last_name text,
  number integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.player_guardians (
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  relation text default 'parent',
  created_at timestamptz not null default now(),
  primary key(player_id,user_id)
);

create table if not exists public.player_pin_hashes (
  player_id uuid primary key references public.players(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('training','match','tournament','other')),
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  meeting_time time,
  location text,
  address text,
  opponent text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('present','absent','maybe')),
  comment text,
  set_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(event_id,player_id)
);

create table if not exists public.attendance (
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('present','absent','excused','late')),
  notes text,
  marked_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(event_id,player_id)
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  eval_date date not null,
  technique text check (technique in ('A','B','C')),
  game_intelligence text check (game_intelligence in ('A','B','C')),
  athletic text check (athletic in ('A','B','C')),
  attitude text check (attitude in ('A','B','C')),
  score_total integer check (score_total between 0 and 12),
  overall_level text check (overall_level in ('A','B','C')),
  remarks text,
  evaluated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(player_id,eval_date)
);

-- Profil automatique à la création d'un compte
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,role)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'parent')
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Helpers RLS
create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members tm where tm.team_id=p_team and tm.user_id=auth.uid());
$$;
create or replace function public.is_team_coach(p_team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members tm where tm.team_id=p_team and tm.user_id=auth.uid() and tm.role='coach');
$$;
create or replace function public.is_guardian(p_player uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.player_guardians pg where pg.player_id=p_player and pg.user_id=auth.uid());
$$;
create or replace function public.player_team(p_player uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select team_id from public.players where id=p_player;
$$;
create or replace function public.event_team(p_event uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select team_id from public.events where id=p_event;
$$;

-- RPC: rejoindre l'équipe par code
create or replace function public.join_team(p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into v_team from public.teams where join_code_hash = crypt(p_code, join_code_hash) limit 1;
  if v_team is null then raise exception 'Code équipe incorrect'; end if;
  insert into public.team_members(team_id,user_id,role) values(v_team,auth.uid(),'parent') on conflict(team_id,user_id) do nothing;
  return v_team;
end; $$;

-- RPC: activation du premier/des comptes coach
create or replace function public.claim_coach(p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into v_team from public.teams where coach_code_hash = crypt(p_code, coach_code_hash) limit 1;
  if v_team is null then raise exception 'Code coach incorrect'; end if;
  insert into public.team_members(team_id,user_id,role) values(v_team,auth.uid(),'coach')
  on conflict(team_id,user_id) do update set role='coach';
  update public.profiles set role='coach' where id=auth.uid();
  return v_team;
end; $$;

-- RPC coach: générer un nouveau code à 6 chiffres pour un joueur
create or replace function public.generate_player_pin(p_player_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare v_team uuid; v_pin text;
begin
  select team_id into v_team from public.players where id=p_player_id;
  if not public.is_team_coach(v_team) then raise exception 'Accès coach requis'; end if;
  v_pin := lpad((floor(random()*1000000))::int::text,6,'0');
  insert into public.player_pin_hashes(player_id,pin_hash,updated_at)
  values(p_player_id,crypt(v_pin,gen_salt('bf')),now())
  on conflict(player_id) do update set pin_hash=excluded.pin_hash,updated_at=now();
  return v_pin;
end; $$;

-- RPC parent: lier son compte à son enfant
create or replace function public.link_player_with_pin(p_player_id uuid,p_pin text)
returns void language plpgsql security definer set search_path=public as $$
declare v_team uuid; v_hash text;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select team_id into v_team from public.players where id=p_player_id and active=true;
  if v_team is null or not public.is_team_member(v_team) then raise exception 'Joueur inaccessible'; end if;
  select pin_hash into v_hash from public.player_pin_hashes where player_id=p_player_id;
  if v_hash is null or v_hash <> crypt(p_pin,v_hash) then raise exception 'Code joueur incorrect'; end if;
  insert into public.player_guardians(player_id,user_id) values(p_player_id,auth.uid()) on conflict do nothing;
end; $$;

grant execute on function public.join_team(text) to authenticated;
grant execute on function public.claim_coach(text) to authenticated;
grant execute on function public.generate_player_pin(uuid) to authenticated;
grant execute on function public.link_player_with_pin(uuid,text) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.players enable row level security;
alter table public.player_guardians enable row level security;
alter table public.player_pin_hashes enable row level security;
alter table public.events enable row level security;
alter table public.availability enable row level security;
alter table public.attendance enable row level security;
alter table public.evaluations enable row level security;

-- Nettoyage des anciennes policies portant les mêmes noms
drop policy if exists profiles_select on public.profiles; drop policy if exists profiles_update_self on public.profiles;
drop policy if exists teams_select on public.teams; drop policy if exists members_select on public.team_members;
drop policy if exists players_select on public.players; drop policy if exists players_coach_all on public.players;
drop policy if exists guardians_select on public.player_guardians; drop policy if exists guardians_delete on public.player_guardians;
drop policy if exists events_select on public.events; drop policy if exists events_coach_all on public.events;
drop policy if exists availability_select on public.availability; drop policy if exists availability_insert on public.availability; drop policy if exists availability_update on public.availability; drop policy if exists availability_delete on public.availability;
drop policy if exists attendance_select on public.attendance; drop policy if exists attendance_coach_all on public.attendance;
drop policy if exists evaluations_coach_all on public.evaluations;

create policy profiles_select on public.profiles for select to authenticated using (
  id=auth.uid() or exists(select 1 from public.team_members tm where tm.user_id=profiles.id and public.is_team_coach(tm.team_id))
);
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

create policy teams_select on public.teams for select to authenticated using(public.is_team_member(id));
create policy members_select on public.team_members for select to authenticated using(public.is_team_member(team_id));

create policy players_select on public.players for select to authenticated using(public.is_team_member(team_id));
create policy players_coach_all on public.players for all to authenticated using(public.is_team_coach(team_id)) with check(public.is_team_coach(team_id));

create policy guardians_select on public.player_guardians for select to authenticated using(user_id=auth.uid() or public.is_team_coach(public.player_team(player_id)));
create policy guardians_delete on public.player_guardians for delete to authenticated using(user_id=auth.uid() or public.is_team_coach(public.player_team(player_id)));

create policy events_select on public.events for select to authenticated using(public.is_team_member(team_id));
create policy events_coach_all on public.events for all to authenticated using(public.is_team_coach(team_id)) with check(public.is_team_coach(team_id));

create policy availability_select on public.availability for select to authenticated using(public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id)));
create policy availability_insert on public.availability for insert to authenticated with check((public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id))) and public.player_team(player_id)=public.event_team(event_id));
create policy availability_update on public.availability for update to authenticated using(public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id))) with check((public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id))) and public.player_team(player_id)=public.event_team(event_id));
create policy availability_delete on public.availability for delete to authenticated using(public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id)));

create policy attendance_select on public.attendance for select to authenticated using(public.is_guardian(player_id) or public.is_team_coach(public.event_team(event_id)));
create policy attendance_coach_all on public.attendance for all to authenticated using(public.is_team_coach(public.event_team(event_id))) with check(public.is_team_coach(public.event_team(event_id)) and public.player_team(player_id)=public.event_team(event_id));

create policy evaluations_coach_all on public.evaluations for all to authenticated using(public.is_team_coach(public.player_team(player_id))) with check(public.is_team_coach(public.player_team(player_id)));

-- player_pin_hashes : aucune lecture directe volontaire. Accès uniquement via RPC SECURITY DEFINER.
