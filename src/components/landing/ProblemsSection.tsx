import React from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Sun, HelpCircle, Package, Wifi } from 'lucide-react';
import { ControlPanelVisual } from './ControlPanelVisual';

interface ProblemsSectionProps {
  currentLanguage: string;
}

export const ProblemsSection: React.FC<ProblemsSectionProps> = ({ currentLanguage }) => {
  const isAr = currentLanguage === 'ar';

  const heading = isAr
    ? 'التحديات اللوجستية في الجزائر والحلول التي نقدمها'
    : currentLanguage === 'en'
    ? 'SaaS Solutions for Algerian Operational Challenges'
    : 'Les Problèmes que nous résolvons en Algérie';

  const subheading = isAr
    ? 'لماذا تفشل البرمجيات التقليدية وملفات Excel في إدارة الأساطيل المعقدة؟ وكيف يعيد نيكس ترانزيت هيكلتها.'
    : currentLanguage === 'en'
    ? 'Why legacy accounting software and Excel spreadsheets fail complex fleets, and how NextTransit solves it.'
    : 'Pourquoi les tableurs Excel et les logiciels obsolètes freinent votre croissance, et comment nous y remédions.';

  const problems = [
    {
      icon: FileSpreadsheet,
      problemTitle: isAr ? 'الاعتماد الكامل على ملفات Excel المشتتة' : currentLanguage === 'en' ? 'Absolute Reliance on Excel Sheets' : 'Dépendance Toxique à Excel',
      problemDesc: isAr
        ? 'بيانات منفصلة، أخطاء متكررة في الحساب المالي، وصعوبة مطابقة أسعار الفواتير مع حقيقة القطع المركبة.'
        : currentLanguage === 'en'
        ? 'Scattered documents, frequent calculations errors, and zero connection between parts inventory and fleet status.'
        : 'Données éparpillées, erreurs de frappe, aucun lien entre les pièces consommées à l\'atelier et les finances de l\'entreprise.',
      solutionTitle: isAr ? 'قاعدة بيانات واحدة موحدة تدرك قوانين التشغيل' : currentLanguage === 'en' ? 'Centralized DB enforcing operational rules' : 'Base de Données Unique & Moteur de Règles',
      solutionDesc: isAr
        ? 'ربط تلقائي وفوري بين المخزن، صيانة الورشة، الحسابات والوقود مع تفعيل تلقائي لحجوزات قطع الغيار.'
        : currentLanguage === 'en'
        ? 'Real-time synchronization between part stocks, fleet work orders, financial accounting and fuel telemetry.'
        : 'Synchronisation instantanée de l\'atelier, des pièces détachées, de la comptabilité analytique et de la télémétrie.',
      color: 'indigo',
    },
    {
      icon: Sun,
      problemTitle: isAr ? 'ظروف تشغيلية قاسية بالجنوب والشرق' : currentLanguage === 'en' ? 'Extreme Desert Heat & Rough Terrain' : 'Sévérité du Climat & Usure Précoce',
      problemDesc: isAr
        ? 'حرارة تفوق 50 درجة وغبار السيليكا يتلفان المحركات وفلاتر الهواء بسرعة فائقة دون تحذير مسبق.'
        : currentLanguage === 'en'
        ? 'Sandstorms and severe heat ruin oil quality and air filters before normal scheduled intervals.'
        : 'La poussière de silice saharienne et la chaleur excessive détruisent l\'huile et les filtres à air prématurément.',
      solutionTitle: isAr ? 'صيانة تنبؤية ذكية تستشعر العوامل الجوية' : currentLanguage === 'en' ? 'Predictive Algorithms adjusted for Sand/Heat' : 'Maintenance Prédictive Climatique',
      solutionDesc: isAr
        ? 'تعديل آلي لفترات الصيانة بناءً على الإقليم وشدة الحرارة لتفادي التعطل المفاجئ في الطرق الوطنية.'
        : currentLanguage === 'en'
        ? 'Algorithms dynamically shorten oil and filter lifespans when vehicles enter the Deep South desert.'
        : 'Nos algorithmes ajustent automatiquement les alertes de vidange pour les véhicules opérant dans le Grand Sud.',
      color: 'orange',
    },
    {
      icon: Package,
      problemTitle: isAr ? 'تأخر توريد قطع الغيار وتقلب الأسعار' : currentLanguage === 'en' ? 'Spare Parts Procurement Delays' : 'Ruptures de Stock & Fluctuation des Coûts',
      problemDesc: isAr
        ? 'توقف الشاحنات لأيام بسبب عدم توفر فحمات الفرامل أو الفلاتر المناسبة وتغيير أسعار الصرف المستمر.'
        : currentLanguage === 'en'
        ? 'Vehicles idle for days because small parts are missing or local price changes disrupt estimates.'
        : 'Immobilisation prolongée des camions pour des pièces manquantes et fluctuations constantes des prix fournisseurs.',
      solutionTitle: isAr ? 'نظام الحجز الآلي المستبق R3 والتنبيه المبكر' : currentLanguage === 'en' ? 'Automated R3 Reservation & Smart PO' : 'Réservation R3 & Commande Automatique',
      solutionDesc: isAr
        ? 'حجز تلقائي للقطع فور فتح أمر الصيانة وإرسال طلب توريد آلي بمجرد النزول عن الحد الأدنى للأمان.'
        : currentLanguage === 'en'
        ? 'Parts are locked on work order creation and low-stock alerts auto-create purchase orders.'
        : 'Réservation automatique des pièces dès l\'ordre de travail et alertes automatiques d\'approvisionnement.',
      color: 'emerald',
    },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-doc leading-relaxed">
          {subheading}
        </p>
      </div>

      <ControlPanelVisual
        className="max-w-xl mx-auto"
        windowLabel={isAr ? 'مراقبة العمليات — بعد نيكس ترانزيت' : currentLanguage === 'en' ? 'OPERATIONS MONITOR — POST NEXTTRANSIT' : 'MONITEUR OPÉRATIONS — APRÈS NEXTTRANSIT'}
        badgeLabel={isAr ? '0 حادثة غير معالجة' : currentLanguage === 'en' ? '0 UNRESOLVED INCIDENT' : '0 INCIDENT NON TRAITÉ'}
        badgeTone="emerald"
        rows={[
          {
            label: isAr ? 'مطابقة المخزون والورشة' : currentLanguage === 'en' ? 'Stock ↔ Workshop Sync' : 'Synchronisation Stock ↔ Atelier',
            value: isAr ? 'متصل' : currentLanguage === 'en' ? 'Connected' : 'Connecté',
            detail: isAr ? 'لا مزيد من Excel المشتت' : currentLanguage === 'en' ? 'No more scattered spreadsheets' : 'Fini les tableurs éparpillés',
            status: 'ok',
          },
          {
            label: isAr ? 'تنبيهات المناخ الصحراوي' : currentLanguage === 'en' ? 'Desert Climate Alerts' : 'Alertes Climat Désertique',
            value: isAr ? 'نشط' : currentLanguage === 'en' ? 'Active' : 'Actives',
            detail: isAr ? 'صيانة معدلة حسب الإقليم' : currentLanguage === 'en' ? 'Region-adjusted maintenance' : 'Maintenance ajustée par région',
            status: 'ok',
          },
          {
            label: isAr ? 'حجز قطع الغيار R3' : currentLanguage === 'en' ? 'R3 Parts Reservation' : 'Réservation Pièces R3',
            value: isAr ? 'تلقائي' : currentLanguage === 'en' ? 'Automated' : 'Automatique',
            detail: isAr ? 'فور فتح أمر الصيانة' : currentLanguage === 'en' ? 'Triggered on work order creation' : 'Déclenchée à l’ouverture du bon',
            status: 'ok',
          },
        ]}
        footer={[
          { label: isAr ? 'قبل' : currentLanguage === 'en' ? 'BEFORE' : 'AVANT', value: isAr ? 'ملفات متفرقة' : currentLanguage === 'en' ? 'Scattered files' : 'Fichiers dispersés', tone: 'red' },
          { label: isAr ? 'مع نيكس ترانزيت' : currentLanguage === 'en' ? 'WITH NEXTTRANSIT' : 'AVEC NEXTTRANSIT', value: isAr ? 'قاعدة موحدة' : currentLanguage === 'en' ? '1 unified base' : '1 base unifiée', tone: 'emerald' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {problems.map((p, idx) => {
          const IconComp = p.icon;
          return (
            <div
              key={idx}
              className="rounded-3xl border border-white/10 bg-ink-2 p-6 shadow-xs flex flex-col justify-between hover:border-ochre/40 transition duration-300"
            >
              <div className="space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-doc">
                  <IconComp className="h-5 w-5" />
                </div>

                {/* Problem definition */}
                <div className="space-y-1.5 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-danger-doc">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{isAr ? 'المشكلة الشائعة' : currentLanguage === 'en' ? 'COMMON PROBLEM' : 'PROBLÈME COURANT'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {p.problemTitle}
                  </h3>
                  <p className="text-xs text-slate-doc leading-normal">
                    {p.problemDesc}
                  </p>
                </div>

                {/* Solution definition */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{isAr ? 'حل نيكس ترانزيت' : currentLanguage === 'en' ? 'NEXTTRANSIT SOLUTION' : 'NOTRE SOLUTION'}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-white leading-snug">
                    {p.solutionTitle}
                  </h4>
                  <p className="text-xs text-slate-doc leading-relaxed">
                    {p.solutionDesc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
