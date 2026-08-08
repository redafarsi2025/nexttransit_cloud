import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { DriverSafetyView } from './DriverSafetyView';
import { recordAudit } from '../../services/auditService';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  UserCheck,
  UserX,
  Gauge,
  Zap,
  MapPin,
  Clock,
  ChevronRight,
  Filter,
  Search,
  Bell,
  Wrench,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  Info,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Award,
  Medal,
  Crown,
  Star,
  Gift,
  ThumbsUp
} from 'lucide-react';

interface DriverTelemetry {
  id: string;
  name: string;
  role: string;
  vehiclePlate: string;
  vehicleName: string;
  routeSector: string;
  distanceKm: number;
  harshBrakingCount: number; // > 0.4g deceleration
  rapidAccelCount: number; // RPM surge spikes
  highCorneringCount: number; // > 0.35g lateral force
  speedingIncidents: number; // > 100km/h highway or > 60km/h urban
  fatigueHours: number; // Continuous driving without 45min rest
  safetyScore: number; // 0-100
  mechanicalImpact: string;
  status: 'Exemplary' | 'Moderate Risk' | 'High Risk';
  lastEventTime: string;
  lastEventType: string;
}

const INITIAL_DRIVERS_TELEMETRY: DriverTelemetry[] = [
  {
    id: 'DRV-001',
    name: 'Kamel Benali',
    role: 'Senior Heavy Transit Driver',
    vehiclePlate: '00412-116-16',
    vehicleName: 'Transit Truck TM-14',
    routeSector: 'Route C-3 (Alger ↔ Oran)',
    distanceKm: 4250,
    harshBrakingCount: 14,
    rapidAccelCount: 9,
    highCorneringCount: 8,
    speedingIncidents: 6,
    fatigueHours: 5.2,
    safetyScore: 62,
    mechanicalImpact: 'Harsh braking accelerated brake pad wear on TM-14 by +42% (OBD Code P0571 logged).',
    status: 'High Risk',
    lastEventTime: 'Today, 10:42 AM',
    lastEventType: 'Harsh Braking (-0.52g) @ Chlef Bypass',
  },
  {
    id: 'DRV-002',
    name: 'Yacine Amrani',
    role: 'Hazmat Fuel Tanker Driver',
    vehiclePlate: '09811-119-30',
    vehicleName: 'Tanker TR-08',
    routeSector: 'Trans-Sahara (Ouargla ↔ Hassi Messaoud)',
    distanceKm: 6100,
    harshBrakingCount: 3,
    rapidAccelCount: 2,
    highCorneringCount: 1,
    speedingIncidents: 0,
    fatigueHours: 2.1,
    safetyScore: 94,
    mechanicalImpact: 'Smooth acceleration preserved transmission fluid integrity; zero active fault codes.',
    status: 'Exemplary',
    lastEventTime: 'Yesterday, 16:15 PM',
    lastEventType: 'Normal Telemetry Ping',
  },
  {
    id: 'DRV-003',
    name: 'Mourad Chaouch',
    role: 'Regional Logistics Driver',
    vehiclePlate: '05432-118-06',
    vehicleName: 'Logistics Van FL-02',
    routeSector: 'Nord-Est (Béjaïa ↔ Sétif ↔ Constantine)',
    distanceKm: 3480,
    harshBrakingCount: 8,
    rapidAccelCount: 11,
    highCorneringCount: 5,
    speedingIncidents: 3,
    fatigueHours: 3.8,
    safetyScore: 79,
    mechanicalImpact: 'Frequent rapid acceleration increased fuel consumption by +14% vs fleet benchmark.',
    status: 'Moderate Risk',
    lastEventTime: 'Today, 08:30 AM',
    lastEventType: 'Rapid Acceleration Spikes (4200 RPM)',
  },
  {
    id: 'DRV-004',
    name: 'Sofiane Rahmouni',
    role: 'Inter-Wilaya Freight Operator',
    vehiclePlate: '01299-120-25',
    vehicleName: 'Freight Carrier FC-09',
    routeSector: 'Atlas Sector (Blida ↔ Médéa)',
    distanceKm: 2900,
    harshBrakingCount: 19,
    rapidAccelCount: 16,
    highCorneringCount: 12,
    speedingIncidents: 8,
    fatigueHours: 6.0,
    safetyScore: 54,
    mechanicalImpact: 'High mountain cornering speed degraded front tire tread by 3.2mm in 30 days.',
    status: 'High Risk',
    lastEventTime: 'Today, 11:05 AM',
    lastEventType: 'Speeding (112 km/h in 80 km/h mountain zone)',
  },
  {
    id: 'DRV-005',
    name: 'Karim Meziane',
    role: 'Urban Fleet Driver',
    vehiclePlate: '03341-117-31',
    vehicleName: 'Urban Delivery UD-05',
    routeSector: 'Greater Algiers Ring Road',
    distanceKm: 1850,
    harshBrakingCount: 4,
    rapidAccelCount: 3,
    highCorneringCount: 2,
    speedingIncidents: 1,
    fatigueHours: 1.5,
    safetyScore: 91,
    mechanicalImpact: 'Optimal braking habits maintained zero brake pad thermal strain.',
    status: 'Exemplary',
    lastEventTime: 'Today, 09:12 AM',
    lastEventType: 'Stop & Go Traffic Managed',
  },
];

export const SafetyPerformance: React.FC = () => {
  const { currentLanguage, dir, t } = useLocalization();
  const { setSelectedVehicleId, createWorkOrder } = useFleet();
  const { currentRole } = useAuth();

  const [drivers, setDrivers] = useState<DriverTelemetry[]>(INITIAL_DRIVERS_TELEMETRY);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'All' | 'High Risk' | 'Moderate Risk' | 'Exemplary'>('All');
  const [selectedDriver, setSelectedDriver] = useState<DriverTelemetry | null>(null);
  const [actionNotification, setActionNotification] = useState<string | null>(null);
  const [simulatedDriverId, setSimulatedDriverId] = useState<string>('DRV-001');

  // Filtered list
  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.routeSector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = filterRisk === 'All' || d.status === filterRisk;
    return matchesSearch && matchesRisk;
  });

  // Calculate fleet stats
  const totalKm = drivers.reduce((acc, d) => acc + d.distanceKm, 0);
  const totalHarshBrakes = drivers.reduce((acc, d) => acc + d.harshBrakingCount, 0);
  const totalRapidAccels = drivers.reduce((acc, d) => acc + d.rapidAccelCount, 0);
  const totalCornering = drivers.reduce((acc, d) => acc + d.highCorneringCount, 0);
  const totalSpeeding = drivers.reduce((acc, d) => acc + d.speedingIncidents, 0);
  const avgSafetyScore = Math.round(
    drivers.reduce((acc, d) => acc + d.safetyScore, 0) / drivers.length
  );
  const highRiskCount = drivers.filter((d) => d.status === 'High Risk').length;

  // Calculate ranked drivers for Leaderboard
  const rankedDrivers = [...drivers].sort((a, b) => b.safetyScore - a.safetyScore);
  const topThree = rankedDrivers.slice(0, 3);

  const showToast = (msg: string) => {
    setActionNotification(msg);
    setTimeout(() => setActionNotification(null), 4000);
  };

  const handleAwardBonus = (driver: DriverTelemetry, bonusAmount: string = '15 000 DZD') => {
    recordAudit(
      'driver_bonus',
      driver.id,
      'APPROVAL',
      { previous_bonus_status: 'None', safety_score: driver.safetyScore },
      { bonus_awarded: bonusAmount, driver_name: driver.name, awarded_by: currentRole },
      'usr-dir-01',
      currentRole
    );

    showToast(
      currentLanguage === 'ar'
        ? `تم منح مكافأة السلامة CNPSR (${bonusAmount}) للسائق المتميز ${driver.name} (النقاط: ${driver.safetyScore}/100)`
        : currentLanguage === 'en'
        ? `CNPSR Safety Bonus (${bonusAmount}) awarded to top driver ${driver.name} (Score: ${driver.safetyScore}/100)`
        : `Prime de sécurité CNPSR (${bonusAmount}) attribuée au conducteur d'élite ${driver.name} (Score: ${driver.safetyScore}/100)`
    );
  };

  const handleIssueCoachingAlert = (driverName: string) => {
    showToast(
      currentLanguage === 'ar'
        ? `تم إرسال تنبيه توجيه السلامة والتنبيه بالسرعة إلى السائق ${driverName}`
        : currentLanguage === 'en'
        ? `Safety Coaching alert dispatched to driver app for ${driverName}`
        : `Alerte de coaching sécurité transmise à l'application du conducteur ${driverName}`
    );
  };

  const handleCreateR6Audit = (driver: DriverTelemetry) => {
    // Trigger work order creation logic for telemetry reconciliation (Rule R6)
    createWorkOrder({
      vehicle_id: driver.id,
      type: 'Investigation',
      parts_used: [],
      labor_hours: 2,
      hourly_rate: 2250,
      before_notes: `Telemetry Anomaly Flagged: Driver ${driver.name} recorded ${driver.harshBrakingCount} harsh brakes & ${driver.highCorneringCount} cornering spikes on ${driver.vehicleName}. Inspect mechanical strain.`,
      assigned_mechanic_id: 'MCH-001',
      assigned_mechanic_name: 'Mourad Benali',
    });

    showToast(
      currentLanguage === 'ar'
        ? `تم فتح أمر عمل تدقيق R6 للمركبة ${driver.vehicleName} والسائق ${driver.name}`
        : currentLanguage === 'en'
        ? `R6 Investigation Work Order created for vehicle ${driver.vehicleName} (${driver.name})`
        : `Ordre de travail d'audit R6 créé pour le véhicule ${driver.vehicleName} (${driver.name})`
    );
  };

  const currentDriver = drivers.find((d) => d.id === simulatedDriverId) || drivers[0];

  if (currentRole === 'DRIVER') {
    return (
      <div className="space-y-6" dir={dir}>
        {actionNotification && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-ochre/40 animate-bounce">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">{actionNotification}</span>
          </div>
        )}
        <DriverSafetyView
          drivers={drivers}
          simulatedDriverId={simulatedDriverId}
          setSimulatedDriverId={setSimulatedDriverId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Toast Alert */}
      {actionNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-ochre/40 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{actionNotification}</span>
        </div>
      )}

      {/* PANNEAU RESPONSABLE DE FLOTTE (FULL MGMT) */}
      <div className="space-y-6">
          {/* Top Title & Operational Context */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-ink text-white p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ochre/20 border border-ochre/40 text-ochre text-[11px] font-data uppercase tracking-wider font-bold">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {currentLanguage === 'ar' ? 'التحكم في العامل البشري' : currentLanguage === 'en' ? 'Human Factor Safety Telemetry' : 'Télémesure & Facteur Humain'}
                </span>
                <span className="text-xs text-slate-doc font-data font-bold">CNPSR Standard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
                {currentLanguage === 'ar'
                  ? 'لوحة أداء السلامة ومساءلة السائقين'
                  : currentLanguage === 'en'
                  ? 'Safety Performance & Driver Telemetry Dashboard'
                  : 'Tableau de Bord Sécurité & Comportement Conducteur'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-doc max-w-2xl leading-relaxed">
                {currentLanguage === 'ar'
                  ? 'في الجزائر، 96% من حوادث المرور تعود للخطأ البشري. تجمع المنصة بين بيانات الحساسات (G-Force, OBD) وتقارير السائقين لربط السلوك الشخصي بالأعطال وتفادي الحوادث قبل وقوعها.'
                  : currentLanguage === 'en'
                  ? 'In Algeria, 96% of road accidents stem from human error. NextTransit links real-time G-force & OBD telemetry to driver accountability, detecting high-risk behavior before it causes catastrophic failures.'
                  : 'En Algérie, 96% des accidents de la route sont dus au facteur humain. NextTransit relie la télémesure OBD (freinage, virages, accélération) à la responsabilité conducteur pour neutraliser le risque avant la panne.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setDrivers(INITIAL_DRIVERS_TELEMETRY)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-3 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-ochre" />
                <span>{currentLanguage === 'ar' ? 'إعادة ضبط البيانات' : currentLanguage === 'en' ? 'Reset Telemetry' : 'Réinitialiser'}</span>
              </button>
            </div>
          </div>

          {/* ALGERIAN CNPSR HUMAN FACTOR STATISTICAL INSIGHT BANNER */}
          <div className="bg-gradient-to-r from-red-950/40 via-ink-2 to-amber-950/30 border border-red-500/30 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400 font-black text-lg font-data">
                  96%
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-white">
                    {currentLanguage === 'ar'
                      ? 'المؤشر الوطني لحوادث المرور (السبب البشري الرئيسي)'
                      : currentLanguage === 'en'
                      ? 'National Road Safety Audit (96% Human Factor Breakdown)'
                      : 'Audit National de Sécurité Routière (96% Origine Humaine)'}
                  </h3>
                  <p className="text-xs text-slate-doc mt-1">
                    {currentLanguage === 'ar'
                      ? 'الإفراط في السرعة (48%)، الإرهاق وعدم أخذ قسط من الراحة (24%)، الكبح الفجائي والفرملة الحادة (18%). تمنحك الأداة القدرة على التحكيم الوقائي وإلزامية التوجيه.'
                      : currentLanguage === 'en'
                      ? 'Speeding (48%), Driver fatigue without rest (24%), Extreme braking (18%). Telemetry data converts individual driving habits into transparent safety scores.'
                      : 'Vitesse excessive (48%), fatigue sans pause (24%), freinages brusques (18%). La télémesure transforme les habitudes de conduite en score de responsabilité auditable.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-ink-3/90 border border-white/10 rounded-xl px-4 py-2 text-center">
                  <span className="text-[10px] text-slate-doc uppercase font-data block">Sائقون في دائرة الخطر</span>
                  <span className="text-base font-extrabold text-red-400 font-data">{highRiskCount} / {drivers.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Fleet Safety Score */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase font-display">
                  {currentLanguage === 'ar' ? 'مؤشر سلامة الأسطول' : currentLanguage === 'en' ? 'Fleet Safety Index' : 'Score Sécurité Global'}
                </span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold font-data text-xs ${avgSafetyScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {avgSafetyScore}
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-data">
                  {avgSafetyScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+4.2% {currentLanguage === 'ar' ? 'تحسن هذا الشهر' : currentLanguage === 'en' ? 'improvement vs last month' : 'vs mois dernier'}</span>
                </div>
              </div>
            </div>

            {/* Metric 2: Harsh Braking Rate */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase font-display">
                  {currentLanguage === 'ar' ? 'معدل الكبح الحاد' : currentLanguage === 'en' ? 'Harsh Braking Events' : 'Freinages Brusques'}
                </span>
                <div className="h-8 w-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-data">
                  {totalHarshBrakes} <span className="text-xs text-slate-400 font-normal">({(totalHarshBrakes / (totalKm / 100)).toFixed(1)} / 100km)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {currentLanguage === 'ar' ? 'تبسيط تآكل الفرامل وتفادي أعطال R1' : currentLanguage === 'en' ? 'Direct driver impact on brake pad lifecycle' : 'Impact direct sur l\'usure des plaquettes'}
                </p>
              </div>
            </div>

            {/* Metric 3: Rapid Acceleration & RPM Spikes */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase font-display">
                  {currentLanguage === 'ar' ? 'تسارع فجائي وارتفاع RPM' : currentLanguage === 'en' ? 'Rapid Accel & RPM Spikes' : 'Accélérations Brutales'}
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-data">
                  {totalRapidAccels} <span className="text-xs text-slate-400 font-normal">({(totalRapidAccels / (totalKm / 100)).toFixed(1)} / 100km)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {currentLanguage === 'ar' ? '+12% استهلاك زائد للوقود' : currentLanguage === 'en' ? '+12% fuel over-consumption' : '+12% surconsommation carburant'}
                </p>
              </div>
            </div>

            {/* Metric 4: Cornering Speed & Speeding */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase font-display">
                  {currentLanguage === 'ar' ? 'تجاوز السرعة وحيود المنعطفات' : currentLanguage === 'en' ? 'Cornering & Speeding' : 'Virages & Excès Vitesse'}
                </span>
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Gauge className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-data">
                  {totalCornering + totalSpeeding} <span className="text-xs text-slate-400 font-normal">incidents</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {currentLanguage === 'ar' ? 'تأثير مباشر على إطارات الشاحنات' : currentLanguage === 'en' ? 'Tire wear & rollover risk metric' : 'Usure pneumatiques & risque de déport'}
                </p>
              </div>
            </div>
          </div>

          {/* DRIVER SAFETY LEADERBOARD & TOP PERFORMERS PODIUM */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl border border-amber-200 shadow-2xs">
                  <Trophy className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-display text-slate-900">
                      {t('safety.leaderboard_title', {}, 'Driver Safety Leaderboard & Champions')}
                    </h2>
                    <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase rounded-full tracking-wider">
                      August 2026 Monthly Ranking
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('safety.leaderboard_desc', {}, 'Dynamic driver ranking derived from aggregate telemetry safety scores (G-force, braking, zero OBD faults)')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-xs font-semibold text-slate-500">
                  {currentLanguage === 'ar' ? 'معيار التقييم:' : 'Scoring Model:'}
                </span>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                  CNPSR 100-Point Index
                </span>
              </div>
            </div>

            {/* Top 3 Champions Podium Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {/* 1st Place - Gold Champion */}
              {topThree[0] && (
                <div className="relative bg-gradient-to-b from-amber-500/10 via-amber-50/40 to-white border-2 border-amber-400 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border border-amber-300 shadow-md flex items-center gap-1 whitespace-nowrap">
                    <Crown className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                    <span>{t('safety.podium_1st', {}, '1st Place - Gold Champion')}</span>
                  </div>

                  <div className="pt-2 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black font-data flex items-center justify-center text-base shadow-md">
                          {topThree[0].name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full shadow-2xs">
                          <Trophy className="w-3 h-3" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 font-display flex items-center gap-1.5">
                          <span>{topThree[0].name}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        </h3>
                        <p className="text-[11px] text-slate-500 font-data">{topThree[0].vehicleName} ({topThree[0].vehiclePlate})</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black font-data text-amber-700">
                        {topThree[0].safetyScore}
                        <span className="text-xs text-slate-400 font-normal">/100</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {topThree[0].status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-white/80 p-3 rounded-xl border border-amber-200/60">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{currentLanguage === 'ar' ? 'المسافة المقطوعة:' : 'Distance:'}</span>
                      <span className="font-bold font-data text-slate-800">{topThree[0].distanceKm.toLocaleString()} km</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{currentLanguage === 'ar' ? 'السرعة والفرامل:' : 'Driving Events:'}</span>
                      <span className="font-bold text-emerald-700">{topThree[0].harshBrakingCount} brakes / 0 speeding</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAwardBonus(topThree[0], '15 000 DZD')}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Gift className="w-4 h-4" />
                    <span>{t('safety.award_bonus', {}, 'Award Safety Bonus')} (15 000 DZD)</span>
                  </button>
                </div>
              )}

              {/* 2nd Place - Silver Leader */}
              {topThree[1] && (
                <div className="relative bg-gradient-to-b from-slate-200/20 via-slate-50 to-white border border-slate-300 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 text-white font-black text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1 whitespace-nowrap">
                    <Award className="w-3.5 h-3.5 text-slate-200" />
                    <span>{t('safety.podium_2nd', {}, '2nd Place - Silver Leader')}</span>
                  </div>

                  <div className="pt-2 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-300 text-slate-900 font-extrabold font-data flex items-center justify-center text-sm shadow-xs">
                        {topThree[1].name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 font-display">{topThree[1].name}</h3>
                        <p className="text-[11px] text-slate-500 font-data">{topThree[1].vehicleName}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black font-data text-slate-800">
                        {topThree[1].safetyScore}
                        <span className="text-xs text-slate-400 font-normal">/100</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {topThree[1].status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-100/70 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{currentLanguage === 'ar' ? 'المسافة:' : 'Distance:'}</span>
                      <span className="font-bold font-data text-slate-800">{topThree[1].distanceKm.toLocaleString()} km</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{currentLanguage === 'ar' ? 'الأداء:' : 'Performance:'}</span>
                      <span className="font-bold text-emerald-700">Zero Pad Thermal Strain</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAwardBonus(topThree[1], '10 000 DZD')}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-slate-300" />
                    <span>{t('safety.award_bonus', {}, 'Award Safety Bonus')} (10 000 DZD)</span>
                  </button>
                </div>
              )}

              {/* 3rd Place - Bronze Contender */}
              {topThree[2] && (
                <div className="relative bg-gradient-to-b from-amber-900/10 via-amber-50/20 to-white border border-amber-800/20 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-800 text-amber-100 font-black text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1 whitespace-nowrap">
                    <Medal className="w-3.5 h-3.5 text-amber-200" />
                    <span>{t('safety.podium_3rd', {}, '3rd Place - Bronze Contender')}</span>
                  </div>

                  <div className="pt-2 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-amber-800/20 text-amber-900 font-extrabold font-data flex items-center justify-center text-sm shadow-xs border border-amber-800/30">
                        {topThree[2].name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 font-display">{topThree[2].name}</h3>
                        <p className="text-[11px] text-slate-500 font-data">{topThree[2].vehicleName}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black font-data text-amber-900">
                        {topThree[2].safetyScore}
                        <span className="text-xs text-slate-400 font-normal">/100</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {topThree[2].status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-amber-50/50 p-3 rounded-xl border border-amber-200/50">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{currentLanguage === 'ar' ? 'المسافة:' : 'Distance:'}</span>
                      <span className="font-bold font-data text-slate-800">{topThree[2].distanceKm.toLocaleString()} km</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{currentLanguage === 'ar' ? 'الأداء:' : 'Performance:'}</span>
                      <span className="font-bold text-amber-800">3,480 km Route Completed</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAwardBonus(topThree[2], '5 000 DZD')}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <Medal className="w-3.5 h-3.5 text-amber-200" />
                    <span>{t('safety.award_bonus', {}, 'Award Safety Bonus')} (5 000 DZD)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DRIVER TELEMETRY TABLE & CONTROLS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  {currentLanguage === 'ar' ? 'جدول مساءلة السائقين وبث الحساسات' : currentLanguage === 'en' ? 'Driver Telemetry Accountability Ledger' : 'Registre des Performances Conducteurs'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentLanguage === 'ar' ? 'تتبع فوري لمؤشرات الكبح، التسارع والمنعطفات لكل سائق مع رابط الأثر الميكانيكي' : currentLanguage === 'en' ? 'Real-time telemetry breakdown by driver with mechanical degradation linkage' : 'Détail télémesure par conducteur et corrélation usure mécanique'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={currentLanguage === 'ar' ? 'بحث عن سائق، شاحنة...' : currentLanguage === 'en' ? 'Search driver, plate...' : 'Rechercher chauffeur...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Risk Tier Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                  {(['All', 'High Risk', 'Moderate Risk', 'Exemplary'] as const).map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setFilterRisk(risk)}
                      className={`px-3 py-1.5 rounded-lg transition ${filterRisk === risk ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'}`}
                    >
                      {risk === 'All'
                        ? currentLanguage === 'ar' ? 'الكل' : 'Tous'
                        : risk === 'High Risk'
                        ? currentLanguage === 'ar' ? 'خطر مرتفع' : 'Risque Élevé'
                        : risk === 'Moderate Risk'
                        ? currentLanguage === 'ar' ? 'متوسط' : 'Modéré'
                        : currentLanguage === 'ar' ? 'ممتاز' : 'Exemplaire'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Drivers Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-display border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-3 font-bold text-center">{currentLanguage === 'ar' ? 'الترتيب' : 'Rank'}</th>
                    <th className="py-3 px-4 font-bold">{currentLanguage === 'ar' ? 'السائق والمركبة' : currentLanguage === 'en' ? 'Driver & Vehicle' : 'Conducteur & Véhicule'}</th>
                    <th className="py-3 px-4 font-bold">{currentLanguage === 'ar' ? 'الخط / المسار' : currentLanguage === 'en' ? 'Route Sector' : 'Secteur / Trajet'}</th>
                    <th className="py-3 px-4 font-bold text-center">{currentLanguage === 'ar' ? 'الكبح الحاد' : currentLanguage === 'en' ? 'Harsh Brake' : 'Freinage'}</th>
                    <th className="py-3 px-4 font-bold text-center">{currentLanguage === 'ar' ? 'التسارع' : currentLanguage === 'en' ? 'Rapid Accel' : 'Accélération'}</th>
                    <th className="py-3 px-4 font-bold text-center">{currentLanguage === 'ar' ? 'السرعة والمنعطفات' : currentLanguage === 'en' ? 'Corner & Speed' : 'Virage & Vitesse'}</th>
                    <th className="py-3 px-4 font-bold text-center">{currentLanguage === 'ar' ? 'علامة السلامة' : currentLanguage === 'en' ? 'Safety Score' : 'Score Sécurité'}</th>
                    <th className="py-3 px-4 font-bold">{currentLanguage === 'ar' ? 'الأثر الميكانيكي المباشر' : currentLanguage === 'en' ? 'Mechanical Correlation' : 'Impact Mécanique'}</th>
                    <th className="py-3 px-4 font-bold text-right">{currentLanguage === 'ar' ? 'إجراءات الإلزام' : currentLanguage === 'en' ? 'Actions' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.map((d) => {
                    const driverRank = rankedDrivers.findIndex((rd) => rd.id === d.id) + 1;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition group">
                        {/* Leaderboard Rank Badge */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-black font-data ${
                            driverRank === 1 ? 'bg-amber-400 text-slate-950 shadow-2xs' :
                            driverRank === 2 ? 'bg-slate-300 text-slate-900 shadow-2xs' :
                            driverRank === 3 ? 'bg-amber-800 text-white shadow-2xs' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            #{driverRank}
                          </span>
                        </td>

                        {/* Driver Name & Vehicle */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-extrabold font-data shrink-0 ${d.safetyScore >= 85 ? 'bg-emerald-100 text-emerald-800' : d.safetyScore >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                              {d.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-2">
                                <span>{d.name}</span>
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${d.status === 'Exemplary' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : d.status === 'Moderate Risk' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                  {d.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-data flex items-center gap-1.5 mt-0.5">
                                <button
                                  onClick={() => setSelectedVehicleId(d.id)}
                                  className="hover:underline font-semibold text-slate-700 cursor-pointer"
                                >
                                  {d.vehicleName}
                                </button>
                                <span className="text-slate-300">•</span>
                                <span>{d.vehiclePlate}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Route Sector */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <div className="flex items-center gap-1.5 text-xs">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{d.routeSector}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-data mt-0.5">
                            {d.distanceKm.toLocaleString()} km {currentLanguage === 'ar' ? 'مقطوعة' : 'driven'}
                          </div>
                        </td>

                        {/* Harsh Brakes */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block font-data font-bold text-sm px-2.5 py-1 rounded-lg ${d.harshBrakingCount > 10 ? 'bg-red-100 text-red-700 font-extrabold' : d.harshBrakingCount > 5 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                            {d.harshBrakingCount}
                          </span>
                        </td>

                        {/* Rapid Accel */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block font-data font-bold text-sm px-2.5 py-1 rounded-lg ${d.rapidAccelCount > 10 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                            {d.rapidAccelCount}
                          </span>
                        </td>

                        {/* Cornering & Speeding */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="font-data font-semibold text-slate-800">
                            {d.highCorneringCount} <span className="text-slate-400 text-[10px]">turn</span> / {d.speedingIncidents} <span className="text-slate-400 text-[10px]">spd</span>
                          </div>
                        </td>

                        {/* Calculated Safety Score */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`font-data text-base font-black ${d.safetyScore >= 85 ? 'text-emerald-700' : d.safetyScore >= 70 ? 'text-amber-700' : 'text-red-600'}`}>
                              {d.safetyScore} <span className="text-xs font-normal text-slate-400">/100</span>
                            </span>
                          </div>
                        </td>

                        {/* Mechanical Correlation */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-[11px] text-slate-600 leading-tight bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {d.mechanicalImpact}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right space-y-1">
                          {d.safetyScore >= 85 ? (
                            <button
                              onClick={() => handleAwardBonus(d)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-[11px] font-bold transition cursor-pointer w-full justify-center"
                            >
                              <Gift className="h-3 w-3 text-amber-600" />
                              <span>{currentLanguage === 'ar' ? 'منح مكافأة' : 'Award Bonus'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleIssueCoachingAlert(d.name)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition cursor-pointer w-full justify-center"
                            >
                              <Bell className="h-3 w-3" />
                              <span>{currentLanguage === 'ar' ? 'إرسال توجيه' : currentLanguage === 'en' ? 'Coaching Alert' : 'Alerte Driver'}</span>
                            </button>
                          )}
                          {d.status === 'High Risk' && (
                            <button
                              onClick={() => handleCreateR6Audit(d)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold transition cursor-pointer w-full justify-center"
                            >
                              <Wrench className="h-3 w-3" />
                              <span>{currentLanguage === 'ar' ? 'تدقيق R6 ميكانيكي' : currentLanguage === 'en' ? 'Audit R6 WO' : 'Créer OT R6'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETAILED TELEMETRY ANOMALY AUDIT CASE STUDY (R6 INTEGRATION) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-ink text-white rounded-2xl p-6 border border-white/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-ochre" />
                  <h3 className="font-display text-base font-bold text-white">
                    {currentLanguage === 'ar' ? 'تحقيق الملاءمة بين الحساسات والبلاغات (Rule R6 Telemetry Audit)' : currentLanguage === 'en' ? 'Telemetry vs Driver Incident Audit (Rule R6)' : 'Réconciliation Télémesure & Rapports Chauffeur (Règle R6)'}
                  </h3>
                </div>
                <span className="font-data text-xs text-ochre uppercase font-bold">Automatic Correlation Engine</span>
              </div>

              <p className="text-xs text-slate-doc leading-relaxed">
                {currentLanguage === 'ar'
                  ? 'تحدد القاعدة R6 الحالات التي يبلغ فيها السائق عن خلل ميكانيكي (مثل ضجيج الفرامل أو الاهتزاز) دون ظهور كود خطأ إلكتروني في كمبيوتر OBD. يتم تسويق البيانات ومطابقتها مع تسجيلات الكبح والتسارع لحفظ سلامة المحرك والفرامل.'
                  : currentLanguage === 'en'
                  ? 'Rule R6 flags driver-reported mechanical anomalies that lack an active OBD electronic fault code. NextTransit cross-references driver incidents with G-force telemetry logs to catch mechanical fatigue early.'
                  : 'La règle R6 audit tout incident signalé par un chauffeur sans code défaut OBD actif. Le système croise les décélérations dures avec l\'usure réelle pour anticiper la rupture mécanique.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-ink-3 p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-doc uppercase font-data block">Détection G-Force</span>
                  <span className="text-sm font-bold text-white font-data mt-1 block">-0.58g Decel Peak</span>
                  <span className="text-[10px] text-red-400">Hard Brake Threshold Exceeded</span>
                </div>
                <div className="bg-ink-3 p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-doc uppercase font-data block">Diagnostic OBD Scanner</span>
                  <span className="text-sm font-bold text-emerald-400 font-data mt-1 block">Zero Electronic Faults</span>
                  <span className="text-[10px] text-slate-doc">Non-electronic Wear</span>
                </div>
                <div className="bg-ink-3 p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-doc uppercase font-data block">Action R6 Décidée</span>
                  <span className="text-sm font-bold text-ochre font-data mt-1 block">R6 Work Order Dispatched</span>
                  <span className="text-[10px] text-slate-doc">Inspection plaquettes exigée</span>
                </div>
              </div>
            </div>

            {/* Action Panel: Driver Coaching Guidelines */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <span>{currentLanguage === 'ar' ? 'برنامج التدريب والتوجيه الوقائي' : currentLanguage === 'en' ? 'Driver Safety Program' : 'Programme de Formation Conducteur'}</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentLanguage === 'ar' ? 'إجراءات صارمة لتحسين الأداء وتخفيض نسبة الـ 96% من الأخطاء البشرية:' : 'Plan d\'action préventif pour corriger le facteur humain :'}
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{currentLanguage === 'ar' ? 'مكافأة السائقين الأفضل أداءً (Safety Score > 90) بحوافز الشهر' : 'Prime mensuelle pour tout conducteur avec score > 90/100'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{currentLanguage === 'ar' ? 'إلزامية الراحة بعد 4.5 ساعات قيادة متواصلة في خطوط الصحراء' : 'Pause obligatoire de 45min après 4.5h de conduite continue'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{currentLanguage === 'ar' ? 'تحديد السرعة إلكترونياً عند 90 كم/سا للمركبات ذات الحمولة الثقيلة' : 'Bridage électronique à 90 km/h sur véhicules poids lourds'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
    </div>
  );
};

export default SafetyPerformance;
