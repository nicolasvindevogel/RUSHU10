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


## v8 — Évaluations U10 + présence coach intelligente
Avant utilisation des nouvelles évaluations, exécuter une fois `supabase/UPGRADE_EVALUATIONS_V8.sql`.

### Évaluations
- 4 critères exacts : maîtrise technique, prise d'information, aisance athlétique, mental & attitude ;
- A=3, B=2, C=1 ;
- groupe calculé automatiquement : 10–12 A Confirmé, 7–9 B Intermédiaire, 4–6 C Apprentissage ;
- plusieurs séances par mois ;
- types d'observation : jeu réduit, atelier technique, match, entraînement général, autre ;
- synthèse mensuelle basée sur la moyenne des séances ;
- historique individuel et historique des séances ;
- avertissement tant qu'il y a moins de 2 séances dans le mois ;
- guide des critères intégré.

### Présence coach
À l'ouverture, l'application sélectionne automatiquement :
1. l'entraînement ou match du jour s'il existe ;
2. sinon l'événement entraînement/match le plus proche dans le calendrier.
Une sélection faite manuellement reste prioritaire pendant la navigation en cours.


## v9 — Calendrier mobile + espace Entraînements
Exécuter une fois `supabase/UPGRADE_ENTRAINEMENTS_V9.sql`.

### Calendrier
- vue **Agenda** pensée pour smartphone (par défaut sur petit écran) ;
- vue **Mois** conservée sur demande ;
- boutons Agenda / Mois ;
- légende couleurs ;
- événements regroupés par date, avec heure, lieu, adversaire et rendez-vous directement visibles.

### Entraînements
Nouveau menu **Entraînements** :
- thème pédagogique du mois ;
- programme annuel Septembre → Juin repris du tableau fourni ;
- prochain entraînement ;
- upload de plusieurs fichiers par séance ;
- fichiers PDF, images, Word, Excel, etc. ;
- stockage privé dans Supabase Storage ;
- ouverture via lien temporaire signé ;
- suppression des fichiers par les coachs.

Le bucket `training-files` est limité à 50 Mo par fichier dans le SQL.
