# CoC7 – Suivi des Bonds du groupe

Module compagnon de **CoC7 – Suivi de Chance du groupe** et **CoC7 –
Suivi de Santé Mentale du groupe**, même style Art Déco, pour Foundry VTT
(V13/V14) + système **CoC7**.

## Ce qu'il fait

Ajoute un bouton (icône chaîne 🔗) dans la barre de contrôles à gauche de
l'écran, dans le groupe **Jeton**. Un clic ouvre/ferme une fenêtre qui
liste, pour chaque investigateur joueur, ses **Bonds** (Liens) : les
relations importantes (famille, ami, collègue...) qu'un investigateur
peut sacrifier lors d'un jet de folie temporaire ou indéfinie ("Que
ferais-tu pour sauver ce Lien ?").

Contrairement au système CoC7 lui-même, qui ne stocke pas les Bonds
comme un champ dédié, ce module gère ses propres données : tu peux
ajouter, marquer comme rompu, ou supprimer un Bond directement depuis la
fenêtre, sans passer par la fiche du personnage.

Les personnages sont regroupés par époque (1933 / 2025-2026), en
réutilisant l'affectation déjà faite dans le module Chance si tu l'as
installé — pas besoin de la refaire.

## Installation

1. Décompressez le dossier `coc7-bonds-tracker` dans
   `[DonnéesFoundry]/Data/modules/coc7-bonds-tracker`
2. Activez-le dans **Configuration du monde → Gérer les modules**.
3. Le bouton chaîne apparaît dans le groupe d'outils "Jeton", à côté des
   boutons Chance/Santé Mentale si ces modules sont aussi installés.

## Utilisation

- **Ajouter un Bond** : tape un nom (obligatoire) et une note facultative
  dans les champs en bas de la fiche d'un investigateur, puis clique sur
  **+**.
- **Rompre / Restaurer** : clique sur le bouton à droite du Bond pour
  basculer son état. Un Bond rompu s'affiche barré, en cramoisi.
- **Supprimer** : clique sur le ✕ pour retirer définitivement un Bond de
  la liste (utile en cas d'erreur de saisie).

## Personnalisation rapide

- **Rendre le bouton visible aux joueurs** : dans
  `scripts/bonds-tracker.js`, ligne `visible: game.user.isGM,` →
  remplacez par `visible: true,`.
- **Couleurs** : variables CSS en tête de `styles/bonds-tracker.css`.
