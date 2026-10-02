-- ============================================================
-- U10 HERSEAUX - V29 OBJETS TROUVÉS
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Script idempotent.
-- ============================================================

create table if not exists public.lost_found_items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  photo_path text not null,
  description text,
  found_at date not null default current_date,
  status text not null default 'open' check(status in ('open','returned')),
  created_by uuid,
  created_at timestamptz not null default now(),
  returned_at timestamptz
);

create index if not exists lost_found_items_team_status_idx
on public.lost_found_items(team_id,status,created_at desc);

create table if not exists public.lost_found_claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.lost_found_items(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  claimed_by uuid,
  created_at timestamptz not null default now(),
  unique(item_id,player_id)
);

create index if not exists lost_found_claims_item_idx
on public.lost_found_claims(item_id);

create or replace function public.lost_found_item_team(p_item uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select team_id from public.lost_found_items where id=p_item;
$$;

alter table public.lost_found_items enable row level security;
alter table public.lost_found_claims enable row level security;

drop policy if exists lost_found_items_select on public.lost_found_items;
drop policy if exists lost_found_items_coach_all on public.lost_found_items;
drop policy if exists lost_found_claims_select on public.lost_found_claims;
drop policy if exists lost_found_claims_insert on public.lost_found_claims;
drop policy if exists lost_found_claims_delete on public.lost_found_claims;

create policy lost_found_items_select on public.lost_found_items
for select to authenticated
using(public.is_team_member(team_id));

create policy lost_found_items_coach_all on public.lost_found_items
for all to authenticated
using(public.is_team_coach(team_id))
with check(public.is_team_coach(team_id));

create policy lost_found_claims_select on public.lost_found_claims
for select to authenticated
using(
  public.is_team_coach(public.lost_found_item_team(item_id))
  or public.is_guardian(player_id)
);

create policy lost_found_claims_insert on public.lost_found_claims
for insert to authenticated
with check(
  public.is_guardian(player_id)
  and public.player_team(player_id)=public.lost_found_item_team(item_id)
  and exists(
    select 1 from public.lost_found_items i
    where i.id=lost_found_claims.item_id and i.status='open'
  )
);

create policy lost_found_claims_delete on public.lost_found_claims
for delete to authenticated
using(
  public.is_team_coach(public.lost_found_item_team(item_id))
  or public.is_guardian(player_id)
);

-- Bucket privé pour les photos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lost-found','lost-found',false,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set
  public=false,
  file_size_limit=15728640,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','image/heif'];

drop policy if exists lost_found_files_read on storage.objects;
drop policy if exists lost_found_files_insert on storage.objects;
drop policy if exists lost_found_files_update on storage.objects;
drop policy if exists lost_found_files_delete on storage.objects;

create policy lost_found_files_read on storage.objects
for select to authenticated
using(
  bucket_id='lost-found'
  and public.is_team_member((storage.foldername(name))[1]::uuid)
);

create policy lost_found_files_insert on storage.objects
for insert to authenticated
with check(
  bucket_id='lost-found'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
);

create policy lost_found_files_update on storage.objects
for update to authenticated
using(
  bucket_id='lost-found'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
)
with check(
  bucket_id='lost-found'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
);

create policy lost_found_files_delete on storage.objects
for delete to authenticated
using(
  bucket_id='lost-found'
  and public.is_team_coach((storage.foldername(name))[1]::uuid)
);
