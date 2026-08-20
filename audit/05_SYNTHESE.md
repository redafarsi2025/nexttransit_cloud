# PHASE F — SYNTHÈSE FINALE (NextTransit v2)

> **Audit du WORKING TREE au 2026-08-20, HEAD = `5e0e62f` (2026-08-18 16:54:32 +0100), NON reproductible en l'état** : 55 fichiers modifiés/ajoutés/supprimés non committés au moment de l'audit (`audit/etat_audite.txt`, `audit/etat_audite.patch`). Périmètre : code source, schéma SQL versionné, 5 livrables d'audit (`00_INVENTAIRE.md`, `01_ETAT_FONCTIONNEL.md`, `02_SECURITE.md`, `03_ARCHITECTURE_QUALITE.md`, `04_LOGIQUE_METIER.md`). Base de données réellement déployée non accessible (voir angles morts, `audit/06_PREUVES.md`).

---

## 1. Verdict — 10 lignes

NextTransit v2 est un socle d'infrastructure réel (auth, RLS multi-tenant, ingestion télémétrique, sécurité webhook, panneau super-admin) sur lequel repose un cœur métier financier très majoritairement fictif. La logique qui calcule ce qu'un client verrait à l'écran (score CAE, variance budgétaire) n'est pas celle que 164 tests valident — deux implémentations distinctes et numériquement incompatibles coexistent, et seule celle qui n'est jamais exécutée par un utilisateur est testée. Les montants affichés à un client algérien ne sont pas crédibles : les constantes de coût du CAE sont environ 30 à 40 fois trop basses par rapport aux données de démonstration du dépôt lui-même. Un compte authentifié sans privilège particulier peut aujourd'hui falsifier la piste d'audit qui sert de preuve en cas de litige. Le produit contient à quatre reprises un mécanisme dont le nom promet une garantie que le code ne tient pas — une CI de sécurité qui ne teste rien, un anti-brute-force contourné par construction, un score de confiance IA inventé, une suite de tests qui ne couvre pas ce qui compte. Ce n'est pas un problème de qualité de code isolé : c'est un mode de développement (46 000 lignes en 10 jours, patch de texte mécanique, aucune CI qui exécute réellement quoi que ce soit) qui produit ce résultat de façon prévisible. Le build et le typecheck sont cassés au moment de l'audit. AI Commander, RUL, TCO, CTS n'existent pas. Le socle infrastructure, lui, est solide et mérite d'être conservé. Le produit n'est pas vendable en l'état à un client payant sur son argument différenciant.

---

## 2. Les deux chiffres

> **Chiffre B — Maturité du cœur différenciant produit (palier CRITIQUE seul, sans retrait) : ≈ 35 %.** Sur les 10 éléments qui définissent ce qui rend ce produit spécifique par rapport à un ERP flotte générique (CAE et ses 3 intrants, score de risque composite, RUL, TCO, CTS, Decision Panel, isolation multi-tenant), 5 sont totalement absents et 3 des 2 restants sont des constantes câblées en dur plutôt que des calculs réels.
>
> Chiffre A — Couverture globale du référentiel produit (les 26 éléments du référentiel, tous modules confondus) : **≈ 45 %.**
>
> Méthode complète, décompte élément par élément : `audit/01_ETAT_FONCTIONNEL.md` §6.

---

## 3. Le motif récurrent — la garantie fantôme

**« Le nom de la garantie existe, la garantie n'existe pas. »**

Ce motif est apparu quatre fois, indépendamment, dans quatre couches différentes du produit (CI, authentification, IA, tests) — ce n'est pas quatre bugs isolés, c'est une signature de méthode de développement.

| # | Nom de la garantie | Ce que le nom promet | Ce qui existe réellement | Preuve |
|---|---|---|---|---|
| 1 | Étape CI *« Automated RLS Multi-Tenant Security & Isolation Audit »* | Que l'isolation entre tenants est vérifiée automatiquement à chaque commit | `test -f supabase/tests/rls-isolation-test.sql` — une vérification que le fichier existe sur le disque, jamais exécuté contre une base | `.github/workflows/ci-cd.yml:34-36` |
| 2 | Verrouillage anti-brute-force (5 tentatives, 15 min) | Qu'un compte est protégé contre les attaques par force brute | Câblé au vrai flux de connexion, mais l'application ne vit que côté navigateur (`Map` en mémoire, vidée au rechargement) et sa persistance en base est bloquée par RLS pour l'acteur non authentifié précisément visé | `audit/02_SECURITE.md` C10-1 |
| 3 | `confidence_score` d'une *« Analyse IA Prédictive »* | Une mesure réelle de la confiance du système dans sa prédiction | `0.92` codé en dur dans le chemin de repli, identique quel que soit le véhicule ou l'anomalie | `src/services/predictiveAiService.ts:171` |
| 4 | Suite de 164 tests au vert | Que la logique métier affichée à l'utilisateur est validée | Teste une implémentation parallèle (`DecisionEngine`) jamais appelée par un chemin de production pour les deux formules financières centrales (CAE, variance) | D1, `audit/03_ARCHITECTURE_QUALITE.md` |
| 5 *(trouvée pendant cet audit, pas cherchée)* | `forensic_audit_report.md`, rapport d'audit interne du 18/08/2026, présent dans le dépôt | *« 145 tests au total, 100% au vert »*, *« typecheck passe avec 0 erreur »*, *« Le MVP applicatif est un succès total »* | Faux dès la réouverture du dépôt deux jours plus tard (Phase A de cet audit) : build et typecheck cassés, une suite de test entière ne charge pas | `audit/00_INVENTAIRE.md` §5 |

**Pourquoi c'est prévisible, pas accidentel** : 46 000 lignes de TypeScript/SQL en 27 commits sur 10 jours (`audit/00_INVENTAIRE.md` §4), avec un mode de travail documenté par le dépôt lui-même — 3 scripts `patch-fleet-context*.cjs` et 9 scripts archivés qui réécrivent du code par remplacement de texte plutôt que par édition directe (`audit/03_ARCHITECTURE_QUALITE.md` D4), et une CI qui ne fait effectivement tourner ni les tests RLS ni un vrai lint (`"lint": "tsc --noEmit"`, `eslint` non installé malgré une config présente). À cette vitesse et avec ces outils, écrire le nom d'une garantie coûte une ligne de commentaire ; construire la garantie coûte du temps que le rythme observé n'a pas laissé. Le motif n'est donc pas une négligence ponctuelle : c'est la conséquence mécanique du rythme.

**Règle de conduite qui en découle, pour la suite des travaux sur ce dépôt : aucun nom de fonction, aucun commentaire, aucun nom d'étape CI, aucun rapport interne — y compris les précédents livrables de cet audit — ne vaut preuve. Seule une exécution vaut preuve.** C'est la raison d'être de `audit/06_PREUVES.md`, qui applique cette règle à cet audit lui-même.

---

## 4. Les 10 problèmes les plus graves (hiérarchie imposée, pas triée par sévérité technique)

1. **D1 — Double implémentation de la logique métier financière.** `DecisionEngine.evalRuleR5PriorityScore`/`evalRuleR7BudgetVariance` (testés, jamais exécutés en production) vs les formules réellement affichées dans `FleetContext.tsx`/`VarianceDashboard.tsx` (jamais testées). Même véhicule réel (NX-024-TR), même panne (P0299) : le code testé produit `82.2` sur une échelle 0-100 avec le label `URGENT_DISPATCH` ; l'écran affiche `2.805`, sans borne, sans label. **Conséquence explicite : la suite de 164 tests ne mesure quasiment rien de ce qu'un client voit à l'écran sur les deux formules qui constituent l'argument de vente du produit.** (`audit/03_ARCHITECTURE_QUALITE.md` D1)
2. **Constantes CAE incohérentes avec l'échelle DZD — écart ~30-40×.** Voir développement complet §5 ci-dessous.
3. **C4-2 [CRITIQUE] — `POST /api/maintenance/log-obd-fault`.** N'importe quel compte authentifié du tenant peut, sans contournement, faire passer n'importe quel véhicule en alerte rouge et écrire une fausse panne critique dans `audit_log` — la table qui fait foi en cas de litige, d'accident ou de contestation d'une décision de maintenance. (`audit/02_SECURITE.md` C4-2)
4. **C4-1 [ÉLEVÉ] — `GET /api/pm-schedules/status`, client `service_role` (RLS bypass) + scoping tenant cassé (`user.tenant_id` inexistant).** N'exploite personne aujourd'hui (échoue en 500), mais c'est un fusil chargé pour une fuite cross-tenant totale sans aucun test de garde. (`audit/02_SECURITE.md` C4-1)
5. **C4-3 [ÉLEVÉ] — `POST /api/incidents` cible une table `incidents` qui n'existe pas.** Une des 5 seules fonctionnalités que le frontend appelle réellement (signalement d'incident chauffeur) est non opérationnelle en production. (`audit/02_SECURITE.md` C4-3)
6. **C7-1 [ÉLEVÉ] — Aucune durée de conservation pour les données de géolocalisation chauffeur.** Conservées indéfiniment par défaut, aucune tâche de purge trouvée. (`audit/02_SECURITE.md` C7-1)
7. **C10-1 [ÉLEVÉ] — Le verrou anti-brute-force est contournable par construction.** Voir motif récurrent #2 ci-dessus. (`audit/02_SECURITE.md` C10-1)
8. **C2-2 [MOYEN] — Deux modèles de tenant coexistent (`companies`/`company_id` vs `tenants`/`tenant_id`).** Aucune table mal scopée aujourd'hui, mais c'est le terrain exact d'une future fuite cross-tenant. (`audit/02_SECURITE.md` C2-2)
9. **C3-1 [MOYEN] — `MECHANIC`/`DRIVER` reçoivent les colonnes de coût sur leurs propres work orders.** Violation directe de l'exigence explicite du référentiel (« le mécanicien ne doit voir aucune donnée financière »). (`audit/02_SECURITE.md` C3-1)
10. **C4-5 [MOYEN] — Absence quasi systémique de validation de schéma (Zod) sur les endpoints Express qui écrivent en base.** Cause racine commune à une partie des findings 3-5 ci-dessus — `zod` est déjà une dépendance utilisée ailleurs dans le même projet, pas un outil absent. (`audit/02_SECURITE.md` C4-5)

---

## 5. Vérification demandée : les constantes CAE sont-elles cohérentes avec l'échelle DZD ?

**Non — et le dépôt contient sa propre preuve, sans qu'il soit nécessaire de sortir du code pour la trouver.**

`src/services/demoSeedService.ts:645-651` définit un work order de démonstration entièrement cohérent, à l'échelle algérienne : une pièce réelle, *« Volvo OEM Heavy Duty Turbocharger Pressure Sensor »*, à **`unit_cost: 18500`** (DZD), et **`hourly_rate: 1400`** (DZD/heure) pour `labor_hours: 6` — soit un coût de main d'œuvre de `6 × 1400 = 8400` DZD, pour un total pièce + main d'œuvre de **26 900 DZD**. C'est très exactement le même ordre de grandeur que la référence de spécification produit citée en validation (18 500 DZD pour une réparation de plaquettes, pièces + 3,5h de main d'œuvre) — au point qu'il est vraisemblable que ce soit la même source de vérité produit qui ait alimenté les deux.

Comparé à cela, les constantes du moteur CAE (`src/context/FleetContext.tsx:810-816`) :
- **Coût pièce par défaut : `450`.** Face à un vrai coût de pièce spécialisée du même dépôt (`18500`), c'est un écart de **~41×**. Même en admettant qu'une pièce générique coûte moins qu'un capteur de turbo OEM, un écart de cet ordre indique que `450` n'a pas été pensé à l'échelle DZD.
- **Main d'œuvre : `+ 1400`, un montant fixe qui ne dépend pas du nombre d'heures.** C'est structurellement incompatible avec le modèle utilisé partout ailleurs dans le même produit (`labor_cost = labor_hours × hourly_rate`, `FleetContext.tsx:515`, `decisionEngine.ts` Rule R4, `demoSeedService.ts`). Si on le lit malgré tout comme un forfait main d'œuvre pour une intervention typique de plusieurs heures, il implique un taux horaire très inférieur au `1400` DZD/heure déjà utilisé dans le même fichier de seed pour des interventions comparables.
- **Recherche complémentaire dans le reste du code** : le champ `hourly_rate` est câblé à des valeurs radicalement différentes selon le fichier — `85` (`TelemetryStream.tsx:138`, `PMSchedulesView.tsx:121`), `140` (`CaeBudgetPrioritization.tsx:56`, `VehicleDetailModal.tsx:158`, `IncidentReports.tsx:33`, 3× dans `seedData.ts`), `1400` (5× dans `demoSeedService.ts`), `2250` (`SafetyPerformance.tsx:243`) — un facteur **~26×** entre la valeur la plus basse et la plus haute pour un seul et même champ, sans qu'aucune de ces valeurs ne porte d'annotation d'unité ou de devise dans le type (`hourly_rate: number`, `src/types/index.ts:214`). Autre symptôme du même problème : `WorkOrderQueue.tsx:198` affiche `${order.hourly_rate}/hr` avec un **`$` littéral câblé en dur dans le JSX**, alors que `CaeBudgetPrioritization.tsx` utilise, lui, `activeTenant?.currencySymbol` dynamique — deux écrans du même produit n'affichent même pas la devise de façon cohérente.

**Conclusion probable, confirmée par les preuves internes ci-dessus** : les constantes du moteur CAE ont été écrites à une échelle numérique arbitraire (vraisemblablement héritée d'un premier jet en USD ou simplement choisie sans référence à une donnée réelle), puis affichées avec le symbole de devise du tenant sans jamais être reconverties ou revalidées à cette échelle. **Réponse directe à la question posée : les montants affichés aujourd'hui par le moteur CAE à un client configuré en DZD ne sont pas crédibles.** Ce ne sont pas des approximations raisonnables d'un vrai coût de réparation algérien — ils sont environ 30 à 40 fois trop bas pour les pièces, et structurellement incohérents pour la main d'œuvre, par comparaison directe avec les propres données de démonstration du produit.

---

## 6. Backlog priorisé

**Estimations d'effort : ordres de grandeur défendables sur la base du volume de code déjà lu et cité dans les 5 rapports précédents (fichiers concernés connus, pas une estimation à l'aveugle) — pas des mesures d'ingénierie précises, qui nécessiteraient un chiffrage par l'équipe elle-même.**

### Bloc 1 — AVANT TOUTE DÉMO (sans quoi une démo est un mensonge ou un crash)

| # | Problème | Sévérité | Effort | Ce que ça débloque | Fichiers |
|---|---|---|---|---|---|
| 1.1 | `pmRuleResolver.ts` cassé (backticks échappés) → build/typecheck/1 suite de test cassés | Bloquant | 15 min | Un build qui compile, un typecheck qui passe | `src/services/maintenance/pmRuleResolver.ts:182` |
| 1.2 | `POST /api/incidents` cible une table inexistante | ÉLEVÉ | 30 min | Le signalement d'incident chauffeur fonctionne | `src/api/incidents.ts:15` |
| 1.3 | Constantes CAE à l'échelle DZD — au minimum aligner sur les valeurs déjà présentes dans `demoSeedService.ts` (18500/1400) pour ne pas afficher des montants absurdes en démo | ÉLEVÉ (crédibilité) | 2-4 h | Une démo où les chiffres financiers ne sont pas immédiatement contredits par un client qui connaît ses propres coûts | `src/context/FleetContext.tsx:810-820` |
| 1.4 | `WorkOrderQueue.tsx` : `$` câblé en dur au lieu de `currencySymbol` | FAIBLE (mais visible) | 15 min | Cohérence visuelle devise sur l'écran le plus consulté par un mécanicien | `src/components/screens/WorkOrderQueue.tsx:198` |
| 1.5 | `lint` npm script trompeur — installer `eslint` réellement ou renommer le script | FAIBLE | 1-2 h | Un vrai signal de qualité, pas un nom qui ment (motif récurrent §3) | `package.json`, `.eslintrc.json` |

**Sous-total Bloc 1 : ≈ 1 jour-homme.**

### Bloc 2 — AVANT UN PILOTE CLIENT RÉEL (sans quoi on expose des données ou des chiffres faux)

| # | Problème | Sévérité | Effort | Ce que ça débloque | Fichiers |
|---|---|---|---|---|---|
| 2.1 | C4-2 : contrôle de rôle + appartenance sur `log-obd-fault` | CRITIQUE | 0.5-1 j | Empêche la falsification d'`audit_log` par un compte à faible privilège | `src/api/maintenance.ts` |
| 2.2 | C4-1 : corriger `user.tenant_id` → `user.user_metadata.tenant_id` (7 occurrences), ne plus utiliser `supabaseAdmin` sans re-vérification stricte du tenant | ÉLEVÉ | 0.5 j | Ferme le risque de fuite cross-tenant latent le plus dangereux du dépôt | `src/api/pmSchedules.ts:37`, `src/api/pmSubscriptions.ts` (6 lignes) |
| 2.3 | C10-1 : déplacer l'anti-brute-force côté serveur (proxy de login ou hook Auth) | ÉLEVÉ | 1-2 j | Une protection anti-brute-force qui protège réellement | `src/services/authService.ts`, flux de login |
| 2.4 | C3-1 : masquer les colonnes financières pour `MECHANIC`/`DRIVER` (vue restreinte ou projection de colonnes) | MOYEN | 1 j | Conformité à l'exigence explicite du référentiel | `src/api/vehicles.ts`, `src/api/workOrders.ts`, RLS |
| 2.5 | C4-5 : validation Zod sur `maintenance.ts`, `workOrders.ts`, `incidents.ts`, `pmSchedules.ts`, `pmSubscriptions.ts` | MOYEN | 1-2 j | Ferme la cause racine commune à plusieurs findings | `src/api/*.ts` |
| 2.6 | C2-2 : documenter/planifier la dépréciation d'un des deux modèles de tenant | MOYEN | 0.5 j (documentation) + chantier séparé pour la migration réelle | Réduit le risque de future table mal scopée | `AGENTS.md`, migrations |
| 2.7 | C7-1 : politique de rétention GPS + tâche de purge | ÉLEVÉ | 1 j | Réduit l'exposition réglementaire sur des données de conduite réelles | `telemetry_events`, `worker.ts`/BullMQ |
| 2.8 | Réconciliation base réelle (angle mort de cet audit) : obtenir un accès DB valide et exécuter les 3 requêtes de vérification RLS | Prérequis pour clore C2 | 0.5 j (une fois l'accès obtenu) | Confirme ou infirme que le schéma déployé correspond aux migrations versionnées | Accès DB, voir `audit/02_SECURITE.md` |

**Sous-total Bloc 2 : ≈ 6-9 jours-homme.**

### Bloc 3 — AVANT PRODUCTION (le reste)

| # | Problème | Sévérité | Effort | Ce que ça débloque | Fichiers |
|---|---|---|---|---|---|
| 3.1 | **D1 : unifier la logique CAE/variance en une seule implémentation testée** — le chantier le plus structurant de tout le backlog | Fondamental | 3-5 j | Un signal de test qui veut réellement dire quelque chose sur le cœur du produit | `src/services/decisionEngine.ts`, `src/context/FleetContext.tsx`, `src/components/screens/VarianceDashboard.tsx` |
| 3.2 | CSP : retirer `unsafe-inline`/`unsafe-eval`, passer aux nonces | MOYEN | 1-2 j | Une vraie deuxième ligne de défense XSS | `server.ts` |
| 3.3 | Rate limiter Express → backend Redis partagé (cohérence avec le rate limiter webhook déjà en place) | MOYEN | 0.5-1 j | Une limite de débit qui survit au scaling horizontal | `server.ts` |
| 3.4 | N+1 dans `workOrders.ts` → batch | MOYEN | 0.5 j | Performance à l'échelle d'une vraie flotte | `src/api/workOrders.ts` |
| 3.5 | Pagination sur les `select('*')` non bornés (`fleetData.ts` et 7 endpoints) | MOYEN | 1-2 j | Évite le rapatriement de tables entières à mesure que la flotte grandit | `src/services/fleetData.ts`, `src/api/*.ts` |
| 3.6 | Dette : supprimer `FleetContext_old.tsx`, les scripts `patch-*.cjs`, réduire les 285 `any` | FAIBLE-MOYEN | 2-3 j | Réduit la surface de confusion pour tout nouveau développeur | `src/context/FleetContext_old.tsx`, racine, `src/` |
| 3.7 | Étape CI RLS : l'exécuter réellement contre une instance Postgres éphémère | MOYEN | 1 j | Ferme l'occurrence #1 du motif récurrent (§3) | `.github/workflows/ci-cd.yml`, `supabase/tests/*.sql` |
| 3.8 | Tests d'intégration sur les 5 endpoints Express réellement appelés | MOYEN | 2-3 j | Un filet de sécurité qui aurait détecté C4-1/C4-2/C4-3 | `src/api/*.ts` |
| 3.9 | C7-2 : journalisation des accès en lecture aux données chauffeur nominatives | MOYEN | 1 j | Traçabilité des consultations, pertinent pour la conformité | Endpoints/vues concernés |
| 3.10 | Revue juridique de la conformité protection des données (base légale, consentement) | Hors périmètre technique | Externe, non estimable par cet audit | Sécurise le produit sur le plan réglementaire, pas seulement technique | — |

**Sous-total Bloc 3 : ≈ 12-19 jours-homme (hors revue juridique).**

---

## 7. Ce qui est réellement solide — à conserver tel quel

Confirmé, avec correction mineure d'un point :

- **Ingestion télémétrique multi-provider** (Flespi, Traccar, ManualEntry) : réelle, testée, architecture provider-agnostic cohérente. **Confirmé.**
- **Sécurité du webhook télémétrie** : authentification par secret hashé + `timingSafeEqual`, rate limiting Redis, anti-rejeu — les trois vérifiés réellement appelés dans le chemin d'exécution, pas seulement écrits (`audit/02_SECURITE.md` C5). **Confirmé, c'est la partie la mieux vérifiée de tout l'audit.**
- **Surface super-admin `/api/platform/*`** : 21 routes toutes gated, pas de chemin d'auto-élévation trouvé vers `platform_admins`. **Confirmé**, avec une réserve mineure (C9-1, pas de rate limit dédié — FAIBLE, ne change pas le constat global).
- **Isolation tenant par RLS sur la voie SDK directe** : **confirmé avec une réserve non résolue.** Le mécanisme RLS lui-même est réel et bien conçu là où il a été vérifié (boucle dynamique de tenant-isolation sur 8 tables fondatrices, policies dédiées sur les tables ajoutées ensuite) — mais cette confirmation repose sur la lecture des fichiers de migration, **pas sur une vérification de l'état réellement déployé** (accès DB direct non obtenu, voir `audit/06_PREUVES.md`). À traiter comme « probablement solide, à confirmer » plutôt que « confirmé » au sens strict.

---

## 8. ÉCART ENTRE LE PRODUIT PITCHÉ ET LE PRODUIT CODÉ

| Affirmation du pitch / de la spec | État réel du code | Peut-on le dire à un client sans mentir ? |
|---|---|---|
| Maintenance prédictive financière (positionnement central du produit) | Score de risque composite absent, RUL absent ; le seul élément « prédictif » réellement câblé et fonctionnel est un appel Gemini à la demande sur un véhicule, hors du parcours CAE | **Non** — le positionnement central n'est pas livré |
| IA / Analyse IA Prédictive | L'appel Gemini réel fonctionne (vérifié par exécution) quand la clé est configurée ; le repli sans IA affiche un score de confiance inventé (`0.92`) comme s'il provenait d'un modèle | **Oui avec réserve** — vrai seulement pour le chemin Gemini actif, jamais dire que le repli est de l'IA |
| CAE comme moteur d'allocation de capital | Formule algébrique conforme au référentiel, mais calculée sur 5 constantes non sourcées, à une échelle incohérente avec le DZD (~30-40× trop basse) | **Non** — c'est un calculateur, pas un moteur d'allocation piloté par des données réelles, et ses résultats chiffrés ne sont pas crédibles en l'état |
| TCO (coût total de possession) | Absent du code applicatif, seulement mentionné en marketing et dans la roadmap (« Phase 3D — à venir ») | **Non** |
| CTS (Cost to Serve) | Absent, aucune trace même sous un nom alternatif | **Non** |
| RUL (Remaining Useful Life) | Absent, aucune trace même sous un nom alternatif, hors quelques copies marketing sur la page d'accueil | **Non** |
| AI Commander (feed de recommandations, ledger d'impact, moniteur de latence) | Module fantôme : aucune trace dans le routage, les types ou l'UI | **Non** |
| Tableau de bord financier (CostGuard : P&L, rentabilité par route, variance) | P&L et rentabilité par route absents ; la variance affichée est un delta brut sans seuil d'alerte, avec au moins une catégorie (carburant) au budget fabriqué | **Non avec réserve** — un tableau de coûts existe et affiche des chiffres réels de work orders, mais pas les fonctionnalités financières nommées dans le pitch |
| Applications mobiles (rôles Mécanicien/Chauffeur) | Aucune application mobile native — web React responsive uniquement, aucun dossier `ios/`/`android/`/React Native | **Non** — dire « écran mobile » ou « web responsive », jamais « application mobile » |
| Conformité / souveraineté des données (marché algérien) | Aucune politique de rétention sur les données GPS, aucune journalisation des accès en lecture aux données chauffeur, base légale/consentement non implémentés ; **hébergement non-algérien** — la chaîne de connexion trouvée dans `supabase/.temp/pooler-url` (métadonnée locale du CLI Supabase, lue durant la Phase C lors de la tentative de connexion DB) pointe vers `aws-0-eu-west-1.pooler.supabase.com`, la région AWS Irlande | **Non** — à la fois sur le plan technique (rétention/traçabilité) et sur la localisation réelle des données, qui contredirait toute promesse de souveraineté nationale |

---

## 9. Estimation jours-homme

**(a) Démo fiable (ne crashe pas, n'affiche pas de chiffres immédiatement invalidables par un client qui connaît ses coûts) : Bloc 1 seul, ≈ 1 jour-homme.** Repose sur : corriger le build cassé, la table incidents, aligner grossièrement les constantes CAE sur les propres données de démo du produit (pas les rendre exactes, juste plausibles), corriger l'incohérence de devise la plus visible.

**(b) Pilote client réel, au sens « n'expose pas de données, ne falsifie pas de piste d'audit, ne ment pas sur ce qui est de l'IA vs des règles fixes » (pas au sens « livre toutes les promesses du pitch ») : Bloc 1 + Bloc 2, ≈ 7-10 jours-homme.** Repose sur la fermeture de C4-2 (falsification d'audit), C4-1 (fuite latente), C10-1 (brute-force), C3-1 (exposition financière), et la validation Zod systémique. **Cette estimation exclut explicitement** : la reconstruction de la logique métier en une seule implémentation testée (D1, Bloc 3.1, +3-5 j), et la construction des fonctionnalités totalement absentes (RUL, TCO, CTS, AI Commander, P&L, rentabilité par route) — qui ne sont pas des corrections de bugs mais de nouvelles fonctionnalités à concevoir et construire, hors du périmètre d'un chiffrage d'audit.

**Pour un pilote qui tiendrait aussi la promesse du positionnement commercial (« maintenance prédictive financière », CAE comme vrai moteur d'allocation sur données réelles) : au-delà de (b), ajouter le Bloc 3 dans son intégralité (≈12-19 j) plus un chantier non chiffrable ici de construction des fonctionnalités absentes (modélisation RUL/TCO/CTS réelle, AI Commander) — cet ordre de grandeur dépasse le périmètre d'un audit de code et relève d'un chiffrage produit séparé.**

---

*Fin de la Phase F. Voir `audit/06_PREUVES.md` pour la passe de vérification de ce cycle d'audit.*
