-- ============================================================
-- U10 HERSEAUX - V35 OBJETS TROUVÉS PARENTS + ÉTAT RÉCLAMÉ
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Script idempotent.
-- ============================================================

-- Permet à l'application de savoir si un objet a déjà été réclamé
-- sans exposer l'identité du joueur aux autres parents.
alter table public.lost_found_items
add column if not exists claimed_at timestamptz;

-- Rattrape les objets déjà réclamés.
update public.lost_found_items i
set claimed_at=coalesce(i.claimed_at,(
  select min(c.created_at)
  from public.lost_found_claims c
  where c.item_id=i.id
))
where exists(
  select 1 from public.lost_found_claims c where c.item_id=i.id
);

create or replace function public.sync_lost_found_claimed_at()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item uuid;
begin
  v_item:=coalesce(new.item_id,old.item_id);

  if exists(select 1 from public.lost_found_claims c where c.item_id=v_item) then
    update public.lost_found_items
    set claimed_at=coalesce(claimed_at,now())
    where id=v_item;
  else
    update public.lost_found_items
    set claimed_at=null
    where id=v_item;
  end if;

  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_sync_lost_found_claimed_at on public.lost_found_claims;
create trigger trg_sync_lost_found_claimed_at
after insert or delete on public.lost_found_claims
for each row execute function public.sync_lost_found_claimed_at();

-- Les parents/membres de l'équipe peuvent signaler un objet trouvé.
drop policy if exists lost_found_items_member_insert on public.lost_found_items;
create policy lost_found_items_member_insert on public.lost_found_items
for insert to authenticated
with check(public.is_team_member(team_id));

-- Ils peuvent aussi envoyer la photo dans le bucket privé de leur équipe.
drop policy if exists lost_found_files_member_insert on storage.objects;
create policy lost_found_files_member_insert on storage.objects
for insert to authenticated
with check(
  bucket_id='lost-found'
  and public.is_team_member((storage.foldername(name))[1]::uuid)
);
