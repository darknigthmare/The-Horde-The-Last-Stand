# 0.40.8 — À bonne échelle

Base exacte : archive utilisateur DERNIERE_LIGNE_0_40_7_PROJET(1).zip, jeu « Ordres de marche ».

## Personnages et sols

Le cadre de rendu du joueur de profil passe de 195 à 146 unités (−25,13 %). Les défenseurs voisins sont à 139 unités ; le joueur n’est plus surdimensionné par rapport à eux. Il s’agit des cadres des images 320 × 320, pas d’une mesure de taille humaine réelle. Les pieds restent ancrés au repère 302 de ces ressources.

Au sol, sur la route, les ponts de bateaux et les plateformes aériennes, les personnages partagent leur plan de sol. Dans le métro, les pieds se posent sur le rebord 566, au lieu de 644, au milieu de la paroi. Le rebord et l’image de la dernière voiture ont été raccordés à cette hauteur. En profondeur, les deux défenseurs visibles sont répartis de part et d’autre du poste et regardent vers leurs voies. En contrechamp, leur hauteur suit la profondeur du poste distant. Le fallback procédural conserve les mêmes dimensions.

## Mains et arme de premier plan

Le repère du modèle a été corrigé : son dessous reste sous son dessus lorsqu’il vise à gauche. Ce même repère est utilisé par l’arme, les accessoires, la marque de conversion et les animations de rechargement. Le rendu unique de premier plan de la 0.40.3 reste propriétaire de cette passe, y compris après l’obscurité.

Les avant-bras viennent de sous le cadre du canvas. La main droite est attachée à la poignée fixe. Le logement du chargeur est indépendant de cette poignée ; celle-ci ne disparaît donc plus pendant la recharge. La main gauche soutient le garde-main ou accompagne le chargeur, le barillet, la bascule, la cartouche, la chambre, le câble ou le réservoir selon le mécanisme natif. Le modèle est légèrement relevé lors des recharges pour ne pas enfouir les manipulations derrière l’interface basse. Les boîtes et réservoirs statiques dupliqués ont été retirés.

Les temps de recharge, insertions progressives, transferts de cartouches et fenêtres d’action ne sont pas modifiés.

## Effets visuels des tirs

La bouche de présentation du joueur de profil et les effets de tir suivent son image réduite. Les tireurs alliés sont identifiés lors de l’émission de leur traceur ; les sources visibles suivent les nouvelles positions, sans déplacer les tourelles ou les arcs électriques de terrain. Les grenades du joueur et du grenadier mémorisent leur point de départ visuel : une visée déplacée après le lancement ne tire plus rétroactivement la trajectoire vers la nouvelle position de l’arme.

Ces raccords sont visuels : les coordonnées de collision, les cibles, les dégâts, les vitesses d’ennemis et l’économie restent inchangés. Les 180 tirs comparés avant/après (45 armes × 4 perspectives) donnent les mêmes résultats de dégâts et de munitions.

## Contenu conservé

45 armes, 73 accessoires, 16 conversions, 24 plans, six presets, montage à blanc A/B, préparation/ravitaillement, ordres d’équipe et six circuits de Zone Noire. Pas de nouvelle campagne, de banque sonore ni de pack d’animations artistiques dans cette version.

## Limites

Les sprites de profil partagent toujours des poses. Les mains et les mécanismes sont procéduraux, pas 45 animations capturées ou dessinées individuellement. Les silhouettes des ennemis en profondeur restent celles de la base. Cette passe n’est ni un équilibrage humain des 124 étapes, ni une certification de tous les navigateurs et périphériques.
