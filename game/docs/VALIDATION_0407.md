# Validation de la 0.40.7 « Ordres de marche »

Base exacte : `base/0.40.6.html`, SHA-256 `30767fedc2ab789f2e29f0bd9cbe6af1d27f6dd47d4a2b7a17bdf88b8f0c183f`.
Build testée : `JOUER_DERNIERE_LIGNE.html`, SHA-256 `851d9589bfc89c57bf4eba422c969e447cff7eb9fd688249c9ef5486b6115417`.

## Résultats exécutés

724/724 contrôles navigateur groupés : 569 hérités et 155 nouveaux.
268/268 contrôles des pixels, marges et ancrages des ressources restaurées.
2/2 scripts inline analysés par Node.
252/252 images d'origine chargées pour les captures complètes.

- syntaxe.py : 2/2, code retour 0, 1.92 s.
- regression_0401.py : 51/51, code retour 0, 9.05 s.
- atelier.py : 79/79, code retour 0, 28.24 s.
- coherence.py : 31/31, code retour 0, 13.67 s.
- visuel.py : 69/69, code retour 0, 20.25 s.
- gestes.py : 35/35, code retour 0, 22.94 s.
- images.py : 268/268, code retour 0, 3.16 s.
- montage.py : 97/97, code retour 0, 44.4 s.
- montage_safety.py : 18/18, code retour 0, 6.96 s.
- protocols.py : 139/139, code retour 0, 136.76 s.
- protocols_safety.py : 50/50, code retour 0, 23.19 s.
- orders.py : 99/99, code retour 0, 27.64 s.
- orders_safety.py : 50/50, code retour 0, 18.09 s.
- before_after_0407.py : 6/6, code retour 0, 3.5 s.

## Ce que les nouvelles suites vérifient

Le devis effectue de vraies transactions aux prix natifs, sans casser les frais de départ, les réserves, le chargement, les presets ou les autres campagnes. Les cas périmés, budgets à un crédit près, stocks partiels/pleins, crédits manquants, absence d'alliés, contrainte sans soins, fermeture et reprise après défaite sont exercés.

Les neuf spécialistes sont testés sur leur propre route et sur la campagne principale, dans les quatre vues (72 contrôles d'action contrôlée), puis avec leur pool épuisé. Aucun rechargement de pool implicite n'est accepté. Ces cibles et positions sont arrangées pour mesurer l'action, pas des playtests humains.

La priorité vise les boss et types spéciaux récents sans ignorer la voie demandée. La marque ne bonifie plus les tirs alliés et expire sur les contacts terrestres. Sana ne tire pas sur une cible cachée.

La situation en pause est ouverte dans les huit campagnes directement démarrables, puis fermée et reprise. Les armes, timers, ennemis et réserves restent figés. Les tableaux ne révèlent pas la silhouette cachée. Trois formats (1440×900, 896×414, 414×896) contrôlent également le débordement interne des dialogues et le focus.

Les 124 étapes de préparation sont rendues : leurs parcours ne constituent PAS 124 victoires humaines. Les anciennes suites de combat, armurerie, A/B et contrôles de niveaux sont rejouées séparément.

## Avant / après reproductible

`before_after_0407.py` charge la 0.40.6 et le build final. Même scénario : Noor hors ARGO-17 n'infligeait aucun dégât et n'avait pas de pool ; elle inflige un tir natif de 42 dégâts et conserve 49/50 cartouches. L'observatrice choisissait un rôdeur devant le boss récent ; le boss est désormais reconnu. Les 10 dégâts alliés devenaient 11,8 sur une cible marquée, ils restent 10. La marque d'un contact terrestre restait à 6 s après 6,1 s de simulation ; elle atteint 0. Une coupure redevenait affichée active en pause ; elle reste maintenant coupée.

## Méthode et limites

Les matrices utilisent le vrai HTML et ses fonctions lexicales natives, pas une VM avec un moteur de substitution. Les URI des grandes images sont remplacées par un pixel seulement pour les matrices rapides. Les captures utilisent le HTML complet et les ressources originales. Le stockage en mémoire sert uniquement au banc `about:blank`. Le jeu livré n'installe aucun faux stockage.

Les accès directs file/HTTP sont bloqués dans cet environnement ; Chromium reçoit le document via injection. Les chiffres ne certifient pas Safari, les téléphones réels ou une manette physique. Il n'y a ni revendication de QA humaine exhaustive ni certification d'équilibrage des campagnes.

Les réserves, chronomètres et cibles sont explicitement arrangés dans certains tests. Les morts/victoires forcées dans les anciennes suites restent des contrôles de transitions uniquement. Cette passe n'ajoute aucun modèle artistique, banque audio enregistrée, exécutable signé, cloud, mise à jour distante ou certification commerciale.
