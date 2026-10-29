# Changements 0.44.0

## UI / navigation
- autorité immédiate de la couche 0.44 sur le bouton À propos après les rerenders legacy ;
- observation du menu et capture des activations souris/clavier ;
- fermeture Échap robuste du panneau À propos ;
- accessibilité renforcée de Pause/Reprendre, audio et plein écran.

## HUD
- conservation explicite du texte complet lorsqu'un objectif est compacté ;
- aucune modification des règles de combat dans `ui_v44.js`.

## Pause / Situation du poste
- la barre d'action imbriquée ne dépasse plus la grille interne ;
- correction responsive validée à 1440×900, 896×414 et 414×896.

## QA
- nouvelle matrice `tests/qa4_044.py` ;
- nouvelle vérification statique `tests/ui_v44.py` ;
- régression 0.44 dédiée ;
- parcours production des protocoles isolé et documenté ;
- rapport agrégé `rapports/FINAL_0_44_0_QA.json`.
