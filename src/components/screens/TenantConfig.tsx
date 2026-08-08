import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useTenant } from '../../context/TenantContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import { TenantConfig as TenantConfigType } from '../../types';
import {
  Building2,
  DollarSign,
  PieChart,
  Save,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Download,
  CreditCard,
  Building,
  RefreshCw,
  Globe,
  FileText,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Palette,
  ChevronRight,
  ChevronLeft,
  Check,
  LayoutGrid,
  Eye,
  Sliders,
  ShieldCheck,
  Languages,
  Cpu,
  Radio,
} from 'lucide-react';
import { DeviceMapping, TelematicsProviderType } from '../../types';
import { fetchDeviceMappings, saveDeviceMapping } from '../../services/telematicsService';
import { seedDemoTenant } from '../../services/demoSeedService';

const BRAND_COLOR_PRESETS = [
  { name: 'Indigo (Default)', hex: '#4f46e5', bg: 'bg-indigo-600', ring: 'ring-indigo-500' },
  { name: 'Royal Blue', hex: '#2563eb', bg: 'bg-blue-600', ring: 'ring-blue-500' },
  { name: 'Emerald Green', hex: '#059669', bg: 'bg-emerald-600', ring: 'ring-emerald-500' },
  { name: 'Sky Blue', hex: '#0284c7', bg: 'bg-sky-600', ring: 'ring-sky-500' },
  { name: 'Amber Gold', hex: '#d97706', bg: 'bg-amber-600', ring: 'ring-amber-500' },
  { name: 'Deep Violet', hex: '#7c3aed', bg: 'bg-violet-600', ring: 'ring-violet-500' },
  { name: 'Teal Fleet', hex: '#0d9488', bg: 'bg-teal-600', ring: 'ring-teal-500' },
  { name: 'Slate Enterprise', hex: '#334155', bg: 'bg-slate-700', ring: 'ring-slate-500' },
];

const ACCENT_COLOR_PRESETS = [
  { name: 'Emerald', hex: '#059669', bg: 'bg-emerald-600' },
  { name: 'Amber', hex: '#d97706', bg: 'bg-amber-600' },
  { name: 'Rose', hex: '#e11d48', bg: 'bg-rose-600' },
  { name: 'Cyan', hex: '#0891b2', bg: 'bg-cyan-600' },
  { name: 'Indigo', hex: '#4f46e5', bg: 'bg-indigo-600' },
];

// Custom Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const TenantConfig: React.FC = () => {
  const { costRecords, vehicles } = useFleet();
  const { tenantConfigs, activeTenantId, activeTenant, updateTenantConfig, setActiveTenantId, addTenantConfig } = useTenant();
  const { t } = useLocalization();

  // Telematics Device Mappings State
  const [deviceMappings, setDeviceMappings] = useState<DeviceMapping[]>([]);
  const [savingMappingVehicleId, setSavingMappingVehicleId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeviceMappings().then(setDeviceMappings).catch(console.warn);
  }, [activeTenant.id]);

  const handleDeviceMappingChange = async (
    vehicleId: string,
    provider: TelematicsProviderType,
    externalDeviceId: string
  ) => {
    setSavingMappingVehicleId(vehicleId);
    try {
      const saved = await saveDeviceMapping({
        tenant_id: activeTenant.id,
        vehicle_id: vehicleId,
        provider,
        external_device_id: externalDeviceId,
      });
      setDeviceMappings((prev) => {
        const idx = prev.findIndex((m) => m.vehicle_id === vehicleId && m.tenant_id === activeTenant.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      showToast(`Telematics adapter set to "${provider.toUpperCase()}" for vehicle ${vehicleId}`);
    } catch (err) {
      console.warn('Failed to save device mapping', err);
    } finally {
      setSavingMappingVehicleId(null);
    }
  };

  // Local form state initialized with activeTenant values
  const [formData, setFormData] = useState<TenantConfigType>({
    primaryColor: '#4f46e5',
    accentColor: '#059669',
    brandTagline: 'Next-Gen Transit Operations & Telemetry Intelligence',
    logoUrl: '',
    ...activeTenant,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'wizard' | 'grid'>('wizard');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'pending' | 'saving'>('saved');
  const [isSeedingDemo, setIsSeedingDemo] = useState<boolean>(false);

  const allowDemoSeed =
    (typeof process !== 'undefined' &&
      (process.env.ALLOW_DEMO_SEED === 'true' || process.env.VITE_ALLOW_DEMO_SEED === 'true')) ||
    ((import.meta as any).env?.VITE_ALLOW_DEMO_SEED === 'true');

  const handleLoadDemoData = async () => {
    setIsSeedingDemo(true);
    try {
      const res = await seedDemoTenant(activeTenant.id);
      showToast(`Loaded realistic demo fleet for ${res.data.tenantConfig.societyName} (${res.counts.vehicles} heavy trucks, Rules R1-R7 active)`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.warn('Failed to seed demo data', err);
      showToast('Failed to load demo data. Please check logs.');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const debouncedFormData = useDebounce(formData, 2000);
  const lastSavedDataRef = React.useRef<string>('');

  // New Tenant Form State
  const [newTenantData, setNewTenantData] = useState<Omit<TenantConfigType, 'id' | 'lastUpdated'>>({
    societyName: '',
    currency: 'USD ($)',
    currencySymbol: '$',
    defaultLanguage: 'fr',
    timezone: 'Africa/Algiers',
    notificationsEnabled: true,
    customDomain: '',
    allocatedBudget: 500000,
    moneyUsed: 0,
    fiscalYear: 'FY2026',
    operatingRegion: 'North Africa - Algiers Corridor',
    taxRegistrationId: 'TAX-NEW-001',
    costCenterCode: 'CC-FLEET-100',
    defaultLaborRate: 85,
    emergencyApprovalThreshold: 5000,
    contactEmail: 'contact@fleet.org',
    contactPhone: '+1 (555) 000-1122',
    billingAddress: '100 Business Parkway, Suite 100',
    autoSyncMoneyUsed: true,
    primaryColor: '#4f46e5',
    accentColor: '#059669',
    brandTagline: 'Connected Fleet & Transit Excellence',
    logoUrl: '',
  });

  // Synchronize form state when activeTenant changes
  useEffect(() => {
    const initial = {
      primaryColor: '#4f46e5',
      accentColor: '#059669',
      brandTagline: 'Next-Gen Transit Operations & Telemetry Intelligence',
      logoUrl: '',
      ...activeTenant,
    };
    setFormData(initial);
    lastSavedDataRef.current = JSON.stringify(initial);
    setAutoSaveStatus('saved');
  }, [activeTenant]);

  // Mark changes as pending auto-save when user edits formData
  useEffect(() => {
    if (lastSavedDataRef.current && JSON.stringify(formData) !== lastSavedDataRef.current) {
      setAutoSaveStatus('pending');
    }
  }, [formData]);

  // Auto-save effect: saves to Supabase 2 seconds after the user stops typing/editing
  useEffect(() => {
    if (!lastSavedDataRef.current) return;
    const currentJson = JSON.stringify(debouncedFormData);
    if (currentJson !== lastSavedDataRef.current) {
      setAutoSaveStatus('saving');
      updateTenantConfig(activeTenant.id, debouncedFormData);
      lastSavedDataRef.current = currentJson;
      setAutoSaveStatus('saved');
      showToast(`Workspace settings for "${debouncedFormData.societyName}" auto-saved to Supabase!`);
    }
  }, [debouncedFormData, activeTenant.id, updateTenantConfig]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleInputChange = (field: keyof TenantConfigType, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Update currency symbol automatically based on selected currency string
      if (field === 'currency') {
        if (value.includes('DZD') || value.includes('DA')) updated.currencySymbol = 'DA';
        else if (value.includes('€')) updated.currencySymbol = '€';
        else if (value.includes('£')) updated.currencySymbol = '£';
        else if (value.includes('CAD')) updated.currencySymbol = 'C$';
        else if (value.includes('AED')) updated.currencySymbol = 'AED';
        else updated.currencySymbol = '$';
      }
      return updated;
    });
  };

  const handleReset = () => {
    const resetData = {
      primaryColor: '#4f46e5',
      accentColor: '#059669',
      brandTagline: 'Next-Gen Transit Operations & Telemetry Intelligence',
      logoUrl: '',
      ...activeTenant,
    };
    setFormData(resetData);
    lastSavedDataRef.current = JSON.stringify(resetData);
    setAutoSaveStatus('saved');
    showToast('Changes discarded; restored to last saved state.');
  };

  const handleSyncMoneyUsed = () => {
    const totalCost = costRecords.reduce((sum, c) => sum + c.amount, 0);
    setFormData((prev) => ({
      ...prev,
      moneyUsed: totalCost,
      autoSyncMoneyUsed: true,
    }));
    updateTenantConfig(activeTenant.id, {
      moneyUsed: totalCost,
      autoSyncMoneyUsed: true,
    });
    showToast(`Expenditure recalculated & updated to ${formData.currencySymbol}${totalCost.toLocaleString()} from ${costRecords.length} cost records.`);
  };

  const handleCreateNewTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantData.societyName.trim()) return;

    const createdId = addTenantConfig(newTenantData);
    setIsCreatingNew(false);
    // Reset modal form defaults
    setNewTenantData({
      societyName: '',
      currency: 'USD ($)',
      currencySymbol: '$',
      defaultLanguage: 'fr',
      timezone: 'Africa/Algiers',
      notificationsEnabled: true,
      customDomain: '',
      allocatedBudget: 500000,
      moneyUsed: 0,
      fiscalYear: 'FY2026',
      operatingRegion: 'North Africa - Algiers Corridor',
      taxRegistrationId: 'TAX-NEW-001',
      costCenterCode: 'CC-FLEET-100',
      defaultLaborRate: 85,
      emergencyApprovalThreshold: 5000,
      contactEmail: 'contact@fleet.org',
      contactPhone: '+1 (555) 000-1122',
      billingAddress: '100 Business Parkway, Suite 100',
      autoSyncMoneyUsed: true,
      primaryColor: '#4f46e5',
      accentColor: '#059669',
      brandTagline: 'Connected Fleet & Transit Excellence',
      logoUrl: '',
    });
    showToast(`New Tenant Society registered & synced with Supabase (ID: ${createdId})!`);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tenant_config_${formData.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Tenant configuration exported as tenant_config_${formData.id}.json`);
  };

  // Financial metrics calculations
  const totalBudget = formData.allocatedBudget || 1;
  const moneyUsed = formData.moneyUsed || 0;
  const remainingBudget = totalBudget - moneyUsed;
  const utilizationPercentage = Math.min(100, Math.round((moneyUsed / totalBudget) * 100));

  const WIZARD_STEPS = [
    { id: 1, title: '1. Identity & Registration', icon: Building },
    { id: 2, title: '2. Currency & Localization', icon: Globe },
    { id: 3, title: '3. Fleet Branding & Theme', icon: Palette },
    { id: 4, title: '4. Financials & Operation Caps', icon: CreditCard },
    { id: 5, title: '5. Contact & Supabase Review', icon: ShieldCheck },
    { id: 6, title: '6. Telematics & Devices', icon: Cpu },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative">
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-lg bg-emerald-900 text-emerald-100 px-4 py-3 shadow-xl border border-emerald-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner & Workspace Mode Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <KPIBadge type="Configured" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {t('tenant.header_tag', {}, 'Tenant & Workspace Setup Engine')}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {autoSaveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                  <span className="text-indigo-700 font-medium">Auto-saving...</span>
                </>
              ) : autoSaveStatus === 'pending' ? (
                <>
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span className="text-amber-700 font-medium">Auto-save in 2s</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Auto-save active</span>
                </>
              )}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('tenant.header_title', {}, 'Tenant & Workspace Configuration Wizard')}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure multi-tenant parameters, currency rules, default languages, custom fleet branding, and Supabase per-tenant persistence.
          </p>
        </div>

        {/* Tenant Switcher & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('wizard')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'wizard' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Wizard Setup</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>

          <div className="flex flex-col">
            <div className="relative">
              <select
                value={activeTenantId}
                onChange={(e) => setActiveTenantId(e.target.value)}
                className="appearance-none rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-8 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {tenantConfigs.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.societyName} ({tenant.id})
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={() => setIsCreatingNew(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Society
          </button>

          {allowDemoSeed && (
            <button
              onClick={handleLoadDemoData}
              disabled={isSeedingDemo}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer"
              title="Load realistic enterprise demo seed data (200 heavy trucks, Rules R1-R7)"
            >
              <RefreshCw className={`w-4 h-4 ${isSeedingDemo ? 'animate-spin' : ''}`} />
              <span>{isSeedingDemo ? 'Seeding...' : 'Load Demo Data'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Society Name & Identity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Workspace</span>
              <Building className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 truncate" title={formData.societyName}>
              {formData.societyName || 'Unconfigured Society'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>ID: <strong className="text-slate-700">{formData.id}</strong></span>
              <span>Lang: <strong className="text-slate-700 uppercase">{formData.defaultLanguage || 'FR'}</strong></span>
            </div>
            <div className="flex justify-between truncate">
              <span>Currency: <strong className="text-slate-700">{formData.currencySymbol}</strong></span>
              <span>TZ: <strong className="text-slate-700">{formData.timezone?.split('/')[1] || 'Algiers'}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Money Used / Expenditure */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Money Used (Expenditure)</span>
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formData.currencySymbol}{formData.moneyUsed.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Source:</span>
            {formData.autoSyncMoneyUsed ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                <RefreshCw className="w-3 h-3 animate-spin" /> Live Cost Sync
              </span>
            ) : (
              <span className="text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded">
                Manual Override
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Allocated Budget & Remaining */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Allocated Budget</span>
              <PieChart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formData.currencySymbol}{formData.allocatedBudget.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Used: {utilizationPercentage}%</span>
              <span>Remaining: <strong className={remainingBudget < 0 ? 'text-red-600' : 'text-emerald-700'}>
                {formData.currencySymbol}{remainingBudget.toLocaleString()}
              </strong></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${utilizationPercentage > 90 ? 'bg-red-500' : utilizationPercentage > 75 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                style={{ width: `${utilizationPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Custom Fleet Branding Preview */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Custom Branding</span>
              <Palette className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-5 h-5 rounded-full border border-slate-300 shadow-xs"
                style={{ backgroundColor: formData.primaryColor || '#4f46e5' }}
              />
              <span className="text-xs font-semibold font-mono text-slate-800">
                {formData.primaryColor || '#4f46e5'}
              </span>
              <div
                className="w-3.5 h-3.5 rounded-full border border-slate-300 ml-auto"
                style={{ backgroundColor: formData.accentColor || '#059669' }}
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 truncate" title={formData.brandTagline}>
            Tagline: <strong className="text-slate-700">{formData.brandTagline || 'Connected Fleet'}</strong>
          </div>
        </div>
      </div>

      {/* Real-Time Live Branding Header Preview Box */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 rounded-xl text-white shadow-md border border-slate-700 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Workspace Brand Preview</span>
          </div>
          <span className="text-[11px] font-mono bg-slate-800 px-2.5 py-0.5 rounded border border-slate-600 text-slate-300">
            Tenant: {formData.id}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-lg"
              style={{ backgroundColor: formData.primaryColor || '#4f46e5' }}
            >
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
              ) : (
                formData.societyName.substring(0, 2).toUpperCase() || 'NT'
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  {formData.societyName || 'NextTransit Workspace'}
                </h3>
                <span
                  className="text-[10px] uppercase px-2 py-0.5 rounded font-bold text-white shadow-xs"
                  style={{ backgroundColor: formData.accentColor || '#059669' }}
                >
                  {formData.currencySymbol}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formData.brandTagline || 'Next-Gen Operations & Fleet Telemetry'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium text-slate-300 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
            <div>
              Lang: <strong className="text-white uppercase">{formData.defaultLanguage || 'FR'}</strong>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div>
              Domain: <strong className="text-white font-mono">{formData.customDomain || 'default.dz'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Panel: Wizard Mode or Grid View Mode */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Wizard Stepper Header */}
        {viewMode === 'wizard' ? (
          <div className="border-b border-slate-200 bg-slate-50/80 p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {WIZARD_STEPS.map((step) => {
                const Icon = step.icon;
                const isCompleted = step.id < wizardStep;
                const isActive = step.id === wizardStep;

                return (
                  <button
                    key={step.id}
                    onClick={() => setWizardStep(step.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left cursor-pointer ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-xs'
                        : isCompleted
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100/60'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </div>
                    <span className="text-xs font-bold truncate">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Grid Mode Tab Bar */
          <div className="border-b border-slate-200 bg-slate-50/50 px-6 pt-4 flex gap-6">
            {WIZARD_STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setWizardStep(step.id)}
                className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  wizardStep === step.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <step.icon className="w-4 h-4" />
                {step.title}
              </button>
            ))}
          </div>
        )}

        {/* Wizard Form Content */}
        <form onSubmit={(e) => e.preventDefault()} className="p-6 space-y-6">
          {/* STEP 1: IDENTITY & REGISTRATION */}
          {wizardStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">1. Society Identity & Corporate Registration</h3>
                  <p className="text-xs text-slate-500">Configure corporate details, tax identifiers, cost codes, and custom enterprise domains.</p>
                </div>
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Society / Corporate Entity Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.societyName}
                      onChange={(e) => handleInputChange('societyName', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                      placeholder="e.g. NextTransit Metro Fleet Society S.A."
                    />
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Official registered corporate or transit authority entity name.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Tax Registration / NIF ID *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.taxRegistrationId}
                      onChange={(e) => handleInputChange('taxRegistrationId', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                      placeholder="e.g. TAX-8839201-NX or NIF-0019160029"
                    />
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Corporate tax identification or municipal registration number.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Cost Center Accounting Code *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.costCenterCode}
                      onChange={(e) => handleInputChange('costCenterCode', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                      placeholder="e.g. CC-FLEET-902"
                    />
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Internal general ledger accounting cost center reference.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Operating Jurisdiction / Region *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.operatingRegion}
                      onChange={(e) => handleInputChange('operatingRegion', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                      placeholder="e.g. North Africa - Algiers Corridor"
                    />
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Primary geographic transit zone or corridor jurisdiction.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Fiscal Year Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fiscalYear}
                    onChange={(e) => handleInputChange('fiscalYear', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="e.g. FY2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Custom Enterprise Subdomain
                  </label>
                  <input
                    type="text"
                    value={formData.customDomain || ''}
                    onChange={(e) => handleInputChange('customDomain', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    placeholder="e.g. snta.nexttransit.dz"
                  />
                  <p className="text-xs text-slate-500 mt-1">Domaine personnalisé d'accès SaaS pour ce tenant.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCALIZATION & CURRENCY */}
          {wizardStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">2. Currency, Language & Timezone Rules</h3>
                  <p className="text-xs text-slate-500">Define financial display currencies, localized workspace languages, and telemetry timestamps.</p>
                </div>
                <Languages className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Operating Currency *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-semibold"
                  >
                    <option value="DZD (DA)">DZD (DA) - Algerian Dinar</option>
                    <option value="USD ($)">USD ($) - US Dollar</option>
                    <option value="EUR (€)">EUR (€) - Euro</option>
                    <option value="GBP (£)">GBP (£) - British Pound</option>
                    <option value="CAD ($)">CAD (C$) - Canadian Dollar</option>
                    <option value="AED (AED)">AED (AED) - UAE Dirham</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">All financial charts, cost calculations, and work order line items will display in this currency.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => handleInputChange('currencySymbol', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Short symbol prefix/suffix (e.g., DA, $, €, £, C$).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Default Workspace Language / Langue par défaut *
                  </label>
                  <select
                    value={formData.defaultLanguage || 'fr'}
                    onChange={(e) => handleInputChange('defaultLanguage', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium"
                  >
                    <option value="fr">Français (FR) — Langue par défaut</option>
                    <option value="en">English (US/UK) — Standard English</option>
                    <option value="ar">العربية (AR) — Arabic</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Définit la langue des interfaces pour tous les utilisateurs de l'espace.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Timezone / Fuseau horaire *
                  </label>
                  <select
                    value={formData.timezone || 'Africa/Algiers'}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium"
                  >
                    <option value="Africa/Algiers">Africa/Algiers (UTC+1)</option>
                    <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
                    <option value="Europe/Berlin">Europe/Berlin (UTC+1/+2)</option>
                    <option value="America/Chicago">America/Chicago (UTC-6/-5)</option>
                    <option value="America/Detroit">America/Detroit (UTC-5/-4)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Horodatage officiel des ordres de travail et télémétrie OBD.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CUSTOM FLEET BRANDING & THEME */}
          {wizardStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">3. Custom Fleet Branding & Visual Identity</h3>
                  <p className="text-xs text-slate-500">Personalize your tenant theme colors, corporate logos, and brand taglines across NextTransit.</p>
                </div>
                <Palette className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="space-y-6">
                {/* Brand Colors Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                    Primary Brand Color Theme
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {BRAND_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => handleInputChange('primaryColor', preset.hex)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          formData.primaryColor === preset.hex
                            ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-800 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${preset.bg} shrink-0 shadow-xs`} />
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 truncate">{preset.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{preset.hex}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                    Secondary Accent Color
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_COLOR_PRESETS.map((accent) => (
                      <button
                        key={accent.hex}
                        type="button"
                        onClick={() => handleInputChange('accentColor', accent.hex)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                          formData.accentColor === accent.hex
                            ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-800'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${accent.bg}`} />
                        <span className="text-xs font-semibold text-slate-700">{accent.name} ({accent.hex})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Brand Slogan / Tagline
                    </label>
                    <input
                      type="text"
                      value={formData.brandTagline || ''}
                      onChange={(e) => handleInputChange('brandTagline', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Next-Gen Operations & Fleet Telemetry"
                    />
                    <p className="text-xs text-slate-500 mt-1">Slogan affiché dans l'en-tête de votre espace tenant.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Logo Image URL
                    </label>
                    <input
                      type="text"
                      value={formData.logoUrl || ''}
                      onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-slate-500 mt-1">URL directe vers l'image PNG/SVG du logo de votre entreprise.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FINANCIALS & OPERATION CAPS */}
          {wizardStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">4. Financial Budgets & Operational Rules</h3>
                  <p className="text-xs text-slate-500">Set maintenance budget limits, workshop labor rates, and emergency dispatch caps.</p>
                </div>
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Allocated Quarterly Budget ({formData.currencySymbol}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={formData.allocatedBudget}
                      onChange={(e) => handleInputChange('allocatedBudget', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">
                      {formData.currencySymbol}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Total authorized maintenance and fleet operation expenditure limit.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Money Used / Actual Expenditure ({formData.currencySymbol}) *
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncMoneyUsed}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Sync Cost Records
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={formData.moneyUsed}
                      onChange={(e) => handleInputChange('moneyUsed', Number(e.target.value))}
                      disabled={formData.autoSyncMoneyUsed}
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm font-semibold text-slate-900 ${
                        formData.autoSyncMoneyUsed
                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                          : 'border-slate-300 focus:border-indigo-500'
                      }`}
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">
                      {formData.currencySymbol}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoSyncCheck"
                      checked={formData.autoSyncMoneyUsed}
                      onChange={(e) => handleInputChange('autoSyncMoneyUsed', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="autoSyncCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Auto-sync money used from live fleet cost records ({formData.currencySymbol}{costRecords.reduce((s, c) => s + c.amount, 0).toLocaleString()})
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Default Workshop Labor Rate ({formData.currencySymbol} / hour) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={5}
                      value={formData.defaultLaborRate}
                      onChange={(e) => handleInputChange('defaultLaborRate', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">
                      {formData.currencySymbol}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Standard hourly rate used for Rule R4 work order repair cost estimates.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Emergency Maintenance Approval Cap ({formData.currencySymbol}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={500}
                      value={formData.emergencyApprovalThreshold}
                      onChange={(e) => handleInputChange('emergencyApprovalThreshold', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">
                      {formData.currencySymbol}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Rule R1 emergency dispatches exceeding this limit require Technical Controller sign-off.</p>
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="notificationsEnabled"
                    checked={formData.notificationsEnabled !== false}
                    onChange={(e) => handleInputChange('notificationsEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="notificationsEnabled" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Activer les notifications automatiques d'alertes par Email et SMS pour ce Tenant (R1 - R7)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONTACT, BILLING & REVIEW */}
          {wizardStep === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">5. Operations Contact & Supabase Review</h3>
                  <p className="text-xs text-slate-500">Review all configured settings before saving and persisting to Supabase.</p>
                </div>
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Official Operations Contact Email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="operations@nexttransit.com"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Receives automated low-stock alerts (Rule R3) and emergency dispatches.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Contact Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="+1 (555) 234-8900"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Registered Billing Address *
                  </label>
                  <div className="relative">
                    <textarea
                      rows={2}
                      required
                      value={formData.billingAddress}
                      onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="100 Logistics Blvd, Suite 400, Chicago, IL 60607"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Summary Configuration Card */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Workspace Configuration Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block">Society Name:</span>
                    <strong className="text-slate-900 truncate block">{formData.societyName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Currency & Symbol:</span>
                    <strong className="text-slate-900">{formData.currency} ({formData.currencySymbol})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Default Language:</span>
                    <strong className="text-slate-900 uppercase">{formData.defaultLanguage || 'fr'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Allocated Budget:</span>
                    <strong className="text-slate-900">{formData.currencySymbol}{formData.allocatedBudget.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: TELEMATICS & DEVICE MAPPINGS */}
          {wizardStep === 6 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    6. Vendor-Agnostic Telematics & Device Hardware Mappings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure telemetry providers per vehicle. Decision Rules (R1–R7) run seamlessly across manual/declarative data and connected hardware boxes (Teltonika / Flespi / Wialon).
                  </p>
                </div>
                <Radio className="w-5 h-5 text-indigo-600 animate-pulse" />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span>
                    Tenant Telematics Protocol: <strong className="text-slate-900">Pluggable Vendor Adapter Engine</strong>
                  </span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded text-[11px]">
                  R1–R7 Vendor Independent
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Per-Vehicle Hardware Mapping Matrix
                </h4>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {vehicles.map((v) => {
                    const mapping = deviceMappings.find((m) => m.vehicle_id === v.id);
                    const currentProvider: TelematicsProviderType = mapping?.provider || 'manual';
                    const currentExternalId = mapping?.external_device_id || `MAN-${v.id}`;
                    const isSaving = savingMappingVehicleId === v.id;

                    return (
                      <div
                        key={v.id}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                            {v.plate.substring(0, 4)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {v.name} ({v.plate})
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                  v.status === 'Healthy'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {v.status}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">
                              ID: {v.id} • Classification: {v.classification}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex flex-col">
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                              Telematics Adapter
                            </label>
                            <select
                              value={currentProvider}
                              onChange={(e) =>
                                handleDeviceMappingChange(
                                  v.id,
                                  e.target.value as TelematicsProviderType,
                                  currentExternalId
                                )
                              }
                              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer bg-white"
                            >
                              <option value="manual">Manual / Declarative (SaaS Standalone)</option>
                              <option value="teltonika">Teltonika FM/FMM Series (Phase 2 OBD)</option>
                              <option value="flespi_wialon">Flespi / Wialon Middleware (Phase 2 Stream)</option>
                            </select>
                          </div>

                          <div className="flex flex-col">
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                              External Device ID / IMEI
                            </label>
                            <input
                              type="text"
                              defaultValue={currentExternalId}
                              onBlur={(e) => {
                                if (e.target.value !== currentExternalId) {
                                  handleDeviceMappingChange(v.id, currentProvider, e.target.value);
                                }
                              }}
                              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-48"
                              placeholder="IMEI / Serial"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 pt-4 sm:pt-0">
                            {currentProvider === 'manual' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200"
                                title="Phase 2 credentials required"
                              >
                                <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Phase 2 Standby
                              </span>
                            )}
                            {isSaving && <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons & Wizard Controls Bar */}
          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {viewMode === 'wizard' && wizardStep > 1 && (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Step
                </button>
              )}

              {viewMode === 'wizard' && wizardStep < WIZARD_STEPS.length && (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => Math.min(WIZARD_STEPS.length, prev + 1))}
                  className="flex items-center gap-1 px-5 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  Next Step
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Auto-Save Status Badge (replaces manual Save button) */}
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm font-medium shadow-2xs">
                {autoSaveStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-indigo-700 font-semibold">Syncing auto-save to Supabase...</span>
                  </>
                ) : autoSaveStatus === 'pending' ? (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-amber-700 font-semibold">Auto-saving in 2s...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Auto-saved to Supabase</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                Discard Changes
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Profile (JSON)
            </button>
          </div>
        </form>
      </div>

      {/* Modal: Add New Society / Tenant Profile */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Register New Tenant / Workspace</h3>
              </div>
              <button
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNewTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Society / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTenantData.societyName}
                  onChange={(e) => setNewTenantData({ ...newTenantData, societyName: e.target.value })}
                  placeholder="e.g. TransNational Logistics Corp"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Operating Currency *
                  </label>
                  <select
                    value={newTenantData.currency}
                    onChange={(e) => {
                      const curr = e.target.value;
                      let sym = '$';
                      if (curr.includes('DZD') || curr.includes('DA')) sym = 'DA';
                      else if (curr.includes('€')) sym = '€';
                      else if (curr.includes('£')) sym = '£';
                      else if (curr.includes('CAD')) sym = 'C$';
                      else if (curr.includes('AED')) sym = 'AED';
                      setNewTenantData({ ...newTenantData, currency: curr, currencySymbol: sym });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 font-medium"
                  >
                    <option value="DZD (DA)">DZD (DA)</option>
                    <option value="USD ($)">USD ($)</option>
                    <option value="EUR (€)">EUR (€)</option>
                    <option value="GBP (£)">GBP (£)</option>
                    <option value="CAD ($)">CAD (C$)</option>
                    <option value="AED (AED)">AED (AED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Allocated Budget ({newTenantData.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newTenantData.allocatedBudget}
                    onChange={(e) => setNewTenantData({ ...newTenantData, allocatedBudget: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Tax Registration ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenantData.taxRegistrationId}
                    onChange={(e) => setNewTenantData({ ...newTenantData, taxRegistrationId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Cost Center Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenantData.costCenterCode}
                    onChange={(e) => setNewTenantData({ ...newTenantData, costCenterCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Default Language *
                  </label>
                  <select
                    value={newTenantData.defaultLanguage || 'fr'}
                    onChange={(e) => setNewTenantData({ ...newTenantData, defaultLanguage: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="fr">Français (FR)</option>
                    <option value="en">English (EN)</option>
                    <option value="ar">العربية (AR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Timezone *
                  </label>
                  <select
                    value={newTenantData.timezone || 'Africa/Algiers'}
                    onChange={(e) => setNewTenantData({ ...newTenantData, timezone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="Africa/Algiers">Africa/Algiers (UTC+1)</option>
                    <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
                    <option value="Europe/Berlin">Europe/Berlin (UTC+1/+2)</option>
                    <option value="America/Chicago">America/Chicago (UTC-6/-5)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Brand Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newTenantData.primaryColor || '#4f46e5'}
                    onChange={(e) => setNewTenantData({ ...newTenantData, primaryColor: e.target.value })}
                    className="h-9 w-12 rounded border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newTenantData.brandTagline || ''}
                    onChange={(e) => setNewTenantData({ ...newTenantData, brandTagline: e.target.value })}
                    placeholder="Brand tagline (e.g., Regional Logistics Excellence)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer"
                >
                  Create & Activate Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
