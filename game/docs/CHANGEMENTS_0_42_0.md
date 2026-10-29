# Changements — 0.42.0 « Poste de commandement »

## Intention
Cette version ne remplace aucun système de jeu. Elle crée une couche de présentation cohérente par-dessus les écrans existants afin que **DERNIÈRE LIGNE — ZÉRO REPLI** soit perçu comme un jeu vidéo autonome et non comme une page web enrichie.

## Design system
- palette sombre pétrole / métal / laiton ;
- cadres découpés et angles francs à la place des cartes arrondies ;
- bordures lumineuses réservées aux états importants ;
- typographie condensée et capitales pour les commandes, lisibilité normale pour le contenu ;
- hiérarchie en trois niveaux : état global, tâche courante, action ;
- boutons transformés en commandes de console et non en composants web génériques ;
- suppression visuelle des contrôles natifs incohérents quand cela est possible sans casser l’accessibilité.

## Accueil et navigation
- écran principal transformé en poste de commandement ;
- navigation principale numérotée et alignée ;
- panneau de briefing séparé des actions ;
- version et statut intégrés à la composition ;
- focus clavier renforcé ;
- légende d’entrée adaptée automatiquement au clavier ou à la manette détectée.

## Préparation
- en-tête de campagne/secteur renforcé ;
- rail de groupes et onglets réorganisés ;
- cartes d’équipement, doctrine, renseignement et objectifs harmonisées ;
- tableaux, listes, détails déroulants et contrôles de paramètres intégrés au même vocabulaire visuel ;
- conservation intégrale des 12 sections et de leur logique existante.

## Combat
- bandeau supérieur compact ;
- blocs santé / ressources / vague plus lisibles ;
- progression de horde et objectif séparés des actions ;
- panneau boss dédié ;
- lecture arme / munitions / actions resserrée ;
- ligne tactique indiquant site, vue et contacts actifs ;
- raccourci plein écran F10 et bouton HUD ;
- toasts et annonces réhabillés.

## Transitions et confort
- écran de boot purement local ;
- wipe entre écrans ;
- respect de `prefers-reduced-motion` ;
- variantes pour largeur <=1180 px, <=760 px et faible hauteur ;
- aucun fetch, WebSocket ou service externe ajouté.

## Compatibilité
- schéma de sauvegarde inchangé : 12 ;
- aucune règle de dégâts, prix, stock, vague, hit-test ou économie modifiée par `ui_v42.js` ;
- correctifs 0.41.0 conservés.
