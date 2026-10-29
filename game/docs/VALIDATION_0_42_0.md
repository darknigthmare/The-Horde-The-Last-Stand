# Validation — 0.42.0 « Poste de commandement »

La validation finale combine des tests spécifiques à la nouvelle couche UI et les gardes de non-régression du jeu.

## Couche UI
- injection CSS/JS reproductible ;
- boot et transition de scène ;
- Fullscreen API + F10 ;
- légende clavier/manette ;
- focus clavier ;
- menu, préparation, cartes, renseignements et dialogues ;
- HUD, boss, progression de horde et stand de tir ;
- formulaires et tableaux ;
- responsive et réduction des animations ;
- absence d’accès réseau et de mutations directes des règles de gameplay.

## Non-régression conservée
- contrechamp 0.41.0 ;
- spatial quatre vues ;
- profondeur et montage d’armes ;
- 45 armes contrôlées dans quatre vues ;
- syntaxe et reconstruction autonome.

### Résultat de la passe finale
- UI/UX : 42/42 ;
- régression fonctionnelle : 51/51 ;
- fronts / contrechamp : 20/20 ;
- profondeur : 9/9 ;
- balistique : 4/4 assertions et 180/180 cas ;
- spatial : 38/38 ;
- sécurité montage : 18/18 ;
- syntaxe : 3/3.

Total des suites entièrement terminées : **185/185 assertions**, plus **180/180 cas balistiques**. Une suite historique de sécurité des ordres a dépassé sa fenêtre d’exécution et n’est donc pas comptée comme réussie. Voir `rapports/FINAL_0_42_0_QA.json`.
