import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  Info,
  DollarSign,
  Clock,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';

interface RoiCalculatorProps {
  currentLanguage: string;
  onExploreDemo?: () => void;
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ currentLanguage, onExploreDemo }) => {
  const isAr = currentLanguage === 'ar';
  const isEn = currentLanguage === 'en';

  // Input states
  const [fleetSize, setFleetSize] = useState<number>(35);
  const [averageMonthlyRepair, setAverageMonthlyRepair] = useState<number>(45000); // in DZD/DA per vehicle
  const [downtimeDays, setDowntimeDays] = useState<number>(18); // days per vehicle per year
  const [dailyDowntimeCost, setDailyDowntimeCost] = useState<number>(35000); // DZD/DA cost per day of downtime

  // Multilingual content dictionary
  const t = {
    title: {
      fr: "Moteur d'Estimation ROI - NextTransit",
      ar: "محرك تقدير العائد على الاستثمار - نيكس ترانزيت",
      en: "ROI Estimation Engine - NextTransit"
    },
    subtitle: {
      fr: "Simulez l'impact financier précis de l'application des règles de gestion de flotte sur vos opérations.",
      ar: "حاكي الأثر المالي الدقيق لتطبيق قواعد إدارة الأسطول على عملياتك اللوجستية.",
      en: "Simulate the precise financial impact of applying operational fleet rules on your fleet operations."
    },
    fleetSizeLabel: {
      fr: "Taille de la flotte (Véhicules)",
      ar: "حجم الأسطول (عدد المركبات)",
      en: "Fleet Size (Vehicles)"
    },
    repairCostLabel: {
      fr: "Budget de réparation moyen / véhicule",
      ar: "متوسط ميزانية الإصلاح لكل مركبة",
      en: "Average repair budget / vehicle"
    },
    downtimeDaysLabel: {
      fr: "Jours d'immobilisation / véhicule / an",
      ar: "أيام التوقف عن العمل لكل مركبة / سنة",
      en: "Downtime days / vehicle / year"
    },
    downtimeCostLabel: {
      fr: "Coût de perte par jour d'arrêt",
      ar: "تكلفة الخسارة عن كل يوم توقف",
      en: "Loss cost per day of stoppage"
    },
    perMonth: {
      fr: "/ mois",
      ar: "/ شهر",
      en: "/ month"
    },
    perDay: {
      fr: "/ jour",
      ar: "/ jour",
      en: "/ day"
    },
    yearlyCurrentCost: {
      fr: "Coût Opérationnel Actuel (Annuel)",
      ar: "التكلفة التشغيلية الحالية (سنوياً)",
      en: "Current Operational Cost (Annual)"
    },
    yearlyOptimizedCost: {
      fr: "Coût avec NextTransit",
      ar: "التكلفة مع نيكس ترانزيت",
      en: "Cost with NextTransit"
    },
    yearlySavings: {
      fr: "Économies Annuelles Totales",
      ar: "إجمالي الوفورات السنوية",
      en: "Total Annual Savings"
    },
    maintenanceSavings: {
      fr: "Économies Maintenance",
      ar: "وفورات الصيانة",
      en: "Maintenance Savings"
    },
    downtimeSavings: {
      fr: "Économies d'Immobilisation",
      ar: "وفورات تقليل التوقف",
      en: "Downtime Reduction Savings"
    },
    roiFactor: {
      fr: "Multiplicateur d'Impact ROI",
      ar: "مضاعف تأثير العائد الاستثماري",
      en: "ROI Impact Multiplier"
    },
    paybackPeriod: {
      fr: "Amortissement de l'investissement",
      ar: "فترة استرداد التكلفة",
      en: "Investment Payback Period"
    },
    months: {
      fr: "mois",
      ar: "أشهر",
      en: "months"
    },
    ruleEnforcement: {
      fr: "Gains validés par audit algorithmique",
      ar: "أرباح معتمدة بفضل التدقيق الرقمي",
      en: "Gains validated by predictive system audits"
    },
    currency: {
      fr: "DA",
      ar: "دج",
      en: "DA"
    },
    costBreakdownChart: {
      fr: "Comparaison des Coûts Annuels (DA)",
      ar: "مقارنة التكاليف السنوية (بالدينار)",
      en: "Annual Cost Comparison (DA)"
    },
    currentLabel: {
      fr: "Traditionnel",
      ar: "الوضع التقليدي",
      en: "Traditional"
    },
    nextTransitLabel: {
      fr: "NextTransit",
      ar: "نيكس ترانزيت",
      en: "NextTransit"
    },
    maintenanceTitle: {
      fr: "Maintenance",
      ar: "الصيانة",
      en: "Maintenance"
    },
    downtimeTitle: {
      fr: "Pertes d'Arrêt",
      ar: "خسائر التوقف",
      en: "Downtime Loss"
    },
    savingsTitle: {
      fr: "Économies",
      ar: "الوفورات",
      en: "Savings"
    },
    actionBtn: {
      fr: "Essayer NextTransit Maintenant",
      ar: "جرب نيكس ترانزيت الآن",
      en: "Try NextTransit Now"
    }
  };

  const getTranslation = (key: keyof typeof t) => {
    const lang = (currentLanguage === 'fr' || currentLanguage === 'ar' || currentLanguage === 'en') ? currentLanguage : 'fr';
    return t[key][lang];
  };

  // Savings coefficient according to NextTransit decision engine performance
  const MAINTENANCE_SAVINGS_PERCENT = 0.32; // 32% saving through automated part planning & R4 labor audits
  const DOWNTIME_SAVINGS_PERCENT = 0.45;    // 45% downtime reduction via R3 reservations and predictive rules

  const calculations = useMemo(() => {
    // Current costs
    const annualMaintenanceCurrent = fleetSize * averageMonthlyRepair * 12;
    const annualDowntimeCurrent = fleetSize * downtimeDays * dailyDowntimeCost;
    const totalCurrent = annualMaintenanceCurrent + annualDowntimeCurrent;

    // Savings
    const maintenanceSavingsValue = annualMaintenanceCurrent * MAINTENANCE_SAVINGS_PERCENT;
    const downtimeSavingsValue = annualDowntimeCurrent * DOWNTIME_SAVINGS_PERCENT;
    const totalSavings = maintenanceSavingsValue + downtimeSavingsValue;

    // Optimized costs
    const annualMaintenanceOptimized = annualMaintenanceCurrent - maintenanceSavingsValue;
    const annualDowntimeOptimized = annualDowntimeCurrent - downtimeSavingsValue;
    const totalOptimized = totalCurrent - totalSavings;

    // Subscription cost (estimated at 1,200 DA / vehicle / month)
    const annualSubscription = fleetSize * 1200 * 12;
    const roiMultiplier = annualSubscription > 0 ? (totalSavings / annualSubscription) : 15;
    const paybackMonths = totalSavings > 0 ? Math.max(0.2, (annualSubscription / totalSavings) * 12) : 0.5;

    return {
      maintenanceCurrent: annualMaintenanceCurrent,
      downtimeCurrent: annualDowntimeCurrent,
      totalCurrent,
      
      maintenanceOptimized: annualMaintenanceOptimized,
      downtimeOptimized: annualDowntimeOptimized,
      totalOptimized,

      maintenanceSavings: maintenanceSavingsValue,
      downtimeSavings: downtimeSavingsValue,
      totalSavings,

      roiMultiplier,
      paybackMonths
    };
  }, [fleetSize, averageMonthlyRepair, downtimeDays, dailyDowntimeCost]);

  // Data for Recharts visualization
  const chartData = useMemo(() => {
    return [
      {
        name: getTranslation('currentLabel'),
        [getTranslation('maintenanceTitle')]: Math.round(calculations.maintenanceCurrent),
        [getTranslation('downtimeTitle')]: Math.round(calculations.downtimeCurrent),
      },
      {
        name: getTranslation('nextTransitLabel'),
        [getTranslation('maintenanceTitle')]: Math.round(calculations.maintenanceOptimized),
        [getTranslation('downtimeTitle')]: Math.round(calculations.downtimeOptimized),
        [getTranslation('savingsTitle')]: Math.round(calculations.totalSavings),
      }
    ];
  }, [calculations, currentLanguage]);

  return (
    <div className="w-full max-w-7xl mx-auto my-12" id="advanced-roi-calculator">
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 bg-ochre/10 border border-ochre/30 px-3 py-1 rounded-full text-ochre text-xs font-black uppercase tracking-wider">
          <Calculator className="h-3.5 w-3.5" />
          <span>{isAr ? "محاكاة الفعالية الاقتصادية" : isEn ? "Financial Impact Simulation" : "Simulateur de Performance Financière"}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
          {getTranslation('title')}
        </h2>
        <p className="text-sm text-slate-doc max-w-2xl mx-auto leading-relaxed">
          {getTranslation('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* LEFT COLUMN: Inputs & Sliders (5 cols) */}
        <div className="lg:col-span-5 bg-ink-2 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Sparkles className="h-4.5 w-4.5 text-ochre" />
              {isAr ? "المدخلات التشغيلية لأسطولك" : isEn ? "Your Operational Parameters" : "Paramètres de votre Flotte"}
            </h3>

            {/* Input 1: Fleet Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">{getTranslation('fleetSizeLabel')}</span>
                <span className="bg-ochre/10 text-ochre font-extrabold px-2.5 py-1 rounded-lg border border-ochre/30">
                  {fleetSize}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="300"
                step="5"
                value={fleetSize}
                onChange={(e) => setFleetSize(parseInt(e.target.value, 10))}
                className="w-full accent-ochre cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-doc-2">
                <span>5</span>
                <span>150</span>
                <span>300</span>
              </div>
            </div>

            {/* Input 2: Repair Cost */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">{getTranslation('repairCostLabel')}</span>
                <span className="bg-ochre/10 text-ochre font-extrabold px-2.5 py-1 rounded-lg border border-ochre/30">
                  {averageMonthlyRepair.toLocaleString()} {getTranslation('currency')} <span className="text-[10px] font-medium opacity-80">{getTranslation('perMonth')}</span>
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="200000"
                step="5000"
                value={averageMonthlyRepair}
                onChange={(e) => setAverageMonthlyRepair(parseInt(e.target.value, 10))}
                className="w-full accent-ochre cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-doc-2">
                <span>10,000</span>
                <span>100,000</span>
                <span>200,000 {getTranslation('currency')}</span>
              </div>
            </div>

            {/* Input 3: Downtime Days */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">{getTranslation('downtimeDaysLabel')}</span>
                <span className="bg-ochre/10 text-ochre font-extrabold px-2.5 py-1 rounded-lg border border-ochre/30">
                  {downtimeDays} {isAr ? "أيام" : isEn ? "days" : "jours"}
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="60"
                step="1"
                value={downtimeDays}
                onChange={(e) => setDowntimeDays(parseInt(e.target.value, 10))}
                className="w-full accent-ochre cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-doc-2">
                <span>2 {isAr ? "أيام" : "days"}</span>
                <span>30</span>
                <span>60 {isAr ? "يوم" : "days"}</span>
              </div>
            </div>

            {/* Input 4: Daily Downtime Cost */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">{getTranslation('downtimeCostLabel')}</span>
                <span className="bg-ochre/10 text-ochre font-extrabold px-2.5 py-1 rounded-lg border border-ochre/30">
                  {dailyDowntimeCost.toLocaleString()} {getTranslation('currency')} <span className="text-[10px] font-medium opacity-80">{getTranslation('perDay')}</span>
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="150000"
                step="5000"
                value={dailyDowntimeCost}
                onChange={(e) => setDailyDowntimeCost(parseInt(e.target.value, 10))}
                className="w-full accent-ochre cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-doc-2">
                <span>10,000</span>
                <span>80,000</span>
                <span>150,000 {getTranslation('currency')}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/10 flex items-start gap-3 bg-ochre/5 p-4 rounded-2xl border border-ochre/20">
            <Info className="h-5 w-5 text-ochre shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-white">
                {getTranslation('ruleEnforcement')}
              </h4>
              <p className="text-[11px] text-slate-doc leading-normal">
                {isAr
                  ? "يتم تطبيق خصم 32٪ على نفقات الورشة والمخزون بفضل خوارزميات الصيانة وتدقيق المشتريات، وتقليل أيام توقف الشاحنات بنسبة 45٪ عبر حجز قطع الغيار التلقائي."
                  : isEn
                  ? "Applies an immediate 32% reduction to maintenance costs via optimized labor formulas & fiscal health reviews, and 45% shorter idle durations through predictive inventory reservation."
                  : "Modélisation stricte : réduction de 32% des frais d'atelier (calculateur main d'œuvre/pièces et audit budgétaire) et de 45% des durées d'arrêt (gestion prédictive et réservation de stock)."}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Output Dashboard & Recharts Chart (7 cols) */}
        <div className="lg:col-span-7 bg-ink-3 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xs border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ochre/10 rounded-full blur-3xl -z-10" />

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-ochre" />
                {isAr ? "عائد الاستثمار والوفورات المقدرة" : isEn ? "Dynamic ROI Dashboard" : "Tableau de Bord de Rentabilité"}
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-900/30 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                {isAr ? "منهجية شفافة" : isEn ? "Transparent Method" : "Méthode Transparente"}
              </span>
            </div>

            {/* Core Savings Hero Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-ink-2 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-doc-2 font-bold block">
                  {getTranslation('yearlySavings')}
                </span>
                <div className="mt-2">
                  <span className="text-lg sm:text-xl font-black text-emerald-400 block leading-none">
                    {Math.round(calculations.totalSavings).toLocaleString()} DA
                  </span>
                  <span className="text-[10px] text-slate-doc-2 block mt-1">
                    {isAr ? "وفورات حقيقية سنوياً" : isEn ? "Annual Net Savings" : "Économies annuelles nettes"}
                  </span>
                </div>
              </div>

              <div className="bg-ink-2 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-doc-2 font-bold block">
                  {getTranslation('roiFactor')}
                </span>
                <div className="mt-2">
                  <span className="text-lg sm:text-xl font-black text-ochre block leading-none">
                    {calculations.roiMultiplier.toFixed(1)}x
                  </span>
                  <span className="text-[10px] text-slate-doc-2 block mt-1 flex items-center gap-1">
                    {isAr ? "مضاعف الاستثمار" : isEn ? "Value multiplier" : "Multiplicateur de valeur"}
                  </span>
                </div>
              </div>

              <div className="bg-ink-2 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-doc-2 font-bold block">
                  {getTranslation('paybackPeriod')}
                </span>
                <div className="mt-2">
                  <span className="text-lg sm:text-xl font-black text-white block leading-none">
                    {calculations.paybackMonths.toFixed(1)} {isAr ? "أشهر" : "mois"}
                  </span>
                  <span className="text-[10px] text-slate-doc-2 block mt-1">
                    {isAr ? "استرجاع التكاليف سريعاً" : isEn ? "Instant amortization" : "Seuil de rentabilité atteint"}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Charts visualizer */}
            <div className="space-y-2 mt-4">
              <h4 className="text-[11px] font-bold text-slate-doc uppercase tracking-wider">
                {getTranslation('costBreakdownChart')}
              </h4>
              <div className="h-60 w-full bg-ink border border-white/10 rounded-2xl p-3 pt-5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <XAxis 
                      type="number" 
                      stroke="#5C6670"
                      fontSize={10} 
                      tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#5C6670"
                      fontSize={11} 
                      width={80}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2830', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                      labelStyle={{ color: '#8B95A0', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} DA`, String(name)]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={30}
                      iconSize={10}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', color: '#8B95A0' }}
                    />
                    <Bar
                      dataKey={getTranslation('maintenanceTitle')}
                      stackId="a"
                      fill="#C1793C"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey={getTranslation('downtimeTitle')}
                      stackId="a"
                      fill="#B4432F"
                      radius={[0, 8, 8, 0]}
                    />
                    <Bar
                      dataKey={getTranslation('savingsTitle')}
                      stackId="b"
                      fill="#10b981"
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdown details list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs border-t border-white/10">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-doc-2 font-bold uppercase tracking-wider block">
                  {getTranslation('maintenanceSavings')}
                </span>
                <div className="flex justify-between items-center text-slate-doc">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Wrench className="h-3.5 w-3.5 text-ochre" />
                    -{Math.round(calculations.maintenanceSavings).toLocaleString()} DA
                  </span>
                  <span className="text-emerald-400 font-extrabold">-32%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-doc-2 font-bold uppercase tracking-wider block">
                  {getTranslation('downtimeSavings')}
                </span>
                <div className="flex justify-between items-center text-slate-doc">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Clock className="h-3.5 w-3.5 text-rose-400" />
                    -{Math.round(calculations.downtimeSavings).toLocaleString()} DA
                  </span>
                  <span className="text-emerald-400 font-extrabold">-45%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <span className="text-[10px] text-slate-doc-2 text-center sm:text-left leading-normal">
              {isAr
                ? "* تقدير مبني على معدلات المكاسب التي يحسبها محرك القواعد لدينا (خفض تحليلي بنسبة 32٪ للصيانة، 45٪ للتوقف) — للتأكيد على بياناتكم الحقيقية خلال تدقيق مجاني."
                : isEn
                ? "* Estimate based on the gain rates modeled by our rules engine (32% analytical reduction on maintenance, 45% on downtime) — to be confirmed against your real data during a free audit."
                : "* Estimation basée sur les taux de gain modélisés par notre moteur de règles (réduction analytique de 32% sur la maintenance, 45% sur l'immobilisation) — à confirmer sur vos données réelles lors d'un audit gratuit."}
            </span>
            <button
              onClick={onExploreDemo}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-ochre text-ink font-extrabold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <CheckCircle2 className="h-4 w-4 text-ink" />
              {getTranslation('actionBtn')}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
