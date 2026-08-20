# ROADMAP — DE L'ÉTAT AUDITÉ À UN MVP PILOTABLE (NextTransit v2)

> Rédigé le 2026-08-20, révisé le même jour après retour critique. HEAD au moment de l'audit source : `5e0e62f`. Ce document est **prescriptif**, contrairement aux livrables `00_INVENTAIRE.md` → `06_PREUVES.md` qui sont strictement constatifs. Il ne remplace pas `roadmap.md` (racine), qui décrit les phases fonctionnelles futures — ce document couvre les **corrections** nécessaires pour que ce qui existe déjà devienne fiable, plus ce qui manque pour qu'un pilote client soit réellement possible.

## Corrections appliquées suite à revue critique — ce qui a changé et pourquoi

1. **§2 de la version précédente affirmait que `supabase db pull` s'authentifie via la CLI seule, sans mot de passe Postgres.** Vérifié à l'instant par `npx supabase db pull --help` et `npx supabase link --help` : les deux commandes exposent un flag explicite `--password, -p string — Password to your remote Postgres database`. **L'affirmation était fausse.** Le pipeline ci-dessous est corrigé en conséquence — c'est exactement le motif documenté en `05_SYNTHESE.md` §3 (un nom de commande qui laisse croire à une garantie que l'exécution n'a pas prouvée), reproduit ici avant d'être détecté, puis corrigé par la même discipline que le reste de l'audit : preuve d'exécution avant d'inscrire une étape comme acquise.
2. **Phase 4 (souveraineté d'hébergement) ajoutée** — absente de la version précédente alors que la localisation réelle des données (AWS `eu-west-1`, établie en Phase C) est déjà documentée dans `05_SYNTHESE.md` §8 et contredit un critère de différenciation commercial.
3. **Phase P (rendre le pilote possible) ajoutée** — le total précédent s'intitulait « MVP pilotable » sans qu'aucune tâche ne couvre l'import de données, l'onboarding tenant, la mesure du ROI ou l'export de rapport. **Vérification faite avant d'estimer cette phase** (voir P.1 ci-dessous) : l'import CSV existe déjà pour les véhicules et le carburant — seul l'historique de maintenance manque. L'estimation de P.1 est revue à la baisse en conséquence, avec la preuve.
4. **CI réelle avancée de la Phase 3 à la Phase 0** — elle doit protéger les Phases 1 et 2, pas arriver après.
5. **Rotation des secrets ajoutée en 0.0** — le mot de passe Postgres, `SUPABASE_SERVICE_ROLE_KEY` et `GEMINI_API_KEY` ont circulé en clair pendant l'audit.
6. **Le traitement de la devise (1.6/1.7 précédents) remplacé par une correction de classe** : un type `Money` porteur de devise + des paramètres CAE configurables par tenant, plutôt que deux rustines qui laissent le problème structurel intact.
7. **Saisie d'un budget réel par catégorie ajoutée** — unifier la formule de variance (Phase 2) sur une entrée toujours fabriquée (`VarianceDashboard.tsx:44`, `FleetContext.tsx:251`) ne produit qu'un chiffre inventé plus proprement calculé.
8. **Critère de sortie 0.9 reformulé** : « 24/24 suites chargées, 0 échec » plutôt qu'un total de tests deviné (le nombre exact de tests que contiendra la suite actuellement cassée n'est pas connu tant qu'elle ne charge pas).
9. **Décision 2.1 tranchée dans ce document, pas laissée en délibération** : migration vers `DecisionEngine` — un score borné 0-100 avec label (`URGENT_DISPATCH`) est lisible par un Fleet Manager, `2.805` sans échelle ne l'est pas.
10. **Effort total et calendrier corrigés** en conséquence — voir §9.
11. **Modèle à 3 environnements nommés, ajouté le 2026-08-20** — voir §0bis ci-dessous. Décidé après que la réconciliation (`audit/08_RECONCILIATION.md`) a révélé que le projet Supabase hébergé n'avait jamais réellement fait tourner l'application (0 ligne sur les tables opérationnelles). Reconstruit et requalifié en environnement de démo, ce qui ferme la question de souveraineté pour la durée du pilote sans attendre la Phase 4.

---

## 0bis. Modèle à 3 environnements — pourquoi le pilote n'attend plus l'hébergement algérien

Décision prise le 2026-08-20 (Option C de la réconciliation), après constat que la base hébergée
sur supabase.com était deux générations de schéma en retard et ne contenait aucune donnée réelle
(seulement 10 lignes de `tenants` d'inscription, 0 sur toutes les tables opérationnelles) — la
conclusion la plus probable étant que cette base n'a jamais servi de vraie production : les démos
ont tourné sur des fixtures côté navigateur (`seedData.ts`), pas sur des écritures réelles.

Trois environnements nommés, un seul jeu de migrations qui les alimente tous :

| Environnement | Rôle | Données |
|---|---|---|
| **LOCAL** | Développement et tests, `supabase start` (Docker) | Fixtures de développement, jetables |
| **STAGING** | supabase.com, région Irlande — démos, jury, prospects | **Données de démonstration uniquement, jamais de données client réelles** |
| **PROD** | Instance auto-hébergée en Algérie (Phase 4 ci-dessous) | La seule à voir des données client réelles |

**Conséquence directe sur le calendrier** : la promesse de souveraineté des données (« zéro
transfert transfrontalier ») ne dépend plus de la Phase 4 pour être tenue pendant la période de
démarchage — elle est déjà vraie par construction, puisque STAGING n'accueille par définition
aucune donnée client. **Le pilote de démonstration peut démarrer dès la fin des Phases 0-P**, sans
attendre l'hébergement algérien. La Phase 4 reste nécessaire avant de **signer** un client réel
(faire transiter ses données réelles), pas avant de le démarcher.

---

## 0. Prérequis d'architecture — Docker et supabase.com

- **`docker-compose.yml`** orchestre `redis`, `api`, `worker`, `prometheus` — **aucun Postgres local**. `api`/`worker` pointent vers un `SUPABASE_URL` externe (`.env.docker.example:12`).
- **`supabase/config.toml`** configure le stack CLI Supabase local (`supabase start`, Postgres port `54322`), un mécanisme Docker distinct de `docker-compose.yml`.

**Conséquence** : un seul jeu de migrations SQL, source de vérité unique, appliqué à deux endroits (Postgres local du stack `supabase start`, projet hébergé `fzmoaxywccqcetxgedze`).

### Pipeline corrigé

```bash
# 1. Réinitialiser le mot de passe AVANT toute autre étape — l'ancien est brûlé
#    (deux tentatives échouées pendant l'audit, transmis en clair dans la conversation)
#    Dashboard → Project Settings → Database → Reset database password

# 2. Authentification CLI (jeton d'accès API — nécessaire mais pas suffisant pour db pull)
supabase login

# 3. Lien + pull, AVEC le mot de passe (confirmé requis par --help, pas optionnel)
supabase link --project-ref fzmoaxywccqcetxgedze --password "<nouveau mot de passe>"
supabase db pull
```

`db pull` révèle l'état réellement déployé, à comparer aux migrations locales (2 supprimées, 1 renommée, 6 non versionnées dans le working tree audité). Deux issues possibles selon l'écart trouvé : committer les migrations locales si elles correspondent au déployé, ou reconstruire l'historique local à partir de ce que `db pull` génère si l'écart est significatif.

**Règle à partir de ce point** : tout changement de schéma passe par `supabase migration new` → `supabase db reset` (test local) → `supabase db push` (déploiement). Plus de modification manuelle via le dashboard, plus de script `.cjs` qui patche du SQL à la main.

---

## Phase 0 — Débloquer (≈ 4 jours)

| # | Tâche | Effort |
|---|---|---|
| 0.0 | **Rotation des secrets** : mot de passe Postgres (dashboard), `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` — les trois ont circulé pendant l'audit | 0,5 j |
| 0.1 | Corriger les backticks échappés | `src/services/maintenance/pmRuleResolver.ts:182` — 15 min |
| 0.2 | Corriger la table cible `incidents` → `driver_incidents` | `src/api/incidents.ts:15` — 30 min |
| 0.3 | `supabase login` + `link --password` + `db pull` (avec le mot de passe de 0.0) | 30 min |
| 0.4 | Réconcilier `supabase/migrations/` avec le résultat de `db pull` | 0,5-1 j |
| 0.5 | Committer l'état réconcilié | 15 min |
| 0.6 | Valider `supabase db reset` en local | 15 min |
| 0.7 | Valider `docker build --target api .` et `--target worker .` | 15 min |
| 0.8 | *(déplacé depuis Phase 3)* Wire la CI pour exécuter `supabase db reset` + les fichiers `.sql` de `supabase/tests/` contre un Postgres éphémère — remplace `test -f rls-isolation-test.sql` par une exécution réelle | 1 j |
| 0.9 | *(déplacé depuis Phase 3)* Installer `eslint` réellement ou renommer le script `lint` | 1-2 h |
| 0.10 | Confirmer `npm run build` + `npx tsc --noEmit` + `npx vitest run` : **critère = 24/24 suites chargées, 0 échec** (pas un total de tests deviné) | 15 min |

**Pourquoi la CI est ici et non en Phase 3** : la Phase 2 (unification D1) est le chantier le plus risqué de tout le roadmap — deux implémentations divergentes signifient que des écrans dépendent aujourd'hui du comportement de l'une des deux. La faire sans CI réelle, c'est casser des choses sans le voir.

---

## Phase 1 — Sécuriser pour un pilote (≈ 9-12 jours)

| # | Tâche | Sévérité audit | Effort |
|---|---|---|---|
| 1.1 | Contrôle de rôle + appartenance sur l'endpoint qui logue les pannes OBD | CRITIQUE (C4-2) | 0,5-1 j |
| 1.2 | `user.tenant_id` → `user.user_metadata.tenant_id` (7 occurrences) ; cesser d'utiliser `supabaseAdmin` sans re-vérification stricte du tenant | ÉLEVÉ (C4-1) | 0,5 j |
| 1.3 | Anti-brute-force côté serveur | ÉLEVÉ (C10-1) | 1-2 j |
| 1.4 | Masquer les colonnes financières pour `MECHANIC`/`DRIVER` | MOYEN (C3-1) | 1 j |
| 1.5 | Validation Zod sur les 5 endpoints Express réellement appelés | MOYEN (C4-5) | 1-2 j |
| 1.6 | **Type `Money` porteur de devise + `formatMoney(amount, tenant)` unique**, remplace l'usage de `number` nu sur tous les montants (`hourly_rate` vaut aujourd'hui 85, 140, 1400 ou 2250 selon le fichier, sans unité déclarée) | Correction de classe, pas rustine | 1,5 j |
| 1.7 | **Paramètres CAE configurables par tenant** (taux horaire, multiplicateurs de report, poids de classification) au lieu de constantes recalibrées une fois — ce qui rend un chiffre défendable devant un client dont le taux horaire réel diffère (ex. 2 000 DZD) | Correction de classe | 1,5 j |
| 1.8 | **Saisie d'un budget réel par catégorie**, remplace les budgets fabriqués (`VarianceDashboard.tsx:44` `× 0,85`, `FleetContext.tsx:251` `× 0,9` — deux valeurs différentes pour le même concept inventé) | Scénario de démo le plus dangereux restant | 1,5 j |
| 1.9 | Politique de rétention + purge sur les données GPS (`telemetry_events`) | ÉLEVÉ (C7-1) | 1 j |

Chaque correctif de schéma (1.2, 1.4, 1.6/1.7 si persisté en base, 1.9) suit le pipeline de la §0.

---

## Phase 2 — Unifier la logique métier (≈ 4-5 jours)

**Décision tranchée, pas à re-débattre en cours de chantier** : migration vers `DecisionEngine.evalRuleR5PriorityScore`/`evalRuleR7BudgetVariance` (implémentation déjà pure, déjà testée). Un score borné 0-100 avec label catégoriel (`URGENT_DISPATCH`) est lisible par un Fleet Manager ; `2.805` sans échelle ne l'est pas.

| # | Tâche | Effort |
|---|---|---|
| 2.1 | Faire converger `FleetContext.tsx` (CAE) et `VarianceDashboard.tsx` (variance, sur l'entrée réelle de 1.8) vers `DecisionEngine` | 2-3 j |
| 2.2 | Un seul jeu de tests, sur l'implémentation qui pilote réellement l'écran | 1 j |
| 2.3 | Remplacer `confidence_score: 0.92` (fallback IA) par une valeur dérivée ou un champ honnête (`is_heuristic_fallback: true`) | 2-4 h |

---

## Phase P — Rendre le pilote possible (≈ 6,5 jours)

| # | Tâche | Pourquoi c'est bloquant | Effort |
|---|---|---|---|
| P.1 | **Import de données — vérifié avant d'estimer, contrairement à l'audit initial qui n'avait pas cherché** : l'import CSV véhicules existe et fonctionne réellement (`src/components/vehicle/ImportVehiclesModal.tsx`, `papaparse`, validation, template téléchargeable, insertion réelle) ; l'import carburant existe aussi (`FuelModule.tsx`, déjà signalé en `04_LOGIQUE_METIER.md` E4-2 pour son absence de validation `NaN`). **Seul l'import de l'historique de maintenance est réellement absent.** Reste à faire : durcir les deux imports existants (validation `NaN`/bornes avant insertion) + construire l'import d'historique de maintenance manquant. Note incidente : `ImportVehiclesModal.tsx:109-110` câble déjà `classification_weight`/`delay_multiplier` en dur à l'import — à faire pointer vers les paramètres tenant de 1.7 plutôt que dupliquer une troisième fois la même constante. | 1,5 j |
| P.2 | Onboarding tenant : création client, invitation utilisateurs, paramétrage initial (devise, taux horaire, classification) | 2 j |
| P.3 | Mesure du ROI du pilote : état initial figé + rapport de fin de période | 2 j |
| P.4 | Export du rapport (PDF/XLSX) | 1 j |

---

## Phase 3 — CI + polish restant (≈ 7-10 jours)

*(3.1/3.2/3.8 de la version précédente déjà couverts en Phase 0.8/0.9)*

| # | Tâche | Effort |
|---|---|---|
| 3.1 | Tests d'intégration Supertest sur les 5 endpoints Express réellement utilisés | 2-3 j |
| 3.2 | CSP : retirer `unsafe-inline`/`unsafe-eval`, passer aux nonces | 1-2 j |
| 3.3 | Rate limiter Express → backend Redis partagé | 0,5-1 j |
| 3.4 | N+1 dans `workOrders.ts` → batch ; pagination sur les `select('*')` non bornés | 1,5-2,5 j |
| 3.5 | Dette : `FleetContext_old.tsx`, scripts `patch-*.cjs`, `any` les plus critiques | 2-3 j |

---

## Phase 4 — Souveraineté de l'hébergement : la vraie production (≈ 11 jours + délais externes)

**Ne bloque plus le démarchage ni les démos** (voir §0bis — STAGING sur supabase.com/Irlande est désormais un environnement de démo assumé, sans données client). Reste nécessaire avant de faire transiter la première donnée client réelle, donc avant de **signer** un pilote, pas avant de le vendre.

| # | Tâche | Effort |
|---|---|---|
| 4.1 | Choix et contractualisation d'un hébergeur algérien, validation juridique — **démarches à lancer en semaine 2, en parallèle des Phases 0-2** ; c'est le vrai chemin critique du calendrier global | Démarches externes, non compressibles |
| 4.2 | Pile Supabase auto-hébergée (Postgres, GoTrue, PostgREST, Realtime, Storage, Kong), durcissement, TLS | 4 j |
| 4.3 | Sauvegardes, avec test de restauration réellement exécuté | 2 j |
| 4.4 | Migration des données et bascule, avec procédure de retour arrière | 2 j |
| 4.5 | Supervision infrastructure (Prometheus existe déjà côté applicatif) | 1,5 j |
| 4.6 | Rendre l'appel Gemini désactivable par tenant, désactivé par défaut pour les tenants algériens — un appel à Google depuis un produit souverain est un transfert transfrontalier de données d'exploitation, et hors-thèse d'une Phase 1 sur règles déterministes | 1,5 j |

---

## 9. Effort total et calendrier

| Phase | Effort |
|---|---|
| 0 — Débloquer (secrets, CI, reconciliation migrations) | 4 j |
| 1 — Sécuriser (+ devise systémique, + budgets réels) | 9-12 j |
| 2 — Unifier la logique métier | 4-5 j |
| P — Rendre le pilote possible | 6,5 j *(revu à la baisse : import véhicules/carburant déjà réels, vérifié)* |
| 3 — CI intégration + polish restant | 7-10 j |
| 4 — Souveraineté | 11 j *(+ délais externes non compressibles sur 4.1)* |
| **Total** | **≈ 41,5-48,5 jours-homme** |

**Écart avec l'estimation de 43-50 jours proposée en revue** : légèrement inférieur, du seul fait de la révision de P.1 après vérification directe du code (import déjà existant pour véhicules et carburant) — pas d'un désaccord sur les autres tâches, chiffrées de façon quasi identique.

**En solo, à 3,5-4 jours de développement effectif par semaine : ≈ 10-14 semaines calendaires**, hors délais externes de 4.1 (contractualisation hébergeur, validation juridique) qui courent en parallèle à partir de la semaine 2 et peuvent dépasser ce calendrier de développement sans le bloquer si lancés à temps.

---

## Point de départ recommandé

**0.0 (rotation des secrets) et 4.1 (démarches hébergeur algérien) en parallèle, dès maintenant** — 0.0 parce que rien d'autre en Phase 0 n'est sûr tant que les secrets exposés circulent encore, 4.1 parce que c'est le seul chantier à délai externe non compressible et qu'il doit courir pendant que le reste du code se corrige, pas après.
