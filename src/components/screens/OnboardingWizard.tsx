import React, { useState, useCallback } from 'react';
import {
  Building2,
  Truck,
  Users,
  Settings2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';
import { useLocalization } from '../../context/LocalizationContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface CompanyForm {
  societyName: string;
  currency: string;
  timezone: string;
  contactEmail: string;
  contactPhone: string;
  operatingRegion: string;
  taxRegistrationId: string;
  defaultLanguage: 'fr' | 'en' | 'ar';
}

interface VehicleForm {
  registration: string;
  make: string;
  model: string;
  year: string;
  vehicleType: string;
  currentMileage: string;
}

interface InviteEntry {
  email: string;
  role: string;
}

interface CaeForm {
  allocatedBudget: string;
  engineVarianceThreshold: string;
  electricalVarianceThreshold: string;
  brakeVarianceThreshold: string;
  chassisVarianceThreshold: string;
  defaultLaborRate: string;
  emergencyApprovalThreshold: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const CURRENCY_OPTIONS = [
  { value: 'DZD (DA)', label: 'DZD (DA) — Dinar Algérien' },
  { value: 'EUR (€)', label: 'EUR (€) — Euro' },
  { value: 'USD ($)', label: 'USD ($) — Dollar US' },
  { value: 'MAD (MAD)', label: 'MAD — Dirham Marocain' },
  { value: 'TND (TND)', label: 'TND — Dinar Tunisien' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Africa/Algiers', label: 'Africa/Algiers (UTC+1)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1/+2)' },
  { value: 'Africa/Casablanca', label: 'Africa/Casablanca' },
  { value: 'Africa/Tunis', label: 'Africa/Tunis' },
  { value: 'UTC', label: 'UTC' },
];

const VEHICLE_TYPES = [
  'Camion porteur',
  'Semi-remorque',
  'Camion-benne',
  'Camion frigorifique',
  'Camion-citerne',
  'Bus / Autocar',
  'Véhicule utilitaire léger',
  'Autre',
];

const RBAC_ROLES = [
  { value: 'FLEET_MANAGER', label: { fr: 'Chef de Flotte', en: 'Fleet Manager', ar: 'مدير الأسطول' } },
  { value: 'MAINTENANCE_MANAGER', label: { fr: 'Responsable Maintenance', en: 'Maintenance Manager', ar: 'مسؤول الصيانة' } },
  { value: 'FINANCE', label: { fr: 'Contrôle de Gestion', en: 'Finance Controller', ar: 'المراقب المالي' } },
  { value: 'OPERATIONS', label: { fr: 'Gestionnaire Opérations', en: 'Operations Manager', ar: 'مدير العمليات' } },
  { value: 'MECHANIC', label: { fr: 'Technicien Mécanicien', en: 'Mechanic', ar: 'ميكانيكي' } },
  { value: 'DRIVER', label: { fr: 'Chauffeur', en: 'Driver', ar: 'سائق' } },
];

// ─────────────────────────────────────────────────────────────────────────────
// i18n helpers
// ─────────────────────────────────────────────────────────────────────────────
type Lang = 'fr' | 'en' | 'ar';

const translations: Record<string, Record<Lang, string>> = {
  stepLabel0: { fr: 'Votre Entreprise', en: 'Your Company', ar: 'شركتك' },
  stepLabel1: { fr: 'Premier Véhicule', en: 'First Vehicle', ar: 'أول مركبة' },
  stepLabel2: { fr: 'Équipe', en: 'Team', ar: 'الفريق' },
  stepLabel3: { fr: 'Budgets & Seuils', en: 'Budgets & Thresholds', ar: 'الميزانيات والحدود' },
  title: { fr: 'Configuration initiale de votre espace', en: 'Initial workspace configuration', ar: 'إعداد فضاء العمل الأولي' },
  subtitle: { fr: 'Quelques informations pour personnaliser NextTransit selon votre flotte.', en: 'A few details to tailor NextTransit to your fleet.', ar: 'بعض المعلومات لتخصيص NextTransit وفق أسطولك.' },
  next: { fr: 'Suivant', en: 'Next', ar: 'التالي' },
  back: { fr: 'Retour', en: 'Back', ar: 'رجوع' },
  finish: { fr: 'Lancer la Plateforme', en: 'Launch Platform', ar: 'إطلاق المنصة' },
  saving: { fr: 'Enregistrement…', en: 'Saving…', ar: 'جاري الحفظ…' },
  skip: { fr: 'Ignorer cette étape', en: 'Skip this step', ar: 'تخطي هذه الخطوة' },
  companyName: { fr: 'Raison sociale', en: 'Company Name', ar: 'الاسم الاجتماعي' },
  currency: { fr: 'Devise de référence', en: 'Reference Currency', ar: 'العملة المرجعية' },
  timezone: { fr: 'Fuseau horaire', en: 'Timezone', ar: 'المنطقة الزمنية' },
  contactEmail: { fr: 'Email de contact', en: 'Contact Email', ar: 'البريد الإلكتروني' },
  contactPhone: { fr: 'Téléphone', en: 'Phone Number', ar: 'رقم الهاتف' },
  operatingRegion: { fr: "Région d'exploitation", en: 'Operating Region', ar: 'منطقة الاستغلال' },
  taxId: { fr: 'Numéro Fiscal (NIF)', en: 'Tax Registration ID', ar: 'رقم التعريف الجبائي' },
  defaultLang: { fr: 'Langue par défaut', en: 'Default Language', ar: 'اللغة الافتراضية' },
  firstVehicleHint: { fr: 'Enregistrez votre premier véhicule dans la flotte.', en: 'Register your first vehicle in the fleet.', ar: 'سجّل أول مركبة في الأسطول.' },
  registration: { fr: 'Immatriculation', en: 'Registration Plate', ar: 'رقم التسجيل' },
  make: { fr: 'Marque', en: 'Make', ar: 'الماركة' },
  model: { fr: 'Modèle', en: 'Model', ar: 'الطراز' },
  year: { fr: 'Année', en: 'Year', ar: 'السنة' },
  vehicleType: { fr: 'Type de véhicule', en: 'Vehicle Type', ar: 'نوع المركبة' },
  currentMileage: { fr: 'Kilométrage actuel (km)', en: 'Current Mileage (km)', ar: 'المسافة الحالية (كم)' },
  inviteDescription: { fr: "Ajoutez les membres qui recevront leurs accès par email.", en: 'Add members who will receive their access credentials by email.', ar: 'أضف الأعضاء الذين سيتلقون صلاحياتهم بالبريد الإلكتروني.' },
  noInvites: { fr: "Aucune invitation. Vous pourrez en ajouter depuis les paramètres.", en: 'No invitations yet. You can add them later from platform settings.', ar: 'لا توجد دعوات حتى الآن. يمكنك إضافتها لاحقاً من الإعدادات.' },
  addInvite: { fr: 'Ajouter une invitation', en: 'Add Invitation', ar: 'إضافة دعوة' },
  inviteEmail: { fr: 'Email du collaborateur', en: "Collaborator's Email", ar: 'بريد الزميل' },
  budgetDesc: { fr: "Définissez le budget annuel de maintenance et les seuils d'alerte de variance (R7).", en: 'Set annual maintenance budget and R7 variance alert thresholds.', ar: 'حدد ميزانية الصيانة السنوية وعتبات تنبيه التباين R7.' },
  allocatedBudget: { fr: 'Budget annuel maintenance', en: 'Annual Maintenance Budget', ar: 'ميزانية الصيانة السنوية' },
  engineVariance: { fr: 'Seuil variance Moteur (%)', en: 'Engine Variance Threshold (%)', ar: 'حد تباين المحرك (%)' },
  electricalVariance: { fr: 'Seuil variance Électrique (%)', en: 'Electrical Variance Threshold (%)', ar: 'حد تباين الكهرباء (%)' },
  brakeVariance: { fr: 'Seuil variance Freinage (%)', en: 'Brake Variance Threshold (%)', ar: 'حد تباين الفرامل (%)' },
  chassisVariance: { fr: 'Seuil variance Châssis (%)', en: 'Chassis Variance Threshold (%)', ar: 'حد تباين الهيكل (%)' },
  laborRate: { fr: "Taux horaire main-d'oeuvre (DA/h)", en: 'Labor Hourly Rate (DA/h)', ar: 'سعر العمل بالساعة (د.ج/س)' },
  emergencyThreshold: { fr: 'Seuil approbation urgence (DA)', en: 'Emergency Approval Threshold (DA)', ar: 'حد الموافقة الطارئة (د.ج)' },
  stepCounter: { fr: 'Étape', en: 'Step', ar: 'الخطوة' },
  stepOf: { fr: 'sur', en: 'of', ar: 'من' },
  saveError: { fr: "Une erreur est survenue lors de l'enregistrement.", en: 'An error occurred while saving.', ar: 'حدث خطأ أثناء الحفظ.' },
};

const tr = (key: string, lang: Lang): string => translations[key]?.[lang] ?? translations[key]?.fr ?? key;

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI atoms
// ─────────────────────────────────────────────────────────────────────────────
const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, required }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-ochre/40 focus:border-ochre transition-all"
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-ochre/40 focus:border-ochre transition-all cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Company Info
// ─────────────────────────────────────────────────────────────────────────────
const StepCompany: React.FC<{ form: CompanyForm; setForm: (f: CompanyForm) => void; lang: Lang }> = ({ form, setForm, lang }) => {
  const set = (k: keyof CompanyForm) => (v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <InputField label={tr('companyName', lang)} value={form.societyName} onChange={set('societyName')} required placeholder="Ex: SARL Akram Transport & Logistique" />
      </div>
      <SelectField label={tr('currency', lang)} value={form.currency} onChange={set('currency')} options={CURRENCY_OPTIONS} />
      <SelectField label={tr('timezone', lang)} value={form.timezone} onChange={set('timezone')} options={TIMEZONE_OPTIONS} />
      <InputField label={tr('contactEmail', lang)} value={form.contactEmail} onChange={set('contactEmail')} type="email" placeholder="ops@votreentreprise.dz" />
      <InputField label={tr('contactPhone', lang)} value={form.contactPhone} onChange={set('contactPhone')} type="tel" placeholder="+213 555 123 456" />
      <InputField label={tr('operatingRegion', lang)} value={form.operatingRegion} onChange={set('operatingRegion')} placeholder="Ex: Grand Alger — Constantine" />
      <InputField label={tr('taxId', lang)} value={form.taxRegistrationId} onChange={set('taxRegistrationId')} placeholder="NIF: 000319180001234" />
      <SelectField
        label={tr('defaultLang', lang)}
        value={form.defaultLanguage}
        onChange={(v) => set('defaultLanguage')(v as Lang)}
        options={[
          { value: 'fr', label: 'Français 🇫🇷' },
          { value: 'en', label: 'English 🇬🇧' },
          { value: 'ar', label: 'العربية 🇩🇿' },
        ]}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — First Vehicle
// ─────────────────────────────────────────────────────────────────────────────
const StepVehicle: React.FC<{ form: VehicleForm; setForm: (f: VehicleForm) => void; lang: Lang }> = ({ form, setForm, lang }) => {
  const set = (k: keyof VehicleForm) => (v: string) => setForm({ ...form, [k]: v });
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => String(currentYear - i));
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-50 border border-sky-200">
        <Truck className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
        <p className="text-xs text-sky-700">{tr('firstVehicleHint', lang)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label={tr('registration', lang)} value={form.registration} onChange={set('registration')} required placeholder="Ex: 19354-309-16" />
        <SelectField label={tr('vehicleType', lang)} value={form.vehicleType} onChange={set('vehicleType')} options={VEHICLE_TYPES.map((v) => ({ value: v, label: v }))} />
        <InputField label={tr('make', lang)} value={form.make} onChange={set('make')} placeholder="Ex: Renault, MAN, Mercedes" />
        <InputField label={tr('model', lang)} value={form.model} onChange={set('model')} placeholder="Ex: Trucks T 460" />
        <SelectField label={tr('year', lang)} value={form.year} onChange={set('year')} options={years.map((y) => ({ value: y, label: y }))} />
        <InputField label={tr('currentMileage', lang)} value={form.currentMileage} onChange={set('currentMileage')} type="number" placeholder="Ex: 142000" />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Team Invites
// ─────────────────────────────────────────────────────────────────────────────
const StepTeam: React.FC<{ invites: InviteEntry[]; setInvites: (i: InviteEntry[]) => void; lang: Lang }> = ({ invites, setInvites, lang }) => {
  const addRow = () => setInvites([...invites, { email: '', role: 'FLEET_MANAGER' }]);
  const removeRow = (idx: number) => setInvites(invites.filter((_, i) => i !== idx));
  const update = (idx: number, key: keyof InviteEntry, val: string) =>
    setInvites(invites.map((entry, i) => (i === idx ? { ...entry, [key]: val } : entry)));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-violet-50 border border-violet-200">
        <Users className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700">{tr('inviteDescription', lang)}</p>
      </div>
      {invites.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-6">{tr('noInvites', lang)}</p>
      )}
      <div className="space-y-2.5">
        {invites.map((entry, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <input
              type="email"
              value={entry.email}
              onChange={(e) => update(idx, 'email', e.target.value)}
              placeholder={tr('inviteEmail', lang)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-ochre/40 focus:border-ochre transition-all"
            />
            <select
              value={entry.role}
              onChange={(e) => update(idx, 'role', e.target.value)}
              className="w-44 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-ochre/40 focus:border-ochre transition-all cursor-pointer"
            >
              {RBAC_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label[lang] || r.label.fr}</option>
              ))}
            </select>
            <button
              onClick={() => removeRow(idx)}
              className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addRow}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-ochre text-slate-600 hover:text-ochre text-sm font-semibold transition cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        {tr('addInvite', lang)}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — CAE Budget & Thresholds
// ─────────────────────────────────────────────────────────────────────────────
const StepCae: React.FC<{ form: CaeForm; setForm: (f: CaeForm) => void; lang: Lang }> = ({ form, setForm, lang }) => {
  const set = (k: keyof CaeForm) => (v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">{tr('budgetDesc', lang)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <InputField label={tr('allocatedBudget', lang)} value={form.allocatedBudget} onChange={set('allocatedBudget')} type="number" placeholder="Ex: 12000000" />
        </div>
        <InputField label={tr('engineVariance', lang)} value={form.engineVarianceThreshold} onChange={set('engineVarianceThreshold')} type="number" placeholder="10" />
        <InputField label={tr('electricalVariance', lang)} value={form.electricalVarianceThreshold} onChange={set('electricalVarianceThreshold')} type="number" placeholder="10" />
        <InputField label={tr('brakeVariance', lang)} value={form.brakeVarianceThreshold} onChange={set('brakeVarianceThreshold')} type="number" placeholder="10" />
        <InputField label={tr('chassisVariance', lang)} value={form.chassisVarianceThreshold} onChange={set('chassisVarianceThreshold')} type="number" placeholder="10" />
        <InputField label={tr('laborRate', lang)} value={form.defaultLaborRate} onChange={set('defaultLaborRate')} type="number" placeholder="2500" />
        <InputField label={tr('emergencyThreshold', lang)} value={form.emergencyApprovalThreshold} onChange={set('emergencyApprovalThreshold')} type="number" placeholder="500000" />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Wizard Component
// ─────────────────────────────────────────────────────────────────────────────
export const OnboardingWizard: React.FC = () => {
  const { currentLanguage, dir } = useLocalization();
  const lang: Lang = currentLanguage === 'fr' || currentLanguage === 'en' || currentLanguage === 'ar' ? currentLanguage : 'fr';
  const { userProfile, navigate: authNavigate } = useAuth() as unknown as {
    currentUser: { id: string } | null;
    userProfile: { tenant_id?: string } | null;
    navigate: ((path: string) => void) | null;
  };
  const { updateTenantConfig, activeTenantId } = useTenant();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    societyName: '',
    currency: 'DZD (DA)',
    timezone: 'Africa/Algiers',
    contactEmail: '',
    contactPhone: '',
    operatingRegion: '',
    taxRegistrationId: '',
    defaultLanguage: lang,
  });

  const [vehicleForm, setVehicleForm] = useState<VehicleForm>({
    registration: '',
    make: '',
    model: '',
    year: String(new Date().getFullYear()),
    vehicleType: 'Camion porteur',
    currentMileage: '',
  });

  const [invites, setInvites] = useState<InviteEntry[]>([]);

  const [caeForm, setCaeForm] = useState<CaeForm>({
    allocatedBudget: '',
    engineVarianceThreshold: '10',
    electricalVarianceThreshold: '10',
    brakeVarianceThreshold: '10',
    chassisVarianceThreshold: '10',
    defaultLaborRate: '2500',
    emergencyApprovalThreshold: '500000',
  });

  const STEPS = 4;

  const handleFinish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const tenantId = userProfile?.tenant_id;

      if (tenantId) {
        await supabase
          .from('tenants')
          .update({
            name: companyForm.societyName || undefined,
            currency: companyForm.currency,
            contact_email: companyForm.contactEmail || undefined,
            contact_phone: companyForm.contactPhone || undefined,
            operating_region: companyForm.operatingRegion || undefined,
            tax_registration_id: companyForm.taxRegistrationId || undefined,
            default_language: companyForm.defaultLanguage,
            timezone: companyForm.timezone,
            allocated_budget: caeForm.allocatedBudget ? Number(caeForm.allocatedBudget) : undefined,
            default_labor_rate: Number(caeForm.defaultLaborRate) || 2500,
            emergency_approval_threshold: Number(caeForm.emergencyApprovalThreshold) || 500000,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('id', tenantId);

        if (vehicleForm.registration.trim()) {
          await supabase.from('vehicles').insert({
            tenant_id: tenantId,
            registration: vehicleForm.registration.trim(),
            make: vehicleForm.make || 'N/A',
            model: vehicleForm.model || 'N/A',
            year: Number(vehicleForm.year) || new Date().getFullYear(),
            vehicle_type: vehicleForm.vehicleType,
            current_mileage_km: Number(vehicleForm.currentMileage) || 0,
            status: 'Operational',
          });
        }
      }

      // Optimistic local update
      updateTenantConfig(activeTenantId, {
        societyName: companyForm.societyName,
        currency: companyForm.currency,
        contactEmail: companyForm.contactEmail,
        contactPhone: companyForm.contactPhone,
        operatingRegion: companyForm.operatingRegion,
        taxRegistrationId: companyForm.taxRegistrationId,
        defaultLanguage: companyForm.defaultLanguage,
        timezone: companyForm.timezone,
        allocatedBudget: Number(caeForm.allocatedBudget) || 0,
        defaultLaborRate: Number(caeForm.defaultLaborRate) || 2500,
        emergencyApprovalThreshold: Number(caeForm.emergencyApprovalThreshold) || 500000,
      });

      if (authNavigate) {
        authNavigate('/dashboard');
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError(tr('saveError', lang));
    } finally {
      setSaving(false);
    }
  }, [companyForm, vehicleForm, caeForm, userProfile, activeTenantId, updateTenantConfig, authNavigate, lang]);

  const stepIcons = [Building2, Truck, Users, Settings2];

  const canProceed = step === 0 ? companyForm.societyName.trim().length > 0 : true;

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-ochre/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ochre/10 border border-ochre/20">
            <ShieldCheck className="h-4 w-4 text-ochre" />
            <span className="text-xs font-bold text-ochre tracking-wide uppercase">NextTransit SaaS</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{tr('title', lang)}</h1>
          <p className="text-sm text-slate-500">{tr('subtitle', lang)}</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-between mb-8 px-2">
          {stepIcons.map((Icon, idx) => {
            const isCompleted = idx < step;
            const isCurrent = idx === step;
            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                        : isCurrent
                        ? 'bg-ochre text-ink shadow-md shadow-amber-200 scale-110'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`text-[10px] font-semibold hidden sm:block ${
                      isCurrent ? 'text-ochre' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {tr(`stepLabel${idx}`, lang)}
                  </span>
                </div>
                {idx < STEPS - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${idx < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6 sm:p-8 space-y-6">
          {step === 0 && <StepCompany form={companyForm} setForm={setCompanyForm} lang={lang} />}
          {step === 1 && <StepVehicle form={vehicleForm} setForm={setVehicleForm} lang={lang} />}
          {step === 2 && <StepTeam invites={invites} setInvites={setInvites} lang={lang} />}
          {step === 3 && <StepCae form={caeForm} setForm={setCaeForm} lang={lang} />}

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                {tr('back', lang)}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {step > 0 && step < STEPS - 1 && (
                <button
                  onClick={() => setStep(step + 1)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition cursor-pointer"
                >
                  {tr('skip', lang)}
                </button>
              )}

              {step < STEPS - 1 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ochre hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-ink text-sm font-bold shadow-sm transition cursor-pointer"
                >
                  {tr('next', lang)}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-ochre to-amber-500 hover:from-amber-500 hover:to-ochre disabled:opacity-50 disabled:cursor-not-allowed text-ink text-sm font-bold shadow-md shadow-amber-200 transition cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {tr('saving', lang)}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {tr('finish', lang)}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          {lang === 'ar'
            ? `الخطوة ${step + 1} من ${STEPS}`
            : lang === 'en'
            ? `Step ${step + 1} of ${STEPS}`
            : `Étape ${step + 1} sur ${STEPS}`}
        </p>
      </div>
    </div>
  );
};
