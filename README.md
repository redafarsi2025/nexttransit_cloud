# 🚛 NextTransit AI Studio — Fleet Operations, Telemetry Reconciliation & Maintenance Decision Engine

**NextTransit** est une plateforme SaaS mission-critique d'aide à la décision de maintenance, de réconciliation télématique OBD-II et de contrôle budgétaire pour les flottes de transport, BTP, logistique et industrie.

---

## 📚 Documentation & Guides

* 📖 **[Guide d'Utilisation Détaillé & Roadmap SaaS Niveau Mondial](./GUIDE_UTILISATION_ET_ROADMAP_SAAS.md)** — *Manuel utilisateur complet (Rôles RBAC, Règles R1-R7, Guide des 13 écrans) et feuille de route stratégique en 5 phases (Q1 à Q4+).*
* 🛠️ **[Developer Guide — Architecture & Schema Mapping](./developer_guide.md)** — *Architecture technique, spécification de l'état réactif (`FleetContext`) et schémas Supabase.*
* 🤖 **[AGENTS.md — Directives & Principes Métier](./AGENTS.md)** — *Règles métier immutables et principes de développement.*

---

## 🚀 Démarrage Rapide (Développement Local)

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Démarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

3. **Vérifier les types et compiler (Build de production)** :
   ```bash
   npm run build
   ```

---

## 🔑 Les 7 Règles Métier d'Or (Decision Engine R1–R7)

* **R1 (Arrêt d'Urgence / Red Alert)** : Tout défaut OBD `Critical` bascule immédiatement le véhicule en `Unsafe / Red` et interdit tout départ.
* **R2 (Prévention de Conflit d'Horaire)** : Détection proactive des véhicules planifiés pour un départ dans `< 3 jours` ayant un ordre de travail ouvert.
* **R3 (Système de Réservation d'Inventaire)** : Réservation automatique des pièces à la création d'un ordre de travail et déduction du stock à la clôture.
* **R4 (Formule du Coût Total de Réparation)** : `Coût Total = (Heures × Taux Horaire) + SOMME(Quantité × Coût Unitaire)`.
* **R5 (Score d'Arbitrage Budget CAE)** : Priorisation des réparations selon `Sévérité (40%) + Jours avant départ (30%) + ROI (30%)`.
* **R6 (Réconciliation Télématique & Incidents Chauffeurs)** : Création automatique d'un ordre d'enquête mécanique pour tout signalement chauffeur non détecté par les capteurs électroniques.
* **R7 (Analyse de Variance Budgétaire SCF)** : Comparaison des dépenses réelles par rapport au budget prévisionnel (Moteur, Électricité, Freinage, Châssis/Pneumatiques).
