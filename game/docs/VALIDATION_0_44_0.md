# Validation 0.44.0 — QA intégrale

## Résultat compté
471 / 471 contrôles entièrement terminés, répartis dans 12 suites.

| Bloc | Résultat |
|---|---:|
| QA ×4 intégrale | 30/30 |
| Architecture UI 0.44 | 36/36 |
| Régression globale | 51/51 |
| Syntaxe | 4/4 |
| Fronts / contrechamp | 20/20 |
| Profondeur / géométrie | 9/9 |
| Cohérence moteur / armurier | 31/31 |
| Balistique | 180/180 cas |
| Spatial | 38/38 |
| Sécurité montage | 18/18 |
| Sécurité ordres / pause | 50/50 |
| Production protocoles | 4/4 |

## Couverture
- huit familles jouables : campaign, north, metro, air, highway, water, tower, dark ;
- 45 armes dans quatre vues pour la balistique ;
- vue avant, arrière et latérales ;
- Armurier, presets, conversions, stand et rapports ;
- pause, Situation du poste, devis et reprises ;
- sauvegarde/export/import schéma 12 ;
- parcours production sans `window.__DL` ;
- 1920×1080, 1280×720, 896×414 et 414×896 ;
- erreurs JavaScript surveillées sur les parcours critiques.

## Défauts corrigés pendant la passe
1. Ancienne couche du menu reprenant « À propos » en 0.41.0 après navigation.
2. Échap de « À propos » dépendant d'un état de phase fragile.
3. Texte complet d'objectif pouvant être remplacé par sa version compacte.
4. Libellés/états accessibles incomplets sur plusieurs commandes HUD.
5. Barre d'action de « Situation du poste » débordant horizontalement de 26 px.

## Tests anciens non comptés
Certaines suites historiques Atelier/Montage/Protocoles sont monolithiques et dépassent la fenêtre d'exécution avant leur dernier contrôle. Les sections effectivement exécutées étaient vertes, mais elles ne sont volontairement pas ajoutées au total. Le segment production des protocoles a été isolé et rejoué séparément (4/4).
