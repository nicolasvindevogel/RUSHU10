# U10 Herseaux — version Coach / PIN

Cette version utilise un écran de connexion unique.

## Connexion coach
Les trois coachs disponibles sont :
- VINDEVOGEL Nicolas
- THERY Thibaut
- DELANNOY Maxime

Lors de la première connexion, le coach choisit son nom et crée son propre code personnel à 6 chiffres.
Ensuite, Supabase conserve la session sur le smartphone afin que l'application s'ouvre normalement sans redemander le code à chaque fois.

Les joueurs apparaissent déjà dans la liste de connexion afin de préparer la future version Parent, mais leur accès est volontairement désactivé pour le moment.

## Installation Supabase
1. Exécuter `supabase/schema.sql` puis `supabase/seed.sql` pour une nouvelle installation.
2. Si le projet Supabase existe déjà, exécuter simplement `supabase/SETUP_COACH.sql`.
3. Dans Supabase, aller dans **Authentication > Providers / Sign In** et activer **Anonymous Sign-Ins**.
4. Publier ensuite les fichiers sur GitHub Pages.

## Important
Le fichier `config.js` contient déjà :
- URL : https://skqdcffueadikvekgqdj.supabase.co
- la publishable key fournie.

Le fichier `SETUP_COACH.sql` corrige également le problème `function crypt(text,text) does not exist` en utilisant explicitement l'extension `pgcrypto`.


## Mise à jour Présences + Matchs
Exécuter une fois `supabase/UPGRADE_PRESENCES_MATCHS.sql`.

Cette mise à jour ajoute :
- calendrier pré-rempli tous les mardis, jeudis et samedis jusqu'au 30/06/2027 ;
- double écran de présences (prévisions parents / présence réelle coach) ;
- type de match Championnat / Amical ;
- compositions de match ;
- génération d'un visuel PNG du match avec les joueurs convoqués.


## Mise à jour v6 — Dates et couleurs
- Dates affichées en français au format `01 octobre 2026` dans les listes de sélection et vues principales.
- Calendrier : couleur distincte pour entraînement, match, tournoi et événement du club.
- Le type `Autre` est affiché comme `Événement du club` dans l'interface.


## v7 — Correction session smartphone
- persistance de session Supabase explicitement activée ;
- vérification/création de la session avant chaque appel de connexion coach ;
- nouvelle tentative automatique si Supabase renvoie `Session requise` ;
- cache PWA incrémenté pour forcer la mise à jour sur smartphone.

Dans Supabase, **Anonymous Sign-Ins doit être activé** dans Authentication.
