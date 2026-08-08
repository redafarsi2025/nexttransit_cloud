import React, { useState } from 'react';
import { Check, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react';

interface PricingSectionProps {
  currentLanguage: string;
  onExploreDemo: () => void;
  onRequestDemo: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ currentLanguage, onExploreDemo, onRequestDemo }) => {
  const isAr = currentLanguage === 'ar';
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  const heading = isAr
    ? 'خطط أسعار واضحة ومناسبة لميزانيتكم'
    : currentLanguage === 'en'
    ? 'Transparent Pricing Tailored to Your Scale'
    : 'Des Tarifs Clairs et Adaptés à Votre Échelle';

  const subheading = isAr
    ? 'اختر الخطة المناسبة لحجم أسطولك ومشاريعك. وفر حتى 20% عند الدفع السنوي. جميع الأسعار بالدينار الجزائري.'
    : currentLanguage === 'en'
    ? 'Select the optimal plan for your company. Save 20% with annual billing. All prices in Algerian Dinars (DZD).'
    : 'Optimisez vos coûts avec nos abonnements flexibles. Économisez 20% avec la facturation annuelle. Tarifs en DZD.';

  const tiers = [
    {
      id: 'starter',
      name: isAr ? 'المقاولات الناشئة / الأسطول الصغير' : currentLanguage === 'en' ? 'SME Starter' : 'Starter PME',
      desc: isAr ? 'مناسب للشركات الصغيرة والمتوسطة ذات الأسطول حتى 15 شاحنة.' : currentLanguage === 'en' ? 'Best for fleets up to 15 active vehicles.' : 'Parfait pour les flottes jusqu\'à 15 véhicules.',
      monthlyPrice: 35000,
      annualPrice: 28000,
      features: isAr
        ? [
            'تسيير حتى 15 مركبة',
            'إدارة ورشة الصيانة الوقائية الأساسية',
            'التتبع الإلكتروني OBD-II',
            'دعم كامل لثلاث لغات (AR/FR/EN)',
            'حفظ مؤقت للعمل دون إنترنت',
            'تقارير الولايات الـ 58 الأساسية',
          ]
        : [
            'Up to 15 active vehicles/machinery',
            'Basic maintenance work orders',
            'Standard OBD-II diagnostic check',
            'AR / FR / EN Multilingual & RTL Support',
            'Offline-first buffer sync',
            'Basic reports across 58 Wilayas',
          ],
      popular: false,
    },
    {
      id: 'pro',
      name: isAr ? 'الشركات والنمو التجاري' : currentLanguage === 'en' ? 'Enterprise Pro' : 'Enterprise Pro',
      desc: isAr ? 'الأكثر مبيعاً للشركات اللوجستية، الإنتاجية ومشاريع الـ BTP حتى 75 مركبة.' : currentLanguage === 'en' ? 'Our most popular plan for mid-sized transport & BTP operations up to 75 vehicles.' : 'Le choix de référence pour les flottes de transport & BTP jusqu\'à 75 véhicules.',
      monthlyPrice: 85000,
      annualPrice: 68000,
      features: isAr
        ? [
            'تسيير حتى 75 مركبة ومعدة ثقيلة',
            'مشاريع الصيانة وقواعد السلامة المتقدمة',
            'الحساب التلقائي لتكلفة الإصلاح (يد عاملة + قطع)',
            'مطابقة بلاغات السائقين والتأكد من الأعطال',
            'التحكم الكامل في قطع الغيار والحجز التلقائي',
            'المحاسبة المتكاملة المعتمدة SCF',
            'مساعد الذكاء الاصطناعي التنبؤي',
            'دعم مباشر عبر WhatsApp وهاتف الدعم',
          ]
        : [
            'Up to 75 active vehicles & heavy machines',
            'Advanced safety protocols & maintenance scheduler',
            'Automated repair valuation system (Labor + Parts)',
            'Active driver telemetry & incident reconciliation',
            'Robust inventory reservation & auto re-order',
            'SCF accounting & liasse fiscale generator',
            'NextTransit AI Co-pilot assistant',
            'Priority WhatsApp & phone customer care',
          ],
      popular: true,
    },
    {
      id: 'sovereign',
      name: isAr ? 'السيادة والشركات الكبرى' : currentLanguage === 'en' ? 'Sovereign Custom' : 'Souverain Dédié',
      desc: isAr ? 'للشركات الكبرى والهيئات الحكومية ذات الأساطيل الضخمة والتي تحتاج استضافة مخصصة.' : currentLanguage === 'en' ? 'For massive fleets, public enterprises, and government institutions needing dedicated hosting.' : 'Pour les flottes majeures et institutions étatiques nécessitant une gouvernance de données absolue.',
      monthlyPrice: 'Custom',
      annualPrice: 'Custom',
      features: isAr
        ? [
            'عدد غير محدود من المركبات والمستخدمين',
            'استضافة سحابية خاصة مخصصة بالجزائر',
            'أعلى معايير أمن البيانات والسيادة السيبرانية',
            'تكامل مخصص مع أنظمة المشتريات القديمة',
            'مدير حساب تقني مخصص ومتاح 24/7',
            'تعديل مخصص لمعايير وقواعد التشغيل',
            'تدريب حضوري وإعداد كامل لفرق العمل',
          ]
        : [
            'Unlimited active vehicles & heavy equipment',
            'Dedicated private cloud hosting options',
            'Absolute data sovereignty compliance',
            'Custom APIs & third-party database sync',
            '24/7/365 Dedicated SLA & account manager',
            'Custom tailoring of decision logic & rules',
            'On-site workshops & employee training',
          ],
      popular: false,
    },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <span className="text-[10px] uppercase text-indigo-600 font-extrabold tracking-wider block">
          {isAr ? 'عروض تنافسية مدروسة' : currentLanguage === 'en' ? 'TRANSPARENT PRICING' : 'ABONNEMENTS TRANSPARENTS'}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {subheading}
        </p>
      </div>

      {/* Pricing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            billingPeriod === 'monthly' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {isAr ? 'فاتورة شهرية' : currentLanguage === 'en' ? 'Monthly Billing' : 'Mensuel'}
        </button>
        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
          {isAr ? 'وفر 20% سنويًا' : currentLanguage === 'en' ? 'Save 20% Annually' : 'Économisez 20%'}
        </span>
        <button
          onClick={() => setBillingPeriod('annual')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            billingPeriod === 'annual' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {isAr ? 'فاتورة سنوية' : currentLanguage === 'en' ? 'Annual Billing' : 'Annuel'}
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tiers.map((t) => {
          const isCustom = t.monthlyPrice === 'Custom';
          const price = billingPeriod === 'annual' ? t.annualPrice : t.monthlyPrice;
          const displayPrice = isCustom 
            ? (isAr ? 'تواصل معنا' : currentLanguage === 'en' ? 'Custom Quote' : 'Sur Devis')
            : `${price.toLocaleString()} DA`;

          return (
            <div
              key={t.id}
              className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between relative transition duration-300 ${
                t.popular
                  ? 'border-indigo-600 bg-white shadow-md ring-2 ring-indigo-600/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {t.popular && (
                <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {isAr ? 'الأكثر ملاءمة' : currentLanguage === 'en' ? 'Most Popular' : 'Recommandé'}
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                    {t.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 min-h-[32px] leading-normal">
                    {t.desc}
                  </p>
                </div>

                {/* Price block */}
                <div className="py-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    {displayPrice}
                  </span>
                  {!isCustom && (
                    <span className="text-xs text-slate-500 font-medium">
                      {billingPeriod === 'annual' ? (isAr ? ' / شهر (بالدفع السنوي)' : ' / month (billed annually)') : (isAr ? ' / شهر' : ' / month')}
                    </span>
                  )}
                </div>

                {/* Features list */}
                <ul className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                  {t.features.map((feat, i) => (
                    <li key={i} className="flex gap-2.5 items-start">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-600 leading-normal">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                {isCustom ? (
                  <button
                    onClick={onRequestDemo}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>{isAr ? 'طلب عرض مخصص' : currentLanguage === 'en' ? 'Request Consultation' : 'Prendre Rendez-vous'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={onExploreDemo}
                    className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      t.popular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <span>{isAr ? 'ابدأ الفترة التجريبية مجاناً' : currentLanguage === 'en' ? 'Start Free Trial' : 'Essayer Gratuitement'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
