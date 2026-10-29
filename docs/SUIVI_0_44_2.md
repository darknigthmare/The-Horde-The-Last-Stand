# Suivi de développement — 0.44.2

Passe du **29 octobre 2026**, à la suite de la [0.44.1](SUIVI_0_44_1.md), référence `6c8b86d`. Cette livraison poursuit les guides sur les reprises de campagne, les commandes, le retour visuel et sonore et la conservation des profils. Elle conserve le moteur, les bases historiques, les ressources et le schéma de sauvegarde **12**.

## Corrections livrées

| Guide / chantier | Défaut reproduit en 0.44.1 | Comportement corrigé |
| --- | --- | --- |
| `tower-defense` et `save-systems` — défaite | Les gestionnaires plus récents d'Autoroute, Eaux Noires, Ascension et Zone Noire terminaient avant les anciens gestionnaires de journal et de reprise. Le point de départ existait, mais le bouton manquait et le dernier point de défaite pouvait appartenir à une autre route. | Les huit routes partagent le journal de défaite et le bouton de reprise. Le véritable instantané de préparation fournit le budget, les munitions et les consommables, sans nouveau kit ni mélange de routes. |
| `input-systems` — remappage | Échap fermait Réglages avant d'annuler la capture de touche. Une touche suivante remappait alors une action sans nouveau choix. La reconstruction du bouton perdait aussi le focus. | Échap annule en restant dans Réglages. Tab annule puis navigue. Quitter l'écran abandonne la capture. Le bouton de l'action conserve le focus. |
| `input-systems` — gâchette | Une gâchette maintenue réactivait le tir au retour de pause ou de perte de focus. | Un relâchement est nécessaire avant une nouvelle pression après interruption ou connexion de manette. |
| `game-ui-ux` — périphérique actif | Une manette inactive conservait ses indications pendant l'utilisation du clavier ; la déconnexion ne nettoyait pas toujours leur classe d'affichage. | Les légendes suivent l'entrée utilisée et reviennent correctement au clavier/pointeur. Le premier mouvement de stick conserve l'origine de visée. |
| `audio-design` — bouton son | AUDIO OFF pouvait laisser le mixeur produire un signal. Le libellé accessible lisait une variable privée hors de la fermeture du moteur. | Le mixeur rejoint le silence après un court fondu. Le libellé et l'état accessible reçoivent la valeur réelle du moteur, y compris après plusieurs bascules rapides. |
| `audio-design` — volumes | Cinq moteurs historiques contournaient le volume général et le bus d'ambiances en se connectant directement à la sortie audio. | Métro, Autoroute, Eaux Noires, Ascension et Zone Noire rejoignent le mixeur commun. Le moteur natif d'ARGO-17 y passait déjà et est également vérifié. Les sources persistantes sont réutilisées lors des changements de route. |
| `game-feel` — confort | Désactiver les mouvements laissait le recul CSS de la surface de jeu. Réduire les flashes n'atténuait pas plusieurs effets Canvas. | Le réglage de mouvement couvre aussi le recul CSS. Les éclats de bouche, explosions, étincelles, anneaux lumineux et vignettes de choc concernés utilisent une opacité réduite, sans modifier dégâts ou durée. Les avertissements et repères restent présents. |
| `save-systems` et `game-ui-ux` — aperçus | Les anciennes listes d'import, de conflit et d'historique ne décrivaient qu'une partie des préparations. Les budgets de plusieurs campagnes n'apparaissaient pas avant remplacement. | Tous les emplacements du profil sont décrits. La confirmation affiche le nom, l'avancement et le budget de chaque préparation, dans une liste adaptée au portrait. Le gestionnaire mentionne le schéma 12. |

Les corrections sont réparties dans `game/src/progression_v442.js`, `input_v442.js`, `feedback_v442.js` et `profile_ui_v442.js`. Les deux couches UI et les remplacements contrôlés de `game/build.mjs` assurent leur raccord au moteur. Le rapport recense **46 adaptations** ; les remplacements contrôlent leurs occurrences attendues. Le HTML et le rapport de patches sont reconstruits à l'identique.

### Ce que signifie « reprendre »

Le bouton de l'écran de défaite restaure la préparation capturée avant le départ, puis la sauvegarde. Les dépenses et consommables de la tentative sont annulés comme dans le mécanisme natif ; la progression de profil déjà acquise reste conservée. Les autres préparations ne changent pas. Répéter la notification de défaite ou la commande de restauration ne crée ni récompense supplémentaire ni duplication de journal.

Cette correction ne crée pas de récupération automatique d'une tentative perdue après fermeture du document : il faut choisir la reprise sur l'écran de défaite. La validation de rechargement porte sur la préparation **après** sa restauration.

## Vérifications

Les **huit suites de jeu totalisent 499/499 contrôles** sur le même HTML final. Le contrôle de projection est compté séparément.

| Suite | Résultat 0.44.2 | Comparatif et preuve |
| --- | ---: | --- |
| Combat, contrôles d'ennemis et cadence | **67/67** | [Régression conservée](verification/0.44.2/combat.json). |
| Démarrage hors ligne et HTTP | **55/55** | [Production sans API de test](verification/0.44.2/startup-web.json). |
| Intégration et transfert de profil 0.44.0 | **61/61** | [Huit routes, armurier et circuits](verification/0.44.2/integration.json). |
| Progression, économie et reprises | **131/131** | [Après](verification/0.44.2/progression-after.json) / [avant : 99/131](verification/0.44.2/progression-before.json). Inclut 248 clôtures et quatre nuits de pilote, sans les ajouter au total. |
| Remappage, manette et tactile | **36/36** | [Après](verification/0.44.2/input-after.json) / [avant : 23/36](verification/0.44.2/input-before.json). |
| Audio, mouvement et flashes | **54/54** | [Après](verification/0.44.2/feedback-after.json) / [avant : 25/54](verification/0.44.2/feedback-before.json). |
| Aperçus et protection des profils | **44/44** | [Après](verification/0.44.2/storage-after.json) / [avant : 39/44](verification/0.44.2/storage-before.json). |
| Parcours de production, trois formats | **51/51** | [1440×900, 896×414 et 414×896](verification/0.44.2/smoke-game.json). |
| Projection isolée | **61 824 cas sans écart** | [Comparatif](verification/0.44.2/projection-correctness.json), pixels identiques dans les quatre scènes. |
| Intégrité et reconstruction | **Conformes** | [467 fichiers vérifiés par empreinte, 468 avec le manifeste](verification/0.44.2/repository-verification.json) ; 12 guides et 40 fichiers amont. |

Les huit suites de jeu identifient le HTML par SHA-256 `7edd451c079b5d72ab31acf6cc49aba4e805801271afd24972d36e49ba65e1d1`. La projection emploie sa fixture isolée habituelle : HTML historique avec la source `spatial.js` courante, restée inchangée dans cette passe. Cette comparaison ne confond pas les nouveaux réglages de flash avec un changement de géométrie.

Les rapports de cette livraison figurent dans [verification/0.44.2/](verification/0.44.2/). Les totaux historiques de septembre et ceux de la 0.44.1 restent séparés. Les comparatifs avant/après emploient le même scénario sur le HTML `6c8b86d` et sur la nouvelle livraison ; plusieurs assertions peuvent décrire le même défaut. Les rapports de progression lisibles conservent toutes les assertions et le pilote ; leurs instantanés complets sont également fournis dans les archives JSON gzip [avant](verification/0.44.2/progression-before-full.json.gz) et [après](verification/0.44.2/progression-after-full.json.gz), avec empreinte du contenu décompressé.

### Fins de campagne et économie

La suite parcourt les **24 nuits du convoi**, les **16 nuits du Nord** et les **12 étapes de chacune des six autres routes**, puis les **12 nuits de secours** après l'évacuation. Les budgets **Terrain** et **Classique** sont testés séparément : **248 clôtures contrôlées** au total.

Pour chaque clôture, elle rapproche le budget initial, les frais de départ, les récompenses, le journal économique, le score et le solde final. Elle vérifie l'absence de deuxième paiement, les fins de route, les reprises périodiques et les continuations vers Secours puis Sans-fin sans remettre du matériel neuf. Les huit préparations terminées sont ensuite rechargées depuis le stockage.

Les états de fin d'assaut, d'objectifs et de distance sont préparés par l'API de test. Ces scénarios vérifient les transactions et les transitions ; ils ne représentent pas 248 nuits jouées naturellement. Les défaites sont déclenchées après un départ et des dépenses réels, puis la restauration de la préparation et sa persistance sont comparées aux autres routes.

### Pilote de combat distinct

Un second scénario joue les **quatre premières nuits** avec le système natif de génération d'ennemis, les armes, les dégâts, les délais de tir et les munitions. Il achète son PM et ses réserves avec le budget disponible, recharge et vise les cibles, puis atteint le premier contact lourd. Les ressources, les ennemis et leurs points de vie ne sont pas remplacés pour obtenir ces victoires.

La visée et les pas de simulation sont automatisés par `?test=1`. Ce pilote vérifie un début de parcours avec dépenses réelles ; il ne mesure ni la difficulté pour une personne ni l'équilibrage de la campagne entière. Le [rapport de progression](verification/0.44.2/progression-after.json) conserve les achats, les tirs, les réserves et les résultats de chaque nuit.

| Nuit | Ennemis générés / neutralisés | Tirs de PM | Achats payés | Solde après victoire |
| --- | ---: | ---: | ---: | ---: |
| 1 | 16 / 16 | 71 | 630 CR | 731 CR |
| 2 | 22 / 22 | 101 | 75 CR | 1 127 CR |
| 3 | 42 / 42 | 223 | 75 CR | 1 680 CR |
| 4 | 35 / 35 | 268 | 225 CR | 2 283 CR |

La passe compte 115 ennemis neutralisés, 663 tirs et 1 005 CR d'achats. Elle termine avec 121 cartouches de PM. Ces valeurs décrivent ce pilote et sa graine, sans fixer une cible d'équilibrage pour les parties humaines.

### Production, commandes et sauvegardes

Les tests de commandes ouvrent le HTML de production hors ligne, sans `window.__DL`. Le clavier passe par les événements du navigateur ; l'API Gamepad est émulée et les gestes tactiles sont envoyés à Chromium. Les six scénarios tactiles passent aussi sur l'ancienne version : aucun nouveau correctif tactile n'est revendiqué.

La suite de stockage utilise l'interface de production sur HTTP localhost et des onglets partageant réellement la même origine. Elle couvre le quota du profil principal, l'échec de sa copie de secours, la reprise d'une écriture, un stockage bloqué, les profils illisibles ou de version future et un changement entre aperçu d'import et confirmation. Elle vérifie aussi l'export d'une session gardée à part.

Les erreurs de stockage sont injectées dans les méthodes `Storage` du navigateur. Aucune fonction de sauvegarde du jeu n'est remplacée. Les protections existaient déjà et passent avant/après ; le changement de cette livraison concerne leurs aperçus incomplets. La détection de concurrence reste optimiste et ne constitue pas un verrou atomique entre onglets.

### Audio et rendu

Les tests audio observent les vraies connexions WebAudio, les gains et le signal synthétisé mesuré par analyseur. Ils vérifient le silence, le retour du son, les curseurs à zéro, la pause, le menu et la réutilisation des moteurs lors de changements de route. Les cibles inchangées ne reprogramment pas les fondus à chaque image.

L'option de réduction des flashes applique un facteur d'opacité de **0,25** aux effets concernés. Le rendu est comparé avec et sans l'option ; les ressources, règles et résultats de combat restent identiques. Cette vérification n'est pas une certification de photosensibilité ni une évaluation subjective d'écoute. Les nouvelles mesures ne revendiquent aucun gain global de FPS ; les anciens chronométrages appartiennent à la passe 0.44.1.

Exemples visuels : [sprites normaux](verification/0.44.2/flashes-sprites-normal.png) / [sprites atténués](verification/0.44.2/flashes-sprites-reduced.png), [vue avant normale](verification/0.44.2/flashes-front-normal.png) / [vue avant atténuée](verification/0.44.2/flashes-front-reduced.png). La [confirmation d'import en portrait](verification/0.44.2/profile-import-414x896.png) montre les huit budgets ; son [contrôle de mise en page](verification/0.44.2/profile-preview.json) ne relève aucun débordement horizontal.

## Points restant à traiter

| Priorité | Chantier | État après cette livraison | Validation attendue |
| --- | --- | --- | --- |
| P1 | Campagnes jouées de bout en bout | Fins et économie contrôlées sur toutes les routes ; début de combat automatisé sur quatre nuits. | Sessions complètes sans préparation forcée des victoires, avec plusieurs stratégies et niveaux de difficulté. |
| P1 | Équilibrage sur la durée | Transactions rapprochées, frais et achats natifs conservés. Aucun tarif ni dégât rééquilibré dans cette passe. | Mesurer revenus, consommation, difficulté des boss et marges d'erreur sur les parcours complets. |
| P1 | Appareils physiques | Clavier, manette émulée et multitouch Chromium vérifiés ; formats d'écran émulés. | Téléphones, manettes, audio réel, performances et autonomie sur les appareils cibles. |
| P2 | Animation et assets | Vraies images utilisées, projection comparée ; aucun nouveau pack produit. | Revue artistique complète des silhouettes, alpha, pivots, pieds directionnels et raccords d'animation. |
| P2 | Sensations de tir et accessibilité | Commandes de son, mouvement et flashes raccordées aux effets concernés. | Écoute sur casque/haut-parleurs, perception des signaux, confort visuel et essais des familles d'armes. |
| P2 | Hébergement | Ouverture hors ligne et HTTP local vérifiées. | Hébergement choisi, en-têtes, sauvegardes, chargement et fonctionnement hors ligne ; aucune installation PWA supplémentaire livrée ici. |
| P2 | Tests historiques | Les neuf suites actuelles sont intégrées à la CI ; les anciennes preuves restent archivées. | Migrer les autres scénarios historiques utiles sans additionner d'anciens résultats aux contrôles courants. |

Consulter aussi le statut de la vérification GitHub du PR avant fusion. Les rapports locaux et ceux de la CI indiquent précisément leur artefact, leur navigateur et leur portée.
