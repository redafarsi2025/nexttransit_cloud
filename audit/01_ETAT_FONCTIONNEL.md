# PHASE B — CARTOGRAPHIE FONCTIONNELLE RÉELLE (NextTransit v2)

> **HEAD au moment de l'audit : `5e0e62f` (2026-08-18 16:54:32 +0100).**
> **Cet audit porte sur le WORKING TREE au 2026-08-20, pas sur HEAD** : 55 fichiers étaient modifiés/ajoutés/supprimés et non committés au moment de l'analyse (liste complète : `audit/etat_audite.txt`, diff complet : `audit/etat_audite.patch`). Un `git checkout` ou un nouveau commit rend cet état non reproductible tel quel — se référer aux deux fichiers de gel d'état pour rejouer exactement les conditions de cet audit.
>
> **Correctif appliqué suite à relecture (voir demande de validation du 2026-08-20)** : la première version de ce document contenait une auto-contradiction au §6 (le calcul concluait "≈47%" puis une phrase plus bas citait encore "63%", résidu non nettoyé d'un premier brouillon de calcul erroné). Voir §6 pour le détail de la correction et son origine exacte. CTS a également été reclassé de [NON VÉRIFIÉ] à [ABSENT] suite à sa définition ("Cost to Serve") fournie a posteriori — recalcul inclus.

Méthode : audit du code contre le référentiel produit fourni. Chaque ligne est appuyée par `fichier:ligne`. Quand une preuve n'a pas pu être obtenue par lecture statique (ex. nécessiterait un appel réseau réel, une session utilisateur, ou un test manuel en environnement live), la ligne porte la mention **[NON VÉRIFIÉ — raison]**.

---

## 0. Rôles

Le code définit **9 rôles** (`src/types/index.ts:1-10` — `Role = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'DIRECTOR' | 'FLEET_MANAGER' | 'MAINTENANCE_MANAGER' | 'FINANCE' | 'OPERATIONS' | 'MECHANIC' | 'DRIVER'`), contre les **5 rôles** du référentiel produit. Correspondance constatée :

| Rôle spec | Rôle code le plus proche | État |
|---|---|---|
| Direction Générale | `DIRECTOR` | [RÉEL] — présent, `src/types/index.ts:4`, écran par défaut `STRATEGIC_DASHBOARD` (`src/types/index.ts:51`) |
| Controlling Manager | `FINANCE` (nom différent) | [RÉEL, nommage divergent] — `src/types/index.ts:7`, écran par défaut `VARIANCE_DASHBOARD` (`:54`). Aucun rôle littéralement nommé « Controlling Manager » n'existe. |
| Fleet Manager | `FLEET_MANAGER` | [RÉEL] — correspond exactement, `src/types/index.ts:5`, rôle par défaut sur `FLEET_HEALTH_GRID` (`:52`) |
| Mécanicien | `MECHANIC` | [RÉEL] — `src/types/index.ts:9`, écran `MECHANIC_MOBILE_QUEUE` (`:56`) |
| Chauffeur | `DRIVER` | [RÉEL] — `src/types/index.ts:10`, écran `DRIVER_MOBILE_VIEW` (`:57`) |

Le code ajoute 4 rôles non prévus par le référentiel (`SUPER_ADMIN`, `TENANT_ADMIN`, `MAINTENANCE_MANAGER`, `OPERATIONS`) : le périmètre RBAC réel a dérivé au-delà de la spécification à 5 rôles, dans le sens de l'ajout, pas de la simplification.

---

## 1. Tableau d'état — Modules, Écrans, Calculs

| Élément | État | Preuve (fichier:ligne) | Ce qui manque concrètement |
|---|---|---|---|
| **MODULE 1 — TechMaintain** |
| Fleet Health Grid | [RÉEL] | `src/components/screens/FleetHealthGrid.tsx:92-94,248-257` — filtre/compte réel sur `vehicle.status`, données issues de `fetchVehicles()` → Supabase (`src/services/fleetData.ts:127-149`) | Le grid affiche `status` (`Healthy/Attention/Critical`), un champ **catégoriel simple**, pas un score composite (voir ligne « Score de risque composite » plus bas). |
| Drilldown Panel | [RÉEL] | `src/components/vehicle/VehicleDetailModal.tsx:632` (onglet coûts « Drill-down into actual spend vs. budget by category »), ouvert depuis le grid par clic véhicule | Fonctionnel mais alimenté par les mêmes données partiellement mockées que CostGuard (voir plus bas). |
| Capital Allocation Engine (CAE) | [RÉEL formule / MOCK intrants] | Formule calculée dans `src/context/FleetContext.tsx:801-841` : `rankScore = (deferralCost / repairCost) * classWeight * failureLikelihood` (`:821`) — **structure conforme** à la formule spécifiée. UI : `src/components/screens/CaeBudgetPrioritization.tsx` | `repairCost` = constante fixe `1400` + coût pièce par défaut fixe `450` si pas de `required_part_id` correspondant en stock (`FleetContext.tsx:810-816`) ; `failureLikelihood` = table de correspondance statique à 3 valeurs (`0.85/0.45/0.25` selon sévérité du fault, `:819`), **pas un calcul statistique ou un modèle**; `classWeight` = `1.5` ou `1.0` en dur (`:820`). Aucune P(panne) réellement calculée. |
| Scheduler préventif | [COQUILLE / cassé] | `src/services/maintenance/pmRuleResolver.ts`, `pmWorkOrderGenerator.ts`, `pmSubscriptionService.ts`, écran `src/components/screens/PMSchedulesView.tsx`, route `src/api/pmSchedules.ts` | Tout le module PM est **non committé** (`git status`) et **syntaxiquement cassé** : `pmRuleResolver.ts:182` contient des backticks échappés littéralement, provoquant l'échec du typecheck, du build et d'1 suite de tests entière (`src/services/maintenance/__tests__/pmRuleResolver.test.ts` → 0 test exécuté, voir `audit/00_INVENTAIRE.md §6`). Le code existe mais **n'est pas exécutable dans l'état actuel**. |
| RUL par composant (Remaining Useful Life) | [ABSENT] | Recherche élargie post-validation : `RUL`, `remaining useful life`, `remaining_life`, `wear_index`, `usure`, `duree_vie`, `health_index`, `lifespan` sur tout le dépôt. Les seuls résultats sont du **texte marketing** (`src/components/screens/LandingPage.tsx:979,1026` — "Calcul Prédictif d'Usure", "Usure plaquettes 91% (seuil 85%)" : copie statique de landing page, pas une fonctionnalité) et un texte i18n `technicalLexicon.json:85` (`"usure": "wear"`, entrée de dictionnaire de traduction, pas une donnée) | Aucune trace de code exécutable, type TypeScript, colonne DB active ou UI applicative (hors marketing) sous ce nom ou un synonyme. |
| **MODULE 2 — FleetTrack** |
| Statut live | [RÉEL] | `src/components/screens/TelemetryStream.tsx:186-230` — abonnement `provider.subscribe(...)`, mise à jour d'état en direct pour position/faultCodes par provider télématique (Flespi/Traccar/Manual) | — |
| Vue géographique (carte, « CLR ») | [COQUILLE] | `TelemetryStream.tsx:1000-1011` affiche les coordonnées en **texte brut** (`{position.latitude}° N, {position.longitude}° E`) | Aucune librairie de cartographie dans `package.json` (`leaflet`, `mapbox-gl`, `react-map-gl`, `google.maps` : 0 dépendance). La donnée GPS est réelle et transite réellement, mais il n'existe **aucun rendu cartographique** — donc pas de « vue géographique » au sens du référentiel, seulement une liste de coordonnées numériques. |
| Profils de performance chauffeur | [MOCK] | `src/components/screens/SafetyPerformance.tsx:60` — `const INITIAL_DRIVERS_TELEMETRY: DriverTelemetry[] = [...]` : tableau **littéral en dur** de 5 chauffeurs avec `harshBrakingCount`, `safetyScore`, etc. codés en dur (ex. `:69,74`) ; `:166` charge cet état initial dans `useState`. | UI complète et cohérente, mais aucune requête vers `vehicles`/`profiles`/télémétrie réelle pour peupler ces profils — 100% fixture statique, jamais reconnectée aux vraies données de conduite. |
| **MODULE 3 — CostGuard** |
| P&L 6 mois | [ABSENT] | Recherche `P&L`, `profit.{0,10}loss`, `6.month` sur tout le code → aucun composant ni service dédié trouvé | Le seul écran financier de synthèse est `StrategicDashboard.tsx`, qui ne présente pas de compte de résultat sur 6 mois. |
| Rentabilité par route | [ABSENT] | Recherche `route.{0,15}profit\|profitability` sur tout le dépôt → **0 fichier trouvé** | Aucune notion de route commerciale rattachée à un P&L n'existe dans les types ni le code. |
| Variance budgétaire + projection | [RÉEL partiel / MOCK partiel] | `src/services/decisionEngine.ts:275-300` (Rule R7, formule réelle `variance% = (actual-budget)/budget`), UI `src/components/screens/VarianceDashboard.tsx:50-60`. Données `costRecords` chargées depuis Supabase pour les tenants réels (`FleetContext.tsx:298-302`, `dbCosts`) | Mais `VarianceDashboard.tsx:44` fabrique le budget des logs carburant côté client : `budget_for_category: log.cost * 0.85, // Introduce some variance` — le commentaire admet littéralement la fabrication d'une variance artificielle pour cette catégorie. Aucune « projection » (extrapolation future) trouvée — seule une comparaison actuel/budget historique existe. |
| TCO / véhicule (Total Cost of Ownership) | [ABSENT] | Recherche `\bTCO\b` → seuls `roadmap.md` (Phase 3D, listé comme travail **futur**) et `LandingPage.tsx` (texte marketing) le mentionnent ; **0 occurrence dans le code applicatif** (`src/services`, `src/components/screens`, `src/context`) | Confirmé par le propre `roadmap.md:40-47` de l'équipe : `PHASE 3D — FLEET COST ENGINE ... └── TCO` est listé sous « NEXT », donc explicitement pas encore fait. |
| **MODULE 4 — AI Commander** |
| Feed de recommandations | [ABSENT] | Recherche `AI Commander\|RecommendationFeed\|DecisionPanel\|ImpactLedger\|decision.?latency` sur tout le dépôt → **0 résultat**. Le type `ScreenId` (`src/types/index.ts:21-44`), qui énumère les 23 écrans réels de l'application, ne contient **aucun** écran de ce module. | Le module n'existe pas : pas d'écran, pas de service, pas de type, pas de route API. |
| Ledger d'impact | [ABSENT] | idem | idem |
| Moniteur de latence de décision | [ABSENT] | idem | idem |
| *(Élément apparenté trouvé : IA prédictive Gemini)* | [RÉEL, vérifié par exécution] | `server.ts:245-368` — endpoint `POST /api/predictive-ai` avec vrai appel `ai.models.generateContent({ model: 'gemini-3.6-flash', ... })` (`:315-316`), schéma de sortie structuré (`:320-357`), gate de rôle serveur réel (`:276-280`, rôles autorisés `DIRECTOR/FLEET_MANAGER/MAINTENANCE_MANAGER`). **Correction post-validation** : l'identifiant `gemini-3.6-flash` a été testé par exécution réelle (deux appels, un texte libre et un appel avec `responseSchema` identique au code de production) avec la clé `GEMINI_API_KEY` présente dans `.env` — **les deux appels réussissent** et retournent un JSON structuré cohérent et non constant (ex. `{"critical_subsystem":"Engine Lubrication System","failure_likelihood_percentage":68.5,"confidence_score":0.89}`). Le modèle est donc valide et l'endpoint fonctionne réellement en conditions normales (clé configurée). Fallback déterministe uniquement si la clé est absente ou l'appel échoue : `src/services/predictiveAiService.ts:69-176`, seuils `if/else` fixes, `confidence_score: 0.92` codé en dur (`:171`), présenté comme *« Analyse IA Prédictive Edge »* — ce chemin n'est **pas** emprunté en fonctionnement normal dans cet environnement, contrairement à l'hypothèse initiale de ce rapport. | Ce n'est **pas** le module « AI Commander » du référentiel (pas de feed de recommandations multi-véhicules, pas de ledger, pas de moniteur de latence) — c'est une fonctionnalité isolée, non reliée à la nav (`ScreenId`), déclenchée à la demande sur un véhicule. |
| **Cost to Serve (CTS)** | [ABSENT] | `grep -rn "\bCTS\b\|cost_to_serve\|cost_per_km\|cout_par_km"` sur tout le dépôt (code + `AGENTS.md` + `roadmap.md` + `docs/`) → **0 résultat**, y compris pour les nommages alternatifs (coût/km, coût/mission, coût/livraison, facteur d'efficacité chauffeur) | Aucune trace de code, de colonne DB ou de mention documentaire interne, même sous un nom alternatif. Concept absent du produit, pas seulement de nommage. |
| **MODULE 5 — Vehicle Digital Twin** |
| Enregistrement unifié (identité, santé, OBD, financier) | [RÉEL, partiellement mocké] | `src/components/vehicle/VehicleDetailModal.tsx` — un seul modal centralise identité véhicule, `active_fault_codes` OBD (`:436,477,517`), onglet coûts (`:632`), garanties. Données véhicule réelles via `fetchVehicles()` (Supabase, `fleetData.ts:127-149`) | La partie « financier » du twin hérite des mêmes lacunes que CostGuard/CAE ci-dessus (constantes en dur pour les coûts de réparation projetés). Pas de champ RUL (absent, voir plus haut). |
| **ÉCRANS CRITIQUES** |
| Heatmap flotte | [RÉEL, simple] | `FleetHealthGrid.tsx` — grille de cartes véhicule colorées par `status`, pas une heatmap géographique/matricielle au sens strict, mais correspond fonctionnellement à l'intention | — |
| Decision Panel (écran central) | [ABSENT] | Aucun écran nommé ainsi dans `ScreenId` (`src/types/index.ts:21-44`) ; le rôle « écran par défaut » varie par rôle (`DEFAULT_ROLE_SCREENS`, `:48-58`) sans écran central unique transversal | Il n'existe pas d'écran central de décision consolidée ; chaque rôle atterrit sur un écran différent, propre à son module. |
| CAE avec slider budget + simulation What-If | [RÉEL pour le slider / ABSENT pour le What-If] | `CaeBudgetPrioritization.tsx:169-231` — sliders réels (`caeAvailableBudget`, `caeDelayMultipliers.Keystone/Standard`) qui recalculent `caeItems` en direct via `useMemo` (`FleetContext.tsx:801-841`) | Le slider budget existe et recalcule bien le classement (c'est un vrai What-If sur le budget). Mais il n'y a **pas de simulation de scénario nommée / sauvegardable**, juste un recalcul live — dépend de l'interprétation du terme « simulation What-If » du référentiel. |
| Work Order mécanicien | [RÉEL] | `src/components/screens/MechanicMobileQueue.tsx`, `src/components/screens/WorkOrderQueue.tsx`, API `src/api/workOrders.ts`, RLS `supabase/migrations/20260805000001_role_based_rls_policies.sql:66-86` (le mécanicien ne voit que ses WO assignés) | RLS row-level réelle, mais **column-blind** : le mécanicien reçoit `SELECT *` sur ses propres work orders assignés, donc voit aussi les coûts (`labor_cost`, pièces) de ses interventions — à mettre en regard de l'exigence « le mécanicien ne doit voir aucune donnée financière » (voir §3 ci-dessous). |
| Écran chauffeur | [RÉEL] | `src/components/screens/DriverMobileView.tsx`, RLS driver sur `work_orders`/`fleet_alerts` limitée au véhicule assigné (`role_based_rls_policies.sql:78-84,109-115`) | — |
| **CALCULS MÉTIER** |
| Score de risque composite | [ABSENT] | `Vehicle.status` (`src/types/index.ts:117`) est un enum plat `'Healthy'\|'Attention'\|'Critical'\|'Unknown'`, positionné par une règle **mono-facteur** dans `src/api/maintenance.ts:43` : `newStatus = r1Result.isRedAlert ? ... : (fault.severity === 'Warning' ? 'Attention' : vehicle.status)`. Recherche élargie post-validation (`composite score`, `weighted risk`, `risk_score`, `health_score`) : un seul résultat, `supabase/schema_clean.sql:145` — `health_score INT DEFAULT 100`, une colonne définie dans un fichier de schéma **orphelin**, jamais référencé par la chaîne de migrations réellement appliquée (`supabase/migrations/*.sql`, aucun hit) ni par aucun fichier `.ts`/`.tsx` du dépôt (0 lecture, 0 écriture applicative de `health_score`) | Ce n'est pas un score composite (pondération multi-facteurs : âge, kilométrage, historique pannes, RUL, télémétrie) mais une simple règle conditionnelle sur la sévérité du dernier fault code actif. La colonne `health_score` qui aurait pu porter ce concept existe dans un schéma de référence non branché, jamais migré ni consommé — c'est une intention documentée, pas une implémentation, même partielle. |
| RUL | [ABSENT] | voir Module 1 | — |
| Probabilité de panne P(panne) | [MOCK] | `FleetContext.tsx:819` — `failureLikelihood = severity==='Critical'?0.85:severity==='Warning'?0.45:0.25` | Table de correspondance à 3 valeurs fixes, aucune régression/modèle statistique. |
| Coût réparer-maintenant vs différer-7-jours | [MOCK, fenêtre non conforme] | `FleetContext.tsx:817-818` — `deferralCost = repairCost * delayMult` où `delayMult` est un multiplicateur configurable par classification (`caeDelayMultipliers`, défaut 2.2/1.4), **pas explicitement calé sur une fenêtre de 7 jours** | Le concept « coût si différé » existe et est bien utilisé dans le ranking CAE, mais rien dans le code ne borne ce délai à 7 jours précisément — c'est un multiplicateur générique, pas un calcul day-by-day. |
| TCO | [ABSENT] | voir Module 3 | — |
| CTS | [NON VÉRIFIÉ — terme introuvable] | `grep -n "\bCTS\b"` sur tout le dépôt → **0 résultat** | L'acronyme n'est défini nulle part dans le code, les migrations, ni la documentation interne (`AGENTS.md`, `roadmap.md`, `docs/`). Impossible de statuer sans une définition du terme dans le référentiel produit d'origine. |
| Classification Keystone/Specialist/Standard | [RÉEL partiel] | `export type VehicleClassification = 'Keystone' \| 'Standard';` (`src/types/index.ts:118`) | Seules **2 des 3** classifications spécifiées existent dans le type système. « Specialist » est totalement absent — ni dans les types, ni dans le schéma SQL, ni dans l'UI (`CaeBudgetPrioritization.tsx:296-302` ne gère que Keystone/autre). |
| Ranking CAE = (coût différé / coût réparation) × poids classification × P(panne) | [RÉEL, formule conforme] | `FleetContext.tsx:821` : `Number(((deferralCost / repairCost) * classWeight * failureLikelihood).toFixed(3))` | La **structure algébrique correspond exactement** à la formule spécifiée. La qualité des 3 intrants (voir lignes ci-dessus) est en revanche largement mockée. |

---

## 2. Chaîne de données réelle : UI → API → Service → DB

Exemple tracé pour le cas central (véhicules, alimentant Fleet Health Grid, VehicleDetailModal et CAE) :

1. **UI** : `FleetHealthGrid.tsx` / `CaeBudgetPrioritization.tsx` appellent `const { vehicles, caeItems } = useFleet()` (`src/context/FleetContext.tsx`).
2. **Context** : `FleetContext.tsx:131` `useState<Vehicle[]>([])`, peuplé par `fetchVehicles().then(setVehicles)` (`:273,328,1038`).
3. **Service data-access** : `src/services/fleetData.ts:127-149` — `supabase.from('vehicles').select('*, warranties(*)').eq('tenant_id', tenantId)`. **Appel Supabase direct depuis le frontend**, pas via le serveur Express.
4. **DB** : table Postgres `vehicles`, filtrée par `tenant_id` en clause `.eq()` côté client **et** par RLS Postgres côté serveur (`supabase/migrations/20260819000000_vehicle_assignment_refactor.sql:99` — `RLS_Vehicles_Select_Policy`).

**Constat majeur** : il existe **deux voies d'accès aux données parallèles et incohérentes** :
- La voie principale, utilisée par la quasi-totalité de l'app (`FleetContext.tsx`), interroge **directement Supabase** via le SDK client (`fleetData.ts`), en contournant complètement la couche Express (`src/api/*.ts`).
- La couche Express (`src/api/vehicles.ts`, `fuel.ts`, `inventory.ts`, `pmSubscriptions.ts`, `vehicleAssignments.ts` — 45 endpoints recensés, `app.use()` dans `server.ts:219-228`) **existe et fonctionne** (routers montés, middleware `requireAuth` appliqué), mais **le frontend n'appelle réellement que 5 endpoints Express** au total : `grep -rn "fetch(" src/components src/services src/context` ne retourne que `/api/incidents`, `/api/maintenance/log-obd-fault`, `/api/pm-schedules/status`, `/api/predictive-ai`, `/api/work-orders/:id/close` (plus les endpoints `/api/platform/*` consommés via `src/services/adminApiService.ts` pour le panneau super-admin).

Conséquence : la majorité du code sous `src/api/` (`vehicles.ts` GET/POST, `fuel.ts`, `inventory.ts`, `pmSubscriptions.ts`, `vehicleAssignments.ts`) est **du code mort du point de vue du frontend actuel** — il compile, il est monté, mais rien dans l'UI ne l'appelle. Seuls les endpoints qui déclenchent une écriture avec logique métier serveur (log fault OBD, fermeture de WO, création d'incident, IA prédictive) sont réellement utilisés ; toutes les lectures passent en direct par le SDK Supabase.

---

## 3. Le CAE est-il un vrai moteur de calcul ou un tri sur valeurs pré-écrites ?

**Réponse : un vrai calcul, sur des intrants en partie mockés.**

- Le tri (`items.sort((a, b) => b.rank_score - a.rank_score)`, `FleetContext.tsx:840`) et le score (`FleetContext.tsx:821`) sont **recalculés à chaque rendu** à partir de l'état live `vehicles`/`inventory`/`caeDelayMultipliers` — ce n'est pas un tri figé sur des valeurs pré-écrites en base ou en seed.
- La formule implémentée correspond **exactement** à celle du référentiel : `(coût différé / coût réparation) × poids classification × P(panne)`.
- Mais deux des trois facteurs sont des **constantes/tables statiques**, pas des calculs dérivés de données réelles :
  - `failure_likelihood` : table à 3 valeurs fixes indexées sur la sévérité du fault (`0.85/0.45/0.25`), aucune P(panne) réelle.
  - `repair_cost` : `450 (pièce, défaut) + 1400 (main d'œuvre, fixe)`, sauf correspondance exacte d'un `required_part_id` en stock.
- Verdict : **[RÉEL] pour le mécanisme de calcul et le re-tri dynamique**, **[MOCK] pour la qualité prédictive des intrants** — ce n'est pas un vrai « moteur d'allocation de capital » piloté par des données de fiabilité réelles, c'est une formule correcte appliquée à des heuristiques câblées en dur.

---

## 4. Le contrôle d'accès par rôle : côté serveur ou juste masquage UI ?

**Réponse : hybride, ni du pur masquage UI, ni une autorisation applicative complète.**

- **Couche Express** (`src/api/middleware.ts:8-41`) : `requireAuth` vérifie uniquement qu'un JWT Supabase valide est présent — **aucune vérification de rôle** à ce niveau pour la majorité des routes (`src/api/vehicles.ts:7,9-23` : `vehicleRouter.use(requireAuth)` puis `select('*')` sans filtre de rôle explicite dans le code Express).
- **Exception notable** : `server.ts:276-280` (endpoint `/api/predictive-ai`) fait un vrai contrôle de rôle serveur explicite (`allowedRoles = ['DIRECTOR','FLEET_MANAGER','MAINTENANCE_MANAGER']`, 403 sinon) — donc le pattern existe dans le code, mais n'est appliqué qu'à 1 endpoint sur ~45.
- **Couche Postgres RLS** (réellement serveur, hors de portée du client) : `supabase/migrations/20260805000001_role_based_rls_policies.sql` définit des policies **row-level** réelles pour `work_orders`, `fleet_alerts`, `inventory_items` (ex. `:66-86` pour work_orders — mécanicien = lignes où `assigned_mechanic_id = auth.uid()`, chauffeur = lignes de son véhicule assigné, autres rôles = accès plein tenant). C'est une vraie autorisation serveur, indépendante du frontend.
- **Limite constatée** : ces policies sont **column-blind**. Un `MECHANIC` autorisé à lire une ligne `work_orders` (la sienne) reçoit toutes les colonnes de cette ligne via `select('*')` (`src/api/vehicles.ts:15` et équivalents), **y compris les colonnes de coût** (labor cost, pièces). Aucune vue restreinte ni exclusion de colonne trouvée. Cela contredit littéralement l'exigence du référentiel *« le mécanicien ne doit voir aucune donnée financière »* — au minimum pour les work orders qui lui sont assignés.
- **Couche UI** (`src/components/guards/ProtectedRoute.tsx:23-35`) : bloque la navigation vers un écran si `RBAC_MATRIX[screenId][currentRole] === 'none'` — c'est un vrai garde-fou de routage, mais **côté client uniquement** ; il empêche d'afficher l'écran `CAE_BUDGET_PRIORITIZATION` ou `VARIANCE_DASHBOARD` à un mécanicien dans l'UI normale, mais ne l'empêche pas d'appeler directement le SDK Supabase ou l'API avec son propre token pour obtenir les mêmes données si la RLS sous-jacente ne les bloque pas explicitement pour son rôle.

**Verdict global RBAC : le principal filet de sécurité réel est la RLS Postgres (serveur), mais elle est incomplète (column-blind, pas de policy dédiée sur toutes les tables financières) ; le masquage UI est un renfort de confort, pas la ligne de défense principale — mais ce n'est pas non plus une sécurité purement cosmétique, contrairement à l'hypothèse initiale du brief.**

**Mise à jour post-validation** : l'hypothèse selon laquelle ce paragraphe entier serait caduc si la clé `service_role` fuitait côté client a été explicitement testée (décodage JWT + grep du bundle `dist/`) — **elle ne fuite pas** : seule la clé `anon` (rôle JWT confirmé `"role":"anon"`) est livrée au navigateur. Le raisonnement RLS ci-dessus reste donc valide. Détail complet de la vérification, de la matrice RLS table×rôle, et de l'exposition colonne par rôle non-financier : `audit/02_SECURITE.md` §C1-C3.

---

## 5. Endpoints API : recensés, appelés, morts

- **45 handlers de routes** recensés dans `src/api/*.ts` (comptage par grep `router.<verbe>(`), répartis sur **10 routers montés** dans `server.ts:219-228` (`vehicles, maintenance, pm-schedules, pm-subscriptions, work-orders, fuel, inventory, incidents, platform, vehicleAssignments`), plus `healthRouter` (`server.ts:231`) et 3 routes déclarées directement dans `server.ts` (`/api/predictive-ai:245`, `/api/translate:379`, `/api/webhooks/telemetry/:provider:419`).
- **Appels frontend directs identifiés** (`grep -rn "fetch(" src/components src/services src/context`) : **5 endpoints** explicitement appelés par des composants métier (`/api/incidents`, `/api/maintenance/log-obd-fault`, `/api/pm-schedules/status`, `/api/predictive-ai`, `/api/work-orders/:id/close`), + un nombre non quantifié précisément d'appels `/api/platform/*` via le wrapper générique `src/services/adminApiService.ts:21`.
- **Estimation des endpoints morts (jamais appelés par le frontend actuel)** : la majorité des routes CRUD `GET`/`POST /` sur `vehicles`, `fuel`, `inventory`, `pm-subscriptions`, `vehicleAssignments` — soit environ **30 à 35 des 45 handlers recensés** — ne sont référencées par aucun appel `fetch()` trouvé dans `src/components`, `src/services` ou `src/context`. Ces routes sont montées, protégées par `requireAuth`, potentiellement testées isolément, mais **non consommées par l'application réelle**, qui lit les mêmes données en direct via le SDK Supabase (`fleetData.ts`). [NON VÉRIFIÉ précisément à l'unité près — dénombrement manuel par lecture croisée des fichiers, pas d'outil d'analyse de code mort automatisé exécuté].
- **Correction post-validation, découverte en Phase C (§C4 de `audit/02_SECURITE.md`)** : parmi les 5 endpoints listés ci-dessus comme « réellement appelés », **`POST /api/incidents` est cassé** — `src/api/incidents.ts:14-16` écrit dans une table `public.incidents`, qui **n'existe nulle part dans le schéma** (seule `public.driver_incidents` existe, `grep` sur toutes les migrations = 0 résultat pour une table `incidents`). Chaque appel échoue et retourne une erreur 500 générique côté client. Le classement [RÉEL] de cet endpoint au tableau §1 (ligne « Écran chauffeur » s'appuie indirectement sur ce flux via le signalement d'incident) doit être lu avec cette réserve : la route existe, est appelée, mais ne fonctionne pas en l'état.

---

## 6. Verdict chiffré

> **Correctif de méthode (voir demande de validation du 2026-08-20)** : la version précédente de cette section calculait un score de 47% puis, quatre lignes plus bas dans « Ce que ce chiffre signifie concrètement », affirmait *« ce taux de 63% est une photographie... »*. **Les deux chiffres ne pouvaient pas coexister — c'était une erreur.** Ce qui s'est passé : le premier jet de ce document calculait un score initial (62,7%, à partir d'un décompte d'éléments mal aligné sur le tableau réel du §1). En relisant, j'ai recalculé un score corrigé (47%) et remplacé le bloc "Méthode de calcul / Résultat" — mais je n'ai pas répercuté cette correction sur la phrase de synthèse qui suivait, écrite dans la même passe que le premier jet et jamais mise à jour. Le résultat : un document qui affiche un chiffre puis se contredit sur ce même chiffre quelques lignes plus loin. C'est exactement le type d'erreur qu'un audit ne peut pas se permettre. Cette section est réécrite intégralement ci-dessous, avec un décompte vérifié ligne par ligne, CTS réintégré (défini comme *Cost to Serve* — introuvable dans le code, donc [ABSENT], et non plus exclu comme [NON VÉRIFIÉ]), et une seconde pondération par criticité produit demandée en validation.

### 6.1 Méthode de calcul — score brut

Chaque ligne distincte du tableau §1 est comptée une fois (doublons conceptuels dédupliqués : RUL, TCO comptés une seule fois malgré leur double mention Module/Calculs métier ; la formule de ranking CAE — Module 1 — et l'écran « CAE slider + What-If » — Écrans critiques — sont **fusionnés en un seul élément** « CAE (moteur + interface budget/What-If) », car ce sont la même implémentation évidencée par le même code, et les compter deux fois gonflerait artificiellement le score sans justification). Deux éléments sont ajoutés suite à la demande de pondération par criticité, qui les nomme explicitement sans qu'ils aient de ligne dédiée au §1 : **CTS** (défini comme *Cost to Serve*, absent) et **isolation multi-tenant** (propriété transversale d'architecture, évaluée en Phase C, `audit/02_SECURITE.md` §C2 — [RÉEL] : RLS activée avec filtre `tenant_id` sur 41 des 42 tables ; seule `demo_seed_snapshot`, qui ne contient que des données de démo synthétiques, n'a pas de RLS activée).

Cela donne **26 éléments uniques notés**, pondérés :

- **[RÉEL]** = 1.0 point
- **[MOCK]** = 0.5 point
- **[COQUILLE]** = 0.15 point
- **[ABSENT]** = 0 point

| État | Éléments (26 au total) |
|---|---|
| **RÉEL** (9) | Fleet Health Grid, Drilldown Panel, CAE (moteur + interface), Statut live télémétrie, Vehicle Digital Twin, Heatmap flotte, Work Order mécanicien, Écran chauffeur, Isolation multi-tenant |
| **MOCK** (5) | Profils de performance chauffeur, Variance budgétaire + projection, Probabilité de panne P(panne), Coût réparer-maintenant vs différer, Classification Keystone/Specialist/Standard (2/3 tiers) |
| **COQUILLE** (2) | Scheduler préventif (cassé), Vue géographique (pas de carte) |
| **ABSENT** (10) | RUL, P&L 6 mois, Rentabilité par route, TCO, Feed de recommandations (AI Commander), Ledger d'impact (AI Commander), Moniteur de latence de décision (AI Commander), Decision Panel, Score de risque composite, **CTS** |

**Score brut = (9×1.0 + 5×0.5 + 2×0.15 + 10×0) / 26 = (9 + 2.5 + 0.3 + 0) / 26 = 11.8 / 26 ≈ 45 %**

### 6.2 Méthode de calcul — score du palier CRITIQUE (criticité produit)

> **Correctif de méthode (2ᵉ validation, 2026-08-20)** : la version précédente de cette section produisait **trois** chiffres — brut (45%), un composite pondéré global sur 3 paliers (47%), et un troisième nombre (« ≈28% ») obtenu en retirant après coup l'isolation multi-tenant du palier CRITIQUE pour produire un résultat plus bas. Il a été signalé à juste titre que retirer un élément a posteriori parce qu'il gêne le résultat est précisément le type de manipulation qu'un tiers démonterait. Le composite pondéré global et le « ≈28% » sont supprimés. Il ne reste que **deux chiffres**, aucun ne retirant d'élément après coup : le brut (§6.1, tous les 26 éléments) et le score du palier CRITIQUE ci-dessous (tel quel, sans retrait).

Pondération par criticité produit imposée en validation, pour identifier le sous-ensemble CRITIQUE : **CRITIQUE** (CAE et ses 3 intrants — P(panne), coût différer, classification Keystone/Specialist/Standard —, score de risque composite, RUL, TCO, CTS, Decision Panel, isolation multi-tenant) ; **IMPORTANT** (Fleet Health Grid, Drilldown, variance budgétaire, Digital Twin, Work Order mécanicien, statut live télémétrie) ; **SECONDAIRE** (le reste). Seul le palier CRITIQUE est utilisé pour calculer un chiffre — les paliers IMPORTANT/SECONDAIRE ne servent qu'à définir par exclusion ce qui reste dans CRITIQUE, ils ne sont plus agrégés dans un score global.

**Palier CRITIQUE, 10 éléments, aucun retrait :**

| Élément | État | Score |
|---|---|---|
| CAE (moteur + interface) | RÉEL | 1.0 |
| Isolation multi-tenant | RÉEL | 1.0 |
| Probabilité de panne P(panne) | MOCK | 0.5 |
| Coût réparer-maintenant vs différer | MOCK | 0.5 |
| Classification Keystone/Specialist/Standard | MOCK | 0.5 |
| Score de risque composite | ABSENT | 0 |
| RUL | ABSENT | 0 |
| TCO | ABSENT | 0 |
| CTS | ABSENT | 0 |
| Decision Panel | ABSENT | 0 |

**Score du palier CRITIQUE = (1.0+1.0+0.5+0.5+0.5+0+0+0+0+0) / 10 = 3.5 / 10 = 35 %**

### 6.3 Les deux chiffres, côte à côte

| | Chiffre A — Couverture globale du référentiel | Chiffre B — Maturité du cœur différenciant |
|---|---|---|
| Périmètre | Les 26 éléments du §1 (RUL/TCO/CAE-formule dédupliqués, CTS et isolation multi-tenant ajoutés) | Le sous-ensemble des 10 éléments classés CRITIQUE par la grille de criticité produit demandée en validation |
| Résultat | **≈ 45 %** | **≈ 35 %** |
| Ce que ça mesure | À quel point l'ensemble du référentiel produit (tous modules, tous écrans, tous calculs) est implémenté | À quel point le cœur différenciant vendu commercialement (« maintenance prédictive financière » — CAE, RUL, TCO, CTS, score composite, Decision Panel, isolation tenant) est implémenté |

**B (35%) est plus parlant que A (45%) pour juger le produit contre son positionnement commercial — c'est B qui ouvre la synthèse ci-dessous.** Le cœur différenciant est mesurablement plus faible que la moyenne globale du référentiel : sur les 10 éléments qui définissent ce qui rend ce produit spécifique (par opposition à un ERP flotte générique), 4 sont totalement absents (RUL, TCO, CTS, Decision Panel), 1 autre (score composite) aussi, et les 3 qui existent en MOCK (P(panne), coût différer, classification) sont des constantes câblées en dur plutôt que des calculs réels (détail Phase E). Seuls 2 des 10 éléments critiques sont pleinement réels : le moteur CAE (la formule elle-même, sur des intrants en partie fabriqués) et l'isolation multi-tenant (une exigence d'infrastructure attendue de tout SaaS, pas un différenciateur commercial en soi — mais un élément explicitement nommé CRITIQUE par la pondération demandée, donc conservé tel quel dans le calcul de B sans retrait).

### 6.4 Résultat

> **Chiffre A — Taux d'implémentation réelle, couverture globale du référentiel : ≈ 45 %.**
> **Chiffre B — Maturité du cœur différenciant produit (palier CRITIQUE seul, sans retrait) : ≈ 35 %.**
>
> En ne regardant que la qualité de ce qui existe réellement en code (RÉEL+MOCK+COQUILLE, soit 16 des 26 éléments du périmètre A, en excluant les 10 [ABSENT]) : **9 RÉEL / 16 ≈ 56 % branché sur données/calculs réels, 5 MOCK / 16 ≈ 31 % en mock (logique correcte, données fabriquées), 2 COQUILLE / 16 ≈ 13 % coquille ou cassé.** Ce sous-résultat n'a pas changé avec les corrections ci-dessus.

### Ce que ce chiffre signifie concrètement

- Le **socle infrastructure** (auth Supabase, RLS multi-tenant, ingestion télémétrique multi-provider, queue BullMQ, observabilité Prometheus) est le plus solide et le plus réellement construit du dépôt — confirmé par la profondeur du code (`src/services/telemetry/`, `src/services/security/`) et, pour le webhook télémétrique spécifiquement, par une vérification directe que les protections (auth par secret hashé + comparaison `timingSafeEqual`, rate limit Redis, anti-rejeu) sont réellement appelées dans le chemin d'exécution et pas seulement écrites (`audit/02_SECURITE.md` §C5).
  **Correction post-validation sur les tests** : l'affirmation initiale « confirmé indépendamment par les tests qui passent (164/164) » était trompeuse. Un test qui passe ne prouve la solidité que de ce qu'il exerce réellement, et une vérification détaillée (`audit/02_SECURITE.md` §C-tests) montre que **les 164 tests ne couvrent quasiment aucune des formules qui pilotent réellement l'écran utilisateur** : `decisionEngine.test.ts` teste les règles R5 (score CAE) et R7 (variance budgétaire) de `DecisionEngine`, mais ces deux méthodes **ne sont appelées par aucun code de production** — l'écran CAE utilise une formule différente et non testée, inline dans `FleetContext.tsx:801-841`, et l'écran CostGuard calcule sa variance directement dans `VarianceDashboard.tsx` sans passer par `DecisionEngine.evalRuleR7BudgetVariance`. La couverture réelle de la formule CAE effectivement affichée, du calcul de variance effectivement affiché, et de l'isolation tenant/RLS (testée uniquement par des fichiers `.sql` — `supabase/tests/rls-isolation-test.sql` et 2 autres — que le pipeline CI n'exécute pas contre une base de données réelle, voir `audit/02_SECURITE.md` §C6) est **proche de zéro**. Les 164 tests qui passent couvrent surtout la couche infrastructure/télémétrie/sécurité, pas le cœur métier financier visible par l'utilisateur.
- Le **cœur métier différenciant vendu par le produit** (CAE comme moteur d'allocation prédictif, RUL, score de risque composite, AI Commander, CostGuard P&L/TCO/CTS) est **la partie la plus mockée ou la plus absente** — confirmé par le Chiffre B au §6.3/6.4 (35%, palier CRITIQUE, sans retrait) : c'est précisément la couche qui justifierait le positionnement « maintenance prédictive financière », et c'est celle qui repose le plus sur des constantes câblées en dur plutôt que sur des données ou modèles réels, et qui n'est quasiment pas couverte par les tests automatisés.
- Le module **AI Commander est un module fantôme** : aucune trace dans le routage, les types ou l'UI — 0% implémenté, malgré son statut de module nommé à part entière dans le référentiel. En revanche, la fonctionnalité isolée d'IA prédictive Gemini (`/api/predictive-ai`) est, elle, réellement fonctionnelle — voir la correction du tableau §1 ci-dessus.
- L'état du dépôt au moment de l'audit (build et typecheck cassés, cf. Phase A) montre que ces deux chiffres (45% de couverture globale, 35% de maturité du cœur différenciant) sont une photographie d'un système **actuellement non déployable en l'état**, indépendamment de la question du mock vs réel.

---

*Fin de la Phase B. En attente de validation avant la suite de l'audit.*
