import React from 'react';
import {
  Settings, ShieldCheck, Radio, Sparkles, Database,
  AlertTriangle, Lock, ExternalLink
} from 'lucide-react';

/**
 * GlobalSettings — Platform Configuration (Read-Only View)
 *
 * AGENTS.md §26 / §30: Ces paramètres sont gérés via des variables d'environnement
 * (.env, Supabase Edge Function Config) et des migrations DB.
 * Il n'existe pas encore de table `platform_config` — ajouter un formulaire de sauvegarde
 * factice (setTimeout) violerait §30 (NO FALSE COMPLETION).
 *
 * Lorsqu'une table platform_config sera créée via migration, ce composant sera mis à jour
 * pour permettre la modification depuis l'UI.
 */
export const GlobalSettings: React.FC = () => {
  const envVars = [
    { key: 'VITE_SUPABASE_URL', description: 'URL du projet Supabase', sensitive: false },
    { key: 'VITE_SUPABASE_PUBLISHABLE_KEY', description: 'Clé anon Supabase (publique)', sensitive: false },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Service Role (backend uniquement)', sensitive: true },
    { key: 'GEMINI_API_KEY', description: 'Clé API Gemini (backend uniquement)', sensitive: true },
    { key: 'FLESPI_WEBHOOK_SECRET', description: 'Secret webhook Flespi', sensitive: true },
    { key: 'ALLOWED_ORIGINS', description: 'CORS origines autorisées (virgule séparées)', sensitive: false },
  ];

  const protocolSupport = [
    { label: 'OBD-II Générique (SAE J1979)', status: 'active', note: 'Couvert par le Rule Engine (DTC P-codes)' },
    { label: 'J1939 CAN Bus', status: 'planned', note: 'Phase 2B — adapter Flespi/Teltonika' },
    { label: 'Flespi REST Webhook', status: 'active', note: 'TelemetryIngestionService + FlespiAdapter' },
    { label: 'Wialon IPS', status: 'planned', note: 'Phase 2B — WialonAdapter à implémenter' },
    { label: 'Teltonika FMCXXX (TCP)', status: 'planned', note: 'Phase 2B — TeltonikaAdapter à implémenter' },
    { label: 'Saisie manuelle', status: 'active', note: 'ManualEntryAdapter disponible' },
  ];

  const featureFlags = [
    { label: 'Multi-tenancy', status: true, note: 'Actif — RLS Supabase + tenant_id isolation' },
    { label: 'RBAC (8 rôles)', status: true, note: 'DIRECTOR, FLEET_MANAGER, MECHANIC, DRIVER...' },
    { label: 'Predictive AI (Gemini)', status: true, note: '/api/predictive-ai — GEMINI_API_KEY requis' },
    { label: 'Télémétrie temps réel', status: false, note: 'Phase 2B — broadcaster SSE/WebSocket' },
    { label: 'SCF / CNAS Export', status: false, note: 'Phase 3+ — non implémenté' },
    { label: 'Offline PWA', status: false, note: 'Phase 3+ — non implémenté' },
    { label: 'EDI Fournisseurs', status: false, note: 'Phase 3+ — non implémenté' },
    { label: 'RFID Asset Tracking', status: false, note: 'Phase 3+ — non implémenté' },
  ];

  return (
    <div className="space-y-8 max-w-4xl" id="global-settings-root">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <Settings className="w-6 h-6 mr-3 text-indigo-500" />
          Configuration Plateforme
        </h1>
        <p className="text-slate-400 mt-1">
          Vue de la configuration active de la plateforme NextTransit. Lecture seule — modification via <code className="text-slate-300">.env</code> et migrations Supabase.
        </p>
      </div>

      {/* Read-only notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start">
        <AlertTriangle className="w-5 h-5 text-amber-400 mr-3 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-300">
          <p className="font-semibold">Lecture seule — Pas de table platform_config</p>
          <p className="mt-1 opacity-90">
            Les paramètres plateforme sont définis via des variables d'environnement et des migrations DB.
            Une interface de modification sera disponible après création de la table <code>platform_config</code>.
            Toute modification directe doit être faite via le fichier <code>.env</code> ou les secrets Supabase.
          </p>
        </div>
      </div>

      {/* Env vars */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center mb-4">
          <Database className="w-5 h-5 mr-2 text-indigo-400" />
          Variables d'environnement
        </h2>
        <div className="space-y-3">
          {envVars.map(v => {
            const isSet = !!import.meta.env[v.key] || !!process?.env?.[v.key];
            return (
              <div key={v.key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {v.sensitive
                    ? <Lock className="w-4 h-4 text-slate-500" />
                    : <Database className="w-4 h-4 text-slate-500" />
                  }
                  <div>
                    <code className="text-sm text-slate-200">{v.key}</code>
                    <p className="text-xs text-slate-500">{v.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.sensitive && (
                    <span className="text-xs text-slate-500 italic">backend uniquement</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isSet
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {isSet ? 'Définie' : 'Non détectée côté client'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Les variables <code>SUPABASE_SERVICE_ROLE_KEY</code> et <code>GEMINI_API_KEY</code> ne sont jamais exposées au navigateur (backend Express uniquement — AGENTS.md §5).
        </p>
      </section>

      {/* Feature Flags */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center mb-4">
          <Sparkles className="w-5 h-5 mr-2 text-indigo-400" />
          Feature Flags — État de la roadmap
        </h2>
        <div className="space-y-2">
          {featureFlags.map(f => (
            <div key={f.label} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <div>
                <span className="text-sm text-slate-200">{f.label}</span>
                <p className="text-xs text-slate-500 mt-0.5">{f.note}</p>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                f.status
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {f.status ? 'Actif' : 'Non déployé'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Protocol Support */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center mb-4">
          <Radio className="w-5 h-5 mr-2 text-indigo-400" />
          Protocoles Télémétrie Supportés
        </h2>
        <div className="space-y-2">
          {protocolSupport.map(p => (
            <div key={p.label} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <div>
                <span className="text-sm text-slate-200">{p.label}</span>
                <p className="text-xs text-slate-500 mt-0.5">{p.note}</p>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                p.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {p.status === 'active' ? 'Opérationnel' : 'Planifié'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Security posture */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center mb-4">
          <ShieldCheck className="w-5 h-5 mr-2 text-indigo-400" />
          Posture de Sécurité
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: 'RLS Supabase', note: 'Actif — isolation tenant par politique PostgreSQL' },
            { label: 'CORS Whitelist', note: 'ALLOWED_ORIGINS env — 403 si origine non autorisée' },
            { label: 'Helmet + CSP', note: 'Express — headers sécurité (X-Frame, HSTS, CSP)' },
            { label: 'JWT Verification', note: 'Côté serveur — requirePlatformAdmin middleware' },
            { label: 'Rate Limiting', note: '30 req/min par IP — en mémoire (à migrer vers Redis)' },
            { label: 'Audit Trail', note: 'Toutes mutations admin journalisées dans audit_logs' },
          ].map(item => (
            <div key={item.label} className="flex items-start p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 mr-2 shrink-0" />
              <div>
                <span className="text-sm font-medium text-emerald-300">{item.label}</span>
                <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center text-xs text-slate-500">
          <ExternalLink className="w-3.5 h-3.5 mr-1" />
          Règles complètes dans{' '}
          <code className="mx-1 text-slate-400">AGENTS.md</code> v3.0 — Sections 4, 5, 6, 20, 25.
        </div>
      </section>
    </div>
  );
};
