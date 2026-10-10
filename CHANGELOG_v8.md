# Outil ROI IA Hospitalière — v8.0 (10 octobre 2026)

Application web progressive (PWA), installable sur smartphone sans passer par un store, fonctionnant hors ligne. Base : fichier `index.html` v6.5 fourni le 10 octobre, reconstruit en architecture modulaire (option B) ; les contenus de la v7.0 du 31 août retrouvée sur le OneDrive (`roi-ia/index.html` : famille environnementale, effort/récompense, garantie humaine, omnibus numérique) ont été repris à l'identique dans les données, puis complétés par les deux nouveaux profils demandés.

Validation : 52 tests Playwright headless (desktop 1280 px et iPhone 13), 0 erreur console, 0 défilement horizontal sur mobile, mode hors ligne vérifié (service worker), PDF d'impression généré, liens de sauvegarde v6 relus (migration automatique des scores).

## 1. Nouvelle architecture : cinq écrans, navigation d'application

- **Accueil** : reprise de la dernière évaluation, cinq exemples (dont CLCC et groupe mutualiste), présentation des livrables.
- **Évaluer** : contexte → assistant une dimension par page (balayage tactile, pastilles d'avancement, questions guidées, option « non évalué ») → résultats.
- **Comparer** : trois modes dans un même écran, à partir des évaluations enregistrées ou de liens collés : deux solutions · atelier multi-acteurs (2 à 6) · suivi dans le temps (2 à 5). Les trois modules « morts » de la v6.5 (atelier, suivi, benchmark) sont réécrits et actifs.
- **Mes évaluations** : bibliothèque locale (localStorage) avec enregistrement automatique à l'affichage des résultats, ouverture, copie du lien, duplication (point de suivi daté), renommage, suppression, export / import JSON. Les coches de la feuille de route et de la checklist sont conservées avec l'évaluation.
- **À propos** : articles de référence, auteurs (Aloui, Tran, Le Goff-Pronost), aide et mode d'emploi, neuf familles, sept profils, glossaire avec recherche (46 entrées), contact.
- Navigation basse sur mobile (cinq onglets, pastille de compteur), onglets hauts sur ordinateur, bouton d'aide permanent, indicateur hors ligne, retour arrière du navigateur pris en charge.

## 2. Grille : neuf familles (alignement article ARAMOS 2026)

- Nouvelle famille **Valeur environnementale** 🌱 : e1 empreinte directe, e2 gains indirects et bilan net, e3 inscription RSE et redevabilité. Les anciens critères fi3 et a4 sont retirés de leurs familles et **migrés automatiquement** (fi3 → e1, a4 → e3) dans les liens v6.
- **Acceptabilité et appropriation** : + a5 équilibre effort / récompense, + a6 renforcement du collectif de travail.
- **Cadre contraint (médical)** : questions sur la garantie humaine (art. L. 4001-3 CSP) et sur la qualification déployeur / fournisseur (AI Act art. 25).
- **Mutualisation** (fi4) activée pour GHT, groupe de cliniques et groupe mutualiste, avec une question sur la négociation centralisée.
- 28 critères pour un projet médical (29 avec fi4).

## 3. Sept profils d'établissement

| Profil | Accent de pondération |
|---|---|
| CHU / CHR | cadre contraint 4, financier 4 |
| Centre hospitalier | acceptabilité 4, dettes 4, financier 4 |
| **Centre de lutte contre le cancer** (nouveau) | valeur clinique 5, cadre contraint 5, acceptabilité 4 ; alerte dédiée (haut risque oncologie, données sensibles, essais cliniques, comité d'éthique, réseau Unicancer) ; cinq actions spécifiques dans la feuille de route |
| Clinique privée | stratégique 4, cadre 4, financier 4 |
| Groupe de cliniques | idem clinique + mutualisation inter-sites, alerte lock-in à l'échelle du groupe |
| **Groupe mutualiste** (nouveau) | acceptabilité 4, dettes 4 (SI hétérogène), environnement 3 (RSE), mutualisation ; alerte gouvernance fédérale ; cinq actions spécifiques |
| GHT public | f1 4, stratégique 4, acceptabilité 4, dettes 4, environnement 3, mutualisation |

Chaque profil porte une description affichée au choix, un bonus / malus de maturité et des actions de feuille de route propres.

## 4. Modules de résultats

- Score pondéré, verdict, cinq indicateurs (dont couverture des critères renseignés), barres par dimension, radar neuf familles.
- Points d'attention : critiques, vigilances, angles morts, alerte profil, risque RPS, **calendrier réglementaire dynamique** (règlement (UE) 2026/1744 : obligations haut risque reportées au 2 décembre 2027 et au 2 août 2028 ; articles 4, 5 et 50 applicables depuis le 2 août 2026), rappel du modèle OPEX.
- Recommandations opérationnelles, **feuille de route priorisée** (avant de signer / avant le pilote / avant la généralisation) cochable, générée par 29 règles + actions de profil.
- **Balance effort / récompense** (Siegrist) : dix curseurs 0–3, rapport, quatre bandes, leviers de récompense, alerte, actions de feuille de route, ligne de synthèse exécutive ; conservée dans le lien (`er`).
- Maturité de l'établissement, pondérations ajustables (1–5) avec **analyse de sensibilité**, calculateur **règle des cinq ans** (trois scénarios d'adoption, seuil de rentabilité, alerte coûts cachés > 30 %), benchmark anonymisé (si `benchmark.json` avec n ≥ 5), détail des critères, **synthèse exécutive** une page, transmission anonymisée (Netlify Forms), lien de sauvegarde, impression.
- **Fiche pratique** : feuille de route et **34 questions à poser à l'éditeur** (30 + consommation énergétique, effort quotidien réel, qualification déployeur / fournisseur, garantie humaine), imprimable.

## 5. PWA et mobile

- `manifest.webmanifest`, `sw.js` (cache de l'app shell, mise à jour en arrière-plan), icônes 32 / 180 / 192 / 512 + maskable générées depuis le logo CHU.
- Bannière d'installation (Android : invite native ; iOS : instruction Partager → Sur l'écran d'accueil), proposée à l'affichage des premiers résultats, jamais superposée à la navigation.
- Zones tactiles ≥ 44 px, champs à 16 px (pas de zoom iOS), safe areas iPhone, balayage entre dimensions.

## 6. Robustesse

- Données et libellés séparés du code (bloc JSON embarqué) : plus d'erreurs d'apostrophes dans le JavaScript.
- Liens v6 / v7 relus (migration des scores, pondérations manquantes complétées), dédoublonnage des liens sans identifiant dans la bibliothèque.
- Formulaire anonymisé déclaré statiquement pour la détection Netlify Forms.

## Déploiement

1. Déposer le contenu du dossier (`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`, `benchmark.json`, `_headers`) à la racine du site Netlify (glisser-déposer le dossier ou le zip décompressé).
2. Netlify Forms : vérifier que les formulaires `demande-acces-roi-ia` et `resultats-anonymises-roi-ia` apparaissent dans l'onglet Forms après le premier déploiement.
3. Benchmark : remplacer `benchmark.json` (n = 0) par un fichier calculé (format de `benchmark.example.json`) une fois cinq évaluations reçues.
4. À chaque nouvelle version : incrémenter `version` dans `make_data.py` (le nom du cache du service worker en dépend) ; les utilisateurs reçoivent la mise à jour au rechargement suivant.

## Pistes restantes

Version anglaise ; étude de fiabilité inter-évaluateurs ; automatisation du calcul de `benchmark.json` à partir des soumissions ; matrice de responsabilités (tableau 2 de l'article) sous forme de module ; ordre des familles de l'outil (valeur spécifique en tête) différent du tableau 1 de l'article (opérationnelle en tête), à signaler dans l'article.
