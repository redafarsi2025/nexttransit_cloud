import React, { useState } from 'react';
import { 
  Building2, Factory, Truck, ShoppingBag, Briefcase, 
  HeartPulse, Shield, Landmark, HardHat, CheckCircle2 
} from 'lucide-react';

interface IndustriesSectionProps {
  currentLanguage: string;
}

export const IndustriesSection: React.FC<IndustriesSectionProps> = ({ currentLanguage }) => {
  const isAr = currentLanguage === 'ar';
  const [activeIndustry, setActiveIndustry] = useState<string>('construction');

  const heading = isAr
    ? 'حلول مخصصة للقطاعات الحيوية في الجزائر'
    : currentLanguage === 'en'
    ? 'Tailored SaaS Solutions for Algerian Industries'
    : 'Des Solutions adaptées à chaque Secteur';

  const subheading = isAr
    ? 'برمجيات متخصصة تلائم خصائص الورشات، المصانع، شركات النقل، ومشاريع البنية التحتية الوطنية.'
    : currentLanguage === 'en'
    ? 'Engineered specifically to solve domain-specific roadblocks, from large BTP sites to private healthcare fleets.'
    : 'Conçu pour répondre aux contraintes réglementaires et logistiques propres aux leaders de l\'économie nationale.';

  const industries = [
    {
      id: 'construction',
      icon: HardHat,
      title: isAr ? 'البناء والأشغال العمومية (BTP)' : currentLanguage === 'en' ? 'Construction & Infrastructure' : 'Construction & BTP',
      metric: '32% Cost Reduction',
      desc: isAr
        ? 'التحكم في مصاريف الآلات الكبيرة، توزيع المازوت في الورشات الصحراوية النائية، ومتابعة ساعات تشغيل الجرافات والمحولات.'
        : currentLanguage === 'en'
        ? 'Real-time machinery hour logs, sandstorm dust filter scheduling, and field diesel allocation tracking for deep Saharan sites.'
        : 'Suivi des heures de pelles, distribution de carburant en citerne mobile et alertes de maintenance pour les chantiers isolés.',
      points: isAr
        ? ['تتبع استهلاك المازوت بالورشة', 'جدولة صيانة الفلاتر التنبؤية', 'ربط تكاليف الكراء والمعدات']
        : currentLanguage === 'en'
        ? ['Mobile tank fuel audit', 'Predictive engine dust alerts', 'Equipment rental cost matching']
        : ['Audit carburant en citerne mobile', 'Alerte poussière moteur prédictive', 'Suivi du coût horaire engins'],
    },
    {
      id: 'manufacturing',
      icon: Factory,
      title: isAr ? 'الصناعات التحويلية والمعامل' : currentLanguage === 'en' ? 'Manufacturing & Plants' : 'Industrie & Manufacturier',
      metric: 'Zero Production Lag',
      desc: isAr
        ? 'تنسيق توريد المواد الأولية للمصانع، صيانة خطوط الإنتاج والآلات الثقيلة، وحجز قطع الغيار الحساسة R3 تلقائياً.'
        : currentLanguage === 'en'
        ? 'Connect parts inventory with factory floor maintenance. Automated purchase requisitions on low spare levels.'
        : 'Lien direct entre l\'atelier d\'usine et les achats. Automatisation du stock de maintenance de niveau 1 (roulements, filtres).',
      points: isAr
        ? ['جدولة الصيانة للآلات الصناعية', 'الطلب التلقائي للقطع المستهلكة', 'تقليل فترات توقف الإنتاج المفاجئ']
        : currentLanguage === 'en'
        ? ['Plant equipment scheduler', 'Auto reorder of critical parts', 'Minimized manufacturing downtime']
        : ['Maintenance machines-outils', 'Calcul de criticité de pièce R3', 'Réduction des arrêts machines'],
    },
    {
      id: 'transport',
      icon: Truck,
      title: isAr ? 'النقل واللوجستيك الكثيف' : currentLanguage === 'en' ? 'Logistics & Heavy Haulage' : 'Transport & Fret national',
      metric: '95%+ Vehicle Availability',
      desc: isAr
        ? 'تسيير الشاحنات الثقيلة والمقطورات، تتبع المسافات وتكاليف العبور عبر الولايات، ومطابقة بلاغات السائقين R6.'
        : currentLanguage === 'en'
        ? 'Optimized routing for multi-Wilaya freight corridors, active fuel-idling audit, and strict mechanical safety logs.'
        : 'Gestion des tracteurs routiers et remorques, coûts de péage fictifs, frais de route chauffeurs et réconciliation R6.',
      points: isAr
        ? ['مراقبة استهلاك المازوت والوقود', 'التحقق التلقائي من بلاغات السائقين', 'التوجيه اللوجستي الذكي']
        : currentLanguage === 'en'
        ? ['High-fidelity fuel auditing', 'Automatic R6 incident matching', 'Optimized multi-route maps']
        : ['Contrôle de consommation de gasoil', 'Réconciliation R6 automatique', 'Optimisation des trajets longs'],
    },
    {
      id: 'distribution',
      icon: Building2,
      title: isAr ? 'التوزيع والتجارة بالجملة' : currentLanguage === 'en' ? 'Wholesale & Distribution' : 'Distribution & Grossistes',
      metric: '100% Delivery Accuracy',
      desc: isAr
        ? 'تنظيم جولات الشاحنات الخفيفة ومندوبي المبيعات، الفوترة التجارية المتعددة، وإدارة حسابات الزبائن والتحصيل.'
        : currentLanguage === 'en'
        ? 'Fleet optimization for regional wholesale supply, retail deliveries, age of accounts and credit limits.'
        : 'Rotations quotidiennes des fourgons, facturation au point de vente, contrôle des limites de crédit clients.',
      points: isAr
        ? ['تحسين مسارات التوزيع اليومية', 'التحكم التام في سقف الديون للزبائن', 'جرد الشاحنات كمستودعات متنقلة']
        : currentLanguage === 'en'
        ? ['Retail distribution routing', 'Strict customer credit cap checks', 'Van inventory logs as moving sub-stocks']
        : ['Optimisation de tournées de livraison', 'Limite de crédit clients stricte', 'Camions gérés comme sous-dépôts'],
    },
    {
      id: 'retail',
      icon: ShoppingBag,
      title: isAr ? 'التجارة بالتجزئة والمحلات' : currentLanguage === 'en' ? 'Retail & Multi-Stores' : 'Commerce de Détail & Superettes',
      metric: 'Instant Stock Updates',
      desc: isAr
        ? 'متابعة نقاط البيع المتعددة، مستويات المخزون للمنتجات الاستهلاكية، والتحويلات الآمنة بين الفروع.'
        : currentLanguage === 'en'
        ? 'Multi-branch retail store sales consolidation, POS integrations, and real-time inventory levels.'
        : 'Consolidation des ventes multi-boutiques, intégration caisses et niveaux de stock en temps réel.',
      points: isAr
        ? ['متابعة الفروع المتعددة في الوقت الفعلي', 'تحويلات المخزون الآمنة', 'إحصائيات المبيعات والأرباح']
        : currentLanguage === 'en'
        ? ['Real-time multi-branch tracking', 'Secure inter-branch stock transfers', 'Sales and margin metrics']
        : ['Suivi multi-boutiques en temps réel', 'Transferts de stock sécurisés', 'Analyses de marge commerciale'],
    },
    {
      id: 'services',
      icon: Briefcase,
      title: isAr ? 'شركات الخدمات والاستشارات' : currentLanguage === 'en' ? 'Professional Services' : 'Services & Prestations',
      metric: '98% Client Satisfaction',
      desc: isAr
        ? 'تسيير المشاريع الاستشارية، فواتير الخدمات الشهرية والساعية، وإدارة الوقت والمهام للفرق.'
        : currentLanguage === 'en'
        ? 'Track project delivery milestones, professional service billing, time logs, and CRM operations.'
        : 'Gestion des projets, feuille de temps des consultants, facturation d\'honoraires et CRM.',
      points: isAr
        ? ['متابعة تسليم المشاريع', 'فواتير مرنة للخدمات', 'تسيير المهام والوقت']
        : currentLanguage === 'en'
        ? ['Milestone delivery reports', 'Flexible service invoicing', 'Timesheets and task logs']
        : ['Suivi des livrables de projet', 'Facturation d\'honoraires flexible', 'Saisie de temps et de tâches'],
    },
    {
      id: 'healthcare',
      icon: HeartPulse,
      title: isAr ? 'المؤسسات الصحية وسيارات الإسعاف' : currentLanguage === 'en' ? 'Healthcare & Ambulances' : 'Santé & Ambulances',
      metric: '100% Mission Dispatch',
      desc: isAr
        ? 'ضمان جاهزية سيارات الإسعاف بنسبة 100% مع تطبيق صارم لقواعد السلامة لتفادي أي عطل طارئ أثناء المهام.'
        : currentLanguage === 'en'
        ? 'Keep emergency ambulances 100% safe. Automated lockouts instantly flag minor issues before dispatch.'
        : 'Garantir la disponibilité absolue des ambulances d\'urgence médicale. Application stricte des règles de sécurité.',
      points: isAr
        ? ['فحص يومي للمعدات الطبية بالمركبة', 'منع الخروج للمركبات ذات العيوب', 'تتبع دقيق لبيانات استهلاك الوقود']
        : currentLanguage === 'en'
        ? ['Daily check of internal medical tools', 'Red alert locks for unsafe dispatch', 'Strict fuel and driver audit logs']
        : ['Contrôle d\'équipement embarqué', 'Arrêt de sécurité systématique de véhicule à risque', 'Suivi carburant et de mission'],
    },
    {
      id: 'public-sector',
      icon: Landmark,
      title: isAr ? 'المؤسسات والهيئات العمومية' : currentLanguage === 'en' ? 'Public Sector & Ministries' : 'Administrations & Secteur Public',
      metric: 'Strict Sovereign Audit',
      desc: isAr
        ? 'تسيير الأساطيل التابعة للبلديات والولايات، محاسبة الميزانية الصارمة، وتقديم تقارير شفافة ومطابقة للقوانين.'
        : currentLanguage === 'en'
        ? 'Municipal waste management trucks, utility fleets, strict budgetary control, and regulatory compliance.'
        : 'Gestion des véhicules municipaux (bennes-ordures, eau), conformité budgétaire et transparence des coûts.',
      points: isAr
        ? ['تقارير الإنفاق التفصيلية للتدقيق', 'صيانة آليات الخدمة العمومية', 'التوافق مع محاسبة الدولة']
        : currentLanguage === 'en'
        ? ['Detailed audits and reports', 'Public utility machinery logs', 'Compliance with public finance rules']
        : ['Rapports détaillés d\'audit de gestion', 'Suivi des bennes et engins municipaux', 'Conformité comptabilité publique'],
    },
  ];

  const currentInd = industries.find(i => i.id === activeIndustry) || industries[0];

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <span className="text-[10px] uppercase text-indigo-600 font-extrabold tracking-wider block">
          {isAr ? 'تخصص قطاعي دقيق' : currentLanguage === 'en' ? 'SECTORAL EXPERTISE' : 'EXPERTISE SECTORIELLE'}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {subheading}
        </p>
      </div>

      {/* Responsive Industry Selectors (Vertical sidebar on desktop, slider on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Industry Menu */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          {industries.map((ind) => {
            const IconComp = ind.icon;
            return (
              <button
                key={ind.id}
                onClick={() => setActiveIndustry(ind.id)}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  activeIndustry === ind.id
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs text-indigo-950 font-bold'
                    : 'border-slate-200/60 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  activeIndustry === ind.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <IconComp className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <span className="text-xs block leading-tight">{ind.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Industry Details */}
        <div className="lg:col-span-8 rounded-3xl border border-indigo-100 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                {currentInd.title}
              </span>
              <span className="text-xs font-black text-emerald-700">
                {currentInd.metric}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2">
              {currentInd.desc}
            </p>

            <div className="space-y-2 pt-4">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {isAr ? 'مميزات لوجستية حيوية' : currentLanguage === 'en' ? 'Core Deliverables' : 'Fonctionnalités Clés'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentInd.points.map((pt, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-[11px] text-slate-400">
              {isAr ? 'الامتثال التام للأنظمة الضريبية واللوائح الجزائرية' : currentLanguage === 'en' ? '100% compliant with Algerian tax & labor codes' : '100% conforme aux codes fiscaux et du travail algériens'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
