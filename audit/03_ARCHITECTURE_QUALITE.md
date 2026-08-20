# PHASE D — ARCHITECTURE & QUALITÉ (NextTransit v2)

> **HEAD au moment de l'audit : `5e0e62f` (2026-08-18 16:54:32 +0100). Audit du WORKING TREE au 2026-08-20, pas de HEAD** — voir `audit/etat_audite.patch` / `audit/etat_audite.txt`. Aucune modification de code source ; lecture seule stricte, cohérent avec les Phases A-C.

---

## D1 — LA DOUBLE IMPLÉMENTATION DE LA LOGIQUE MÉTIER

**C'est le finding le plus important de tout l'audit, tel que signalé en validation : s'il est exact, il invalide le signal de confiance donné par la suite de tests entière, pas seulement les zones où des failles de sécurité ont été trouvées.** Ce qui suit l'établit rigoureusement, avec un cas d'entrée réel calculé à la main.

### D1.1 — Chaque règle de `src/services/decisionEngine.ts`, tracée jusqu'à son appelant réel

| Règle | Ligne | Appelée par du code de production ? | Qui calcule la valeur réellement affichée à la place |
|---|---|---|---|
| R1 `evalRuleR1` (alerte rouge / garantie) | `:82-111` | **Oui** — `src/api/maintenance.ts:41`, `src/services/telemetry/TelemetryIngestionService.ts:189` | — (cette règle est la seule implémentation, pas de duplication) |
| R2 `evalRuleR2` (conflit planning) | `:118-145` | **Non trouvé dans un chemin de production** — aucun appel hors `decisionEngine.test.ts` | Non recherché plus loin dans cet audit — signalé comme deuxième candidat à vérifier (hors périmètre de preuve numérique ci-dessous, qui se concentre sur R5/R7) |
| R3 `evalRuleR3ReserveParts` (réservation pièces) | `:151-174` | **Oui** — `src/api/workOrders.ts:27` | — |
| R4 `evalRuleR4TotalCost` (coût total réparation) | `:180-204` | **Oui** — `src/api/workOrders.ts:30` | — |
| **R5 `evalRuleR5PriorityScore` (score priorité/CAE)** | `:211-239` | **Non.** Seuls appelants : `decisionEngine.test.ts` (tests) et `executeReplayEvaluationBatch` (`:345-350`, elle-même appelée uniquement par `scripts/import-historical-telemetry/replayReportGenerator.ts` — un script d'import historique ponctuel, jamais exécuté par un utilisateur de l'application) | **`src/context/FleetContext.tsx:801-841`** — formule différente, calculée en direct dans le contexte React qui alimente l'écran `CaeBudgetPrioritization.tsx` |
| R6 `evalRuleR6IncidentAudit` (audit incident chauffeur) | `:246-269` | **Oui** — `src/api/incidents.ts:29` (mais cet endpoint cible une table `incidents` inexistante, voir `audit/02_SECURITE.md` C4-3 — la règle est appelée mais l'ensemble de l'endpoint échoue avant que le résultat soit persisté) | — |
| **R7 `evalRuleR7BudgetVariance` (variance budgétaire)** | `:275-300` | **Non.** Seuls appelants : `decisionEngine.test.ts` et `executeReplayEvaluationBatch` (`:359`, même script d'import historique) | **`src/components/screens/VarianceDashboard.tsx:50-60`** — calcul inline `actual - budget`, incluant la fabrication du budget carburant `budget_for_category: log.cost * 0.85` (`:44`, déjà documentée en Phase B) |
| `executeReplayEvaluationBatch` (mode "replay" complet) | `:306-389` | Uniquement par le script d'import historique, jamais par un utilisateur | — |

**Constat additionnel, qui aggrave le diagnostic** : même le seul appelant "quasi-production" de R5 (`executeReplayEvaluationBatch`, ligne 345-350) ne lui passe **pas de données réelles** — il appelle `evalRuleR5PriorityScore({ criticalSeverityFactor: 10, daysUntilRoute: 1, roiCostRatio: 2.5 })` avec **trois constantes fixes**, identiques pour n'importe quel véhicule en alerte critique, quel que soit son kilométrage, sa classification, ses pièces requises ou son planning réel. R5 n'a donc, nulle part dans ce dépôt, jamais été exercée avec des données de véhicule réelles — ni en production, ni dans son seul appelant applicatif.

### D1.2 — Tableau demandé : les deux implémentations donnent-elles le même résultat ?

| Règle | Implémentation A (`decisionEngine.ts`) | Implémentation B (réellement affichée) | Même résultat ? | Laquelle est testée ? |
|---|---|---|---|---|
| Score CAE | R5 : somme pondérée — `(sévérité/10×40) + (facteur_délai×30) + (ratio_ROI/5×30)`, échelle **0-100**, avec palier catégoriel (`URGENT_DISPATCH` ≥75, etc.) | `FleetContext.tsx:821` : produit — `(coût_différé / coût_réparation) × poids_classification × P(panne)`, échelle **non bornée**, typiquement 0.2-3.5, aucun palier catégoriel | **Non — voir calcul complet D1.3, les deux valeurs ne sont même pas sur la même échelle** | Seule **A** (`decisionEngine.test.ts:141-155`) |
| Variance budgétaire | R7 : `((réel − budget) / budget) × 100`, arrondi à 1 décimale, flag si `abs(%) > 10` | `VarianceDashboard.tsx:50-60` : `actual − budget` en valeur absolue (pas en %), affiché directement, sans seuil de déclenchement d'alerte | **Non — A calcule un pourcentage avec seuil d'alerte, B calcule un delta brut sans seuil** | Seule **A** (`decisionEngine.test.ts:176-192`) |

### D1.3 — Cas d'entrée réel, calculé à la main, montrant la divergence numérique complète

Véhicule pris tel quel dans les données de seed (`src/data/seedData.ts:531-555`) — **NX-024-TR « Transit-024 (Keystone Express Coach) »** : `classification: 'Keystone'`, `status: 'Critical'`, fault actif `P0299` (`severity: 'Critical'`, `required_part_id: 'TURBO-SENS-01'`), `scheduled_use_days: 2`. Pièce `TURBO-SENS-01` : `unit_cost: 850` (`seedData.ts:477`).

**Implémentation B (celle réellement affichée à l'écran CAE) — `FleetContext.tsx:801-834` :**
```
partsCost      = 850                          (pièce trouvée en stock, remplace le défaut 450)
repairCost     = 850 + 1400                  = 2250   (constante labor fixe, :816)
delayMult      = caeDelayMultipliers.Keystone = 2.2    (valeur initiale d'état, :345)
deferralCost   = round(2250 × 2.2)           = 4950
failureLikelihood = 0.85                              (fault.severity === 'Critical', :819)
classWeight    = 1.5                                   (classification === 'Keystone', :820)

rank_score     = (deferralCost / repairCost) × classWeight × failureLikelihood
               = (4950 / 2250) × 1.5 × 0.85
               = 2.2 × 1.5 × 0.85
               = 2.805
```
**→ Ce que l'utilisateur voit réellement dans `CaeBudgetPrioritization.tsx` pour ce véhicule : `rank_score = 2.805`.**

**Implémentation A (`DecisionEngine.evalRuleR5PriorityScore`, `decisionEngine.ts:211-239`) — mêmes données réelles du même véhicule, mappées le plus fidèlement possible vers les paramètres attendus par R5 :**
```
criticalSeverityFactor = 10     (fault Critical → convention déjà utilisée ailleurs dans ce même fichier, :348)
daysUntilRoute          = 2      (scheduled_use_days réel du véhicule, seedData.ts:551)
roiCostRatio            = 2.2    (le même ratio deferralCost/repairCost que B calcule, pour une comparaison la plus loyale possible)

severityFactor          = min(10, max(0, 10))           = 10
criticalScoreComponent  = (10/10) × 40                  = 40.0

days                    = max(1, 2)                     = 2
daysFactor              = max(0, (30 − min(30,2))/29)   = 28/29 = 0.96552
daysScoreComponent      = 0.96552 × 30                  = 28.966

roiRatio                = min(5, max(0, 2.2))           = 2.2
roiScoreComponent       = (2.2/5) × 30                  = 13.2

priorityScore = round((40.0 + 28.966 + 13.2) × 10) / 10 = round(821.66) / 10 = 82.2
recommendationLevel = 'URGENT_DISPATCH'  (≥ 75)
```
**→ Ce que l'implémentation testée par les 164 tests aurait produit pour exactement le même véhicule, le même fault, la même classification, le même planning : `priorityScore = 82.2` (échelle 0-100), avec un label catégoriel `URGENT_DISPATCH` qui n'existe même pas dans l'implémentation B.**

**2.805 contre 82.2. Pas seulement des valeurs différentes — des échelles, des unités et jusqu'au type de sortie (nombre continu non borné vs score 0-100 avec palier catégoriel) entièrement différents, pour le même véhicule, le même fault, la même classification.** Une suite de tests qui valide qu'`evalRuleR5PriorityScore` retourne bien `82.2` pour ce cas ne dit strictement rien sur la validité de ce que l'utilisateur voit réellement (`2.805`, calculé par une formule et un code entièrement différents).

### D1.4 — Verdict chiffré : combien des 164 tests couvrent du code réellement exécuté en production ?

Décompte par fichier de test (23 fichiers passants recensés en Phase A) contre la trace d'appel D1.1, étendue à la vérification déjà faite en Phase C (§C6/C-tests) pour les autres services :

- **`decisionEngine.test.ts`** : couvre R1 (utile — R1 est réellement appelée), R2 (utilité non déterminée — non tracée jusqu'à un appelant de production dans cet audit), R3/R4 (utiles — réellement appelées), **R5 et R7 (couverture non représentative — ces implémentations ne sont jamais celles qui produisent la valeur affichée à l'utilisateur)**, R6 (utile mais l'endpoint qui l'appelle est cassé, C4-3).
- **Tests d'infrastructure/télémétrie/sécurité** (`telemetryNormalizer`, `TraccarAdapter`, `TraccarIntegration`, `capabilityResolver`, `deviceResolver`, `WebhookSecurity`, `SecurityStores`, `health`, `metrics`, `demoRls`, `authRateLimit`, `warrantyService`, `fuelService`, `auditService`) : ces 14 fichiers testent des services qui sont, pour la quasi-totalité, réellement dans le chemin d'exécution de production (confirmé en Phase C pour la chaîne webhook télémétrie spécifiquement — C5).
- **Tests cassés/non exécutés** : `pmRuleResolver.test.ts` (0 test exécuté, erreur de syntaxe, Phase A).
- **Tests sur du code mort/non-branché** : `platformAdminService.server.test.ts`, `platformAdmin.test.ts` couvrent une surface elle-même vérifiée réelle en Phase C (C9) — utiles.

**Verdict** : sur les 164 tests qui passent, une **minorité identifiable et non négligeable** (tous les tests de `decisionEngine.test.ts` portant spécifiquement sur R5 et R7 — les deux règles au cœur du positionnement produit « maintenance prédictive financière ») valide un code qui **n'est pas celui qui produit ce que l'utilisateur voit à l'écran**. Le reste de la suite (infrastructure, télémétrie, sécurité, R1/R3/R4/R6) couvre bien, lui, des chemins de production réels. **Le signal de confiance « 164 tests passent » n'est donc pas invalidé dans sa totalité, mais il est trompeur précisément sur les deux formules qui constituent l'argument de vente du produit** — c'est une conclusion plus précise et plus défendable que « tous les tests sont inutiles », et c'est celle que les preuves soutiennent.

---

## D2 — Schéma de données réel vs types TypeScript

- **`incidents` vs `driver_incidents`** (déjà établi en Phase C, C4-3) : `src/api/incidents.ts` cible une table qui n'existe dans aucune migration — divergence directe entre le code et le schéma.
- **`health_score`** (déjà établi en Phase B) : colonne définie dans `supabase/schema_clean.sql:145`, un fichier de schéma jamais appliqué par la chaîne de migrations réelle — le type `Vehicle` (`src/types/index.ts`) ne la déclare pas non plus. Trois sources (migrations réelles, schéma orphelin, types TS) en désaccord sur un seul champ.
- **Deux modèles de tenant coexistants** (déjà établi en Phase C, C2-2) : `companies`/`company_id` (schéma epic1 auth d'origine) et `tenants`/`tenant_id` (refonte SaaS ultérieure) coexistent dans le même schéma actif, sans dépréciation de l'un au profit de l'autre.
- **Réconciliation contre l'état réellement déployé non aboutie** : comme documenté dans `audit/02_SECURITE.md` (section « RÉCONCILIATION BASE RÉELLE »), l'accès direct à la base de production n'a pas pu être obtenu (mot de passe fourni rejeté par le serveur). Cette section D2 reste donc, comme le C2 de la Phase C, basée sur la lecture des fichiers de migration — **[NON VÉRIFIÉ contre l'état réel]**, limite héritée et non résolue dans cette phase.

---

## D3 — Cohérence architecturale

- **Double voie d'accès aux données** (établie en Phase B §2) : la quasi-totalité des lectures de l'application passent par le SDK Supabase en direct depuis le frontend (`fleetData.ts`), en contournant la couche Express (`src/api/*.ts`) presque entièrement — seuls 5 endpoints Express sur 45 handlers recensés sont réellement appelés (Phase B §5). Cette architecture à deux voies parallèles, l'une quasi-morte, est une source de confusion pour quiconque doit maintenir ou étendre l'API : rien n'indique dans le code lui-même laquelle des deux voies est la voie « officielle » pour une nouvelle fonctionnalité.
- **Deux implémentations de la même logique métier** (D1 ci-dessus) — le symptôme le plus grave de cette absence de voie unique : la logique R5/R7 a été écrite deux fois, dans deux couches différentes de cette architecture à deux voies, sans jamais être unifiée.
- **Deux modèles de tenant** (D2/C2-2) — même pattern de duplication non résolue, au niveau du schéma cette fois.

---

## D4 — Dette technique

| Élément | Preuve | Constat |
|---|---|---|
| `src/context/FleetContext_old.tsx` | 1276 lignes, 0 import trouvé nulle part dans `src/` (vérifié Phase A) | Fichier mort, laissé dans l'arborescence source (pas même déplacé vers `scripts/archive/`) |
| `patch-fleet-context.cjs`, `-2.cjs`, `-3.cjs` (racine) | 3 scripts qui font des remplacements de chaînes littérales dans `FleetContext.tsx` via `fs.readFileSync`/`writeFileSync` | Pattern de développement par patch mécanique de texte plutôt que par édition directe — fragile (dépend de correspondances de texte exactes), non revu par un outil de diff standard |
| `scripts/archive/*.cjs` (9 fichiers) | `append_fuel_costs.cjs`, `fix_ts.cjs`, `refactor_contexts.cjs`, `rewrite_fleet_context.cjs`, `update_audit_log.cjs`/`_2.cjs`, `update_audits.cjs`/`_2.cjs` | Même pattern, archivé — confirme que c'est un mode de travail récurrent sur ce projet, pas un accident isolé |
| `: any` / `as any` | 285 occurrences dans `src/` (compté en Phase A) | Érosion significative du typage strict sur un projet qui se présente comme « Enterprise-Ready » |
| Deux fichiers `.env.example` | `.env.example` et `.env.docker.example` (Phase C, C1-1) | Deux sources de vérité de configuration à maintenir en synchronisation manuelle |
| `lint` npm script trompeur | `package.json` : `"lint": "tsc --noEmit"`, alors qu'un vrai `.eslintrc.json` existe mais qu'`eslint` n'est pas installé (Phase A) | Le nom du script ne correspond pas à ce qu'il fait — même pattern de nommage trompeur que l'étape CI « Automated RLS ... Audit » qui ne teste rien (Phase C, C6-1) |

---

## D5 — Gestion d'erreurs

**Pattern dominant, systématique dans `src/api/*.ts`** : `catch (error: any) { res.status(500).json({ error: error.message }) }`, identique dans `vehicles.ts`, `maintenance.ts`, `workOrders.ts`, `incidents.ts`, `pmSchedules.ts`, `pmSubscriptions.ts`. Conséquences concrètes déjà rencontrées dans cet audit :
- **C4-3** (`audit/02_SECURITE.md`) : l'erreur « table `incidents` introuvable » (une erreur de configuration permanente) et une erreur transitoire légitime (ex. timeout réseau) produisent exactement la même réponse 500 générique — aucune télémétrie ne permet de distinguer un bug de code d'un incident d'infrastructure passager.
- **C4-1** : le filtre PostgREST invalide (`tenant_id=eq.undefined`) échoue silencieusement dans le même moule 500 générique — rien dans les métriques Prometheus déjà en place (`src/lib/metrics.ts`, utilisées ailleurs pour la télémétrie, absentes ici) ne différencie ce cas des autres erreurs serveur.

**Correctif transversal** (au-delà des correctifs déjà décrits Phase C pour chaque cas précis) : distinguer au minimum les erreurs de validation (400), d'autorisation (403), de ressource introuvable (404) et d'erreur serveur réelle (500) plutôt que de tout aplatir sur 500 ; envisager un middleware d'erreur Express centralisé (le projet en a déjà un, `server.ts:497`, mais les routers individuels interceptent et répondent avant qu'il ne s'exécute — il n'est donc jamais atteint pour ces erreurs).

---

## D6 — Performance

- **Requêtes séquentielles en boucle (N+1)** : `src/api/workOrders.ts:38-44` et `:48-57` — deux boucles `for (const res of r3Result) { await supabase... }` distinctes, chacune faisant un aller-retour DB par pièce détachée d'un work order. Pour un work order à N pièces, c'est 2×N requêtes séquentielles avant même l'insertion du work order lui-même, au lieu d'un batch update/insert unique.
- **`select('*')` sans pagination** : présent dans `vehicles.ts`, `fuel.ts`, `inventory.ts`, `maintenance.ts` (×2), `pmSchedules.ts`, `pmSubscriptions.ts` (×2), `workOrders.ts` (×2), et **7 occurrences** dans `fleetData.ts` (la voie d'accès principale du frontend). Aucun `.limit()`/`.range()` trouvé sur ces requêtes — à l'échelle actuelle des données de démo, sans impact perceptible ; sur une flotte réelle de plusieurs milliers de véhicules/work orders, chaque chargement d'écran rapatrierait l'intégralité de la table concernée.

**Correctif** : convertir les boucles de `workOrders.ts` en opérations batch (`.upsert()` avec un tableau, ou une fonction RPC Postgres unique) ; ajouter une pagination par défaut sur les endpoints/lectures qui n'en ont pas.

---

## D7 — Tests

Déjà largement couvert par D1 (qualité/pertinence de la couverture) et par `audit/02_SECURITE.md` C6-1 (absence de `@vitest/coverage-v8`, étape CI RLS qui ne teste rien réellement). Point additionnel non couvert ailleurs :

- **Aucun test d'intégration** (Supertest est une dépendance du projet, `package.json`, mais utilisé seulement dans `platformAdmin.test.ts` d'après les fichiers de test recensés) ne couvre les 5 endpoints Express réellement appelés par le frontend (`/api/incidents`, `/api/maintenance/log-obd-fault`, `/api/pm-schedules/status`, `/api/predictive-ai`, `/api/work-orders/:id/close`) — c'est exactement l'absence de test qui a laissé passer C4-1, C4-2 et C4-3 (Phase C) sans qu'aucune suite ne les détecte.

---

*Fin de la Phase D. En attente de validation avant la Phase E.*
