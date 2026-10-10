# ROI IA Hospitalière — outil d'aide à la décision multicritère

Application web progressive (PWA) d'évaluation ex ante des projets d'intelligence artificielle hospitalière : grille MCDA en neuf familles de critères, sept profils d'établissement, feuille de route priorisée, comparateur, atelier multi-acteurs, suivi dans le temps.

Complément opérationnel de la communication *Investir dans l'intelligence artificielle à l'hôpital : quel cadre pour évaluer la création de valeur ?* (Aloui, Tran, Le Goff-Pronost, congrès ARAMOS 2026, Montpellier).

## Contenu du dépôt

| Fichier / dossier | Rôle |
|---|---|
| `index.html` | l'application complète (CSS, données et JavaScript inclus) |
| `sw.js` | service worker : cache de l'application, fonctionnement hors ligne |
| `manifest.webmanifest` | manifeste PWA (installation sur l'écran d'accueil) |
| `icons/` | icônes 32, 180, 192, 512 px et maskable |
| `benchmark.json` | benchmark anonymisé (vide tant que n < 5) ; `benchmark.example.json` donne le format |
| `_headers` | en-têtes HTTP pour Netlify (pas de cache sur `sw.js`) |
| `netlify.toml` | configuration Netlify : publication de la racine, dossier des fonctions |
| `netlify/functions/compteur.mjs` | fonction serveur du compteur d'usage (bundle autonome, stockage Netlify Blobs) |
| `src/` | sources : données (`make_data.py` → `app-data.json`), styles, modules JavaScript, gabarit, script d'assemblage, tests ; `src/functions/` : source de la fonction compteur, son test et le client Blobs embarqué |
| `CHANGELOG.md` | historique des versions |

## Déploiement

Site statique : la racine du dépôt est la racine du site. Sur Netlify, lier le dépôt (aucune commande de build, répertoire de publication `/`) ou glisser-déposer le dossier ; `netlify.toml` déclare le dossier des fonctions, qui est déployé dans les deux cas.

Deux réglages à faire une fois dans l'interface Netlify du site :

- **Forms** : activer la détection des formulaires (*Forms → Enable form detection*), sinon les formulaires `demande-acces-roi-ia` et `resultats-anonymises-roi-ia` ne sont pas collectés.
- **Blobs** : rien à activer ; le store `compteur` est créé au premier appel de la fonction. Pour remettre le compteur à zéro, supprimer la clé `stats` du store dans *Blobs*.

## Statistiques d'usage (compteur)

La fonction `/api/compteur` tient des compteurs anonymes : visites (une par session de navigation), évaluations affichées (une par évaluation, avec profil d'établissement et nature de projet), installations PWA, par jour sur 400 jours glissants. Aucune adresse IP, aucun identifiant ni cookie n'est stocké, ce qui dispense de bandeau de consentement. Les chiffres sont visibles par tout utilisateur dans *À propos → Statistiques d'usage* et sur l'accueil ; chacun peut exclure son appareil du comptage. La version autonome (`ROI_IA_autonome.html`) et le mode hors ligne n'envoient rien.

`GET /api/compteur` renvoie un JSON (`total`, `trenteJours`, `jours30`, `parProfil`, `parNature`) réutilisable pour un suivi externe. Pour une analyse d'audience plus fine (pages, provenance, appareils), Netlify Analytics (option payante, côté serveur, sans cookie) se complète sans modifier le code.

## Modifier l'application

Les libellés, critères, questions guidées, pondérations, glossaire, checklist et règles de feuille de route sont dans `src/make_data.py`. Après modification :

```bash
cd src
python3 make_data.py      # génère app-data.json
python3 assemble.py       # assemble ../index.html, sw.js, manifest, icônes
node test.js              # 63 tests Playwright (desktop + iPhone), optionnel
node functions/test-compteur.mjs   # 13 tests de la fonction compteur (faux serveur Blobs local)
```

`assemble.py` rebundle aussi la fonction compteur si `esbuild` est disponible (`npm i -g esbuild`) ; sinon le bundle versionné est conservé. Le client Netlify Blobs est embarqué en source (`src/functions/netlify-blobs-src/`, licence MIT, v8.1.2) pour que le bundle n'ait aucune dépendance à installer.

`assemble.py` attend le logo du CHU (`Logo_CHU_Angers.png`) et écrit à la racine du dépôt. Incrémenter `version` dans `make_data.py` à chaque publication : le nom du cache du service worker en dépend et déclenche la mise à jour chez les utilisateurs.

## Données

Aucune donnée n'est transmise sans action de l'utilisateur. Les évaluations sont conservées dans le navigateur (localStorage) et dans le lien de sauvegarde. La transmission anonymisée (scores et contexte, sans nom d'établissement ni de projet) alimente le benchmark. Le compteur d'usage ne stocke que des totaux agrégés.

## Auteurs

Saber Aloui (CHU Angers, ESTER/IRSET), Françoise Tran (Ethik-IA), Myriam Le Goff-Pronost (IMT Atlantique, LATIM-INSERM). Charte graphique CHU Angers.

Aide à la décision : l'outil ne remplace pas un audit juridique, technique ou médical.
