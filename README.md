# The Horde — The Last Stand

## Dernière Ligne — Zéro Repli · 0.44.0

Ce dépôt contient la version complète **0.44.0 « QA intégrale — Poste stabilisé »** de Dernière Ligne — Zéro Repli, importée depuis la dernière archive complète retrouvée, livrée le 24 septembre 2026.

Le jeu est une application HTML/JavaScript autonome. Son rendu Canvas, ses images intégrées et son audio procédural permettent de jouer hors ligne dans un navigateur récent.

### Jouer

1. Télécharger le dépôt avec **Code → Download ZIP**, puis extraire entièrement le ZIP.
2. Ouvrir **[game/JOUER_DERNIERE_LIGNE.html](game/JOUER_DERNIERE_LIGNE.html)** dans le navigateur.
3. Choisir une campagne et suivre sa préparation avant de lancer la nuit.

Aucune installation npm, compilation ou connexion à un serveur n'est nécessaire pour jouer. Le lien HTML affiché par GitHub montre le code source : ouvrir le fichier extrait pour lancer le jeu.

Les sauvegardes utilisent le stockage local du navigateur. Pour déplacer le jeu, changer de navigateur ou remplacer un ancien dossier, utiliser l'export/import JSON proposé dans le jeu ; les profils locaux ne sont pas transférés par GitHub.

### Contenu du dépôt

| Chemin | Contenu |
| --- | --- |
| [`game/`](game/) | 459 fichiers : contenu complet de l'archive, manifeste actualisé et favicon manquant ajouté. |
| [`game/build.mjs`](game/build.mjs) | Reconstruction du HTML autonome avec Node.js, sans paquet externe. |
| [`game/MANIFEST_SHA256.json`](game/MANIFEST_SHA256.json) | Empreintes des 458 autres fichiers livrés, dont le favicon ajouté. |
| [`.agents/skills/`](.agents/skills/) | 12 guides de développement, avec leurs références et ressources. |
| [`AGENTS.md`](AGENTS.md) | Instructions spécifiques à ce jeu pour les agents de développement. |
| [`docs/DEVELOPPEMENT_GAMEDEV.md`](docs/DEVELOPPEMENT_GAMEDEV.md) | Choix des guides selon le chantier et critères de validation. |
| [`docs/IMPORT_0_44_0.md`](docs/IMPORT_0_44_0.md) | Provenance de l'import et portée des vérifications. |

### Vérifier et reconstruire

Pour vérifier le dépôt avec **Python 3.11** et **Node.js 24** :

```sh
python3 scripts/verify_repository.py --report artifacts/repository-verification.json
```

Cette commande vérifie les empreintes du jeu et des guides, reconstruit le jeu dans un dossier temporaire, compare les deux sorties à la livraison et analyse ses quatre scripts JavaScript. Elle conserve les fichiers de `game/` intacts.

Pour reconstruire volontairement le jeu dans son dossier :

```sh
node game/build.mjs
```

Cette seconde commande écrit `game/JOUER_DERNIERE_LIGNE.html` et `game/rapports/PATCHES_0_44_0.json`. Après une modification intentionnelle, mettre à jour le manifeste de livraison et les preuves correspondantes.

La CI exécute les contrôles d'intégrité, de reconstruction et de syntaxe. Les essais interactifs en navigateur sont décrits dans le document d'import ; ils ne sont pas remplacés par ces contrôles statiques.

### Guides de développement

Les guides proviennent de [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills), révision `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`.

La sélection couvre le routeur, l'IA, les performances, les sensations de jeu, les assets, l'interface, l'audio, le level design, les sauvegardes, les entrées, la physique et les principes de défense par vagues. Les agents chargent les guides utiles à la tâche et adaptent leurs exemples au moteur HTML/JavaScript existant.

La [licence Apache-2.0](.agents/third-party/awesome-gamedev-agent-skills/LICENSE) et le [NOTICE](.agents/third-party/awesome-gamedev-agent-skills/NOTICE) s'appliquent aux fichiers amont identifiés dans [le manifeste des guides](.agents/gamedev-skills.lock.json). Cet ajout ne définit pas une nouvelle licence générale pour le jeu ou ses assets.

### État de la livraison

Les 457 fichiers de contenu d'origine sont conservés octet pour octet depuis l'archive 0.44.0. Le favicon référencé mais absent a été ajouté ; le manifeste courant le référence, et le [manifeste d'origine](docs/source-MANIFEST_SHA256_0_44_0.json) est conservé séparément. Les anciens totaux de QA sont distingués des vérifications effectuées pour cet import dans [`docs/IMPORT_0_44_0.md`](docs/IMPORT_0_44_0.md).
