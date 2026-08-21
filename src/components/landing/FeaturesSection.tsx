import React, { useState } from 'react';
import {
  Calculator, Warehouse, Truck, Wrench, Users, CreditCard,
  UserCheck, ShoppingCart, TrendingUp, Landmark, Calendar,
  Construction, BarChart3, Sparkles, ArrowRight, CheckCircle2,
  ShieldCheck, Fuel, LayoutDashboard
} from 'lucide-react';

interface FeaturesSectionProps {
  currentLanguage: string;
  onExploreDemo: () => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ currentLanguage, onExploreDemo }) => {
  const isAr = currentLanguage === 'ar';
  const [activeTab, setActiveTab] = useState<string>('operations');

  const heading = isAr
    ? 'نظام تخطيط موارد المؤسسات الشامل (NextTransit ERP)'
    : currentLanguage === 'en'
    ? 'All-in-One Enterprise ERP Platform for Algeria'
    : 'Plateforme ERP & Gestion Complète Intégrée';

  const subheading = isAr
    ? '15 وحدة برمجية مترابطة صممت لتلبي احتياجات الشركات الجزائرية وتحسين كفاءتها التشغيلية والمالية.'
    : currentLanguage === 'en'
    ? '15 fully-integrated SaaS modules customized for Algerian regulations, labor laws, and operational severe climates.'
    : '15 modules connectés pour automatiser l\'ensemble de votre activité selon la réglementation et les défis nationaux.';

  const modules = [
    // Operations Category
    {
      id: 'fleet',
      category: 'operations',
      icon: Truck,
      title: isAr ? 'إدارة حظيرة المركبات' : currentLanguage === 'en' ? 'Fleet Management' : 'Gestion de Flotte',
      desc: isAr 
        ? 'تتبع شامل للشاحنات والمعدات، ومراقبة استهلاك الوقود باللتر والمسافات الفاصلة.' 
        : currentLanguage === 'en'
        ? 'Track heavy trucks, trailers, light vans, odometer readings and driver allocation in real-time.'
        : 'Suivi des tracteurs routiers, remorques, véhicules légers, relevés d\'odomètre et chauffeurs.',
      benefit: isAr ? 'تقليل نفقات التشغيل بنسبة 25%' : currentLanguage === 'en' ? 'Reduces operational overhead by 25%' : 'Baisse des coûts d\'exploitation de 25%',
    },
    {
      id: 'maintenance',
      category: 'operations',
      icon: Wrench,
      title: isAr ? 'الصيانة الوقائية والأعطال' : currentLanguage === 'en' ? 'Maintenance Decision Engine' : 'Moteur de Maintenance',
      desc: isAr 
        ? 'إدارة أوامر العمل، تشخيص أعطال OBD-II و SAE J1939 الفوري، والجدولة التنبؤية للصيانة.' 
        : currentLanguage === 'en'
        ? 'Complete digital work order dispatch, live OBD-II & SAE J1939 diagnostics parsing, and predictive scheduler.'
        : 'Gestion des bons de travail, diagnostic OBD-II & SAE J1939 instantané et planification préventive.',
      benefit: isAr ? 'تفادي 88% من الأعطال الكارثية' : currentLanguage === 'en' ? 'Prevents 88% of major roadside failures' : 'Évite 88% des pannes immobilisatrices',
    },
    {
      id: 'warranty',
      category: 'operations',
      icon: ShieldCheck,
      title: isAr ? 'إدارة الضمان والتغطية' : currentLanguage === 'en' ? 'Warranty & Compliance' : 'Garanties Constructeur & Conformité',
      desc: isAr 
        ? 'متابعة عقود ضمان المركبات، التنبيه بتاريخ الانتهاء، وحماية ضمانات الصانع عند التدخلات.' 
        : currentLanguage === 'en'
        ? 'Vehicle manufacturer warranty tracking, expiration alerts, and warranty protection during maintenance.'
        : 'Suivi des garanties constructeur, alertes d\'échéance et protection contre l\'annulation de garantie.',
      benefit: isAr ? 'حماية 100% لتغطية الصانع' : currentLanguage === 'en' ? '100% manufacturer coverage safety' : 'Protection absolue de vos garanties',
    },
    {
      id: 'fuel',
      category: 'operations',
      icon: Fuel,
      title: isAr ? 'إدارة وقود الأسطول' : currentLanguage === 'en' ? 'Fuel & Energy Monitoring' : 'Suivi Carburant & Énergie',
      desc: isAr 
        ? 'تسجيل استهلاك الوقود باللتر والمسافة، كشف الشذوذ والسرقة، وتحليل البصمة الكربونية.' 
        : currentLanguage === 'en'
        ? 'Fuel log entries per liter/km, automated anomaly & theft detection, and carbon footprint tracking.'
        : 'Journal de consommation au litre/km, détection automatique des fuites/anomalies et suivi CO2.',
      benefit: isAr ? 'خفض 15% من ضياع المحروقات' : currentLanguage === 'en' ? 'Cuts fuel wastage & theft by 15%' : 'Réduit de 15% le gaspillage carburant',
    },
    {
      id: 'inventory',
      category: 'operations',
      icon: Warehouse,
      title: isAr ? 'المخازن وحجز قطع الغيار' : currentLanguage === 'en' ? 'Parts Inventory Control' : 'Stocks & Pièces Détachées',
      desc: isAr 
        ? 'مراقبة مستمرة للمخزون، حجز تلقائي للقطع فور فتح أوامر العمل وتنبيهات إعادة التزود.' 
        : currentLanguage === 'en'
        ? 'Real-time spare parts stock, automatic parts reservation upon work order creation, and auto purchase alerts.'
        : 'Stocks en temps réel, réservation automatique des pièces sur bon de travail et alertes réapprovisionnement.',
      benefit: isAr ? 'تصفير فترات انتظار القطع بالأسبوع' : currentLanguage === 'en' ? 'Eliminates weeks of parts delivery lag' : 'Élimine les ruptures de stock de filtres/freins',
    },
    {
      id: 'control-room',
      category: 'operations',
      icon: LayoutDashboard,
      isNew: true,
      title: isAr ? 'غرفة التحكم ولوحات الجدران' : currentLanguage === 'en' ? 'Control Room & Wallboards' : 'Salle de Contrôle & Wallboards',
      desc: isAr
        ? 'أربع لوحات جدارية مخصصة (المؤشرات، التنبيهات الحرجة، الصيانة، الخريطة الحية) متصلة بآخر إحداثيات GPS المسجلة لكل مركبة.'
        : currentLanguage === 'en'
        ? 'Four dedicated wallboards (KPI, Critical Alerts, Maintenance, Live Map) wired to the latest recorded GPS position per vehicle for command-center-style monitoring.'
        : 'Quatre wallboards dédiés (KPI, Alertes Critiques, Maintenance, Carte en Direct) connectés aux dernières positions GPS enregistrées par véhicule pour une supervision type centre de contrôle.',
      benefit: isAr ? 'إشراف مركزي متعدد الشاشات' : currentLanguage === 'en' ? 'Centralized multi-screen supervision' : 'Supervision centralisée multi-écrans',
    },
    // Finance Category
    {
      id: 'accounting',
      category: 'finance',
      icon: Calculator,
      title: isAr ? 'المحاسبة المالية والـ SCF' : currentLanguage === 'en' ? 'Financial Accounting & SCF' : 'Comptabilité & Conforme SCF',
      desc: isAr 
        ? 'متوافقة كلياً مع المخطط الوطني للمحاسبة الجزائري، الموازنات الربع سنوية وإصدار التقارير.' 
        : currentLanguage === 'en'
        ? 'Fully compliant with Algerian SCF guidelines, fiscal reporting, and multi-ledger balances.'
        : 'Comptabilité générale et analytique rigoureusement conforme au Système Comptable Financier (SCF) algérien.',
      benefit: isAr ? 'تقارير ضريبية جاهزة بكبسة زر' : currentLanguage === 'en' ? 'Instant generation of fiscal balance sheets' : 'Génération instantanée de la liasse fiscale',
    },
    {
      id: 'purchasing',
      category: 'finance',
      icon: ShoppingCart,
      title: isAr ? 'المشتريات والتوريد' : currentLanguage === 'en' ? 'Purchasing & Supply Chain' : 'Achats & Chaîne d\'Approvisionnement',
      desc: isAr 
        ? 'إدارة فواتير الموردين، تقلبات أسعار الصرف، طلبات عروض الأسعار والموافقات المالية.' 
        : currentLanguage === 'en'
        ? 'Track local and international supplier quotes, import transport duties, customs fees, and validation flows.'
        : 'Gestion des bons de commande fournisseurs, calcul des frais de douane et devises étrangères.',
      benefit: isAr ? 'تقليص نفقات المشتريات بـ 12%' : currentLanguage === 'en' ? 'Saves up to 12% on supplier price negotiations' : 'Contrôle strict des prix unitaires et marges',
    },
    {
      id: 'sales',
      category: 'finance',
      icon: TrendingUp,
      title: isAr ? 'المبيعات والفوترة التجارية' : currentLanguage === 'en' ? 'Sales & Commercial Invoicing' : 'Ventes & Facturation',
      desc: isAr 
        ? 'إصدار الفواتير بالدينار والعملات، متابعة الديون، وتطبيق معايير المصلحة التجارية الوطنية.' 
        : currentLanguage === 'en'
        ? 'Draft commercial proposals, track customer credit limits, aging balances and generate official DZD bills.'
        : 'Devis, facturation commerciale conforme à la réglementation de la Direction Générale des Impôts.',
      benefit: isAr ? 'تحصيل أسرع للمستحقات بنسبة 40%' : currentLanguage === 'en' ? 'Improves collection speed by 40%' : 'Réduit les délais de paiement clients de 40%',
    },
    {
      id: 'assets',
      category: 'finance',
      icon: Landmark,
      title: isAr ? 'إدارة الأصول الثابتة' : currentLanguage === 'en' ? 'Fixed Asset Depreciation' : 'Gestion des Actifs',
      desc: isAr 
        ? 'حساب إهلاك الآلات، الشاحنات، والمقرات بدقة محاسبية متكاملة مع الموازنة العامة.' 
        : currentLanguage === 'en'
        ? 'Automatic asset depreciation ledger calculation based on both straight-line and accelerated rules.'
        : 'Calcul automatique des amortissements linéaires ou dégressifs de vos camions et engins.',
      benefit: isAr ? 'تتبع فوري للقيمة الصافية للأصول' : currentLanguage === 'en' ? 'Live valuation of corporate physical net worth' : 'Audit immédiat de la valeur nette de votre parc',
    },
    // People Category
    {
      id: 'hr',
      category: 'people',
      icon: Users,
      title: isAr ? 'الموارد البشرية والعمال' : currentLanguage === 'en' ? 'HR & Driver Rosters' : 'Ressources Humaines & Pointage',
      desc: isAr 
        ? 'تسيير ملفات الموظفين، الحضور والانصراف، الغيابات، ورخص قيادة السائقين.' 
        : currentLanguage === 'en'
        ? 'Manage employee files, shift rostering, driver medical clearances, and active certifications.'
        : 'Dossiers collaborateurs, visites médicales obligatoires des chauffeurs, validité des permis lourds.',
      benefit: isAr ? 'أتمتة ملفات الموظفين بنسبة 100%' : currentLanguage === 'en' ? '100% automated expiration alerts' : 'Alertes de renouvellement de permis automatiques',
    },
    {
      id: 'payroll',
      category: 'people',
      icon: CreditCard,
      title: isAr ? 'الأجور والضمان الاجتماعي (DAS)' : currentLanguage === 'en' ? 'Algerian Payroll & CNAS' : 'Paie & Déclarations CNAS',
      desc: isAr 
        ? 'حساب الأجور الشهرية، اقتطاعات الضريبة (IRG)، والاشتراك في الضمان الاجتماعي (CNAS).' 
        : currentLanguage === 'en'
        ? 'Calculates monthly net salary, IRG tax bracket brackets, and prepares monthly CNAS digital logs.'
        : 'Calcul automatique de la paie, calcul de l\'IRG, fiches de paie et génération du fichier DAS CNAS.',
      benefit: isAr ? 'صفر خطأ في حساب اشتراكات CNAS' : currentLanguage === 'en' ? 'Zero errors on annual DAS filings' : 'Conformité totale avec l\'inspecteur du travail',
    },
    {
      id: 'crm',
      category: 'people',
      icon: UserCheck,
      title: isAr ? 'علاقات العملاء ومتابعة العقود' : currentLanguage === 'en' ? 'CRM & Contract Tracking' : 'CRM & Suivi de Contrat',
      desc: isAr 
        ? 'متابعة الصفقات اللوجستية وعقود النقل طويلة الأجل مع كبار المتعاملين الوطنيين.' 
        : currentLanguage === 'en'
        ? 'Track transport tenders, dynamic pricing per Wilaya distance, and client interaction logs.'
        : 'Gestion des appels d\'offres de fret, tarifs kilométriques par Wilaya et devis clients.',
      benefit: isAr ? 'زيادة نسبة تجديد العقود بـ 30%' : currentLanguage === 'en' ? 'Boosts customer retention by 30%' : 'Augmente le renouvellement des contrats de 30%',
    },
    // Intelligence Category
    {
      id: 'analytics',
      category: 'intelligence',
      icon: BarChart3,
      title: isAr ? 'التحليلات الجغرافية والمالية' : currentLanguage === 'en' ? 'Wilaya-level Analytics' : 'Analytique & Cartographie',
      desc: isAr 
        ? 'مؤشرات الأداء موزعة حسب الولايات، المسارات، واستهلاك المحروقات بالأقاليم.' 
        : currentLanguage === 'en'
        ? 'Interactive GIS reports displaying cost-per-kilometer mapped across 58 Wilayas.'
        : 'Analyse des coûts de transport par Wilaya (sur les 58 Wilayas) et par type de route.',
      benefit: isAr ? 'تحديد دقيق للمسارات الأكثر ربحية' : currentLanguage === 'en' ? 'Pinpoints exact high-margin transport lanes' : 'Met en évidence vos trajets les plus rentables',
    },
    {
      id: 'ai-assistant',
      category: 'intelligence',
      icon: Sparkles,
      title: isAr ? 'مساعد الذكاء الاصطناعي التنبؤي' : currentLanguage === 'en' ? 'NextTransit AI Assistant' : 'Assistant IA Décisionnel',
      desc: isAr 
        ? 'تحليل ذكي للميزانيات المتوقعة، توصيات الصيانة الوقائية والتحقق من الفواتير تلقائياً.' 
        : currentLanguage === 'en'
        ? 'Reads massive work orders, auto-detects pricing anomalies, and recommends optimal replacement steps.'
        : 'Détecte les anomalies de facturation et prédit l\'obsolescence des pièces détachées.',
      benefit: isAr ? 'اكتشاف 98% من فواتير الموردين المبالغ فيها' : currentLanguage === 'en' ? 'Finds up to 98% of supplier pricing anomalies' : 'Détecte 98% des écarts de tarification fournisseurs',
    },
    {
      id: 'projects',
      category: 'intelligence',
      icon: Calendar,
      title: isAr ? 'إدارة مشاريع النقل والتوزيع' : currentLanguage === 'en' ? 'Project & Fleet Dispatch' : 'Projets & Dispatching',
      desc: isAr 
        ? 'تخطيط جداول المغادرة، تعيين السائقين وتنسيق مسارات التوزيع اليومي الكثيف.' 
        : currentLanguage === 'en'
        ? 'Milestone calendar planning, dynamic vehicle allocation and automated dispatch orders.'
        : 'Planification des flux, affectation des chauffeurs et ordres de mission.',
      benefit: isAr ? 'تسليم أسرع للشاحنات بنسبة 18%' : currentLanguage === 'en' ? 'Reduces scheduling time by 18%' : 'Réduit de 18% le temps administratif de dispatch',
    },
  ];

  const filteredModules = modules.filter(m => m.category === activeTab);

  const tabs = [
    { id: 'operations', label: isAr ? 'العمليات والورشة' : currentLanguage === 'en' ? 'Operations & Workshop' : 'Opérations & Atelier' },
    { id: 'finance', label: isAr ? 'المالية والمحاسبة' : currentLanguage === 'en' ? 'Finance & Accounting' : 'Comptabilité & Achats' },
    { id: 'people', label: isAr ? 'الأفراد والأجور' : currentLanguage === 'en' ? 'HR & Roster' : 'RH & CNAS' },
    { id: 'intelligence', label: isAr ? 'الذكاء والتحليل' : currentLanguage === 'en' ? 'AI & Analytics' : 'IA & Analytique' },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <span className="text-[10px] uppercase text-ochre font-extrabold tracking-wider block">
          {isAr ? 'قوة التسيير المتكامل' : currentLanguage === 'en' ? 'MODULAR POWER' : 'MODULES SAAS CONNECTÉS'}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-doc leading-relaxed">
          {subheading}
        </p>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/10 pb-2 max-w-xl mx-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-ochre text-ink font-bold shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid Display of Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map((m) => {
          const IconComp = m.icon;
          return (
            <div 
              key={m.id} 
              className="p-5 rounded-2xl bg-[#101726] border border-white/10 hover:border-ochre/40 hover:shadow-lg transition duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre/10 border border-ochre/30 text-ochre group-hover:bg-ochre group-hover:text-ink transition-all">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-ochre transition flex items-center gap-2">
                    {m.title}
                    {(m as { isNew?: boolean }).isNew && (
                      <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-ochre/20 text-ochre">
                        {isAr ? 'جديد' : currentLanguage === 'en' ? 'New' : 'Nouveau'}
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {m.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {m.benefit}
                </span>
                <button 
                  onClick={onExploreDemo}
                  className="inline-flex items-center gap-1 text-ochre hover:text-amber-300 transition cursor-pointer"
                >
                  <span>{isAr ? 'عرض تجريبي' : currentLanguage === 'en' ? 'View Demo' : 'Explorer la Démo'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
