# Import de la version 0.44.0

> Document historique du premier import, conservé pour sa provenance. Les commandes sur la branche courante vérifient maintenant la 0.44.1 ; pour reproduire exactement cet import, utiliser le commit `f7a3c3cf53e9a9fb6056033db8e84a3bacffee68`. Voir le [suivi actuel](SUIVI_0_44_1.md).

## Source et contenu

- Archive complète : `DERNIERE_LIGNE_0_44_0_PROJET_COMPLET.zip`.
- Livraison retrouvée : 24 septembre 2026 ; import GitHub préparé le 29 octobre 2026.
- Taille de l'archive : **135 117 787 octets**.
- SHA-256 : `db6585acec03760a7a146b6d62a7b0f12f20684d1c1e1289844a53bc1d123154`.
- Contenu extrait : **458 fichiers**, **163 517 178 octets**.
- Racine d'origine `DERNIERE_LIGNE_0_44_0/`, placée dans `game/`.
- HTML jouable : **28 008 369 octets**, SHA-256 `89dfe476726ea3e90bae8a398087fc4cd1092a47ba541e18fa9bf0110ba4c8c6`.

Le contrôle CRC de l'archive est valide. Aucun chemin absolu, remontée de répertoire ou lien symbolique n'a été extrait. Les 457 fichiers de contenu d'origine sont conservés octet pour octet. Le manifeste d'origine vérifie ces 457 fichiers ; le 458e fichier de l'archive est le manifeste lui-même.

Le contrôle navigateur a trouvé une référence à `assets/icons/icon.svg`, absent de l'archive. Un favicon SVG original a été ajouté pour supprimer cette erreur de chargement. Le manifeste courant inclut cet ajout : `game/` contient désormais 459 fichiers, dont 458 vérifiés par empreinte. Le manifeste original reste disponible dans [`source-MANIFEST_SHA256_0_44_0.json`](source-MANIFEST_SHA256_0_44_0.json), SHA-256 `179c24456b3d3e744ad188e4230d72be041c0798ef8d843c32e5521ecf19c300`.

La version 0.44.0 est la dernière archive complète retrouvée. Une mention de travail sur une version ultérieure ne suffit pas à constituer une livraison : aucune version nouvelle n'est fabriquée ou annoncée par cet import.

## Construction et intégrité vérifiées

La vérification de l'import porte sur :

- les tailles et SHA-256 des **457 fichiers de contenu original**, sans écart ;
- les **458 empreintes du manifeste courant**, incluant le favicon ajouté, et l'inventaire des **459 fichiers** ;
- la reconstruction dans un dossier temporaire de `JOUER_DERNIERE_LIGNE.html` et `rapports/PATCHES_0_44_0.json`, **identiques octet pour octet** aux fichiers livrés ;
- l'analyse par Node.js des **quatre scripts JavaScript intégrés**, sans erreur de syntaxe ;
- les **12 guides**, leurs **40 fichiers amont** et leurs empreintes Git/SHA-256 ;
- les références locales des guides hors exemples de code et l'analyse syntaxique des deux utilitaires Python inclus.

Commande reproductible :

```sh
python3 scripts/verify_repository.py --report artifacts/repository-verification.json
```

La CI reprend ces vérifications. Elle ne lance pas les anciennes suites Python de gameplay. Les sorties de la passe courante sont distinguées des rapports historiques.

Les résultats de l'import sont conservés dans le [rapport de provenance](verification/import-provenance.json) et le [rapport de vérification du dépôt](verification/repository-verification.json).

## Contrôle navigateur effectué

Le 29 octobre 2026, **49 contrôles sur 49 ont réussi** avec Playwright 1.62.1 et Chrome 156.0.8078.73. Le HTML de production a été ouvert hors ligne, avec ses images d'origine, en `file://` et sans API de test. Le parcours couvre le démarrage, À propos, la préparation de campagne, le début de la première vague, la pause/reprise, le retour au menu et la conservation d'un profil de schéma 12 après rechargement, aux dimensions 1440×900, 896×414 et 414×896.

La passe finale ne relève aucune exception JavaScript, erreur console, requête HTTP(S) ou ressource en échec. Le [rapport détaillé](verification/smoke-game.json) identifie l'empreinte du HTML et celle du script utilisé. Deux captures montrent le [début de combat à 1440×900](verification/combat-1440x900.png) et le [camp à 414×896](verification/camp-414x896.png).

Il s'agit d'un parcours court dans un navigateur headless avec dimensions émulées. Il ne valide pas une campagne entière, l'équilibrage, les performances, l'audio à l'écoute ou un téléphone physique, et ne rejoue pas les 471 contrôles historiques.

## Rejouer le contrôle navigateur

Le script `scripts/smoke_game.cjs` ouvre le véritable HTML en `file://`, avec ses images originales et les requêtes réseau désactivées. Il utilise les boutons et le clavier, sans activer `?test=1` ni `window.__DL`.

Playwright est une dépendance de vérification optionnelle. Pour préparer une installation locale :

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node scripts/smoke_game.cjs --out artifacts/smoke
```

Un Chromium déjà installé peut être choisi avec la variable `HORDE_BROWSER_EXECUTABLE`. Le script produit un rapport JSON et deux captures dans le dossier de sortie. Il vérifie le menu, À propos, la préparation, le lancement de la première vague, la pause/reprise, le retour au menu et la présence d'un profil de schéma 12 après rechargement, aux tailles 1440×900, 896×414 et 414×896. Ce parcours ne remplace pas un test complet d'export/import des sauvegardes.

## Rapports QA hérités

Les documents d'origine annoncent **471/471 contrôles**. Ce total provient de la livraison de septembre et n'est pas présenté comme un résultat réexécuté lors de l'import.

Une incohérence est conservée et signalée : `game/rapports/FINAL_0_44_0_QA.json` contient `all_completed_suites_green: false`, avec une ligne balistique à `180/180` mais `ok: false`. Le rapport sous-jacent `BALLISTICS_0410_QA.json` contient quatre contrôles de vues réussis, 180 cas et une liste `bad` vide. Le résumé utilise donc un indicateur incompatible avec les résultats sous-jacents ; cela ne démontre pas 180 cas en échec. Les rapports d'origine restent inchangés pour préserver leur provenance.

`game/tests/run_checks.py` est un agrégateur historique : il appelle notamment un test qui attend le titre 0.42.0. Pour la 0.44.0, sélectionner les suites pertinentes (`ui_v44.py`, `regression_044.py`, `qa4_044.py`) et lire leurs dépendances et effets avant exécution.

## Limites connues de l'archive

Le splash hérité de `ui_v42.js` affiche encore « 0.42.0 » et peut réapparaître brièvement lors des transitions avant de disparaître. Le titre, le menu, À propos et `DL44UI.version` confirment la version 0.44.0. Ce défaut visuel est conservé dans l'import ; les captures attendent la disparition naturelle du splash.

Le parcours de référence est l'ouverture locale du HTML. Après correction du favicon, les références héritées à des ressources web/PWA absentes restent `manifest.webmanifest`, `sw.js` et `assets/audio/manifest.json`. Le service worker et le manifeste audio optionnel ne sont sollicités qu'en HTTP(S), avec gestion d'échec et audio procédural de secours. Un hébergement HTTP exige donc une vérification complémentaire de ces requêtes.

Le profil utilise `localStorage`, schéma 12. Sa disponibilité en ouverture locale dépend du navigateur et du chemin ; utiliser l'export/import JSON du jeu pour déplacer une sauvegarde. Les essais headless n'établissent pas la fluidité sur un appareil physique ni une validation sonore à l'écoute.
