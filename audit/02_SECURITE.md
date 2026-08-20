# PHASE C — SÉCURITÉ (NextTransit v2)

> **HEAD au moment de l'audit : `5e0e62f` (2026-08-18 16:54:32 +0100). Audit du WORKING TREE au 2026-08-20, pas de HEAD** — voir `audit/etat_audite.patch` / `audit/etat_audite.txt` pour l'état exact figé, et `audit/00_INVENTAIRE.md` / `audit/01_ETAT_FONCTIONNEL.md` pour le contexte fonctionnel dont ce rapport découle.
>
> Méthode : conformément à la demande de validation du 2026-08-20, les 3 angles morts identifiés (exposition de clé, activation réelle de la RLS, exécution réelle de l'IA prédictive) ont été tranchés **par preuve d'exécution** (décodage de JWT, grep du bundle de production, appel réseau réel à l'API Gemini, construction empirique de requêtes PostgREST) et non par simple lecture de code. Aucune modification de code source n'a été effectuée ; les seules commandes à effet de bord sont deux appels de test à l'API Gemini (lecture seule côté produit) et un `npm audit` / `git diff` en lecture seule.
>
> **⚠ Correctif ajouté le 2026-08-20, après obtention de l'accès à la base hébergée (voir `audit/08_RECONCILIATION.md`)** : toute l'analyse RLS de ce document (angle mort 2, C2, C2-1, C2-2) a été faite en lisant les fichiers `supabase/migrations/*.sql`, **pas en interrogeant l'état réellement déployé au moment de cet audit**. On sait maintenant que ce déployé était deux générations de schéma en retard sur ces mêmes migrations (table `driver_incidents` absente, `audit_log` singulier absent, GRANTs `anon`/`authenticated` non versionnés, etc. — détail complet dans la réconciliation). **L'analyse RLS ci-dessous reste valable pour le schéma cible** — celui que les migrations décrivent et vers lequel le projet a été redéployé depuis —, **mais l'idée implicite « la base en ligne au moment de l'audit était protégée par ces policies » n'a jamais été vraie**. Elle est restée sans conséquence pratique uniquement parce que cette base ne contenait aucune donnée réelle (0 ligne sur les tables opérationnelles, voir la réconciliation) — pas parce que l'analyse avait raison sur l'état réel du système à cet instant.

---

## GRILLE DE SÉVÉRITÉ APPLIQUÉE

> **Ajout post-validation (2026-08-20)** : la première version de ce rapport notait les findings au jugement, sans grille écrite — ce qui a produit deux incohérences signalées en validation : C4-1 (latent, non exploitable aujourd'hui) noté au-dessus de C4-2 (exploitable immédiatement et corrompant une donnée qui fait foi), et deux findings (C2-1, C2-2) dont la note contredisait l'analyse d'impact écrite juste en dessous. La grille suivante est appliquée **rétroactivement à tous les findings C1-C7** et **nativement à tous les findings C8-C13** ajoutés dans cette révision. Tout changement de note est documenté à l'endroit du finding concerné, avec la raison.

- **CRITIQUE** = exploitable aujourd'hui **+** (fuite cross-tenant **OU** corruption de donnée faisant foi **OU** prise de contrôle).
- **ÉLEVÉ** = exploitable aujourd'hui avec impact limité au tenant de l'attaquant, **OU** latent avec impact cross-tenant en cas de régression plausible.
- **MOYEN** = exigence métier violée sans impact sécurité direct, **OU** exploitation nécessitant des conditions peu probables aujourd'hui.
- **FAIBLE** = hygiène, dette, documentation.

---

## SYNTHÈSE — à lire en premier

**La question qui devait trancher tout le reste du rapport (angle mort 1) donne une réponse rassurante, pas alarmante : la clé `service_role` ne fuit pas côté client.** Seule la clé `anon` (rôle JWT confirmé `"role":"anon"`) est livrée au navigateur, à la fois dans `.env`, dans le bundle `dist/` généré, et dans tout l'historique Git. Le raisonnement RBAC du rapport de Phase B (§4) reste donc valide : la RLS Postgres est une frontière de sécurité réelle, pas un théâtre.

Cela dit, la Phase C a trouvé un problème **plus concret et plus dangereux** que celui envisagé : `src/api/pmSchedules.ts:37` lit `(req as any).user.tenant_id`, une propriété qui **n'existe pas** sur l'objet utilisateur Supabase (partout ailleurs dans le code, le tenant est lu via `user.user_metadata.tenant_id`). Sur cet endpoint précis, la requête est exécutée avec le client **`supabaseAdmin` (service_role, RLS totalement contournée)** — volontairement, d'après le commentaire du fichier (« admin is okay if filtered by tenant »). Aujourd'hui ce bug **casse** l'endpoint (la valeur `undefined` produit un filtre PostgREST invalide `tenant_id=eq.undefined`, rejeté par Postgres car `tenant_id` est un UUID — vérifié empiriquement, voir C4). Mais c'est un fusil chargé : la moindre évolution du SDK Supabase ou de la structure de l'objet `user` qui ferait apparaître un champ `tenant_id` de premier niveau (même vide au départ) transformerait silencieusement ce bug en fuite de données inter-tenant totale sur un endpoint qui ne passe par aucune RLS — et aucun test ne le couvre.

**Retriage appliqué (voir GRILLE DE SÉVÉRITÉ ci-dessus)** — 4 findings reclassés par rapport à la version précédente de ce rapport, détail à chaque finding concerné : **C4-2 CRITIQUE** (était ÉLEVÉ — exploitable aujourd'hui, corrompt l'audit trail), **C4-1 ÉLEVÉ** (était CRITIQUE — latent, non exploitable aujourd'hui, la grille réserve CRITIQUE à l'exploitable), **C2-1 FAIBLE** (était ÉLEVÉ — ma propre analyse d'impact concluait déjà à un risque faible sur des données de démo synthétiques), **C2-2 MOYEN** (était FAIBLE — deux modèles de tenant qui coexistent est un terrain plausible de fuite cross-tenant future, pas de la simple hygiène). C8-C13 (nouveaux) classés nativement avec cette même grille.

Classement des findings (mis à jour après retriage C1-C7 ; C8-C13 ajoutés plus bas dans le document, comptés ici) :

| Sévérité | Nombre | ID |
|---|---|---|
| **CRITIQUE** | 1 | C4-2 |
| **ÉLEVÉ** | 3 | C4-1, C4-3, C7-1 |
| **MOYEN** | 6 | C2-2, C3-1, C4-4, C4-5, C5-1, C7-2 |
| **FAIBLE** | 3 | C1-1, C2-1, C6-1 |

*(Ce tableau est recalculé une seconde fois en fin de document une fois C8-C13 intégrés — voir section finale.)*

---

## ANGLE MORT 1 — Quelle clé Supabase est dans le bundle client ? (→ C1)

**Résultat : clé `anon` uniquement. Pas de fuite.**

- `src/lib/supabase.ts:22-35` (client utilisé par tout le frontend, notamment `fleetData.ts`) instancie `createClient(supabaseUrl, supabaseKey)` avec `supabaseKey = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', ...)` — préfixée `VITE_`, donc légitimement inlinée dans le bundle par Vite.
- Décodage du JWT réel présent dans `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`, format legacy `eyJhbGci...`, 208 caractères) : payload = `{"iss":"supabase","ref":"fzmoaxywccqcetxgedze","role":"anon","iat":...,"exp":...}` → **`role: "anon"`**, confirmé.
- Décodage du JWT `SUPABASE_SERVICE_ROLE_KEY` présent dans `.env` (219 caractères, non préfixé `VITE_`/`NEXT_PUBLIC_`) : payload = `{"iss":"supabase","ref":"fzmoaxywccqcetxgedze","role":"service_role",...}` → **`role: "service_role"`**, confirmé, mais utilisé uniquement côté serveur (`src/lib/supabaseAdmin.ts:25-28`), jamais exposé via `import.meta.env` (Vite n'inline que les variables `VITE_*`).
- Grep du build de production réel (`dist/assets/*.js`, généré par `vite build` au cours de cet audit) : **0 occurrence de `service_role`, 0 `AIza`, 0 `sk-[a-zA-Z0-9]`**. Les seules chaînes `eyJ...` complètes trouvées (2, décodées programmatiquement) sont : (1) la vraie clé `anon` du projet, (2) un JWT `anon` factice `"ref":"placeholder"` utilisé comme exemple dans `ApiDocsScreen.tsx` (documentation API affichée aux utilisateurs). Les occurrences du mot `GEMINI` dans le bundle sont du texte d'interface (`ApiDocsScreen.tsx` explique que `GEMINI_API_KEY` est « backend uniquement, jamais exposée au navigateur ») — pas une valeur de clé.
- `.dockerignore:3-5` exclut explicitement `.env`, `.env.*` (sauf `.env.example`, `.env.docker.example`) — pas de fuite via l'image Docker non plus.
- `.gitignore:7` exclut `.env*` — seul `.env.example` (valeurs vides) a jamais été committé. `git log --all -p -S "service_role"` remonte 4 commits, tous des références au **nom** de variable d'environnement (`process.env.SUPABASE_SERVICE_ROLE_KEY`), jamais une valeur. `git log --all -p` sur tout l'historique ne contient qu'un seul token `eyJ...` de plus de 100 caractères : le même JWT `anon` placeholder que dans le bundle.

**Verdict angle mort 1 : contrôle correctement implémenté. Aucun correctif requis sur ce point précis.**

---

## ANGLE MORT 2 — La RLS est-elle activée, ou seulement écrite ? (→ C2)

Comparaison exhaustive de toutes les instructions `CREATE TABLE` vs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` sur `supabase/migrations/*.sql` + `supabase/schema.sql` (le fichier `schema_clean.sql` est exclu : c'est un schéma de référence orphelin, jamais appliqué — voir `audit/01_ETAT_FONCTIONNEL.md`).

**42 tables créées, 41 avec RLS activée. Une seule sans RLS : `demo_seed_snapshot`.**

### C2-1 [FAIBLE — était ÉLEVÉ] — `public.demo_seed_snapshot` n'a jamais d'RLS activée

> **Retriage** : noté ÉLEVÉ dans la version précédente, ce qui contredisait ma propre phrase de conclusion ci-dessous (« l'impact confidentialité est donc faible dans l'usage actuel »). Selon la grille : ni exploitable-avec-fuite-cross-tenant-de-données-réelles (les données sont des snapshots de démo synthétiques, pas des données client), ni un cas latent à impact cross-tenant plausible (cette table ne contiendra pas de données réelles par conception — elle sert uniquement à réinitialiser le tenant démo). C'est une rupture du principe « RLS partout » qui mérite d'être corrigée, mais c'est de l'hygiène/dette, pas une exposition — **FAIBLE**.

**Preuve** : `supabase/migrations/20260807000000_demo_tenant_and_anonymous_rls.sql:32` crée la table ; aucune ligne `ALTER TABLE public.demo_seed_snapshot ENABLE ROW LEVEL SECURITY` n'existe dans tout le dépôt (`grep -rn "demo_seed_snapshot"` sur toutes les migrations = aucune mention RLS). Aucun `GRANT`/`REVOKE` explicite n'est trouvé non plus, donc les privilèges par défaut du projet Supabase s'appliquent — [NON VÉRIFIÉ précisément sans accès à l'instance : Supabase accorde par défaut `SELECT` aux rôles `anon`/`authenticated` sur les tables du schéma `public` sauf révocation explicite, mais je n'ai pas de connexion à la base pour confirmer l'état réel des GRANTs sur ce projet].

**Scénario d'exploitation (3 étapes)** :
1. Un attaquant obtient un token JWT valide (`authenticated`, n'importe quel tenant, ou même `anon` si les GRANTs par défaut Supabase s'appliquent).
2. Il appelle `GET https://<projet>.supabase.co/rest/v1/demo_seed_snapshot?select=*` avec l'en-tête `apikey: <clé anon publique>` (déjà exposée légitimement, voir angle mort 1).
3. Sans RLS, la requête retourne toutes les lignes de la table, sans filtre tenant.

**Impact réel** : la table ne contient que des snapshots JSON de données de démo synthétiques (`INSERT ... VALUES` aux lignes 45+ du même fichier, `vehicles`/`warranties`/`fuel_logs` de démonstration) — pas de données client réelles. L'impact confidentialité est donc faible dans l'usage actuel, mais le principe est violé : c'est la seule table du schéma qui rompt la cohérence « RLS partout », et si son usage évolue (elle sert de mécanisme de restauration pour le tenant démo), une régression future pourrait y placer des données sensibles sans que personne ne remarque l'absence de protection.

**Correctif** : ajouter `ALTER TABLE public.demo_seed_snapshot ENABLE ROW LEVEL SECURITY;` avec une policy restreignant l'accès au rôle `service_role` uniquement (cette table n'a besoin d'être lue que par la fonction serveur de reset du tenant démo, jamais par un client).

### Exceptions notées et expliquées (pas des findings — comportement voulu, vérifié)

| Table | RLS SELECT sans `tenant_id` | Explication vérifiée |
|---|---|---|
| `translation_cache` | Oui — `FOR SELECT USING (true)` | Cache de traductions, non lié à un tenant par nature (`20260804000002_consolidated_schema.sql:325`). Bénin. |
| `wilayas`, `communes` | Oui — `FOR SELECT TO public` | Référentiel géographique administratif algérien public, non tenant-scopé par nature. Bénin. |
| `platform_admins` | Oui — pas de `tenant_id` | Table globale de super-admins de la plateforme, structurellement hors du modèle tenant. Bénin, cohérent avec son rôle. |
| `companies`, `subscriptions` | Oui, mais via `company_id`/`get_current_user_company_id()` et non `tenant_id` | Coexistence de **deux modèles de multi-tenancy** dans le schéma : l'ancien (`companies`/`company_id`, epic1 auth) et le nouveau (`tenants`/`tenant_id`, refonte SaaS ultérieure). Fonctionnellement isolé dans les deux cas, mais c'est une dette d'architecture réelle — deux systèmes d'identité tenant qui coexistent sans migration complète de l'un vers l'autre est un terrain propice aux incohérences futures. Signalé pour information, pas noté comme faille en soi. |
| `tenants` (policy `Anon Demo Select Tenants`) | Oui, mais `USING (id = 'c0a80101-...'::uuid)` | Scopée à un seul UUID fixe (le tenant démo public). Intentionnel et sûr. |
| `login_attempts`, `replay_results` | RLS activée, **0 policy** | Fail-closed : aucun rôle `anon`/`authenticated` ne peut lire ces tables via l'API REST (seul `service_role`, qui bypass RLS, y accède). Sûr par défaut, mais à confirmer que rien côté client n'en dépend (sinon bug fonctionnel, pas faille). |

### Limite de portée de cette matrice

Le tableau ci-dessus couvre **exhaustivement** l'activation RLS (42/42 tables) et les policies **SELECT** (le vecteur de fuite de données le plus direct). Les policies INSERT/UPDATE/DELETE ont été vérifiées de façon ciblée sur les tables à plus fort enjeu (`work_orders`, `vehicles`, `vehicle_assignments`, `telemetry_events`, `pm_vehicle_subscriptions` — toutes confirmées avec `WITH CHECK (tenant_id = get_current_tenant_id())`, dont beaucoup via une **boucle dynamique** peu visible au grep statique : `supabase/migrations/20260804000002_consolidated_schema.sql:303-313`, un bloc `DO $$ ... EXECUTE format('CREATE POLICY ... FOR INSERT WITH CHECK (tenant_id = ...)', t, t) ...` itérant sur un tableau de noms de tables — d'où l'absence de correspondance sur une recherche littérale `ON public.work_orders.*FOR INSERT`). Une vérification exhaustive INSERT/UPDATE/DELETE des 42 tables × 4 commandes n'a **pas** été effectuée faute de temps dans le cadre de cet audit — c'est une limite explicite, pas une affirmation d'exhaustivité au-delà de SELECT.

---

## ANGLE MORT 3 — L'IA prédictive s'exécute-t-elle réellement ? (→ corrige `01_ETAT_FONCTIONNEL.md`)

**Tranché par exécution réelle, deux appels distincts, avec la clé `GEMINI_API_KEY` présente dans `.env` :**

1. Appel texte libre à `gemini-3.6-flash` → succès, réponse `"OK"`.
2. Appel reproduisant exactement le chemin de code de production (`server.ts:315-359` : même modèle, même `responseSchema` structuré, mêmes champs requis) → succès, réponse JSON structurée et non constante : `{"critical_subsystem":"Engine Lubrication System","failure_likelihood_percentage":68.5,"confidence_score":0.89}`.

**Conclusion : l'identifiant de modèle est valide, l'endpoint `/api/predictive-ai` fonctionne réellement en conditions normales.** Le repli déterministe (`predictiveAiService.ts:69-176`, `confidence_score: 0.92` codé en dur) ne s'active que si la clé est absente ou l'appel échoue — ce n'est pas le comportement par défaut dans cet environnement, contrairement à l'hypothèse de départ. Correction déjà appliquée à `audit/01_ETAT_FONCTIONNEL.md` §1.

---

## C1 — Clés et secrets

Voir angle mort 1 pour le détail complet. Résumé des findings :

### C1-1 [FAIBLE] — Doublon de modèle de secret : deux fichiers `.env.example`

**Preuve** : `.env.example` (588 octets, 09/08) et `.env.docker.example` (1099 octets, 19/08) coexistent avec des jeux de variables qui se chevauchent partiellement. Aucune fuite (les deux ne contiennent que des clés vides ou des placeholders), mais deux sources de vérité pour la configuration augmentent le risque qu'un déploiement futur oublie une variable dans l'un des deux fichiers (`FLESPI_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` apparaissent-ils dans les deux ? à vérifier avant tout déploiement).

**Correctif** : fusionner en un seul fichier `.env.example` faisant référence aux deux contextes (local vs Docker) via des commentaires, plutôt que deux fichiers distincts à maintenir en synchronisation manuelle.

---

## C2 — Matrice RLS complète table × rôle

Voir angle mort 2 ci-dessus pour la matrice SELECT exhaustive (42 tables) et le détail C2-1.

### C2-2 [MOYEN — était FAIBLE] — Coexistence de deux modèles de tenant (`tenants`/`tenant_id` vs `companies`/`company_id`)

> **Retriage** : noté FAIBLE dans la version précédente, ce qui sous-estimait le risque structurel. Deux systèmes d'identité tenant qui coexistent dans le même schéma sont exactement le terrain sur lequel une future table est scopée sur le mauvais modèle — et une table mal scopée est, par définition, une fuite cross-tenant. Aucune table actuelle n'est mal scopée aujourd'hui (vérifié en Phase C), donc ce n'est pas exploitable maintenant — mais ce n'est pas non plus de la pure hygiène : c'est une dette d'architecture avec un chemin plausible et direct vers une fuite cross-tenant. Correspond à la clause MOYEN de la grille (« exploitation nécessitant des conditions peu probables aujourd'hui ») — **MOYEN**.

Déjà détaillé dans le tableau d'exceptions ci-dessus. Recommandation : documenter explicitement dans `AGENTS.md` lequel des deux modèles est la source de vérité actuelle et planifier la dépréciation de l'autre, pour éviter qu'une future table utilise par erreur le mauvais modèle de scoping.

---

## C3 — Exposition colonne pour les rôles non-financiers (MECHANIC, DRIVER, OPERATIONS)

Rappel du modèle : les policies RLS de `supabase/migrations/20260805000001_role_based_rls_policies.sql` sont **row-level**, pas **column-level**. PostgREST traduit `select('*')` (utilisé partout côté application, notamment `src/api/vehicles.ts:15`, `src/api/workOrders.ts:15-17`) en `SELECT *` réel une fois les lignes filtrées par RLS — aucune vue restreinte, aucune `SECURITY INVOKER` avec projection de colonnes n'a été trouvée dans le schéma.

### C3-1 [MOYEN] — `MECHANIC` et `DRIVER` reçoivent les colonnes de coût sur leurs propres lignes autorisées

**Preuve** : `work_orders` (colonnes `labor_cost`, `total_cost`, `hourly_rate`, `parts_used` avec `unit_cost` par pièce — schéma `supabase/migrations/20260804000002_consolidated_schema.sql:122+`) est accessible en lecture à `MECHANIC` pour ses WO assignés (`role_based_rls_policies.sql:73-77`) et à `DRIVER` pour les WO de son véhicule assigné (`:78-84`) — **row-level only**, donc `SELECT *` renvoie `labor_cost`/`total_cost`/`hourly_rate` en clair.

**Scénario d'exploitation (3 étapes)** :
1. Un compte `MECHANIC` légitime s'authentifie normalement (pas de contournement nécessaire — c'est un accès autorisé par la RLS actuelle).
2. Il appelle `GET /api/work-orders` (ou directement PostgREST `work_orders?select=*`) — la RLS le limite bien à ses propres WO assignés.
3. La réponse contient néanmoins `labor_cost`, `total_cost`, `hourly_rate`, et le coût unitaire de chaque pièce utilisée — des données financières que le référentiel produit exige explicitement de masquer à ce rôle (« le mécanicien ne doit voir aucune donnée financière »).

**Impact** : violation d'une exigence métier explicite, pas une fuite cross-tenant (le mécanicien ne voit que SES PROPRES interventions). Sévérité modérée : c'est une exigence de confidentialité interne (le mécanicien connaît le taux horaire facturé, le coût des pièces), pas une brèche de sécurité au sens strict.

**Correctif** : soit exposer `work_orders` au rôle `MECHANIC`/`DRIVER` via une vue Postgres (`work_orders_operational_view`) qui exclut les colonnes financières et que l'API interroge à la place de la table pour ces rôles, soit ajouter une projection explicite de colonnes côté Express (`select('id, vehicle_id, status, parts_used(part_id, quantity), before_after_notes, ...')` en excluant les champs de coût) quand le rôle appelant n'est pas financier — actuellement `select('*')` est utilisé uniformément sans branchement par rôle.

---

## C4 — Les 5 endpoints Express réellement appelés par le frontend

Rappel (`audit/01_ETAT_FONCTIONNEL.md` §5) : `/api/incidents`, `/api/maintenance/log-obd-fault`, `/api/pm-schedules/status`, `/api/predictive-ai`, `/api/work-orders/:id/close`.

### C4-1 [ÉLEVÉ — était CRITIQUE] — `GET /api/pm-schedules/status` : bug de scoping tenant sur le client `service_role` (RLS bypass)

> **Retriage** : noté CRITIQUE dans la version précédente. Ma propre preuve empirique (reconstruction de la requête PostgREST) établit que ce bug **échoue systématiquement aujourd'hui** (`tenant_id=eq.undefined` rejeté par Postgres, cast UUID invalide) — il n'y a **aucun exploit actif**, seulement un scénario futur conditionné à une évolution du SDK ou de la structure de l'objet `user`. La grille réserve CRITIQUE à « exploitable aujourd'hui + fuite/corruption/prise de contrôle ». Ce cas correspond très précisément à la clause ÉLEVÉ : « latent avec impact cross-tenant en cas de régression plausible ». Reclassé **ÉLEVÉ** — la sévérité potentielle en cas de régression reste maximale (fuite cross-tenant totale sur un client RLS-bypass, zéro test de garde), d'où le maintien au-dessus de MOYEN malgré l'absence d'exploit actif.

**Preuve** :
- `src/api/pmSchedules.ts:37` : `const tenantId = (req as any).user.tenant_id;` — l'objet `user` provient de `supabase.auth.getUser()` dans `requireAuth` (`src/api/middleware.ts:26,33`) et **n'a pas de propriété `tenant_id` de premier niveau**. Partout ailleurs dans le code, le tenant est lu via `user.user_metadata?.tenant_id` ou `user.app_metadata?.tenant_id` (confirmé identique dans `src/services/authService.ts:402`, `src/services/fleetData.ts:97`, et les fonctions SQL `auth.jwt() -> 'app_metadata' ->> 'tenant_id'`). `pmSchedules.ts:37` et les **6 occurrences** de `src/api/pmSubscriptions.ts:16,36,58,81,104,126` sont les **seuls endroits du dépôt** à utiliser la forme incorrecte `user.tenant_id`.
- `src/api/pmSchedules.ts:40-48` exécute cette requête avec **`supabaseAdmin`** (`import { supabaseAdmin } from '../lib/supabaseAdmin'`, ligne 5) — le client `service_role`, qui **bypass toute RLS**. Le commentaire du fichier (lignes 13-14) confirme que c'est un choix délibéré : *« we use admin here just to query quickly... but for this MVP admin is okay if filtered by tenant »* — la sécurité de cet endpoint repose **entièrement** sur ce filtre applicatif cassé, puisque la RLS est explicitement contournée.
- **Vérification empirique** (et non simple lecture de code) : reconstruction de la requête PostgREST réellement générée par `@supabase/supabase-js@2.111.0` (version effectivement installée) pour `.eq('tenant_id', undefined)` → produit littéralement `tenant_id=eq.undefined` dans l'URL. `tenant_id` étant une colonne `UUID`, Postgres rejette ce filtre avec une erreur de cast (`invalid input syntax for type uuid: "undefined"`), donc **l'endpoint échoue systématiquement aujourd'hui** (capturé par le `catch` générique, retourne une 500) — ce n'est **pas** une fuite active actuellement.

**Scénario d'exploitation (3 étapes) — POTENTIEL, pas actif aujourd'hui, d'où CRITIQUE plutôt qu'un exploit confirmé** :
1. Une évolution future (mise à jour du SDK Supabase, changement de la façon dont `requireAuth` construit l'objet `user`, ou simple copier-coller d'un autre endroit du code qui ajoute par erreur un champ `tenant_id` à la racine de l'objet `user`) fait que `(req as any).user.tenant_id` cesse d'être `undefined`.
2. Si cette valeur devient une chaîne vide, `null`, ou toute valeur qui ne filtre plus correctement (ou si un attaquant peut influencer la valeur via un JWT forgé si la validation de structure n'est pas stricte), le filtre `tenant_id=eq.<valeur>` sur le client **`service_role`** (RLS bypass) peut cesser de restreindre correctement les résultats.
3. `GET /api/pm-schedules/status` renverrait alors les statuts PM (plaques, kilométrage, calendriers de maintenance) de **tous les tenants de la plateforme**, pas seulement celui de l'appelant — sur un endpoint accessible à n'importe quel utilisateur authentifié (`requireAuth` seul, aucun contrôle de rôle).

**Pourquoi CRITIQUE malgré l'absence d'exploit actif** : c'est la combinaison la plus dangereuse possible — client `service_role` (aucun filet de sécurité RLS) + variable de scoping tenant structurellement fausse + zéro test qui couvre cet endpoint (confirmé : aucun fichier de test ne mentionne `pmSchedules` ni `pmSubscriptions`) + aucune alerte de type actuelle (TypeScript ne détecte pas `user.tenant_id` comme erreur car `(req as any).user` est typé `any`, désactivant toute vérification). Le bug est silencieux par construction : il échoue aujourd'hui de façon bruyante (500), mais rien ne l'empêche de devenir silencieux et dangereux demain.

**Correctif** : (1) remplacer `(req as any).user.tenant_id` par `(req as any).user.user_metadata?.tenant_id` (cohérent avec le reste du code) dans les 7 occurrences (`pmSchedules.ts:37`, `pmSubscriptions.ts:16,36,58,81,104,126`) ; (2) plus fondamentalement, ne jamais utiliser `supabaseAdmin` pour répondre à une requête utilisateur sans un contrôle explicite et testé du tenant — préférer le client `(req as any).user`-scopé partout où c'est possible, pour que la RLS reste le filet de sécurité par défaut même en cas d'erreur applicative ; (3) ajouter un test d'intégration qui vérifie explicitement l'isolation tenant sur ces deux fichiers, aujourd'hui totalement non couverts.

### C4-2 [CRITIQUE — était ÉLEVÉ] — `POST /api/maintenance/log-obd-fault` : aucun contrôle de rôle ni d'appartenance, injection de statut sur véhicule arbitraire

> **Retriage** : noté ÉLEVÉ dans la version précédente. C'est une sous-évaluation au regard de la grille : cette faille est **exploitable aujourd'hui**, par n'importe quel compte authentifié du tenant, **sans aucun contournement** — et elle **corrompt `audit_log`**, la table dont ma propre analyse dit qu'elle « fait autorité ». Une piste d'audit falsifiable est précisément le cas « corruption de donnée faisant foi » de la clause CRITIQUE de la grille : c'est la table qui sert de preuve en cas de litige client, d'accident, ou de contestation d'une décision de maintenance — sur un produit dont l'argument de vente est la traçabilité de la décision financière (CAE, work orders). Reclassé **CRITIQUE**.

**Preuve** : `src/api/maintenance.ts:9-77`. Le seul middleware est `requireAuth` (ligne 7, hérité de `maintenanceRouter.use(requireAuth)`) — aucune restriction de rôle (contraste direct avec `/api/predictive-ai`, `server.ts:276-280`, qui restreint explicitement à `DIRECTOR/FLEET_MANAGER/MAINTENANCE_MANAGER`). Le corps de requête (`vehicleId`, `fault` — code, name, severity, required_part_id, required_intervention) est utilisé **sans aucune validation de schéma** (pas de Zod, contraste avec `/api/predictive-ai` qui utilise `PredictiveAiRequestSchema.safeParse`). Le seul contrôle d'appartenance est la RLS `tenant_id` sur `vehicles` (via la boucle dynamique de `20260804000002_consolidated_schema.sql`) — **aucune vérification que le véhicule ciblé est assigné à l'appelant**, contrairement à ce qu'impose la RLS `work_orders` pour un `MECHANIC` (assigné) ou `DRIVER` (véhicule assigné) ailleurs dans le même schéma.

**Scénario d'exploitation (3 étapes)** :
1. Un compte `DRIVER` ou `MECHANIC` légitime (n'importe lequel du tenant, pas forcément lié au véhicule ciblé) s'authentifie normalement.
2. Il appelle `POST /api/maintenance/log-obd-fault` avec un `vehicleId` appartenant à **n'importe quel autre véhicule de son tenant** (pas le sien) et `fault.severity: "Critical"`, `fault.code` et `fault.name` arbitraires.
3. Le serveur exécute la Rule R1 (`DecisionEngine.evalRuleR1`, ligne 41), passe le véhicule ciblé en `status: 'Unsafe / Red'` (ligne 43-52), crée une alerte `fleet_alerts` visible par les managers (ligne 55-63), et écrit un `audit_log` (ligne 66-71) qui **fait autorité** — rien ne distingue cette entrée d'un vrai signalement OBD-II électronique.

**Impact** : un utilisateur à faible privilège peut immobiliser à distance n'importe quel véhicule de sa flotte (déclenchement `emergencyDispatchRequired`/`removeDispatchAssignment` côté logique métier) et polluer l'audit trail avec de fausses pannes critiques — sabotage opérationnel plausible, pas fuite de données, d'où ÉLEVÉ plutôt que CRITIQUE.

**Correctif** : ajouter (1) une validation Zod du corps de requête (severity dans une énumération fermée, code/name bornés en longueur) ; (2) une vérification explicite que `vehicleId` est soit assigné à l'appelant (si rôle `MECHANIC`/`DRIVER`), soit que l'appelant a un rôle managérial autorisé à agir sur n'importe quel véhicule du tenant — sur le modèle du contrôle déjà présent sur `/api/predictive-ai`.

### C4-3 [ÉLEVÉ] — `POST /api/incidents` : table cible inexistante, endpoint cassé

**Preuve** : `src/api/incidents.ts:14-16` — `supabase.from('incidents').insert(...)`. Recherche exhaustive de `CREATE TABLE.*\bincidents\b` sur `supabase/migrations/*.sql` et `supabase/schema.sql` → **0 résultat**. Seule `public.driver_incidents` existe (`supabase/migrations/20260820000000_driver_management.sql`). Toute requête vers une table inexistante échoue côté PostgREST (erreur `PGRST205`/table introuvable), capturée par le `catch` générique (ligne 53-55) qui renvoie une 500 sans distinction.

Classé sécurité (pas seulement fonctionnel) parce que : (1) c'est l'un des 5 seuls endpoints que le produit expose réellement à l'utilisateur final (chauffeur signalant un incident) — une fonctionnalité de sécurité opérationnelle (signalement d'incident routier) est silencieusement non opérationnelle en production ; (2) l'erreur 500 générique ne donne aucune télémétrie exploitable pour détecter que la fonctionnalité est cassée depuis potentiellement la mise en production.

**Correctif** : corriger `'incidents'` en `'driver_incidents'` ligne 15, vérifier la correspondance des colonnes attendues par le reste du handler avec le schéma réel de `driver_incidents`, et ajouter un test d'intégration qui aurait immédiatement détecté cette régression (aucun test actuel n'appelle cet endpoint).

### C4-4 [MOYEN] — `POST /api/work-orders/:id/close` et `POST /api/work-orders/` : mass assignment via `...orderData`/`req.body` sans validation, pas de contrôle d'assignation sur la fermeture

**Preuve** : `src/api/workOrders.ts:11` — `const { parts_used, labor_hours, hourly_rate, ...orderData } = req.body;` puis ligne 62-69 `insert({ ...orderData, ... })` : tout champ additionnel présent dans le corps de requête (`status`, `vehicle_id`, potentiellement des colonnes non prévues par l'UI) est inséré tel quel. Protection réelle contre l'usurpation de `tenant_id` : la policy `WITH CHECK (tenant_id = get_current_tenant_id())` de la boucle dynamique empêche de forcer un `tenant_id` étranger — vérifié. Mais aucune validation de schéma ne borne les autres champs (`status` pourrait être une valeur hors énumération attendue si la contrainte CHECK SQL ne la couvre pas explicitement — non vérifié colonne par colonne). Sur `POST /:id/close` (ligne 89-153), la RLS `UPDATE` sur `work_orders` provient de la même boucle dynamique **tenant-scoped uniquement** (`tenant_id = get_current_tenant_id()`), **aucune policy UPDATE role/assignment-scoped n'a été trouvée** contrairement à la policy SELECT dédiée de `20260805000001_role_based_rls_policies.sql:66-86` — recherche explicite de `FOR UPDATE` + `work_orders` sur toutes les migrations = uniquement la policy générique tenant-only.

**Scénario d'exploitation (3 étapes)** :
1. Un compte `DRIVER` (dont la RLS SELECT ne devrait montrer que les WO de son véhicule assigné) obtient malgré tout — par une autre voie de l'UI, ou en devinant/énumérant des UUID de WO d'un collègue — l'`id` d'un work order qui ne lui est pas assigné, dans son propre tenant.
2. Il appelle `POST /api/work-orders/<id>/close` avec ce `id`.
3. La policy UPDATE (tenant-only) l'autorise : le WO passe à `status: 'Closed'` avec de fausses `after_notes`, alors que ce rôle ne devrait légitimement fermer que ses propres interventions assignées (le mécanicien assigné, pas n'importe quel utilisateur du tenant).

**Correctif** : ajouter une policy UPDATE spécifique par rôle sur `work_orders`, symétrique à la policy SELECT déjà écrite (`assigned_mechanic_id = auth.uid()` pour `MECHANIC`), et valider `req.body` avec Zod côté Express plutôt que de spreader `orderData` directement dans l'insert.

### C4-5 [MOYEN] — Aucune validation de schéma (Zod) sur 4 des 5 endpoints réellement appelés

**Preuve** : seul `/api/predictive-ai` (`server.ts:282-286`, `PredictiveAiRequestSchema.safeParse`) valide son entrée. `maintenance.ts`, `workOrders.ts`, `incidents.ts` n'ont **aucune** validation de type/forme malgré `zod` étant déjà une dépendance du projet (`package.json`) et déjà utilisée ailleurs (webhooks télémétrie, `server.ts`). C'est une incohérence de pratique plutôt qu'une faille isolée — regroupée ici pour éviter la répétition dans C4-2/C4-3/C4-4 ci-dessus, qui en sont chacun un symptôme concret.

**Correctif** : généraliser l'usage de Zod (déjà en place pour les webhooks et `/api/predictive-ai`) à tous les handlers Express qui écrivent en base.

---

## C5 — Webhook télémétrie `/api/webhooks/telemetry/:provider` : la protection est-elle réellement appliquée à la route ?

**Résultat : oui, vérifié par lecture du chemin d'exécution complet — c'est la partie la mieux sécurisée du dépôt.**

- **Authentification** (`server.ts:424-425` → `WebhookSecurityService.authenticateAndRateLimit`, `src/services/security/WebhookSecurityService.ts:27-130`) : extraction du secret (`Authorization`/`x-flespi-secret`/`x-traccar-secret`), hash SHA-256, comparaison contre `telematics_gateways.credential_hash` via `crypto.timingSafeEqual` (ligne 93) — **réellement invoquée dans le chemin de la requête**, pas seulement disponible. Retourne 401 si non authentifié (`server.ts:440`).
- **Rate limiting** : IP-level (`WebhookSecurityService.ts:35`) et gateway-level (`:109`) via `RateLimiter` → `RedisRateLimitStore`, réellement appelés avant tout traitement, fail-closed si Redis indisponible (503, `server.ts:428-431`).
- **Anti-rejeu** : contrairement à un commentaire du code qui pourrait laisser penser le contraire (`WebhookSecurityService.ts:25` — *« Replay ... happens later in the pipeline »*), la vérification a bien lieu **avant toute écriture en base**, dans `TelemetryIngestionService.ts:122,127` — `replayProtection.isTimestampValid(...)` puis `await replayProtection.checkAndStoreEvent(...)`, avec blocage explicite si `!replayDecision.allowed` (ligne 129+). C'est le worker asynchrone (après le `202 Accepted` immédiat de la route HTTP) qui l'exécute, pas la route elle-même — architecture voulue (accusé de réception rapide, validation approfondie en tâche de fond), pas un défaut.

### C5-1 [MOYEN] — La réponse HTTP `202 Accepted` est renvoyée avant la vérification anti-rejeu

**Preuve** : `server.ts:419-464` — le `202` est renvoyé dès la mise en queue BullMQ réussie (ligne 464), avant que `TelemetryIngestionService` (exécuté par le worker séparé, `worker.ts`) ne vérifie le rejeu. Un appelant ne peut donc pas distinguer, à la réception du `202`, si son événement sera finalement accepté ou rejeté comme rejeu — comportement attendu d'une architecture asynchrone, mais qui mérite d'être documenté côté intégrateurs télématiques (Flespi/Traccar) pour éviter toute hypothèse erronée sur la sémantique du `202`.

**Correctif** : documentation seulement (pas un bug) — préciser dans `docs/`/`AGENTS.md` que `202` signifie « mis en queue », pas « accepté et persisté », et que le statut définitif n'est observable que via les métriques Prometheus (`telemetry_webhooks_total`) ou un futur endpoint de statut par `correlationId`.

---

## C6 — Audit des dépendances

**`npm audit --json` exécuté réellement** (voir commande dans les logs de cet audit) : **0 vulnérabilité** toutes sévérités confondues (`info: 0, low: 0, moderate: 0, high: 0, critical: 0`), sur l'arbre de dépendances actuel.

Pas d'équivalent `pip-audit` applicable : le projet ne contient aucun code Python (`requirements.txt`/`pyproject.toml` absents, confirmé en Phase A).

### C6-1 [FAIBLE] — Couverture de test quasi nulle sur les endroits mêmes où ce rapport trouve des failles

**Preuve** (déjà détaillée dans la correction de `audit/01_ETAT_FONCTIONNEL.md` §6.4) : `@vitest/coverage-v8` n'est pas installé (impossible d'obtenir un pourcentage de couverture par dossier sans modifier `package.json`, ce qui violerait la contrainte lecture-seule de cet audit — non fait). Analyse manuelle de substitution : aucun fichier de test ne mentionne `pmSchedules`, `pmSubscriptions`, `incidents.ts`, ou `maintenance.ts` (les 3 endpoints où C4-1/C4-2/C4-3 ont été trouvés). Les tests RLS existants (`supabase/tests/rls-isolation-test.sql`, `rls-role-based-policies-test.sql`, `verify-tenant-foreign-keys.sql`) sont des scripts SQL — le pipeline CI (`.github/workflows/ci-cd.yml:34-36`) ne les exécute **pas** contre une base de données : l'étape nommée *« Automated RLS Multi-Tenant Security & Isolation Audit »* se limite à `test -f supabase/tests/rls-isolation-test.sql` — une vérification que le fichier **existe sur le disque**, pas que ses assertions SQL passent. Le nom de l'étape CI est trompeur : aucune donnée n'est jamais réellement testée pour l'isolation RLS en CI.

**Correctif** : câbler l'étape CI pour exécuter réellement les fichiers `.sql` de `supabase/tests/` contre une instance Postgres éphémère (ex. `supabase start` en CI, ou un conteneur Postgres avec le schéma appliqué), et ajouter des tests d'intégration Vitest/Supertest pour les 5 endpoints Express réellement utilisés en production.

---

## C7 — Données personnelles chauffeurs (GPS, comportement de conduite)

**Avertissement méthodologique** : je n'ai pas accès à une base juridique à jour pour vérifier le contenu exact et le numéro précis du texte de loi algérien applicable à la date de cet audit (ma connaissance des textes légaux n'est pas garantie à jour, et je n'ai pas interrogé de source externe pour cette section). Ce qui suit est une analyse du **code contre des principes généraux de protection des données personnelles** (base légale du traitement, minimisation, durée de conservation définie, journalisation des accès) — pas une opinion juridique. Une revue par un juriste spécialisé en droit algérien de la protection des données est recommandée avant toute mise en production traitant des données de chauffeurs réels.

### C7-1 [ÉLEVÉ] — Aucune durée de conservation définie pour les données de géolocalisation

**Preuve** : `telemetry_events` (`supabase/migrations/20260817000000_telemetry_canonical_events_and_idempotency.sql:5-19`) stocke `payload JSONB` (contenant la position GPS/vitesse d'après `TelemetryNormalizer.ts`/`CanonicalTelemetryEvent`), horodaté (`event_timestamp`), lié à `vehicle_id`/`tenant_id`, sans colonne `expires_at`/`retention_until`, et recherche exhaustive de toute logique de purge (`retention`, `TTL`, `older than`, tâche cron de suppression) dans `src/services/` → **aucun résultat pertinent** pour cette table (les seuls TTL trouvés concernent des caches applicatifs de 30 secondes à 5 minutes, sans rapport). Les données de géolocalisation d'un chauffeur, une fois ingérées, sont donc conservées **indéfiniment** par défaut.

**Correctif** : définir une politique de rétention explicite (ex. purge automatique après N mois, configurable par tenant), documentée et exécutée par une tâche planifiée (le projet a déjà `worker.ts`/BullMQ pour ce type de tâche récurrente).

### C7-2 [MOYEN] — Aucune journalisation des accès en lecture aux données chauffeur

**Preuve** : `audit_log` (`supabase/migrations/20260804000006_audit_log.sql`) a des colonnes `before`/`after` — conçu exclusivement pour tracer des écritures (confirmé : toutes les insertions dans `audit_log` trouvées dans le code sont des actions `_CREATED`/`_CLOSED`/`_LOGGED`/`APPROVAL`, recherche de tout enregistrement de consultation `VIEW`/`READ` → 0 résultat). Un `FLEET_MANAGER` ou `DIRECTOR` qui consulte l'historique GPS ou le score de sécurité d'un chauffeur nommé (`SafetyPerformance.tsx`, `DriverSafetyView.tsx`) ne laisse **aucune trace** de cette consultation — pertinent pour un principe de traçabilité des accès aux données personnelles sensibles (comportement de conduite individualisé).

**Correctif** : ajouter une journalisation des accès en lecture sur les vues/endpoints qui exposent des données de conduite individualisées, au moins pour les rôles ayant une vue nominative multi-chauffeurs (`DIRECTOR`, `FLEET_MANAGER`, `FINANCE`).

*(Base légale et consentement — non noté comme finding séparé faute de pouvoir vérifier le cadre légal exact, mais consigné pour information)* : aucun champ `consent`/équivalent n'a été trouvé dans le schéma (`grep` exhaustif = 0 résultat), et rappel du constat de Phase B : les profils de performance chauffeur affichés dans l'UI (`SafetyPerformance.tsx:60`) sont actuellement des données **fixture codées en dur**, pas des données de chauffeurs réels — donc aucun préjudice concret aujourd'hui sur ce point précis, le risque étant latent (activé le jour où cette fonctionnalité serait reconnectée à de vraies données de conduite sans qu'une base légale/consentement n'ait été ajoutée entre-temps).

---

## RÉCONCILIATION BASE RÉELLE — non aboutie, documentée comme limite

> **Ajout post-validation** : il avait été demandé de trancher l'angle mort 2 (RLS écrite vs RLS réellement active) par requête directe sur la base Postgres réelle, plutôt que par lecture des fichiers de migration (dont la Phase A a établi qu'ils divergent du working tree : migrations supprimées, renommée, 6 non versionnées). J'ai tenté cette connexion : le mot de passe fourni (à deux reprises, avec et sans les crochets `[...]` du template Supabase) a été rejeté par le serveur Postgres réel (`db.fzmoaxywccqcetxgedze.supabase.co:5432`, erreur `password authentication failed for user "postgres"` — une erreur d'authentification explicite, pas un problème réseau : le serveur a bien reçu et évalué la tentative). Le mot de passe transmis a été vérifié caractère par caractère (aucun caractère invisible, correspondance exacte avec ce qui avait été collé) avant d'écarter une erreur de transcription de mon côté. Faute de credential valide, **la réconciliation base réelle demandée n'a pas pu être exécutée.**
>
> Conséquence explicite sur ce rapport : **toute l'analyse RLS de C2 (angle mort 2) reste basée sur la lecture des fichiers `supabase/migrations/*.sql`, pas sur l'état réellement déployé.** C'est une limite de preuve reconnue, pas une preuve d'absence de divergence — le tableau de réconciliation `| Table | RLS selon migrations | RLS selon pg_tables (réel) | Écart ? |` demandé reste **[NON VÉRIFIÉ — accès direct à la base réelle non obtenu]**, de même que la question du GRANT `anon`/`authenticated` sur `demo_seed_snapshot` (C2-1 reste noté sur la base du raisonnement RLS/GRANT par défaut documenté par Supabase, pas sur une lecture réelle de `information_schema.role_table_grants`).
>
> **Recommandation immédiate, indépendante de la suite de cet audit** : le mot de passe communiqué dans cette conversation (à deux reprises, dans les deux formats) doit être considéré comme compromis et réinitialisé via Supabase Dashboard → Project Settings → Database, que la connexion ait fini par aboutir ou non.

---

## C8 — Session et JWT

### C8-1 [MOYEN] — Session persistée en `localStorage` par défaut, sans configuration explicite

**Preuve** : `src/lib/supabase.ts:35` — `createClient(supabaseUrl, supabaseKey)`, appelé **sans objet `auth` de configuration**. Le SDK `@supabase/supabase-js` v2 utilise par défaut `persistSession: true` avec `storage: window.localStorage` et `autoRefreshToken: true` quand aucune option n'est fournie. Le token d'accès et le refresh token JWT résident donc en clair dans `localStorage`, lisible par **tout script JavaScript exécuté dans la page** — y compris un script injecté par une XSS qui apparaîtrait dans une dépendance tierce future (aucune XSS applicative trouvée aujourd'hui, voir C12, mais `localStorage` n'offre aucune barrière `httpOnly` contrairement à un cookie).

**Scénario d'exploitation (3 étapes)** : (1) une vulnérabilité XSS apparaît un jour, via une dépendance npm compromise ou un futur composant qui rendrait du contenu utilisateur non échappé ; (2) le script injecté lit `localStorage.getItem('sb-<ref>-auth-token')` ; (3) l'attaquant réutilise le token pour usurper la session sans jamais connaître le mot de passe — impact borné par la durée de vie du token (défaut Supabase : access token 1h, refresh token rotatif).

**Correctif** : évaluer le passage à un stockage de session côté cookie `httpOnly`/`secure`/`SameSite=Strict` (nécessite un flux d'échange de session côté serveur, changement d'architecture non trivial) ; à défaut, traiter la prévention XSS (C12) comme le principal filet de sécurité de la session et la documenter comme telle.

### C8-2 [FAIBLE, vérifié propre] — Déconnexion : scope par défaut correct

**Preuve** : les 4 occurrences de `supabase.auth.signOut()` trouvées (`TopBar.tsx:204`, `AdminTopBar.tsx:12`, `LandingPage.tsx:389`, `authService.ts:479`) appellent toutes la méthode **sans argument de scope**. Le défaut du SDK v2 est `scope: 'global'`, qui révoque le refresh token côté serveur (GoTrue), pas seulement un nettoyage local. **Pas de finding** — comportement correct par défaut, consigné pour montrer que le point a été vérifié et pas seulement supposé.

---

## C9 — Surface super-admin `/api/platform/*`

**Résultat global : c'est la partie la mieux gardée du dépôt, à l'exception d'une absence de limite de débit dédiée.**

- Les **21 routes** de `src/api/platformAdmin.ts` sont **toutes** gated par `requirePlatformAdmin` (`platformAdmin.ts:18-62`), qui (1) vérifie un JWT valide, (2) interroge `platform_admins` via `supabaseAdmin` (service_role — volontaire et correct ici, car ce contrôle est censé être global, pas tenant-scopé) avec `eq('id', user.id)`, (3) rejette 403 si absent.
- **Chemin d'auto-élévation recherché et non trouvé** : `grep` exhaustif des migrations pour toute policy `INSERT`/`UPDATE`/`DELETE` sur `platform_admins` → **0 résultat**, seule une policy `SELECT ... USING (id = auth.uid())` existe (`20260814000000_fix_platform_admins_recursion.sql:14-18`, corrige une récursion infinie d'une policy antérieure — changelog propre). RLS activée (confirmé Phase C, angle mort 2) sans aucune policy d'écriture pour `authenticated` = **écriture refusée par défaut**. La seule voie pour ajouter un admin est `POST /api/platform/admins` (`platformAdmin.ts:234-251`), qui exige déjà `requirePlatformAdmin` — **un `TENANT_ADMIN` ne peut pas s'auto-promouvoir**, ni via l'API Express, ni via un appel direct au SDK Supabase.
- Chaque endpoint reste dans le contrôle direct de tenant qu'il cible via `req.params.id`/`platformAdminService` — pas d'anomalie de contrôle d'accès horizontal trouvée dans le temps imparti à cette relecture.

### C9-1 [FAIBLE] — Pas de limite de débit dédiée sur la surface super-admin

**Preuve** : `/api/platform/*` bénéficie du rate limiter global `apiRateLimiter` (`server.ts:216`, `app.use('/api', apiRateLimiter)`, monté avant tous les routers) — donc une limite existe, mais elle est **identique** à celle de n'importe quel endpoint public (30 req/min/IP, voir C13) alors que cette surface peut suspendre des tenants entiers, changer des rôles, ou lister tous les utilisateurs de la plateforme. Pas un manque total, mais un manque de proportionnalité — **FAIBLE**, pas plus, car `requirePlatformAdmin` reste le filet principal et fonctionne.

**Correctif** : appliquer une limite plus stricte et davantage journalisée spécifiquement sur `/api/platform/*`, avec alerte sur dépassement (surface la plus privilégiée du produit).

---

## C10 — Brute force sur l'authentification

### C10-1 [ÉLEVÉ] — Le verrou anti-brute-force est réel dans le code mais contournable par construction

**Preuve, en 3 couches** :
1. **La logique existe et est câblée dans le vrai flux de connexion** : `src/services/authService.ts:356-374` (fonction `loginUser`, appelée depuis `src/components/common/AuthModal.tsx`) appelle bien `checkRateLimit(email)` avant `supabase.auth.signInWithPassword(...)`, et `recordFailedLogin(email)` en cas d'échec — 5 tentatives max, verrou 15 minutes, message utilisateur cohérent (`:358,369,371`). Ce n'est donc **pas** du code mort comme `checkRateLimitAsync`/`clearRateLimitAsync` isolément (ces deux-là ne sont appelés que par eux-mêmes et par des tests, `grep` confirmé).
2. **Mais l'application du verrou (`checkRateLimit`, sans suffixe `Async`, ligne 102) lit uniquement une `Map` en mémoire côté navigateur** (`loginAttemptsMap`, `authService.ts:41`, module-level, donc par onglet/session navigateur). Elle est vidée à chaque rechargement de page.
3. **La persistance en base (`login_attempts` table, censée survivre aux rechargements/redémarrages selon le commentaire de sa propre migration, `20260809000000_login_attempts_table.sql:2`) est bloquée pour l'acteur même qu'elle est censée freiner** : la policy RLS de cette table est `TO authenticated, service_role` uniquement (`:20-24`), **`anon` n'a aucun GRANT**. Or un utilisateur qui tente de se connecter (par définition pas encore authentifié) parle à Supabase avec le rôle `anon`. L'`upsert` de `recordFailedLogin` (`authService.ts:141-146`) échoue donc silencieusement pour lui (`catch { /* Gracefully handle persistence fallback */ }`, `:147-149`) — vérifié par lecture du GRANT, pas exécuté en live (dépend de l'accès DB non obtenu, voir section réconciliation ci-dessus, mais le raisonnement GRANT/rôle ne dépend pas de cet accès, c'est une lecture directe de politique SQL).

**Scénario d'exploitation (3 étapes)** : (1) un attaquant scripte des tentatives de connexion directement contre l'API Auth de Supabase (`POST https://<ref>.supabase.co/auth/v1/token?grant_type=password`) avec la clé `anon` publique — sans jamais charger l'application React, donc sans jamais exécuter `checkRateLimit`/`recordFailedLogin`, qui sont des fonctions **client-side**, pas un gate serveur ; (2) même en passant par l'UI, il suffit de recharger l'onglet entre les tentatives pour vider `loginAttemptsMap` ; (3) le compte ciblé peut être attaqué en brute force à un débit borné uniquement par le rate limit générique Supabase Auth (hors du contrôle de ce code applicatif — [NON VÉRIFIÉ, configuration du projet Supabase non consultée]) et par `apiRateLimiter` d'Express, qui **ne s'applique pas** à l'API Auth de Supabase (hébergée séparément, appelée en direct par le SDK client, jamais via `server.ts`).

**Correctif** : déplacer l'application du verrou côté serveur — soit un hook Supabase Auth (`before-user-created`/rate limit natif GoTrue si configurable), soit un endpoint Express de login qui fait office de proxy et applique le rate limit avant de relayer vers Supabase Auth ; ajouter un GRANT/policy `anon` restreint (SELECT/INSERT/UPDATE limité à sa propre ligne par email, pas de lecture des autres) si la persistance DB doit rester la source de vérité.

---

## C11 — En-têtes de sécurité et CORS

**Résultat global : configuration réelle et globalement solide, une faiblesse CSP notable.**

- **Helmet** monté avec CSP explicite (`server.ts:192-210`) : `default-src 'self'`, pas de wildcard. **Dupliqué** par un second jeu d'en-têtes manuel (`securityHeadersMiddleware`, `:103-128`) qui répète une CSP quasi identique + `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HSTS avec `preload`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive, `X-XSS-Protection: 0` (désactivation volontaire de l'ancien auditeur XSS des navigateurs — bonne pratique moderne, pas un défaut).
- **CORS** (`corsMiddleware`, `:133-158`) : liste blanche réelle via `ALLOWED_ORIGINS` (repli sur `localhost` uniquement si absente), rejet explicite 403 hors liste, `Access-Control-Allow-Credentials: true` correctement couplé à une origine reflétée **spécifique** (jamais `*` — la combinaison `*` + `credentials: true` aurait été une faille réelle, absente ici).

### C11-1 [MOYEN] — CSP `script-src` autorise `'unsafe-inline'` et `'unsafe-eval'`

**Preuve** : `server.ts:197` (Helmet) et `:109` (middleware manuel) — `scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]`. Ces deux directives désactivent la protection la plus utile de la CSP contre l'XSS : `'unsafe-inline'` autorise l'exécution de tout `<script>` inline ou attribut `on*` injecté, `'unsafe-eval'` autorise `eval()`/`new Function()`. Si une XSS apparaissait malgré l'absence actuelle de `dangerouslySetInnerHTML` (C12), cette CSP ne la bloquerait pas.

**Correctif** : migrer vers des nonces CSP par requête (`script-src 'self' 'nonce-<random>'`) — Vite/React supportent ce pattern avec un peu d'outillage de build ; retirer `'unsafe-eval'` si aucune dépendance ne l'exige réellement (à vérifier au cas par cas, certains outils de dev Vite l'utilisent mais ne devraient pas être nécessaires en production).

### C11-2 [FAIBLE] — Deux implémentations de la même CSP, maintenues séparément

**Preuve** : la CSP de Helmet (`:192-210`) et celle de `securityHeadersMiddleware` (`:103-128`) sont quasi identiques mais écrites deux fois, avec risque de divergence silencieuse si l'une est mise à jour sans l'autre. `res.setHeader('Content-Security-Policy', ...)` du middleware manuel s'exécute après Helmet dans l'ordre de montage (`securityHeadersMiddleware` ligne 211, après `helmet(...)` ligne 192-210) — la seconde valeur **écrase** la première, donc c'est en pratique la CSP manuelle qui s'applique, rendant la config Helmet CSP partiellement redondante/morte. Hygiène, pas une faille — **FAIBLE**.

**Correctif** : supprimer la CSP dupliquée de `securityHeadersMiddleware` et ne garder que celle configurée via Helmet (ou l'inverse), une seule source de vérité.

---

## C12 — XSS

**Résultat : propre.** `grep -rn "dangerouslySetInnerHTML"` sur tout `src/` → **0 résultat**. Aucun `innerHTML` direct ni `eval()` applicatif trouvé en dehors de la CSP elle-même (C11-1) qui l'autoriserait si un jour introduit. Les champs libres identifiés en Phase B/C comme vecteurs potentiels (`before_after_notes`, `fault.name`/`fault.required_intervention` de C4-2, notes mécanicien) sont rendus via JSX standard (`{variable}`), échappé par défaut par React — pas de contournement trouvé. **Pas de finding C12** — la seule exposition résiduelle est la CSP permissive de C11-1, qui n'aggrave pas une XSS existante (il n'y en a pas) mais n'offrirait aucune deuxième ligne de défense si une apparaissait.

---

## C13 — Rate limiting applicatif

**Correction par rapport à l'hypothèse de départ : le rate limiting N'EST PAS absent sur les 5 endpoints réels — il existe, globalement, mais avec des angles morts précis.**

- `app.use('/api', apiRateLimiter)` (`server.ts:216`) est monté **avant** tous les routers spécifiques (`vehicleRouter`, `maintenanceRouter`, `workOrderRouter`, `incidentRouter`, `pmSchedulesRouter` sont tous montés après, `:219-228`) — en Express, un `app.use` sur un préfixe s'applique à toutes les sous-routes montées après lui. **Les 5 endpoints réellement appelés par le frontend sont donc bien sous rate limit**, à 30 requêtes/minute/IP (`RATE_LIMIT_WINDOW_MS`/`MAX_REQUESTS_PER_WINDOW`, `server.ts:66-67`), partagé avec tout le reste de `/api/*`.
- `/api/predictive-ai` a en plus son propre `isRateLimited(clientIp)` dédié (`server.ts:248`, même fonction sous-jacente) — redondant avec le rate limit global sur ce chemin précis, pas un manque.

### C13-1 [MOYEN] — Le rate limiter est en mémoire locale, pas partagé entre instances

**Preuve** : `requestCounts = new Map<string, ...>()` (`server.ts:65`), variable de module Node — état local au process. Si l'application tourne derrière plusieurs instances/replicas (scaling horizontal, cas normal d'un déploiement de production malgré le `Dockerfile` actuel qui ne construit qu'une image mono-instance), chaque instance a son propre compteur : un attaquant répartissant ses requêtes sur plusieurs instances (via un load balancer round-robin, sans rien faire de spécial) multiplie effectivement la limite réelle par le nombre d'instances. Contraste avec le rate limiter du webhook télémétrie (C5), qui lui est **Redis-backed** (`RedisRateLimitStore`) et donc partagé — l'incohérence entre les deux mécanismes du même projet est elle-même un signal.

**Correctif** : migrer `apiRateLimiter` vers le même backend Redis que `RateLimiter`/`RedisRateLimitStore` déjà utilisé pour les webhooks, pour une limite cohérente à l'échelle de tout le déploiement.

### C13-2 [FAIBLE] — Aucun rate limit applicatif sur l'authentification Supabase elle-même

**Preuve** : `supabase.auth.signInWithPassword(...)` est appelé directement depuis le client vers l'infrastructure Auth hébergée de Supabase (`AuthModal.tsx` → `authService.ts:361`), **jamais via `server.ts`** — donc `apiRateLimiter` ne s'applique structurellement pas à ce flux, il est hors du périmètre de code que ce projet contrôle. Déjà noté comme composante du scénario C10-1. Un rate limit natif peut exister côté Supabase Auth (GoTrue) indépendamment de ce code — **[NON VÉRIFIÉ, configuration du projet Supabase non consultée, accès dashboard non disponible dans cet audit]**.

---

## SYNTHÈSE FINALE DES FINDINGS (C1–C13, grille de sévérité appliquée uniformément)

| Sévérité | Nombre | ID |
|---|---|---|
| **CRITIQUE** | 1 | C4-2 |
| **ÉLEVÉ** | 4 | C4-1, C4-3, C7-1, C10-1 |
| **MOYEN** | 9 | C2-2, C3-1, C4-4, C4-5, C5-1, C7-2, C8-1, C11-1, C13-1 |
| **FAIBLE** | 6 | C1-1, C2-1, C6-1, C9-1, C11-2, C13-2 |

*(C8-2 et C12 sont documentés dans leurs sections respectives comme vérifications propres — pas des findings à corriger, mais consignés pour montrer que ces surfaces ont été activement vérifiées, pas oubliées. Ils ne sont pas comptés dans le total ci-dessous.)*

**Total findings actionnables : 1 CRITIQUE + 4 ÉLEVÉ + 9 MOYEN + 6 FAIBLE = 20.**

---

*Fin de la Phase C (C1-C13). En attente de validation avant la Phase D.*
