import React, { useState } from 'react';
import { Code2, Server, Key, Database, Play, Copy, Check, ShieldCheck, Cpu } from 'lucide-react';

interface EndpointDoc {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  tags: string[];
  requestBody?: string;
  responseExample: string;
}

const API_ENDPOINTS: EndpointDoc[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/api/health',
    summary: 'Health Check Endpoint',
    description: 'Vérifie l\'état opérationnel du serveur Express et de la connexion Supabase multi-tenant.',
    tags: ['System'],
    responseExample: JSON.stringify({ status: 'ok', uptime_seconds: 84920, timestamp: new Date().toISOString() }, null, 2),
  },
  {
    id: 'decision-engine-eval',
    method: 'POST',
    path: '/api/v1/decision-engine/evaluate',
    summary: 'Evaluate R1-R7 Decision Engine Rules',
    description: 'Évalue les règles R1 (Arrêt d\'urgence), R2 (Conflit de planning) et R4 (Formule coût de réparation) pour un véhicule.',
    tags: ['Decision Engine', 'Core'],
    requestBody: JSON.stringify(
      {
        tenant_id: 'c0a80101-0000-0000-0000-000000000001',
        vehicle_id: 'V-024',
        fault_codes: [
          { code: 'P0217', severity: 'Critical', system_category: 'Engine' }
        ],
        departure_date: '2026-08-08T08:00:00Z'
      },
      null,
      2
    ),
    responseExample: JSON.stringify(
      {
        rule_R1: {
          isRedAlert: true,
          vehicleStatus: 'Unsafe / Red',
          emergencyDispatchRequired: true,
          removeDispatchAssignment: true
        },
        rule_R2: {
          hasConflict: true,
          daysToDeparture: 3,
          message: 'Alerte Conflit R2: 1 ordre de travail ouvert'
        },
        evaluation_timestamp: new Date().toISOString()
      },
      null,
      2
    ),
  },
  {
    id: 'telematics-ingest',
    method: 'POST',
    path: '/api/v1/telematics/ingest',
    summary: 'Ingest External OBD / Telematics Feed',
    description: 'Point d\'entrée neutre d\'ingestion télématique compatible Teltonika FMx, Flespi, Wialon et ManualEntryProvider.',
    tags: ['Telematics', 'IoT'],
    requestBody: JSON.stringify(
      {
        external_device_id: 'TEL-864201049281002',
        provider: 'teltonika',
        position: { latitude: 36.7538, longitude: 3.0588, speed_kmh: 72 },
        fault_codes: [{ code: 'P0300', severity: 'Medium', system_category: 'Engine' }]
      },
      null,
      2
    ),
    responseExample: JSON.stringify(
      {
        success: true,
        vehicle_id: 'V-018',
        r1_triggered: false,
        processed_at: new Date().toISOString()
      },
      null,
      2
    ),
  },
  {
    id: 'work-orders-list',
    method: 'GET',
    path: '/api/v1/work-orders',
    summary: 'List Tenant Work Orders (RLS Protected)',
    description: 'Récupère la liste des ordres de travail filtrés par tenant_id et rôle utilisateur via token JWT Supabase.',
    tags: ['Work Orders', 'Operations'],
    responseExample: JSON.stringify(
      [
        {
          id: 'WO-2026-001',
          vehicle_id: 'V-024',
          system_category: 'Engine',
          status: 'In Progress',
          total_cost: 35750,
          created_at: '2026-08-01T14:30:00Z'
        }
      ],
      null,
      2
    ),
  },
];

export const ApiDocsScreen: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDoc>(API_ENDPOINTS[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'openapi' | 'tryout'>('openapi');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              OpenAPI 3.0 / Swagger Spec
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              v2.4 Enterprise API
            </span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Code2 className="w-7 h-7 text-indigo-400" /> Documentation OpenAPI & APIs Rest Supabase
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Spécification formelle des endpoints REST du moteur de décision R1-R7, de l'ingestion télématique Teltonika/Flespi et des services multi-tenant Supabase avec RLS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleCopy(JSON.stringify(API_ENDPOINTS, null, 2))}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
            {copied ? 'Copié !' : 'Exporter Schéma JSON'}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Selector Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider px-2">
            Endpoints REST NextTransit
          </h2>

          <div className="space-y-1">
            {API_ENDPOINTS.map((ep) => {
              const isSelected = selectedEndpoint.id === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEndpoint(ep)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                        ep.method === 'GET'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{ep.tags[0]}</span>
                  </div>
                  <span className="text-xs font-bold tracking-tight font-mono truncate">{ep.path}</span>
                  <span className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {ep.summary}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs space-y-1 text-indigo-900">
            <div className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Authentification JWT & Tenant Header
            </div>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              Toutes les requêtes de niveau <code>/api/v1/*</code> doivent inclure les entêtes :<br />
              <code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200 text-indigo-900">
                Authorization: Bearer &lt;JWT&gt;
              </code><br />
              <code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200 text-indigo-900">
                X-Tenant-ID: &lt;TENANT_UUID&gt;
              </code>
            </p>
          </div>
        </div>

        {/* Endpoint Inspector Detail Panel */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-black uppercase font-mono ${
                    selectedEndpoint.method === 'GET'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="text-base font-black font-mono text-slate-900">{selectedEndpoint.path}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">{selectedEndpoint.description}</p>
            </div>
          </div>

          {/* Request Body (if POST) */}
          {selectedEndpoint.requestBody && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Server className="w-4 h-4 text-indigo-600" /> Modèle de Corps de Requête JSON (Request Payload)
              </h3>
              <pre className="p-4 bg-slate-950 text-indigo-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800">
                {selectedEndpoint.requestBody}
              </pre>
            </div>
          )}

          {/* Response Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Cpu className="w-4 h-4 text-emerald-600" /> Exemple de Réponse HTTP 200 OK
              </h3>
              <button
                onClick={() => handleCopy(selectedEndpoint.responseExample)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copier Réponse
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800">
              {selectedEndpoint.responseExample}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
