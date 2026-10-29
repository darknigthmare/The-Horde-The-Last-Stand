# Changements — 0.43.0 « Clarté de terrain »

## Intention
La 0.42.0 avait donné à l’interface une identité de jeu. La 0.43.0 traite la seconde moitié du problème : la **densité**. Le principe est celui d’une interface de jeu moderne : garder la profondeur, mais ne présenter que ce qui mérite l’attention maintenant.

## Préparation
- passage du camp à un plan de contenu principal unique ;
- quatre familles de navigation : Mission, Équipement, Équipe, Dossiers ;
- sous-navigation horizontale contextuelle, avec 2 à 7 entrées selon la famille ;
- bande de section sticky avec titre, résumé et compteur d’actions ;
- nouveau mode ESSENTIEL/DÉTAILS ;
- contenu analytique secondaire classé `dl43-deep`, masqué par défaut ;
- descriptions principales limitées à deux lignes en lecture essentielle ;
- renseignements déplacés dans un tiroir contextuel accessible en un clic et refermable avec Échap.

## Réglages
- regroupement des options historiques qui étaient encore des nœuds libres ;
- six catégories repliables ;
- Général ouvert au départ, cinq autres catégories fermées ;
- aides tactile, cible, impacts et réticule replacées dans la catégorie de lisibilité ;
- barre d’action de dialogue maintenue visible en bas.

## Combat
- disparition des informations non décisionnelles ;
- crédits et marque du jeu retirés du HUD d’action ;
- commandes regroupées en ARMES et OUTILS ;
- labels secondaires affichés au hover/focus seulement ;
- objectif secondaire nul supprimé ;
- états “absent / 0” filtrés ;
- pression de horde masquée au repos et restaurée dès que tier, adrénaline, packs ou pression de voie deviennent significatifs ;
- boutons tactiques désactivés masqués ;
- panneau de statut d’arme visible seulement lors des états critiques ;
- actions tactiques déplacées au-dessus du combat bar et z-index corrigé pour qu’aucun contrôle ne soit intercepté.

## Responsive et accessibilité
- conservation des focus clavier/manette de la 0.42 ;
- navigation horizontale scrollable en cas de largeur réduite ;
- tiroir renseignements presque plein écran sous 720 px ;
- variantes 980 px, 720 px et paysage court <=600 px ;
- `prefers-reduced-motion` toujours respecté ;
- attributs `aria-pressed` et `aria-hidden` synchronisés sur les nouveaux contrôles.

## Compatibilité gameplay
`ui_v43.js` reste une couche de présentation. Elle n’écrit aucune règle de dégâts, économie, munitions, génération de vague, hit-test ou balistique. Le schéma de sauvegarde demeure 12.
