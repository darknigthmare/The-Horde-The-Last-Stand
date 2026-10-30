# Suivi de développement — 0.44.1

> Bilan historique conservé. La livraison courante et les validations suivantes figurent dans le [suivi 0.44.2](SUIVI_0_44_2.md).

Passe du **29 octobre 2026**, poursuivant le PR d'import des guides après sa fusion dans `main` (`86f491c`). Les corrections sont intégrées dans le moteur existant et dans le HTML autonome livré. Les bases historiques, les guides verrouillés et les rapports de septembre sont conservés.

## Résultats livrés

| Chantier et guide appliqué | Problème constaté | Résultat vérifié |
| --- | --- | --- |
| IA — `game-ai` | Les Crache-carburant, Crache-saumure et Crache-noir tiraient encore pendant un étourdissement ou un leurre applicable. | Attaque et compteur suspendus pendant le contrôle, reprise après sa fin, aucun tir post-mortem. |
| IA — `game-ai` | Le Sauteur de glissière pouvait achever un saut annoncé pendant son étourdissement, malgré le comportement promis dans le codex. | Saut annulé ; délai normal puis nouvelle annonce avant un autre changement de voie. |
| Vagues — `tower-defense` | Malik prolongeait l'affichage du répit sans toujours prolonger la vraie attente. Les profils rapides conservaient parfois les six secondes classiques. | Apparitions synchronisées au répit annoncé dans les quatre cadences, avec et sans Malik. |
| Journaux — règles de clôture | Le métro et ARGO-17 pouvaient inscrire une victoire et un record après l'élimination des ennemis, avant l'arrivée. Une défaite ultérieure gardait ce faux résultat. | Résultat, score, durée et solde final enregistrés à la clôture réelle. Les appels répétés ne dupliquent pas la session. |
| Journaux — progression | Après une victoire, la défaite de la nuit suivante pouvait reprendre son score et son grade. | Seul le bilan de la nuit concernée alimente sa session. Les anciennes victoires et leurs records restent intacts. |
| Interface — `game-ui-ux` | Splash 0.42.0 recréé après les changements d'écran et anciennes couches réécrivant la version. | Splash unique par chargement du document, libellés 0.44.1 cohérents, nettoyage de ses écouteurs. |
| Livraison HTTP | Manifeste web, catalogue audio et service worker référencés mais absents. | Manifeste et catalogue audio fournis ; audio procédural maintenu ; enregistrement du worker absent retiré ; aucun cache de jeu ajouté. |
| Projection — `performance-optimization` | Deux décalages horizontaux anciens étaient calculés puis écrasés ; la même profondeur était recalculée pour les bords du corridor. | Calculs redondants évités, géométrie et pixels identiques aux cas de référence. Mesures CPU documentées ci-dessous. |

Les corrections de statut sont dans `game/src/combat_v441.js`, la projection dans `game/src/spatial.js`, et les adaptations des fonctions historiques dans les remplacements contrôlés de `game/build.mjs`. La reconstruction exige une occurrence unique pour chaque remplacement : un changement inattendu de la base fait échouer le build.

### Accalmies désormais effectives

| Cadence | Sans Malik | Avec Malik |
| --- | ---: | ---: |
| Classique, directeur désactivé | 6 s | 8 s |
| Tactique | 6 s | 8 s |
| Nerveux | 4,5 s | 6,5 s |
| Déferlante | 3,5 s | 5,5 s |

Ces valeurs remettent en accord le profil choisi, le service payé et l'affichage. Elles ne constituent pas une nouvelle certification de l'équilibrage des campagnes.

## Vérifications terminées

Les quatre suites de jeu totalisent **234/234 contrôles** sur le même HTML final. Le comparatif géométrique est compté séparément. Ce total ne reprend pas les 471 contrôles annoncés dans les documents historiques.

| Suite | Résultat | Portée et preuve |
| --- | ---: | --- |
| Combat et journaux | **67/67** | Étourdissements, leurres, saut, morts, huit configurations de répit, boss Mortier, arrivées et séquences victoire puis défaite. [Après](verification/0.44.1/combat-after.json) / [avant : 36/67](verification/0.44.1/combat-before.json). |
| Démarrage et HTTP | **55/55** | Production sans API de test, `file://` hors ligne et HTTP localhost, sept transitions, ressources et absence de worker/cache. [Après](verification/0.44.1/startup-web-after.json) / [avant : 28/55](verification/0.44.1/startup-web-before.json). |
| Intégration et sauvegardes | **61/61** | Huit routes, quatre vues, pause, préparation suivante, armurier, six presets, circuits de Zone Noire, focus et transfert réel par l'interface. [Rapport](verification/0.44.1/regression.json). |
| Parcours de production | **51/51** | Menu, préparation, première vague, pause/reprise, rechargement du profil ; 1440×900, 896×414, 414×896. [Rapport](verification/0.44.1/smoke-game.json). |
| Projection et rendu | **61 824 projections sans écart** | 69 types, huit familles, quatre vues, sept distances, deux voies, debout/effondré ; pixels identiques dans quatre scènes. [Rapport](verification/0.44.1/projection-correctness.json). |
| Intégrité et reconstruction | **Conformes** | 462 fichiers de jeu vérifiés par empreinte, 463 avec le manifeste ; 12 guides et 40 fichiers amont ; HTML et rapport de patches reproductibles, quatre scripts intégrés valides. [Rapport](verification/0.44.1/repository-verification.json). |

Les échecs de l'ancienne version comptent des assertions répétées dans plusieurs scénarios, pas autant de bugs distincts. Les suites n'ont pas été modifiées pour masquer les échecs : les mêmes tests de régression reproduisent les défauts de l'archive et passent avec les correctifs.

### Sauvegardes et ressources

Le schéma reste **12**, avec la même clé de stockage `derniere-ligne-v12`. La fixture [`profile-0.44.0.json`](../scripts/fixtures/profile-0.44.0.json) a été exportée par le runtime original avec huit préparations de campagne, des budgets et des réserves de fusil distincts. Sa [provenance](../scripts/fixtures/profile-0.44.0.provenance.json) indique l'empreinte du HTML source et sa préparation synthétique. Elle ne contient aucune partie personnelle.

Le test importe ce fichier par le gestionnaire de production, confirme le remplacement, recharge le navigateur puis reprend une préparation. Les huit routes, budgets, équipements et réserves sont comparés. Le refus d'un JSON invalide, l'annulation et la copie de secours sont également vérifiés. Les six presets d'armurier et la conservation des munitions sont testés séparément.

Le catalogue chargé par le moteur contient **252 images** ; les 252 chargements réussissent sans remplacement par des images 1×1. Ce contrôle ne remplace pas une revue artistique de chaque animation et de chaque pivot.

### Mesure de performance et limites

Le [benchmark complet](verification/0.44.1/projection-performance.json) compare la modification de projection à la version importée, dans un HTML temporaire contenant les vraies images. Sa bascule de comparaison existe uniquement dans la fixture de test. Le script ne modifie pas la livraison.

Configuration : Chrome 156.0.8078.73, fenêtre 1440×900, 96 ennemis figés, `file://`, hors ligne, ordre des mesures alterné, rendu cadencé par `requestAnimationFrame`.

| Temps CPU médian mesuré | Avant | Après |
| --- | ---: | ---: |
| Projection seule, vue avant | 0,243 µs | 0,132 µs |
| Projection seule, vue arrière | 1,924 µs | 0,514 µs |
| Rendu complet, vue arrière | 5,35 ms | 3,30 ms |
| Rendu complet, vue avant | 3,00 ms | 3,50 ms |
| Rendu complet, vue droite | 1,05 ms | 1,10 ms |

La vue arrière montre une réduction mesurée d'environ **38 %** du temps CPU dans cette scène. Les autres temps de rendu varient avec la charge de la machine ; cette passe ne démontre pas une accélération globale. Les mesures ne sont ni des FPS ni une promesse de fluidité sur le matériel du joueur. Le mode CI `--correctness-only` vérifie uniquement la géométrie et les pixels, sans seuil de chronométrage.

Le comparatif vérifie 4 665 600 valeurs de canaux RGBA par vue, avec zéro différence. Les [captures de combat](verification/0.44.1/combat-1440x900.png) et [de préparation en portrait](verification/0.44.1/camp-414x896.png) sont prises dans la production actuelle. La capture de préparation attend la fin de l'animation native du panneau, sans changer le jeu.

## Points restant à traiter

| Priorité | Chantier | État après cette passe | Validation attendue |
| --- | --- | --- | --- |
| P1 | Campagnes complètes et économie | Débuts, simulation courte, transitions contrôlées et reprise vérifiés ; parcours naturels complets encore ouverts. | Finir les campagnes sans API de test et suivre munitions, revenus, boss et objectifs de bout en bout. |
| P1 | Équilibrage des hordes | Délais corrigés ; équilibrage global non certifié. | Sessions longues dans chaque cadence, avec/sans services, sur plusieurs paliers de difficulté. |
| P1 | Appareils physiques | Trois dimensions émulées ; pas de téléphone ou de manette physique validé ici. | Tactile réel, multi-touch, manette, focus, autonomie et temps d'image sur les appareils cibles. |
| P2 | Assets et animation | Chargements complets et comparaison de projection ; revue artistique intégrale encore ouverte. | Silhouettes, alpha, pivots, pieds directionnels et raccords de chaque animation à la taille de jeu. |
| P2 | Sensations de tir, VFX et audio | Alignements préservés ; aucun nouvel ensemble de sons ou d'animations produit dans ce lot. | Observation et écoute des armes, impacts, rechargements, alertes et options de réduction des effets. |
| P2 | Hébergement | HTTP local vérifié ; aucune installation PWA ni publication de site réalisée dans cette passe. | Vérification des en-têtes, ressources, sauvegardes et comportement hors ligne sur l'hébergement choisi. |
| P2 | Suites historiques | Les anciens rapports restent archivés ; la CI utilise les suites courantes. | Migrer les tests encore pertinents sans réécrire les preuves historiques ni additionner leurs anciens totaux aux nouveaux. |

La CI lance maintenant les contrôles d'intégrité et les cinq suites navigateur. Les résultats distants du PR complètent les preuves locales ; consulter leur statut avant de fusionner.
