> **Livraison courante : 0.44.1.** Ouvrir `JOUER_DERNIERE_LIGNE.html` pour jouer.
> Les corrections, commandes et résultats actuels sont décrits dans le [README du dépôt](../README.md) et le [suivi 0.44.1](../docs/SUIVI_0_44_1.md).
> Le document ci-dessous conserve les descriptions et totaux historiques de septembre pour la 0.44.0 ; ces totaux ne désignent pas les tests exécutés pour la 0.44.1.

---

# DERNIÈRE LIGNE — ZÉRO REPLI
## 0.44.0 « QA intégrale — Poste stabilisé »

Extraire ce dossier puis ouvrir **JOUER_DERNIERE_LIGNE.html** dans un navigateur récent. Le jeu reste autonome et jouable hors ligne.

### But de cette version
La 0.44.0 ne rajoute pas artificiellement de systèmes : elle reprend la 0.43.0 comme si **quatre testeurs QA différents** parcouraient le jeu entier avec quatre priorités : fonctionnement, UX/navigation, combat/spatial et cas extrêmes.

### Corrections principales
- **À propos / menu** : après certaines navigations, une ancienne couche pouvait rétablir brièvement la version 0.41.0 et son ancien gestionnaire. La couche 0.44.0 garde maintenant l'autorité dès le clic, au clavier comme à la souris.
- **Échap dans À propos** : fermeture fiable même lorsqu'une couche legacy a modifié l'état interne de navigation.
- **Objectif HUD compact** : la version courte ne peut plus écraser définitivement le texte complet utilisé pour les détails.
- **Accessibilité HUD** : Pause/Reprendre, audio et plein écran exposent maintenant un libellé et, lorsque pertinent, un état accessible.
- **Situation du poste** : suppression d'un débordement horizontal de 26 px de la barre d'action. Vérifié à 1440×900, 896×414 et 414×896.

### Quatre profils QA
1. **Fonctionnel / chaos** — Campagne, Nord, Métro, ARGO-17, Autoroute, Eaux Noires, Ascension et Zone Noire avec tirs, recharges, grenades, changements de priorité et contrôle des ressources.
2. **UX / navigation** — menu, préparation, sous-menus, mode Essentiel/Détails, renseignements, À propos, Échap, focus et densité d'information.
3. **Combat / spatial** — 45 armes, quatre vues, contrechamp, armes/mains, alliés, projectiles, Armurier, conversions et balistique.
4. **Extrêmes / sauvegardes** — schéma 12, profils incompatibles, exécution sans API de test et résolutions 1920×1080, 1280×720, 896×414 et 414×896.

### Validation comptée
**471/471 contrôles entièrement terminés**, dans 12 suites : QA ×4, architecture UI, régression globale, syntaxe, fronts, profondeur, cohérence, 180 cas balistiques, spatial, sécurité montage, sécurité ordres et parcours production protocoles.

Les anciennes suites monolithiques Atelier/Montage/Protocoles ont aussi été explorées, mais lorsqu'une exécution dépasse sa fenêtre avant la fin, elle n'est pas comptée comme validée. Le dernier parcours production des protocoles a été isolé et validé séparément 4/4.

Voir :
- **RAPPORT_QA_0_44_0.html**
- **rapports/FINAL_0_44_0_QA.json**
- **docs/VALIDATION_0_44_0.md**
- **docs/CHANGEMENTS_0_44_0.md**

### Compatibilité
- schéma de sauvegarde : **12**, inchangé ;
- aucun changement volontaire des dégâts, prix, économie ou règles de vagues dans la couche UI 0.44 ;
- les améliorations 0.41, 0.42 et 0.43 restent intégrées.

### Reconstruction
```text
node build.mjs
```
