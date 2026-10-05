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


## v13 — Sondages
Exécuter une fois `supabase/UPGRADE_SONDAGES_V13.sql`.

### Côté coach
- nouveau menu **Sondages** ;
- création d'un titre, d'une question et de 2 choix minimum ;
- choix unique ou plusieurs choix ;
- date/heure limite facultative ;
- sondages conservés en liste du plus récent au plus ancien ;
- possibilité de modifier ou clôturer ;
- résultats détaillés avec nombre de réponses, noms des joueurs et liste des joueurs sans réponse.

### Côté parent
- nouveau menu **Sondages** ;
- le parent ne répond que pour son enfant ;
- réponse modifiable tant que le sondage est ouvert ;
- sondage en cours mis en avant sur l'accueil parent ;
- les sondages clôturés restent consultables mais ne sont plus modifiables.


## v14 — Installation PWA simplifiée pour les parents
Aucun SQL supplémentaire.

Lorsqu'un parent ouvre le lien sur smartphone sans avoir installé l'application :
- **Android** : un écran très simple propose le vrai bouton `Installer l'application` quand Chrome le permet ;
- **iPhone** : l'application explique visuellement les 4 étapes Safari → Partager → Sur l'écran d'accueil → Ajouter ;
- une fois l'aide fermée ou l'application installée, elle ne réapparaît plus automatiquement ;
- le bouton `Installer l'application` reste disponible dans le menu pour revoir les instructions.

L'aide ne s'affiche pas quand l'application est déjà ouverte en mode PWA.


## v15 — Icône officielle de l'application
Aucun SQL supplémentaire.

- l'installation PWA utilise désormais le logo Herseaux comme icône ;
- icônes 192x192 et 512x512 pour Android ;
- variantes `maskable` pour un rendu correct sur les lanceurs Android ;
- icône 180x180 dédiée à l'écran d'accueil iPhone/iPad ;
- métadonnées iOS ajoutées pour que l'app s'affiche comme `U10 Herseaux`.


## v16 — Correctif icône iPhone
Aucun SQL supplémentaire.

Correctif spécifique iOS :
- `apple-touch-icon.png` placé à la racine du site ;
- ajout de `apple-touch-icon-precomposed.png` ;
- liens iOS avec version `?v=16` pour contourner le cache Safari ;
- icône iPhone opaque 180×180 avec le logo Herseaux.

IMPORTANT : sur un iPhone qui avait déjà ajouté l'app avec l'icône « U »,
supprimer l'ancienne icône de l'écran d'accueil, rouvrir le site dans Safari,
puis refaire **Partager > Sur l'écran d'accueil > Ajouter**.


## v17 — Correctif affichage PWA iPhone
Aucun SQL supplémentaire.

- prise en charge des zones sûres iPhone (`safe-area-inset-top/bottom/left/right`) ;
- le haut de l'application ne passe plus sous l'encoche / Dynamic Island ;
- correction du mode barre d'état iOS : `black` au lieu de `black-translucent` ;
- utilisation de `100dvh` / `-webkit-fill-available` pour éviter les sauts de hauteur en PWA ;
- adaptation également des menus, modales, écran d'installation et bas de page.

Sur un iPhone où l'ancienne PWA est déjà installée, il peut être nécessaire de la fermer complètement puis la rouvrir. Si le cache persiste, supprimer et réinstaller la PWA.


## v18 — Historique mensuel des présences coach
Exécuter une fois `supabase/UPGRADE_PRESENCES_HISTORIQUE_V18.sql`.

Dans **Présences > Historique mensuel** :
- navigation mois par mois ;
- une ligne par joueur ;
- une colonne compacte par entraînement / match / tournoi ;
- vert = présent, rouge = absent, orange = retard/excusé, gris = non enregistré ;
- compteurs Présent / Absent par joueur ;
- colonne **Remarque du mois** pour noter comportement, attitude, progression ou autre observation ;
- remarques enregistrées séparément par mois ;
- tableau horizontal spécialement adapté au smartphone avec le prénom du joueur figé à gauche et la remarque figée à droite.


## v19 — Remarques jour par jour dans les présences
Aucun nouveau SQL.

- les remarques utilisent le champ `attendance.notes` déjà présent ;
- dans **Présence coach**, bouton `📝 Remarques` pour encoder rapidement les notes du jour pour tous les joueurs ;
- dans **Historique mensuel**, la colonne de remarque mensuelle est supprimée pour garder le tableau compact ;
- un petit `•` bleu sur une case indique qu'une remarque existe ce jour-là ;
- toucher une case ouvre le détail du joueur pour cette date : statut + remarque du jour ;
- affichage pensé pour smartphone : historique compact, remarques accessibles à la demande sans agrandir le tableau.


## v20 — Sidebar smartphone améliorée
Aucun SQL supplémentaire.

- correction du menu latéral en mode paysage : la liste du menu peut maintenant défiler verticalement ;
- le bloc utilisateur / déconnexion reste accessible en bas ;
- swipe vers la gauche pour refermer la sidebar ;
- les gestes verticaux continuent à faire défiler le menu normalement ;
- le bouton hamburger `☰` reste toujours disponible pour rouvrir la sidebar en portrait comme en paysage.


## v21 — Correctif historique des présences
Aucun SQL supplémentaire.

Correction d'un bug introduit en v19/v20 : la table de correspondance des présences (`attendanceMap`) n'était plus créée avant l'affichage de l'historique mensuel, ce qui faisait planter silencieusement la page et la laissait vide.


## v22 — Matchs accessibles aux parents
Aucun nouveau SQL.

- ajout du menu **Matchs** côté parent ;
- les parents voient la liste des matchs U10 ;
- bouton **Composition** sur chaque match ;
- si la composition existe, l'image de composition s'affiche dans une fenêtre ;
- si la composition n'a pas encore été faite, le parent voit le message **Composition pas encore établie** ;
- possibilité de télécharger l'image affichée.


## v23 — Prochain match en premier
Aucun SQL supplémentaire.

Dans le menu **Matchs**, côté coach et côté parent :
- le match le plus proche à partir d'aujourd'hui est affiché tout en haut dans une section **Prochain match** ;
- les autres rencontres futures apparaissent ensuite dans **Matchs à venir** ;
- l'ordre est chronologique à partir du jour actuel ;
- le prochain match est visuellement mis en évidence.


## v24 — Matchs passés + préparation feuille de match
Aucun nouveau SQL.

### Matchs
- ajout d'une section **Matchs passés** sous les matchs à venir ;
- les matchs passés sont classés du plus récent au plus ancien ;
- les parents conservent l'accès à la composition des anciens matchs.

### Feuille de match
- ajout d'un bouton **Feuille de match** côté coach ;
- il s'agit d'une aide de préparation interne et non d'un remplacement de la feuille fédérale ;
- reprise automatique des informations du match et de la composition enregistrée ;
- rappel de la procédure officielle ;
- bouton pour copier rapidement la liste des joueurs.


## v25 — Entraînements : liste compacte + fiche complète
Aucun nouveau SQL.

Le menu **Entraînements** est maintenant beaucoup plus compact :
- une séance = une ligne avec sa date et son titre ;
- les fichiers appartenant à la même date + même titre sont regroupés en une seule séance ;
- toucher une séance ouvre sa fiche complète ;
- la fiche affiche l'explication complète sans la tronquer ;
- les images sont affichées directement dans la fiche ;
- les PDF / Word / Excel restent accessibles comme documents ;
- le programme annuel est replié dans `Voir le programme annuel` pour prendre moins de place ;
- le champ d'explication à l'ajout d'une séance est agrandi pour pouvoir coller une séance détaillée complète.


## v26 — Mises à jour ciblées Coach / Parent
Aucun SQL supplémentaire.

Deux compteurs indépendants sont désormais présents dans `release.json` :
- `roles.coach.version`
- `roles.parent.version`

Pour une modification uniquement visible par les coachs, augmenter uniquement la version `coach`.
Pour une modification uniquement visible par les parents, augmenter uniquement la version `parent`.
Pour une modification commune, augmenter les deux.

Seul le profil concerné voit alors le bandeau **Nouvelle version disponible** avec **Plus tard** et **Mettre à jour**.


## v27 — Adresse sur les images de composition
Aucun SQL supplémentaire.

Correction des visuels de composition :
- le **Lieu** et l'**Adresse** sont maintenant deux informations distinctes ;
- auparavant, si le lieu était rempli, l'adresse était ignorée (`location || address`) ;
- correction appliquée à l'image générée côté coach et à l'image affichée côté parent ;
- les textes trop longs sont automatiquement raccourcis proprement pour rester dans le visuel.

Cette modification concerne coachs et parents : les deux versions de `release.json` ont été incrémentées.


## v28 — Suppression des sondages
Aucun SQL supplémentaire.

Côté coach :
- ajout d'un bouton **Supprimer** sur chaque sondage ;
- confirmation obligatoire avant suppression ;
- le sondage, ses choix et toutes les réponses enregistrées sont supprimés ;
- action irréversible.

La modification est visible uniquement côté coach : seule `roles.coach.version` a été incrémentée dans `release.json`.


## v29 — Objets trouvés
**Nouveau SQL obligatoire :** `supabase/UPGRADE_OBJETS_TROUVES_V29.sql`

### Coach
- nouveau menu **Objets trouvés** ;
- ajout rapide d'une ou plusieurs photos depuis le téléphone ;
- possibilité de prendre directement une photo avec l'appareil photo ;
- description facultative et date ;
- affichage du prénom des joueurs dont les parents ont cliqué **C'est à moi** ;
- bouton **Objet rendu** ;
- historique repliable des objets rendus ;
- suppression possible.

### Parent
- galerie des objets encore disponibles ;
- bouton **🙋 C'est à moi** ;
- le joueur est identifié automatiquement grâce au compte parent ;
- possibilité d'annuler la réponse en cas d'erreur.

Les photos sont stockées dans un bucket Supabase privé `lost-found`.


## v30 — Nouveaux joueurs dans la connexion + modification du prénom
**Nouveau SQL obligatoire :** `supabase/UPGRADE_JOUEURS_DYNAMIQUES_V30.sql`

Corrections :
- la liste « Qui êtes-vous ? » n'est plus écrite en dur dans `index.html` ;
- elle est maintenant chargée depuis Supabase à chaque ouverture ;
- tous les joueurs déjà ajoutés manuellement (dont Mael) sont automatiquement rattrapés par le SQL ;
- tout futur joueur ajouté dans l'espace coach reçoit automatiquement son identité parent ;
- la clé de connexion d'un nouveau joueur est basée sur son UUID et reste stable même si son prénom est corrigé ;
- ajout d'un bouton **Modifier** dans l'effectif pour corriger prénom, nom et numéro ;
- une correction de prénom met automatiquement à jour le nom visible sur l'écran de connexion.

Les versions coach et parent sont incrémentées.


## v31 — Correction ajout de match
Pas de SQL supplémentaire par rapport à la v30.

Correction de l'enregistrement des événements/matchs :
- normalisation explicite des heures au format PostgreSQL `HH:MM:SS` ;
- validation de la date avant enregistrement ;
- `created_by` n'est envoyé que si l'identifiant de session est un UUID valide ;
- message d'erreur Supabase plus complet en cas de problème restant.

Cette version contient aussi toutes les corrections de la v30 (joueurs dynamiques + modification du prénom).


## v32 — Correction définitive « invalid input syntax for type uuid: undefined »
Pas de SQL supplémentaire par rapport à la v30.

Cause identifiée :
- le bouton **+ Match** ouvrait le formulaire avec un objet prérempli (type=match, titre=Match, date du jour) ;
- le formulaire considérait cet objet comme un événement existant simplement parce qu'il était non nul ;
- il lançait donc un `UPDATE ... WHERE id = undefined`, ce qui provoquait exactement l'erreur PostgreSQL `invalid input syntax for type uuid: "undefined"`.

Correction :
- un événement n'est considéré comme existant que si son `id` est un UUID valide ;
- les formulaires préremplis comme **+ Match** utilisent maintenant bien un `INSERT` ;
- le bouton Supprimer n'apparaît que pour un vrai événement existant.

La v32 contient aussi toutes les modifications des v30 et v31.


## v33 — Présences dynamiques avec plusieurs matchs
Aucun SQL supplémentaire.

Avant, la vue coach **Prévisions parents** était limitée à :
- l'entraînement du mardi ;
- l'entraînement du jeudi ;
- un seul match le samedi.

Elle est maintenant entièrement dynamique :
- tous les entraînements de la semaine sont repris ;
- tous les matchs de la semaine sont repris ;
- deux matchs le même week-end ou le même jour apparaissent séparément ;
- chaque match possède sa propre réponse Présent / Absent ;
- les remarques sont reliées au bon événement ;
- l'adversaire et l'heure sont affichés dans l'en-tête pour différencier facilement les matchs.

La vue parent était déjà basée sur tous les événements de la semaine ; la v33 harmonise maintenant également la vue de suivi des coachs.


## v34 — Tous les événements dans les prévisions parents
Aucun SQL supplémentaire.

Correction :
- la vue coach **Prévisions parents** ne se limite plus aux entraînements, matchs et tournois ;
- les événements de type **Événement du club** apparaissent aussi automatiquement ;
- cela couvre par exemple une séance **Photos d'équipe**, une réunion, une activité spéciale, etc. ;
- la vue coach correspond désormais à ce que les parents peuvent réellement remplir dans leur espace.


## v35 — Filtres de présences + objets trouvés parents + tableau de bord
**Nouveau SQL obligatoire :** `supabase/UPGRADE_PRESENCES_OBJETS_V35.sql`

### Prévisions parents côté coach
Ajout de trois filtres :
- **Jour**
- **Semaine**
- **Mois**

Les parents ne voient aucun changement dans leur écran de présence.

### Objets trouvés
- les parents peuvent désormais cliquer sur **J'ai trouvé un objet** ;
- ils peuvent prendre/envoyer une photo comme les coachs ;
- l'objet est visible par tous dans la rubrique ;
- les droits Supabase restent limités à leur équipe.

### Tableau de bord
- tout objet encore **non réclamé** apparaît en évidence sur le tableau de bord coach et parent ;
- les photos restent affichées tant qu'aucun parent n'a cliqué **C'est à moi** ;
- dès qu'un objet est réclamé, il disparaît automatiquement de cette zone prioritaire ;
- il reste évidemment consultable dans la rubrique Objets trouvés jusqu'à ce qu'un coach le marque comme rendu.

La colonne `claimed_at` évite d'exposer aux autres parents l'identité de l'enfant qui a réclamé l'objet.
