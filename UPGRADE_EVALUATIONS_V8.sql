-- U10 HERSEAUX - UPGRADE ÉVALUATIONS V8
-- À exécuter UNE FOIS dans Supabase > SQL Editor.

alter table public.evaluations
  add column if not exists eval_type text not null default 'training';

do $$
begin
  if not exists(
    select 1 from pg_constraint where conname='evaluations_eval_type_check'
  ) then
    alter table public.evaluations
      add constraint evaluations_eval_type_check
      check (eval_type in ('small_game','technical','match','training','other'));
  end if;
end $$;
