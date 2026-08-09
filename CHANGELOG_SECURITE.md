# Journal des Modifications de Sécurité (CHANGELOG_SECURITE.md)
**Projet :** NextTransit (`nexttransit_cloud`)  
**Date :** 9 Août 2026

---

## Modifications de Durcissement Infrastructure & Sécurité Production

* **Tâche 1 (Headers HTTP Helmet & CSP) — 09/08/2026 :** Ajout de la dépendance `helmet` v8.0.0 et configuration d'une Content Security Policy (CSP) stricte dans `server.ts` avec `connect-src` scopé uniquement à Supabase (`*.supabase.co`), `frame-ancestors 'none'`, `object-src 'none'`, HSTS, et `X-Content-Type-Options: nosniff`.
* **Tâche 2 (Politique CORS Explicite) — 09/08/2026 :** Mise à jour du middleware CORS dans `server.ts` avec whitelist `ALLOWED_ORIGINS`, headers `Authorization` et `X-Tenant-Id` explicites, et réponse **HTTP 403 Forbidden** automatique pour toute requête cross-origin non autorisée.
* **Tâche 3 (Rate Limiting Persistant) — 09/08/2026 :** Migration du stockage de rate limiting de `authService.ts` vers la nouvelle table Supabase `login_attempts` (`20260809000000_login_attempts_table.sql`) avec test unitaire dédié (`authRateLimit.test.ts`) validant la persistance du verrouillage de compte (5 tentatives, 15 min) après redémarrage.
* **Tâche 4 (Audit RLS Automatisé) — 09/08/2026 :** Rédaction du script d'audit SQL exhaustif dans `supabase/tests/rls-isolation-test.sql` vérifiant l'activation de la RLS et l'isolation par tenant sur 100% des tables du schéma, et intégration dans la CI GitHub Actions `.github/workflows/ci-cd.yml`.

---

## Rapport d'Exécution & de Conformité

- **TypeScript Typecheck (`tsc --noEmit`) :** 0 erreur.
- **Tests Unitaires (Vitest) :** Tous les tests passent avec succès (Decision Engine, Auth Rate Limiting, Fuel, Warranty, Audit).
