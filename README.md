# U10 Herseaux — PWA Coach / Parents

Application PWA sans build, prévue pour **GitHub Pages + Supabase**.

## Fonctionnalités incluses
- Connexion / création de compte via Supabase Auth.
- Deux rôles : **Coach** et **Parent**.
- Sidebar responsive et installation PWA sur téléphone/tablette.
- Calendrier mensuel avec entraînements, matchs, tournois et autres événements.
- Fiche match : date, heure, heure de rendez-vous, lieu, adresse, adversaire, remarques.
- Côté parent : réponse **Présent / Absent / Incertain** pour son enfant + commentaire.
- Côté coach : vue de toutes les réponses parents et pointage réel **Présent / Absent / Excusé / Retard** pendant entraînements/matchs.
- Gestion de l'effectif.
- Liaison parent ↔ joueur via un **code joueur à 6 chiffres** généré par le coach.
- Évaluation de tous les joueurs sur une seule grille :
  - Technique (Contrôle, Passe, Dribble)
  - Intelligence de jeu (Tête levée, Choix)
  - Athlétique (Vitesse, Coordination)
  - Mental & Attitude (Écoute, Engagement)
  - Niveau attribué A / B / C
  - Remarque libre
  - Score automatique sur 12 : A=3, B=2, C=1.
- Effectif préchargé depuis le fichier de présences fourni : 22 joueurs.
- Logo fourni intégré à l'application et aux icônes PWA.

## 1. Créer le projet Supabase
1. Crée un nouveau projet sur Supabase.
2. Ouvre **SQL Editor**.
3. Exécute entièrement `supabase/schema.sql`.
4. Exécute ensuite `supabase/seed.sql`.
5. Dans **Authentication > Providers > Email**, active Email/Password.
6. Pour un démarrage plus simple, tu peux désactiver temporairement la confirmation d'e-mail. Sinon les utilisateurs devront valider leur adresse avant la première connexion.

## 2. Configurer l'application
Dans **Project Settings > API**, récupère :
- Project URL
- anon / public key

Ouvre `config.js` et remplace les deux valeurs d'exemple.

> La clé `anon` est prévue pour être publique côté navigateur. La sécurité est assurée par les politiques RLS définies dans `schema.sql`. Ne mets jamais la clé `service_role` dans l'application.

## 3. Mettre sur GitHub Pages
1. Crée un dépôt GitHub.
2. Envoie tout le contenu de ce dossier à la racine du dépôt.
3. Dans **Settings > Pages**, choisis `Deploy from a branch` puis `main / root`.
4. Attends la publication puis ouvre l'URL GitHub Pages.

## 4. Première connexion coach
1. Crée ton compte dans l'application.
2. Sur l'écran “Accès à l'équipe”, utilise le code coach par défaut :
   **COACH-HERSEAUX-2026**
3. Tu es ensuite reconnu comme coach.

## 5. Connexion des parents
1. Le parent crée son compte.
2. Il rejoint l'équipe avec le code équipe :
   **HERSEAUX-U10-2026**
3. Dans ton menu **Joueurs**, génère un code à 6 chiffres pour l'enfant.
4. Le parent ouvre **Mon compte > Lier mon enfant**, choisit le prénom et encode le code.

Un parent peut être lié à plusieurs enfants et plusieurs parents peuvent être liés au même joueur.

## 6. Important : changer les codes par défaut
Après la mise en route, remplace les codes dans Supabase. Exécute par exemple :

```sql
update public.teams
set join_code_hash = crypt('NOUVEAU-CODE-PARENTS', gen_salt('bf')),
    coach_code_hash = crypt('NOUVEAU-CODE-COACH', gen_salt('bf'))
where id = '8d92c6e8-33f3-4d8f-9dd1-010202620270';
```

## 7. Données du fichier Excel
Le fichier Excel de présence a servi à précharger les prénoms suivants : Fabio, Soan, Thélyo, Maé, Maloys, Baptiste, Ihsan, Alessio, Valentin, Lionel, Ilyan, Naëlyo, Théophile, Nabil, Amadeo, Vianney, Antonin, Giulian, Tony, Basile, Yacine et Elom.

Les anciennes présences historiques n'ont pas été injectées automatiquement, car le tableau contient des mentions hétérogènes (blessure, comportement, choix, tournoi, etc.) qui ne correspondent pas toutes à une présence réelle. L'application repart donc proprement avec l'effectif, tout en gardant une structure capable d'encoder les absences et commentaires à partir de maintenant.

## Structure
- `index.html` : interface principale
- `styles.css` : design responsive
- `app.js` : logique application / Supabase
- `config.js` : URL et clé publique Supabase
- `manifest.webmanifest` : PWA
- `sw.js` : service worker / cache de l'interface
- `assets/` : logo et icônes
- `supabase/schema.sql` : tables, RPC, RLS
- `supabase/seed.sql` : équipe + joueurs

## Remarque PWA
L'installation PWA nécessite HTTPS. GitHub Pages fournit HTTPS automatiquement. Le cache hors ligne couvre l'interface, mais les mises à jour de présences nécessitent évidemment une connexion pour être enregistrées dans Supabase.
