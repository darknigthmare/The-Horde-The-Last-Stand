# 0.41.0 — Fronts vivants

## Contrechamp
- suppression à la construction de l’ancien petit survivant procédural qui doublonnait le nouveau sprite distant ;
- rig FPS, arme et mains exclus de la vue arrière ;
- survivant distant unique rendu près du poste ;
- départ de tir et traceurs arrière raccordés à ce survivant.

## Hordes et perspective
- distribution déterministe de chaque zombie dans le corridor visible ;
- limites recalculées depuis la perspective réelle du terrain, au lieu d’un simple décalage global ;
- bandes des deux voies volontairement recouvrantes pour casser l’effet « deux rails » sans supprimer les voies tactiques utilisées par l’IA, les pièges et l’équilibrage ;
- légère dérive visuelle stable pour éviter les colonnes parfaites sans provoquer de téléportation d’une image à l’autre.

## Effets raccordés au rendu
- hit-test sur la silhouette projetée ;
- impacts et particules réancrés ;
- textes de dégâts et cadavres réancrés ;
- traceurs alliés convertis vers la position réellement visible de la cible ;
- grenades et projectiles de profondeur verrouillés sur le réticule de départ.

## Compatibilité
Aucun changement volontaire de dégâts, économie, stocks, vagues, catalogue d’armes ou progression. Le schéma de sauvegarde reste 12.
