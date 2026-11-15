# Obscura — intégration du 16 novembre 2026

## Portée

Le skill officiel [Obscura](https://github.com/h4ckf0r0day/obscura), révision
`0d9a2f764ffdb097269da048002c593865e83a9e`, est disponible dans les dossiers
de skills du dépôt pour Codex et Claude Code. Les deux copies du skill et de sa
licence Apache-2.0 sont identiques aux fichiers amont. Le [guide local](../.ai-tools/obscura/README.md)
et la [provenance épinglée](../.ai-tools/obscura/source.json) décrivent l'activation
de l'outil et les archives du runtime.

L'intégration ajoute six fichiers d'outillage. Elle conserve la version du jeu
0.44.2, son moteur, son build et ses sauvegardes. Aucun exécutable Obscura,
worker, hook ou serveur MCP n'est installé ou exécuté par cette modification.

Les 12 guides gamedev et leurs 40 fichiers amont restent vérifiés par leur
verrou existant, conservé octet pour octet. Obscura possède sa provenance
indépendante. Le contrôle d'inventaire accepte seulement ses deux fichiers
prévus sous `.agents/`, puis vérifie séparément les six fichiers du paquet par
taille et SHA-256. Les fichiers inconnus restent refusés.

## Vérifications exécutées

Base vérifiée : `bbbd3ef5afefcc9005c4f7a57f8282281dcb9d42`.

```sh
python3 scripts/verify_repository.py --report artifacts/repository-verification.json
git diff --check
```

Le contrôle du dépôt réussit avant et après l'ajout, avec Node.js `v24.22.1` :

- 467 fichiers de jeu empreints, 468 fichiers avec le manifeste ;
- 12 guides gamedev, 40 fichiers amont, 21 références locales et deux scripts
  Python parsés ;
- six fichiers Obscura conformes, avec deux copies du skill ;
- HTML jouable et rapport `PATCHES_0_44_2.json` reconstruits à l'identique dans
  une copie temporaire ;
- quatre scripts JavaScript intégrés parsés ; build de 28 022 243 octets et
  46 patches ;
- aucun défaut d'espacement signalé par Git.

Huit scénarios isolés ont aussi vérifié le contrôle d'intégrité : le paquet
conforme est accepté ; une modification d'un guide existant, du skill Obscura
ou de sa provenance est rejetée ; une licence Claude absente est rejetée ; un
guide inconnu ainsi que des fichiers supplémentaires dans chacune des deux
copies Obscura sont rejetés. Les fichiers utilisés pour ces scénarios sont des
copies temporaires, sans mutation des guides livrés.

Les rapports et captures historiques du jeu restent intacts. Aucun nouveau
playtest navigateur ou test de campagne n'a été exécuté pour cet ajout
d'outillage. La disponibilité effective du binaire et le chargement du skill
dans une session Codex ou Claude Code restent à vérifier dans l'environnement
qui utilisera Obscura.
