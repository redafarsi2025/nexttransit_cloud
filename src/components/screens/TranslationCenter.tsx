import React, { useState } from 'react';
import { useLocalization } from '../../context/LocalizationContext';
import {
  Globe,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  BookOpen,
  History,
  Languages,
  Filter,
  Search,
  Check,
  X,
  Plus,
  ArrowRightLeft,
  ShieldCheck,
  RefreshCw,
  FileJson,
  CheckCheck,
  FileText,
  UserCheck,
  Clock,
  Zap,
} from 'lucide-react';
import {
  TranslationStatus,
  LanguageCode,
  LocalizationRole,
  TranslationNamespace,
} from '../../types/localization';

export const TranslationCenter: React.FC = () => {
  const {
    currentLanguage,
    t,
    translations,
    glossary,
    memory,
    auditLogs,
    missingKeys,
    coverageStats,
    currentLocalizationRole,
    setLocalizationRole,
    updateTranslation,
    approveTranslation,
    bulkApproveTranslations,
    aiTranslateSingleKey,
    aiTranslateNamespaceKeys,
    addGlossaryTerm,
    importTranslations,
    exportTranslations,
    supportedLanguages,
  } = useLocalization();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'editor' | 'glossary' | 'memory' | 'audit' | 'import_export' | 'missing'
  >('dashboard');

  // Editor filters
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('ar');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // AI Translate Loading states
  const [isTranslatingKey, setIsTranslatingKey] = useState<string | null>(null);
  const [isTranslatingNs, setIsTranslatingNs] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Glossary Form Modal State
  const [showAddGlossaryModal, setShowAddGlossaryModal] = useState(false);
  const [newTerm, setNewTerm] = useState({
    term: '',
    namespace: 'maintenance',
    definition: '',
    fr: '',
    ar: '',
    en: '',
    forbidAutoTranslate: false,
  });

  // Import Textbox State
  const [importContent, setImportContent] = useState<string>('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Check RBAC permission for action
  const canEdit =
    currentLocalizationRole === 'Super Admin' ||
    currentLocalizationRole === 'Localization Manager' ||
    currentLocalizationRole === 'Translator';
  const canApprove =
    currentLocalizationRole === 'Super Admin' ||
    currentLocalizationRole === 'Localization Manager' ||
    currentLocalizationRole === 'Reviewer';

  // Filtered Translation Grid Records
  const filteredRecords = translations.filter((r) => {
    if (selectedNamespace !== 'all' && r.namespace !== selectedNamespace) return false;
    if (selectedLang !== 'all' && r.language !== selectedLang) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        r.key.toLowerCase().includes(q) ||
        r.value.toLowerCase().includes(q) ||
        r.namespace.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle single AI translate
  const handleSingleAiTranslate = async (key: string, lang: LanguageCode) => {
    setIsTranslatingKey(key);
    try {
      await aiTranslateSingleKey(key, lang);
    } finally {
      setIsTranslatingKey(null);
    }
  };

  // Handle bulk namespace AI translate
  const handleNamespaceAiTranslate = async () => {
    if (selectedNamespace === 'all') return;
    setIsTranslatingNs(true);
    try {
      const count = await aiTranslateNamespaceKeys(selectedNamespace, selectedLang);
      alert(`Successfully translated ${count} keys in namespace '${selectedNamespace}' to ${selectedLang.toUpperCase()} using the Free Local Translation Engine!`);
    } finally {
      setIsTranslatingNs(false);
    }
  };

  // Handle Save Inline Edit
  const handleSaveInlineEdit = (key: string, namespace: string, language: LanguageCode) => {
    updateTranslation(key, namespace, language, editingValue, 'Reviewed');
    setEditingId(null);
  };

  // Handle Add New Glossary Term
  const handleCreateGlossaryTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.term.trim()) return;
    addGlossaryTerm({
      term: newTerm.term,
      namespace: newTerm.namespace as TranslationNamespace,
      definition: newTerm.definition,
      translations: {
        fr: newTerm.fr || newTerm.term,
        ar: newTerm.ar || newTerm.term,
        en: newTerm.en || newTerm.term,
      },
      status: 'Approved',
      forbidAutoTranslate: newTerm.forbidAutoTranslate,
    });
    setShowAddGlossaryModal(false);
    setNewTerm({
      term: '',
      namespace: 'maintenance',
      definition: '',
      fr: '',
      ar: '',
      en: '',
      forbidAutoTranslate: false,
    });
  };

  // Handle Import Submit
  const handleRunImport = () => {
    if (!importContent.trim()) return;
    const count = importTranslations(importContent, importFormat);
    setImportNotice(`Successfully imported ${count} translation records into the dictionary!`);
    setImportContent('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
              <Globe className="h-3.5 w-3.5 text-indigo-300" />
              {t('localization.center_title', {}, 'Enterprise Translation & Localization Center')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
              <CheckCircle2 className="h-3 w-3" />
              RTL Arabic & Fallback Active
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Multilingual Decision & Localization Engine
          </h1>
          <p className="text-xs lg:text-sm text-indigo-200/90 max-w-3xl">
            Centralized translation management, Free Technical Local Translation (with zero API costs), Business Glossary enforcement, Translation Memory matching, and full RTL layout support for French, Arabic & English.
          </p>
        </div>

        {/* RBAC Role Selector Box */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10 shrink-0">
          <div className="text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-indigo-400" />
              Localization RBAC Role:
            </div>
            <select
              value={currentLocalizationRole}
              onChange={(e) => setLocalizationRole(e.target.value as LocalizationRole)}
              className="mt-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white border border-indigo-400/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Super Admin">Super Admin (Full Rights)</option>
              <option value="Localization Manager">Localization Manager</option>
              <option value="Translator">Translator</option>
              <option value="Reviewer">Reviewer</option>
              <option value="Viewer">Viewer (Read-Only)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'dashboard', label: 'Coverage Dashboard', icon: Globe },
          { id: 'editor', label: 'Translation Editor & AI', icon: Languages, badge: filteredRecords.length },
          { id: 'glossary', label: 'Business Glossary', icon: BookOpen, badge: glossary.length },
          { id: 'memory', label: 'Translation Memory', icon: ArrowRightLeft, badge: memory.length },
          { id: 'audit', label: 'Audit Trail Logs', icon: History, badge: auditLogs.length },
          { id: 'import_export', label: 'Import / Export', icon: FileSpreadsheet },
          { id: 'missing', label: 'Key Audit & Diagnostics', icon: AlertTriangle, badge: missingKeys.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: COVERAGE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Managed Keys
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                  <Languages className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">
                {coverageStats[0]?.totalKeys || 0}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Across {supportedLanguages.length} active languages & 10 ERP namespaces
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Arabic (RTL) Coverage
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">
                {coverageStats.find((c) => c.code === 'ar')?.coveragePercent || 0}%
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {coverageStats.find((c) => c.code === 'ar')?.approvedCount || 0} approved entries
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  AI Generated Entries
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-purple-900">
                {translations.filter((t) => t.status === 'AI Generated').length}
              </div>
              <p className="mt-1 text-xs text-slate-500">Pending human review or approval</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Missing Keys Detected
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-amber-900">
                {missingKeys.length}
              </div>
              <p className="mt-1 text-xs text-slate-500">Logged during active session execution</p>
            </div>
          </div>

          {/* Language Breakdown Cards */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-600" />
              Language Localization Progress & Coverage Breakdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coverageStats.map((stat) => {
                const langObj = supportedLanguages.find((l) => l.code === stat.code);
                return (
                  <div
                    key={stat.code}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{langObj?.flag}</span>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {stat.name} ({langObj?.nativeName})
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {langObj?.dir === 'rtl' ? 'Right-To-Left (RTL)' : 'Left-To-Right (LTR)'}
                          </div>
                        </div>
                      </div>
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-extrabold text-indigo-800">
                        {stat.coveragePercent}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-2.5 transition-all"
                        style={{ width: `${stat.approvalPercent}%` }}
                        title={`Approved: ${stat.approvalPercent}%`}
                      />
                      <div
                        className="bg-purple-500 h-2.5 transition-all"
                        style={{
                          width: `${stat.coveragePercent - stat.approvalPercent}%`,
                        }}
                        title={`AI / Reviewed: ${stat.coveragePercent - stat.approvalPercent}%`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/80">
                      <div>
                        <span className="text-slate-500">Approved:</span>{' '}
                        <strong className="text-emerald-700">{stat.approvedCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">AI Generated:</span>{' '}
                        <strong className="text-purple-700">{stat.aiGeneratedCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Missing:</span>{' '}
                        <strong className="text-amber-700">{stat.missingCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Total Keys:</span>{' '}
                        <strong className="text-slate-900">{stat.totalKeys}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSLATION EDITOR & AI */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          {/* Free Local Engine Status Banner */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                Système Alternatif Actif : Traduction 100% Gratuite & Locale
              </h4>
              <p className="text-xs text-emerald-700/90 leading-normal">
                Nous avons basculé du service payant Gemini Cloud vers le <strong>moteur de traduction NextTransit Technical Local Engine</strong>. Vos traductions sont désormais instantanées, sécurisées, s'exécutent entièrement côté client/serveur hors ligne, et n'engendrent aucun coût d'API tout en respectant strictement votre glossaire métier et la mémoire de traduction.
              </p>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search keys, values or namespaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Namespace Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Namespace:</span>
              <select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="all">All Namespaces</option>
                <option value="common">common</option>
                <option value="auth">auth</option>
                <option value="dashboard">dashboard</option>
                <option value="fleet">fleet</option>
                <option value="maintenance">maintenance</option>
                <option value="inventory">inventory</option>
                <option value="finance">finance</option>
                <option value="crm">crm</option>
                <option value="settings">settings</option>
                <option value="localization">localization</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Target Lang:</span>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="all">All Languages</option>
                <option value="ar">Arabic (ar - RTL)</option>
                <option value="fr">French (fr - Default)</option>
                <option value="en">English (en)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="AI Generated">AI Generated</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              {selectedNamespace !== 'all' && (
                <button
                  onClick={handleNamespaceAiTranslate}
                  disabled={isTranslatingNs}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
                  title="Translate entire namespace with Gemini AI"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isTranslatingNs ? 'animate-spin' : ''}`} />
                  <span>{isTranslatingNs ? 'Translating...' : 'AI Translate Namespace'}</span>
                </button>
              )}

              {canApprove && selectedRowIds.length > 0 && (
                <button
                  onClick={() => {
                    const count = bulkApproveTranslations(selectedRowIds);
                    setSelectedRowIds([]);
                    alert(`Approved ${count} translation records!`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Approve Selected ({selectedRowIds.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Translation Data Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedRowIds.length > 0 &&
                          selectedRowIds.length === filteredRecords.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRowIds(filteredRecords.map((r) => r.id));
                          } else {
                            setSelectedRowIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3">Key & Namespace</th>
                    <th className="px-4 py-3">French (Source Reference)</th>
                    <th className="px-4 py-3">Target Translation</th>
                    <th className="px-4 py-3 text-center">Language</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No translation records match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => {
                      const isChecked = selectedRowIds.includes(record.id);
                      const isEditing = editingId === record.id;
                      const isAiLoading = isTranslatingKey === record.key;

                      // Find French reference text
                      const frRecord = translations.find(
                        (t) => t.key === record.key && t.language === 'fr'
                      );
                      const frValue = frRecord ? frRecord.value : record.key;

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRowIds([...selectedRowIds, record.id]);
                                } else {
                                  setSelectedRowIds(
                                    selectedRowIds.filter((id) => id !== record.id)
                                  );
                                }
                              }}
                            />
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {record.key}
                            </div>
                            <span className="inline-block mt-0.5 rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                              {record.namespace}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-600 max-w-xs">
                            <span className="line-clamp-2">{frValue}</span>
                          </td>

                          <td className="px-4 py-3 max-w-sm">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  className="w-full rounded-lg border border-indigo-400 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    handleSaveInlineEdit(
                                      record.key,
                                      record.namespace,
                                      record.language
                                    )
                                  }
                                  className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-700"
                                  title="Save Changes"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="rounded bg-slate-200 p-1 text-slate-600 hover:bg-slate-300"
                                  title="Cancel"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={`font-medium ${
                                  record.language === 'ar' ? 'font-arabic text-right' : ''
                                }`}
                                dir={record.language === 'ar' ? 'rtl' : 'ltr'}
                              >
                                {record.value}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 uppercase">
                              {record.language}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                record.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : record.status === 'AI Generated'
                                  ? 'bg-purple-100 text-purple-800'
                                  : record.status === 'Reviewed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {record.status === 'AI Generated' && (
                                <Sparkles className="h-3 w-3" />
                              )}
                              {record.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Gemini AI Translate */}
                              {canEdit && (
                                <button
                                  onClick={() =>
                                    handleSingleAiTranslate(record.key, record.language)
                                  }
                                  disabled={isAiLoading}
                                  className="rounded-lg p-1.5 text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                                  title="Translate with Gemini AI"
                                >
                                  <Sparkles
                                    className={`h-4 w-4 ${isAiLoading ? 'animate-spin' : ''}`}
                                  />
                                </button>
                              )}

                              {/* Edit Button */}
                              {canEdit && !isEditing && (
                                <button
                                  onClick={() => {
                                    setEditingId(record.id);
                                    setEditingValue(record.value);
                                  }}
                                  className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 transition cursor-pointer text-xs font-semibold"
                                >
                                  Edit
                                </button>
                              )}

                              {/* Approve Button */}
                              {canApprove && record.status !== 'Approved' && (
                                <button
                                  onClick={() => approveTranslation(record.id)}
                                  className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                  title="Approve Translation"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUSINESS GLOSSARY */}
      {activeTab === 'glossary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                NextTransit ERP Business Glossary & Technical Terms
              </h3>
              <p className="text-xs text-slate-500">
                Mandatory terminology guidelines preserved during Gemini AI translation runs.
              </p>
            </div>

            {canEdit && (
              <button
                onClick={() => setShowAddGlossaryModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Glossary Term</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {glossary.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.term}</h4>
                    <span className="inline-block mt-0.5 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                      {item.namespace}
                    </span>
                  </div>
                  {item.forbidAutoTranslate && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Forbidden Auto-Translate
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {item.definition}
                </p>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-[10px] font-bold text-slate-400">French (fr)</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{item.translations.fr}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-right" dir="rtl">
                    <div className="text-[10px] font-bold text-slate-400">Arabic (ar)</div>
                    <div className="font-semibold text-slate-800 font-arabic mt-0.5">{item.translations.ar}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-[10px] font-bold text-slate-400">English (en)</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{item.translations.en}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Glossary Modal */}
          {showAddGlossaryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in-0 zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Add Business Glossary Term</h3>
                  <button
                    onClick={() => setShowAddGlossaryModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateGlossaryTerm} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Source Technical Term</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Telemetry Reconciliation"
                      value={newTerm.term}
                      onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">ERP Namespace</label>
                      <select
                        value={newTerm.namespace}
                        onChange={(e) => setNewTerm({ ...newTerm, namespace: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white"
                      >
                        <option value="maintenance">maintenance</option>
                        <option value="fleet">fleet</option>
                        <option value="inventory">inventory</option>
                        <option value="finance">finance</option>
                        <option value="common">common</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <input
                          type="checkbox"
                          checked={newTerm.forbidAutoTranslate}
                          onChange={(e) =>
                            setNewTerm({ ...newTerm, forbidAutoTranslate: e.target.checked })
                          }
                        />
                        Forbid Auto-Translate
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Contextual Definition</label>
                    <textarea
                      rows={2}
                      placeholder="Explain how this term is used in the ERP domain..."
                      value={newTerm.definition}
                      onChange={(e) => setNewTerm({ ...newTerm, definition: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Approved Multi-Language Terms
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="French"
                        value={newTerm.fr}
                        onChange={(e) => setNewTerm({ ...newTerm, fr: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Arabic (العربية)"
                        dir="rtl"
                        value={newTerm.ar}
                        onChange={(e) => setNewTerm({ ...newTerm, ar: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 font-arabic"
                      />
                      <input
                        type="text"
                        placeholder="English"
                        value={newTerm.en}
                        onChange={(e) => setNewTerm({ ...newTerm, en: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddGlossaryModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                    >
                      Save Glossary Term
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TRANSLATION MEMORY */}
      {activeTab === 'memory' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              Translation Memory (TM) Database & Reuse Engine
            </h3>
            <p className="text-xs text-slate-500">
              High-confidence source-target translation pairs automatically matched during editing and AI generation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Source Phrase (French)</th>
                  <th className="px-4 py-3">Approved Target Match</th>
                  <th className="px-4 py-3 text-center">Languages</th>
                  <th className="px-4 py-3 text-center">Quality Score</th>
                  <th className="px-4 py-3 text-center">Usage Count</th>
                  <th className="px-4 py-3 text-right">Last Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {memory.map((tm) => (
                  <tr key={tm.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">{tm.sourceText}</td>
                    <td
                      className={`px-4 py-3 max-w-xs ${
                        tm.targetLang === 'ar' ? 'font-arabic text-right' : ''
                      }`}
                      dir={tm.targetLang === 'ar' ? 'rtl' : 'ltr'}
                    >
                      {tm.targetText}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                        {tm.sourceLang} → {tm.targetLang}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {tm.qualityScore}% Match
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{tm.usageCount}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{tm.lastUsedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              Complete Translation Audit Trail Log
            </h3>
            <p className="text-xs text-slate-500">
              Immutable log tracking every creation, update, approval, and AI translation event.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Translation Key</th>
                  <th className="px-4 py-3 text-center">Lang</th>
                  <th className="px-4 py-3 text-center">Action</th>
                  <th className="px-4 py-3">New Value</th>
                  <th className="px-4 py-3 text-right">User & Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{log.key}</td>
                    <td className="px-4 py-3 text-center uppercase font-bold text-slate-700">{log.language}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          log.action === 'APPROVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'AI_TRANSLATE'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 max-w-xs ${log.language === 'ar' ? 'font-arabic text-right' : ''}`}
                      dir={log.language === 'ar' ? 'rtl' : 'ltr'}
                    >
                      {log.newValue}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-slate-900">{log.userRole}</div>
                      <div className="text-[10px] text-slate-400">{log.userEmail}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: IMPORT / EXPORT */}
      {activeTab === 'import_export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Import Container */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileJson className="h-5 w-5 text-indigo-600" />
              Import Translation Bundles
            </h3>
            <p className="text-xs text-slate-500">
              Paste or upload JSON / CSV translation files to bulk update the system dictionary.
            </p>

            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-slate-700">Format:</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="fmt"
                    checked={importFormat === 'json'}
                    onChange={() => setImportFormat('json')}
                  />
                  JSON Format
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="fmt"
                    checked={importFormat === 'csv'}
                    onChange={() => setImportFormat('csv')}
                  />
                  CSV Format
                </label>
              </div>
            </div>

            <textarea
              rows={8}
              placeholder={
                importFormat === 'json'
                  ? '{\n  "ar": {\n    "common.save": "حفظ",\n    "common.cancel": "إلغاء"\n  }\n}'
                  : 'Key,Namespace,Language,Value,Status,LastModifiedBy\n"common.save","common","ar","حفظ","Approved","admin@nexttransit.com"'
              }
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />

            {importNotice && (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
                {importNotice}
              </div>
            )}

            <button
              onClick={handleRunImport}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              Run Translation Import
            </button>
          </div>

          {/* Export Container */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
              Export Production Language Packs
            </h3>
            <p className="text-xs text-slate-500">
              Download formatted JSON or CSV bundles for offline review or deployment.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  const data = exportTranslations('json', 'ar');
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'translations_arabic_ar.json';
                  a.click();
                }}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🇩🇿</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-900">
                      Arabic (ar) Language Pack
                    </div>
                    <div className="text-[10px] text-slate-500">JSON Format (RTL Ready)</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600">Download JSON</span>
              </button>

              <button
                onClick={() => {
                  const data = exportTranslations('json', 'fr');
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'translations_french_fr.json';
                  a.click();
                }}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🇫🇷</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-900">
                      French (fr) Primary Pack
                    </div>
                    <div className="text-[10px] text-slate-500">JSON Format (Default)</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600">Download JSON</span>
              </button>

              <button
                onClick={() => {
                  const data = exportTranslations('csv');
                  const blob = new Blob([data], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'all_translations_matrix.csv';
                  a.click();
                }}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-900">
                      Full Translation Matrix (All Languages)
                    </div>
                    <div className="text-[10px] text-slate-500">CSV Spreadsheet Format</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600">Download CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: MISSING KEYS & DIAGNOSTICS */}
      {activeTab === 'missing' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Runtime Missing Key Diagnostics & Audit
            </h3>
            <p className="text-xs text-slate-500">
              Keys referenced during UI execution that lack a localized value for the active target language.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Missing Key</th>
                  <th className="px-4 py-3">Namespace</th>
                  <th className="px-4 py-3">Default Text / Fallback</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {missingKeys.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                      Zero missing keys detected! All runtime keys are fully localized.
                    </td>
                  </tr>
                ) : (
                  missingKeys.map((mk) => (
                    <tr key={mk.key} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{mk.key}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {mk.namespace}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{mk.defaultText}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setActiveTab('editor');
                            setSearchQuery(mk.key);
                          }}
                          className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          Resolve in Editor
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
