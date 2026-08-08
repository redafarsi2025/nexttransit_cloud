import React, { useState } from 'react';
import { Settings, Save, ShieldCheck, ToggleLeft, ToggleRight, Radio, Sliders, Sparkles, Check, Database, RefreshCw } from 'lucide-react';

export const GlobalSettings: React.FC = () => {
  const [saasMode, setSaasMode] = useState<'multi' | 'dedicated'>('multi');
  const [publicReg, setPublicReg] = useState(false);
  const [trialDays, setTrialDays] = useState(14);
  const [retentionDays, setRetentionDays] = useState(365);
  const [encryptionRequired, setEncryptionRequired] = useState(true);
  const [obdGeneric, setObdGeneric] = useState(true);
  const [j1939Can, setJ1939Can] = useState(true);
  const [mfgSpecific, setMfgSpecific] = useState(false);
  const [aiEngine, setAiEngine] = useState(true);
  const [multiWarehouse, setMultiWarehouse] = useState(true);
  const [tachygraph, setTachygraph] = useState(true);
  const [mapsGrounding, setMapsGrounding] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl" id="global-settings-root">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <Settings className="w-6 h-6 mr-3 text-indigo-500" />
          Global Platform Config & SaaS Feature Flags
        </h1>
        <p className="text-slate-400 mt-1">Configure security guidelines, active telemetry parsers, and enterprise modules available to tenants.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SaaS Deployment Model */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-medium text-slate-100 flex items-center border-b border-slate-700/60 pb-3">
            <Database className="w-5 h-5 mr-2 text-indigo-400" />
            Platform Hosting & Deployment Mode
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setSaasMode('multi')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                saasMode === 'multi'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-900/30 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 text-sm">Multi-Tenant Shared</span>
                <input
                  type="radio"
                  checked={saasMode === 'multi'}
                  onChange={() => setSaasMode('multi')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All client workspaces run isolated on a shared Postgres instance using Row-Level Security (RLS) policies scoped with tenant_id. Optimal for standard subscription tiers.
              </p>
            </div>

            <div
              onClick={() => setSaasMode('dedicated')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                saasMode === 'dedicated'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-900/30 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 text-sm">Dedicated Single-Tenant Instance</span>
                <input
                  type="radio"
                  checked={saasMode === 'dedicated'}
                  onChange={() => setSaasMode('dedicated')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provision a physically separated database cluster, custom S3 assets bucket, and independent EMQX broker endpoints for premium Enterprise custom tenants.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Client Trial Period (Days)</label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-750 self-end">
              <div>
                <p className="text-sm font-medium text-slate-200">Public Self-Registration</p>
                <p className="text-xs text-slate-400 mt-0.5">Allows new tenants to self-onboard and subscribe.</p>
              </div>
              <button
                type="button"
                onClick={() => setPublicReg(!publicReg)}
                className="p-1 focus:outline-none text-slate-400 hover:text-slate-200"
              >
                {publicReg ? (
                  <ToggleRight className="w-10 h-10 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Global Security & Governance */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-medium text-slate-100 flex items-center border-b border-slate-700/60 pb-3">
            <ShieldCheck className="w-5 h-5 mr-2 text-indigo-400" />
            Security & Tenant-Scoped Audit Trail
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Audit Log Retention (Days)</label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value={90}>90 Days</option>
                <option value={180}>180 Days</option>
                <option value={365}>1 Year (Recommended)</option>
                <option value={1825}>5 Years (Regulatory Compliant)</option>
                <option value={99999}>Indefinite / Permanent Retention</option>
              </select>
              <p className="text-xs text-slate-400 mt-2">
                Tenant-scoped mutations to vehicles, CAE budgets, and active DTC fault codes are immutable and cannot be deleted by tenant admins.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-750">
              <div>
                <p className="text-sm font-medium text-slate-200">Force Hardware Token Signatures</p>
                <p className="text-xs text-slate-400 mt-0.5">Require SHA-256 HMAC encryption on raw Teltonika pings.</p>
              </div>
              <button
                type="button"
                onClick={() => setEncryptionRequired(!encryptionRequired)}
                className="p-1 focus:outline-none text-slate-400 hover:text-slate-200"
              >
                {encryptionRequired ? (
                  <ToggleRight className="w-10 h-10 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* OBD & Telemetry Protocol Parsers */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-medium text-slate-100 flex items-center border-b border-slate-700/60 pb-3">
            <Radio className="w-5 h-5 mr-2 text-indigo-400" />
            Active Ingestion Protocols & Parsers
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setObdGeneric(!obdGeneric)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                obdGeneric
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-900/30 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <span className="font-semibold text-slate-200 text-sm block mb-1">OBD-II / SAE J1979</span>
                <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 border border-indigo-900 rounded-full">
                  Light Vehicles
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mt-3">
                Ingest P, B, C, U fault codes. Translates generic DTC standards immediately.
              </p>
            </div>

            <div
              onClick={() => setJ1939Can(!j1939Can)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                j1939Can
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-900/30 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <span className="font-semibold text-slate-200 text-sm block mb-1">SAE J1939 CAN standard</span>
                <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 border border-indigo-900 rounded-full">
                  Heavy Trucks (FMS)
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mt-3">
                Decodes SPN + FMI engine fault messages from dual-CAN bus J1939-73 signals.
              </p>
            </div>

            <div
              onClick={() => setMfgSpecific(!mfgSpecific)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                mfgSpecific
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-900/30 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <span className="font-semibold text-slate-200 text-sm block mb-1">Manufacturer Proprietary</span>
                <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-950 px-2 py-0.5 border border-amber-900 rounded-full">
                  Premium Custom
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mt-3">
                Decodes custom OEM diagnostics (Volvo Trucks, Scania, Mercedes-Benz, Renault).
              </p>
            </div>
          </div>
        </div>

        {/* SaaS Global Feature Flags */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-medium text-slate-100 flex items-center border-b border-slate-700/60 pb-3">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-400" />
            Global Module Availability (Feature Flags)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-750">
              <div>
                <p className="text-sm font-semibold text-slate-200">AI Predictive Maintenance Engine</p>
                <p className="text-xs text-slate-400 mt-0.5">Enables Gemini-powered parts wear predictions.</p>
              </div>
              <button
                type="button"
                onClick={() => setAiEngine(!aiEngine)}
                className="p-1 focus:outline-none text-slate-400 hover:text-slate-200"
              >
                {aiEngine ? (
                  <ToggleRight className="w-10 h-10 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-600" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-750">
              <div>
                <p className="text-sm font-semibold text-slate-200">Multi-Warehouse Inventory (R3 Extension)</p>
                <p className="text-xs text-slate-400 mt-0.5">Allows tenant-scoped multi-depot stock reservations.</p>
              </div>
              <button
                type="button"
                onClick={() => setMultiWarehouse(!multiWarehouse)}
                className="p-1 focus:outline-none text-slate-400 hover:text-slate-200"
              >
                {multiWarehouse ? (
                  <ToggleRight className="w-10 h-10 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-600" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-750">
              <div>
                <p className="text-sm font-semibold text-slate-200">European Tachygraphy Support (DDD)</p>
                <p className="text-xs text-slate-400 mt-0.5">Enables direct download of driver tachy compliance card files.</p>
              </div>
              <button
                type="button"
                onClick={() => setTachygraph(!tachygraph)}
                className="p-1 focus:outline-none text-slate-400 hover:text-slate-200"
              >
                {tachygraph ? (
                  <ToggleRight className="w-10 h-10 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-600" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-750">
              <div>
                <p className="text-sm font-semibold text-slate-200">Google Maps Platform Live Routing</p>
                <p className="text-xs text-slate-400 mt-0.5">Uses live Routes API and geolocation address validation.</p>
              </div>
              <button
                type="button"
                onClick={() => setMapsGrounding(!mapsGrounding)}
                className="p-1 focus:outline-none text-slate-400 hover:text-slate-200"
              >
                {mapsGrounding ? (
                  <ToggleRight className="w-10 h-10 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Save button actions */}
        <div className="flex justify-end items-center space-x-4">
          {savedSuccess && (
            <div className="flex items-center text-emerald-400 text-sm font-bold bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg">
              <Check className="w-4 h-4 mr-2" />
              Global Config Saved Successfully & Dispatched to Cluster
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50"
            id="btn-save-settings"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Updating SaaS Fleet Cluster...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Global Config
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
