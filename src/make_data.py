#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construit build/app-data.json : modèle de données v8 de l'outil ROI IA.
Part des données extraites de la v6.5 (all.json) et applique les évolutions :
- 9 familles (ajout « Valeur environnementale »), migrations a4→e3, fi3→e1
- Acceptabilité et appropriation : + a5 (effort/récompense), + a6 (collectif)
- 7 profils : CHU, CH, CLCC, Clinique, Groupe de cliniques, Groupe mutualiste, GHT
- Cadre contraint : garantie humaine (L. 4001-3 CSP), qualification déployeur/fournisseur (AI Act art. 25)
- Réglementation : règlement (UE) 2026/1744 (omnibus numérique)
- Checklist, glossaire, aide par dimension, exemples, alertes, feuille de route
"""
import json, copy

src = json.load(open(__import__('pathlib').Path(__file__).parent / 'data' / 'all.json', encoding='utf-8'))

# ------------------------------------------------------------------ familles
FAM_SPECIFIC = copy.deepcopy(src['FAM_SPECIFIC'])
FAM_OPERATIONNEL = copy.deepcopy(src['FAM_OPERATIONNEL'])
univ = {f['id']: copy.deepcopy(f) for f in src['FAM_UNIVERSAL']}

# Acceptabilité et appropriation
acc = univ['acceptabilite']
acc['name'] = "Acceptabilité et appropriation"
acc['criteria'] = [c for c in acc['criteria'] if c[0] != 'a4']
acc['criteria'] += [
    ["a5", "Équilibre effort / récompense",
     "L'effort demandé aux équipes (apprentissage, double fonctionnement, supervision des sorties) a-t-il été estimé, et des contreparties concrètes sont-elles prévues et annoncées ? (modèle de Siegrist)",
     [{"q": "L'effort réel demandé aux équipes une fois la formation passée a-t-il été estimé (temps, charge de vigilance) ?",
       "opts": [["Oui, documenté", 2], ["Évoqué sans estimation", 1], ["Non", 0]]},
      {"q": "Des contreparties concrètes sont-elles prévues et annoncées (temps rendu réaffecté, reconnaissance, montée en compétence) ?",
       "opts": [["Oui, annoncées", 2], ["En discussion", 1], ["Non", 0]]},
      {"q": "L'appropriation de l'outil ouvre-t-elle une perspective professionnelle identifiée (référent, expertise reconnue) ?",
       "opts": [["Oui", 2], ["Possible", 1], ["Non", 0]]}]],
    ["a6", "Renforcement du collectif de travail",
     "Équipe projet pluriprofessionnelle, référents avec temps dédié, espaces de retour d'expérience programmés : le collectif est lui-même une contrepartie.",
     [{"q": "Une équipe projet pluriprofessionnelle (médecins, soignants, DSN, qualité) est-elle constituée ?",
       "opts": [["Oui, active", 2], ["En constitution", 1], ["Non", 0]]},
      {"q": "Des référents métier disposent-ils d'un temps dédié formalisé ?",
       "opts": [["Oui, temps protégé", 2], ["Référents sans temps dédié", 1], ["Non", 0]]},
      {"q": "Des espaces de retour d'expérience entre pairs sont-ils programmés après le déploiement ?",
       "opts": [["Oui, calendrier défini", 2], ["Prévu sans calendrier", 1], ["Non", 0]]}]],
]

# Financier : fi3 retiré (→ e1), fi4 mutualisation conditionnel
fin = univ['financier']
fin['criteria'] = [c for c in fin['criteria'] if c[0] != 'fi3']
FIN_MUTUALISATION = ["fi4", "Mutualisation territoriale / inter-sites",
    "Coût rapporté au nombre d'établissements bénéficiaires et gains évalués à l'échelle du territoire ou du groupe (coût-efficacité populationnelle).",
    [{"q": "Le coût de la solution a-t-il été rapporté au nombre d'établissements et à la population desservie ?",
      "opts": [["Oui, calculé", 2], ["En cours", 1], ["Non", 0]]},
     {"q": "Les établissements de proximité ou les sites de taille réduite bénéficient-ils du déploiement ?",
      "opts": [["Oui, dès la conception", 2], ["Prévu en extension", 1], ["Établissement support seulement", 0]]},
     {"q": "Une négociation centralisée (prix, clauses, réversibilité) a-t-elle été menée pour l'ensemble des sites ?",
      "opts": [["Oui", 2], ["Partiellement", 1], ["Non", 0]]}]]

# 9e famille — Valeur environnementale
FAM_ENV = {"id": "environnement", "name": "Valeur environnementale", "emoji": "🌱", "criteria": [["e1", "Empreinte directe de la solution", "Consommation énergétique de l'entraînement, de l'inférence et de l'hébergement, matériel mobilisé, localisation et efficacité des centres de données. Ces coûts sont en forte croissance et largement opaques (Crawford, 2024).", [{"q": "L'éditeur communique-t-il des données mesurées sur la consommation énergétique (kWh par inférence, PUE de l'hébergeur) ?", "opts": [["Oui, documentées", 2], ["Déclaratif sans mesure", 1], ["Non", 0]]}, {"q": "La localisation et le mix énergétique de l'hébergement sont-ils connus ?", "opts": [["Oui", 2], ["Partiellement", 1], ["Non", 0]]}, {"q": "Le renouvellement de matériel induit par la solution (postes, GPU, stockage) a-t-il été chiffré ?", "opts": [["Oui", 2], ["Estimé", 1], ["Non évalué", 0]]}]], ["e2", "Gains environnementaux indirects", "Effets favorables attribuables au déploiement : examens ou actes redondants évités, déplacements de patients et de professionnels évités, réduction des consommables, allongement de la durée de vie des équipements.", [{"q": "Les gains indirects attendus ont-ils été identifiés et, si possible, quantifiés ?", "opts": [["Oui, estimés", 2], ["Identifiés sans chiffrage", 1], ["Non", 0]]}, {"q": "Le bilan net (empreinte directe moins gains indirects) a-t-il été posé, même grossièrement ?", "opts": [["Oui", 2], ["Amorcé", 1], ["Non", 0]]}]], ["e3", "Inscription RSE et redevabilité", "Cohérence avec la démarche développement durable de l'établissement, engagements contractuels de l'éditeur, instances consultées, capacité à rendre compte dans les cadres de comptabilité environnementale en développement.", [{"q": "Le projet est-il compatible avec la démarche RSE / développement durable de l'établissement ?", "opts": [["Oui, avis rendu", 2], ["À instruire", 1], ["Non examiné", 0]]}, {"q": "Le contrat comporte-t-il des engagements environnementaux opposables à l'éditeur ?", "opts": [["Oui", 2], ["En discussion", 1], ["Non", 0]]}, {"q": "L'établissement saura-t-il rendre compte de l'empreinte de cette solution s'il en est requis ?", "opts": [["Oui, traçable", 2], ["Difficilement", 1], ["Non", 0]]}]]]}

# Cadre contraint médical : garantie humaine (k2) et qualification déployeur/fournisseur (k1)
med = FAM_SPECIFIC['medical']
for c in med['f7']['criteria']:
    if c[0] == 'k1':
        c[3].append({"q": "La qualification juridique de l'établissement au sens de l'AI Act (déployeur ou fournisseur, art. 25) a-t-elle été établie ?",
                     "opts": [["Oui, déployeur confirmé", 2], ["En cours d'analyse", 1], ["Non examinée", 0]]})
    if c[0] == 'k2':
        c[3].append({"q": "La garantie humaine (art. L. 4001-3 CSP) est-elle organisée : information du patient, accès aux données, traçabilité de la supervision ?",
                     "opts": [["Oui, procédure formalisée", 2], ["Partiellement", 1], ["Non", 0]]})

# ordre : f1, opérationnel, stratégique, acceptabilité, marché, dettes, f7, financier, environnement
FAM_UNIVERSAL = [univ['strategique'], acc, univ['marche'], univ['dettes'], fin]

# ------------------------------------------------------------------ profils
PROFILES = [
    {"id": "chu", "label": "CHU / CHR", "emoji": "🏛️",
     "desc": "En pointe mais sous pression de complexité : pôles multiples, SI hérités, dette de gouvernance élevée.",
     "weights": {"f1": 3, "operationnel": 3, "strategique": 3, "acceptabilite": 3, "marche": 2, "dettes": 3, "f7": 4, "financier": 4, "environnement": 2},
     "maturityBonus": 1, "mutualisation": False},
    {"id": "ch", "label": "Centre hospitalier", "emoji": "🏥",
     "desc": "Entre ambition et contrainte : la dette d'apprentissage est le risque principal, l'analyse financière sur cinq ans une condition de survie du projet.",
     "weights": {"f1": 3, "operationnel": 3, "strategique": 3, "acceptabilite": 4, "marche": 2, "dettes": 4, "f7": 3, "financier": 4, "environnement": 2},
     "maturityBonus": 0, "mutualisation": False},
    {"id": "clcc", "label": "Centre de lutte contre le cancer", "emoji": "🎗️",
     "desc": "ESPIC mono-thématique : valeur clinique prioritaire, patients vulnérables, données hautement sensibles, culture de recherche forte, réseau Unicancer.",
     "weights": {"f1": 5, "operationnel": 3, "strategique": 3, "acceptabilite": 4, "marche": 3, "dettes": 3, "f7": 5, "financier": 3, "environnement": 2},
     "maturityBonus": 0.5, "mutualisation": False},
    {"id": "clinique", "label": "Clinique privée", "emoji": "🏨",
     "desc": "La différenciation par l'IA : valeur stratégique dominante, risque de lock-in maximal, ROI financier scruté.",
     "weights": {"f1": 3, "operationnel": 3, "strategique": 4, "acceptabilite": 3, "marche": 3, "dettes": 3, "f7": 4, "financier": 4, "environnement": 2},
     "maturityBonus": 0.5, "mutualisation": False},
    {"id": "groupe", "label": "Groupe de cliniques", "emoji": "🏢",
     "desc": "Négociation centralisée et déploiement multi-sites : interopérabilité inter-établissements et lock-in à l'échelle du groupe.",
     "weights": {"f1": 3, "operationnel": 3, "strategique": 4, "acceptabilite": 3, "marche": 3, "dettes": 3, "f7": 4, "financier": 4, "environnement": 2},
     "maturityBonus": 0.5, "mutualisation": True},
    {"id": "mutualiste", "label": "Groupe mutualiste", "emoji": "🤝",
     "desc": "Logique de territoire et de solidarité, SI historiquement hétérogène, gouvernance fédérale, forte sensibilité RSE.",
     "weights": {"f1": 3, "operationnel": 3, "strategique": 3, "acceptabilite": 4, "marche": 3, "dettes": 4, "f7": 4, "financier": 3, "environnement": 3},
     "maturityBonus": -0.25, "mutualisation": True},
    {"id": "ght", "label": "GHT public", "emoji": "🗺️",
     "desc": "L'enjeu de cohésion territoriale : le ROI s'évalue à l'échelle du territoire, pas établissement par établissement.",
     "weights": {"f1": 4, "operationnel": 3, "strategique": 4, "acceptabilite": 4, "marche": 3, "dettes": 4, "f7": 4, "financier": 3, "environnement": 3},
     "maturityBonus": -0.5, "mutualisation": True},
]

# alertes et actions spécifiques par profil
PROFILE_NOTES = {
    "clcc": {
        "alert": "<strong>🎗️ CLCC</strong> — tout algorithme d'aide au diagnostic ou à la décision thérapeutique en oncologie relève du haut risque (MDR + AI Act) ; les données sont parmi les plus sensibles du système de santé. Vérifiez l'articulation avec les essais cliniques en cours, l'avis du comité d'éthique et du comité des patients, et les retours d'expérience du réseau Unicancer avant tout engagement.",
        "roadmap": [
            ["urgent", "Soumettre le projet au comité d'éthique et au comité des patients avant tout engagement contractuel", "Éthique"],
            ["urgent", "Vérifier la compatibilité du traitement des données avec les essais cliniques en cours et les obligations de recherche (CNIL, MR)", "Données"],
            ["important", "Évaluer l'impact de l'outil sur le fonctionnement des RCP (réunions de concertation pluridisciplinaire)", "Clinique"],
            ["important", "Solliciter les retours d'expérience et référencements du réseau Unicancer sur la solution", "Réseau"],
            ["normal", "Partager les résultats du pilote avec le réseau Unicancer (mutualisation des preuves)", "Réseau"],
        ]},
    "mutualiste": {
        "alert": "<strong>🤝 Groupe mutualiste</strong> — SI historiquement hétérogène entre établissements et gouvernance fédérale : identifiez l'instance décisionnelle du groupe, cartographiez les SI concernés avant signature et inscrivez le projet dans la démarche RSE et la logique de solidarité territoriale qui fonde le modèle mutualiste.",
        "roadmap": [
            ["urgent", "Identifier l'instance décisionnelle du groupe et formaliser la gouvernance du projet (groupe / établissements)", "Gouvernance"],
            ["urgent", "Cartographier les SI des établissements concernés et chiffrer l'interopérabilité multi-sites", "DSI"],
            ["important", "Désigner un pilote groupe et un relais par établissement, avec temps dédié", "Gouvernance"],
            ["important", "Inscrire le projet dans la démarche RSE du groupe et définir les indicateurs environnementaux suivis", "RSE"],
            ["normal", "Documenter le bénéfice pour les établissements de proximité et la population desservie", "Territoire"],
        ]},
    "groupe": {
        "alert": "<strong>🏢 Groupe de cliniques</strong> — un déploiement multi-sites concentre le lock-in à l'échelle du groupe : négociez centralement prix, clauses de réversibilité et portabilité, et vérifiez l'interopérabilité entre les SI des différents sites avant la généralisation.",
        "roadmap": [
            ["urgent", "Négocier centralement les clauses de réversibilité et de portabilité pour l'ensemble des sites", "Contractuel"],
            ["important", "Vérifier l'interopérabilité entre les SI des différents sites avant extension", "DSI"],
            ["normal", "Définir la séquence de généralisation site par site à partir du pilote", "Stratégie"],
        ]},
    "ght": {
        "alert": "<strong>🗺️ GHT</strong> — vérifiez que le projet ne crée pas une médecine à deux vitesses entre l'établissement support et les membres du groupement : un patient pris en charge dans un hôpital de proximité doit bénéficier, à qualité équivalente, des apports de l'IA.",
        "roadmap": [
            ["urgent", "Formaliser la doctrine d'investissement GHT : quels établissements, quel calendrier, quelle gouvernance partagée", "GHT"],
            ["normal", "Documenter le bénéfice territorial réel et partager le REX avec les établissements membres du GHT", "GHT"],
        ]},
    "clinique": {"alert": "", "roadmap": [
        ["urgent", "Rapporter l'investissement à la valeur de différenciation perçue par les médecins adresseurs et les patients", "Stratégie"],
    ]},
    "chu": {"alert": "", "roadmap": [
        ["important", "Arbitrer le projet dans le portefeuille des projets numériques concurrents (priorisation, ressources DSN)", "Gouvernance"],
    ]},
    "ch": {"alert": "", "roadmap": [
        ["important", "Sécuriser un budget de formation sanctuarisé : c'est le premier poste sacrifié en cas de tension budgétaire", "Budget"],
    ]},
}

# ------------------------------------------------------------------ aide par dimension
DIM_HELP = copy.deepcopy(src['DIM_HELP'])
DIM_HELP['acceptabilite'] = ("Une solution techniquement performante mais rejetée par les équipes est un investissement perdu. "
    "Trois périmètres d'adhésion (professionnels, patients, instances) et deux conditions d'appropriation : "
    "l'équilibre entre l'effort demandé et les contreparties offertes (modèle effort/récompense de Siegrist), "
    "et le renforcement du collectif de travail, qui est lui-même une contrepartie.")
DIM_HELP['environnement'] = "Neuvième famille de la grille, la plus souvent laissée vide — et c'est en soi un résultat. Elle croise trois questions : ce que la solution consomme (énergie, calcul, hébergement, matériel), ce qu'elle permet d'éviter (examens redondants, déplacements, consommables) et la capacité de l'établissement à en rendre compte. Les coûts environnementaux de l'IA sont en forte croissance et largement opaques : ne pas les instruire revient à en reporter la charge sur les cadres de comptabilité extra-financière en construction."
DIM_HELP['financier'] = ("La règle des cinq ans : abonnement × 5 + intégration SI + formation et conduite du changement + coût de sortie. "
    "C'est ce chiffre, et non l'abonnement annuel, qui doit figurer dans le dossier d'arbitrage. "
    "Pour un groupement ou un groupe, le coût se rapporte au nombre d'établissements et à la population desservie.")
DIM_HELP['cadre'] = ("Ce qui n'apparaît jamais dans un business case éditeur : conformité réglementaire (MDR, AI Act, RGPD, HDS), "
    "qualification déployeur ou fournisseur, garantie humaine, responsabilité en cas d'erreur algorithmique, lock-in et conditions de sortie. "
    "Ces contraintes peuvent reconfigurer l'équation économique après la signature.")

# ------------------------------------------------------------------ glossaire
TOOLTIPS = copy.deepcopy(src['TOOLTIPS'])
TOOLTIPS.update({
    "Statistiques d'usage": "Compteur anonyme de l'outil (visites, évaluations affichées, installations) tenu par une fonction serveur et consultable dans la rubrique À propos. Aucune adresse IP, aucun identifiant ni cookie : seuls des totaux agrégés par jour, par profil et par nature de projet sont conservés. Désactivable appareil par appareil.",
    "Effort-récompense": "Modèle de Siegrist (1996) : lorsque l'effort exigé d'un professionnel excède durablement la récompense qu'il en retire — temps rendu, estime, perspective, prise sur son travail —, le déséquilibre prédit l'usure et le retrait. Appliqué à l'IA : l'effort d'appropriation est immédiat et concentré sur les équipes, la récompense est différée et souvent captée ailleurs.",
    "Collectif de travail": "Ensemble des règles, repères et solidarités qu'une équipe construit autour d'une activité partagée. Un déploiement d'IA peut le renforcer (équipe projet pluriprofessionnelle, référents, retours d'expérience) ou le défaire en isolant chacun face à son écran.",
    "Garantie humaine": "Principe posé à l'article 17 de la loi n° 2021-1017 du 2 août 2021, codifié à l'article L. 4001-3 du code de la santé publique : le professionnel qui recourt à un dispositif médical comportant un traitement algorithmique doit en informer le patient, rester en mesure d'accéder aux données utilisées et d'en expliquer les résultats.",
    "Omnibus numérique": "Règlement (UE) 2026/1744, en vigueur depuis le 27 juillet 2026. Il reporte l'application des obligations « haut risque » de l'AI Act au 2 décembre 2027 (annexe III) et au 2 août 2028 (produits soumis à harmonisation, dont les dispositifs médicaux). Les articles 4, 5 et 50 restent applicables depuis le 2 août 2026.",
    "Déployeur / fournisseur": "AI Act, art. 25 : l'établissement qui modifie substantiellement un système ou le déploie pour une finalité non prévue peut être requalifié de fournisseur, avec les obligations correspondantes. La qualification juridique est une variable ex ante du coût complet.",
    "Courbe en J": "Brynjolfsson, Rock et Syverson (2021) : les technologies à usage général font apparaître les coûts immatériels (réorganisation, apprentissage) avant les bénéfices. La performance mesurée se dégrade avant de s'améliorer — évaluer trop tôt conduit à conclure à un échec.",
    "Valeur environnementale": "Neuvième famille de la grille : empreinte directe de la solution (énergie, calcul, hébergement, matériel), gains environnementaux indirects (déplacements et actes évités) et inscription dans la démarche RSE de l'établissement.",
    "CLCC": "Centre de lutte contre le cancer : établissement de santé privé d'intérêt collectif (ESPIC) spécialisé en cancérologie, fédéré au sein du réseau Unicancer (18 centres en France).",
    "Groupe mutualiste": "Établissements de santé gérés par des mutuelles (Mutualité Française, groupes mutualistes régionaux) : logique non lucrative et territoriale, gouvernance fédérale, SI souvent hétérogène entre établissements.",
    "Unicancer": "Fédération des centres de lutte contre le cancer : réseau de recherche, de référencement et de mutualisation entre les CLCC.",
    "Analyse de sensibilité": "Vérifie si le verdict résiste à des pondérations différentes. Un verdict qui bascule selon le poids d'une dimension signale qu'un consensus de gouvernance sur les priorités est nécessaire avant de décider.",
})

# ------------------------------------------------------------------ checklist éditeur
CHECKLIST = copy.deepcopy(src['CHECKLIST'])
CHECKLIST['Contractuel'].append("La qualification de l'établissement au sens de l'AI Act (déployeur ou fournisseur, art. 25) est-elle établie et cohérente avec le contrat ?")
CHECKLIST['Technique'].append("La consommation énergétique de la solution est-elle mesurée et communiquée (PUE, kWh par inférence, hébergement) ?")
CHECKLIST['Clinique / métier'].append("Quel effort quotidien réel est demandé aux équipes une fois la formation passée (supervision des sorties, double saisie, vigilance) ?")
CHECKLIST['Gouvernance'].append("La garantie humaine (L. 4001-3 CSP) est-elle organisée : information du patient, accès aux données, traçabilité de la supervision ?")

# ------------------------------------------------------------------ alertes inline
INLINE_ALERTS = copy.deepcopy(src['INLINE_ALERTS'])
INLINE_ALERTS.update({
    "a5": {"threshold": 2, "level": "warning", "msg": "Un effort demandé sans contrepartie annoncée est le mécanisme même de l'épuisement professionnel (déséquilibre effort/récompense). Nommez les contreparties avant le pilote."},
    "e1": {"threshold": 2, "level": "warning", "msg": "Empreinte énergétique non documentée : exigez des mesures (PUE, kWh par inférence, localisation de l'hébergement) ; cette information deviendra une pièce de redevabilité."},
    "fi4": {"threshold": 2, "level": "warning", "msg": "Sans doctrine de mutualisation, le projet profitera d'abord à l'établissement support ou au site le mieux équipé : documentez le bénéfice pour les sites de proximité."},
})

# ------------------------------------------------------------------ exemples
EXAMPLES = copy.deepcopy(src['EXAMPLES'])
def migrate(sc):
    sc = dict(sc)
    if 'fi3' in sc: sc['e1'] = sc.pop('fi3')
    if 'a4' in sc: sc['e3'] = sc.pop('a4')
    return sc
for k, ex in EXAMPLES.items():
    ex['scores'] = migrate(ex['scores'])
EXAMPLES['radio']['scores'].update({"a5": 2, "a6": 3, "e2": 2})
EXAMPLES['radio']['er'] = {"e": [2, 1, 2, 1, 2], "r": [1, 1, 2, 1, 1]}
EXAMPLES['planning']['scores'].update({"a5": 1, "a6": 2, "e2": 3})
EXAMPLES['planning']['er'] = {"e": [3, 2, 2, 3, 2], "r": [1, 0, 1, 1, 1]}
EXAMPLES['pmsi']['scores'].update({"a5": 3, "a6": 3, "e2": 2})
EXAMPLES['pmsi']['er'] = {"e": [1, 1, 2, 1, 1], "r": [2, 2, 2, 2, 2]}
EXAMPLES['clcc'] = {
    "projectName": "IA de contourage en radiothérapie", "domain": "Radiothérapie / oncologie",
    "profile": "clcc", "stage": "Proof of concept", "si": "mature", "rh": "moyenne", "change": "forte", "nature": "medical",
    "scores": {"c1": 4, "c2": 4, "c3": 3, "o1": 4, "o2": 4, "o3": 3, "s1": 4, "s2": 3, "s3": 4, "a1": 4, "a2": 3, "a3": 3, "a5": 3, "a6": 4,
               "m1": 4, "m2": 3, "m3": 4, "d1": 3, "d2": 3, "d3": 3, "k1": 4, "k2": 3, "k3": 2, "fi1": 3, "fi2": 4, "e1": 2, "e2": 3, "e3": 3},
    "er": {"e": [2, 1, 2, 1, 1], "r": [3, 2, 3, 2, 3]}}
EXAMPLES['mutualiste'] = {
    "projectName": "Assistant documentaire IA générative", "domain": "Transversal (compte rendus, courriers)",
    "profile": "mutualiste", "stage": "Cadrage", "si": "fragile", "rh": "forte", "change": "moyenne", "nature": "transversal",
    "scores": {"t1": 3, "t2": 3, "t3": 2, "o1": 3, "o2": 3, "o3": 2, "s1": 3, "s2": 3, "s3": 2, "a1": 3, "a2": 2, "a3": 2, "a5": 2, "a6": 2,
               "m1": 2, "m2": 3, "m3": 2, "d1": 2, "d2": 2, "d3": 2, "tk1": 2, "tk2": 2, "tk3": 2, "fi1": 2, "fi2": 2, "fi4": 2, "e1": 1, "e2": 2, "e3": 3},
    "er": {"e": [2, 2, 3, 2, 2], "r": [1, 1, 2, 1, 2]}}
EXAMPLE_META = {
    "radio": {"icon": "🩻", "title": "IA de lecture radiologique", "desc": "CH de 400 lits : aide à la détection en radiologie thoracique.", "tags": ["Médical", "CH", "Consultation éditeurs"]},
    "planning": {"icon": "📅", "title": "Planification bloc opératoire", "desc": "GHT public : optimisation des blocs sur trois établissements.", "tags": ["Planification", "GHT", "Proof of concept"]},
    "pmsi": {"icon": "💻", "title": "Codage PMSI automatisé", "desc": "CHU : aide au codage pour la qualité des données et la recette T2A.", "tags": ["PMSI", "CHU", "Cadrage"]},
    "clcc": {"icon": "🎗️", "title": "Contourage en radiothérapie", "desc": "CLCC : segmentation automatique des organes à risque avant planification.", "tags": ["Médical", "CLCC", "Proof of concept"]},
    "mutualiste": {"icon": "🤝", "title": "Assistant documentaire IA", "desc": "Groupe mutualiste : IA générative pour comptes rendus et courriers, SI hétérogène.", "tags": ["Transversal", "Mutualiste", "Cadrage"]},
}

# ------------------------------------------------------------------ effort / récompense
ER_ITEMS = {
 "effort": [
  [
   "Charge d'apprentissage",
   "temps et effort cognitif pour maîtriser l'outil"
  ],
  [
   "Période de double fonctionnement",
   "saisie ou contrôle redondant pendant la bascule"
  ],
  [
   "Nouvelles tâches de supervision",
   "vérifier, corriger et signaler les sorties de l'IA"
  ],
  [
   "Perturbation des routines et du rythme de travail installés",
   ""
  ],
  [
   "Charge de vigilance",
   "responsabilité ressentie sur une recommandation non formulée par soi"
  ]
 ],
 "reward": [
  [
   "Temps effectivement rendu et réaffecté à l'activité de soin",
   ""
  ],
  [
   "Reconnaissance",
   "le travail d'appropriation est nommé, visible et valorisé"
  ],
  [
   "Montée en compétence et perspective professionnelle (référent, formation qualifiante)",
   ""
  ],
  [
   "Prise sur l'outil",
   "participation aux arbitrages, droit de retour, capacité à le faire évoluer"
  ],
  [
   "Renforcement du collectif",
   "équipe pluriprofessionnelle, référents, retours d'expérience partagés"
  ]
 ],
 "effLabels": [
  "aucun",
  "limité",
  "notable",
  "lourd"
 ],
 "rewLabels": [
  "nulle",
  "faible",
  "réelle",
  "forte"
 ],
 "bands": [
  [
   0.8,
   "Équilibre favorable",
   "green"
  ],
  [
   1.1,
   "Équilibre",
   "blue"
  ],
  [
   1.6,
   "Déséquilibre",
   "amber"
  ],
  [
   99,
   "Déséquilibre marqué",
   "red"
  ]
 ],
 "levers": [
  "Chiffrer le temps rendu et décider, avec l'encadrement, de son affectation — sans quoi le gain est capté par l'activité et invisible pour l'équipe.",
  "Nommer publiquement le travail d'appropriation en instance et dans l'évaluation annuelle : l'effort non reconnu se paie en désengagement.",
  "Créer un rôle de référent IA identifié, avec temps dédié et valorisation dans le parcours professionnel.",
  "Ouvrir un canal de retour effectif vers l'éditeur et un droit de suspension d'usage : la prise sur l'outil est une récompense en soi.",
  "Constituer une équipe pluriprofessionnelle et programmer des retours d'expérience réguliers dès la mise en service."
 ]
}

# ------------------------------------------------------------------ réglementation (calendrier dynamique)
REG = {
    "omnibus": {"ref": "Règlement (UE) 2026/1744 (« omnibus numérique »)", "inForce": "2026-07-27"},
    "milestones": [
        {"date": "2026-08-02", "label": "Applicables depuis le 2 août 2026 : art. 4 (alphabétisation IA), art. 5 (pratiques interdites), art. 50 (transparence)", "level": "applied"},
        {"date": "2027-12-02", "label": "Obligations « haut risque » de l'annexe III", "level": "upcoming"},
        {"date": "2028-08-02", "label": "Obligations « haut risque » de l'annexe I (produits sous législation d'harmonisation, dont les dispositifs médicaux sous MDR)", "level": "upcoming"},
    ],
    "note": "Un report déplace la charge sans la supprimer : un contrat signé aujourd'hui court au-delà de ces échéances. Revérifiez le calendrier réglementaire à la date de consultation.",
}

# ------------------------------------------------------------------ feuille de route (règles)
ROADMAP_RULES = [
    # phase, condition (clé), texte, tag — les conditions sont interprétées par l'app
    ["urgent", "f7<=2", "Faire relire le contrat par un juriste spécialisé (responsabilité, réversibilité, propriété des données)", "Juridique"],
    ["urgent", "dettes<=2|si=fragile", "Mandater la DSN pour un audit technique SI avant tout engagement : interfaçages, qualité des données, infrastructure", "DSN"],
    ["urgent", "marche<=2", "Exiger une démonstration sur vos propres données et visiter au moins un établissement de profil comparable déjà déployé", "Éditeur"],
    ["urgent", "f7<=3", "Négocier les clauses de réversibilité, de portabilité des données et de SLA avant signature", "Contractuel"],
    ["urgent", "nature=medical&f7<=3", "Vérifier le marquage CE MDR, la trajectoire de conformité AI Act et la qualification déployeur / fournisseur (art. 25)", "Réglementaire"],
    ["urgent", "nature=medical", "Organiser la garantie humaine (L. 4001-3 CSP) : information du patient, accès aux données, traçabilité de la supervision", "Réglementaire"],
    ["urgent", "nature=rh&f7<=3", "Obtenir l'avis du CSE avant signature pour tout outil IA impactant les décisions RH", "Social"],
    ["urgent", "nature=planning&f7<=3", "Faire valider les règles métier du planning par un juriste en droit du travail avant déploiement", "Juridique"],
    ["urgent", "marche<=2", "Négocier une clause d'audit de performance à 12 mois avec pénalités contractuelles en cas de non-atteinte", "Contractuel"],
    ["urgent", "financier<=2", "Construire le coût total sur cinq ans et le confronter au business case de l'éditeur avant tout arbitrage", "Budget"],
    ["important", "acceptabilite<=3", "Organiser des ateliers de co-construction avec les équipes métier concernées avant le démarrage du pilote", "Conduite du changement"],
    ["important", "acceptabilite<=2", "Réaliser une évaluation des risques psychosociaux (RPS) avant le déploiement", "RH / RPS"],
    ["important", "er>=1.1", "Nommer les contreparties de l'effort demandé (temps rendu, reconnaissance, compétences) et les annoncer avant le pilote", "Effort / récompense"],
    ["important", "dettes<=3", "Chiffrer et budgéter les coûts d'intégration SI, de formation et de conduite du changement dans le business case réel", "Budget"],
    ["important", "dettes<=2|ch=faible", "Nommer un chef de projet interne dédié avec du temps protégé pour piloter le déploiement", "Gouvernance"],
    ["important", "acceptabilite<=3", "Associer la CME et les instances représentatives en amont du pilote, pas en simple information", "Instances"],
    ["important", "nature=medical&f1<=3", "Définir les indicateurs cliniques de succès avant le pilote : sensibilité, spécificité, taux d'adoption, modifications manuelles", "Clinique"],
    ["important", "nature=planning", "Tester le planning généré sur un mois glissant avant bascule complète et mesurer le taux de modifications manuelles", "Pilote"],
    ["important", "dettes<=2", "Constituer un comité de pilotage pluridisciplinaire (DG, DSN, direction médicale, référent métier) avec réunion mensuelle", "Gouvernance"],
    ["important", "rh=forte", "Prévoir un plan d'accompagnement dédié à l'appropriation : ne pas déployer en parallèle d'une activité pleine sans renfort", "RH / Apprentissage"],
    ["important", "environnement<=2", "Demander à l'éditeur des mesures d'empreinte (PUE, kWh par inférence, hébergement) et inscrire un engagement au contrat", "RSE"],
    ["normal", "nature=medical|f1<=3", "Mettre en place un tableau de bord de suivi des performances du modèle avec alertes en cas de dérive", "Supervision"],
    ["normal", "dettes<=3", "Planifier la revalidation du modèle à 12 et 24 mois sur vos données locales", "Qualité"],
    ["normal", "always", "Formaliser le retour d'expérience du pilote avant généralisation : gains réels vs attendus, coûts effectifs, taux d'adoption", "REX"],
    ["normal", "er>=1.1", "Réévaluer la balance effort / récompense à six mois avec les équipes et ajuster les contreparties", "Effort / récompense"],
    ["normal", "global>=3.5", "Évaluer l'extension à d'autres services ou établissements sur la base des résultats du pilote", "Stratégie"],
    ["normal", "strategique>=4", "Valoriser le déploiement dans la communication institutionnelle et les dossiers ARS", "Communication"],
    ["normal", "always", "Intégrer le coût réel de supervision et de maintenance dans le budget récurrent de l'établissement", "Budget"],
    ["normal", "environnement<=3", "Établir le bilan environnemental net après un an (empreinte directe moins gains indirects)", "RSE"],
]

data = {
    "version": "8.3",
    "versionLabel": "v8.3 · octobre 2026",
    "FAM_SPECIFIC": FAM_SPECIFIC, "FAM_OPERATIONNEL": FAM_OPERATIONNEL, "FAM_UNIVERSAL": FAM_UNIVERSAL,
    "FAM_ENV": FAM_ENV, "FIN_MUTUALISATION": FIN_MUTUALISATION,
    "RADAR_LABELS": {"clinique": "Clinique", "planif": "Organisationnelle", "valeur_rh": "RH et sociale", "valeur_log": "Supply chain", "valeur_pmsi": "Data / qualité", "valeur_trans": "Globale",
                     "operationnel": "Opérationnelle", "strategique": "Stratégique", "acceptabilite": "Acceptabilité", "marche": "Maturité marché", "dettes": "Dettes cachées",
                     "cadre": "Cadre contraint", "cadre_planif": "Cadre contraint", "cadre_rh": "Cadre contraint", "cadre_log": "Cadre contraint", "cadre_pmsi": "Cadre contraint", "cadre_trans": "Cadre contraint",
                     "financier": "Financière & ROI", "environnement": "Environnementale"},
    "NATURE_LABELS": src['NATURE_LABELS'],
    "NATURES": [
        {"id": "medical", "icon": "🩺", "name": "Médical / clinique", "desc": "Aide au diagnostic, prescription, thérapeutique"},
        {"id": "planning", "icon": "📅", "name": "Planification", "desc": "Planning médical, bloc opératoire, gardes, lits"},
        {"id": "rh", "icon": "👥", "name": "RH / administratif", "desc": "Recrutement, gestion du personnel, paie"},
        {"id": "logistique", "icon": "🏭", "name": "Logistique", "desc": "Supply chain, stocks, pharmacie, maintenance"},
        {"id": "pmsi", "icon": "💻", "name": "PMSI / codage", "desc": "DIM, codage, données patients, interopérabilité"},
        {"id": "transversal", "icon": "🔀", "name": "Transversal / mixte", "desc": "Projet couvrant plusieurs domaines (IA générative…)"},
    ],
    "PROFILES": PROFILES, "PROFILE_NOTES": PROFILE_NOTES,
    "SCALE_LABELS": src['SCALE_LABELS'],
    "TOOLTIPS": TOOLTIPS, "DIM_HELP": DIM_HELP, "CHECKLIST": CHECKLIST, "INLINE_ALERTS": INLINE_ALERTS,
    "EXAMPLES": EXAMPLES, "EXAMPLE_META": EXAMPLE_META, "ER": ER_ITEMS, "REG": REG, "ROADMAP_RULES": ROADMAP_RULES,
    "STAGES": ["Cadrage", "Consultation éditeurs", "Proof of concept", "Déploiement pilote", "Généralisation envisagée"],
}
json.dump(data, open(__import__('pathlib').Path(__file__).parent / 'app-data.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
n_crit = sum(len(f['criteria']) for f in FAM_UNIVERSAL) + len(FAM_OPERATIONNEL['criteria']) + len(FAM_ENV['criteria']) + 6
print("families universelles:", [f['id'] for f in FAM_UNIVERSAL], "| critères (médical, hors fi4):", n_crit)
print("glossaire:", len(TOOLTIPS), "| checklist:", sum(len(v) for v in CHECKLIST.values()), "| profils:", len(PROFILES), "| exemples:", len(EXAMPLES))
