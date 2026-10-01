-- U10 HERSEAUX - Équipe + effectif repris du tableau de présences fourni
-- IMPORTANT : remplace les deux codes par défaut après la première connexion.
-- Code équipe parent par défaut : HERSEAUX-U10-2026
-- Code coach par défaut : COACH-HERSEAUX-2026

insert into public.teams(id,name,season,join_code_hash,coach_code_hash)
values(
  '8d92c6e8-33f3-4d8f-9dd1-010202620270',
  'U10 Herseaux',
  '2026-2027',
  crypt('HERSEAUX-U10-2026',gen_salt('bf')),
  crypt('COACH-HERSEAUX-2026',gen_salt('bf'))
)
on conflict(id) do update set name=excluded.name,season=excluded.season;

insert into public.players(team_id,first_name)
select v.team_id, v.first_name
from (values
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Fabio'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Soan'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Thélyo'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Maé'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Maloys'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Baptiste'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Ihsan'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Alessio'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Valentin'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Lionel'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Ilyan'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Naëlyo'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Théophile'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Nabil'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Amadeo'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Vianney'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Antonin'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Giulian'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Tony'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Basile'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Yacine'),
  ('8d92c6e8-33f3-4d8f-9dd1-010202620270'::uuid,'Elom')
) as v(team_id,first_name)
where not exists (
  select 1 from public.players p where p.team_id=v.team_id and lower(p.first_name)=lower(v.first_name) and p.active=true
);
