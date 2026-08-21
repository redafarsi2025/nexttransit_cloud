# Business Model Canvas — NextTransit

> Rédigé le 2026-08-21, révisé le même jour après lecture réelle du fichier
> `NextTransit_Budget_ProtoMarket_II.xlsx` (dossier ProtoMarket n° NT-2026-001, extrait via un script
> Node/xlsx temporaire, contenu exact collé ci-dessous — pas résumé de mémoire) et recherche web
> ciblée pour les données de marché. Les cases encore marquées **[À COMPLÉTER]** demandent une
> décision ou une donnée qui n'appartient qu'à vous (statut d'équipe, tarification finale) — je ne
> les invente pas. **Voir la section "⚠️ Écarts trouvés" en bas — à lire avant tout dépôt**, elle
> pèse plus lourd que le reste de ce document.

---

## 1. Segments de clientèle

- **Cible primaire** : PME et grandes entreprises algériennes de transport routier / logistique
  opérant une flotte de véhicules lourds (le seed de démo et les données produit utilisent des
  poids lourds réels — Renault T480, Volvo FH16, Scania R500), avec un volume de flotte suffisant
  pour que la gestion papier/Excel devienne un point de douleur (typiquement au-delà de 10-15
  véhicules).
- **Cible secondaire** : flottes captives d'entreprises industrielles/BTP/agroalimentaire qui
  possèdent leurs propres camions plutôt que de sous-traiter le transport.
- **Utilisateurs finaux, par rôle** (le RBAC du produit distingue déjà ces profils réellement, pas
  seulement dans le pitch) : Directeur/Gérant (vue stratégique), Fleet Manager (opérations
  quotidiennes), Responsable Maintenance, Mécanicien (accès terrain), Chauffeur (déclaratif),
  Finance (coûts, hors accès aux données financières pour Mécanicien/Chauffeur — ségrégation prévue
  dans le référentiel, encore imparfaitement appliquée côté API, cf. finding C3-1 de l'audit).
- **Taille de marché — proxy trouvé, avec réserve explicite sur sa fiabilité** : la recherche web
  confirme d'abord un fait négatif important : *« en l'absence de statistiques fiables de l'activité
  du secteur privé du transport routier, il est très difficile d'estimer les volumes réels »*
  (constat repris de sources citant l'ONS elle-même). Il n'existe donc pas de décompte officiel et
  à jour du nombre d'entreprises de transport routier en Algérie que j'aie pu trouver. Le seul
  chiffre chiffrable et sourcé disponible est un **proxy indirect, daté** : le parc national de
  camions comptait **402 189 unités (7,08 % du parc automobile total)** fin 2019, plus
  1 140 565 camionnettes (>20 %) — source ONS relayée par Algerie360. **Ce chiffre a 6 ans à la date
  de rédaction et mesure des véhicules, pas des entreprises** (une flotte de 15 camions compte pour
  15 dans ce total, pas pour 1) — à citer dans le dossier uniquement comme ordre de grandeur du parc
  national, jamais comme un nombre de clients potentiels, et avec sa date.
- **[À COMPLÉTER]** : segmentation réelle par taille de flotte et par wilaya — nécessiterait une
  étude de marché ou des données ONS plus récentes que je n'ai pas pu localiser publiquement.

## 2. Proposition de valeur

Ce que le produit fait **réellement et de façon vérifiée**, à présenter tel quel :

- **Plateforme unifiée de gestion de flotte multi-tenant** : véhicules, carburant (consommation par
  véhicule, détection d'anomalie sur pic >20% vs moyenne mobile 90 jours), pneus (suivi position,
  profondeur de sculpture, rotation), work orders/maintenance, incidents chauffeur, garanties,
  inventaire pièces.
- **Ingestion télémétrique réelle multi-fournisseur** (Flespi, Traccar, saisie manuelle),
  authentification par secret hashé + anti-rejeu + rate limiting, pipeline webhook → queue Redis →
  worker → base — testé et vérifié de bout en bout cette semaine.
- **Control Room** : wallboards KPI/alertes/maintenance + carte de position en direct, branchée sur
  les dernières positions GPS réellement enregistrées.
- **Isolation stricte des données par client (RLS multi-tenant Postgres)**, avec un rôle
  super-admin plateforme séparé.
- **Traçabilité** : journal d'audit sur les actions clés (avec une réserve de sécurité connue et non
  encore corrigée — finding C4-2 de l'audit, falsification possible de l'audit log via un endpoint
  précis — **à ne pas présenter comme un argument de conformité tant que ce n'est pas corrigé**).

**Ce qu'il ne faut PAS présenter comme déjà construit** (l'audit l'a établi par lecture de code, pas
par supposition) : maintenance prédictive par IA/ML, score de risque composite, RUL, TCO, CTS,
"AI Commander". Le moteur de règles déterministe (R1-R7) existe et est testé, mais découplé de
l'écran affiché aujourd'hui à l'utilisateur pour le calcul CAE. **Nuance importante ajoutée après
lecture du budget** : le modèle "Failure Probability" et les tableaux TCO cités dans
`NextTransit_Budget_ProtoMarket_II.xlsx` (voir §6-9) sont explicitement **à construire avec les
fonds du grant**, pas des composants déjà validés — présenter la proposition de valeur actuelle
comme "moteur de règles de priorisation, avec un modèle prédictif ML en développement financé par
ProtoMarket II" est honnête et reste un vrai argument, y compris devant un jury qui pousserait sur
le sujet.

## 3. Canaux

- **Démonstration directe** : landing page multilingue (FR/EN/AR) déjà construite, avec un parcours
  "Essayer la démo" en accès anonyme sur données de démonstration isolées.
- **Programme pilote** : section dédiée existante sur la landing page, orientée vers un contact
  direct plutôt qu'un achat en ligne — cohérent avec un cycle de vente B2B flotte (démo → pilote →
  contrat), pas un modèle self-service.
- **Crédibilité institutionnelle prévue** : le budget ProtoMarket finance un dépôt de brevet INAPI
  (formule CAE) et un dépôt logiciel INAPI (code source V0), explicitement positionnés dans le
  fichier budget comme prérequis au **dossier de labellisation Startup (MEKS)** — donc un canal de
  crédibilité institutionnelle (label Startup officiel) est déjà dans la feuille de route financée,
  pas juste une intention.
- **[À COMPLÉTER]** : canaux de prospection commerciale concrets (salons professionnels du transport,
  réseau personnel/partenaires, prescripteurs — concessionnaires poids lourds, assureurs flotte).

## 4. Relations clients

- Modèle attendu : accompagnement direct pendant la phase pilote (onboarding tenant, paramétrage
  taux horaire/devise/classification), pas un produit self-service pur à ce stade de maturité.
- Le produit expose déjà un import CSV réel pour véhicules et carburant (vérifié dans le code,
  `ImportVehiclesModal.tsx`), ce qui réduit la friction d'onboarding — l'import de l'historique de
  maintenance reste à construire.
- Le budget prévoit explicitement une **validation terrain sur 5 véhicules pilotes** (dongles OBD
  Teltonika, tests d'intégration IoT par un ingénieur certifié externe) — c'est le format concret du
  premier contact client réel prévu par le porteur de projet lui-même, pas une hypothèse de ma part.
- **[À COMPLÉTER]** : niveau de support prévu au-delà de la phase pilote (SLA, contact dédié,
  formation) — non couvert par le budget ProtoMarket (qui exclut explicitement les frais de
  fonctionnement récurrents, voir §9).

## 5. Sources de revenus

- Modèle prévu : abonnement SaaS récurrent par tenant (l'architecture multi-tenant du produit est
  conçue pour ça). La grille de prix publique a été volontairement retirée de la landing page cette
  semaine (montants non encore arbitrés) au profit d'un devis personnalisé.
- **Repère externe trouvé (recherche web, à ne PAS recopier tel quel dans le dossier)** : les
  solutions de gestion de flotte SaaS grand public se situent généralement entre **10 et 25 €/véhicule/mois**
  en Europe. C'est un point de repère de méthode de tarification (abonnement par véhicule/mois), **pas
  un prix algérien** — le pouvoir d'achat et les références de coût DZD sont sans rapport direct avec
  l'euro, et aucune source spécifique au marché algérien n'a été trouvée. À utiliser seulement pour
  calibrer un ordre de grandeur de structure ("prix par véhicule/mois" plutôt que "forfait
  entreprise"), pas pour fixer un chiffre.
- **Distinction à ne pas mélanger dans le dossier** : le financement ProtoMarket (1 322 000 DA
  demandés sur 1 500 000 DA accordés, Niveau 2 — voir §9) est une **subvention d'équipement pour le
  prototype**, versée à l'université, jamais un revenu client. Le dossier doit présenter les deux
  choses séparément : le grant finance la validation technique, le modèle SaaS reste l'unique source
  de revenus commerciaux réels visée après le pilote.
- **[À COMPLÉTER — décision qui vous appartient]** : structure tarifaire cible finale (prix par
  véhicule/mois, palier par taille de flotte).

## 6. Ressources clés

Le budget `NextTransit_Budget_ProtoMarket_II.xlsx` liste, ligne par ligne, les ressources
matérielles/logicielles concrètes que le grant doit financer — ce ne sont plus des hypothèses :

- **Infrastructure d'hébergement souveraine** : serveur bare-metal dédié chez Icosnet Algeria
  (12 mois, conforme ARPCE 48/2017), stockage objet S3 1 To chez le même hébergeur, base de données
  PostgreSQL managée hébergée en Algérie.
- **Matériel IoT/OBD pour validation terrain** : 5 dongles OBD-II 4G/GPS Teltonika FMB920 (ou
  équivalent), 2 passerelles IoT 4G Teltonika RUT955, 5 capteurs vibration/température BLE/NB-IoT,
  5 cartes SIM M2M (Algérie Télécom/Mobilis).
- **Serveur CI/CD/dev bare-metal** (propriété université, usage libre par le porteur — 180 000 DA,
  le poste le plus lourd du budget logiciel) pour compilation firmware, exécution CAE hors-ligne,
  runner CI/CD self-hosted.
- **Le code et l'architecture existants** : pipeline télémétrie multi-provider déjà construit et
  testé (la ressource technique la plus solide et différenciante du produit aujourd'hui, confirmée
  par audit indépendant du code), architecture RLS multi-tenant.
- **[À COMPLÉTER]** : ressources humaines de l'équipe (compétences, disponibilité au-delà du porteur
  de projet identifié — Farsi Mohamed Akram, Master Technologie de l'Information — Administration
  des Affaires, promotion 2025-2026), capacité de financement propre en complément du grant (les
  salaires ne sont explicitement PAS couverts par ProtoMarket, voir §9).

## 7. Activités clés

- Développement produit continu (rythme réel élevé constaté par l'audit — dette qualité déjà en
  partie traitée cette semaine : CI RLS réellement exécutée, ESLint réellement branché, module
  carburant corrigé, module pneus construit).
- **Validation terrain financée par le grant** : déploiement des 5 dongles OBD sur véhicules pilotes,
  tests d'intégration IoT bout-en-bout par un ingénieur certifié externe (protocoles CAN/K-Line sur
  ≥ 3 modèles de véhicules), audit de sécurité applicative externe (pentest black/grey-box, OWASP
  Top 10, cabinet certifié OSCP/CEH), tests de charge (k6, simulation de 50 véhicules simultanés).
- **Protection de la propriété intellectuelle** : dépôt de brevet INAPI sur la formule/le moteur de
  décision CAE, dépôt logiciel INAPI du code source V0 — les deux explicitément budgétés et justifiés
  dans le dossier comme prérequis à la labellisation Startup MEKS.
- Construction du modèle prédictif "Failure Probability" (entraînement sur crédits GPU + dataset
  annoté de 5 000 entrées OBD) — **activité à mener, pas déjà faite** (voir écarts ci-dessous).
- Sécurisation avant tout pilote client réel (correctifs priorisés dans `audit/07_ROADMAP_MVP.md`).
- Démarches pour l'hébergement souverain algérien — déjà amorcées concrètement via le poste budgétaire
  Icosnet, pas seulement une intention roadmap.

## 8. Partenaires clés

Liste réelle, extraite du budget déposé, pas une hypothèse :

- **Icosnet Algeria** : hébergement bare-metal souverain + stockage objet S3, conforme ARPCE 48/2017.
- **Algérie Télécom / Mobilis** : cartes SIM M2M pour la connectivité des dongles OBD.
- **Teltonika** (fabricant lituanien, matériel largement distribué en Algérie) : dongles OBD-II
  (FMB920) et passerelles IoT (RUT955).
- **Twilio Algeria / Infobip** : passerelle API SMS pour les alertes critiques.
- **Microsoft** (revendeur agréé Algérie) : licences Power BI Pro pour le reporting décisionnel.
- **INAPI** (Institut National Algérien de la Propriété Industrielle) : dépôt brevet + dépôt logiciel.
- **Cabinet de pentest certifié OSCP/CEH** et **ingénieur IoT certifié externe** : validation
  indépendante avant tout pilote client — nom du cabinet non encore choisi dans le fichier budget.
- **Supabase** (infrastructure actuelle, hébergée en Irlande) : environnement de démo/staging
  uniquement, explicitement pas destiné à porter des données client réelles.
- **[À COMPLÉTER]** : établissement d'enseignement supérieur, cellule/incubateur universitaire de
  rattachement, nom du directeur d'incubateur — **ces champs sont vides dans le fichier officiel du
  dossier lui-même** (voir écarts ci-dessous), pas seulement dans ce BMC.

## 9. Structure de coûts

**Budget ProtoMarket, révisé le 2026-08-21 après audit ligne par ligne face aux besoins réels du
SaaS** (fichier `NextTransit_Budget_ProtoMarket_II.xlsx` corrigé directement, formules/totaux/listes
déroulantes vérifiés intacts après édition — détail des corrections en fin de section) :

| Catégorie | Montant demandé | % |
|---|---|---|
| 3.05 — Développement logiciel (hébergement, domaine, SSL, serveur CI/CD sans GPU dupliqué, sauvegardes) | 327 000 DA | 25,5 % |
| 3.06 — IA et données (crédits GPU, annotation dataset OBD — séquencé après collecte pilote) | 125 000 DA | 9,8 % |
| 3.07 — IoT et systèmes embarqués (7 dongles OBD, passerelles, SIM M2M ×7, capteurs, onduleur) | 415 000 DA | 32,4 % |
| 3.09 — Cloud et services numériques (Redis managé, SMS gateway, base managée, stockage S3) | 139 000 DA | 10,8 % |
| 3.10 — Tests, vérification, validation (pentest, tests de charge, tests d'intégration IoT) | 213 000 DA | 16,6 % |
| 3.12 — Propriété intellectuelle (brevet + dépôt logiciel INAPI) | 63 000 DA | 4,9 % |
| **Total demandé (révisé)** | **1 282 000 DA** | **100 %** |
| Montant accordé (Niveau 2) | 1 500 000 DA | — |
| Marge restante | 218 000 DA | 85,5 % du grant utilisé |

**Corrections apportées au budget d'origine (1 322 000 DA → 1 282 000 DA), et pourquoi** :

1. **Licence Microsoft Power BI Pro ×2 (−70 000 DA) → remplacée par une instance Redis managée
   (+30 000 DA)**. Power BI ne correspond pas à l'architecture réelle du produit : les tableaux de
   bord (Control Room, KPI carburant/pneus) sont déjà construits *dans* l'application React elle-même
   — aucun pipeline d'export/ETL vers Power BI n'existe ni n'était budgété pour l'alimenter. À la
   place, Redis manquait explicitement du budget alors que c'est un composant réel et déjà vérifié
   cette semaine (file d'attente BullMQ entre le webhook télémétrie et le worker) — l'omettre du
   budget alors qu'il conditionne tout le pipeline IoT était le vrai trou à combler.
2. **Serveur CI/CD bare-metal : 180 000 DA → 110 000 DA**. Le GPU discret (RTX 8 Go) budgété sur ce
   poste faisait doublon avec les crédits GPU cloud du poste 5 (A100/V100) — payer deux fois la même
   capacité de calcul. La justification "compilation firmware embarqué" ne correspond pas non plus au
   plan réel (dongles Teltonika commerciaux prêts à l'emploi, pas de firmware custom à compiler).
   Reformulé en poste de développement/CI local classique, sans GPU.
3. **Dongles OBD Teltonika : 5 → 7 unités (140 000 DA → 196 000 DA)**, SIM M2M ajustées en
   conséquence (36 000 DA → 50 000 DA pour 7 cartes). Échantillon de validation terrain élargi de
   40 % pour le même ordre de grandeur de dépense libérée par les deux corrections ci-dessus —
   répond directement au besoin de validation statistique plus solide du moteur de règles.
4. **Textes de justification corrigés, sans impact budgétaire** : le poste 1 (serveur bare-metal)
   prétendait héberger "la base de données" alors que le poste 11 budgète une base PostgreSQL
   managée séparée — corrigé pour éviter la contradiction, et pour enfin mentionner explicitement
   Redis/le worker télémétrie. Les postes 5-6 (modèle Failure Probability) précisent maintenant que
   l'entraînement suit la collecte réelle sur le terrain pilote, pas un modèle déjà existant à
   "optimiser".

Le solde ProtoMarket ne couvre que de l'équipement/services ponctuels liés au prototype — voir la
distinction structurelle ci-dessous, inchangée par cette révision.

**Distinction structurelle à garder dans le dossier** : ce budget couvre exclusivement de
l'équipement/services ponctuels liés au prototype. Les règles ProtoMarket (fiche "05 - الدليل
السريع" du même fichier) **interdisent explicitement** : salaires/rémunérations de l'équipe, frais de
déplacement, mobilier, matériel informatique personnel, marketing/publicité, **frais de
fonctionnement récurrents (loyer, électricité, internet, abonnements)**, véhicules, immobilier. Le
financement est versé à l'université, jamais au porteur, et les achats passent par appel d'offres
universitaire.

**Conséquence pour ce BMC** : les coûts réels de fonctionnement de l'entreprise (salaires,
hébergement au-delà des 12 mois financés, support client, marketing) restent **hors grant** et
doivent être couverts par ailleurs (revenus SaaS futurs, financement propre) — à ne pas présenter au
jury comme "couverts" par ProtoMarket.

---

## ⚠️ Écarts trouvés entre le dossier officiel et l'état réel du code — à lire avant tout dépôt

En comparant `NextTransit_Budget_ProtoMarket_II.xlsx` (déjà rempli, dossier n° NT-2026-001) à l'état
du code vérifié cette semaine, plusieurs écarts factuels méritent votre arbitrage avant soumission —
je ne les corrige pas moi-même, ce sont des affirmations qui engagent le dossier :

1. **Le fichier déclare `TRL 05 — nomodèle أولي وظيفي مُنشر (Prototype V0 على Vercel)`** — un
   prototype fonctionnel **déployé sur Vercel**. Je n'ai trouvé **aucune trace de déploiement Vercel**
   dans ce dépôt (pas de `vercel.json`, aucune URL publique référencée). Mon évaluation de cette
   semaine, basée sur l'audit et les vérifications réelles, situe le produit à **TRL4** (chaîne
   télémétrie→dashboard validée en environnement contrôlé/simulé, pas encore sur un vrai boîtier
   embarqué ni déployée publiquement). **Statut (2026-08-21)** : déploiement en cours, pris en charge
   par un collaborateur, attendu plus tard dans la journée — une fois l'URL disponible, à vérifier
   réellement (pas supposer) avant de considérer la déclaration TRL5 comme vraie : que le build
   déployé soit bien fonctionnel (pas une erreur 500/blank page) et pointe vers le bon environnement
   (staging Supabase, pas une base locale inaccessible en production).
2. ~~Les postes budgétaires 5 et 6 (125 000 DA, catégorie IA)~~ **[CORRIGÉ le 2026-08-21]** — la
   justification du fichier budget mentionnait "optimisation du modèle", ce qui supposait
   implicitement qu'un modèle de Failure Probability existait déjà. Reformulé dans le fichier
   lui-même : "entraînement initial", avec séquencement explicite après la collecte réelle sur le
   terrain pilote (voir §9).
3. ~~Le poste Power BI Pro (item 4)~~ **[CORRIGÉ le 2026-08-21]** — poste supprimé du budget, il ne
   correspondait pas à l'architecture réelle (dashboards déjà construits dans l'app React, pas
   d'export vers Power BI). Remplacé par une instance Redis managée, qui comble un vrai trou du
   budget (voir §9, correction 1).
4. **Champs d'identification vides dans le fichier officiel lui-même** (pas seulement dans ce BMC) :
   établissement d'enseignement supérieur, cellule/incubateur universitaire, nom et email du
   directeur d'incubateur, numéro de carte d'identité nationale du porteur, numéro de téléphone. Ce
   sont des champs administratifs obligatoires (le financement transite par l'université) — à
   compléter par vous avant tout dépôt, je n'ai pas cette information.
5. **La date d'notification de financement inscrite est `9/21/26`** (21 septembre 2026), soit environ
   un mois après aujourd'hui — à confirmer : ce fichier représente-t-il un dossier déjà soumis avec
   un niveau de financement déjà officiellement notifié, ou un brouillon de simulation avec une date
   cible ? Cela change la nature de ce document (déclaratif vs. prévisionnel) et donc la marge de
   manœuvre encore disponible pour ajuster le contenu.

---

## Notes pour la rédaction du dossier ProtoMarket

1. **Ne pas sur-vendre l'IA** dans la proposition de valeur écrite du dossier au-delà de ce que le
   budget projette honnêtement — l'argument le plus solide et déjà vérifié est l'IoT/télémétrie
   (justifie le Niveau 2), le volet IA est un plan de construction financé, pas un acquis.
2. Toutes les cases **[À COMPLÉTER]** restantes demandent une décision ou une donnée qui vous
   appartient (statut d'équipe au-delà du porteur, tarification finale, segmentation de marché plus
   fine que le proxy trouvé) — je peux aider à les structurer une fois disponibles, mais je ne les
   invente pas ici.
3. Les 5 points de la section "Écarts trouvés" ci-dessus sont, à mon avis, plus importants pour la
   solidité du dossier que le remplissage du BMC lui-même — un jury technique qui croise le TRL
   déclaré avec l'absence de lien Vercel, ou qui demande à voir le modèle de Failure Probability déjà
   "optimisé", trouvera l'écart en quelques minutes.

**Sources (recherche web)** :
- [Transports-2.pdf — Annuaire Statistique ONS](https://www.ons.dz/IMG/pdf/Transports-2.pdf)
- [Le transport de marchandises en Algérie — BNP Paribas Trade Solutions](https://www.tradesolutions.bnpparibas.com/fr/importer-exporter/algerie/organiser-le-transport-de-marchandises)
- [Statistiques du parc automobile en Algérie — Algerie-rechange.com](https://www.algerie-rechange.com/statistiques-du-parc-automobile-en-algerie-48-a-plus-de-20-ans/)
- [Plus de 62% du parc automobile est constitué de véhicules de tourisme — Algerie360](https://www.algerie360.com/plus-de-62-du-parc-automobile-est-constitue-de-vehicules-de-tourisme-les-vrais-poids-lourds-de-la-circulation/)
- [Tout savoir sur le prix d'une solution SaaS de gestion de flotte automobile — Ubiwan](https://www.ubiwan.net/tout-savoir-sur-le-prix-dune-solution-saas-de-gestion-de-flotte-automobile)
