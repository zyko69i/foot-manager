# MIMOUNI Soccer Stats

Application de gestion de club de football (U6-U18).
Site : https://foot-manager-umber.vercel.app
GitHub : https://github.com/zyko69i/foot-manager

## Modules
Tableau de bord, catégories (joueurs), fiches individuelles style FIFA, évaluations mensuelles des compétences (0-99), historique de progression, matchs, présences détaillées (présent, absent, excusé, retard), convocations, documents, terrains et entraînements avec fiches pédagogiques détaillées (objectifs, intensité, exercices, minutage, matériel, sécurité, bilan et joueurs ciblés), contacts, paramètres, export CSV et sauvegarde/restauration JSON.

## Installations
1 grand terrain synthétique, 2 grands terrains en herbe, 1 gymnase (entraînement uniquement).
Découpage des grands terrains : U6-U8 en 6, U9-U13 en 2, U14+ terrain entier (constante SPLIT dans common.js).

## Installation et fonctionnement
Application statique HTML/CSS/JavaScript, déployée sur Vercel à chaque push sur main.
Application web progressive (PWA) : ajout possible à l'écran d'accueil sur les appareils compatibles et mise en cache des pages pour consultation hors connexion après le premier chargement.
Les données sont enregistrées dans le stockage local du navigateur. Elles restent propres à chaque appareil et navigateur : pas de compte, pas de synchronisation entre utilisateurs/appareils et pas de stockage cloud à ce stade. Faire régulièrement une sauvegarde JSON depuis Export.

## Version
Version 6 : suivi des présences par séance et par type (entraînement, match, autre), avec statuts présent, absent, excusé et en retard. Les feuilles sont historisées par date et catégorie, exportables en CSV et incluses dans les sauvegardes JSON. Le cache PWA est renouvelé pour diffuser la mise à jour.


## Fiches joueurs et progression
Chaque joueur dispose d'une fiche individuelle avec 22 compétences notées de 0 à 99 : physiques, techniques, tactiques, mentales et gardien. L'entraîneur réalise une évaluation mensuelle, renseigne le contexte (entraînements, matchs, minutes, buts, passes, présence) et ajoute ses observations. La note globale est une moyenne indicative des 22 compétences ; elle ne constitue pas une mesure automatique ou scientifique du niveau. L'historique conserve les évaluations mois par mois. Les évaluations sont incluses dans les sauvegardes JSON.


## Préparation des séances
Depuis Terrains et entraînements, le bouton « Préparer séance » ouvre une fiche liée au créneau : date, entraîneur, objectif, intensité, groupe de joueurs, déroulé minuté (échauffement, atelier principal, jeu, retour au calme), matériel, sécurité et bilan. Les préparations sont incluses dans les sauvegardes JSON. Le suivi des présences reste géré séparément dans le module Présences.
