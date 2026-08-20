# PHASE A — INVENTAIRE TECHNIQUE (NextTransit v2)

Audit exécuté le 2026-08-20, dans `c:\Users\MAGICSOFTDZ\Desktop\reda\nexttransitv2`, sur la branche `main`.
Toutes les commandes ci-dessous ont été **réellement exécutées** dans ce dépôt ; les sorties sont reproduites ou résumées fidèlement.

> **HEAD au moment de l'audit : `5e0e62f` (2026-08-18 16:54:32 +0100). Cet audit porte sur le WORKING TREE au 2026-08-20, PAS sur HEAD** — 55 fichiers étaient modifiés/ajoutés/supprimés et non committés (détail au §4 ci-dessous). État figé pour reproduction exacte : `audit/etat_audite.patch` (diff complet vs HEAD) et `audit/etat_audite.txt` (`git status --porcelain`).

---

## 1. Stack réelle détectée

Source : `package.json`, `tsconfig.json`, `vite.config.ts`, `Dockerfile`, `supabase/`.

| Couche | Techno | Version (package.json) |
|---|---|---|
| Frontend | React + Vite | react 19.0.1, vite 6.2.3 |
| Routing | react-router-dom | 7.18.2 |
| Style | Tailwind CSS v4 | 4.1.14 |
| Backend HTTP | Express (via `server.ts`, bundlé avec esbuild) | 4.21.2 |
| Worker async | Node + BullMQ + ioredis | bullmq 6.1.2, ioredis 6.0.0 |
| Base de données | Supabase (Postgres géré) | @supabase/supabase-js 2.111.0 |
| IA générative | Google Gemini via `@google/genai` | 2.15.0 |
| Logs | pino / pino-pretty | 9.0.0 |
| Métriques | prom-client (Prometheus) | 15.1.3 |
| Tests | Vitest + Supertest | vitest 4.1.10 |
| Langage | TypeScript | 5.8.2 (strict non confirmé — voir §4) |
| Runtime | Node.js | contrat `>=22 <25`, `.nvmrc` = voir fichier |

Le projet est un **monolithe à deux process Node** : `server.ts` (API HTTP + sert le build Vite) et `worker.ts` (consommateur BullMQ). Il n'y a pas de framework backend (Nest, Fastify) : tout est du Express câblé à la main dans un fichier unique de 533 lignes.

Il n'existe **pas d'application mobile native** distincte : le cahier des charges parle de rôles « Mécanicien (mobile) » et « Chauffeur (mobile) », mais le dépôt ne contient qu'un web React responsive (`src/components/screens/MechanicMobileQueue.tsx`, `DriverMobileView.tsx`). Aucun dossier `ios/`, `android/`, `expo/`, `react-native` n'existe. [ABSENT — voir Phase B].

---

## 2. Cartographie des dossiers (hors node_modules/.git/dist)

| Dossier | Rôle constaté |
|---|---|
| `server.ts`, `worker.ts` (racine) | Entrées process API et Worker |
| `src/api/` | 13 fichiers = routeurs Express (vehicles, workOrders, maintenance, incidents, fuel, inventory, platformAdmin, pmSchedules, pmSubscriptions, vehicleAssignments, healthRouter, middleware) |
| `src/components/screens/` | 25 écrans applicatifs (un fichier = un écran métier) |
| `src/components/vehicle/` `.../tenant/` `.../admin/` `.../common/` `.../guards/` `.../landing/` `.../localization/` | composants transverses / modales / layout |
| `src/context/` | State management global via React Context (`FleetContext.tsx` = cœur applicatif, 1148 lignes + un fichier mort `FleetContext_old.tsx` de 1276 lignes) |
| `src/services/` | 45 fichiers logique métier (hors tests) : accès données (`fleetData.ts`), moteur de règles (`decisionEngine.ts`), IA prédictive, télémetrie, sécurité, maintenance/PM |
| `src/services/telemetry/` | Ingestion télématique multi-provider (Flespi, Traccar, ManualEntry), queue BullMQ |
| `src/services/security/` | Rate limiting Redis, HMAC webhook, anti-replay |
| `src/services/maintenance/` | Moteur PM (Preventive Maintenance) en cours de construction, **non committé**, cassé (voir §4) |
| `src/types/` | Types TS partagés (3403 lignes) — sert de spécification de facto du modèle de données |
| `src/data/` | Données de seed/démo (`seedData.ts`, 1852 lignes) + traductions |
| `supabase/migrations/` | 32 fichiers SQL, 3208 lignes cumulées — schéma + RLS |
| `scripts/archive/` | 9 scripts `.cjs` de migration/patch ponctuels, laissés dans le dépôt |
| `docs/` | Documents de planification narratifs (non horodatés de façon fiable, voir §5) |
| `audit/` | Ce dossier (livrables de cet audit) |
| `scratch/` | Un script de debug isolé (`check-rpc.ts`) |

---

## 3. Volumétrie

Commande : `find ... -name "*.ts" -o -name "*.tsx" | xargs wc -l`

- **185 fichiers TS/TSX** dans `src/` + `scripts/`, totalisant **45 983 lignes**.
- Répartition par sous-dossier (lignes) :

| Dossier | Lignes |
|---|---|
| `src/components` | 22 616 |
| `src/services` | 11 818 |
| `src/types` | 3 403 |
| `src/context` | 3 138 (dont 1 276 mortes dans `FleetContext_old.tsx`) |
| `src/data` | 1 852 |
| `src/api` | 1 679 |
| `src/lib` | 294 |
| `src/utils` | 157 |
| `src/routes` | 73 |
| `src/middleware` | 72 |
| `src/config` | 86 |
| `server.ts` + `worker.ts` (racine) | 604 |
| `supabase/migrations/*.sql` | 3 208 |

Répartition par extension (racine du dépôt, hors node_modules/.git/dist) :

```
118 .ts   79 .tsx   41 .sql   12 .md   11 .cjs   8 .json   7 .sh   3 .yml   2 .html   2 .example   2 .env
```

Autres signaux de volumétrie :
- **285 occurrences** de `: any` / `as any` dans `src/` → érosion significative du typage strict malgré `"lint": "tsc --noEmit"`.
- **1 seul** marqueur `TODO/FIXME/HACK/XXX` trouvé dans `src/` — anormalement bas pour un projet de cette taille ; ne signifie pas absence de dette technique (voir §6), signifie plutôt que la dette n'est pas documentée en ligne.
- **5** `console.log` restants dans `src/`.

---

## 4. Git : historique et anomalies

Commande : `git log --format="%h %ad %an %s" --date=short`

- **27 commits au total**, tous compris entre **2026-08-08** et **2026-08-18** (10 jours).
- **2 contributeurs déclarés** : `MAGICSOFTDZ` (23 commits) et `unknown` (4 commits, dont 2 le même jour que des commits `MAGICSOFTDZ`, 2026-08-16).
- **1 seule branche** (`main`), pas d'historique de PR/review visible dans le dépôt local.
- **Anomalie n°1** : deux commits « initiaux » distincts et rapprochés :
  - `73009f1` (2026-08-08) — *"feat: initial release NextTransit v2 SaaS ERP - Enterprise & Security Ready"*
  - `540b6bc` (2026-08-09) — *"feat: initial commit - NextTransit v2 SaaS ERP & Architecture Audit"*
  Un projet qui se déclare **« Enterprise & Security Ready » dès son tout premier commit**, avant même la moindre itération, est un signal d'auto-évaluation non fiable — confirmé par la suite (voir §6, point sur `forensic_audit_report.md`).
- **État de travail non committé massif** au moment de l'audit : `git status --porcelain` retourne **55 fichiers** modifiés/ajoutés/supprimés, incluant deux migrations SQL supprimées (`00002_epic1_auth_multitenant.sql`, `20260805000000_full_saas_erp_schema.sql`), un fichier `backup_avant_migration.sql` de **0 octet**, et 6 nouvelles migrations SQL non versionnées (`20260819` → `20260823`). Le dépôt Git ne reflète donc **pas** l'état réellement exécuté au moment de l'audit — l'analyse Phase B porte sur le working tree, pas sur `HEAD`.

---

## 5. Documentation pré-existante trouvée dans le dépôt (non générée par cet audit)

Le dépôt contenait déjà, avant cet audit, plusieurs documents d'auto-évaluation non committés :
- `forensic_audit_report.md` (18/08/2026) — se décrit comme un audit « forensic » réalisé par un *"Agent IA (Antigravity)"*, conclut *« Le MVP applicatif est un succès total »*, *« 145 tests au total, 100% au vert »*, *« typecheck passe avec 0 erreur »*.
- `roadmap.md` — liste des phases complétées/à venir, rédigée par l'équipe/l'agent projet.
- `GUIDE_UTILISATION_ET_ROADMAP_SAAS.md`, `developer_guide.md`, `AGENTS.md` (28 Ko), `TRANSITION_ERP_SAAS_MODULAIRE.md`.

**Ces documents ne sont pas neutres et doivent être traités comme des affirmations à vérifier, pas comme des faits.** La Phase A a immédiatement invalidé une partie de leurs conclusions : au moment de cet audit (deux jours après le rapport du 18/08), ni le typecheck ni le build ne passent (§6). Cela illustre exactement le risque que cet audit a pour mandat d'éliminer : la confusion entre « un rapport dit que c'est fait » et « c'est effectivement fait, vérifié maintenant ».

---

## 6. Tableau des commandes exécutées

| Commande | Statut | Sortie résumée (preuve) |
|---|---|---|
| `npx tsc --noEmit` | **KO** (exit 2) | `src/services/maintenance/pmRuleResolver.ts(182,12): error TS1127: Invalid character.` + `error TS1160: Unterminated template literal.` Le typecheck du projet **échoue** — le `lint` du `package.json` pointe vers cette même commande (`"lint": "tsc --noEmit"`), donc **lint = KO aussi**. |
| `npm run build` (`vite build && esbuild server.ts ...`) | **KO** (exit 1) | `vite build` réussit (2416 modules, dist/ généré), mais l'étape suivante `esbuild server.ts` échoue avec la **même erreur de syntaxe** : `X [ERROR] Syntax error "\`" src/services/maintenance/pmRuleResolver.ts:182:12`. Le build de production est **cassé** dans l'état actuel du working tree. |
| `npx vitest run` | **KO partiel** (exit 1) | 23 fichiers de test passent, **164 tests passent**, mais **1 suite ne charge pas du tout** (`0 test`) : `FAIL src/services/maintenance/__tests__/pmRuleResolver.test.ts` — même cause racine (erreur de syntaxe esbuild sur `pmRuleResolver.ts:182`). Le total « 164 passed » est correct mais masque le fait qu'une suite entière n'a jamais pu s'exécuter. |
| ESLint réel (`.eslintrc.json` présent) | **Non exécutable** | `.eslintrc.json` référence `eslint:recommended`, `plugin:react/recommended`, `@typescript-eslint/*`, mais **`eslint` n'est pas présent dans `node_modules/.bin`** et n'est listé ni dans `dependencies` ni `devDependencies` de `package.json`. Le script `"lint"` du `package.json` n'appelle **pas** ESLint, il appelle `tsc --noEmit`. Le lint « annoncé » par la config n'a probablement **jamais tourné** dans ce dépôt. |

### Cause racine de l'échec typecheck/build/tests
`src/services/maintenance/pmRuleResolver.ts:182` contient un template literal avec des backticks échappés littéralement (`\`Matched rule: \${parts.join(' + ')}\`;`) au lieu de vrais backticks. C'est un fichier **non committé** (`git status` le montre en `??`), donc une régression introduite pendant la session de travail en cours au moment de l'audit, jamais testée avant cet audit.

---

## 7. Fichiers dupliqués / morts / suspects

| Fichier | Constat |
|---|---|
| `src/context/FleetContext_old.tsx` (1276 lignes) | Copie obsolète de `FleetContext.tsx`. `grep -rn "FleetContext_old"` sur tout `src/` = **0 résultat d'import**. Fichier 100% mort, laissé dans l'arborescence source (pas dans `scripts/archive/`). |
| `patch-fleet-context.cjs`, `patch-fleet-context-2.cjs`, `patch-fleet-context-3.cjs` (racine) | Scripts Node qui font des `fs.readFileSync` + remplacement de chaînes littérales dans `FleetContext.tsx` pour y injecter du code (ex. `logOBDFault`). Preuve que des fonctionnalités ont été ajoutées par **patch mécanique de texte** plutôt que par édition directe — pratique fragile, non reproductible, non revue. |
| `scripts/archive/*.cjs` (9 fichiers) | `append_fuel_costs.cjs`, `fix_ts.cjs`, `refactor_contexts.cjs`, `rewrite_fleet_context.cjs`, `update_audit_log.cjs` / `_2.cjs`, `update_audits.cjs` / `_2.cjs` — même pratique, archivée cette fois. Confirme un mode de développement récurrent par script de réécriture plutôt que refactor outillé. |
| `backup_avant_migration.sql` | 0 octet — fichier de sauvegarde vide, créé le 18/08 avant une migration, jamais rempli. |
| `supabase/migrations/00002_epic1_auth_multitenant.sql`, `supabase/migrations/20260805000000_full_saas_erp_schema.sql` | Supprimés dans le working tree non committé, alors que `supabase/migrations/20260804000008_epic1_auth_multitenant.sql` (contenu apparemment proche, nom différent) est ajouté en parallèle → réécriture d'historique de migrations en cours, risque de divergence entre environnements ayant déjà appliqué les anciennes migrations et le futur schéma. |
| `docs/protomarket/business_plan_template (1).pptx` | Fichier binaire de template marketing, espace et parenthèse dans le nom — présence non justifiée dans un dépôt de code applicatif. |

---

## 8. Cinq premiers signaux d'alarme (dès la reconnaissance)

1. **Le typecheck, le lint (tel que configuré) et le build de production échouent tous au moment de l'audit**, à cause d'un unique fichier de service (`pmRuleResolver.ts`) syntaxiquement invalide et non committé — preuve qu'aucune vérification automatisée (CI locale ou autre) n'a tourné avant cette session.
2. **Un rapport d'audit précédent présent dans le dépôt (`forensic_audit_report.md`, 18/08/2026) affirme « 100% au vert » et « 0 erreur typecheck »**, ce qui était peut-être vrai à `HEAD` à cette date mais est **faux dans l'état courant du working tree**, deux jours plus tard. Cela indique que les audits produits en interne sur ce projet ne sont pas fiables comme source de vérité et doivent systématiquement être re-vérifiés — exactement la posture adoptée dans cet audit.
3. **Aucun contrôleur de rôle explicite au niveau du middleware Express** (`src/api/middleware.ts` ne contient que `requireAuth` = authentification, et `platformAuthCheck` = super-admin uniquement) ; l'autorisation par rôle métier (Directeur / Fleet Manager / Mécanicien / Chauffeur) repose presque entièrement sur les policies RLS Postgres et sur un composant React (`ProtectedRoute.tsx`) — à approfondir en Phase B, mais le pattern général (peu de garde-fous côté contrôleur HTTP) est un signal d'alarme précoce.
4. **Le module « ESLint » est configuré (`.eslintrc.json`, 30 lignes, règles React/TS) mais le paquet `eslint` n'est pas installé** et le script `lint` ne l'appelle pas — la configuration existe sans jamais avoir été exécutable.
5. **285 usages de `any`/`as any`** dans une base de 46 000 lignes TypeScript qui se présente comme "Enterprise & Security Ready" dès son premier commit — contradiction entre l'ambition affichée et la rigueur de typage réelle.

---

*Fin de la Phase A. En attente de validation avant Phase B.*
