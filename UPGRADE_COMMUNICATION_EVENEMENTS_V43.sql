-- ============================================================
-- U10 HERSEAUX - V43 COMMUNICATION / EVENEMENTS
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Prérequis : v42 installé.
-- ============================================================

create table if not exists public.club_communications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text,
  info text,
  poster_path text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists club_communications_team_created_idx
on public.club_communications(team_id,created_at desc);

create table if not exists public.club_communication_seen (
  communication_id uuid not null references public.club_communications(id) on delete cascade,
  identity_key text not null references public.app_identities(identity_key) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key(communication_id,identity_key)
);

alter table public.club_communications enable row level security;
alter table public.club_communication_seen enable row level security;

drop policy if exists club_communications_member_select on public.club_communications;
drop policy if exists club_communications_coach_insert on public.club_communications;
drop policy if exists club_communications_coach_update on public.club_communications;
drop policy if exists club_communications_coach_delete on public.club_communications;

create policy club_communications_member_select
on public.club_communications
for select to authenticated
using(public.is_team_member(team_id));

create policy club_communications_coach_insert
on public.club_communications
for insert to authenticated
with check(public.is_team_coach(team_id));

create policy club_communications_coach_update
on public.club_communications
for update to authenticated
using(public.is_team_coach(team_id))
with check(public.is_team_coach(team_id));

create policy club_communications_coach_delete
on public.club_communications
for delete to authenticated
using(public.is_team_coach(team_id));

-- Les "vues" restent privées à chaque accès parent.
drop policy if exists club_communication_seen_select on public.club_communication_seen;
create policy club_communication_seen_select
on public.club_communication_seen
for select to authenticated
using(
  exists(
    select 1
    from public.club_communications c
    where c.id=club_communication_seen.communication_id
      and (
        public.is_team_coach(c.team_id)
        or club_communication_seen.identity_key=public.current_parent_identity_key(c.team_id)
      )
  )
);

-- Pas d'insert direct : l'accusé "J'ai vu" passe par la RPC sécurisée.

create or replace function public.parent_unseen_communications(p_team_id uuid)
returns table(
  id uuid,
  team_id uuid,
  title text,
  info text,
  poster_path text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_identity text;
begin
  if not public.is_team_member(p_team_id) then
    raise exception 'Accès équipe requis';
  end if;

  v_identity:=public.current_parent_identity_key(p_team_id);
  if v_identity is null then
    raise exception 'Accès parent requis';
  end if;

  return query
  select
    c.id,
    c.team_id,
    c.title,
    c.info,
    c.poster_path,
    c.created_at
  from public.club_communications c
  where c.team_id=p_team_id
    and not exists(
      select 1
      from public.club_communication_seen s
      where s.communication_id=c.id
        and s.identity_key=v_identity
    )
  order by c.created_at asc;
end;
$$;

create or replace function public.mark_communication_seen(p_communication_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_team uuid;
  v_identity text;
begin
  select team_id into v_team
  from public.club_communications
  where id=p_communication_id;

  if v_team is null or not public.is_team_member(v_team) then
    raise exception 'Communication introuvable';
  end if;

  v_identity:=public.current_parent_identity_key(v_team);
  if v_identity is null then
    raise exception 'Accès parent requis';
  end if;

  insert into public.club_communication_seen(
    communication_id,
    identity_key,
    seen_at
  )
  values(
    p_communication_id,
    v_identity,
    now()
  )
  on conflict(communication_id,identity_key)
  do update set seen_at=excluded.seen_at;

  return true;
end;
$$;

grant execute on function public.parent_unseen_communications(uuid) to authenticated;
grant execute on function public.mark_communication_seen(uuid) to authenticated;

-- ------------------------------------------------------------
-- Stockage privé des affiches
-- ------------------------------------------------------------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'club-communications',
  'club-communications',
  false,
  20971520,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict(id) do update
set public=false,
    file_size_limit=20971520,
    allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists club_communications_storage_select on storage.objects;
drop policy if exists club_communications_storage_insert on storage.objects;
drop policy if exists club_communications_storage_delete on storage.objects;

create policy club_communications_storage_select
on storage.objects
for select to authenticated
using(
  bucket_id='club-communications'
  and public.is_team_member((storage.foldername(name))[1]::uuid)
);

create policy club_communications_storage_insert
on storage.objects
for insert to authenticated
with check(
  bucket_id='club-communications'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
);

create policy club_communications_storage_delete
on storage.objects
for delete to authenticated
using(
  bucket_id='club-communications'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
);
