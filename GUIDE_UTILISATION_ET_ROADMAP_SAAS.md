NextTransit — Guide d’Utilisation & Roadmap d’Implémentation

Version mise à jour — 16 août 2026

NextTransit est une plateforme SaaS de gestion opérationnelle de flotte, de réconciliation télématique et de décision de maintenance.

Principe non négociable : la télématique est une couche d’abstraction véhicule-agnostique. Traccar, Flespi, Teltonika, Wialon ou la saisie manuelle sont des points d’entrée. Le moteur décisionnel R1–R7 reste indépendant des fournisseurs télématiques.

1. Positionnement

NextTransit relie :

télématique / GPS / CAN / OBD ;

inspections et signalements terrain ;

maintenance ;

disponibilité de flotte ;

stocks et pièces ;

coûts et budgets ;

décision opérationnelle.

Provider télématique
        ↓
Adapter
        ↓
Validation / Parsing
        ↓
CanonicalTelemetryEvent
        ↓
DeviceResolver
        ↓
device_mappings
        ↓
Tenant + Vehicle
        ↓
R1–R7

La différenciation de NextTransit repose sur la réconciliation télématique + terrain + maintenance + décision financière, et non sur le simple tracking GPS.

2. Principes d’architecture non négociables

2.1 Provider-agnostic

Aucune logique métier ne doit être placée dans :

TraccarAdapter

FlespiAdapter

TeltonikaAdapter

WialonAdapter

ManualEntryAdapter

Tous doivent produire le même CanonicalTelemetryEvent.

2.2 Tenant = autorité de la base

Le payload télématique ne détermine jamais le tenant.

external_device_id
       ↓
DeviceResolver
       ↓
device_mappings
       ↓
tenant_id + vehicle_id

Tout tenantId fourni par un provider est ignoré pour la résolution métier.

2.3 Idempotence

L’autorité finale est PostgreSQL :

telemetry_events.event_id
UNIQUE(event_id)

Redis est un mécanisme de protection/optimisation, jamais le remplacement de PostgreSQL.

2.4 Fail-closed

En production :

secret invalide → rejet ;

gateway inactive → rejet ;

rate limit dépassé → 429 ;

replay → rejet/ignoré ;

payload invalide → rejet ;

cross-tenant spoofing → rejet ;

Redis indisponible pour les contrôles de sécurité → rejet ;

aucun fallback silencieux vers la mémoire.

3. RBAC et isolation multi-tenant

Rôle

Identifiant

Responsabilité

Super Administrateur

SUPER_ADMIN

Plateforme, tenants, gateways, sécurité

Directeur Général

DIRECTOR

KPI, arbitrage, disponibilité

Gestionnaire Flotte

FLEET_MANAGER

Exploitation et santé flotte

Responsable Maintenance

MAINTENANCE_MANAGER

Atelier, garanties, interventions

Contrôleur Financier

FINANCE

Budget et coûts

Responsable Opérations

OPERATIONS

Stocks et exploitation

Mécanicien

MECHANIC

Exécution des travaux

Chauffeur

DRIVER

DVIR et signalements

Le scénario suivant est obligatoirement rejeté :

Gateway TENANT_A
       +
Device réellement mappé à TENANT_B
       ↓
CROSS-TENANT SPOOFING REJECTED

4. Moteur décisionnel R1–R7

Le moteur métier reste indépendant de la couche télématique.

R1 — Arrêt d’urgence / Critical Health

Défaut critique ou état dangereux → véhicule Unsafe / Red, intervention urgente et blocage opérationnel selon les règles de dispatch.

R2 — Conflit de planning

Véhicule planifié prochainement + maintenance incompatible → alerte et remplacement/priorisation.

R3 — Réservation de stock

Réservation des pièces à la création de l’intervention, consommation définitive à la clôture.

R4 — Coût total de réparation

Total = (Labor Hours × Hourly Rate)
      + Σ(Part Quantity × Part Unit Cost)

R5 — Arbitrage budgétaire

Priorisation des interventions selon criticité, proximité de mission, coût et retour attendu.

R6 — Réconciliation télématique / terrain

Signalement mécanique non confirmé par les capteurs → investigation atelier.

R7 — Variance financière

Comparaison budget prévisionnel / dépenses réelles de maintenance et exploitation.

R1–R7 ne doit pas être modifié lors de l’ajout d’un provider télématique.

5. Modules fonctionnels

Le document initial annonçait 13 modules ; le périmètre actuel décrit 20 espaces/modules :

#

Module

Route

1

Landing / Démos

/

2

Strategic Dashboard

/dashboard

3

Variance / R7

/variance

4

Fleet Health / R1

/vehicles

5

Inventory / R3

/inventory

6

Work Orders / R4

/work-orders

7

Conflict Alerts / R2

/conflicts

8

CAE / R5

/cae

9

Incident Reports / R6

/incidents

10

Mechanic Mobile

/mechanic

11

Driver Mobile

/driver

12

Tenant Configuration

/tenant-config

13

Translation Center

/translation

14

Warranty Tracking

/warranties

15

Fuel & Consumption

/fuel

16

Telemetry Stream

/telemetry

17

Audit Log

/audit

18

Team Invitations

/invitations

19

Billing & Subscriptions

/billing

20

RBAC Forbidden

/forbidden

6. Architecture télématique actuelle

Couche d’abstraction

TelematicsProviderAdapter
        │
        ├── FlespiAdapter
        ├── TraccarAdapter
        ├── ManualEntryAdapter
        ├── TeltonikaAdapter
        └── futurs adapters

Le Registry permet d’ajouter un provider sans modifier la logique métier.

Canonical Event

Traccar ──────┐
Flespi ───────┤
Manual ───────┼──> CanonicalTelemetryEvent ──> R1–R7
Teltonika ────┤
Wialon ───────┘

Device Mapping

device_mappings est l’autorité de résolution du device vers :

provider ;

identifiant externe ;

véhicule ;

tenant ;

état actif.

7. État réel d’avancement

Phase 2A — Telemetry Abstraction Layer

✅ COMPLÉTÉE / VALIDÉE

Réalisé :

TelematicsProviderAdapter ;

Provider Registry ;

CanonicalTelemetryEvent ;

normalisation commune ;

DeviceResolver ;

device_mappings comme autorité ;

idempotence finale PostgreSQL ;

séparation complète avec R1–R7.

Phase 2B — Flespi / Pipeline initial

✅ INTÉGRÉE

Flespi constitue le premier provider de référence historique, sans privilège architectural sur les autres providers.

Phase 2C — Traccar Adapter

✅ VALIDÉE PAR TESTS

Réalisé/validé :

TraccarAdapter ;

validation Zod stricte ;

fail-closed des payloads malformés ;

extraction de uniqueId ;

normalisation Canonical Event ;

authentification déléguée par adapter ;

absence de logique provider dans server.ts ;

DeviceResolver ;

protection cross-tenant.

Test critique

Payload Traccar
      ↓
uniqueId
      ↓
device_mappings
      ↓
Tenant réel

Le tenantId provenant du payload n’est jamais une autorité.

Phase 2D — Webhook Security Hardening

✅ COMPLÉTÉE / TESTS PASSÉS

Mis en place :

WebhookSecurityService ;

authentification abstraite ;

telematics_gateways ;

token hashé ;

Rate Limiting ;

Replay Protection ;

fenêtre temporelle ;

protection cross-tenant ;

UNIQUE(event_id) PostgreSQL.

Tests validés

WebhookSecurity.test.ts → PASS

TraccarIntegration.test.ts → PASS

Les problèmes de SUPABASE_SERVICE_ROLE_KEY dans l’environnement de test et de pollution inter-tests du ReplayProtection ont été corrigés.

8. Phase 2E — Redis + BullMQ

🟢 STATUT : TERMINÉE ET VÉRIFIÉE

Objectif : transformer le pipeline synchrone en ingestion distribuée, résiliente et observable.

Webhook
   ↓
WebhookSecurityService
   ↓
Redis Rate Limit / Replay
   ↓
BullMQ: telemetry-ingestion
   ↓
Telemetry Worker
   ↓
Adapter Registry
   ↓
Zod / Parse / Normalize
   ↓
DeviceResolver
   ↓
Cross-Tenant Check
   ↓
PostgreSQL
   ↓
R1–R7

Producer

Le webhook :

reçoit le payload raw ;

génère correlation_id ;

authentifie la gateway ;

applique le Rate Limiting Redis ;

applique le contrôle replay ;

ajoute le job à BullMQ ;

retourne 202 Accepted.

Worker

Le worker :

récupère le job ;

sélectionne dynamiquement l’adapter via Registry ;

valide et parse ;

résout le device ;

résout le tenant ;

vérifie le cross-tenant ;

normalise ;

applique l’idempotence ;

écrit telemetry_events et positions ;

déclenche R1–R7.

Redis

Remplacement des stores mémoire par Redis :

MemoryRateLimitStore → RedisRateLimitStore
MemoryReplayStore    → RedisReplayStore

Politique de production (Fail-closed) :

Redis DOWN
   ↓
FAIL CLOSED
   ↓
Webhook rejeté

BullMQ

Configuration initiale :

Paramètre

Valeur

Queue

telemetry-ingestion

Concurrency

10

Max attempts

3

Backoff

Exponentiel

Exemple

2s / 4s / 8s

Timeout

10 s

DLQ

Jobs failed

Shutdown

Graceful SIGTERM

La concurrence sera calibrée après les tests de charge.

DLQ

Aucun secret ne doit être stocké.

Métadonnées autorisées :

event_id ;

provider ;

external_device_id ;

tenant résolu si disponible ;

erreur ;

retries ;

timestamp ;

correlation_id.

9. Roadmap produit révisée

Le roadmap initial doit maintenant distinguer fondation technique, MVP commercial et extensions Enterprise.

Phase 1 — Socle SaaS

🟢 Fondation

multi-tenant ;

RBAC ;

PostgreSQL/Supabase ;

RLS ;

utilisateurs ;

véhicules ;

maintenance ;

stocks ;

audit ;

billing ;

FR/AR/EN.

Phase 2 — Telemetry Abstraction & Security

🟢 En grande partie réalisée

2A Telemetry Abstraction  ✅
2B Flespi Pipeline        ✅
2C Traccar Adapter        ✅
2D Webhook Security       ✅
2E Redis + BullMQ         🟡 NEXT

Phase 3 — Production MVP / Fleet Pilot

🔴 PRIORITÉ COMMERCIALE APRÈS 2E

onboarding tenant fiable ;

mapping boîtiers ;

ingestion distribuée ;

supervision ;

maintenance ;

DVIR ;

R1–R7 ;

monitoring ;

backups ;

procédures d’exploitation ;

première flotte réelle.

Phase 4 — Industrialisation

scaling horizontal ;

workers séparés ;

monitoring avancé ;

alerting ;

API publique ;

OpenAPI ;

CI/CD ;

disaster recovery ;

tests de charge récurrents.

Phase 5 — Intelligence prédictive

Après accumulation de données réelles :

détection d’anomalies ;

scoring de dégradation ;

prédiction maintenance ;

analyse consommation ;

modèles statistiques/ML ;

recommandations.

L’IA prédictive ne doit pas précéder la qualité et la traçabilité des données réelles.

Phase 6 — Écosystème Enterprise

EDI ;

fournisseurs de pièces ;

garages partenaires ;

API TMS/WMS ;

RFID/barcodes ;

intégrations ERP ;

SSO ;

ESG/CO₂ ;

offline-first avancé.

10. Architecture technique cible

Frontend

React / TypeScript ;

Tailwind CSS ;

RBAC ;

FR / AR / EN ;

RTL.

Backend

Node.js ;

TypeScript strict ;

API HTTP ;

services métier séparés ;

workers BullMQ.

Base de données

PostgreSQL / Supabase
        │
        ├── tenants
        ├── users
        ├── vehicles
        ├── device_mappings
        ├── telematics_gateways
        ├── telemetry_events
        ├── positions
        ├── work_orders
        ├── inventory
        └── audit logs

Cache / Queue

Redis
 ├── Rate Limiting
 ├── Replay Protection
 └── BullMQ
      └── telemetry-ingestion

Architecture cible compatible :

Docker local ;

VPS ;

cloud ;

déploiement souverain.

11. Sécurité, résilience et observabilité

Sécurité

RLS ;

RBAC ;

secrets backend-only ;

hash des tokens gateway ;

fail-closed ;

Zod ;

anti-replay ;

rate limiting ;

cross-tenant protection ;

idempotence PostgreSQL ;

audit.

Phase 2F — Observabilité et Monitoring

redis_status
queue_waiting
queue_active
queue_failed

webhook_rejected
rate_limit_violations
replay_attempts

queue_latency
processing_latency
redis_latency
db_latency

retry_count

Corrélation :

correlation_id
job_id
event_id

12. Plan de validation MVP

Sécurité

mauvais secret ;

gateway inactive ;

provider inexistant ;

device inconnu ;

device inactif ;

cross-tenant spoofing ;

payload malformé ;

payload trop volumineux ;

flood webhook.

Replay / idempotence

replay Redis ;

duplicate event ;

concurrence sur même événement ;

UNIQUE(event_id) PostgreSQL.

Résilience

Redis indisponible ;

PostgreSQL indisponible ;

queue indisponible ;

retry ;

DLQ ;

graceful shutdown.

Charge

Scénarios minimum :

100 véhicules × 1 événement / 10 s
500 véhicules × 1 événement / 10 s
1 000 véhicules × 1 événement / 10 s

Puis montée progressive.

13. KPIs de succès

Les objectifs suivants sont des cibles produit et non encore des résultats mesurés sur une flotte de production.

KPI

Objectif

Disponibilité flotte

> 96,5 %

Réduction pannes route

-45 %

Écart prévisionnel R7

< 5 %

Réduction MTTR

-30 %

Webhooks correctement traités

> 99,9 %

Perte d’événements acceptés

0

Isolation cross-tenant

100 %

Protection des duplicates

100 %

14. Prochaines étapes prioritaires

🔴 Priorité 1 — Phase 2E

Implémenter :

ioredis ;

bullmq ;

RedisRateLimitStore ;

RedisReplayStore ;

TelemetryQueue ;

TelemetryWorker ;

Producer / Worker séparés ;

retry ;

DLQ ;

graceful shutdown ;

observabilité ;

tests Redis/BullMQ.

🔴 Priorité 2 — Validation production

Avant une flotte importante :

tests de charge ;

panne Redis ;

panne PostgreSQL ;

concurrence ;

cross-tenant ;

récupération ;

monitoring ;

backup ;

restauration.

🟠 Priorité 3 — Premier pilote réel

Après validation Phase 2E :

Boîtier réel
   ↓
Gateway / Provider
   ↓
NextTransit Webhook
   ↓
Redis
   ↓
BullMQ `telemetry-ingestion`
   ↓
Worker Indépendant (`worker.ts`)
   ↓
TelemetryIngestionService
   ↓
PostgreSQL
   ↓
R1–R7
   ↓
Dashboard

Mesurer :

qualité des données ;

fréquence réelle ;

couverture des capteurs ;

latence ;

faux positifs ;

disponibilité ;

valeur réelle des alertes.

🏁 État global au 16 août 2026

Domaine

État

Architecture multi-tenant

🟢 Avancée

Device Mapping

🟢 En place

Telemetry Abstraction

🟢 Validée

Flespi Adapter

🟢 Intégrée

Traccar Adapter

🟢 Tests passés

Webhook Security

🟢 Tests passés

Anti-Replay mémoire

🟢 Validé

Rate Limiting mémoire

🟢 Validé

PostgreSQL idempotency

🟢 Autorité finale

Redis distribué

🟡 Phase 2E

BullMQ

🟡 Phase 2E

Worker distribué

🟡 Phase 2E

Load Testing

🟡 À réaliser

Observabilité distribuée

🟡 Phase 2E

Pilote flotte réel

🟡 Prochaine étape

IA prédictive

⚪ Après données réelles

API Enterprise

⚪ Future phase

Offline-first avancé

⚪ Future phase

Conclusion

NextTransit a maintenant dépassé le simple prototype de télématique.

La trajectoire est :

Provider
   ↓
Telemetry Abstraction
   ↓
Canonical Event
   ↓
Device Mapping
   ↓
Security
   ↓
Redis + BullMQ
   ↓
PostgreSQL
   ↓
R1–R7
   ↓
Production MVP
   ↓
Fleet Pilot
   ↓
Industrialisation
   ↓
Predictive Intelligence

Le prochain jalon critique n’est plus l’ajout d’un provider.

Le prochain jalon est de rendre l’ingestion distribuée, résiliente, observable et testable sous charge, puis de la confronter à une flotte réelle.

C’est cette étape qui permettra de transformer l’architecture actuelle en MVP NextTransit réellement exploitable en production.