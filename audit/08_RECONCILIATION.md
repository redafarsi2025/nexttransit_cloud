# RÉCONCILIATION — SCHÉMA LOCAL vs SCHÉMA DÉPLOYÉ (Phase 0)

> Rédigé le 2026-08-20, mis à jour le même jour après obtention de l'accès production. HEAD au
> commit `23b6e9e` (tag `audit-baseline`).

## 0. MISE À JOUR MAJEURE — l'accès production a été obtenu, et change le diagnostic

> Après deux mots de passe rejetés (voir Phase C de l'audit), un troisième — généré via le bouton
> *Reset database password* du dashboard, pas saisi à la main — a fonctionné. Connexion directe
> réussie (`db.fzmoaxywccqcetxgedze.supabase.co:5432`, confirmé par `SELECT current_database()`).
>
> **Ce que ça révèle n'est pas ce qui était anticipé.** Ce n'était pas une question de GRANTs
> manquants ou d'un nom de table isolé mal orthographié. **Le schéma en production et l'historique
> de migrations versionné dans ce dépôt ont divergé au point de représenter presque deux lignées
> de schéma différentes** :
>
> - La production a une table `incidents` (0 ligne) avec un schéma simple et ancien
>   (`id, tenant_id, vehicle_id, description, severity, status, created_at`). La table
>   `driver_incidents`, créée par les migrations locales et censée être la version actuelle,
>   **n'existe pas du tout en production**.
> - La production a `audit_logs` (pluriel, 0 ligne). La table `audit_log` (singulier) — celle que
>   **tout le code applicatif utilise** (`server.ts`, `workOrders.ts`, `incidents.ts`,
>   `maintenance.ts`, tous écrivent sur `.from('audit_log')`) — **n'existe pas en production**.
> - La production contient des tables absentes de tout l'historique de migrations local :
>   `business_glossary`, `tenant_configs`, `tenant_invitations`, `translation_memory`,
>   `translations`. Le local a `translation_cache` à la place de `translation_memory`/`translations`,
>   et pas de `tenant_configs`/`tenant_invitations` du tout.
> - `pm_schedule_rules` et `demo_seed_snapshot` n'existent pas en production — cohérent avec le
>   fait que ce sont des migrations récentes, jamais poussées.
> - **Toutes les tables RLS en production sont à `rls=true`, sans exception (0 table manquante)**
>   — meilleur que le stack local sur ce point précis, mais logique : `demo_seed_snapshot`, la
>   seule table locale sans RLS, n'existe même pas en production.
> - **Les GRANTs `SELECT/INSERT/UPDATE/DELETE` pour `anon`/`authenticated` sur `work_orders`,
>   `fleet_alerts`, `inventory_items` existent bel et bien en production**, confirmant
>   l'hypothèse de la Décision 2 : ce sont des privilèges réels, mais absents de tout historique
>   de migration versionné — donc non reproductibles, non documentés, non revus.
> - **Signal le plus important pour la suite** : `vehicles`, `work_orders`, `incidents`,
>   `audit_logs` sont tous à **0 ligne**. Seule `tenants` a des données (**10 lignes**). Cette base
>   de production ne contient aucune donnée opérationnelle réelle — seulement des inscriptions de
>   tenants. Ce n'est pas un système en production avec des données client à préserver à tout
>   prix ; c'est une base largement vide, sur un schéma ancien, jamais resynchronisée.
>
> **Conséquence directe sur le correctif déjà appliqué en 0.2 de cette passe** (`src/api/incidents.ts`,
> `'incidents'` → `'driver_incidents'`) : ce correctif alignait le code sur le schéma **local/versionné**
> (la direction que le projet a manifestement prise, migrations à l'appui), mais **casse la
> compatibilité avec ce qui est réellement déployé aujourd'hui** — `driver_incidents` n'existe pas
> en production, donc cet appel échouerait aussi contre l'environnement réel actuel, différemment
> qu'avant mais tout aussi cassé. **Je n'ai pas défait ce correctif** : au vu de l'absence de
> données réelles en production et du sens clair de l'évolution du schéma (migrations locales),
> revenir à `'incidents'` referait la même erreur dans l'autre sens. Mais c'est une décision de
> stratégie de déploiement, pas un correctif de code isolé — voir §5 ci-dessous pour les options,
> **aucune n'a été exécutée**, en attente de votre arbitrage.
>
> Méthode pour la colonne « Local » : stack Supabase CLI local (`supabase start`, Postgres Docker
> sur `127.0.0.1:54322`), reconstruit à partir de **tous** les fichiers de `supabase/migrations/`
> tels que committés dans `23b6e9e` (y compris les 6 migrations qui étaient non versionnées avant
> ce commit), via `supabase db reset`. Toutes les requêtes ci-dessous exécutées réellement contre
> ce stack via `scripts/diag/compare-schemas.cjs` (committé, réutilisable à chaque migration
> future), sorties collées telles quelles.

---

## 1. Correction de méthode par rapport à la première hypothèse

En validant la CI réelle (Phase 0.8 du roadmap), deux échecs sont apparus dans les tests SQL RLS.
Le réflexe initial (corriger les tests pour les faire passer) a été refusé à raison : un test qui
échoue est présumé avoir raison tant qu'il n'est pas prouvé qu'il se trompe. Voici ce que l'exécution
réelle a établi, table par table, pas par supposition :

- **`rls-isolation-test.sql` rapportait « 1 table(s) missing active RLS! »**. Ce n'était **pas**
  `demo_seed_snapshot` (l'hypothèse initialement avancée) — cette table n'est même pas dans la
  liste de 11 tables que ce test vérifie. La requête exhaustive (§2 ci-dessous, pas limitée aux
  11 tables du test) montre que `demo_seed_snapshot` est bien la seule table sans RLS activée du
  schéma entier — un vrai gap, confirmé par exécution, cohérent avec `02_SECURITE.md` C2-1 — mais
  ce n'est **pas** ce que ce test particulier détectait. La cause réelle du « 1 manquante » : le
  test référence une table `public.incidents`, qui **n'existe pas** (`grep`/exécution confirmés) —
  la vraie table est `driver_incidents`. `SELECT relrowsecurity INTO ... WHERE relname='incidents'`
  ne trouve aucune ligne, la variable reste `NULL`, traité comme faux par le `IF`, comptabilisé
  comme « non protégé ». **Conclusion : deux problèmes réels et indépendants, pas un seul** — le
  gap RLS sur `demo_seed_snapshot` (corrigé, voir §3), et le bug de nommage du test qui l'empêchait
  de jamais avoir vérifié `driver_incidents` (corrigé aussi, voir §3).
- **`rls-role-based-policies-test.sql` rapportait « permission denied for table work_orders »**.
  Le fichier crée ses propres utilisateurs de test et leur accorde `GRANT ALL PRIVILEGES` en ligne
  13 — mais bascule ensuite en `SET LOCAL ROLE authenticated` (ligne 21), qui exécute la suite
  **en tant que rôle `authenticated` lui-même**, pas en tant que l'utilisateur de test. Les
  privilèges accordés à `test_fleet_manager`/`test_mechanic`/`test_driver` ne s'appliquent donc
  plus. Vérifié par exécution (§2, point 3) : le rôle **`authenticated` n'a, localement, aucun
  GRANT `SELECT`/`INSERT`/`UPDATE`/`DELETE`** sur `work_orders`, `fleet_alerts`, `inventory_items`
  — seulement `REFERENCES`/`TRIGGER`/`TRUNCATE`. `rls-isolation-test.sql` échoue maintenant pour
  la même raison exacte sur `vehicles` (ligne 88-90, même mécanisme `SET LOCAL ROLE authenticated`
  suivi d'un `SELECT`). **Recherche exhaustive dans toutes les migrations versionnées** :
  `grep -rn "GRANT.*work_orders\|GRANT.*fleet_alerts\|GRANT.*inventory_items\|GRANT.*ON ALL TABLES" supabase/migrations/*.sql`
  → **0 résultat**. Aucune migration versionnée n'accorde jamais ces privilèges. Or l'application
  fonctionne bien en pratique contre le projet hébergé (tous les faits établis dans les Phases A-F
  de l'audit le confirment). **Conclusion probable, à confirmer par la comparaison Production
  ci-dessous** : le projet hébergé porte des GRANTs `anon`/`authenticated` sur ces tables qui ne
  sont dans aucune migration versionnée — soit accordés manuellement, soit hérités d'un
  comportement d'exposition automatique plus ancien de Supabase (voir `supabase/config.toml`,
  commentaire sur `auto_expose_new_tables`, qui documente précisément ce changement de défaut).
  **Aucun GRANT n'a été ajouté localement pour faire passer ces tests** — ce serait aligner le
  local sur une production potentiellement trop permissive sans l'avoir vérifié.

---

## 2. Sorties brutes des diagnostics locaux (`scripts/diag/compare-schemas.cjs`)

### RLS par table (schéma local, post-reconciliation — après le correctif §3)

```
demo_seed_snapshot                  rls=true   (corrigé — voir §3, était rls=false)
[toutes les 41 autres tables]       rls=true
```

Avant correctif, seule `demo_seed_snapshot` était `rls=false` — confirmé sur les 42 tables du
schéma local, pas seulement les 11 couvertes par `rls-isolation-test.sql`.

### Correspondance nom de table attendu par les tests vs table réelle

| Nom vérifié par les tests | Existe ? |
|---|---|
| `incidents` | **NON** |
| `driver_incidents` | Oui |
| `audit_log` | Oui |
| `audit_logs` | Oui — **les deux existent**, ce ne sont pas des noms concurrents pour la même table. Non investigué plus loin dans cette passe (hors périmètre de la réconciliation RLS/GRANTs), mais à clarifier : deux tables d'audit distinctes suggèrent soit une migration historique jamais nettoyée, soit deux usages réellement différents — à trancher séparément. |

### GRANTs `anon`/`authenticated` sur `work_orders`, `fleet_alerts`, `inventory_items` (LOCAL)

```
fleet_alerts         anon            REFERENCES
fleet_alerts         anon            TRIGGER
fleet_alerts         anon            TRUNCATE
fleet_alerts         authenticated   REFERENCES
fleet_alerts         authenticated   TRIGGER
fleet_alerts         authenticated   TRUNCATE
inventory_items      anon            REFERENCES
inventory_items      anon            TRIGGER
inventory_items      anon            TRUNCATE
inventory_items      authenticated   REFERENCES
inventory_items      authenticated   TRIGGER
inventory_items      authenticated   TRUNCATE
work_orders          anon            REFERENCES
work_orders          anon            TRIGGER
work_orders          anon            TRUNCATE
work_orders          authenticated   REFERENCES
work_orders          authenticated   TRIGGER
work_orders          authenticated   TRUNCATE
```

**Aucun `SELECT`/`INSERT`/`UPDATE`/`DELETE`** — ces privilèges (REFERENCES/TRIGGER/TRUNCATE) sont
insuffisants pour qu'un client PostgREST authentifié lise ou écrive quoi que ce soit sur ces
tables, quelles que soient les policies RLS définies dessus (RLS filtre les lignes visibles *une
fois* que le privilège de base existe — elle ne remplace pas le GRANT).

### Existence des tables PM Schedules (LOCAL, après `db reset` complet)

```
pm_vehicle_subscriptions       EXISTS
pm_schedule_rules              EXISTS
pm_evaluation_events           EXISTS
```

Les trois existent localement une fois toutes les migrations rejouées depuis zéro — un premier
passage avait rapporté `pm_schedule_rules` absente, ce qui s'est révélé être un état transitoire
du stack local (résolu par un second `db reset` complet), pas une vraie absence.

---

## 3. Tableau de réconciliation (mis à jour avec les données production réelles)

| Objet | Local | Production | Écart | Décision |
|---|---|---|---|---|
| RLS sur `demo_seed_snapshot` | **Corrigée** — migration `20260824000000_demo_seed_snapshot_rls.sql`, policy `service_role` uniquement | **N/A — la table n'existe pas en production** | La table elle-même n'a jamais été poussée | Le correctif local reste valable pour le jour où cette migration serait poussée ; sans objet tant qu'elle ne l'est pas. |
| `incidents` vs `driver_incidents` | `incidents` **n'existe pas**, `driver_incidents` existe (schéma récent : `vehicle_plate`, `reported_by`, `category` enum, `matched_to_fault`, `related_fault_code`, `status`) | **`incidents` existe (0 ligne), `driver_incidents` n'existe pas.** Schéma ancien et plus simple : `id, tenant_id, vehicle_id, description, severity, status, created_at`. | **Divergence de fond, pas un problème de nom.** Deux schémas de table réellement différents pour le même concept — production n'a jamais reçu la refonte locale. | **Non tranché — voir §5.** Le correctif de code de la Phase 0 (`incidents.ts` → `driver_incidents`) suit la direction locale mais ne fonctionnerait pas contre la production telle qu'elle est aujourd'hui. |
| `audit_log` (singulier) vs `audit_logs` (pluriel) | Les deux existent localement (RLS activée sur les deux, jamais clarifié lequel est le vestige) | **Seule `audit_logs` (pluriel) existe.** `audit_log` (singulier) — celle que tout le code applicatif utilise — **n'existe pas en production.** | **Toutes les écritures d'audit log du code applicatif échouent probablement contre la production**, silencieusement pour la plupart des call sites (les inserts `audit_log` ne sont pas tous suivis d'une vérification d'erreur). | **Nouveau finding, sévérité à évaluer en Phase C-bis** — une piste d'audit qui échoue silencieusement en production est dans la même famille que C4-2 (falsification/perte de la piste d'audit), à traiter avec le même sérieux. |
| GRANTs `SELECT/INSERT/UPDATE/DELETE` pour `anon`/`authenticated` sur `work_orders`/`fleet_alerts`/`inventory_items` | **Absents** de toute migration versionnée, confirmé par `grep` exhaustif et par exécution locale | **Présents** — `SELECT/INSERT/UPDATE/DELETE` tous accordés à `anon` et `authenticated` sur les 3 tables | **Confirmé : privilège réel en production, non versionné, non reproductible.** Hérité soit d'une action manuelle passée, soit d'un ancien comportement d'auto-exposition Supabase (voir `supabase/config.toml`). | Écrire une migration versionnée qui rend ce GRANT explicite, pour que le prochain environnement reconstruit depuis les migrations (local ou un futur redéploiement) fonctionne sans dépendre d'un état historique non documenté. |
| `pm_vehicle_subscriptions`, `pm_schedule_rules`, `pm_evaluation_events` | Existent localement après `db reset` complet | **`pm_vehicle_subscriptions` et `pm_evaluation_events` existent (probablement créées par une migration antérieure à la refonte) ; `pm_schedule_rules` n'existe pas.** | Le module PM Schedules est partiellement déployé, incomplet, cohérent avec son statut [COQUILLE] (Phase B de l'audit) et avec la décision de le sortir du périmètre pilote. | Confirme la décision déjà prise (§6 du plan Phase 0) — le module reste hors pilote. |
| Tables présentes en production, absentes de tout l'historique de migrations local | — | `business_glossary`, `tenant_configs`, `tenant_invitations`, `translation_memory`, `translations` | **La production porte des objets de schéma dont ce dépôt ne garde aucune trace.** Soit créés manuellement, soit issus d'un schéma antérieur au premier commit versionné de ce projet. | À inventorier avant toute décision de type `db push` destructif — voir §5. |
| Volume de données réelles en production | — | `vehicles`: 0, `work_orders`: 0, `incidents`: 0, `audit_logs`: 0, `tenants`: 10 | **Aucune donnée opérationnelle réelle.** Seulement des inscriptions de tenants. | Change fondamentalement le risque de toute action de réconciliation — voir §5. |
| Les 6 migrations non versionnées identifiées en Phase A + `20260823000000_pm_schedule_rules.sql` | **Committées** dans `23b6e9e` (tag `audit-baseline`) | **Non poussées** — aucune des tables qu'elles créent (`pm_schedule_rules`, `demo_seed_snapshot`, etc.) n'existe en production | Confirmé : la production est en retard sur le local, pas seulement différente | Dépend de l'arbitrage §5 |
| `database.types.ts` | Régénéré depuis le schéma local (Décision 3) | **Décrit des tables/colonnes qui n'existent pas en production** (`driver_incidents`, `pm_schedule_rules`, etc.) | Confirmé, pas hypothétique | Provisoire tant que §5 n'est pas tranché — les types ne décrivent aujourd'hui ni le local à l'identique de la production, ni la production réelle |

---

## 5. Décision stratégique requise — non tranchée, pas exécutée

Trois options, par ordre de risque croissant pour les données existantes (qui sont, il faut le
noter, quasi inexistantes — voir tableau ci-dessus) :

**A. Pousser le schéma local vers la production (`supabase db push`)** — aligne la production sur
la direction que le projet a manifestement prise. `db push` n'exécute que des migrations
`CREATE TABLE IF NOT EXISTS`/`ALTER TABLE` additives par défaut ; il ne supprime pas
`incidents`/`audit_logs`/`business_glossary`/`tenant_configs`/`tenant_invitations`/
`translation_memory`/`translations` de lui-même — ces tables resteraient en production, orphelines
du code applicatif, jusqu'à un nettoyage explicite. Risque de perte de données : quasi nul (0 ligne
sur les tables concernées, sauf `tenants` qui n'est pas touchée par cette divergence).

**B. Faire évoluer le code applicatif pour qu'il fonctionne contre le schéma production actuel**
(revenir à `incidents`, écrire sur `audit_logs` au pluriel) — cohérent avec « ne pas casser ce qui
est déployé », mais fige le produit sur un schéma que le projet a lui-même dépassé dans ses
migrations locales (le schéma `driver_incidents` est manifestement plus riche et plus récent).

**C. Reconstruire la base de production proprement depuis zéro** (base neuve, migrations locales
rejouées à l'identique du stack local) — le plus radical, mais défendable étant donné l'absence de
données réelles à préserver ; élimine d'un coup toute la dette de schéma non documentée
(`business_glossary` et consorts) plutôt que de la faire cohabiter indéfiniment avec le nouveau
schéma.

**Aucune de ces trois options n'a été exécutée.** C'est une décision de stratégie de déploiement,
pas un correctif technique isolé, et elle a des implications (les 10 lignes de `tenants` existantes
seraient concernées différemment selon l'option) qui dépassent le périmètre de ce que cette passe
devait trancher seule.

---

*Document de réconciliation Phase 0 — angle mort RLS de la Phase C de l'audit maintenant fermé
(§0), mais une décision de stratégie de déploiement plus large est ouverte (§5).*
