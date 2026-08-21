import React, { Suspense, lazy, useState, useMemo } from 'react';
import { useLocalization } from '../../context/LocalizationContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { loginUser } from '../../services/authService';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../config/demoAccount';
import { AuthModal } from '../common/AuthModal';
import { LanguageSelector } from '../localization/LanguageSelector';

// Import our modular sub-sections
import { LogosSection } from '../landing/LogosSection';
import { ProblemsSection } from '../landing/ProblemsSection';
import { FeaturesSection } from '../landing/FeaturesSection';
import { IndustriesSection } from '../landing/IndustriesSection';
import { DemoSection } from '../landing/DemoSection';
import { ComparisonSection } from '../landing/ComparisonSection';
import { FaqSection } from '../landing/FaqSection';
import { ContactModal } from '../landing/ContactModal';
import { RoadmapSection } from '../landing/RoadmapSection';

const RoiCalculator = lazy(() => import('../landing/RoiCalculator').then(m => ({ default: m.RoiCalculator })));

import {
  TrendingUp,
  Activity,
  Package,
  Wrench,
  AlertTriangle,
  Calculator,
  FileText,
  Truck,
  Building2,
  Globe,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  DollarSign,
  Sun,
  MapPin,
  Wifi,
  Scale,
  Sparkles,
  Layers,
  Fuel,
  Info,
  LogIn,
  LogOut,
  UserPlus,
  Menu,
  X,
  MessageSquare,
  Users,
  Award,
  Send,
  Check,
  Calendar,
  Loader2,
  Copy,
} from 'lucide-react';

// Scenario interface for dynamic KPI preview
interface Scenario {
  id: string;
  name: { fr: string; ar: string; en: string };
  region: { fr: string; ar: string; en: string };
  operationalEfficiency: number;
  monthlyExpenditure: number; // in DZD
  criticalBreakdowns: number;
  unreconciledIncidents: number;
  description: { fr: string; ar: string; en: string };
}

export const LandingPage: React.FC = () => {
  const { currentLanguage, setLanguage, dir } = useLocalization();
  const { currentRole, changeScreen, setIsRoleSelectorOpen, currentUser, refreshUserSession } = useAuth();

  // Active scenario for dynamic KPI visualization
  const [activeScenarioId, setActiveScenarioId] = useState<string>('sahara');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalIsSignUp, setAuthModalIsSignUp] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);
  const [demoLoginError, setDemoLoginError] = useState<string | null>(null);

  const handleTryLiveDemo = async () => {
    setIsDemoLoading(true);
    setDemoLoginError(null);
    try {
      await loginUser(DEMO_EMAIL, DEMO_PASSWORD);
      await refreshUserSession();
    } catch (e) {
      setDemoLoginError(
        currentLanguage === 'en'
          ? 'Live demo temporarily unavailable, please try again.'
          : "Démo en direct temporairement indisponible, réessayez."
      );
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Hero Interactive Card active tab ('cae' | 'obd' | 'fuel' | 'ai')
  const [heroTab, setHeroTab] = useState<'cae' | 'obd' | 'fuel' | 'ai'>('cae');

  // Conversion Modals & Interactions
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [whatsAppText, setWhatsAppText] = useState<string>('');
  
  // Local simulated WhatsApp conversations
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'agent', text: string, time: string }>>([
    { 
      sender: 'agent', 
      text: currentLanguage === 'ar' 
        ? 'مرحباً! أنا أمين، المساعد اللوجستي لـ NextTransit. كيف يمكنني مساعدتك في تنظيم أسطولك اليوم؟' 
        : 'Bonjour ! Je suis Amine, votre conseiller NextTransit. Comment puis-je vous aider à optimiser votre flotte aujourd\'hui ?', 
      time: '16:40' 
    }
  ]);



  // Scenarios data
  const SCENARIOS: Scenario[] = [
    {
      id: 'sahara',
      name: {
        fr: 'Opérations Grand Sud Sahara (Hassi Messaoud / In Salah / Tamanrasset)',
        ar: 'عمليات الجنوب الكبير (حاسي مسعود / عين صالح / تمنراست)',
        en: 'Sahara Deep South Logistics (Hassi Messaoud / In Salah / Tamanrasset)',
      },
      region: { 
        fr: 'Climat extrême & Routes désertiques (Températures > 50°C & Tempêtes de sable)', 
        ar: 'مناخ قاسي وطرق صحراوية (درجات حرارة > 50 درجة وعواصف رملية)', 
        en: 'Extreme heat & desert corridors (Temperatures > 50°C & Sandstorms)' 
      },
      operationalEfficiency: 82.1,
      monthlyExpenditure: 3200000,
      criticalBreakdowns: 5,
      unreconciledIncidents: 2,
      description: {
        fr: 'Planification prédictive de la filtration d\'air et des vidanges d\'huile basée sur la modélisation d\'exposition aux poussières de silice sahariennes.',
        ar: 'تخطيط تنبؤي لتصفية الهواء وتغيير الزيت بناءً على خوارزميات متكيفة مع غبار السيليكا الصحراوي.',
        en: 'Predictive air filtration and lubrication intervals scheduled by decision engines tailored for Saharan sandstorms.',
      },
    },
    {
      id: 'atlas',
      name: {
        fr: 'Traversée de l\'Atlas & Cols de Montagne (Chréa / Constantine / Djurdjura)',
        ar: 'عبور سلسلة جبال الأطلس (الشريعة / قسنطينة / جرجرة)',
        en: 'Atlas Mountain Ridge Operations (Chrea / Constantine / Djurdjura Passes)',
      },
      region: { 
        fr: 'Grades sévères, Pentes abruptes & Risques de verglas hivernaux', 
        ar: 'منحدرات وعرة، طرق ملتوية ومخاطر الجليد الشتوي', 
        en: 'Severe grades, sharp descents & extreme winter freeze risks' 
      },
      operationalEfficiency: 91.2,
      monthlyExpenditure: 2450000,
      criticalBreakdowns: 2,
      unreconciledIncidents: 1,
      description: {
        fr: 'Ajustement proactif de la pression pneumatique et de l\'usure des freins. Alerte de conflit d\'exploitation bloquant les véhicules fatigués sur des cols glissants.',
        ar: 'ضبط استباقي لضغط واهتراء الفرامل. تنبيه تعارض التشغيل لمنع انطلاق المركبات المجهدة في المنحدرات الجبلية الزلقة.',
        en: 'Proactive pneumatic tire pressure monitoring and brake thermal wear metrics. Operation conflict guards block overworked vehicles on icy slopes.',
      },
    },
    {
      id: 'algiers',
      name: {
        fr: 'Transit Urbain Dense d\'Alger (Alger Centre / Port de Béjaïa / Oran)',
        ar: 'العبور الحضري الكثيف (وسط الجزائر / ميناء بجاية / وهران)',
        en: 'High-Density Algiers Urban Freight (Algiers Centre / Port of Bejaia / Oran)',
      },
      region: { 
        fr: 'Embouteillages sévères, Livraison portuaire & Ralentissement prolongé', 
        ar: 'ازدحام مروري شديد، تسليم الموانئ وتوقف متكرر للمحركات', 
        en: 'Severe urban bottlenecks, heavy port freight & extended idle times' 
      },
      operationalEfficiency: 93.4,
      monthlyExpenditure: 1620000,
      criticalBreakdowns: 0,
      unreconciledIncidents: 3,
      description: {
        fr: 'Suivi de la consommation de carburant au ralenti et déclenchement automatique d\'enquêtes pour identifier les chocs mécaniques non télématiques.',
        ar: 'مراقبة دقيقة لاستهلاك الوقود أثناء التوقف، وتفعيل تحقيق تلقائي للكشف عن الصدمات الخفيفة غير الإلكترونية.',
        en: 'Extended idling fuel audit and manual inspection triggers designed for stop-and-go minor impacts or transmission issues without active OBD-II codes.',
      },
    },
  ];

  const activeScenario = useMemo(() => {
    return SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  }, [activeScenarioId]);



  // Multilingual dictionary object to support translation
  const dictionary: Record<string, Record<'fr' | 'ar' | 'en', string>> = {
    title: {
      fr: 'Chaque dinar de maintenance, enfin expliqué.',
      ar: 'كل دينار صيانة، تم شرحه أخيراً.',
      en: 'Every single dinar of maintenance, finally explained.',
    },
    subtitle: {
      fr: 'NextTransit relie la télémétrie de vos véhicules, votre atelier, votre stock de pièces et votre budget en une seule décision : quel véhicule réparer, quand, et à quel coût. En français, en arabe et en anglais.',
      ar: 'يربط نيكس ترانزيت بين بيانات التتبع اللاسلكية لمركباتكم، وورشة العمل، ومخزون قطع الغيار، وميزانيتكم في قرار واحد: أي مركبة يجب إصلاحها، ومتى، وبأي تكلفة. باللغات العربية والفرنسية والإنجليزية.',
      en: 'NextTransit connects your vehicles\' telemetry, your workshop, your parts inventory, and your budget into a single decision: which vehicle to repair, when, and at what cost. Available in French, Arabic, and English.',
    },
    verifiedDataModel: {
      fr: 'Modèle de données vérifié : chaque KPI est traçable jusqu\'à la pièce.',
      ar: 'نموذج بيانات معتمد: كل مؤشر أداء رئيسي قابل للتتبع حتى قطعة الغيار.',
      en: 'Verified data model: each KPI is traceable down to the individual part.',
    },
    exploreApp: {
      fr: 'Lancer la Démo & Accéder à l\'Application',
      ar: 'بدء العرض التوضيحي ودخول التطبيق',
      en: 'Launch Demo & Access Application',
    },
    scenariosTitle: {
      fr: 'Simulation Télématique de Scénarios Nationaux',
      ar: 'محاكاة البيانات اللاسلكية للمسارات الوطنية',
      en: 'National Telemetry & Environmental Scenario Simulation',
    },
    scenariosSubtitle: {
      fr: 'Sélectionnez un profil opérationnel pour voir comment notre moteur décisionnel s\'ajuste dynamiquement en temps réel.',
      ar: 'اختر ملفاً تشغيلياً لتشاهد كيف تتكيف خوارزميات القرار لدينا ديناميكياً في الوقت الفعلي.',
      en: 'Select an operational scenario profile to observe how our decision engine recalibrates live.',
    },
    rulesTitle: {
      fr: 'Les 7 Règles d\'Or de Notre Moteur de Décision',
      ar: 'القواعد السبع الذهبية لمحرك اتخاذ القرار',
      en: 'The 7 Golden Rules of Our Decision Engine',
    },
    rulesSubtitle: {
      fr: 'Des formules mathématiques strictes et immuables intégrées au coeur du code pour automatiser la sécurité, l\'inventaire et le budget.',
      ar: 'صيغ رياضية صارمة وغير قابلة للتغيير مدمجة في صلب النظام لأتمتة السلامة والمخزون والميزانية.',
      en: 'Strict, immutable mathematical formulas embedded into core modules to automate dispatch, parts allocation, and financial tracking.',
    },
    algeriaTitle: {
      fr: 'Une Solution Souveraine pour les Défis Algériens',
      ar: 'حل سيادي مصمم لرفع التحديات اللوجستية في الجزائر',
      en: 'A Sovereign Solution Built for Algerian Logistical Context',
    },
    algeriaSubtitle: {
      fr: 'Pensée pour les infrastructures locales, les réseaux de télécommunication nationaux et les conditions physiques du territoire.',
      ar: 'مصممة خصيصاً للبنية التحتية المحلية، وشبكات الاتصالات الوطنية، وظروف الطرق والطقس الوطنية.',
      en: 'Engineered specifically for local transportation infrastructure, national telecom bands, and diverse geographic climates.',
    },
    roiTitle: {
      fr: 'Calculateur de Rentabilité Réel (DZD)',
      ar: 'حاسبة العائد على الاستثمار الفعلي (بالدينار الجزائري)',
      en: 'Dynamic ROI & Savings Calculator (DZD)',
    },
    roiSubtitle: {
      fr: 'Estimez les économies immédiates générées par l\'intégration de NextTransit pour votre entreprise.',
      ar: 'قدّر الوفورات المالية الفورية التي ستحققها شركتك عند دمج نظام نيكس ترانزيت.',
      en: 'Estimate the immediate financial savings generated for your logistics firm using our engine.',
    },
    fleetSizeLabel: {
      fr: 'Nombre de véhicules dans le parc',
      ar: 'عدد المركبات في الأسطول',
      en: 'Active fleet size (number of trucks/vans)',
    },
    repairCostLabel: {
      fr: 'Coût moyen de maintenance / véhicule (DZD / mois)',
      ar: 'متوسط تكلفة الصيانة لكل مركبة (دج / شهر)',
      en: 'Average repair cost / vehicle (DZD / month)',
    },
    calcAnnualSavings: {
      fr: 'Économies Annuelles Estimées',
      ar: 'الوفورات السنوية المتوقعة',
      en: 'Estimated Annual Net Savings',
    },
    calcMonthlyCurrent: {
      fr: 'Dépenses actuelles mensuelles',
      ar: 'المصروفات الشهرية الحالية',
      en: 'Current Monthly Expenditure',
    },
    calcBreakdownsPrevented: {
      fr: 'Pannes critiques évitées par an',
      ar: 'أعطال حرجة تم تفاديها سنوياً',
      en: 'Critical Breakdowns Avoided / Year',
    },
    calcTitle: {
      fr: 'Résultats de la simulation d\'impact',
      ar: 'نتائج محاكاة الأثر المالي',
      en: 'Financial Impact Simulation Results',
    },
  };

  const currentT = (key: string): string => {
    const lang = (currentLanguage === 'fr' || currentLanguage === 'ar' || currentLanguage === 'en') ? currentLanguage : 'fr';
    return dictionary[key]?.[lang] || dictionary[key]?.fr || key;
  };

  // Simulated WhatsApp submission
  const handleWhatsAppSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsAppText.trim()) return;

    const userMsg = whatsAppText;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const updatedHistory = [...chatHistory, { sender: 'user' as const, text: userMsg, time: timeStr }];
    setChatHistory(updatedHistory);
    setWhatsAppText('');

    // Generate responsive simulated reply
    setTimeout(() => {
      let reply = '';
      const textLower = userMsg.toLowerCase();
      if (textLower.includes('prix') || textLower.includes('tarif') || textLower.includes('سعر') || textLower.includes('تكلفة')) {
        reply = currentLanguage === 'ar'
          ? 'لا نعرض شبكة أسعار عامة حالياً — تعتمد تكلفة الاشتراك على حجم أسطولكم. هل ترغبون في أن يُعدّ لكم مستشارنا عرض سعر مخصص؟'
          : 'Nous n\'affichons pas de grille tarifaire publique pour le moment — nos tarifs dépendent de la taille de votre flotte. Souhaitez-vous qu\'un conseiller vous prépare un devis personnalisé ?';
      } else if (textLower.includes('heberg') || textLower.includes('donnee') || textLower.includes('سيرفر') || textLower.includes('بيانات')) {
        reply = currentLanguage === 'ar'
          ? 'بيئتنا الحالية تعتمد على استضافة سحابية آمنة (نشر تجريبي/عرض توضيحي). الاستضافة المحلية السيادية داخل الجزائر قيد التطوير على خارطة طريقنا لعملائنا المستقبليين الكبار.'
          : 'Notre environnement actuel s\'appuie sur un hébergement cloud sécurisé (déploiement pilote/démo). L\'hébergement souverain local en Algérie (On-Premise) est en cours de développement sur notre feuille de route pour nos futurs grands comptes.';
      } else {
        reply = currentLanguage === 'ar'
          ? 'شكراً لتواصلك! لقد تلقينا استفسارك وسيقوم أحد مهندسي النقل لدينا بالاتصال بك قريباً جداً لتوضيح التفاصيل.'
          : 'Merci pour votre message ! Un conseiller NextTransit spécialisé dans votre secteur va vous recontacte très rapidement par téléphone.';
      }
      setChatHistory(prev => [...prev, { sender: 'agent' as const, text: reply, time: timeStr }]);
    }, 1200);
  };

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 bg-ink text-white space-y-16 pb-12 rounded-3xl min-h-screen">

      {/* LANDING PAGE HORIZONTAL HEADER MENU */}
      <header className="sticky top-0 z-50 w-full bg-ink-2/95 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ochre text-ink shadow-md font-bold">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white tracking-tight font-display">NextTransit</span>
              <span className="text-[9px] bg-ochre/20 text-ochre font-bold px-1.5 py-0.5 rounded ml-1.5 font-data">DZ</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 text-slate-doc hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Menu Navigation Links */}
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 w-full lg:w-auto`}>
          <nav className="flex flex-col lg:flex-row gap-2 lg:gap-5 font-semibold text-xs text-slate-doc">
            <button
              onClick={() => {
                document.getElementById('scenarios-simulation')?.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-ochre transition font-bold cursor-pointer"
            >
              {currentLanguage === 'ar' ? 'المحاكاة الإقليمية' : currentLanguage === 'en' ? 'Zone Simulator' : 'Simulateur'}
            </button>
            <button
              onClick={() => {
                document.getElementById('problems-solve')?.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-ochre transition font-bold cursor-pointer"
            >
              {currentLanguage === 'ar' ? 'المشكلات' : currentLanguage === 'en' ? 'Problems' : 'Problèmes'}
            </button>
            <button
              onClick={() => {
                document.getElementById('features-list')?.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-ochre transition font-bold cursor-pointer"
            >
              {currentLanguage === 'ar' ? 'الوحدات والمميزات' : currentLanguage === 'en' ? 'ERP Modules' : 'Modules ERP'}
            </button>
          </nav>

          <div className="flex flex-col sm:flex-row lg:items-center gap-3 pt-2 lg:pt-0 border-t border-white/10 lg:border-0">
            {/* Language Selector */}
            <LanguageSelector />

            {/* User Session Buttons */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-doc max-w-[120px] truncate" title={currentUser.email}>
                  {currentUser.email}
                </span>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 text-red-400" />
                  <span>{currentLanguage === 'ar' ? 'خروج' : currentLanguage === 'en' ? 'Log Out' : 'Déconnexion'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalIsSignUp(false);
                    setShowAuthModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 bg-white/5 text-white hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 text-ochre" />
                  <span>{currentLanguage === 'ar' ? 'دخول' : currentLanguage === 'en' ? 'Log In' : 'Connexion'}</span>
                </button>

                <button
                  onClick={() => {
                    setAuthModalIsSignUp(true);
                    setShowAuthModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-ochre/40 bg-ochre/20 text-ochre hover:bg-ochre/30 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{currentLanguage === 'ar' ? 'إنشاء حساب' : currentLanguage === 'en' ? 'Sign Up' : 'S\'enregistrer'}</span>
                </button>
              </div>
            )}

            {/* App Launch CTA */}
            <button
              onClick={() => {
                changeScreen('STRATEGIC_DASHBOARD');
                setIsMobileMenuOpen(false);
              }}
              className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-ochre text-ink text-xs font-bold transition-all cursor-pointer shadow-sm hover:bg-[#D68A4C]"
            >
              <span>{currentLanguage === 'ar' ? 'دخول التطبيق' : currentLanguage === 'en' ? 'Launch Operations' : 'Accéder à l\'App'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION WITH INTERACTIVE B2B SAAS SHOWCASE (GLOBAL VALUE PROPOSITION) */}
      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-gradient-to-br from-[#0B0F17] via-[#101726] to-[#0D111A] rounded-3xl border border-white/10 p-6 sm:p-10 lg:p-12 overflow-hidden relative shadow-2xl">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="lg:col-span-6 relative z-10 space-y-6">
          {/* Global Category Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-ochre/35 bg-ochre/10 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-data uppercase tracking-wider text-ochre shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-ochre"></span>
            </span>
            {currentLanguage === 'ar' 
              ? 'الذكاء التشغيلي للأسطول · الصيانة التنبؤية' 
              : currentLanguage === 'en' 
              ? 'Fleet Operational Intelligence · Predictive Maintenance' 
              : 'Intelligence Opérationnelle & Maintenance Prédictive'}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
            {currentLanguage === 'ar' 
              ? 'حُكْم تشغيلي ومالي ذكي يمنع الأعطال قبل حدوثها.' 
              : currentLanguage === 'en' 
              ? 'Predictive Maintenance & Fleet Operational Intelligence.' 
              : 'Intelligence Opérationnelle & Maintenance Prédictive de Flotte.'}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            {currentLanguage === 'ar' 
              ? 'تحويل التلمتري المباشرة وتأريض OBD إلى قرارات مالية مؤتمتة، حجز مخزون قطع الغيار، ومراقبة التكلفة الإجمالية للملكية في بيئة سحابية واحدة.' 
              : currentLanguage === 'en' 
              ? 'Transform raw telemetry and OBD diagnostics into automated financial decisions, stock reservation, and total cost optimization across enterprise fleets.' 
              : 'Transformez la télémétrie CAN et les diagnostics OBD en décisions financières automatisées, réservation de stock et optimisation du TCO pour flottes enterprise.'}
          </p>

          {/* Dual Action CTAs */}
          <div className="flex flex-wrap gap-3.5 pt-2">
            <button 
              onClick={() => changeScreen('STRATEGIC_DASHBOARD')} 
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-ochre to-amber-500 hover:from-amber-500 hover:to-ochre text-ink text-sm font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>{currentLanguage === 'ar' ? 'دخول التطبيق التفاعلي' : currentLanguage === 'en' ? 'Launch Operations Dashboard' : 'Découvrir la Plateforme'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Live demo CTA — real Supabase Auth login into the shared demo tenant (see
                src/config/demoAccount.ts). Credentials are intentionally public; the demo
                tenant is read-only at the database level regardless of who holds the JWT. */}
            <div className="flex flex-col gap-1.5">
              <button
                id="hero-try-demo-btn"
                onClick={handleTryLiveDemo}
                disabled={isDemoLoading}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-sm font-bold transition-all hover:scale-[1.02] cursor-pointer backdrop-blur-xs shadow-sm shadow-emerald-500/10 disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100"
              >
                {isDemoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span>
                  {isDemoLoading
                    ? (currentLanguage === 'ar' ? 'اتصال...' : currentLanguage === 'en' ? 'Signing in…' : 'Connexion…')
                    : currentLanguage === 'ar'
                    ? 'تجربة النظام مجاناً'
                    : currentLanguage === 'en'
                    ? 'Try Live Demo'
                    : 'Essayer la Démo en Direct'}
                </span>
              </button>
              <div className="flex items-center gap-1.5 px-1 text-[11px] text-white/50">
                <span className="font-mono">{DEMO_EMAIL} / {DEMO_PASSWORD}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(`${DEMO_EMAIL} / ${DEMO_PASSWORD}`)}
                  title={currentLanguage === 'en' ? 'Copy credentials' : 'Copier les identifiants'}
                  className="inline-flex items-center justify-center rounded p-0.5 hover:bg-white/10 hover:text-white/80 transition cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {demoLoginError && (
                <span className="px-1 text-[11px] text-red-300">{demoLoginError}</span>
              )}
            </div>

            <button
              onClick={() => setShowContactModal(true)} 
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 hover:border-white bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all cursor-pointer backdrop-blur-xs"
            >
              <Calendar className="h-4 w-4 text-ochre" />
              <span>{currentLanguage === 'ar' ? 'طلب عرض توضيحي' : currentLanguage === 'en' ? 'Request Enterprise Demo' : 'Demander une Démo Enterprise'}</span>
            </button>
          </div>

          {/* Highlights Footer */}
          <div className="flex flex-wrap items-center gap-6 text-[11px] text-slate-400 pt-3 border-t border-white/10">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /><strong className="font-data text-white">{currentLanguage === 'ar' ? 'عزلة كاملة للمؤسسات' : currentLanguage === 'en' ? 'Enterprise Multi-tenant' : 'Multi-Tenant Isolé'}</strong></span>
            <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-400" /><strong className="font-data text-white">{currentLanguage === 'ar' ? 'تحليل التكلفة الإجمالية TCO' : currentLanguage === 'en' ? 'TCO Analytics' : 'Analyse TCO & Coûts'}</strong></span>
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-ochre" /><strong className="font-data text-white">FR · AR · EN (RTL Native)</strong></span>
          </div>
        </div>

        {/* HERO RIGHT: WORLD-CLASS INTERACTIVE B2B SAAS APPLICATION CANVAS */}
        <div className="lg:col-span-6 relative z-10 bg-[#121824] rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col">
          {/* Window Header */}
          <div className="bg-[#0D121D] px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-[10px] font-data text-slate-400 ml-2">NextTransit Decision Core v2.4</span>
            </div>
            <span className="text-[10px] font-data bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-[#0B0F17] overflow-x-auto text-xs font-semibold scrollbar-none">
            {[
              { id: 'cae', label: currentLanguage === 'ar' ? 'تحكيم CAE' : currentLanguage === 'en' ? 'CAE Decision' : 'Fiche CAE', icon: Calculator },
              { id: 'obd', label: currentLanguage === 'ar' ? 'أكواد OBD/CAN' : currentLanguage === 'en' ? 'OBD & J1939' : 'Diagnostic OBD/CAN', icon: Activity },
              { id: 'fuel', label: currentLanguage === 'ar' ? 'الوقود و R6' : currentLanguage === 'en' ? 'Fuel & R6 Audit' : 'Carburant & Audit R6', icon: Fuel },
              { id: 'ai', label: currentLanguage === 'ar' ? 'تنبؤ IA' : currentLanguage === 'en' ? 'Predictive AI' : 'Prédiction IA', icon: Sparkles },
            ].map(tab => {
              const Icon = tab.icon;
              const active = heroTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setHeroTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    active 
                      ? 'border-ochre text-ochre bg-white/5 font-bold' 
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-ochre' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel Content */}
          <div className="p-5 space-y-4 bg-[#121824] min-h-[280px]">
            {heroTab === 'cae' && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex justify-between items-start border-b border-white/10 pb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-data tracking-wider text-ochre font-bold block">
                      FICHE D'ARBITRAGE DE MAINTENANCE — RÉSOLU
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">Véhicule TM-14 (Mercedes Actros 3340) • Route C-3 (Atlas)</h4>
                  </div>
                  <span className="text-[10px] font-bold font-data bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                    Score R5: 94.8/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-data">Détection Capteur CAN</span>
                    <span className="text-white font-bold block">Usure plaquettes 91% (seuil 85%)</span>
                    <span className="text-[10px] text-amber-400 block">Probabilité de panne: 78% sous 6j</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-data">Pièces R3 Disponibles</span>
                    <span className="text-emerald-400 font-bold block">2 jeux Plaquettes Knorr en stock</span>
                    <span className="text-[10px] text-slate-400 block">Dépôt Central Alger-Sud</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Réparer Aujourd'hui</span>
                    <span className="text-lg font-black text-white font-data">18 500 DZD</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Différer 7 Jours</span>
                    <span className="text-lg font-extrabold text-red-400 font-data">1 240 000 DZD</span>
                  </div>
                </div>

                <div className="bg-ochre/15 border border-ochre/30 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-ochre" />
                    Recommandation Moteur R5: <strong className="text-ochre">Intervention Immédiate Approuvée</strong>
                  </span>
                  <button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="text-[10px] bg-ochre hover:bg-amber-500 text-ink font-bold px-2.5 py-1 rounded transition cursor-pointer">
                    Exécuter Bon d'OT →
                  </button>
                </div>
              </div>
            )}

            {heroTab === 'obd' && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-data text-ochre font-bold block">
                      DECODER TELTONIKA CAN-RAW (SAE J1939)
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">Boîtier Teltonika FMC650 • Codec 8Extended</h4>
                  </div>
                  <span className="text-[10px] font-bold font-data bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded animate-pulse">
                    R1 CRITICAL
                  </span>
                </div>

                <div className="p-3 bg-black/40 rounded-xl font-mono text-[11px] text-slate-300 border border-white/10 space-y-1">
                  <div className="text-slate-500">// Direct SPN/FMI Translation</div>
                  <div><span className="text-ochre">DTC_ACTIVE:</span> SPN 520193 / FMI 7</div>
                  <div><span className="text-ochre">LABEL:</span> Brake Air Circuit Pressure Imbalance</div>
                  <div><span className="text-ochre">WARRANTY_CHECK:</span> <span className="text-emerald-400 font-bold">Couverture Garantie Constructeur Mercedes (Valide jusqu'au 15/12/2026)</span></div>
                </div>

                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block">Action R1 Règle de Sécurité:</span>
                      <span className="text-slate-300 text-[11px]">Véhicule retiré automatiquement des départs du 07/08</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-red-400 font-data border border-red-500/40 px-2 py-1 rounded">UNSAFE / RED</span>
                </div>
              </div>
            )}

            {heroTab === 'fuel' && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-data text-emerald-400 font-bold block">
                      ANOMALIE DE CARBURANT & RAPPROCHEMENT R6
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">Tracteur FL-08 (Renault Kerax 440) • Axe Hassi Messaoud</h4>
                  </div>
                  <span className="text-[10px] font-bold font-data bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded">
                    Audit R6 Ouvert
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-data">Consommation Relevée</span>
                    <span className="text-amber-400 font-bold text-sm block">58,2 L / 100km</span>
                    <span className="text-[10px] text-red-400 block">+17,2 L/100km vs Moyenne Flotte</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-data">Ecart Financier DZD</span>
                    <span className="text-white font-bold text-sm block">-12 600 DZD</span>
                    <span className="text-[10px] text-emerald-400 block">Surconsommation tracée sur 420km</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-amber-300">
                    <span>Enquête R6: Incident Chauffeur non-OBD</span>
                    <span className="font-data text-[10px]">Réf #R6-2026-88</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Saisie Chauffeur "Perte de puissance en montée" sans code électronique OBD. Bon d'inspection mécanique R6 généré.
                  </p>
                </div>
              </div>
            )}

            {heroTab === 'ai' && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-data text-estime font-bold block flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-estime" />
                      APERÇU CONCEPT · PHASE 3 ROADMAP
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">Prévision d'Usure Saharienne (Climat Extrême & Poussière)</h4>
                  </div>
                  <span className="text-[10px] font-bold font-data bg-estime/20 text-estime border border-estime/40 px-2 py-0.5 rounded">
                    Non actif en production
                  </span>
                </div>

                <div className="p-3 bg-estime/10 border border-estime/30 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-estime">Illustration de la Phase 3 (analyse prédictive) :</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Une fois les données terrain accumulées, ce module visera à anticiper, sur la base de l'exposition prolongée au sable et à la chaleur, le colmatage critique d'un filtre à air avant qu'il ne survienne.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-data">Maintenance Préventive Suggérée (exemple)</span>
                    <span className="text-white font-bold">Changement Filtre à Air & Vidange Synthétique</span>
                  </div>
                  <button onClick={() => document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 rounded bg-ochre hover:bg-amber-400 text-ink font-bold text-[10px] cursor-pointer">
                    Découvrir la Roadmap
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1B. IMPACT METRICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
        <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-data uppercase tracking-wider text-slate-400">Réduction Coûts Immobilisation</span>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-data tracking-tight">-18.4%</span>
          </div>
          <span className="text-[10px] text-slate-400">Objectif modélisé par notre moteur de règles</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-data uppercase tracking-wider text-slate-400">Pistes d'Audit & Conformité SCF</span>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-black text-ochre font-data tracking-tight">100%</span>
          </div>
          <span className="text-[10px] text-slate-400">Inaltérable & Traçabilité Garantie</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-data uppercase tracking-wider text-slate-400">Pipeline d'Ingestion Télémétrie</span>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-black text-ochre font-data tracking-tight">Async</span>
          </div>
          <span className="text-[10px] text-slate-400">File d'attente Redis + BullMQ</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-data uppercase tracking-wider text-slate-400">Modules ERP Flotte Interconnectés</span>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-data tracking-tight">15</span>
          </div>
          <span className="text-[10px] text-slate-400">Attribution rôle par rôle (RBAC)</span>
        </div>
      </div>

      {/* 2. TRUST SECTION */}
      <LogosSection currentLanguage={currentLanguage} />

      {/* 3. PROBLEMS WE SOLVE */}
      <div id="problems-solve">
        <ProblemsSection currentLanguage={currentLanguage} />
      </div>

      {/* 4. DYNAMIC LIVE ENVIRONMENT SCENARIO SIMULATOR (KPI HIGHLIGHTS) */}
      <div id="scenarios-simulation" className="space-y-6">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <span className="text-[10px] uppercase text-ochre font-extrabold tracking-wider block">
            {currentLanguage === 'ar' ? 'تتبع فوري ومحاكاة' : currentLanguage === 'en' ? 'GEOGRAPHIC REALITY' : 'CONSEILS D\'ÉCONOMIE TERRITORIALE'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Activity className="h-5 w-5 text-ochre" />
            {currentT('scenariosTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-doc">
            {currentT('scenariosSubtitle')}
          </p>
        </div>

        {/* Tab Scenario selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActiveScenarioId(sc.id)}
              className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                activeScenarioId === sc.id
                  ? 'border-ochre bg-ochre/10 shadow-xs'
                  : 'border-white/10 bg-ink-2 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-bold text-ochre uppercase tracking-wide">
                  {sc.id === 'sahara' ? 'Zone Sud' : sc.id === 'atlas' ? 'Zone Nord' : 'Zone Urbaine'}
                </span>
                {activeScenarioId === sc.id && (
                  <CheckCircle2 className="h-4 w-4 text-ochre" />
                )}
              </div>
              <h3 className="text-xs font-bold text-white">
                {sc.name[currentLanguage as 'fr'|'ar'|'en'] || sc.name.fr}
              </h3>
              <p className="text-[11px] text-slate-doc leading-normal">
                {sc.region[currentLanguage as 'fr'|'ar'|'en'] || sc.region.fr}
              </p>
            </button>
          ))}
        </div>

        {/* Live Scenario Telemetry & Decision KPI Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-3xl border border-white/10 bg-ink-2 p-6 shadow-xs relative">

          {/* Active scenario description */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="h-3.5 w-3.5" />
                NextTransit Diagnostic Mode
              </span>
              <h4 className="text-sm font-bold text-white leading-snug">
                {activeScenario.name[currentLanguage as 'fr'|'ar'|'en'] || activeScenario.name.fr}
              </h4>
              <p className="text-xs text-slate-doc leading-relaxed">
                {activeScenario.description[currentLanguage as 'fr'|'ar'|'en'] || activeScenario.description.fr}
              </p>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-slate-doc-2 uppercase tracking-wider block">
                {currentLanguage === 'ar' ? 'شبكة التتبع المتصلة' : currentLanguage === 'en' ? 'Active Network Stream' : 'Flux Réseau Actif'}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-doc">
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                {activeScenarioId === 'sahara'
                  ? 'Mobilis / Djezzy Edge Compression'
                  : activeScenarioId === 'atlas'
                    ? 'Multi-SIM Redundant (3G/4G Atlas)'
                    : 'Alger Center 4G - Ultra High Frequency'}
              </div>
            </div>
          </div>

          {/* Core Decision KPIs */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-doc-2 uppercase tracking-wider">
                {currentLanguage === 'ar' ? 'جاهزية الأسطول' : currentLanguage === 'en' ? 'Fleet Availability' : 'Disponibilité Flotte'}
              </span>
              <div className="my-2">
                <span className="text-3xl font-black text-white tracking-tight">
                  {activeScenario.operationalEfficiency}%
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {currentLanguage === 'ar' ? 'فوق حد الأمان' : currentLanguage === 'en' ? 'Above Target limit' : 'Supérieur à l\'objectif'}
              </div>
            </div>

            {/* KPI 2 */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-doc-2 uppercase tracking-wider">
                {currentLanguage === 'ar' ? 'الإنفاق الشهري المقدر' : currentLanguage === 'en' ? 'Simulated Monthly Expense' : 'Dépense Mensuelle Estimée'}
              </span>
              <div className="my-2">
                <span className="text-xl font-extrabold text-white tracking-tight">
                  {activeScenario.monthlyExpenditure.toLocaleString()} DA
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-ochre">
                <Scale className="h-3 w-3" />
                {currentLanguage === 'ar' ? 'ضمن ميزانية الإقليم' : currentLanguage === 'en' ? 'Within territorial budget' : 'Inclus dans le budget territorial'}
              </div>
            </div>

            {/* KPI 3 */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-doc-2 uppercase tracking-wider">
                {currentLanguage === 'ar' ? 'الحوادث الحرجة' : currentLanguage === 'en' ? 'Critical Faults' : 'Défauts Critiques'}
              </span>
              <div className="my-2">
                <span className={`text-3xl font-black tracking-tight ${activeScenario.criticalBreakdowns > 0 ? 'text-estime' : 'text-white'}`}>
                  {activeScenario.criticalBreakdowns}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-doc-2">
                {activeScenario.criticalBreakdowns > 0
                  ? (currentLanguage === 'ar' ? 'تحتاج تدخل طارئ' : currentLanguage === 'en' ? 'Emergency intervention' : 'Intervention urgente requise')
                  : (currentLanguage === 'ar' ? 'أمان تام' : currentLanguage === 'en' ? 'Zero hazards detected' : 'Aucun danger détecté')}
              </div>
            </div>

            {/* KPI 4 */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-doc-2 uppercase tracking-wider">
                {currentLanguage === 'ar' ? 'مطابقة التقرير (R6)' : currentLanguage === 'en' ? 'R6 Reconciliation Cases' : 'Cas de Réconciliation R6'}
              </span>
              <div className="my-2">
                <span className={`text-3xl font-black tracking-tight ${activeScenario.unreconciledIncidents > 0 ? 'text-danger-doc' : 'text-white'}`}>
                  {activeScenario.unreconciledIncidents}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-doc-2">
                {activeScenario.unreconciledIncidents > 0
                  ? (currentLanguage === 'ar' ? 'تحقيقات مفتوحة للفرامل' : currentLanguage === 'en' ? 'Open audit investigations' : 'Enquêtes mécaniques ouvertes')
                  : (currentLanguage === 'ar' ? 'متطابق كلياً' : currentLanguage === 'en' ? '100% telemetry synced' : 'Télémétrie 100% alignée')}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 5. FEATURES BREAKDOWN (15 SAAS MODULES) */}
      <div id="features-list">
        <FeaturesSection 
          currentLanguage={currentLanguage} 
          onExploreDemo={() => changeScreen('STRATEGIC_DASHBOARD')} 
        />
      </div>

      {/* 6. INDUSTRIES SECTION */}
      <IndustriesSection currentLanguage={currentLanguage} />

      {/* 7. INTERACTIVE PRODUCT WORKFLOW SIMULATOR */}
      <DemoSection currentLanguage={currentLanguage} />

      {/* 8. DETERMINISTIC DECISION ENGINE SHOWCASE */}
      <div className="rounded-3xl border border-ochre/40 bg-ink-3 text-white p-6 sm:p-8 lg:p-12 relative overflow-hidden shadow-xl space-y-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-ochre/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

        <div className="space-y-3 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-ochre/20 text-ochre px-3 py-1 rounded-full">
            <Zap className="h-3 w-3 text-ochre" />
            NextTransit Decision Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {currentLanguage === 'ar' ? 'محرك قرار حتمي وشفاف وقابل للتدقيق' : currentLanguage === 'en' ? 'A Deterministic, Transparent, Auditable Decision Engine' : 'Un Moteur de Décision Déterministe, Transparent et Vérifiable'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            {currentLanguage === 'ar' 
              ? 'كل توصية تعتمد على قواعد واضحة وقابلة للتدقيق بدون صندوق أسود. المرحلة 2 (الموديلات الإحصائية) والمرحلة 3 (تعلم الآلة) تأتي بعد تجميع بيانات الإنتاج.'
              : currentLanguage === 'en'
              ? 'Every recommendation is based on clear, auditable métier rules with no black box. Phase 2 (statistical models) and Phase 3 (machine learning) arrive once production data is gathered.'
              : 'Chaque recommandation est basée sur des règles claires auditables et sans boîte noire. La phase 2 (modèles statistiques) et la phase 3 (machine learning) arrivent une fois les données de production collectées.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          
          {/* Feature 1 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ochre/20 text-ochre">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">
              {currentLanguage === 'ar' ? 'تقارير تنفيذية حتمية' : currentLanguage === 'en' ? 'Deterministic Executive Reports' : 'Rapports Exécutifs Déterministes'}
            </h4>
            <p className="text-[11px] text-slate-doc leading-normal">
              {currentLanguage === 'ar' ? 'ملخص دقيق للميزانيات وحساب الفروقات التشغيلية عبر محرك القواعد métier.' : currentLanguage === 'en' ? 'Generates clear summaries of budget variances and operational bottlenecks calculated via métier rules engine.' : 'Génère un résumé clair des variations budgétaires et des goulots d\'étranglement calculé par le moteur de règles métier.'}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ochre/20 text-ochre">
              <Wrench className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">
              {currentLanguage === 'ar' ? 'حساب وقائي للتآكل' : currentLanguage === 'en' ? 'Predictive Wear Calculation' : 'Calcul Prédictif d\'Usure'}
            </h4>
            <p className="text-[11px] text-slate-doc leading-normal">
              {currentLanguage === 'ar' ? 'حساب معدل تآكل الزيوت والفلاتر بناءً على قواعد تشغيلية صحراوية.' : currentLanguage === 'en' ? 'Calculates oil and filter degradation rates based on business rules for desert and climate exposure.' : 'Calcule le niveau de dégradation des lubrifiants selon des règles métier d\'exposition au sable et au climat.'}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ochre/20 text-ochre">
              <Globe className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">
              {currentLanguage === 'ar' ? 'ترجمة وتوحيد المصطلحات الفنية' : currentLanguage === 'en' ? 'Technical Translation & Standard' : 'Traduction Technique & Normalisation'}
            </h4>
            <p className="text-[11px] text-slate-doc leading-normal">
              {currentLanguage === 'ar' ? 'ترجمة وتوحيد التقارير الفنية المكتوبة بالعامية أو الفرنسية إلى لغات النظام.' : currentLanguage === 'en' ? 'Translates and normalizes driver fault logs between dialectal Arabic and technical French into standard codes.' : 'Traduite et normalise automatiquement les notes de panne rédigées en arabe dialectal ou français technique vers le référentiel métier.'}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ochre/20 text-ochre">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">
              {currentLanguage === 'ar' ? 'توصيات الشراء المؤتمتة' : currentLanguage === 'en' ? 'Automated Procurement Rules' : 'Recommandations d\'Achat Automatisées'}
            </h4>
            <p className="text-[11px] text-slate-doc leading-normal">
              {currentLanguage === 'ar' ? 'كشف انخفاض المباشر للمخزون واستخراج الفروقات السعرية لتفعيل أمر الشراء R3.' : currentLanguage === 'en' ? 'Detects inventory buffer breaches and price variance against benchmark rates to trigger automated R3 purchase orders.' : 'Détecte les dépassements de seuil de stock et les écarts de prix par rapport au barème de référence pour déclencher le réapprovisionnement R3.'}
            </p>
          </div>

        </div>
      </div>

      {/* 9. WHY CHOOSE US (SaaS vs LEGACY DESKTOP ERP vs MANUAL PAPER) */}
      <div className="rounded-3xl border border-white/10 bg-ink-2 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-[10px] uppercase text-ochre font-extrabold tracking-wider block">
              {currentLanguage === 'ar' ? 'لماذا تختار منصتنا؟' : currentLanguage === 'en' ? 'PROVEN VALUE' : 'NOTRE PROPOSITION DE VALEUR'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {currentLanguage === 'ar' ? 'أكثر من مجرد برنامج تتبع - نظام ذكاء مالي وتشغيلي متكامل' : currentLanguage === 'en' ? 'A Sovereign Decision Engine Built for Total Fiscal Control' : 'Un ERP qui automatise l\'audit de votre rentabilité'}
            </h3>
            <p className="text-sm text-slate-doc leading-relaxed">
              {currentLanguage === 'ar' ? 'تجمع منصتنا بين المحاسبة المتوافقة مع الـ SCF، تتبع المركبات، إدارة المخزن وصيانة الورشة في مكان واحد معتمد ومطابق للقوانين الضريبية الجزائرية.' : currentLanguage === 'en' ? 'We sync workshop workflows, parts inventory, state CNAS payroll and fuel metrics into one single database conforming to Algerian legal audits.' : 'NextTransit réconcilie en direct l\'usure réelle de vos pneus ou moteurs avec l\'état des stocks de pièces détachées et les finances.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="h-2 w-2 rounded-full bg-ochre shrink-0" />
              <span className="text-xs font-bold text-white">{currentLanguage === 'ar' ? 'توافق كامل مع المخطط الوطني للمحاسبة SCF' : currentLanguage === 'en' ? 'Full Compatibility with Algerian SCF Guidelines' : 'Imputation comptable automatisée aux normes SCF'}</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="h-2 w-2 rounded-full bg-ochre shrink-0" />
              <span className="text-xs font-bold text-white">{currentLanguage === 'ar' ? 'استضافة سيادية محلية — قيد التطوير لعملائنا المستقبليين في القطاع العام' : currentLanguage === 'en' ? 'Sovereign local hosting — under active deployment for future public-sector clients' : 'Hébergement souverain local — en cours de déploiement pour nos futurs clients étatiques'}</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="h-2 w-2 rounded-full bg-ochre shrink-0" />
              <span className="text-xs font-bold text-white">{currentLanguage === 'ar' ? 'تطبيق صارم للقواعد الرياضية métier لتنظيم العمليات' : currentLanguage === 'en' ? 'Mathematical Enforcement of strict métier Rules' : 'Respect mathématique des règles métier'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9b. ADVANCED ROI CALCULATOR COMPONENT */}
      {/* Fallback is sized to roughly match the real component (heading + 12-col grid of
          sliders/outputs/chart) so the lazy chunk resolving doesn't snap the rest of the page
          down by several hundred pixels once it loads. */}
      <Suspense fallback={<div className="min-h-[820px] rounded-3xl bg-white/5 animate-pulse" />}>
        <RoiCalculator
          currentLanguage={currentLanguage} 
          onExploreDemo={() => changeScreen('STRATEGIC_DASHBOARD')} 
        />
      </Suspense>

      {/* 10. COMPARISON MATRIX (EXCEL vs LEGACY ERP vs NEXTTRANSIT) */}
      <ComparisonSection currentLanguage={currentLanguage} />

      {/* 11. PILOT PROGRAM (REPLACES TESTIMONIALS) */}
      <div className="space-y-8 py-4">
        <div className="space-y-3 text-center max-w-3xl mx-auto">
          <span className="text-[10px] uppercase text-ochre font-extrabold tracking-wider bg-ochre/10 border border-ochre/30 px-3 py-1 rounded-full inline-block">
            {currentLanguage === 'ar' ? 'البرنامج التجريبي - المرحلة 0' : currentLanguage === 'en' ? 'PHASE 0 PILOT PROGRAM' : 'PROGRAMME PILOTE PHASE 0'}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {currentLanguage === 'ar' ? 'انضم إلى برنامجنا التجريبي' : currentLanguage === 'en' ? 'Join Our Pilot Program' : 'Rejoignez notre programme pilote'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-doc leading-relaxed font-normal">
            {currentLanguage === 'ar'
              ? 'نيكست ترانزيت في مرحلة الإطلاق. أول 3 أساطيل تنضم إلى البرنامج التجريبي تستفيد من تجربة مجانية لمدة 30 يومًا على بياناتها الخاصة، مع هدف تعاقدي لتقليل تكاليف التوقف بنسبة 15%.'
              : currentLanguage === 'en'
              ? 'NextTransit is in launch phase. The first 3 fleets joining the pilot program get a free 30-day POC on their own data, with a contractual target of -15% downtime costs.'
              : 'NextTransit est en phase de lancement. Les 3 premières flottes qui rejoignent le programme pilote bénéficient d\'un POC gratuit de 30 jours sur leurs propres données, avec un objectif contractualisé de -15% de coûts d\'immobilisation.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1 */}
          <div className="bg-ink-2 border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-ochre/40 transition-all">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-ochre uppercase tracking-wider block">
                {currentLanguage === 'ar' ? '1. تدقيق سريع' : currentLanguage === 'en' ? '1. Overnight Audit' : '1. Audit Overnight'}
              </span>
              <h3 className="text-sm font-extrabold text-white">
                {currentLanguage === 'ar' ? 'أرسل ملف إكسل الخاص بك الليلة' : currentLanguage === 'en' ? 'Send your Excel export tonight' : 'Envoyez votre export Excel ce soir'}
              </h3>
              <p className="text-xs text-slate-doc leading-relaxed">
                {currentLanguage === 'ar' ? 'تحليل ليلي، وتقرير تفصيلي خلال 24 ساعة.' : currentLanguage === 'en' ? 'Overnight analysis, full report within 24h.' : 'Analyse overnight, rapport sous 24h.'}
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center gap-2 text-[11px] font-semibold text-ochre">
              <CheckCircle2 className="h-4 w-4" />
              <span>{currentLanguage === 'ar' ? 'رأي فوري' : currentLanguage === 'en' ? 'Instant insights' : 'Diagnostic rapide'}</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-ink-2 border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-ochre/40 transition-all">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-ochre uppercase tracking-wider block">
                {currentLanguage === 'ar' ? '2. عرض مخصص' : currentLanguage === 'en' ? '2. Custom Demo' : '2. Démo Sur-Mesure'}
              </span>
              <h3 className="text-sm font-extrabold text-white">
                {currentLanguage === 'ar' ? 'عرض توضيحي على بياناتك الخاصة' : currentLanguage === 'en' ? 'Demo on your own data' : 'Démo sur vos propres données'}
              </h3>
              <p className="text-xs text-slate-doc leading-relaxed">
                {currentLanguage === 'ar' ? 'بدون بيانات وهمية، أسطولك الحقيقي ومساراتك.' : currentLanguage === 'en' ? 'No dummy data, your actual fleet and routes.' : 'Pas de données fictives, votre flotte réelle.'}
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center gap-2 text-[11px] font-semibold text-ochre">
              <CheckCircle2 className="h-4 w-4" />
              <span>{currentLanguage === 'ar' ? 'بيانات حقيقية' : currentLanguage === 'en' ? 'Real data' : 'Souveraineté des données'}</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-ink-2 border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-ochre/40 transition-all">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-ochre uppercase tracking-wider block">
                {currentLanguage === 'ar' ? '3. تجربة معتمدة' : currentLanguage === 'en' ? '3. Contracted POC' : '3. POC Contractualisé'}
              </span>
              <h3 className="text-sm font-extrabold text-white">
                {currentLanguage === 'ar' ? 'تجربة مجانية لمدة 30 يومًا' : currentLanguage === 'en' ? 'Free 30-day POC' : 'POC 30 jours gratuit'}
              </h3>
              <p className="text-xs text-slate-doc leading-relaxed">
                {currentLanguage === 'ar' ? '10 مركبات، هدف خفض تكاليف التوقف بنسبة 15%.' : currentLanguage === 'en' ? '10 vehicles, target -15% downtime costs.' : '10 véhicules, objectif -15% coûts d\'immobilisation.'}
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{currentLanguage === 'ar' ? 'مردود مضمون' : currentLanguage === 'en' ? 'Target guaranteed' : 'Objectif mesurable'}</span>
            </div>
          </div>

        </div>

        {/* CTA Button */}
        <div className="text-center pt-2">
          <button
            onClick={() => setShowContactModal(true)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all cursor-pointer"
          >
            <Calendar className="h-4.5 w-4.5 text-white" />
            <span>
              {currentLanguage === 'ar' ? 'انضم إلى البرنامج التجريبي (POC مجاني)' : currentLanguage === 'en' ? 'Join the Pilot Program (Free POC)' : 'Rejoindre le Programme Pilote (POC Gratuit)'}
            </span>
            <ArrowRight className={`h-4 w-4 transform ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 12b. ROADMAP SECTION */}
      <div id="roadmap">
        <RoadmapSection currentLanguage={currentLanguage} />
      </div>

      {/* 13. FAQ ACCORDION SECTION (ADDRESS OBJECTIONS) */}
      <FaqSection currentLanguage={currentLanguage} />

      {/* 14. FINAL CALL TO ACTION BOX */}
      <div className="rounded-3xl border border-ochre/30 bg-gradient-to-br from-ink-3 to-ink text-white p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#2A2015_1px,transparent_1px),linear-gradient(to_bottom,#2A2015_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
            {currentLanguage === 'ar' ? 'ابدأ في التحكم في كل دينار من ميزانية صيانة أسطولك اليوم' : currentLanguage === 'en' ? 'Take Absolute Fiscal Control Over Every Single Maintenance Dinar' : 'Prenez le contrôle de chaque dinar de maintenance dès aujourd\'hui'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-doc max-w-xl mx-auto">
            {currentLanguage === 'ar' ? 'انضموا إلى برنامجنا التجريبي واستخدموا نيكس ترانزيت لتفادي الأعطال، خفض نفقات قطع الغيار، ومطابقة المحاسبة SCF.' : currentLanguage === 'en' ? 'Deploy predictive métier rules and optimize stock reservation to boost your bottom line.' : 'Instaurez les règles d\'or de maintenance métier et automatisez le suivi de vos ateliers.'}
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center justify-center pt-2">
          <button
            onClick={() => changeScreen('STRATEGIC_DASHBOARD')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-ochre hover:bg-amber-400 text-ink text-xs font-bold shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
          >
            <span>{currentLanguage === 'ar' ? 'دخول التطبيق التوضيحي' : currentLanguage === 'en' ? 'Launch demo workspace' : 'Lancer la démonstration'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowContactModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-ochre" />
            <span>{currentLanguage === 'ar' ? 'احجز مكالمة فنية مجانية' : currentLanguage === 'en' ? 'Schedule Private Consultation' : 'Prendre rendez-vous expert'}</span>
          </button>
        </div>

        <div className="relative z-10 pt-4 flex items-center justify-center gap-6 text-[10px] text-slate-doc font-medium">
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            {currentLanguage === 'ar' ? 'لا تتطلب بطاقة ائتمان' : 'Sans carte de crédit'}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            {currentLanguage === 'ar' ? 'مطابق لـ SCF بنسبة 100%' : '100% Conforme SCF'}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            {currentLanguage === 'ar' ? 'تجربة مجانية (POC) لمدة 30 يوماً' : currentLanguage === 'en' ? '30-day free POC' : 'POC gratuit de 30 jours'}
          </span>
        </div>
      </div>

      {/* 15. COMPREHENSIVE ENTERPRISE FOOTER */}
      <footer className="border-t border-white/10 pt-12 pb-6 space-y-10 text-xs text-slate-doc">

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">

          {/* Logo, pitch & address */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ochre text-ink shadow-xs">
                <Truck className="h-4.5 w-4.5" />
              </div>
              <span className="font-extrabold text-sm text-white tracking-tight">NextTransit ERP</span>
              <span className="text-[8px] bg-ochre/20 text-ochre font-bold px-1 rounded font-mono">DZ</span>
            </div>

            <p className="text-[11px] text-slate-doc leading-relaxed max-w-sm">
              {currentLanguage === 'ar'
                ? 'منصة تخطيط موارد المؤسسات المتكاملة لحساب ميزانية صيانة أساطيل النقل، الورشات الميكانيكية، وحجز قطع غيار السيارات والشاحنات بالجزائر.'
                : 'La plateforme de décision et ERP de référence en Algérie pour la réconciliation télématique de flotte, la gestion d\'atelier, les stocks R3 et la comptabilité analytique SCF.'}
            </p>

            <div className="space-y-1 text-[11px]">
              <span className="font-bold text-white block">NextTransit Algérie S.A.R.L.</span>
              <span className="flex items-center gap-1 text-slate-doc">
                <MapPin className="h-3.5 w-3.5 text-ochre shrink-0" />
                12, Rue Didouche Mourad, Alger Centre, Algérie
              </span>
              <span className="block text-slate-doc">Tél : +213 (0) 21 50 51 52 | E-mail : contact@nexttransit.dz</span>
            </div>
          </div>

          {/* Module Links */}
          <div className="space-y-3">
            <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">{currentLanguage === 'ar' ? 'الوحدات البرمجية' : 'Modules ERP'}</h5>
            <ul className="space-y-1.5 font-medium text-[11px]">
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Comptabilité SCF</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Gestion d\'Atelier </button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Stocks de Pièces R3</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Paie & DAS CNAS</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">BTP & Chantiers</button></li>
            </ul>
          </div>

          {/* Industry Links */}
          <div className="space-y-3">
            <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">{currentLanguage === 'ar' ? 'الحلول القطاعية' : 'Secteurs d\'Activité'}</h5>
            <ul className="space-y-1.5 font-medium text-[11px]">
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Bâtiment & Travaux Publics (BTP)</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Transport de Fret & Logistique</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Industries & Manufacturier</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Distribution de Grossistes</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-ochre transition text-left">Santé & Services</button></li>
            </ul>
          </div>

          {/* Legal / Sovereign validations */}
          <div className="space-y-3">
            <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">{currentLanguage === 'ar' ? 'السيادة والامتثال المالي' : 'Gouvernance & Paiement'}</h5>
            <div className="space-y-2 text-[10px]">
              <div className="p-2 bg-ochre/10 rounded-xl border border-ochre/30 text-ochre font-semibold leading-normal">
                {currentLanguage === 'ar' ? 'محاسبة منظمة وفق المرجع المحاسبي المالي الجزائري (SCF).' : 'Comptabilité structurée selon le référentiel SCF algérien.'}
              </div>
              <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-doc font-semibold leading-normal">
                {currentLanguage === 'ar' ? 'دفع آمن بالدينار الجزائري عبر التحويل المصرفي أو شيك بريدي (CCP).' : 'Facturation nationale en DZD, paiements acceptés par virement ou CCP.'}
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-doc-2">
          <span>NextTransit Premium Decision ERP Platform S.A.R.L. © 2026. {currentLanguage === 'ar' ? 'كل الحقوق محفوظة.' : 'Tous droits réservés.'}</span>
          <div className="flex gap-4 font-bold text-slate-doc">
            <a href="#" className="hover:text-ochre">{currentLanguage === 'ar' ? 'سياسة الخصوصية السيادية' : 'Confidentialité'}</a>
            <span>•</span>
            <a href="#" className="hover:text-ochre">{currentLanguage === 'ar' ? 'شروط الخدمة والاستخدام' : 'Conditions Générales'}</a>
            <span>•</span>
            <a href="#" className="hover:text-ochre">Algeria Security Center</a>
          </div>
        </div>

      </footer>

      {/* 16. THE MAGNIFICENT INTERACTIVE WHATSAPP FLOATING HELPER BUBBLE */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {isWhatsAppOpen ? (
          <div className="w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[380px] animate-in fade-in slide-in-from-bottom-6 duration-200">
            {/* Chat Header */}
            <div className="bg-emerald-600 p-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/30 flex items-center justify-center font-bold text-xs relative">
                  AM
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-400 border border-emerald-600 animate-pulse" />
                </div>
                <div>
                  <span className="font-bold text-xs block leading-tight">Amine • NextTransit</span>
                  <span className="text-[9px] text-emerald-100 flex items-center gap-1">
                    <span className="h-1 w-1 bg-green-200 rounded-full" />
                    {currentLanguage === 'ar' ? 'متصل الآن للإجابة' : 'En ligne - Conseiller Logistique'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsWhatsAppOpen(false)}
                className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat History Area */}
            <div className="flex-1 p-3 bg-slate-50 space-y-2 overflow-y-auto max-h-[240px] text-xs">
              {chatHistory.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div className={`p-2.5 rounded-2xl leading-normal ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleWhatsAppSend} className="p-2 border-t border-slate-100 flex gap-2 bg-white">
              <input
                type="text"
                value={whatsAppText}
                onChange={(e) => setWhatsAppText(e.target.value)}
                placeholder={currentLanguage === 'ar' ? 'اكتب سؤالك هنا...' : 'Posez votre question...'}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
              />
              <button 
                type="submit"
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="flex h-12 items-center gap-2 px-4 rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-500 transition-all cursor-pointer group"
          >
            <MessageSquare className="h-5 w-5 shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap block max-w-0 group-hover:max-w-[150px] overflow-hidden transition-all duration-300">
              {currentLanguage === 'ar' ? 'تحدث مع مستشار جزائري' : 'Discuter avec Amine'}
            </span>
          </button>
        )}
      </div>

      {/* Auth Modal Trigger */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} initialTab={authModalIsSignUp ? 'register' : 'login'} />
      )}

      {/* Live Calendar booking Modal */}
      {showContactModal && (
        <ContactModal 
          onClose={() => setShowContactModal(false)} 
          currentLanguage={currentLanguage} 
        />
      )}

    </div>
  );
};
