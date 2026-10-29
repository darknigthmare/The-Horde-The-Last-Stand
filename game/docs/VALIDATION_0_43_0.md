# Validation — 0.43.0 « Clarté de terrain »

La passe 0.43.0 a été validée à la fois comme couche UI et comme modification susceptible d’interagir avec les contrôles du vrai moteur.

## Suites terminées
- `tests/ui_v43.py` : **45/45** — structure, progressive disclosure, responsive, absence de mutation gameplay et build reproductible ;
- `tests/ui_v43_runtime.py` : **36/36** — vrai DOM/runtime, quatre familles du camp, détails, tiroir renseignements, réglages, HUD compact, états contextuels et absence de débordement ;
- `tests/regression_043.py` : **51/51** — armurier, Zone Noire, réparations, sauvegarde, sept familles de missions, parcours production et petits viewports ;
- `tests/syntaxe.py` : **4/4** scripts livrés analysés par Node ;
- `tests/fronts_0410.py` : **20/20** — contrechamp, largeur de horde, impacts et transitions ;
- `tests/depth_0410.py` : **9/9** — profondeur, joueur distant, hit-test et traceurs ;
- `tests/ballistics_0410.py` : **4/4** assertions, couvrant **180/180 cas** (45 armes × right/left/front/rear).

Total : **169/169 contrôles terminés**, plus **180/180 cas balistiques**.

## Points UI vérifiés en runtime
- aucune barre de combat au menu ou au camp ;
- quatre familles principales seulement ;
- maximum sept sous-sections visibles par famille ;
- détails secondaires réellement masqués au départ ;
- tiroir renseignements dans le viewport, ARIA synchronisé et fermeture Échap ;
- six catégories de réglages, une seule ouverte par défaut ;
- deux groupes d’actions combat ;
- absence d’objectifs secondaires vides et d’états tactiques “absents” ;
- pression calme et actions indisponibles réellement masquées ;
- retour automatique des informations quand elles redeviennent utiles ;
- pas de débordement horizontal à 1440×900 ni à 900×600 ;
- aucune erreur JavaScript observée dans la QA dédiée.

## Suite non comptée
La suite spatiale exhaustive historique a dépassé la fenêtre d’exécution de la passe lors d’un batch long. Elle n’est donc **pas** annoncée comme réussie pour la 0.43.0. Les vérifications focalisées `fronts_0410`, `depth_0410` et les 180 cas balistiques se sont, elles, terminées complètement.
