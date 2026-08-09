# NextTransit Developer & Operational Onboarding Guide

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

### 1.3 Device Mapping in NextTransit
To map an incoming hardware device to a specific NextTransit vehicle:
1. Open **Configuration Espace Entreprise** -> **Telematics & Devices**.
2. Select the vehicle, set Telematics Adapter to `Flespi / Wialon Middleware` or `Teltonika FM/FMM Series`.
3. Enter the `external_device_id` (Flespi Unit ID or IMEI number).
4. Or insert a row into `public.device_mappings`:
   ```sql
   INSERT INTO public.device_mappings (tenant_id, vehicle_id, provider, external_device_id)
   VALUES ('<your_tenant_id>', 'V-024', 'flespi_wialon', 'TEL-864201049281002');
   ```

---

## 2. Historical OBD / CAN Bus Batch Import & Replay Engine

When live hardware boxes are not yet installed, NextTransit supports historical offline batch imports for commercial pilots (e.g. Numilog).

### 2.1 File Formats (V1 Spec)
The batch parser accepts `.csv` or `.json` files.

#### CSV Header Format:
```csv
timestamp,vehicle_id,latitude,longitude,speed_kmh,spn,fmi,dtc_code,severity,actual_spend,projected_budget
2026-08-01T10:00:00Z,V-024,36.7538,3.0588,72,110,0,,Critical,,
2026-08-01T11:30:00Z,V-024,36.7800,3.0900,65,,,,P0300,Warning,,
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
Execute the import script using Node/TypeScript:
```bash
npx tsx scripts/import-historical-telemetry/importer.ts path/to/historical_telemetry.csv
```

### 2.3 Generating Retroactive Replay Audit Reports
To evaluate historical data through the R1-R7 Decision Engine without altering live vehicle status or dispatch assignments:
```typescript
import { parseHistoricalTelemetryFile } from './scripts/import-historical-telemetry/importer';
import { generateRetroactiveReplayReport } from './scripts/import-historical-telemetry/replayReportGenerator';

const { validRecords, ignoredRecords } = parseHistoricalTelemetryFile('path/to/telemetry.csv');
const report = generateRetroactiveReplayReport(validRecords, ignoredRecords.length);

console.log(JSON.stringify(report, null, 2));
```

---

## 3. SAE J1939 Heavy-Duty Diagnostic Fault Code Reference

| SPN | Parameter Description | FMI | Severity | NextTransit Action |
|:---|:---|:---|:---|:---|
| **110** | Engine Coolant Temp | 0 | **Critical** | Triggers Rule R1 Emergency Stop (`P0217`) |
| **110** | Engine Coolant Temp | 15 | Warning | High Temperature Warning |
| **190** | Engine Speed (RPM) | 0 | **Critical** | Engine Overspeed Over-Rev (`P0219`) |
| **100** | Engine Oil Pressure | 1 | **Critical** | Oil Pressure Low (`P0524`) |
| **175** | Engine Oil Temp | 0 | **Critical** | Oil Overheat (`SPN-175-FMI-0`) |
| **84** | Wheel Speed Sensor | 9 | Warning | Speed Sensor Abnormal Update |
| **91** | Accelerator Pedal | 3 | Warning | Sensor Voltage High |

---

## 4. Flux d'authentification sécurisé et Multi-Tenant

Le provisioning des locataires (tenants) et l'attribution des rôles ont été renforcés pour prévenir toute escalade de privilèges via l'API Supabase Auth.

**Règle d'or :** L'UI client n'a jamais l'autorité pour définir `role` ou `tenant_id` lors de l'inscription. Tout se fait via des fonctions SQL `SECURITY DEFINER`.

### Flux 1 — Inscription Publique (Nouveau Tenant)
1. L'utilisateur remplit le formulaire et appelle `supabase.auth.signUp()`.
2. Le trigger de base de données `handle_new_user` intercepte la création dans `auth.users` et crée un `public.profiles` avec `role = 'DRIVER'` et `tenant_id = NULL`.
3. Le client appelle immédiatement la fonction RPC `register_new_tenant()`.
4. La fonction RPC (exécutée avec les droits admin côté serveur) :
   - Génère un UUID serveur pour le nouveau `tenant_id`.
   - Crée le locataire dans `public.tenants` et `public.companies`.
   - Promeut l'utilisateur courant en `role = 'SUPER_ADMIN'` sur ce nouveau `tenant_id`.

### Flux 2 — Acceptation d'Invitation
1. Le token d'invitation est validé rapidement côté client.
2. `supabase.auth.signUp()` est appelé (le trigger crée un profil `DRIVER` + tenant `NULL`).
3. Le client appelle la fonction RPC `accept_tenant_invitation(token)`.
4. La fonction RPC :
   - Marque l'invitation comme acceptée de façon **atomique** (prévient les doubles appels).
   - Lit le `role` et le `tenant_id` **depuis la table `invitations`** (la source de vérité).
   - Met à jour `public.profiles` avec ces valeurs sécurisées.

### Dépannage (Tenant `NULL`)
Si le processus de provisioning (l'appel RPC) échoue en cours de route à cause d'une coupure réseau, l'utilisateur aura un compte valide mais avec `tenant_id = NULL`. 
Le `AuthContext` détectera cet état et bloquera l'accès au tableau de bord, affichant un écran "Provisioning en attente". Un administrateur système devra finaliser le rattachement manuellement.

---

## 5. Rôle TENANT_ADMIN et Opérateurs Plateforme (SUPER_ADMIN)

Pour garantir une étanchéité totale entre les différents clients de la plateforme, le rôle assigné par défaut lors d'une nouvelle inscription est **`TENANT_ADMIN`**. Ce rôle possède tous les droits de configuration et de gestion des utilisateurs, **mais strictement restreint à son propre `tenant_id`**.

Le rôle **`SUPER_ADMIN`** est désormais un rôle global (non-scopé) réservé aux **opérateurs internes de la plateforme NextTransit**. Un utilisateur s'inscrivant publiquement ou via une invitation ne pourra jamais obtenir le rôle `SUPER_ADMIN`.

> [!TODO] Chantier technique en cours : `platformDbService.ts`
> Actuellement, le service `platformDbService.ts` (qui gère l'espace opérateur /platform-admin) utilise un mock JSON (`platform_db.json`) pour son stockage de données.
> Bien que la table SQL `public.platform_admins` ait été créée dans la migration `20260810000001` pour sécuriser les RLS, **le service TypeScript doit encore être refactoré** pour abandonner le mock JSON et utiliser directement cette table via Supabase Client.
