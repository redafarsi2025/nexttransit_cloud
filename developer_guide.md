# NextTransit — Developer & Operational Onboarding Guide
**Dernière vérification contre le code réel : 11 août 2026 (branche `main`)**
**Statut : sections 1-3 et 5 vérifiées exactes. Section 4 corrigée (contradiction avec le rôle par défaut réel).**

---

## 0. État des chantiers — À lire en premier

| Sujet | État réel du code | Prompt de correction |
|---|---|---|
| Rôle par défaut à l'inscription | ✅ `TENANT_ADMIN` (corrigé) | `PROMPT_ROLE_TENANT_ADMIN.md` — appliqué |
| Auto-réparation du provisioning bloqué | ❌ Pas encore implémentée — un compte `tenant_id = NULL` reste bloqué sans action manuelle | `PROMPT_FIX_PROVISIONNEMENT_BLOQUE.md` — spécifié, pas encore exécuté |
| Dérive de schéma `companies.tenant_id`/`billing_email` NOT NULL | ❌ Bloquant actif — `register_new_tenant()` échoue en production sur ces colonnes non gérées par le code | `PROMPT_FIX_DERIVE_SCHEMA_COMPANIES.md` — diagnostic en cours, en attente du résultat sur `tenants` |
| `platformDbService.ts` sur mock JSON | ❌ Toujours un fichier `platform_db.json`, pas la table SQL `platform_admins` | Chantier non prompté formellement — à faire |
| Dossier légal/fiscal algérien (NIF, RC, CNAS, établissements) | ⏳ Architecture spécifiée, migrations pas encore appliquées | `PROMPT_...ALGERIAN_DOSSIER` + addendum de verrouillage — en attente de la Phase A (audit) |

**Règle pour ce document : à chaque prompt exécuté avec succès sur le repo, mettre à jour ce tableau avant de considérer le chantier terminé.** Un guide qui décrit un état obsolète du code est pire qu'aucun guide.

---

## 1. Real Telematics Device Onboarding (Teltonika & Flespi / Wialon)

NextTransit provides a vendor-agnostic telematics architecture that decouples live hardware streams from the R1-R7 Decision Engine.

### 1.1 Flespi Gateway Setup
1. Log in to [Flespi Platform](https://flespi.io).
2. Create an **API Token** with Master or Read-Only permissions on Telemetry Streams. Set this token in `.env` as `FLESPI_API_TOKEN`.
3. Register your Teltonika FM/FMM telematics devices under Flespi Channels / Devices using their hardware IMEI number.

### 1.2 Webhook Configuration
1. In Flespi (or Wialon), set up an HTTP Stream / Webhook pointing to:
   ```http
   POST https://<your-nexttransit-domain>/api/telemetry/webhook
   ```
2. Configure HTTP Header:
   ```http
   Authorization: <FLESPI_WEBHOOK_SECRET>
   ```
3. Ensure `.env` contains `FLESPI_WEBHOOK_SECRET=<your_shared_webhook_secret_here>`. Any request without a matching secret will be rejected with `401 Unauthorized`.

*Vérifié : le endpoint existe dans `server.ts` (ligne ~373) et lit bien `FLESPI_WEBHOOK_SECRET` depuis l'environnement.*

### 1.3 Device Mapping in NextTransit
To map an incoming hardware device to a specific NextTransit vehicle:
1. Open **Configuration Espace Entreprise** → **Telematics & Devices**.
2. Select the vehicle, set Telematics Adapter to `Flespi / Wialon Middleware` or `Teltonika FM/FMM Series`.
3. Enter the `external_device_id` (Flespi Unit ID or IMEI number).
4. Or insert a row directly:
   ```sql
   INSERT INTO public.device_mappings (tenant_id, vehicle_id, provider, external_device_id)
   VALUES ('<your_tenant_id>', 'V-024', 'flespi_wialon', 'TEL-864201049281002');
   ```
   Le champ `provider` accepte exclusivement `'teltonika'`, `'flespi_wialon'`, ou `'manual'` (contrainte `CHECK` en base) — toute autre valeur sera rejetée.

---

## 2. Historical OBD / CAN Bus Batch Import & Replay Engine

When live hardware boxes are not yet installed, NextTransit supports historical offline batch imports for commercial pilots (e.g. Numilog).

### 2.1 File Formats (V1 Spec)

Le parser accepte `.csv` ou `.json`. Champs reconnus par `importer.ts` (liste complète, corrigée — la version précédente de ce guide omettait `external_device_id` et `heading_deg`) :

```
timestamp        (obligatoire, ISO 8601)
vehicle_id       (obligatoire)
external_device_id (optionnel)
latitude, longitude (optionnel)
speed_kmh        (optionnel)
heading_deg      (optionnel)
spn, fmi         (optionnel — codes J1939)
dtc_code         (optionnel — alias accepté : "dtc")
severity         (optionnel)
actual_spend, projected_budget (optionnel — pour le rapport de variance R7)
```

#### CSV Header Format:
```csv
timestamp,vehicle_id,latitude,longitude,speed_kmh,heading_deg,spn,fmi,dtc_code,severity,actual_spend,projected_budget
2026-08-01T10:00:00Z,V-024,36.7538,3.0588,72,180,110,0,,Critical,,
2026-08-01T11:30:00Z,V-024,36.7800,3.0900,65,95,,,,P0300,Warning,,
```

#### JSON Format:
```json
[
  {
    "timestamp": "2026-08-01T10:00:00Z",
    "vehicle_id": "V-024",
    "latitude": 36.7538,
    "longitude": 3.0588,
    "speed_kmh": 72,
    "spn": 110,
    "fmi": 0
  }
]
```

### 2.2 Running Historical Batch Imports
```bash
npx tsx scripts/import-historical-telemetry/importer.ts path/to/historical_telemetry.csv
```

### 2.3 Generating Retroactive Replay Audit Reports
Pour évaluer des données historiques via le moteur de décision R1-R7 **sans** altérer le statut véhicule ou les affectations de dispatch en cours :
```typescript
import { parseHistoricalTelemetryFile } from './scripts/import-historical-telemetry/importer';
import { generateRetroactiveReplayReport } from './scripts/import-historical-telemetry/replayReportGenerator';

const { validRecords, ignoredRecords } = parseHistoricalTelemetryFile('path/to/telemetry.csv');
const report = generateRetroactiveReplayReport(validRecords, ignoredRecords.length);

console.log(JSON.stringify(report, null, 2));
```

---

## 3. SAE J1939 Heavy-Duty Diagnostic Fault Code Reference

*Vérifié ligne par ligne contre `src/services/j1939MappingService.ts` — table exacte.*

| SPN | Parameter Description | FMI | Severity | NextTransit Action |
|:---|:---|:---|:---|:---|
| **110** | Engine Coolant Temp | 0 | **Critical** | Triggers Rule R1 Emergency Stop (`P0217`) |
| **110** | Engine Coolant Temp | 15 | Warning | High Temperature Warning |
| **190** | Engine Speed (RPM) | 0 | **Critical** | Engine Overspeed Over-Rev (`P0219`) |
| **100** | Engine Oil Pressure | 1 | **Critical** | Oil Pressure Low (`P0524`) |
| **175** | Engine Oil Temp | 0 | **Critical** | Oil Overheat (`SPN-175-FMI-0`) |
| **84** | Wheel Speed Sensor | 9 | Warning | Speed Sensor Abnormal Update |
| **91** | Accelerator Pedal | 3 | Warning | Sensor Voltage High |

Nouveau code ajouté ? Éditer `SAE_J1939_DICTIONARY` dans `j1939MappingService.ts` et ajouter un cas de test correspondant — ne jamais laisser un SPN/FMI non répertorié tomber silencieusement en sévérité par défaut sans vérifier ce que fait le fallback.

---

## 4. Flux d'authentification sécurisé et Multi-Tenant

Le provisioning des locataires (tenants) et l'attribution des rôles ont été renforcés pour prévenir toute escalade de privilèges via l'API Supabase Auth.

**Règle d'or :** L'UI client n'a jamais l'autorité pour définir `role` ou `tenant_id` lors de l'inscription. Tout se fait via des fonctions SQL `SECURITY DEFINER`.

### Flux 1 — Inscription Publique (Nouveau Tenant)
1. L'utilisateur remplit le formulaire et appelle `supabase.auth.signUp()`.
2. Le trigger de base de données `handle_new_user` intercepte la création dans `auth.users` et crée un `public.profiles` avec `role = 'DRIVER'` et `tenant_id = NULL` — **ignore volontairement** toute métadonnée `role`/`tenant_id` fournie par le client (protection anti-escalade de privilèges).
3. Le client appelle immédiatement la fonction RPC `register_new_tenant()`.
4. La fonction RPC (exécutée avec les droits `SECURITY DEFINER` côté serveur) :
   - Génère un UUID serveur pour le nouveau `tenant_id`.
   - Crée le locataire dans `public.tenants` et `public.companies`.
   - **Promeut l'utilisateur courant en `role = 'TENANT_ADMIN'`** sur ce nouveau `tenant_id` — ***correction : la version précédente de ce guide indiquait encore `SUPER_ADMIN`, comportement obsolète depuis la migration `20260810000001_tenant_admin_role.sql`.*** `SUPER_ADMIN` est désormais réservé aux opérateurs plateforme internes (voir Section 5) et n'est jamais attribué par ce flux.

⚠️ **Point de défaillance connu et non résolu à ce jour** : cette fonction échoue actuellement en production avec `null value in column "tenant_id" of relation "companies" violates not-null constraint`. La base réelle possède des colonnes `companies.tenant_id NOT NULL` et `companies.billing_email NOT NULL` qui ne sont ni définies dans les migrations versionnées, ni remplies par cette fonction. Voir Section 0 pour le statut du correctif.

### Flux 2 — Acceptation d'Invitation
1. Le token d'invitation est validé rapidement côté client.
2. `supabase.auth.signUp()` est appelé (le trigger crée un profil `DRIVER` + tenant `NULL`).
3. Le client appelle la fonction RPC `accept_tenant_invitation(token)`.
4. La fonction RPC :
   - Marque l'invitation comme acceptée de façon **atomique** (prévient les doubles appels).
   - Lit le `role` et le `tenant_id` **depuis la table `invitations`** (la source de vérité), jamais depuis un paramètre client.
   - Met à jour `public.profiles` avec ces valeurs sécurisées.

### Dépannage (Tenant `NULL`)

Si le provisioning échoue en cours de route (coupure réseau, ou le bug de dérive de schéma ci-dessus), l'utilisateur aura un compte valide mais `tenant_id = NULL`. `AuthContext` détecte cet état et bloque l'accès au tableau de bord avec un écran "Provisioning en attente".

**État actuel (non corrigé) :** cet écran n'a aucune logique de nouvelle tentative — un administrateur système doit finaliser le rattachement manuellement en base. Un correctif d'auto-réparation à la reconnexion a été spécifié (`PROMPT_FIX_PROVISIONNEMENT_BLOQUE.md`) mais n'est pas encore implémenté dans le code — ne pas présumer qu'il l'est avant d'avoir vérifié `authService.ts`/`AuthModal.tsx`.

**Rattachement manuel en attendant le correctif**, pour un compte bloqué en base :
```sql
-- Diagnostic : lister les profils orphelins
SELECT id, email, role, tenant_id FROM public.profiles WHERE tenant_id IS NULL;

-- Une fois la cause de l'échec du RPC corrigée (Section 0),
-- rejouer le provisioning manuellement pour un utilisateur donné :
-- (à adapter une fois la fonction register_new_tenant() corrigée)
```

---

## 5. Rôle TENANT_ADMIN et Opérateurs Plateforme (SUPER_ADMIN)

Pour garantir une étanchéité totale entre les différents clients de la plateforme, le rôle assigné par défaut lors d'une nouvelle inscription est **`TENANT_ADMIN`**. Ce rôle possède tous les droits de configuration et de gestion des utilisateurs, **mais strictement restreint à son propre `tenant_id`**.

Le rôle **`SUPER_ADMIN`** est un rôle global (non-scopé) réservé aux **opérateurs internes de la plateforme NextTransit**, validé via la table `public.platform_admins` — jamais via le champ `role` du profil applicatif. Un utilisateur s'inscrivant publiquement ou via une invitation ne peut jamais obtenir `SUPER_ADMIN`.

> [!TODO] Chantier technique en cours : `platformDbService.ts`
> Le service `platformDbService.ts` (espace opérateur `/platform-admin`) utilise toujours un fichier mock JSON (`platform_db.json`) pour son stockage, **vérifié encore vrai à ce jour**.
> La table SQL `public.platform_admins` existe et sécurise déjà les policies RLS (migration `20260810000001`), mais le service TypeScript n'a pas encore été refactoré pour l'utiliser directement via le client Supabase — à traiter avant tout déploiement en production réelle, ce mock ne doit jamais servir de source de vérité pour une décision d'accès en prod.

---

## Annexe — Comment maintenir ce guide à jour

Ce document a une durée de vie courte s'il n'est pas synchronisé avec le code. Avant chaque session de travail avec un agent (Antigravity/Claude Code) sur un sujet couvert ici :
1. Relire le tableau de la Section 0.
2. Si un prompt de correction a été exécuté depuis la dernière lecture, vérifier son statut réel dans le code (pas seulement supposer qu'il a réussi) avant de mettre à jour ce guide.
3. Une section de ce guide qui contredit le code doit être corrigée avant d'onboarder qui que ce soit d'autre dessus — c'est exactement l'erreur trouvée et corrigée dans la Section 4 de cette version.
