# The Horde — The Last Stand

## Dernière Ligne — Zéro Repli · 0.44.2

La version **0.44.2** poursuit l'application des guides : reprise après défaite sur toutes les routes, commandes de manette et remappage sécurisés, volumes audio réellement appliqués, respect des mouvements désactivés et aperçus complets des sauvegardes. Elle conserve les corrections de combat, de cadence, de journaux et de démarrage de la 0.44.1.

Le jeu conserve son moteur HTML/CSS/JavaScript, ses images intégrées et son audio procédural. Il reste jouable hors ligne. Les anciennes sauvegardes de schéma **12** sont compatibles ; un profil synthétique exporté par la 0.44.0, contenant huit campagnes indépendantes, est inclus dans les tests de transfert.

### Jouer

1. Télécharger le dépôt avec **Code → Download ZIP**, puis extraire entièrement le ZIP.
2. Ouvrir **[game/JOUER_DERNIERE_LIGNE.html](game/JOUER_DERNIERE_LIGNE.html)** dans un navigateur récent.
3. Choisir une campagne, préparer le poste et lancer la nuit.

Aucune installation npm ni compilation n'est nécessaire pour jouer. Le lien HTML affiché par GitHub montre le code source : ouvrir le fichier extrait pour lancer le jeu.

Pour changer de navigateur ou déplacer le dossier, utiliser l'export/import JSON du jeu. GitHub ne transfère pas les profils conservés dans le stockage local du navigateur.

### Corrections de la 0.44.2

- Autoroute, Eaux Noires, Ascension et Zone Noire enregistrent leur défaite et proposent de reprendre la préparation exacte : budget, munitions et consommables d'avant départ, sans reprendre ceux d'une autre route.
- Après une pause ou une perte de focus, la gâchette doit être relâchée avant de reprendre le tir. Les indications de commandes suivent le périphérique utilisé.
- Échap annule un remappage en restant dans les réglages. Tab ou un changement d'écran ne laissent pas une capture de touche en attente ; le bouton conserve son focus après modification.
- Le bouton audio et les volumes général/ambiances contrôlent les moteurs des routes et le mixage. Les changements rapides ne réactivent pas un son coupé, et le bouton expose le véritable état du son.
- Désactiver les mouvements supprime aussi le recul CSS de la surface de jeu, en conservant les règles de tir.
- Réduire les flashes atténue aussi les éclats de bouche, explosions, étincelles et vignettes de choc du Canvas. Les repères de tir et avertissements restent disponibles.
- Les confirmations d'import montrent chaque préparation et son budget ; les listes de secours et de conflit décrivent toutes les routes présentes. Les protections existantes contre les écritures échouées ou concurrentes sont testées par l'interface de production.

Voir le [bilan courant et les points restant à traiter](docs/SUIVI_0_44_2.md). Les [preuves de la 0.44.1](docs/SUIVI_0_44_1.md) restent conservées séparément.

### Corrections conservées de la 0.44.1

- Les cracheurs de l'Autoroute, des Eaux Noires et de la Zone Noire cessent d'attaquer pendant un étourdissement ou un leurre applicable. Le Sauteur de glissière annule son saut interrompu et annonce le suivant.
- Les durées réelles des accalmies correspondent à leur affichage. Le service de Malik ajoute bien deux secondes dans chaque cadence.
- Les voyages attendent leur arrivée effective avant d'enregistrer une victoire et un score. Une défaite ultérieure ne reprend plus le score de la nuit précédente.
- Le splash affiche la version courante une seule fois au démarrage. Le manifeste web et le catalogue audio accompagnent l'ouverture HTTP ; le jeu ne demande plus un service worker absent.
- Les vues en profondeur évitent des calculs de projection redondants. La géométrie et les pixels sont comparés à la version importée ; les mesures de temps CPU et leurs limites sont publiées séparément.

### Contenu du dépôt

| Chemin | Contenu |
| --- | --- |
| [`game/`](game/) | Jeu autonome, sources, assets, tests historiques et rapports de livraison. |
| [`game/build.mjs`](game/build.mjs) | Reconstruction avec Node.js, sans paquet externe. |
| [`game/MANIFEST_SHA256.json`](game/MANIFEST_SHA256.json) | Inventaire et empreintes de la livraison courante. |
| [`.agents/skills/`](.agents/skills/) | 12 guides, références, ressources et provenance verrouillée. |
| [`AGENTS.md`](AGENTS.md) | Instructions adaptées au moteur et aux invariants du jeu. |
| [`docs/DEVELOPPEMENT_GAMEDEV.md`](docs/DEVELOPPEMENT_GAMEDEV.md) | Choix des guides et critères d'acceptation. |
| [`docs/verification/0.44.2/`](docs/verification/0.44.2/) | Rapports courants, comparaisons avant/après et captures. |
| [`docs/verification/0.44.1/`](docs/verification/0.44.1/) | Preuves conservées de la passe précédente. |
| [`docs/IMPORT_0_44_0.md`](docs/IMPORT_0_44_0.md) | Provenance et résultats historiques de l'import initial. |

### Reconstruire et vérifier

Avec Python 3.11+ et Node.js 24 :

```sh
python3 scripts/verify_repository.py --report artifacts/repository-verification.json
```

Cette commande vérifie le manifeste courant, les guides, la syntaxe JavaScript et la reconstruction exacte du HTML et du rapport de patches. Les fichiers livrés restent intacts.

Pour reconstruire volontairement :

```sh
node game/build.mjs
```

Le build produit `game/JOUER_DERNIERE_LIGNE.html` et `game/rapports/PATCHES_0_44_2.json`. Après une modification du jeu, vérifier le résultat puis actualiser son manifeste ; les rapports historiques restent conservés.

Les tests navigateur nécessitent Playwright et Chromium :

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node scripts/test-combat-0441.cjs
node scripts/test-startup-web.cjs --out artifacts/startup-web-0442
node scripts/regression-0441.cjs
node scripts/test-progression-0442.cjs
node scripts/test-input-0442.cjs
node scripts/test-feedback-0442.cjs
node scripts/test-storage-0442.cjs
node scripts/benchmark-projection-0441.cjs --correctness-only --out artifacts/projection-correctness-0442
node scripts/smoke_game.cjs --out artifacts/smoke-0442
```

La comparaison de projection nécessite l'historique Git contenant le commit `f7a3c3c`. Un Chromium installé peut être choisi avec `HORDE_BROWSER_EXECUTABLE`. La CI exécute huit suites sur le HTML livré et la comparaison isolée de projection, puis publie les rapports et captures. Les noms des suites 0441 restent stables pour conserver leurs régressions ; elles sont aussi rejouées sur la version courante. Le benchmark complet, sans `--correctness-only`, ajoute les mesures CPU ; les chronométrages ne sont pas un seuil de réussite CI.

### Guides et provenance

Les guides proviennent de [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills), révision `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`. La sélection couvre le routeur, l'IA, les performances, les sensations de jeu, les assets, l'interface, l'audio, le level design, les sauvegardes, les entrées, la physique et la défense par vagues.

La [licence Apache-2.0](.agents/third-party/awesome-gamedev-agent-skills/LICENSE) et le [NOTICE](.agents/third-party/awesome-gamedev-agent-skills/NOTICE) s'appliquent aux fichiers amont identifiés dans [leur manifeste](.agents/gamedev-skills.lock.json). Cet ajout ne définit pas une nouvelle licence générale pour le jeu ou ses assets.

L'archive 0.44.0 et ses anciens totaux de QA sont documentés séparément. Les résultats de cette mise à jour ne constituent pas la certification d'une campagne entière, de l'équilibrage ou des performances sur le matériel du joueur.
