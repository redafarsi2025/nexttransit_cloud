import React from 'react';
import { Check, X, Minus, Info } from 'lucide-react';
import { ControlPanelVisual } from './ControlPanelVisual';

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
      name: isAr ? '9 واجهات مختلفة للأدوار والمسؤوليات (RBAC)' : currentLanguage === 'en' ? '9 Role-Based Dedicated Views (Director, Driver...)' : '9 Vues Métiers dédiées (Rôles RBAC)',
      saas: 'yes',
      legacy: 'no',
      excel: 'no',
      manual: 'no',
    },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <span className="text-[10px] uppercase text-ochre font-extrabold tracking-wider block">
          {isAr ? 'عائد استثماري فوري' : currentLanguage === 'en' ? 'MARKET COMPARISON' : 'COMPARAISON RATIONNELLE'}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-doc leading-relaxed">
          {subheading}
        </p>
      </div>

      <ControlPanelVisual
        className="max-w-xl mx-auto"
        windowLabel={isAr ? 'مراقب النتيجة المقارنة' : currentLanguage === 'en' ? 'COMPARISON SCORE MONITOR' : 'MONITEUR DE SCORE COMPARATIF'}
        badgeLabel={`${features.length} ${isAr ? 'معايير' : currentLanguage === 'en' ? 'CRITERIA' : 'CRITÈRES'}`}
        badgeTone="emerald"
        rows={[
          {
            label: 'NextTransit ERP',
            value: `${features.filter((f) => f.saas === 'yes').length} / ${features.length}`,
            status: 'ok',
          },
          {
            label: isAr ? 'الأنظمة القديمة' : currentLanguage === 'en' ? 'Legacy Desktop ERP' : 'Ancien ERP',
            value: `${features.filter((f) => f.legacy === 'yes').length} / ${features.length}`,
            status: 'warning',
          },
          {
            label: 'Excel / Google Sheets',
            value: `${features.filter((f) => f.excel === 'yes').length} / ${features.length}`,
            status: 'critical',
          },
        ]}
        footer={[
          { label: isAr ? 'الفارق' : currentLanguage === 'en' ? 'ADVANTAGE' : 'AVANTAGE', value: 'NextTransit', tone: 'emerald' },
        ]}
      />

      <div className="rounded-3xl border border-white/10 bg-ink-2 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-doc">
            <thead>
              <tr className="bg-ink-3 border-b border-white/10">
                <th className="p-4 sm:p-5 font-bold text-white w-[40%]">
                  {isAr ? 'المميزات والوظائف' : currentLanguage === 'en' ? 'Core Platform Capabilities' : 'Fonctionnalités'}
                </th>
                <th className="p-4 text-center font-black text-ochre bg-ochre/10">
                  NextTransit ERP
                </th>
                <th className="p-4 text-center font-bold text-slate-doc">
                  {isAr ? 'البرمجيات القديمة' : currentLanguage === 'en' ? 'Legacy Desktop ERP' : 'Ancien ERP'}
                </th>
                <th className="p-4 text-center font-bold text-slate-doc">
                  Excel / Google Sheets
                </th>
                <th className="p-4 text-center font-bold text-slate-doc">
                  {isAr ? 'الطرق التقليدية الورقية' : currentLanguage === 'en' ? 'Manual Procedures' : 'Méthode Papier'}
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, idx) => (
                <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition duration-150">
                  <td className="p-4 sm:p-5 font-bold text-white leading-snug">
                    {f.name}
                  </td>

                  {/* NextTransit */}
                  <td className="p-4 text-center bg-ochre/5">
                    <div className="flex justify-center">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ochre text-ink">
                        <Check className="h-3.5 w-3.5 font-bold" />
                      </div>
                    </div>
                  </td>

                  {/* Legacy ERP */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                      {f.legacy === 'yes' ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : f.legacy === 'partial' ? (
                        <Minus className="h-4 w-4 text-estime" />
                      ) : (
                        <X className="h-4 w-4 text-slate-doc-2" />
                      )}
                    </div>
                  </td>

                  {/* Excel */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                      {f.excel === 'yes' ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : f.excel === 'partial' ? (
                        <Minus className="h-4 w-4 text-estime" />
                      ) : (
                        <X className="h-4 w-4 text-slate-doc-2" />
                      )}
                    </div>
                  </td>

                  {/* Manual */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                      {f.manual === 'yes' ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : f.manual === 'partial' ? (
                        <Minus className="h-4 w-4 text-estime" />
                      ) : (
                        <X className="h-4 w-4 text-slate-doc-2" />
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
