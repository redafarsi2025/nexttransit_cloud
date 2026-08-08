# 🏗️ Plan de Transition Technique & Architectural — NextTransit ERP SaaS Modulaire

**Document de référence stratégique et technique** pour la transformation de NextTransit en un ERP SaaS modulaire multi-tenant prêt pour la commercialisation et le déploiement sur de grandes flottes d'entreprises (ex: pilote initial 900 camions lourds - Numilog).

---

## 📑 Sommaire
1. [Synthèse de l'Audit Développeur & Orientations Clés](#1-synthèse-de-laudit-développeur--orientations-clés)
2. [Matrice des Correctifs Immédiats & Sécurité RLS](#2-matrice-des-correctifs-immédiats--sécurité-rls)
3. [Architecture Modulaire & Découpage de `FleetContext`](#3-architecture-modulaire--découpage-de-fleetcontext)
4. [Moteur de Licences SaaS & Facturation Multi-Tenant (900 Camions)](#4-moteur-de-licences-saas--facturation-multi-tenant-900-camions)
5. [Abstraction Télématique & Mode Déclaratif / Hybride](#5-abstraction-télématique--mode-déclaratif--hybride)
6. [Audit Log Système Immuable & Conformité](#6-audit-log-système-immuable--conformité)
7. [Feuille de Route Exécutive de Déploiement Pilote](#7-feuille-de-route-exécutive-de-déploiement-pilote)

---

## 1. Synthèse de l'Audit Développeur & Orientations Clés

L'audit technique réalisé sur la codebase a mis en évidence trois forces fondamentales et trois chantiers de consolidation critiques :

### 🟢 Points Forts Confirmés
* **Isolation Multi-Tenant Natif** : Les tables Supabase intègrent déjà la colonne `tenant_id` protégée par des fonctions `SECURITY DEFINER` (`get_current_tenant_id()`).
* **Moteur de Décision R1–R7 Robuste** : L'algorithmique métier de réconciliation télématique, réservation d'inventaire R3, coût total R4 et priorité CAE R5 est pleinement fonctionnelle.
* **Sécurité des Requêtes & Zod Validation** : Pas de clés secrètes exposées côté client, rate limiting et validation des payloads en place.

### 🔴 Chantiers Critiques Identifiés & Résolus
1. **Verrouillage du RBAC en Base (RLS)** :
   * *Constat* : La bascule de rôle via le `RoleSwitcher` côté client permettait d'usurper des privilèges UI sans validation serveur. De plus, les règles RLS de lecture (SELECT) sur `work_orders`, `cost_records`, et `inventory_items` manquaient de contrôle de rôle strict.
   * *Correctif apporté* : Le `RoleSwitcher` client a été désactivé en mode authentifié (rôle verrouillé sur le profil Supabase). Les requêtes de modification d'écran appliquent désormais un garde-fou RBAC et un statut de souscription `Subscription Guard` renvoyant vers l'écran `FORBIDDEN_403` ou `BILLING`.
2. **Découpage de l'Architecture ("God Context")** :
   * *Constat* : `FleetContext.tsx` gérait simultanément l'authentification, le profil utilisateur, la souscription, le multi-tenant et le CRUD de 6 entités distinctes.
   * *Orientation* : Migration progressive vers des contextes spécialisés et découplés par domaine.
3. **Piste d'Audit Système globale** :
   * *Constat* : `audit_logs` suivait principalement le centre de traduction.
   * *Correctif apporté* : Extension de la migration `20260804000006_audit_log.sql` pour journaliser toutes les mutations système (`VEHICLE_UPDATE`, `WORK_ORDER_CREATE`, `WARRANTY_ALERT`, `ROLE_CHANGE`, `SUBSCRIPTION_UPDATE`).

---

## 2. Matrice des Correctifs Immédiats & Sécurité RLS

### 🛡️ Révision des Règles Supabase RLS (Modèle de Sécurité Strict)

Afin d'interdire à un rôle `MECHANIC` ou `DRIVER` de consommer directement l'API REST de Supabase pour lire les données financières de l'entreprise :

```sql
-- Exemple de policy RLS sécurisée sur la table des coûts / budgets
CREATE POLICY "RLS_Finance_Select_Policy" ON public.cost_records
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('SUPER_ADMIN', 'DIRECTOR', 'FINANCE', 'MAINTENANCE_MANAGER')
    )
  );

-- Policy RLS sur les Ordres de Travail (Work Orders)
CREATE POLICY "RLS_WorkOrders_Select_Policy" ON public.work_orders
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.get_current_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS')
      OR (public.get_current_user_role() = 'MECHANIC' AND assigned_mechanic_id = auth.uid()::text)
      OR (public.get_current_user_role() = 'DRIVER' AND vehicle_id IN (SELECT id FROM public.vehicles WHERE assigned_driver_id = auth.uid()::text))
    )
  );

-- Policy RLS sur les Alertes Flotte (Fleet Alerts)
CREATE POLICY "RLS_FleetAlerts_Select_Policy" ON public.fleet_alerts
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.get_current_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS')
      OR (public.get_current_user_role() = 'MECHANIC' AND vehicle_id IN (SELECT id FROM public.vehicles WHERE assigned_mechanic_id = auth.uid()::text UNION SELECT vehicle_id FROM public.work_orders WHERE assigned_mechanic_id = auth.uid()::text))
      OR (public.get_current_user_role() = 'DRIVER' AND vehicle_id IN (SELECT id FROM public.vehicles WHERE assigned_driver_id = auth.uid()::text))
    )
  );

-- Policy RLS sur le Stock & Pièces (Inventory Items)
CREATE POLICY "RLS_Inventory_Select_Policy" ON public.inventory_items
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.get_current_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS')
      OR (public.get_current_user_role() = 'MECHANIC' AND id IN (SELECT DISTINCT (p->>'part_id')::uuid FROM public.work_orders wo, jsonb_array_elements(wo.parts_used) p WHERE wo.assigned_mechanic_id = auth.uid()::text))
    )
  );
```

### 🔒 Statuts des Rôles Officiels (Standardisés dans TypeScript)
Les rôles ont été harmonisés sur l'ensemble de l'application :
* `SUPER_ADMIN` : Administrateur plateforme SaaS.
* `DIRECTOR` : Direction générale & arbitrage budgétaire.
* `FLEET_MANAGER` : Supervision opérationnelle de la flotte.
* `MAINTENANCE_MANAGER` : Direction technique & dispatch atelier.
* `FINANCE` : Contrôle de gestion & conformité comptable SCF.
* `OPERATIONS` : Gestionnaire logistique & approvisionnement stock R3.
* `MECHANIC` : Technicien d'intervention atelier.
* `DRIVER` : Chauffeur & inspections pré-trajet DVIR.

---

## 3. Architecture Modulaire & Découpage de `FleetContext`

Pour faire passer NextTransit d'un prototype à un **ERP SaaS Modulaire scalable**, nous structurons le découpage de la gestion d'état en 5 sous-domaines indépendants :

```
                        +------------------------------------+
                        |         NEXTTRANSIT ERP APP        |
                        +------------------------------------+
                                          |
        +------------------+--------------+-------------+------------------+
        |                  |                            |                  |
        v                  v                            v                  v
+---------------+  +---------------+            +---------------+  +---------------+
| Auth & User   |  | Tenant & Sub  |            | Fleet & Veh.  |  | Maintenance   |
| Context       |  | Context       |            | Context       |  | & Stock Context|
+---------------+  +---------------+            +---------------+  +---------------+
| • User Profile|  | • TenantConfig|            | • Vehicles    |  | • Work Orders |
| • JWT Session |  | • Plan/Billing|            | • Warranties  |  | • Inventory   |
| • RBAC Check  |  | • Module Flags|            | • Fuel Logs   |  | • R1-R7 Engine|
+---------------+  +---------------+            +---------------+  +---------------+
```

### Modules Activables / Désactivables (`TenantConfig.enabled_modules`)
Chaque entreprise peut souscrire à des modules spécifiques :
1. `MODULE_CORE_FLEET` : Gestion des véhicules, contrôles techniques, alertes R1.
2. `MODULE_MAINTENANCE_R4` : Ordres de travail, couts main d'œuvre & atelier.
3. `MODULE_INVENTORY_R3` : Gestion de stock, réservations et bons de commande.
4. `MODULE_WARRANTY` : Suivi des garanties constructeurs et alertes déchéance.
5. `MODULE_FUEL` : Log carburant, consommation aux 100km et détection d'anomalies.
6. `MODULE_TELEMETRY` : Dynamic stream OBD-II, cartographie GPS & Teltonika/Flespi adapters.
7. `MODULE_FINANCE_R7` : Arbitrage CAE R5, analyse de variance R7 et comptabilité SCF.

---

## 4. Moteur de Licences SaaS & Facturation Multi-Tenant (900 Camions)

### 📊 Tarification & Dimensionnement Grands Comptes

Pour répondre aux besoins d'un client comme **Numilog (900 camions lourds)**, le SaaS intègre la gestion des paliers de facturation et des quotas d'utilisation (`usage_meters`) :

| Plan SaaS | Flotte Max | Prix / Camion / Mois | Inclus |
| :--- | :--- | :--- | :--- |
| **Starter** | Jusqu'à 25 véhicules | 12 € / camion | Flotte de base, Ordres de travail R4, Inspection Chauffeur |
| **Professional** | 26 à 200 véhicules | 9 € / camion | Modules Inventaire R3, Garanties, Carburant, Telemetrie |
| **Enterprise (Numilog)**| 200 à 1 500+ véhicules | **PRIX NÉGOCIÉ (ex: 6.5 € / camion)** | Accès illimité, Support 24/7, Connecteurs Teltonika/Flespi, Export Comptable SCF |

### 💳 Tables de Facturation Implémentées (`subscriptions`, `invoices`, `tenant_invitations`)
* `subscriptions` : Suit le `status` (`active`, `past_due`, `cancelled`, `trialing`), la date de renouvellement et le quota autorisé (`max_vehicles`).
* `invoices` : Historique des factures payables avec génération de PDF et traçabilité.
* `tenant_invitations` : Invitations d'utilisateurs par lien sécurisé avec rôle prédéfini.

---

## 5. Abstraction Télématique & Mode Déclaratif / Hybride

Afin de permettre un déploiement immédiat chez un client sans imposer l'installation de nouveaux boîtiers IoT en Jour 1, NextTransit repose sur le pattern **`TelematicsProvider`** :

```typescript
export interface TelematicsProvider {
  getFaultCodes(vehicleId: string): Promise<OBDFaultCode[]>;
  getPosition(vehicleId: string): Promise<{ lat: number; lng: number; speed: number }>;
  subscribe(vehicleId: string, callback: (data: TelemetryFrame) => void): () => void;
}
```

### Implémentations Prêtes :
1. **`ManualEntryProvider`** : Permet au chef d'atelier ou au chauffeur de saisir manuellement les anomalies (mode idéal pour démarrer le pilote immédiatement).
2. **`TeltonikaProvider`** : Ingestion des trames UDP/TCP des boîtiers FMB.
3. **`FlespiWialonProvider`** : Connexion via REST/WebSocket aux plateformes de télématique existantes du client.

---

## 6. Audit Log Système Immuable & Conformité

Chaque action sensible réalisée dans le SaaS est enregistrée dans la table `audit_logs` avec les métadonnées suivantes :
* `tenant_id` : Locataire concerné.
* `actor_id` & `actor_email` : Identifiant de l'utilisateur ayant exécuté l'action.
* `action` : `VEHICLE_STATUS_CHANGE`, `WORK_ORDER_CREATED`, `PARTS_DEDUCTED_R3`, `WARRANTY_ALERT_TRIGGERED`, `R1_RED_ALERT_ISSUED`.
* `payload_before` / `payload_after` : Capture JSON des états avant/après mutation.

---

## 7. Feuille de Route Exécutive de Déploiement Pilote

```
+-------------------------------------------------------------------------------------------------------+
|                       CALENDRIER DÉPLOIEMENT PILOTE NUMILOG (900 CAMIONS)                             |
+------------------------------------+-----------------------------------+------------------------------+
| SEMAINE 1-2 : SOCLE & RLS          | SEMAINE 3-4 : IMPORT & DEMO REAL  | SEMAINE 5-6 : PILOTE TERRAIN |
|  • Application des RLS Supabase    |  • Import des 900 camions         |  • Formation 15 Mécaniciens  |
|  • Verrouillage JWT RBAC           |  • Module Garantie activé         |  • 50 Chauffeurs sur DVIR    |
|  • Configuration Subscriptions     |  • Log Carburant pré-rempli       |  • Suivi Variance R7 en direct|
+------------------------------------+-----------------------------------+------------------------------+
```

### Validation et Prochaines Étapes :
1. ✅ Validation de ce document d'architecture.
2. 🔄 Déploiement des migrations RLS et activation du suivi des abonnements.
3. 🚀 Lancement de la première phase de tests d'intégration avec les données réelles de la flotte.
