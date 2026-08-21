import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FaqSectionProps {
  currentLanguage: string;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ currentLanguage }) => {
  const isAr = currentLanguage === 'ar';
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const heading = isAr
    ? 'الأسئلة الشائعة وإزالة المخاوف'
    : currentLanguage === 'en'
    ? 'Frequently Answered Sovereign Objections'
    : 'Questions Fréquentes & Objections levées';

  const subheading = isAr
    ? 'كل ما تود معرفته عن الاستضافة السحابية والسيادة، التكلفة، العمل دون إنترنت، ومطابقة القوانين المحلية.'
    : currentLanguage === 'en'
    ? 'Everything you need to know about data hosting sovereignty, DZD invoices, offline capabilities, and operational rules.'
    : 'Découvrez nos réponses aux questions réglementaires, de souveraineté des données et de tarification.';

  const faqs = [
    {
      q: isAr 
        ? 'أين يتم استضافة البيانات؟ وهل تتوافق مع معايير السيادة الوطنية الجزائرية؟'
        : currentLanguage === 'en'
        ? 'Where is our data hosted? Does it comply with Algerian national guidelines?'
        : 'Où sont hébergées nos données ? Est-ce conforme à la souveraineté nationale ?',
      a: isAr
        ? 'بيئتنا الحالية تعتمد على بنية تحتية سحابية مؤمنة ومشفرة (نشر تجريبي/عرض توضيحي). أما النشر السيادي المحلي (On-Premise) في الجزائر لعملائنا المستقبليين في القطاع العام وقطاع الطاقة، فهو قيد التطوير ضمن خارطة طريقنا، وسيكون متاحاً عند الانتقال إلى الإنتاج.'
        : currentLanguage === 'en'
        ? 'Our current environment runs on secured, encrypted cloud infrastructure (pilot/demo deployment). Sovereign On-Premise deployment in Algeria for future public-sector and energy clients is a capability under active development on our roadmap, available at production go-live.'
        : 'Notre environnement actuel s\'appuie sur une infrastructure cloud sécurisée et chiffrée (déploiement pilote/démo). Le déploiement On-Premise souverain en Algérie pour nos futurs clients étatiques et du secteur de l\'énergie est une capacité en cours de construction sur notre feuille de route, disponible au passage en production.',
    },
    {
      q: isAr
        ? 'كيف يتعامل النظام مع انقطاع الإنترنت في المسارات الطويلة أو بالصحراء؟'
        : currentLanguage === 'en'
        ? 'How does NextTransit operate on remote routes with poor internet coverage?'
        : 'Comment l\'application fonctionne-t-elle sur les routes désertiques sans réseau ?',
      a: isAr
        ? 'النظام مجهز بتقنية "Offline-First" المتطورة. يقوم واجهات الهاتف الذكي للسائقين وأجهزة التتبع بحفظ كافة القياسات، الفحوصات والمازوت محلياً، وبمجرد دخول الشاحنة في مجال تغطية (Mobilis / Djezzy / Ooredoo 3G/4G) تتم المزامنة تلقائياً.'
        : currentLanguage === 'en'
        ? 'NextTransit utilizes client-side offline buffering. All driver pre-trip logs, fuel records, and telemetry metrics are saved locally on browser or mobile storage, then auto-synchronized the moment a 3G/4G/Edge network signal is acquired.'
        : 'Notre plateforme intègre une technologie de mise en cache locale. Toutes les actions du mécanicien ou du chauffeur sont enregistrées localement et se synchronisent automatiquement dès le retour de couverture Mobilis/Djezzy.',
    },
    {
      q: isAr
        ? 'هل فواتير الاشتراك متوافقة مع القوانين الجزائرية وبالعملة الوطنية؟'
        : currentLanguage === 'en'
        ? 'Are subscriptions billed in DZD and fully compliant with Algerian financial codes?'
        : 'Les factures d\'abonnement sont-elles émises en DZD et conformes au fisc algérien ?',
      a: isAr
        ? 'نعم كلياً. نقوم بإصدار فواتير رسمية متوافقة مع النظام الجمركي والضريبي الجزائري، ويتم الدفع بالدينار الجزائري (DZD) عبر التحويل البنكي أو الحساب الجاري البريدي (CCP)، مع توفير كشوف فواتير تفصيلية قابلة للدمج مباشرة في محاسبة شركتك.'
        : currentLanguage === 'en'
        ? 'Absolutely. We are a registered entity issuing official commercial invoices in Algerian Dinars (DZD). Payments can be wired via standard corporate bank transfers or CCP postal logs, fully compliant with national accounting and audit inspections.'
        : 'Absolument. Nos factures commerciales réglementaires sont libellées en Dinars Algériens (DZD) avec TVA nationale récupérable, réglables par virement bancaire ou compte CCP, éliminant tout blocage administratif de paiement extérieur.',
    },
    {
      q: isAr
        ? 'هل يمكن تعديل أو تجاوز قوانين اتخاذ القرار التشغيلية؟'
        : currentLanguage === 'en'
        ? 'Can the operational and decision rules be customized or overridden?'
        : 'Peut-on personnaliser ou outrepasser les règles de décision opérationnelles ?',
      a: isAr
        ? 'نعم. يملك المدير والمسؤول الفني (Fleet Manager) صلاحيات كاملة لتعديل عتبات الحساب (مثلاً تغيير قيمة التآكل في الأطلس أو تعديل معايير الخطورة) كما يملك الصلاحية الآمنة لتجاوز توقيف الشاحنات مع تسجيل مبررات التجاوز في سجل التدقيق لأغراض الشفافية.'
        : currentLanguage === 'en'
        ? 'Yes. Users with Fleet Manager or Director roles have high-level secure screens to fine-tune rule thresholds, adjust parts safety buffers, or override specific vehicle halts. Every override is logged for corporate auditing.'
        : 'Oui. Les profils Directeurs et Fleet Managers disposent d\'un écran de contrôle pour ajuster les seuils de tolérance des règles (ex. taux de criticité OBD, niveaux d\'alerte stock R3) et outrepasser de manière sécurisée et auditée un arrêt de sécurité.',
    },
    {
      q: isAr
        ? 'كيف يتكامل النظام مع المخطط الوطني للمحاسبة (SCF)؟'
        : currentLanguage === 'en'
        ? 'Is the financial module fully compatible with the Algerian SCF accounting standard?'
        : 'Le module finance est-il vraiment conforme au plan comptable algérien (SCF) ?',
      a: isAr
        ? 'تم بناء وحدة الحسابات من الصفر لتطابق بنود المخطط الوطني للمحاسبة الجزائري (SCF). يقوم النظام تلقائياً بتوجيه نفقات الصيانة وقيم قطع الغيار وأجور العمال واقتطاعات الضريبة (IRG/CNAS) إلى أرقام الحسابات المقابلة في دفتري اليومية والأستاذ.'
        : currentLanguage === 'en'
        ? 'Yes, our accounting module was built specifically around the Algerian SCF (Système Comptable Financier) rules. It automatically generates ledger codes, daily book entries, and handles tax amortization calculations directly in line with local guidelines.'
        : 'Oui, notre module financier a été développé de zéro pour le SCF algérien. Il impute automatiquement les coûts de réparation, d\'usure et d\'amortissement de flotte sur les comptes appropriés (ex. Comptes classe 6 et classe 2).',
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <span className="text-[10px] uppercase text-ochre font-extrabold tracking-wider block">
          {isAr ? 'إجابات شفافة وموثوقة' : currentLanguage === 'en' ? 'COMMON OBJECTIONS' : 'FOIRE AUX QUESTIONS'}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-doc leading-relaxed">
          {subheading}
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3.5">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-ink-2 overflow-hidden transition duration-200 hover:border-ochre/40"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-white text-xs sm:text-sm cursor-pointer"
              >
                <span className="flex-1 leading-snug">{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-ochre shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-doc-2 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-doc leading-relaxed border-t border-white/10 bg-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
