# PHASE E — EXACTITUDE MÉTIER & FINANCIÈRE (NextTransit v2)

> **HEAD au moment de l'audit : `5e0e62f` (2026-08-18 16:54:32 +0100). Audit du WORKING TREE au 2026-08-20, pas de HEAD** — voir `audit/etat_audite.patch` / `audit/etat_audite.txt`. Lecture seule stricte.

---

## E1 — Provenance des constantes câblées en dur du CAE

Toutes situées dans `src/context/FleetContext.tsx:810-820`, à l'intérieur du `useMemo` qui calcule `caeItems`. Pour chacune : recherche exhaustive de tout commentaire justificatif, toute configuration par tenant, toute source documentée (`grep` sur `AGENTS.md`, `docs/`, les migrations, et le fichier lui-même).

| Constante | Valeur | Ligne | Configurable par tenant ? | Documentée/justifiée ? | Verdict |
|---|---|---|---|---|---|
| Coût pièce par défaut | `450` | `:810` | Non — constante littérale | Aucun commentaire, aucune mention dans `AGENTS.md`/`docs/` | **Arbitraire, non sourcée** |
| Coût main d'œuvre fixe | `+ 1400` | `:816` | Non | Aucun commentaire ; ne dépend ni de `labor_hours` ni d'un `hourly_rate` réel (contraste avec `DecisionEngine.evalRuleR4TotalCost`, qui lui prend `laborHours`/`hourlyRateDzd` en paramètres réels, `decisionEngine.ts:180-185`) | **Arbitraire, non sourcée, incohérente avec la Rule R4 du même produit** |
| `failureLikelihood` | `0.85` / `0.45` / `0.25` | `:819` | Non — table de correspondance fixe sur la sévérité du fault | Aucune référence à une donnée historique de pannes, un taux de défaillance observé, ou un modèle statistique | **Arbitraire** — présentée dans l'UI (`CaeBudgetPrioritization.tsx:151`) comme *« Statistical estimate »* alors qu'aucune statistique ne l'alimente |
| `classWeight` (Keystone/Standard) | `1.5` / `1.0` | `:820` | Non | Aucune justification trouvée du ratio 1.5× précisément (pourquoi pas 1.3× ou 2×) | **Arbitraire dans sa valeur précise**, bien que le principe (pondérer Keystone plus fort) soit cohérent avec le référentiel produit |
| `caeDelayMultipliers` (Keystone/Standard) | `2.2` / `1.4` (valeurs initiales, `:345-346`) | `:817` | **Oui, partiellement** — ajustable en direct via les sliders de `CaeBudgetPrioritization.tsx:190-230`, mais réinitialisé à `2.2`/`1.4` à chaque rechargement de page (état React local, non persisté en base ni par tenant) | Les bornes de slider (`1.0-3.5` Keystone, `1.0-2.5` Standard, `:198-199,219-220`) ne sont documentées nulle part sur leur origine | **Configurable en session, mais non persisté, non documenté, valeurs par défaut arbitraires** |

**Synthèse E1** : sur les 5 intrants qui composent la formule CAE, **aucun n'est réellement sourcé sur une donnée historique, un modèle statistique, ou une configuration par tenant persistée.** Le principal levier "configurable" (les multiplicateurs de délai) se réinitialise à chaque session. La formule elle-même (`rank_score = deferralCost/repairCost × classWeight × failureLikelihood`) est mathématiquement correcte et conforme au référentiel (confirmé Phase B), mais elle transforme 5 constantes arbitraires en un score qui a l'apparence d'un calcul de risque financier rigoureux.

---

## E2 — `confidence_score: 0.92` : un problème de véracité produit, pas seulement de code

**Preuve** : `src/services/predictiveAiService.ts:171`, dans `runLocalPredictiveRegression` (le chemin de repli déterministe, actif uniquement si `GEMINI_API_KEY` est absente ou l'appel Gemini échoue — Phase C a vérifié par exécution réelle que ce n'est **pas** le chemin actif dans cet environnement, la clé étant configurée et fonctionnelle). La fonction retourne un objet `PredictiveAiResult` dont le champ `confidence_score` est **une constante littérale `0.92`**, identique quel que soit le véhicule, quels que soient les capteurs en anomalie, quel que soit le nombre de règles `if` déclenchées dans la fonction.

**Pourquoi c'est plus grave qu'un simple "MOCK" de plus** : dans tout le reste de l'audit, les valeurs mockées (constantes CAE de E1, `budget_for_category` fabriqué) sont des **intrants de calcul** — un utilisateur attentif peut, en théorie, remonter la chaîne et voir que ce sont des paramètres. Un `confidence_score` est différent par nature : c'est une **méta-donnée sur la fiabilité du résultat lui-même**, affichée à l'utilisateur comme si elle mesurait la confiance du système dans sa propre prédiction. Un chiffre de confiance inventé, présenté comme la sortie d'un modèle, sur un produit dont le nom même de la fonctionnalité est *« Analyse IA Prédictive »* (`predictiveAiService.ts:16`, `TelemetryStream.tsx:904`), n'est pas une approximation technique — c'est une allégation fausse sur la nature du système à l'utilisateur final, qui pourrait raisonnablement fonder une décision de maintenance sur ce chiffre en croyant qu'il reflète une évaluation réelle.

**Comparaison utile** : quand le chemin Gemini réel s'exécute (vérifié par appel réel en Phase C), le `confidence_score` retourné par le modèle **varie** (exemple obtenu en test : `0.89`) — donc le produit **sait** produire un score de confiance non constant dans son chemin principal ; c'est spécifiquement le chemin de repli qui triche sur ce point précis, probablement parce qu'il fallait bien remplir le champ du même type de réponse et qu'aucune vraie mesure de confiance n'existe pour une cascade de règles `if/else`.

**Correctif** : soit calculer une confiance dérivée du nombre/de la sévérité des règles déclenchées dans le fallback (au moins une variable, même simple), soit renommer le champ dans ce chemin précis (`confidence_score: null` ou un champ distinct `is_heuristic_fallback: true`) pour que l'UI puisse afficher honnêtement « estimation par règles, pas par IA » plutôt que de faire passer les deux chemins pour équivalents.

---

## E3 — Recalcul à la main, véhicule réel, comparé à l'affichage

### E3.1 — Rank score CAE, véhicule NX-024-TR

Déjà entièrement calculé en `audit/03_ARCHITECTURE_QUALITE.md` §D1.3 (réutilisé ici, pas recalculé une seconde fois pour éviter toute divergence entre les deux documents) : pour le véhicule **NX-024-TR** (`seedData.ts:531-555`, Keystone, Critical, fault `P0299` avec `required_part_id: TURBO-SENS-01` à `850` (`seedData.ts:477`)) :

```
repairCost   = 850 (pièce réelle en stock) + 1400 (labor fixe) = 2250
delayMult    = 2.2 (Keystone)
deferralCost = round(2250 × 2.2) = 4950
failureLikelihood = 0.85 (Critical)
classWeight  = 1.5 (Keystone)
rank_score   = (4950 / 2250) × 1.5 × 0.85 = 2.2 × 1.5 × 0.85 = 2.805
```

**Résultat de l'arithmétique manuelle : `2.805`. C'est exactement la valeur que `Number(...toFixed(3))` (`FleetContext.tsx:821`) produirait — aucun écart entre le calcul manuel et ce que le code produirait pour cet intrant.** Le code ne fait donc pas d'erreur arithmétique sur son propre calcul ; le problème établi en E1 est en amont (les intrants sont arbitraires), pas dans l'exécution de la formule elle-même.

### E3.2 — Variance budgétaire, catégorie « Corrective Repair »

Données réelles de seed (`src/data/seedData.ts`, section `INITIAL_COST_RECORDS`) :

| ID | Véhicule | Montant réel | Budget catégorie |
|---|---|---|---|
| CR-201 | NX-024-TR | 18 400 | 16 000 |
| CR-202 | NX-015-CH | 15 800 | 13 500 |
| CR-203 | NX-088-EX | 9 500 | 8 500 |

**Implémentation B — `VarianceDashboard.tsx:50-60`, réellement affichée à l'écran CostGuard :**
```
actual (agrégat catégorie) = 18400 + 15800 + 9500 = 43 700
budget (agrégat catégorie) = 16000 + 13500 + 8500 = 38 000
variance affichée          = actual − budget = 43 700 − 38 000 = 5 700
```
**→ L'écran affiche un delta brut en devise : « +5 700 [symbole devise du tenant] », sans pourcentage, sans seuil, sans indicateur de sévérité.**

**Implémentation A — `DecisionEngine.evalRuleR7BudgetVariance`, `decisionEngine.ts:275-300`, jamais appelée en production (D1) — appliquée ici au même agrégat pour comparaison directe :**
```
variancePercentage = round(((43700 − 38000) / 38000) × 1000) / 10
                    = round((5700/38000) × 1000) / 10
                    = round(150.0) / 10
                    = 15.0 %
triggerAuditFlag   = |15.0| > 10.0  →  TRUE
```
**→ Cette implémentation, si elle pilotait l'écran, afficherait « +15,0 % — AUDIT DÉCLENCHÉ », un signal actionnable, absent de ce que l'utilisateur voit réellement.**

**Confirmation indépendante que 15% est la bonne lecture métier de cette situation** : le commentaire du code source lui-même, sur l'enregistrement `CR-201` (`seedData.ts`, ligne du champ `amount: 18400`), dit littéralement `// Budget variance +15%` — calculé isolément sur ce seul enregistrement : `(18400−16000)/16000 × 100 = 15,0 %` exactement. **Les auteurs du jeu de données de démonstration ont donc conçu ce cas précisément pour illustrer un dépassement de 15%, un chiffre que seule l'implémentation A (jamais appelée) sait produire — l'écran réellement affiché aux utilisateurs ne restitue jamais ce signal, ni au niveau de l'enregistrement individuel ni à l'agrégat catégorie**, alors qu'il donne mathématiquement le même 15,0% à l'agrégat qu'au cas individuel dans cet exemple précis.

---

## E4 — Recherche de float sur montants monétaires, divisions par zéro, incohérences d'unités

### E4-1 — Deux fabrications indépendantes et incohérentes d'un budget carburant

**Preuve** : `src/context/FleetContext.tsx:251` — `budget_for_category: Math.round(newLog.cost * 0.9)` (multiplicateur **×0,9**), appliqué à la création d'un nouveau `cost_record` de type carburant. **Mais** `src/components/screens/VarianceDashboard.tsx:44` — `budget_for_category: log.cost * 0.85` (multiplicateur **×0,85**, avec le commentaire explicite `// Introduce some variance`), appliqué au moment de l'affichage pour les logs carburant lus directement depuis `fuelLogs` (pas via `costRecords`). **Deux endroits différents du même produit inventent, à la volée, deux budgets différents pour le même concept (coût carburant réel × un facteur), avec deux facteurs différents (0,9 vs 0,85), sans qu'aucun des deux ne soit une donnée réelle.** Un même trajet carburant peut donc apparaître avec un "budget" différent selon l'écran qui le lit.

### E4-2 — Import CSV carburant : `parseFloat` sans validation, propagation de `NaN` possible

**Preuve** : `src/components/screens/FuelModule.tsx:64-65` — `parseFloat(row.Liters || row.liters)`, `parseFloat(row.Cost || row.cost)`, lors d'un import CSV, sans vérification `isNaN()` avant utilisation ni avant insertion. Une cellule CSV vide, mal formatée, ou contenant un séparateur décimal `,` au lieu de `.` (plausible pour un produit ciblant un marché francophone/algérien) produirait `NaN`, qui se propagerait silencieusement dans tout agrégat en aval (`NaN + n = NaN` — un seul enregistrement corrompu peut invalider une somme entière de catégorie dans `VarianceDashboard.tsx` sans message d'erreur visible, le rendu React affichant simplement `NaN` ou une chaîne vide selon le formatage).

**Correctif** : valider chaque valeur numérique importée (`isNaN`, borne de plausibilité) avant insertion, rejeter ou signaler la ligne en erreur plutôt que de l'insérer silencieusement.

### E4-3 — Incohérence d'unité/devise : les constantes CAE ignorent la devise du tenant

**Preuve** : `TenantConfig`/`Tenant` (`src/types/tenant.ts:79`) déclare `currency: string` — un champ générique, confirmant que le produit **supporte réellement plusieurs devises par tenant** (cohérent avec un marché algérien où la devise attendue est le Dinar, DZD). L'UI de `CaeBudgetPrioritization.tsx` préfixe dynamiquement tous les montants du `currencySymbol` du tenant actif (`activeTenant?.currencySymbol || '$'`, plusieurs occurrences). **Mais** les constantes qui produisent ces montants (`450`, `1400`, `FleetContext.tsx:810-816`) sont des nombres bruts, sans dimension de devise, identiques pour tous les tenants quelle que soit leur devise configurée. **Conséquence concrète** : un tenant configuré en DZD verrait un `repair_cost` affiché comme « 2 250 DZD » (environ 15-16 USD au taux de change courant) pour exactement la même pièce et la même opération qu'un tenant configuré en USD verrait affichée « $2,250 » (2250 USD) — un facteur d'écart d'environ ×140 sur la signification réelle du même chiffre, uniquement parce que la constante est réutilisée telle quelle à travers les devises sans conversion ni configuration par tenant.

**Correctif** : soit stocker ces constantes par tenant dans la devise locale (cohérent avec le fait que `caeDelayMultipliers` est déjà partiellement configurable en session), soit les exprimer dans une devise pivot avec conversion explicite au moment de l'affichage — mais pas les traiter comme des nombres sans dimension pendant que l'UI les habille d'un symbole de devise qui change leur signification réelle.

### E4-4 — Division par zéro : gérée dans l'implémentation non utilisée, non pertinente dans celle qui est affichée

**Preuve** : `DecisionEngine.evalRuleR7BudgetVariance` (`decisionEngine.ts:280-288`) contient une garde explicite `if (projectedBudget <= 0) { return { variancePercentage: 0, triggerAuditFlag: actualSpend > 0 } }` avant la division — bien construite. `VarianceDashboard.tsx:50-60` ne divise jamais (elle calcule un delta soustractif, pas un ratio), donc n'a structurellement pas besoin de cette garde — pas un risque actif aujourd'hui. Pour le CAE (`FleetContext.tsx:821`), `repairCost` est le dénominateur de `deferralCost / repairCost` ; avec la formule actuelle (`partsCost` par défaut `450`, jamais `0`, `+ 1400` fixe), `repairCost` ne peut mathématiquement jamais atteindre `0` dans le code tel qu'écrit aujourd'hui — **pas un risque actif**, mais fragile : si `450`/`1400` étaient un jour rendus configurables par tenant (E1 recommande justement cette évolution) sans re-valider qu'ils restent `> 0`, une configuration à `0` producirait un `rank_score` de `Infinity`/`NaN` qui casserait le tri (`items.sort((a,b) => b.rank_score - a.rank_score)`, `FleetContext.tsx:840`) de tout l'écran CAE, pas seulement de l'élément concerné.

**Correctif préventif** : si E1 est mis en œuvre (constantes configurables par tenant), ajouter une validation `> 0` explicite sur `repairCost` avant la division, dès maintenant plutôt qu'après l'introduction de la configurabilité.

---

*Fin de la Phase E. Fin du cycle d'audit demandé (Phases A-E). En attente de validation finale.*
