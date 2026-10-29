# Validation de la 0.40.8

## Suites réellement exécutées sur le fichier livré

- 761/761 contrôles navigateur groupés, dont 724 hérités et 37 nouveaux contrôles spatiaux.
- 268/268 contrôles pixels, transparence et marges sur les ressources conservées.
- Syntaxe : tous les scripts intégrés inspectés par le test syntaxe.py.
- Captures : 252/252 images décodées dans chaque version, aucun échec de chargement ni erreur JavaScript.

Les titres attendus de deux tests historiques ont été mis à jour pour la 0.40.8. Les autres assertions de non-régression sont conservées. Le test de matrice Canvas utilise une tolérance d’ancrage de 0,001 unité pour absorber les arrondis internes flottants de Chromium ; il observe les vrais appels de dessin et ne les remplace pas.

## Nouveaux échantillons

84 dispositions (sept familles × quatre vues × trois résolutions), 1 350 poses de visée (45 armes × deux vues FPS × trois résolutions × cinq positions), 270 observations des matrices de dessin, 110 poses de rechargement, tirs du défenseur visible dans quatre caméras, deux trajets de grenades avec changement de visée, et 180 comparaisons balistiques directes entre la 0.40.7 et la 0.40.8.

Les suites héritées arrangent les 124 étapes en état de combat dans quatre vues (496 rendus, 37 sites distincts). Ce ne sont pas 124 missions jouées et gagnées humainement. Les tests des circuits noirs, des achats, des stocks, des devis, de la sortie du stand et des profils sont conservés.

## Captures

40 captures comparatives intégrales (20 cas avant et après) et 148 captures de galerie (37 décors × quatre vues). Une sélection et quatre planches de contact ont été inspectées visuellement. Les scènes sont arrangées pour contrôler le rendu ; elles peuvent montrer des avertissements de préparation parce que leurs états de campagne ne constituent pas des parcours sauvegardables. Les notifications fugitives sont masquées à l’identique avant/après, jamais dans le jeu livré. La galerie conserve les captures complètes. Les recadrages du rapport sont identifiés comme tels.

## Méthode et limites

Les matrices rapides remplacent seulement les grandes URI raster par un pixel. Le code moteur, les règles et le DOM sont réels. Les captures utilisent les ressources originales, chargées dans Chromium par injection du document (about:blank). Le stockage est en mémoire uniquement dans le banc de capture. L’HTML n’a pas été certifié sur Safari, appareils mobiles réels ou manettes physiques. Les scripts ne prétendent pas mesurer le plaisir de jeu ni un framerate matériel universel.

Les détails sont dans rapports/SYNTHESE.json, SPATIAL_QA.json, VISUEL_QA.json et CAPTURES_0408.json. Le rapport de paquet accompagne les téléchargements : CRC, chemins sûrs, manifeste SHA-256 et reconstruction dans un dossier vierge.
