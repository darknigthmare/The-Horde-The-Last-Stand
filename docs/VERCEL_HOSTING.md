# Dernière Ligne — Zéro Repli : livraison statique Vercel

Projet : `derniere-ligne-zero-repli` (`prj_mxwpaESVQ2JW1dy2baXHzc8vyxn9`), équipe `darknigthmares-projects`. Domaine de production affecté : https://derniere-ligne-zero-repli.vercel.app/ ; sa disponibilité doit être contrôlée sur le déploiement courant.

Révision de préparation : `bbbd3ef5afefcc9005c4f7a57f8282281dcb9d42`. L'entrée `game/JOUER_DERNIERE_LIGNE.html` fait 28 022 243 octets, SHA-256 `7edd451c079b5d72ab31acf6cc49aba4e805801271afd24972d36e49ba65e1d1`. Version effective dans le navigateur : Poste stabilisé 0.44.2.

Le fichier `game/vercel.json` conserve le build de copie testé. Réglages du projet : Framework Other/null, **Root Directory `game`**, Node.js 24.x, branche de production `main`, protection SSO désactivée pour ce site public demandé. Root Directory et Node.js sont des réglages du projet, pas des clés ajoutées au JSON de déploiement. L'installation vaut `true` et ne lance pas npm install.

La sortie `.vercel-static/` contient seulement `index.html` (copie exacte du HTML jouable), `JOUER_DERNIERE_LIGNE.html`, `manifest.webmanifest`, `assets/icons/icon.svg` et `assets/audio/manifest.json`. Les images sont déjà intégrées au HTML ; le manifeste audio courant déclare une collection de samples vide. Le deuxième nom du HTML préserve le start_url du manifeste. Le HTML de 28 Mo reste un fichier CDN statique ; aucune fonction ne le reconstruit à la requête.

Les fichiers HTML du jeu ne sont ni réécrits ni minifiés. La sortie autorisée ne contient ni sources de développement, ni rapports, ni historiques. Aucun backend, fonction applicative, base de données, secret de jeu ou abonnement payant n'est ajouté.

Le numéro de version décrit le build, pas une validation exhaustive de la partie. Les profils sauvegardés restent propres à chaque origine navigateur ; utiliser les commandes d'export/import du jeu pour transférer un profil local.

Validation : comparer les cinq fichiers HTTPS à leurs sources, ouvrir le menu Campagnes → Route du convoi → Commencer sans formation → Préparation → Tenir la nuit 01 → Passer la scène. Vérifier le combat et les vraies images sans `?test=1` ni instrumentation `window.__DL`. Un bref contrôle initial ne certifie ni fin de vague ni campagne complète.
