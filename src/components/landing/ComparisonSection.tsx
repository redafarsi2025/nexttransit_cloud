import React from 'react';
import { Check, X, Minus, Info } from 'lucide-react';

interface ComparisonSectionProps {
  currentLanguage: string;
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({ currentLanguage }) => {
  const isAr = currentLanguage === 'ar';

  const heading = isAr
    ? 'مقارنة شاملة لمستويات الكفاءة والتحكم'
    : currentLanguage === 'en'
    ? 'High-Fidelity Enterprise Comparison Matrix'
    : 'Tableau Comparatif : SaaS vs Traditionnel';

  const subheading = isAr
    ? 'كيف يقارن نظام نيكس ترانزيت الذكي مع برمجيات سطح المكتب القديمة وجداول Excel والمطابقات اليدوية؟'
    : currentLanguage === 'en'
    ? 'How NextTransit compares against manual procedures, spreadsheets, and rigid legacy desktop ERPs.'
    : 'Pourquoi NextTransit surpasse largement Excel, les processus papier et les anciens progiciels de gestion.';

  const features = [
    {
      name: isAr ? 'مزامنة تتبع المركبات الفوري (OBD-II)' : currentLanguage === 'en' ? 'Live OBD-II Telemetry Synchronization' : 'Télémétrie en direct (OBD-II)',
      saas: 'yes',
      legacy: 'partial',
      excel: 'no',
      manual: 'no',
    },
    {
      name: isAr ? 'تطبيق قوانين السلامة والقرارات الآلية' : currentLanguage === 'en' ? 'Automated Safety & Operational Decision Engine' : 'Moteur de règles automatisé de sécurité et maintenance',
      saas: 'yes',
      legacy: 'no',
      excel: 'no',
      manual: 'no',
    },
    {
      name: isAr ? 'المطابقة والامتثال للمخطط المحاسبي الجزائري (SCF)' : currentLanguage === 'en' ? 'Algerian Fiscal & SCF Accounting Compliance' : 'Conformité Fiscale & Plan Comptable SCF',
      saas: 'yes',
      legacy: 'partial',
      excel: 'no',
      manual: 'no',
    },
    {
      name: isAr ? 'الحجز التلقائي المباشر لقطع الغيار بالمخزن' : currentLanguage === 'en' ? 'Automated Spare Parts Stock Reservation' : 'Réservation auto des pièces de rechange sur bon de travail',
      saas: 'yes',
      legacy: 'no',
      excel: 'no',
      manual: 'no',
    },
    {
      name: isAr ? 'العمل الكامل دون إنترنت مع الحفظ المؤقت للبيانات' : currentLanguage === 'en' ? 'Robust Offline-First Buffer & Multi-SIM' : 'Mode Hors-Ligne & Cache Local Robuste',
      saas: 'yes',
      legacy: 'partial',
      excel: 'yes',
      manual: 'no',
    },
    {
      name: isAr ? 'الدعم الكامل لثلاث لغات (العربية، الفرنسية، الإنجليزية)' : currentLanguage === 'en' ? 'Complete AR / FR / EN Multilingual & RTL' : 'Traduction complète Arabe, Français & Anglais',
      saas: 'yes',
      legacy: 'partial',
      excel: 'partial',
      manual: 'no',
    },
    {
      name: isAr ? '6 واجهات مختلفة للأدوار والمسؤوليات (RBAC)' : currentLanguage === 'en' ? '6 Role-Based Dedicated Views (Director, Driver...)' : '6 Vues Métiers dédiées (Rôles RBAC)',
      saas: 'yes',
      legacy: 'no',
      excel: 'no',
      manual: 'no',
    },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <span className="text-[10px] uppercase text-indigo-600 font-extrabold tracking-wider block">
          {isAr ? 'عائد استثماري فوري' : currentLanguage === 'en' ? 'MARKET COMPARISON' : 'COMPARAISON RATIONNELLE'}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {subheading}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 sm:p-5 font-bold text-slate-900 w-[40%]">
                  {isAr ? 'المميزات والوظائف' : currentLanguage === 'en' ? 'Core Platform Capabilities' : 'Fonctionnalités'}
                </th>
                <th className="p-4 text-center font-black text-indigo-700 bg-indigo-50/50">
                  NextTransit ERP
                </th>
                <th className="p-4 text-center font-bold text-slate-600">
                  {isAr ? 'البرمجيات القديمة' : currentLanguage === 'en' ? 'Legacy Desktop ERP' : 'Ancien ERP'}
                </th>
                <th className="p-4 text-center font-bold text-slate-600">
                  Excel / Google Sheets
                </th>
                <th className="p-4 text-center font-bold text-slate-600">
                  {isAr ? 'الطرق التقليدية الورقية' : currentLanguage === 'en' ? 'Manual Procedures' : 'Méthode Papier'}
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition duration-150">
                  <td className="p-4 sm:p-5 font-bold text-slate-900 leading-snug">
                    {f.name}
                  </td>
                  
                  {/* NextTransit */}
                  <td className="p-4 text-center bg-indigo-50/30">
                    <div className="flex justify-center">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                        <Check className="h-3.5 w-3.5 font-bold" />
                      </div>
                    </div>
                  </td>

                  {/* Legacy ERP */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                      {f.legacy === 'yes' ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : f.legacy === 'partial' ? (
                        <Minus className="h-4 w-4 text-amber-500" />
                      ) : (
                        <X className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                  </td>

                  {/* Excel */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                      {f.excel === 'yes' ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : f.excel === 'partial' ? (
                        <Minus className="h-4 w-4 text-amber-500" />
                      ) : (
                        <X className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                  </td>

                  {/* Manual */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                      {f.manual === 'yes' ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : f.manual === 'partial' ? (
                        <Minus className="h-4 w-4 text-amber-500" />
                      ) : (
                        <X className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
