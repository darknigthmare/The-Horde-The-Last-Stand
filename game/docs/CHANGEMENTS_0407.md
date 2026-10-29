# Ordres de marche — détails de la passe 0.40.7

## Préparation et progression

La page Préparation est organisée en six rubriques repliables : points à vérifier, armes, défenseurs/fouille, pièges/alimentation, consigne/contacts lourds et reprise/sauvegarde. Les alertes mènent aux onglets natifs. Les 27 conseils sont répartis entre les neuf familles de route ; ce sont de nouveaux textes contextuels, pas 27 missions.

Les informations sont lues dans le run et les definitions courantes. Les lectures répétées ne lancent aucune nouvelle vague et ne modifient ni les stocks ni la graine de la préparation. Une préparation sans alerte n'est pas une garantie de victoire.

## Révision groupée du poste

Le devis reprend les prix et plafonds natifs : poste 2 CR par point, santé 2 CR par point, un lot de munitions par arme équipée, consommables 85/120/90 CR, leurre 70 CR, carburant au prorata de 60 CR les 100 unités, munitions de tourelle 1 CR par tir, charge locale au prix du terrain. Dans Zone Noire : fusible 90 CR et révision complète d'une voie à 70 CR, comme au tableau Lumière.

Aucune ligne n'est sélectionnée à l'ouverture. Le devis n'applique rien avant validation. Il garde en caisse la solde de l'équipe active, hors allié envoyé en fouille ou interdit par un défi. La solde est facturée par le véritable départ de mission, pas par le devis.

Les achats sélectionnés empruntent une seule transaction native `buy`. Le chargement facultatif utilise `campMagazinePlan` après la livraison. Le pistolet garde sa réserve de secours infinie dans la campagne ; les autres armes consomment leur réserve réelle. Aucune modification d'arme, vente de pièce ou recrutement automatique n'est ajouté.

Le devis devient caduc si la préparation, l'équipe, le montage, les améliorations/doctrines, les réserves ou le budget changent. Une autre route ne peut pas recevoir l'ancien panier. Le panneau fonctionne aussi avec les conditions des opérations. La révision des circuits ne restaure jamais la barricade.

## Alliés et combat

Noor, Sami et Lina (ARGO-17), Nadir et Soraya (Autoroute), Tarek et Léonie (Eaux Noires), Sana et Hugo (Ascension) étaient offerts dans le recrutement partagé mais leurs fonctions étaient limitées au tick de leur route. Les mêmes réserves natives existent et s'écoulent maintenant lors de leur déploiement sur une autre route. Sur leur route d'origine, la fonction n'est pas exécutée une seconde fois.

Leur solde, puissance, cadence, stocks et conditions de réparation ne sont pas augmentés. La protection d'un poste détruit reste celle du mécanisme natif. Sana utilise une cible réellement visible, en respectant la voie prioritaire ; sa fiche décrit ce comportement réel au lieu de promettre une analyse de pression non implémentée.

Le sélecteur des cibles spéciales reconnaît les boss du registre natif ainsi que les nouvelles menaces de soutien, à distance et protégées. La préférence explicite haute/basse conserve la priorité sur le type de cible. Les cibles mortes, masquées ou hors entrée restent exclues.

La marque de Lina expire aussi sur un ennemi terrestre. Le +18 % de dégâts reste réservé aux impacts directs du joueur comme annoncé ; il ne s'applique plus aux balles d'autres alliés.

Les techniciens/écouteurs de Zone Noire restent liés aux circuits. La Préparation signale leur présence sur une autre route ; elle ne les licencie ni ne les remplace silencieusement.

## Situation du poste en pause

La fiche est une lecture seule : état de la défense/santé, chargeurs et réserves, moyens restants des alliés, alimentation, charge locale, incident actif et six circuits. Aucun ennemi caché n'est compté ni localisé. La pause et le retour n'avancent pas les tirs, rechargements, ennemis ou frais. Le bouton Retour retourne à la pause ; Reprendre reste explicite.

L'état électrique en pause utilise les mêmes conditions qu'en combat. Une coupure ne devient plus artificiellement « en ligne » parce que le menu de pause est ouvert.

## Contenu préservé

45 armes, 73 accessoires, 16 conversions, 24 plans, six presets ; montage à blanc, exercices contrôlés A/B, campagnes et opérations ; sprites restaurés, mécanismes de recharge et six circuits. Aucun nouveau prix de campagne, coefficient de dégâts d'arme, récompense ou déblocage automatique.
