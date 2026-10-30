# Instructions de développement — The Horde / Dernière Ligne

## Projet vérifié

- Jeu navigateur HTML/CSS/JavaScript, Canvas et Web Audio, version courante 0.44.2, import initial 0.44.0.
- Entrée jouable hors ligne : `game/JOUER_DERNIERE_LIGNE.html`.
- Build : `node game/build.mjs`, dépendances Node intégrées uniquement.
- Le build part de `game/base/0.40.7.html`, applique ses remplacements contrôlés et injecte `src/spatial.js`, `src/combat_v441.js`, les modules `src/progression_v442.js`, `src/input_v442.js`, `src/feedback_v442.js`, `src/profile_ui_v442.js`, puis les couches `src/ui_v42.css`, `src/ui_v42.js`, `src/ui_v44.css` et `src/ui_v44.js`. Le rapport courant est `rapports/PATCHES_0_44_2.json`.
- `src/orders.*` et `src/ui_v43.*` sont des sources historiques ; les modifier seuls ne modifie pas la sortie du build actuel. Suivre le chemin d'exécution réel avant toute édition.
- Les bases `game/base/0.40.6.html` et `0.40.7.html` servent aussi aux comparaisons historiques. Préférer les sources actives et le build pour une correction. Une modification de base doit expliquer son effet sur ces comparaisons.
- Les anciennes mentions de version du HTML de base sont reprises par les couches actuelles. Vérifier la version effective dans le navigateur ; ne pas remplacer globalement les numéros historiques.

## Charger les guides adaptés

Lire `.agents/skills/router/SKILL.md` pour une nouvelle catégorie de tâche, puis les seuls guides utiles. Les chemins installés sont `.agents/skills/<nom>/SKILL.md`, même lorsque l'amont montre ses chemins de catalogue `skills/<catégorie>/`.

Le moteur de ce projet est maison. Consulter `.agents/skills/router/references/custom-engines.md` pour lier les concepts aux fonctions JavaScript réellement présentes. Conserver ce moteur et ses conventions ; les exemples Godot, Unity, Unreal ou autres sont des exemples d'API à adapter, pas des dépendances du jeu.

| Chantier | Guides |
| --- | --- |
| Vagues, apparition, rythme, économie | `tower-defense`, `game-ai`, éventuellement `level-design` |
| Décision et déplacement des ennemis | `game-ai` |
| Ralentissements et mémoire | `performance-optimization` |
| Tir, impact, recul, réaction visuelle | `game-feel`, éventuellement `audio-design` |
| Sprites, animation, décors, transparence | `create-game-assets` |
| HUD, menus, dialogues, clavier | `game-ui-ux`, `input-systems` |
| Mixage, alertes et ambiance | `audio-design` |
| Géométrie, axes d'arrivée et lisibilité | `level-design`, éventuellement `physics-tuning` |
| Sauvegarde, import et migration | `save-systems` |

`tower-defense` fournit ici des principes de vagues, de rythme et d'économie. Le jeu conserve son tir contrôlé par le joueur et ses vues existantes. Les autres guides cités par l'amont ne sont pas tous installés ; signaler un manque pertinent et vérifier les APIs du projet.

## Invariants du jeu

- Sauvegarde : `STORE = 'derniere-ligne-v12'`, `SAVE_VERSION = 12`. Préserver les migrations et les réserves indépendantes des différentes routes. Toute évolution du schéma exige une migration et un test avec un ancien profil.
- L'import JSON valide puis remplace le profil après confirmation ; il ne fusionne pas arbitrairement deux parties. Préserver les sauvegardes de secours et les erreurs de stockage visibles.
- Préserver les stocks, coûts et transactions des armes, accessoires, conversions, réparations et ordres. Le pistolet conserve sa réserve illimitée volontaire.
- Les changements de présentation et l'ouverture de menus ne doivent pas avancer le combat, modifier les ressources ou réinitialiser une partie.
- Reprendre après défaite restaure le véritable instantané de préparation de la route concernée. Ne pas fabriquer de nouveau kit et ne pas remplacer les préparations des autres routes.
- Le remappage doit pouvoir être annulé sans capture résiduelle. Après pause/focus/déconnexion, une gâchette tenue ne reprend pas le tir avant relâchement.
- Les ambiances de route utilisent le mixeur commun. Le bouton son doit refléter la valeur du moteur ; les préférences de mouvement doivent s'appliquer aux couches Canvas et CSS.
- Conserver les quatre vues `right`, `left`, `front`, `rear`. La vue avant affiche une arme FPS unique ; la vue arrière affiche le survivant distant sans arme FPS au premier plan.
- Aligner tracés, impacts, dégâts et projectiles sur les acteurs visibles. Tester les règles de dégâts séparément de la présentation.
- Les six circuits du mode Zone Noire et leurs fusibles sont indépendants de la barricade ; préserver les règles de visibilité des ennemis cachés.
- `window.__DL` est une instrumentation activée par `?test=1`. Les parcours de production doivent fonctionner sans cette API.

## Vérification et preuves

1. Définir le résultat observable et lire les sources actives avant de modifier.
2. Exécuter `python3 scripts/verify_repository.py --report artifacts/repository-verification.json` pour l'intégrité, les guides, la reconstruction reproductible et la syntaxe.
3. Pour un changement jouable, vérifier le parcours concerné dans un navigateur avec les vraies images. Décrire le navigateur, la taille de fenêtre, le mode `file://` ou HTTP et l'utilisation éventuelle de l'API de test.
4. Mesurer une optimisation avant/après dans la même scène et les mêmes conditions. Ne pas déduire la fluidité sur le matériel du joueur d'un test headless.
5. Vérifier les assets à l'échelle réelle : silhouette, dimensions, alpha, pivots, alignement et stabilité des frames ; utiliser le manifeste d'assets existant.
6. Conserver les rapports d'import et historiques. Écrire les nouvelles sorties sous `artifacts/`, ou dans un rapport de version explicitement identifié.

Les tests Python de `game/tests/` ont des générations différentes. `verifier_manifest.py` est en lecture seule. `syntaxe.py`, `ui_v44.py`, `regression_044.py` et `qa4_044.py` sont les points de départ de la version importée, mais plusieurs réécrivent `game/rapports/` : les lancer dans une copie temporaire lorsque les empreintes d'archive doivent rester identiques. Les tests navigateur Python actuels exigent Playwright et codent `/usr/bin/chromium` en dur ; la plupart remplacent les images par un GIF pour aller vite.

Ne pas utiliser `game/tests/run_checks.py` comme gate universel : cet agrégateur historique appelle notamment une régression dont le titre attendu est 0.42.0. Voir `docs/IMPORT_0_44_0.md` pour la différence entre les anciens rapports et les contrôles de l'import.

Après une modification intentionnelle du jeu, reconstruire, effectuer les contrôles pertinents, puis actualiser `game/MANIFEST_SHA256.json` avec les octets effectivement livrés. Ne pas régénérer les empreintes pour masquer un échec inexpliqué. Distinguer prévu, implémenté, intégré et vérifié en jeu dans le suivi.

Les suites courantes sont `scripts/test-combat-0441.cjs` (contrôle des ennemis, cadence et journaux), `scripts/test-startup-web.cjs` (production file/HTTP), `scripts/regression-0441.cjs` (huit routes, armes, circuits et import 0.44.0), `scripts/smoke_game.cjs` (trois fenêtres) et `scripts/benchmark-projection-0441.cjs --correctness-only` (géométrie et pixels). La dernière nécessite le commit `f7a3c3c` dans l'historique ; utiliser `fetch-depth: 0` en CI. Les chronométrages du benchmark complet sont des observations locales, pas des seuils de CI ni des FPS garantis.

La 0.44.2 ajoute `scripts/test-progression-0442.cjs` (fins contrôlées, économie, reprises et pilote de combat natif), `scripts/test-input-0442.cjs` (remappage, changements de périphérique, manette simulée et événements tactiles), `scripts/test-feedback-0442.cjs` (graphe et signaux WebAudio, commandes et rendu) et `scripts/test-storage-0442.cjs` (aperçus, quota, stockage bloqué, profils protégés et deux onglets réels). Distinguer les clôtures forcées du pilote de combat qui utilise les règles natives, et les périphériques émulés d'un contrôle matériel. Les erreurs de stockage sont injectées dans les méthodes du navigateur ; aucune fonction de sauvegarde du jeu n'est remplacée par le test.

## Provenance des guides

Les copies amont sont verrouillées par `.agents/gamedev-skills.lock.json` ; les conditions sont dans `.agents/third-party/awesome-gamedev-agent-skills/`. Mettre les adaptations du projet dans ce fichier et `docs/DEVELOPPEMENT_GAMEDEV.md`. Une mise à jour amont doit identifier sa nouvelle révision, conserver les dossiers complets et vérifier ses différences avant de modifier le verrou.
