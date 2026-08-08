import React from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Sun, HelpCircle, Package, Wifi } from 'lucide-react';

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
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {subheading}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {problems.map((p, idx) => {
          const IconComp = p.icon;
          return (
            <div 
              key={idx} 
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-indigo-100 transition duration-300"
            >
              <div className="space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <IconComp className="h-5 w-5" />
                </div>

                {/* Problem definition */}
                <div className="space-y-1.5 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{isAr ? 'المشكلة الشائعة' : currentLanguage === 'en' ? 'COMMON PROBLEM' : 'PROBLÈME COURANT'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {p.problemTitle}
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal">
                    {p.problemDesc}
                  </p>
                </div>

                {/* Solution definition */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{isAr ? 'حل نيكس ترانزيت' : currentLanguage === 'en' ? 'NEXTTRANSIT SOLUTION' : 'NOTRE SOLUTION'}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                    {p.solutionTitle}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
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
