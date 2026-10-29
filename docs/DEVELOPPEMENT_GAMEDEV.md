# Utiliser les guides gamedev dans ce jeu

## Objectif

Première application aux sources après l'import : [suivi de la version 0.44.1](SUIVI_0_44_1.md), avec les défauts reproduits, corrections d'IA et de cadence, mesures de projection, tests de sauvegarde et tâches restantes.

Relier chaque chantier à une méthode et à un résultat observable. Le jeu utilise son moteur HTML/JavaScript existant ; ses sources actives, ses règles et ses sauvegardes déterminent l'implémentation.

Les 12 guides et leurs ressources sont copiés depuis [la révision 19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9) du dépôt amont. Le [verrou](../.agents/gamedev-skills.lock.json) conserve les chemins source, tailles, modes et empreintes. Seule la sélection utile à ce jeu est installée.

## Sélection par chantier

| Guide | Application | Vérification attendue |
| --- | --- | --- |
| [router](../.agents/skills/router/SKILL.md) | Choisir un petit ensemble de guides selon la tâche. | Sources et APIs du moteur identifiées avant édition. |
| [game-ai](../.agents/skills/game-ai/SKILL.md) | États, transitions, choix de cible et déplacement des ennemis. | Ennemi atteignant sa cible, absence de blocage et de changements de cible incohérents. |
| [tower-defense](../.agents/skills/tower-defense/SKILL.md) | Composition et cadence des vagues, répit, annonce des menaces et économie. | Pression lisible, transitions de vagues correctes, ressources et récompenses cohérentes. |
| [performance-optimization](../.agents/skills/performance-optimization/SKILL.md) | Mesurer une scène reproductible avant de traiter son coût dominant. | Comparaison avant/après du temps d'image et de la mémoire dans les mêmes conditions. |
| [game-feel](../.agents/skills/game-feel/SKILL.md) | Synchroniser tir, impact, recul, mort et explosions. | Effets proportionnés, retour à l'état normal, visée et commandes disponibles. |
| [create-game-assets](../.agents/skills/create-game-assets/SKILL.md) | Familles cohérentes de sprites, décors, icônes et animations. | Dimensions, alpha, pivots, silhouettes et frames contrôlés dans le jeu. |
| [game-ui-ux](../.agents/skills/game-ui-ux/SKILL.md) | Menus, préparation, HUD, fenêtres et mise à l'échelle. | Parcours clavier/souris, focus, fermeture, pause et visibilité aux tailles visées. |
| [audio-design](../.agents/skills/audio-design/SKILL.md) | Sons d'armes, alertes, ambiance et réglages. | Sons distincts, mixage lisible, volumes et arrêt/reprise cohérents. |
| [level-design](../.agents/skills/level-design/SKILL.md) | Axes d'approche, obstacles, zones dangereuses et rythme. | Géométrie parcourable et lisible dans les différentes vues. |
| [save-systems](../.agents/skills/save-systems/SKILL.md) | Profils, réserves, sauvegardes de secours et migrations. | Export, fermeture, réouverture, import et conservation des anciens profils. |
| [input-systems](../.agents/skills/input-systems/SKILL.md) | Touches, états appuyés, focus et commandes contextuelles. | Aucun tir ou déplacement maintenu après perte de focus, pause ou fermeture de fenêtre. |
| [physics-tuning](../.agents/skills/physics-tuning/SKILL.md) | Pas de simulation, collisions et projectiles. | Résultat cohérent selon la cadence d'images, sans traversée ni double résolution d'impact. |

Le guide de tower defense est utilisé pour les principes pertinents de défense par vagues. Les tours automatiques et les chemins imposés de ses exemples ne définissent pas le gameplay de Dernière Ligne.

## Exemple : intégrer un nouvel ennemi

1. Définir son rôle, sa silhouette, sa menace et la réponse possible du joueur.
2. Décrire ses états et leurs conditions de transition, puis les relier aux fonctions d'ennemis existantes.
3. Préparer ses états visuels et sons avec une palette, des proportions et des ancrages stables.
4. Définir son introduction, sa cadence et ses combinaisons dans les vagues.
5. Vérifier ennemi seul, groupe, obstacle, changement de cible, mort pendant une attaque et retour de pause.
6. Mesurer son coût dans une scène chargée si le changement affecte le nombre d'instances ou leurs calculs.
7. Documenter les contrôles effectués et ceux encore ouverts.

## Suivi et acceptation

| État | Signification |
| --- | --- |
| Prévu | Besoin décrit et résultat attendu défini. |
| Implémenté | Code ou asset produit. |
| Intégré | Élément relié aux parcours et données du jeu. |
| Vérifié en jeu | Scénario exécuté et preuve de résultat conservée. |

Un contrôle de syntaxe ne valide pas un combat ; un scénario utilisant `?test=1` ne valide pas à lui seul le parcours de production ; une image générée doit être observée à la taille de jeu. Indiquer ces différences dans les résultats.

## Reconstruction et contrôle

La commande de contrôle du dépôt est :

```sh
python3 scripts/verify_repository.py --report artifacts/repository-verification.json
```

Elle utilise uniquement Python et Node.js, sans téléchargement. Elle vérifie le manifeste complet de `game/`, les 40 fichiers amont des guides, leur structure, leurs références locales hors exemples, la syntaxe des scripts Python inclus et les deux sorties du build reconstruites dans un dossier temporaire.

Les ressources d'images du guide `create-game-assets` disposent de deux utilitaires Python. Leur dépendance Pillow est déclarée dans leur propre `scripts/requirements.txt` ; elle est nécessaire uniquement pour utiliser ces utilitaires, pas pour jouer ou construire le jeu.

## Mise à jour du lot de guides

Choisir explicitement une révision amont. Comparer les changements des dossiers sélectionnés, copier leurs ressources complètes et conserver les mentions de licence. Actualiser ensuite le verrou à partir des octets copiés et relancer le contrôle du dépôt.

Le validateur global du dépôt amont attend son catalogue complet et sa disposition d'origine. Notre contrôle valide le sous-ensemble installé et son intégrité ; il ne prétend pas exécuter ce validateur global.
