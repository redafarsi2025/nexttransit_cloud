# 🚀 Guide d'Utilisation Détaillé & Roadmap d'Implémentation SaaS — NextTransit

**NextTransit AI Studio** est une plateforme mission-critique de gestion opérationnelle de flotte, de réconciliation télématique OBD-II et de moteur de décision de maintenance (Decision Engine). Ce guide constitue le manuel de référence complet pour l'utilisation du SaaS au quotidien, ainsi que la feuille de route (Roadmap) stratégique pour élever la plateforme au rang de **SaaS de niveau mondial (World-Class Enterprise SaaS)**.

---

## 📑 Table des Matières

1. [Vue d'Ensemble & Proposition de Valeur SaaS](#1-vue-densemble--proposition-de-valeur-saas)
2. [Matrice des Rôles & Permissions (RBAC)](#2-matrice-des-rôles--permissions-rbac)
3. [Les 7 Règles Métier du Moteur de Décision (R1 – R7)](#3-les-7-règles-métier-du-moteur-de-décision-r1--r7)
4. [Guide d'Utilisation par Écran (Les 13 Modules)](#4-guide-dutilisation-par-écran-les-13-modules)
   - [4.1 Portail & Démos (Landing Page)](#41-portail--démos-landing-page)
   - [4.2 Stratégique & Direction (Strategic Dashboard)](#42-stratégique--direction-strategic-dashboard)
   - [4.3 Contrôle Budgétaire & SCF (Variance Dashboard - R7)](#43-contrôle-budgétaire--scf-variance-dashboard---r7)
   - [4.4 Santé Flotte & Diagnostic OBD-II (Fleet Health Grid - R1)](#44-santé-flotte--diagnostic-obd-ii-fleet-health-grid---r1)
   - [4.5 Stocks de Pièces & Approvisionnement (Inventory Dashboard - R3)](#45-stocks-de-pièces--approvisionnement-inventory-dashboard---r3)
   - [4.6 Queue des Ordres de Travail (Work Order Queue - R4)](#46-queue-des-ordres-de-travail-work-order-queue---r4)
   - [4.7 Conflits d'Horaires & Exploitation (Conflict Alerts - R2)](#47-conflits-dhoraires--exploitation-conflict-alerts---r2)
   - [4.8 Arbitrage Budgétaire CAE (CAE Budget Prioritization - R5)](#48-arbitrage-budgétaire-cae-cae-budget-prioritization---r5)
   - [4.9 Réconciliation Télématique (Incident Reports - R6)](#49-réconciliation-télématique-incident-reports---r6)
   - [4.10 Application Mobile Atelier (Mechanic Mobile Queue)](#410-application-mobile-atelier-mechanic-mobile-queue)
   - [4.11 Application Mobile Chauffeur (Driver Mobile View)](#411-application-mobile-chauffeur-driver-mobile-view)
   - [4.12 Gestion Multi-Tenant (Tenant Config)](#412-gestion-multi-tenant-tenant-config)
   - [4.13 Centre de Traduction Multilingue (Translation Center)](#413-centre-de-traduction-multilingue-translation-center)
5. [Roadmap Stratégique d'Implémentation (SaaS Niveau Mondial)](#5-roadmap-stratégique-dimplémentation-saas-niveau-mondial)
   - [Phase 1 : Socle Entreprise & Sécurité RLS Multi-Tenant (Q1-Q2)](#phase-1--socle-entreprise--sécurité-rls-multi-tenant-q1-q2)
   - [Phase 2 : IoT CanBus / OBD-II en Temps Réel & IA Prédictive (Q2-Q3)](#phase-2--iot-canbus--obd-ii-en-temps-réel--ia-prédictive-q2-q3)
   - [Phase 3 : Logistique EDI, Traçabilité RFID & PM Schedules (Q3-Q4)](#phase-3--logistique-edi-traçabilité-rfid--pm-schedules-q3-q4)
   - [Phase 4 : Conformité Comptable SCF, Sociale CNAS & RSE/ESG (Q4-Q1)](#phase-4--conformité-comptable-scf-sociale-cnas--rseesg-q4-q1)
   - [Phase 5 : Mobilité Offline-First & Écosystème Prestataires (Q1+)](#phase-5--mobilité-offline-first--écosystème-prestataires-q1)
6. [Architecture Technique & Indicateurs de Succès](#6-architecture-technique--indicateurs-de-succès)

---

## 1. Vue d'Ensemble & Proposition de Valeur SaaS

**NextTransit** résout un problème critique que les logiciels de gestion de flotte traditionnels (GPS/Télématique ou GMAO classiques) ignorent : **le fossé opérationnel entre les données de capteurs électroniques (OBD-II), les inspections manuelles terrain (chauffeurs/mécaniciens) et l'arbitrage financier de la direction (budgets, stocks et coût d'immobilisation)**.

```
       [ Télématique OBD-II / Capteurs ]        [ Signalements Chauffeur (DVIR) ]
                       \                                 /
                        \                               /
                         v                             v
                   +-----------------------------------------+
                   |  MOTEUR DE DÉCISION NEXTTRANSIT (R1-R7) |
                   +-----------------------------------------+
                         /         |          \
                        /          |           \
                       v           v            v
           [ Ordres de Travail ]  [ Stock R3 ]  [ Arbitrage CAE R5 ]
```

### Avantages Clés
* **Automatisme des règles métier R1–R7** : Élimination des erreurs humaines lors de la planification d'un véhicule dangereux ou sous-entretenu.
* **Sécurisation des départs** : Blocage automatique des affectations logistiques lorsqu'un véhicule critique est requis en maintenance.
* **Maîtrise budgétaire instantanée** : Visualisation en direct du Coût Total de Réparation (Main d'œuvre + Pièces) avec rapprochement au Système Comptable Financier (SCF) et charges CNAS.

---

## 2. Matrice des Rôles & Permissions (RBAC)

Le SaaS intègre une gestion fine des accès (RBAC - *Role-Based Access Control*). Lors du changement de rôle dans la barre supérieure (**TopBar**), l'application bascule instantanément vers l'espace de travail dédié et applique les règles d'accès suivantes :

| Rôle Utilisateur | Identifiant (`Role`) | Écran par Défaut | Accès Principal & Responsabilité |
| :--- | :--- | :--- | :--- |
| **Super Administrateur** | `SUPER_ADMIN` | **Strategic Dashboard** | Accès complet plateforme SaaS, gestion multi-tenant, abonnements & paramétrage global. |
| **Directeur Général** | `DIRECTOR` | **Strategic Dashboard** | Vue exécutive globale, KPI financiers, arbitrage du budget CAE (R5), validation des écarts (R7). |
| **Gestionnaire de Flotte** | `FLEET_MANAGER` | **Fleet Health Grid** | Contrôle opérationnel, supervision OBD-II, gestion des urgences **R1**, résolution des conflits **R2**. |
| **Responsable Maintenance** | `MAINTENANCE_MANAGER` | **Work Order Queue** | Dispatch atelier, qualification des pannes, ordres d'investigation **R6**, suivi garanties & pièces. |
| **Contrôleur Financier** | `FINANCE` | **Variance Dashboard** | Contrôle financier, rapprochement SCF, analyse de variance budgétaire **R7**, suivi factures & coûts. |
| **Responsable Opérations** | `OPERATIONS` | **Inventory Dashboard** | Gestion du magasin de pièces, réservations automatiques **R3**, alertes de stock et bons de commande. |
| **Mécanicien Atelier** | `MECHANIC` | **Mechanic Mobile Queue** | File d'attente mobile, check-list intervention, saisie des pièces consommées et clôture travaux. |
| **Chauffeur** | `DRIVER` | **Driver Mobile View** | Inspection de départ (DVIR), signalement d'anomalies mécaniques, suivi sécurité & carburant. |

---

## 3. Les 7 Règles Métier du Moteur de Décision (R1 – R7)

Le cœur de NextTransit repose sur 7 algorithmes et formules métier immutables qui garantissent la sécurité et la rentabilité de la flotte :

### 🚨 Règle R1 — Arrêt d'Urgence / Red Alert
* **Déclencheur** : Réception d'un code défaut OBD-II classé `Critical` (ex: `P0217` Surchauffe Moteur, `C0035` Défaut Capteur Vitesse Roue / ABS).
* **Action Automatique** :
  1. Le statut du véhicule bascule immédiatement en **`Unsafe / Red`**.
  2. Un **Ordre de Travail d'Urgence** est créé dans la queue atelier.
  3. Le véhicule est **retiré du planning de dispatch logistique** pour interdire tout départ sur route.

### 📅 Règle R2 — Prévention de Conflit d'Horaire (Schedule Conflict Prevention)
* **Déclencheur** : Un véhicule planifié pour un trajet logistique dans **moins de 3 jours (`< 72h`)** possède un ou plusieurs **Ordres de Travail ouverts**.
* **Action Automatique** :
  1. Génération d'une **Alerte de Conflit d'Horaire (`CONFLICT_ALERTS`)** de sévérité Haute ou Critique.
  2. Proposition d'un véhicule de remplacement sain ou accélération prioritaire de l'intervention atelier.

### 📦 Règle R3 — Système de Réservation d'Inventaire (Inventory Reservation)
* **Déclencheur** :
  * *Création d'un Ordre de Travail* : Réservation immédiate (`reserved_quantity`) des pièces requises.
  * *Clôture d'un Ordre de Travail* : Déduction définitive du stock physique (`in_stock`).
* **Alerte Automatique** : Si le stock disponible (`in_stock - reserved_quantity`) descend sous `reorder_threshold`, un **Bon de Réapprovisionnement** est automatiquement suggéré.

### 💰 Règle R4 — Formule du Coût Total de Réparation
* **Formule** :
  $$\text{Total Work Order Cost} = (\text{Labor Hours} \times \text{Hourly Rate}) + \sum (\text{Part Quantity} \times \text{Part Unit Cost})$$
* **Calcul en temps réel** : Chaque ordre de travail met à jour son coût total à mesure que le mécanicien pointe ses heures ou ajoute une référence de pièce.

### ⚖️ Règle R5 — Score d'Arbitrage Budget CAE (Capital Asset Expenditure)
* **Objectif** : Prioriser objectivement les investissements de réparation lorsque le budget de maintenance disponible est limité.
* **Formule** :
  $$\text{Priority Score} = (\text{Critical Severity Factor} \times 0.40) + (\text{Days Until Route} \times 0.30) + (\text{ROI / Cost Ratio} \times 0.30)$$
* **Utilisation** : L'écran **CAE Budget Prioritization** classe les interventions de `0` à `100 points` pour maximiser la disponibilité de la flotte avec le budget accordé.

### 🔍 Règle R6 — Réconciliation Télématique & Audit Incidents Chauffeurs
* **Déclencheur** : Un chauffeur signale un problème (ex: *vibration anormale de la direction*, *bruit de suspension*, *fuite pneumatique*) qui **ne génère aucun code OBD-II électronique**.
* **Action Automatique** : Création immédiate d'un **Ordre d'Enquête R6 (R6 Investigation Work Order)** afin que l'atelier inspecte mécaniquement les organes non monitorés par les capteurs OBD.

### 📈 Règle R7 — Analyse Stratégique de Variance de Santé Flotte
* **Objectif** : Comparer en continu les dépenses réelles exécutées (`Actual Spend`) au budget prévisionnel (`Projected Budget`) par système de véhicule :
  * **Moteur & Transmission (Engine)**
  * **Système Électrique & Capteurs (Electrical)**
  * **Freinage & Sécurité (Brakes)**
  * **Châssis, Suspension & Pneumatiques (Chassis/Tires)**
* **Alerte** : Tout dépassement de variance > `10%` déclenche un audit comptable dans le module **Variance Dashboard**.

---

## 4. Guide d'Utilisation par Écran (Les 13 Modules)

### 4.1 Portail & Démos (Landing Page - `/`)
* **Usage** : Page d'accueil commerciale et de démonstration du SaaS.
* **Fonctionnalités** :
  * Présentation des avantages clés pour les transporteurs, industriels, BTP et flottes de service.
  * **Sélecteur interactif de rôle** pour tester les vues Directeur, Gestionnaire, Mécanicien ou Chauffeur.
  * Accès en un clic aux démonstrations pré-configurées (*Golden Paths* A & B).

### 4.2 Stratégique & Direction (Strategic Dashboard - `/dashboard`)
* **Public Cible** : Direction Générale (`DIRECTOR`), Directeurs des Opérations.
* **Fonctionnalités** :
  * **KPIs Globaux** : Coût opérationnel total de la flotte, taux de disponibilité opérationnelle (ex: `94.2%`), coût de maintenance au kilomètre/heure.
  * **Aperçu des Alertes R1/R2** : Cartes interactives d'alertes en temps réel permettant d'accéder directement au véhicule concerné.
  * **Répartition des dépenses** par famille de véhicules (`Keystone` vs `Standard`).

### 4.3 Contrôle Budgétaire & SCF (Variance Dashboard - R7 - `/variance`)
* **Public Cible** : Contrôleur de Gestion (`MGMT_CONTROLLER`), Direction Financière.
* **Fonctionnalités** :
  * **Tableau de variance R7** : Écart financier détaillé entre le budget prévisionnel et les réparations réelles engagées.
  * **Filtrage par Système** (Moteur, Freins, Électrique, Châssis) et par période fiscale.
  * **Export & Rapprochement** : Préparation des états de rapprochement pour la comptabilité analytique (SCF - Système Comptable Financier).

### 4.4 Santé Flotte & Diagnostic OBD-II (Fleet Health Grid - R1 - `/vehicles`)
* **Public Cible** : Gestionnaires de Flotte (`FLEET_MANAGER`), Contrôleurs Techniques.
* **Fonctionnalités** :
  * Grille de l'ensemble de la flotte avec codes couleurs instantanés :
    * 🟢 **Healthy** : Aucun défaut critique.
    * 🟡 **Attention** : Maintenance préventive ou défaut mineur.
    * 🔴 **Critical / Red (R1)** : Arrêt d'urgence actif.
  * **Scores de santé (Health Score, Compliance, Freshness)** : Mise à jour en continu selon la télématique.
  * **Fiche Véhicule Détaillée (VehicleDetailModal)** : Historique OBD-II complet, ordres de travail attachés, timeline des incidents et boutons d'action rapide.

### 4.5 Stocks de Pièces & Approvisionnement (Inventory Dashboard - R3 - `/inventory`)
* **Public Cible** : Contrôleur Logistique (`LOGISTICS_CONTROLLER`), Magasiniers.
* **Fonctionnalités** :
  * Suivi des références de pièces détachées (Plaquettes de frein, Filtres, Alternateurs, Capteurs OBD, Pneumatiques).
  * **Réservations en direct (R3)** : Affichage du stock total, des unités réservées sur ordres de travail en cours et du stock disponible.
  * **Indicateur de seuil d'alerte** : Mise en évidence automatique des références nécessitant un réapprovisionnement avec calcul du délai d'approvisionnement (`Lead Time`).

### 4.6 Queue des Ordres de Travail (Work Order Queue - R4 - `/work-orders`)
* **Public Cible** : Contrôleur Technique (`TECHNICAL_CONTROLLER`), Chefs d'Atelier.
* **Fonctionnalités** :
  * Gestion du cycle de vie complet des interventions : `Open` ➔ `In Progress` ➔ `Pending Inspection` ➔ `Closed`.
  * **Calcul automatique du Coût Total R4** : Affichage dynamique de `(Heures × Taux) + Pièces`.
  * Affectation aux mécaniciens disponibles et priorisation automatique selon la classification du véhicule.

### 4.7 Conflits d'Horaires & Exploitation (Conflict Alerts - R2 - `/conflicts`)
* **Public Cible** : Gestionnaires de Flotte (`FLEET_MANAGER`), Exploitation Logistique.
* **Fonctionnalités** :
  * **Détection proactive R2** : Liste des véhicules planifiés pour un trajet dans les 72h alors qu'un ordre de maintenance est toujours ouvert.
  * **Boutons de résolution** :
    * *Accélérer l'Ordre de Travail* (priorité maximale en atelier).
    * *Réassigner un Véhicule* (basculer la mission sur une unité saine).

### 4.8 Arbitrage Budgétaire CAE (CAE Budget Prioritization - R5 - `/cae`)
* **Public Cible** : Direction Générale (`DIRECTOR`), Contrôleur de Gestion (`MGMT_CONTROLLER`).
* **Fonctionnalités** :
  * **Simulation d'arbitrage** : Saisie du budget disponible (ex: `15 000 DA` ou `15 000 €`).
  * **Classement R5** : Les réparations sont automatiquement ordonnées par score de priorité (Sévérité 40% + Jours avant départ 30% + ROI 30%).
  * Option pour valider un panier de réparations compatible avec l'enveloppe budgétaire.

### 4.9 Réconciliation Télématique (Incident Reports - R6 - `/incidents`)
* **Public Cible** : Contrôleur Technique (`TECHNICAL_CONTROLLER`), Qualité & Sécurité.
* **Fonctionnalités** :
  * Tableau comparatif entre **Rapports terrain Chauffeur** et **Codes Défauts OBD-II**.
  * **Génération automatique d'enquête R6** pour tout incident mécanique non capté par l'électronique.
  * Suivi du taux d'alignement télématique de la flotte.

### 4.10 Application Mobile Atelier (Mechanic Mobile Queue - `/mechanic`)
* **Public Cible** : Mécaniciens (`MECHANIC`), Techniciens d'atelier.
* **Fonctionnalités** :
  * Vue simplifiée, adaptée aux tablettes et smartphones durcis en atelier.
  * **Interface d'intervention guidée** :
    * Affichage des notes "Before" du chauffeur/contrôleur.
    * Saisie du diagnostic et des notes "After".
    * Sélection et décompte des pièces détachées consommées (application de R3).
    * Clôture de l'ordre de travail en 1 clic.

### 4.11 Application Mobile Chauffeur (Driver Mobile View - `/driver`)
* **Public Cible** : Chauffeurs (`DRIVER`), Conducteurs d'engins.
* **Fonctionnalités** :
  * **Check-list pré-trajet (DVIR)** : Validation des freins, pneus, feux et niveaux de liquides avant départ.
  * **Bouton d'alerte rapide** : Signalement instantané d'une anomalie mécanique pendant le trajet pour alimenter la réconciliation R6.

### 4.12 Gestion Multi-Tenant (Tenant Config - `/tenant-config`)
* **Public Cible** : Administrateurs SaaS, Super-Utilisateurs.
* **Fonctionnalités** :
  * Configuration des paramètres d'entreprise (Nom du locataire, devise `DA`/`€`/`$`, seuils de variance R7).
  * Sélection du mode de stockage (`Supabase Cloud` ou `Local State`).

### 4.13 Centre de Traduction Multilingue (Translation Center - `/translation`)
* **Public Cible** : Administrateurs, Équipes internationales.
* **Fonctionnalités** :
  * Bascule instantanée entre **Français**, **Anglais** et **Arabe**.
  * **Prise en charge native RTL (Right-to-Left)** pour l'arabe avec réorganisation parfaite des composants Tailwind CSS.

### 4.14 Module Garanties Constructeurs (Warranty Tracking - `/warranties`)
* **Public Cible** : Responsables Maintenance (`MAINTENANCE_MANAGER`), Directeurs de Flotte.
* **Fonctionnalités** :
  * **Suivi des contrats sous garantie** (Constructeur, date d'expiration, kilométrage max, systèmes couverte).
  * **Protection Déchéance R1** : Avertissement automatique lors de la création d'un Ordre de Travail si la pièce ou le système est sous garantie constructeur pour éviter la perte de couverture.

### 4.15 Module Carburant & Consommation (Fuel & Anomaly Tracking - `/fuel`)
* **Public Cible** : Contrôleurs Financiers (`FINANCE`), Responsables Logistique.
* **Fonctionnalités** :
  * **Registre des pleins** (volume en litres, coût total, kilométrage et station).
  * **Détection d'anomalie de consommation** : Alerte automatique si la consommation aux 100 km s'écarte de +15% du sous-ensemble type de la flotte.
  * **Alimentation R7** : Intégration directe du poste carburant dans l'analyse de variance financière.

### 4.16 Stream Télématique & Mappages Boîtiers (Telemetry Stream - `/telemetry`)
* **Public Cible** : Super Administrateurs (`SUPER_ADMIN`), Intégrateurs IoT.
* **Fonctionnalités** :
  * **Visualisation du flux IoT** en direct (CAN-Bus, OBD-II, GPS lat/lng, vitesse, statut ignition).
  * **Abstraction Multi-Constructeur** : Prise en charge des connecteurs Teltonika, Flespi, Wialon et du mode déclaratif manuel (`ManualEntryProvider`).

### 4.17 Journal d'Audit Système Immuable (Audit Log - `/audit`)
* **Public Cible** : Administrateurs & Auditeurs de Sécurité (ISO 27001 / Conformité).
* **Fonctionnalités** :
  * **Historique infalsifiable des mutations** : Journalisation de toute création/modification sur les véhicules, WOs, pièces, règles R1-R7 et abonnements.
  * **Filtrage par acteur, action et période** avec capture JSON `before` / `after`.

### 4.18 Gestion des Invitations & Équipes (Team Invitations - `/invitations`)
* **Public Cible** : Administrateurs d'Entreprise, Directeurs RH & Flotte.
* **Fonctionnalités** :
  * Envoi d'invitations sécurisées par e-mail avec pré-assignation du rôle RBAC et du locataire `tenant_id`.
  * Révocation et suivi du statut des liens d'activation (`Pending`, `Accepted`, `Expired`).

### 4.19 Facturation SaaS & Abonnements (Billing & Subscriptions - `/billing`)
* **Public Cible** : Super Administrateurs & Directeurs Financiers (Client Enterprise).
* **Fonctionnalités** :
  * **Statut de l'abonnement** (`Active`, `Trialing`, `Past Due`, `Cancelled`).
  * **Comptage des véhicules actifs** par rapport au quota du plan (ex: 900 camions sur Plan Enterprise).
  * **Gestion des cartes de paiement, factures PDF et historique de facturation**.

### 4.20 Protection Sécurité & Accès Interdit (RBAC Guard - `/forbidden`)
* **Public Cible** : Tous les utilisateurs authentifiés.
* **Fonctionnalités** :
  * Écran de sécurité affiché automatiquement lorsqu'un utilisateur tente d'accéder à un écran ou un module non autorisé par la matrice RBAC ou par l'état de souscription SaaS.

---

## 5. Roadmap Stratégique d'Implémentation (SaaS Niveau Mondial)

Pour transformer **NextTransit** en une solution SaaS de niveau mondial (World-Class Enterprise SaaS) leader sur les marchés des transports, logistique, BTP et flottes industrielles, nous structurons le développement en **5 phases incrémentales et mesurables**.

```
+--------------------------------------------------------------------------------------------------------+
|                            ROADMAP NEXTTRANSIT — SAAS DE NIVEAU MONDIAL                                |
+------------------------------------+-----------------------------------+-------------------------------+
| PHASE 1 : Socle Entreprise & RLS   | PHASE 2 : IoT CanBus & IA         | PHASE 3 : Logistique & EDI   |
| (Q1-Q2)                            | (Q2-Q3)                           | (Q3-Q4)                       |
|  • Isolation RLS Supabase          |  • Modules & plateforme prop.     |  • Commandes auto EDI API     |
|  • SAML 2.0 / Okta / Azure AD      |  • WebSockets OBD-II en direct    |  • Traçabilité RFID / Code-B. |
|  • Audit Logs infalsifiables       |  • IA Prédictive avant alerte R1    |  • Calendriers PM Schedules   |
+------------------------------------+-----------------------------------+-------------------------------+
| PHASE 4 : Conformité SCF & CNAS    | PHASE 5 : PWA Offline-First       | OBJECTIF FINAL                |
| (Q4-Q1)                            | (Q1+)                             |                               |
|  • Plan Comptable SCF automatisé   |  • Sync hors-ligne (Atelier/Route)|  LEADER MONDIAL DECISION      |
|  • Déclarations DAS CNAS RH        |  • Portail Garages Partenaires    |  ENGINE FLOTTES & TÉLÉMATIQUE |
|  • Reporting ESG & Bilan Carbone   |  • API Webhooks ouvertes          |                               |
+------------------------------------+-----------------------------------+-------------------------------+
```

### Phase 1 : Socle Entreprise & Sécurité RLS Multi-Tenant (Q1-Q2)
* **Objectif** : Assurer une sécurité et une isolation des données de niveau bancaire pour les grands comptes et multinationales.
* **Livrables techniques** :
  1. **Row-Level Security (RLS) Supabase** : Activer des politiques RLS strictes sur toutes les tables (`vehicles`, `work_orders`, `inventory_items`, `alerts`) basées sur un `tenant_id` chiffré dans le JWT de l'utilisateur.
  2. **Authentification Unique (SSO / SAML 2.0 / OIDC)** : Support natif d'Azure Active Directory (Entra ID), Okta et Google Workspace pour les grandes flottes.
  3. **Audit Trails & Conformité ISO 27001** : Journalisation immuable de chaque remplacement de pièce, modification de règle R1-R7 et approbation de budget CAE.

### Phase 2 : IoT CanBus / OBD-II en Temps Réel & IA Prédictive (Q2-Q3)
* **Objectif** : Passer de la télématique déclarative au streaming IoT en temps réel avec prédiction de pannes avant casse.
* **Livrables techniques** :
  1. **Connecteurs modules & plateforme propriétaires** : Intégrations directes de nos propres modules connectés matériels et de notre plateforme IoT dédiée, assurant une remontée directe sans dépendances tierces (avec compatibilité ouverte Teltonika, Ruptela, Webfleet).
  2. **Passerelle de streaming (WebSockets / MQTT)** : Mises à jour en direct (`sub-second`) de la position GPS et des codes défauts OBD-II dans le **Fleet Health Grid**.
  3. **IA Prédictive (Gemini & Machine Learning Edge)** :
     * Modèle de régression sur la dégradation des freins, la température de transmission et les vibrations moteur.
     * Déclenchement d'une alerte **R1-Prédictive** 72h avant que le seuil critique de panne ne soit physiquement atteint.

### Phase 3 : Logistique EDI, Traçabilité RFID & PM Schedules (Q3-Q4)
* **Objectif** : Éliminer la rupture de stock d'atelier et automatiser la chaîne d'approvisionnement des pièces détachées.
* **Livrables techniques** :
  1. **Approvisionnement Automatisé EDI / API** : Connexion directe aux catalogues de grossistes (ex: Bosch, Valeo, Michelin). Lorsqu'une règle **R3** détecte un stock sous le seuil, un bon de commande fournisseur est généré et transmis par API.
  2. **Traçabilité RFID & Code-barres Mobile** : Lecteur de code-barres par caméra dans **Mechanic Mobile Queue** pour scanner immédiatement les pièces sorties du magasin.
  3. **Maintenance Préventive Planifiée (PM Schedules)** : Génération automatique d'ordres de travail calendaires ou kilométriques (ex: Vidange tous les 15 000 km, contrôle technique annuel).

### Phase 4 : Conformité Comptable SCF, Sociale CNAS & RSE/ESG (Q4-Q1)
* **Objectif** : Intégrer nativement la gestion de flotte dans la gouvernance financière et légale de l'entreprise.
* **Livrables techniques** :
  1. **Intégration Comptable SCF (Système Comptable Financier)** :
     * Ventilation automatique des dépenses d'entretien et de pièces par centre de coût (compte de charge 615 *Entretien et Réparations*, compte de stock 38 *Achats stockés*).
     * Connecteurs d'export vers SAP, Oracle, Odoo et Sage.
  2. **Déclarations CNAS & Suivi Main d'Œuvre Atelier** :
     * Calcul automatisé du temps de travail effectif des mécaniciens, valorisation des heures supplémentaires et édition des annexes DAS pour les cotisations sociales.
  3. **Module ESG & Bilan Carbone (GHG Protocol)** :
     * Calcul des émissions de CO₂ Scope 1 (carburant consommé) et identification des véhicules surconsommateurs par rapport aux normes constructeur.

### Phase 5 : Mobilité Offline-First & Écosystème Prestataires (Q1+)
* **Objectif** : Garantir la continuité opérationnelle sur le terrain (hangars sans réseau, routes isolées) et intégrer les garages sous-traitants.
* **Livrables techniques** :
  1. **Architecture PWA Offline-First (IndexedDB / Service Worker)** :
     * Permettre aux mécaniciens de saisir leurs diagnostics, photos et pièces consommées **sans connexion internet**.
     * Synchronisation transactionnelle sans conflit au retour du réseau WiFi/4G.
  2. **Portail Prestataires & Garages Partenaires** :
     * Accès externe restreint pour les garages sous-traitants afin qu'ils acceptent les ordres de travail externalisés et soumettent leurs factures conformes à la formule **R4**.
  3. **Webhooks & API Ouvertes NextTransit** :
     * Documentation OpenAPI 3.0 permettant l'interconnexion avec les systèmes de gestion de transport (TMS) et WMS des clients.

---

## 6. Architecture Technique & Indicateurs de Succès

### Pile Technique
* **Frontend** : React 18+, TypeScript (Strict Type Checking), Vite, Tailwind CSS, Lucide Icons.
* **Gestion d'État** : Context API (`FleetContext`) avec synchronisation Supabase en temps réel.
* **Stockage Cloud** : Supabase PostgreSQL, Row-Level Security (RLS), Realtime Channels.
* **Routage** : `react-router-dom` synchronisé de manière bidirectionnelle avec la matrice RBAC.

### Indicateurs Clés de Performance (KPIs de Succès du SaaS)
1. **Taux de disponibilité opérationnelle de la flotte (Fleet Uptime)** : Objectif **> 96.5%** sur les flottes clientes après 3 mois d'utilisation.
2. **Réduction des pannes sur route (Roadside Breakdowns)** : Objectif **-45%** grâce à l'application stricte des règles **R1** et **R2**.
3. **Précision budgétaire (Variance R7)** : Écart de prévision ramené à **< 5%** sur l'exercice comptable.
4. **Temps de cycle de réparation (Mean Time to Repair - MTTR)** : Réduction de **30%** via l'application mobile atelier guidée et la réservation automatique **R3**.
