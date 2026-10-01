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


## v10 — Interface parents + messagerie
Exécuter une fois `supabase/UPGRADE_PARENTS_MESSAGES_V10.sql`.

### Accès parent
- le parent choisit son enfant dans la liste ;
- première connexion : création de son PIN personnel à 6 chiffres ;
- ensuite le téléphone conserve normalement la session ;
- accès limité à son enfant.

### Parent
- Accueil : calendrier et événements du mois ;
- Présences : semaine en cours automatiquement, ou semaine suivante si l'application est ouverte un dimanche ;
- réponse Présent / Absent et remarque éventuelle ;
- Contact : conversation privée type messagerie avec le staff U10.

### Coach
- nouveau menu Messages ;
- toutes les conversations parents sont regroupées ;
- les trois coachs répondent dans la même conversation au nom du staff, sans que le parent doive choisir un coach.

### Notifications
Cette version peut afficher une notification lorsque l'application/PWA est ouverte ou reste active en arrière-plan et qu'un nouveau message arrive via Supabase Realtime.
Pour recevoir de vraies notifications push lorsque l'application est totalement fermée, il faudra ajouter ultérieurement un service Web Push (VAPID + fonction serveur/Edge Function). Cette partie n'est pas simulée dans la v10.

### Correction
`THERY Thibault` remplace `THERY Thibaut`.


## v11 — Messagerie coach compacte + iPhone
- liste des conversations coach plus compacte ;
- polices, avatars, bulles et boutons réduits ;
- sur smartphone, ouverture d'une conversation en plein écran avec bouton retour ;
- explication spécifique iPhone pour les notifications ;
- sur iPhone, l'application doit être ajoutée à l'écran d'accueil puis ouverte depuis son icône pour demander la permission Web Push (iOS 16.4+).


## v12 — Coachs parents + plusieurs téléphones
Exécuter une fois `supabase/UPGRADE_COACHS_PARENTS_V12.sql`.

### Coachs liés à leur enfant
- Nicolas → Giulian
- Thibault → Valentin
- Maxime → Soan

Un nouveau menu **Mon enfant** apparaît côté coach. Il permet de remplir les présences parentales de son enfant sans quitter le profil Coach.

### Accès Parent conservé
L'accès Parent normal de Giulian, Valentin et Soan reste disponible dans l'écran de connexion. Il peut donc être utilisé par le conjoint ou sur un autre téléphone.

### Multi-appareils
Une même identité Parent peut désormais être connectée sur plusieurs téléphones avec le même code à 6 chiffres. La connexion d'un deuxième téléphone ne déconnecte plus le premier.
