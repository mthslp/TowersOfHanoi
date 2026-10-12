# Tours de Hanoï — jeu, démonstration et mathématiques

**Jeu en ligne : <https://mthslp.github.io/TowersOfHanoi/>**

Site statique (HTML, CSS et JavaScript natifs — aucune dépendance) consacré au
célèbre problème des tours de Hanoï, imaginé par Édouard Lucas en 1883.

## Ce que contient le site

- **Jeu** — partie libre avec **3 à 6 piquets** (1 à 10 disques) : coups légaux
  surlignés, annulation, compteur comparé au minimum, et lecture automatique de la
  **solution optimale** (algorithme récursif pour 3 piquets, Frame–Stewart au-delà).
- **Démonstration pas à pas** — l'algorithme affiché à côté du plateau, ligne
  courante surlignée, explication de chaque étape et **pile d'appels** en direct :
  - 3 piquets : **algorithme récursif** *et* **algorithme itératif** (comparez-les :
    les coups sont identiques, le raisonnement diffère) ;
  - 4 piquets : **Frame–Stewart**, avec le tableau de calcul de la coupure optimale
    *k* à chaque sous-problème (129 coups pour 15 disques, contre 32 767 !).
- **Maths & Info** — récurrence `T(n) = 2·T(n−1) + 1 ⟹ 2ⁿ − 1`, preuves
  d'optimalité, lien avec le binaire et le code de Gray, graphes de Hanoï et
  fractale de Sierpiński, conjecture de Frame–Stewart (résolue pour 4 piquets par
  Bousch en 2014, ouverte au-delà).
- **Sources** — bibliographie complète avec liens externes (Wikipédia, CNRS,
  MathWorld, arXiv, SIAM, OEIS, Springer…).

## Lancer le site localement

```bash
git clone git@github.com:mthslp/TowersOfHanoi.git
cd TowersOfHanoi
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Aucune étape de build n'est nécessaire : le site est directement servi par
GitHub Pages via le workflow `.github/workflows/deploy-pages.yml`.

## Arborescence

```
.
├── index.html                     # les 4 onglets (Jeu, Démonstration, Maths & Info, Sources)
├── css/style.css                  # mise en page, animations, thème clair/sombre
└── js/
    ├── core.js                    # état du jeu, validation des coups, plateau SVG animé
    ├── algorithms.js              # T_p(n), récursif, itératif, Frame–Stewart
    ├── game.js                    # onglet Jeu (interactif)
    ├── demo.js                    # onglet Démonstration pas à pas
    └── app.js                     # navigation entre les onglets
```

## Auteur

Mathis Le Port — [mthslp](https://github.com/mthslp)
