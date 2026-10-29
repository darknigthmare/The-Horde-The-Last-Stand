# Validation 0.41.0 — Fronts vivants

Cette page ne compte que les suites **terminées intégralement sur la build 0.41.0 finale**. Les anciens rapports restent dans le projet pour l’historique, mais ne sont pas additionnés ici.

| Suite | Résultat | Portée |
|---|---:|---|
| Syntaxe | 2/2 | chargement et parsing |
| Régression principale | 51/51 | menus, Armurier, presets, Zone Noire, modes, responsive, production |
| Spatial 0.41.0 | 38/38 | échelle, FPS avant, contrechamp, mains/recharge, projectiles, vues, dégâts |
| Profondeur / contrechamp | 9/9 | absence d’arme arrière, survivant, bandes, hit-test, traceurs |
| Fronts vivants | 20/20 | largeur réelle, doublon supprimé, impacts, alliés, grenades, transitions |
| Balistique exhaustive | 4/4 | quatre groupes de vues, couvrant 180 comparaisons |

**Total des assertions : 124/124.**

En plus, la suite balistique compare **45 armes × 4 vues = 180 cas** à la base de référence 0.40.7 : **180/180 identiques** sur dégâts, munitions, kills, tirs et hits logiques.

Les anciennes suites très longues `montage_safety.py` et `orders_safety.py` ont également été relancées partiellement sans échec dans les sections atteintes, mais elles ont dépassé leur fenêtre d’exécution ; elles ne sont volontairement pas incluses dans le total ci-dessus.
