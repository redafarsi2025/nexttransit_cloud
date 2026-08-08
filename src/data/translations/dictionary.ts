import { TranslationRecord, LanguageInfo } from '../../types/localization';

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    dir: 'ltr',
    flag: '🇫🇷',
    isDefault: true,
    enabled: true,
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    flag: '🇩🇿',
    enabled: true,
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    flag: '🇬🇧',
    enabled: true,
  },
];

interface RawTranslationItem {
  key: string;
  namespace: string;
  fr: string;
  ar: string;
  en: string;
  description?: string;
}

const DICTIONARY_RAW_DATA: RawTranslationItem[] = [
  // ==========================================
  // COMMON NAMESPACE
  // ==========================================
  { key: 'common.save', namespace: 'common', fr: 'Enregistrer', ar: 'حفظ', en: 'Save' },
  { key: 'common.cancel', namespace: 'common', fr: 'Annuler', ar: 'إلغاء', en: 'Cancel' },
  { key: 'common.edit', namespace: 'common', fr: 'Modifier', ar: 'تعديل', en: 'Edit' },
  { key: 'common.delete', namespace: 'common', fr: 'Supprimer', ar: 'حذف', en: 'Delete' },
  { key: 'common.actions', namespace: 'common', fr: 'Actions', ar: 'الإجراءات', en: 'Actions' },
  { key: 'common.status', namespace: 'common', fr: 'Statut', ar: 'الحالة', en: 'Status' },
  { key: 'common.search', namespace: 'common', fr: 'Rechercher...', ar: 'بحث...', en: 'Search...' },
  { key: 'common.filter', namespace: 'common', fr: 'Filtrer', ar: 'تصفية', en: 'Filter' },
  { key: 'common.all', namespace: 'common', fr: 'Tous les éléments', ar: 'جميع العناصر', en: 'All items' },
  { key: 'common.close', namespace: 'common', fr: 'Fermer', ar: 'إغلاق', en: 'Close' },
  { key: 'common.refresh', namespace: 'common', fr: 'Actualiser', ar: 'تحديث', en: 'Refresh' },
  { key: 'common.export', namespace: 'common', fr: 'Exporter', ar: 'تصدير', en: 'Export' },
  { key: 'common.import', namespace: 'common', fr: 'Importer', ar: 'استيراد', en: 'Import' },
  { key: 'common.details', namespace: 'common', fr: 'Détails', ar: 'التفاصيل', en: 'Details' },
  { key: 'common.confirm', namespace: 'common', fr: 'Confirmer', ar: 'تأكيد', en: 'Confirm' },
  { key: 'common.back', namespace: 'common', fr: 'Retour', ar: 'عودة', en: 'Back' },
  { key: 'common.reset', namespace: 'common', fr: 'Réinitialiser', ar: 'إعادة ضبط', en: 'Reset' },
  { key: 'common.loading', namespace: 'common', fr: 'Chargement en cours...', ar: 'جاري التحميل...', en: 'Loading...' },
  { key: 'common.none', namespace: 'common', fr: 'Aucun', ar: 'لا يوجد', en: 'None' },
  { key: 'common.active', namespace: 'common', fr: 'Actif', ar: 'نشط', en: 'Active' },
  { key: 'common.inactive', namespace: 'common', fr: 'Inactif', ar: 'غير نشط', en: 'Inactive' },
  { key: 'common.welcome_user', namespace: 'common', fr: 'Bienvenue, {username} !', ar: 'مرحباً بك، {username}!', en: 'Welcome, {username}!' },
  { key: 'common.items_count', namespace: 'common', fr: '{count} élément(s) trouvé(s)', ar: 'تم العثور على {count} عنصر', en: '{count} item(s) found' },
  { key: 'common.success', namespace: 'common', fr: 'Opération réussie', ar: 'تمت العملية بنجاح', en: 'Operation successful' },
  { key: 'common.error', namespace: 'common', fr: 'Une erreur est survenue', ar: 'حدث خطأ في النظام', en: 'An error occurred' },
  { key: 'common.no_data', namespace: 'common', fr: 'Aucune donnée disponible', ar: 'لا توجد بيانات متاحة', en: 'No data available' },
  { key: 'common.view_details', namespace: 'common', fr: 'Voir les détails', ar: 'عرض التفاصيل', en: 'View Details' },
  { key: 'common.date', namespace: 'common', fr: 'Date', ar: 'التاريخ', en: 'Date' },
  { key: 'common.category', namespace: 'common', fr: 'Catégorie', ar: 'الفئة', en: 'Category' },
  { key: 'common.description', namespace: 'common', fr: 'Description', ar: 'الوصف', en: 'Description' },
  { key: 'common.type', namespace: 'common', fr: 'Type', ar: 'النوع', en: 'Type' },
  { key: 'common.notes', namespace: 'common', fr: 'Notes & Remarques', ar: 'الملاحظات', en: 'Notes' },
  { key: 'common.total', namespace: 'common', fr: 'Total', ar: 'الإجمالي', en: 'Total' },

  // ==========================================
  // TOPBAR NAMESPACE
  // ==========================================
  { key: 'topbar.subtitle', namespace: 'topbar', fr: '7 Vues par Rôle • 1 Modèle Partagé', ar: '7 واجهات حسب الأدوار • نموذج موحد', en: '7 Role-Based Views • 1 Shared Model' },
  { key: 'topbar.demo_scenarios', namespace: 'topbar', fr: 'Scénarios Démo (Golden Path A/B)', ar: 'مسارات العرض (Golden Path A/B)', en: 'Demo Scenarios (Golden Path A/B)' },
  { key: 'topbar.reset_data', namespace: 'topbar', fr: 'Réinitialiser', ar: 'إعادة ضبط البيانات', en: 'Reset Data' },
  { key: 'topbar.reset_tooltip', namespace: 'topbar', fr: 'Réinitialiser aux données de démonstration', ar: 'إعادة استعادة البيانات الأولية النظيفة', en: 'Reset to clean initial seed data' },
  { key: 'topbar.alerts', namespace: 'topbar', fr: 'Alertes & Notifications', ar: 'التنبيهات والإشعارات', en: 'Alerts & Notifications' },
  { key: 'topbar.active_role', namespace: 'topbar', fr: 'Rôle Actif (RBAC)', ar: 'الدور الحالي (RBAC)', en: 'Active Role (RBAC)' },
  { key: 'topbar.switch_role', namespace: 'topbar', fr: 'Changer de Rôle Utilisateur', ar: 'تغيير دور المستخدم', en: 'Switch User Role' },

  // ==========================================
  // NAVIGATION NAMESPACE
  // ==========================================
  { key: 'nav.strategic_dashboard', namespace: 'nav', fr: 'Tableau de Bord Stratégique', ar: 'لوحة القيادة الاستراتيجية', en: 'Strategic Dashboard' },
  { key: 'nav.strategic_desc', namespace: 'nav', fr: 'Indicateurs clés de direction & disponibilité flotte', ar: 'المؤشرات الرئيسية وتوفر الأسطول للمدير', en: 'Director KPI cards & fleet availability' },
  { key: 'nav.variance_dashboard', namespace: 'nav', fr: 'Écarts & Budgets', ar: 'تحليل الفروقات والميزانية', en: 'Variance & Budget' },
  { key: 'nav.variance_desc', namespace: 'nav', fr: 'Analyse détaillée des coûts : flotte → catégorie → véhicule → OT', ar: 'تحليل تكاليف الأسطول حسب المركبة وأمر الصيانة', en: 'Drill-down: fleet → category → vehicle → WO' },
  { key: 'nav.fleet_health_grid', namespace: 'nav', fr: 'Grille de Santé de la Flotte', ar: 'شبكة الحالة الفنية للأسطول', en: 'Fleet Health Grid' },
  { key: 'nav.fleet_health_desc', namespace: 'nav', fr: 'Diagnostic en direct & statuts opérationnels des véhicules', ar: 'التقرير التشخيصي وحالة المركبات المباشرة', en: 'Status filter counts & diagnostic snapshots' },
  { key: 'nav.inventory_dashboard', namespace: 'nav', fr: 'Gestion des Stocks & Pièces', ar: 'إدارة المخزون وقطع الغيار', en: 'Inventory Dashboard' },
  { key: 'nav.inventory_desc', namespace: 'nav', fr: 'Valeur du stock & prédictions de pénurie R3', ar: 'قيمة المخزون وتنبؤات النقص وتخصيص R3', en: 'Stock values & R3 projected shortfalls' },
  { key: 'nav.work_order_queue', namespace: 'nav', fr: 'Ordres de Travail (OT)', ar: 'أوامر العمل والصيانة', en: 'Work Order Queue' },
  { key: 'nav.work_order_desc', namespace: 'nav', fr: 'Création & approbation des interventions de maintenance', ar: 'إنشاء واعتماد أوامر الصيانة والإصلاح', en: 'Create & approve maintenance interventions' },
  { key: 'nav.conflict_alerts', namespace: 'nav', fr: 'Alertes de Conflit (R2/R4)', ar: 'تنبيهات التعارض الخطر', en: 'Conflict Alerts (R2/R4)' },
  { key: 'nav.conflict_desc', namespace: 'nav', fr: 'Véhicules critiques programmés pour un départ sous 3 jours', ar: 'المركبات الحرجة المجدولة للرحلات مع وجود أوامر صيانة مفتوحة', en: 'Critical vehicles scheduled for route departure' },
  { key: 'nav.cae_prioritization', namespace: 'nav', fr: 'Priorisation Budgétaire CAE', ar: 'ترتيب أولوية الصيانة CAE', en: 'CAE Prioritization' },
  { key: 'nav.cae_desc', namespace: 'nav', fr: 'Classement des réparations selon score de priorité R5', ar: 'تقييم أولوية الإصلاح مقابل التكلفة الإحصائية للتأجيل', en: 'Ranked repair vs. statistical deferral cost' },
  { key: 'nav.incident_reports', namespace: 'nav', fr: 'Audit & Incidents Télématiques (R6)', ar: 'بلاغات السائقين ومطابقة الأعطال', en: 'Incident Investigation (R6)' },
  { key: 'nav.incident_desc', namespace: 'nav', fr: 'Rapprochement des rapports chauffeurs avec les codes OBD-II', ar: 'مطابقة بلاغات السائقين بأكواد وحدة التحكم الإلكترونية ECU', en: 'R6 driver reports & OBD fault linkage' },
  { key: 'nav.mechanic_mobile_queue', namespace: 'nav', fr: 'Tâches Mécanicien Mobile', ar: 'مهام الفني والميكانيكي', en: 'Mechanic Task Queue' },
  { key: 'nav.mechanic_desc', namespace: 'nav', fr: 'Interface mobile d\'exécution des OT & scanner OBD-II', ar: 'مسح الأعطال والتنفيذ الميداني على الجوال', en: 'Mobile task execution & OBD fault scanner' },
  { key: 'nav.driver_mobile_view', namespace: 'nav', fr: 'Interface Chauffeur Mobile', ar: 'واجهة السائق الإلكترونية', en: 'Driver Mobile View' },
  { key: 'nav.driver_desc', namespace: 'nav', fr: 'Statut du véhicule & signalement instantané d\'anomalie', ar: 'تسجيل البلاغات وفحص ما قبل الرحلة بالسائق', en: 'Status indicator & instant issue report' },
  { key: 'nav.tenant_config', namespace: 'nav', fr: 'Configuration Société & Tenant', ar: 'إعدادات المؤسسة والميزانية', en: 'Tenant & Enterprise Config' },
  { key: 'nav.tenant_desc', namespace: 'nav', fr: 'Nom de la société, budget annuel & devises de gestion', ar: 'بيانات الشركة، العملة والميزانية المستهلكة', en: 'Society name, budget & money used settings' },
  { key: 'nav.translation_center', namespace: 'nav', fr: 'Centre de Traduction Enterprise', ar: 'مركز الترجمة والتوطين', en: 'Translation Center' },
  { key: 'nav.translation_desc', namespace: 'nav', fr: 'Localisation globale, traduction Gemini AI & support RTL', ar: 'التوطين المؤسسي، الذكاء الاصطناعي ودعم العربية RTL', en: 'Enterprise localization, Gemini AI & RTL' },

  // ==========================================
  // ROLES NAMESPACE
  // ==========================================
  { key: 'roles.director', namespace: 'roles', fr: 'Directeur de Flotte', ar: 'مدير الأسطول العام', en: 'Fleet Director' },
  { key: 'roles.fleet_manager', namespace: 'roles', fr: 'Gestionnaire de Flotte', ar: 'مدير العمليات الفنية', en: 'Fleet Manager' },
  { key: 'roles.mgmt_controller', namespace: 'roles', fr: 'Contrôleur de Gestion', ar: 'المراقب المالي', en: 'Management Controller' },
  { key: 'roles.logistics_controller', namespace: 'roles', fr: 'Responsable Logistique', ar: 'مسؤول اللوجستيات والمخزون', en: 'Logistics Controller' },
  { key: 'roles.technical_controller', namespace: 'roles', fr: 'Contrôleur Technique', ar: 'المراقب التقني', en: 'Technical Controller' },
  { key: 'roles.mechanic', namespace: 'roles', fr: 'Mécanicien Atelier', ar: 'فني ورشة الصيانة', en: 'Workshop Mechanic' },
  { key: 'roles.driver', namespace: 'roles', fr: 'Chauffeur Flotte', ar: 'سائق الأسطول', en: 'Fleet Driver' },

  // ==========================================
  // STRATEGIC DASHBOARD NAMESPACE
  // ==========================================
  { key: 'strategic.banner_tag', namespace: 'strategic', fr: 'Tableau de Bord Stratégique de Direction', ar: 'لوحة القيادة الاستراتيجية للإدارة التنفيذية', en: 'Strategic Executive Dashboard' },
  { key: 'strategic.banner_title', namespace: 'strategic', fr: 'Opérations de Flotte & Matrice de Décision', ar: 'عمليات الأسطول ومصفوفة اتخاذ القرار', en: 'Fleet Operations & Decision Matrix' },
  { key: 'strategic.banner_desc', namespace: 'strategic', fr: 'Télématique agrégée en temps réel, distribution des coûts et évaluation mathématique des risques pour le rôle :', ar: 'التحليل المباشر للاتصالات، توزيع التكاليف وتقييم المخاطر لدور:', en: 'Real-time aggregate telemetry, cost distribution, and mathematical risk evaluation for role:' },
  { key: 'strategic.availability', namespace: 'strategic', fr: 'Disponibilité de la Flotte', ar: 'جاهزية الأسطول التشغيلية', en: 'Fleet Availability' },
  { key: 'strategic.operational', namespace: 'strategic', fr: 'Opérationnel', ar: 'جاهز للخدمة', en: 'Operational' },
  { key: 'strategic.calculated', namespace: 'strategic', fr: 'Calculé', ar: 'محسوب', en: 'Calculated' },
  { key: 'strategic.total_variance', namespace: 'strategic', fr: 'Écart de Coût Total', ar: 'إجمالي انحراف التكلفة', en: 'Total Cost Variance' },
  { key: 'strategic.actual_vs_budget', namespace: 'strategic', fr: 'Dépenses Réelles vs Budget', ar: 'المصروفات الفعلية مقابل الميزانية', en: 'Actual Spend vs Budget' },
  { key: 'strategic.under_budget', namespace: 'strategic', fr: 'Sous le budget', ar: 'أقل من الميزانية', en: 'Under Budget' },
  { key: 'strategic.over_budget', namespace: 'strategic', fr: 'Dépassement de budget', ar: 'تجاوز الميزانية', en: 'Over Budget' },
  { key: 'strategic.cae_risk', namespace: 'strategic', fr: 'Risque de Report CAE', ar: 'مخاطر تأجيل صيانة CAE', en: 'CAE Deferral Risk' },
  { key: 'strategic.cae_risk_desc', namespace: 'strategic', fr: 'Cumul du risque financier de report de maintenance', ar: 'إجمالي التكلفة الإحصائية لتأجيل الصيانة', en: 'Accumulated statistical deferral risk backlog' },
  { key: 'strategic.keystone_at_risk', namespace: 'strategic', fr: 'Véhicules Clés en Risque', ar: 'المركبات الأساسية في خطر', en: 'Keystone Vehicles At Risk' },
  { key: 'strategic.keystone_desc', namespace: 'strategic', fr: 'Segment de flotte à fort impact économique', ar: 'شريحة الأسطول ذات الأهمية الإستراتيجية العالية', en: 'High revenue impact fleet segment' },
  { key: 'strategic.r1_active_alerts', namespace: 'strategic', fr: 'Alertes d\'Arrêt d\'Urgence R1 Actives', ar: 'تنبيهات الإيقاف الطارئ R1 النشطة', en: 'Active Emergency Stop Warnings (Rule R1)' },
  { key: 'strategic.r1_alert_desc', namespace: 'strategic', fr: 'Retrait immédiat de l\'affectation de route requis pour ces véhicules', ar: 'سحب فوري من المخطط وإيقاف التشغيل المباشر للمركبة', en: 'Immediate removal from dispatch assignment required' },
  { key: 'strategic.critical_obd_title', namespace: 'strategic', fr: 'Répartition des Défauts Critiques OBD-II', ar: 'تفصيل الأعطال التشخيصية الخطيرة OBD-II', en: 'Critical OBD-II Faults Breakdown' },
  { key: 'strategic.cost_category_title', namespace: 'strategic', fr: 'Répartition des Coûts par Catégorie Système', ar: 'توزيع التكاليف حسب فئة النظام الفني', en: 'Cost Breakdown by System Category' },
  { key: 'strategic.quick_actions', namespace: 'strategic', fr: 'Actions Opérationnelles Rapides', ar: 'إجراءات تشغيلية سريعة', en: 'Quick Operational Actions' },

  // ==========================================
  // VARIANCE DASHBOARD NAMESPACE
  // ==========================================
  { key: 'variance.header_tag', namespace: 'variance', fr: 'Vue Contrôleur de Gestion', ar: 'واجهة المراقب المالي', en: 'Management Controller View' },
  { key: 'variance.header_title', namespace: 'variance', fr: 'Écarts Financiers & Distribution des Coûts', ar: 'الانحراف المالي وتوزيع التكاليف', en: 'Financial Variance & Cost Distribution' },
  { key: 'variance.header_desc', namespace: 'variance', fr: 'Audit financier traçable : comparaison des dépenses réelles de maintenance avec les plafonds budgétaires trimestriels.', ar: 'التدقيق المالي المستمر: مقارنة مصروفات الصيانة الفعلية مع حدود الميزانية الفصلية المعتمدة.', en: 'Traceable financial auditing: compare actual maintenance expenses against allocated quarterly budget limits.' },
  { key: 'variance.total_actual_spend', namespace: 'variance', fr: 'Dépenses Réelles de Maintenance', ar: 'إجمالي مصروفات الصيانة الفعلية', en: 'Total Actual Maintenance Spend' },
  { key: 'variance.total_allocated_budget', namespace: 'variance', fr: 'Budget Total Alloué', ar: 'إجمالي الميزانية المخصصة', en: 'Total Allocated Budget' },
  { key: 'variance.net_variance', namespace: 'variance', fr: 'Écart Nette (Réel - Budget)', ar: 'صافي انحراف التكلفة', en: 'Net Variance (Actual - Budget)' },
  { key: 'variance.favorable', namespace: 'variance', fr: 'Favorable (Économie)', ar: 'مفضل (توفير)', en: 'Favorable (Savings)' },
  { key: 'variance.unfavorable', namespace: 'variance', fr: 'Défavorable (Dépassement)', ar: 'غير مفضل (زيادة)', en: 'Unfavorable (Overrun)' },
  { key: 'variance.category_drilldown', namespace: 'variance', fr: 'Analyse Détaillée par Catégorie de Dépenses', ar: 'التحليل التفصيلي حسب فئات المصروفات', en: 'Expense Category Drill-Down' },
  { key: 'variance.category_name', namespace: 'variance', fr: 'Catégorie de Dépense', ar: 'فئة المصروفات', en: 'Category Name' },
  { key: 'variance.budget_limit', namespace: 'variance', fr: 'Plafond Budgétaire', ar: 'حد الميزانية', en: 'Budget Limit' },
  { key: 'variance.actual_spent', namespace: 'variance', fr: 'Dépensé Réel', ar: 'المصروف الفعلي', en: 'Actual Spent' },
  { key: 'variance.line_items', namespace: 'variance', fr: 'Lignes de Dépenses', ar: 'بنود التكلفة', en: 'Recorded Line Items' },
  { key: 'variance.filter_classification', namespace: 'variance', fr: 'Classification Véhicule', ar: 'تصنيف المركبة', en: 'Vehicle Classification' },

  // ==========================================
  // FLEET HEALTH GRID NAMESPACE
  // ==========================================
  { key: 'health.header_tag', namespace: 'health', fr: 'Grille Opérationnelle & Technique', ar: 'شبكة التشغيل والتقنية للأسطول', en: 'Technical & Operations Fleet Grid' },
  { key: 'health.header_title', namespace: 'health', fr: 'Télématique de Santé & Diagnostic de la Flotte', ar: 'الاتصالات والتشخيص الفني للأسطول', en: 'Fleet Health Telemetry & Diagnostic Grid' },
  { key: 'health.header_desc', namespace: 'health', fr: 'Suivi du statut en temps réel de l\'ensemble des véhicules avec explications en langage clair.', ar: 'متابعة مباشرة لحالة جميع المركبات مع ملخص توضيحي بسيط للجميع.', en: 'Real-time status tracking across all fleet vehicles with single-line plain language status explanations.' },
  { key: 'health.search_placeholder', namespace: 'health', fr: 'Rechercher par plaque ou nom de véhicule...', ar: 'بحث حسب رقم اللوحة أو اسم المركبة...', en: 'Search by plate or vehicle name...' },
  { key: 'health.simulate_obd', namespace: 'health', fr: 'Simuler Défaut OBD-II', ar: 'محاكاة عطل تشخيصي OBD-II', en: 'Simulate OBD-II Fault' },
  { key: 'health.vehicle_card', namespace: 'health', fr: 'Fiche Véhicule', ar: 'بطاقة المركبة', en: 'Vehicle Card' },
  { key: 'health.status_explanation', namespace: 'health', fr: 'Explication du Statut', ar: 'توضيح سبب الحالة', en: 'Status Explanation' },
  { key: 'health.obd_codes', namespace: 'health', fr: 'Codes d\'Erreur OBD-II', ar: 'أكواد أعطال OBD-II', en: 'OBD-II Diagnostic Codes' },
  { key: 'health.subscore_breakdown', namespace: 'health', fr: 'Détail des Subscores (Moteur, Freins, Électrique, Châssis)', ar: 'تفاصيل التقيمات الفرعية (المحرك، الفرامل، الكهرباء، الهيكل)', en: 'Subscore Breakdown (Engine, Brakes, Electrical, Chassis)' },

  // ==========================================
  // INVENTORY NAMESPACE
  // ==========================================
  { key: 'inventory.header_tag', namespace: 'inventory', fr: 'Vue Logistique & Gestion des Stocks', ar: 'واجهة المسؤول اللوجستي وإدارة المخازن', en: 'Logistics Controller & Warehouse Inventory' },
  { key: 'inventory.header_title', namespace: 'inventory', fr: 'Gestion des Stocks & Métriques de Réservation R3', ar: 'إدارة المخزون ونظام الحجز الآلي R3', en: 'Inventory Management & R3 Reservation Metrics' },
  { key: 'inventory.header_desc', namespace: 'inventory', fr: 'Suivi de la valeur du stock, prédictions de pénuries dues aux OT approuvés et réapprovisionnement automatique.', ar: 'متابعة قيمة المخزون وتنبؤات النقص بناء على أوامر الصيانة المعتمدة وإعادات الطلب.', en: 'Track total stock value, projected shortfalls from approved work orders, and reorder triggers.' },
  { key: 'inventory.total_val', namespace: 'inventory', fr: 'Valeur Totale du Stock', ar: 'إجمالي قيمة المخزون', en: 'Total Inventory Value' },
  { key: 'inventory.parts_types', namespace: 'inventory', fr: 'Références Différentes', ar: 'أنواع قطع الغيار', en: 'Unique Parts Categories' },
  { key: 'inventory.r3_shortfalls', namespace: 'inventory', fr: 'Pénuries Prévues (R3)', ar: 'النقص المالي المتوقع (R3)', en: 'R3 Projected Shortfalls' },
  { key: 'inventory.shortfalls_desc', namespace: 'inventory', fr: 'Pièces réservées dépassant le stock physique', ar: 'قطع محجوزة تتجاوز الكمية الفعلية بالمخزن', en: 'Reserved parts exceeding physical stock' },
  { key: 'inventory.parts_table', namespace: 'inventory', fr: 'Catalogue des Pièces Détachées', ar: 'دليل قطع الغيار بالمخزن', en: 'Spare Parts Inventory Catalog' },

  // ==========================================
  // WORK ORDERS NAMESPACE
  // ==========================================
  { key: 'wo.header_tag', namespace: 'wo', fr: 'Gestion des Ordres de Travail (OT)', ar: 'إدارة وتوجيه أوامر الصيانة', en: 'Work Order Execution Queue' },
  { key: 'wo.header_title', namespace: 'wo', fr: 'File d\'Attente des Interventions de Maintenance', ar: 'سجل وتوجيه أوامر العمل والإصلاح', en: 'Maintenance Work Order Management' },
  { key: 'wo.header_desc', namespace: 'wo', fr: 'Cycle de vie complet : création, réservation R3, calcul R4, approbation et affectation aux mécaniciens.', ar: 'دورة الصيانة الكاملة: إنشاء، حجز R3، حساب R4 واعتماد الفنيين.', en: 'Full maintenance lifecycle: creation, R3 reservation, R4 calculation, approval & mechanic dispatch.' },
  { key: 'wo.new_wo', namespace: 'wo', fr: 'Nouveau OT', ar: 'أمر صيانة جديد', en: 'Create New Work Order' },
  { key: 'wo.approve', namespace: 'wo', fr: 'Approuver OT', ar: 'اعتماد أمر العمل', en: 'Approve Work Order' },
  { key: 'wo.start', namespace: 'wo', fr: 'Démarrer Réparation', ar: 'بدء التنفيذ', en: 'Start Work' },
  { key: 'wo.complete', namespace: 'wo', fr: 'Finaliser OT (R3)', ar: 'إكمال وإخصام المخزون (R3)', en: 'Complete & Deduct Stock' },
  { key: 'wo.open_orders', namespace: 'wo', fr: 'OT Ouverts', ar: 'أوامر مفتوحة', en: 'Open Work Orders' },
  { key: 'wo.approved_orders', namespace: 'wo', fr: 'OT Approuvés', ar: 'أوامر معتمدة', en: 'Approved Work Orders' },
  { key: 'wo.completed_orders', namespace: 'wo', fr: 'OT Terminés', ar: 'أوامر مكتملة', en: 'Completed Work Orders' },

  // ==========================================
  // CONFLICT ALERTS NAMESPACE
  // ==========================================
  { key: 'conflict.header_tag', namespace: 'conflict', fr: 'Règles d\'Évitement des Conflits R2 & R4', ar: 'قواعد منع تعارض المواعيد R2 و R4', en: 'Rule R2 & R4 Conflict Avoidance Engine' },
  { key: 'conflict.header_title', namespace: 'conflict', fr: 'Matrice de Conflit Départ / Maintenance', ar: 'مصفوفة تعارض الرحلات والقاطرات', en: 'Route Departure & Open WO Conflict Matrix' },
  { key: 'conflict.header_desc', namespace: 'conflict', fr: 'Détection automatique des véhicules avec départ prévu sous 3 jours ayant un ordre de travail en cours.', ar: 'الكشف الآلي للمركبات المجدولة للرحلة خلال 3 أيام مع وجود صيانة مفتوحة.', en: 'Automatic detection of vehicles scheduled for departure within 3 days that have uncompleted work orders.' },
  { key: 'conflict.no_conflicts', namespace: 'conflict', fr: 'Aucun conflit de planification détecté', ar: 'لا يوجد أي تعارض مجدول حالياً', en: 'No schedule conflicts detected' },

  // ==========================================
  // CAE PRIORITIZATION NAMESPACE
  // ==========================================
  { key: 'cae.header_tag', namespace: 'cae', fr: 'Optimisation Budgétaire CAE (Règle R5)', ar: 'محرك أولوية ميزانية CAE (قاعدة R5)', en: 'CAE Budget Optimization (Rule R5)' },
  { key: 'cae.header_title', namespace: 'cae', fr: 'Matrice de Priorisation des Réparations CAE', ar: 'مصفوفة ترتيب أولوية إصلاحات CAE', en: 'CAE Repair Prioritization Matrix' },
  { key: 'cae.header_desc', namespace: 'cae', fr: 'Score R5 = (Sévérité × 40%) + (Jours Départ × 30%) + (Ratio ROI/Coût × 30%) pour arbitrer les réparations.', ar: 'معادلة R5 = (الخطورة × 40%) + (أيام الرحلة × 30%) + (العائد × 30%) لترتيب أولوية الإنفاق.', en: 'R5 Score = (Severity × 40%) + (Days to Route × 30%) + (ROI/Cost Ratio × 30%) to rank repairs.' },
  { key: 'cae.rank', namespace: 'cae', fr: 'Rang de Priorité', ar: 'الترتيب', en: 'Priority Rank' },
  { key: 'cae.score', namespace: 'cae', fr: 'Score R5', ar: 'درجة R5', en: 'R5 Score' },
  { key: 'cae.deferral_cost', namespace: 'cae', fr: 'Coût du Report', ar: 'تكلفة التأجيل', en: 'Deferral Risk Cost' },

  // ==========================================
  // INCIDENT REPORTS NAMESPACE
  // ==========================================
  { key: 'incidents.header_tag', namespace: 'incidents', fr: 'Rapprochement Télématique Chauffeur (Règle R6)', ar: 'مطابقة بلاغات السائقين بالفحص الإلكتروني (R6)', en: 'Driver Incident Telemetry Reconciliation (Rule R6)' },
  { key: 'incidents.header_title', namespace: 'incidents', fr: 'Audit des Incidents & Enquêtes R6', ar: 'تدقيق البلاغات وإنشاء أوامر التحقيق R6', en: 'Incident Audits & R6 Investigation Queue' },
  { key: 'incidents.header_desc', namespace: 'incidents', fr: 'Tout incident déclaré par un chauffeur sans code OBD-II correspondant génère automatiquement un OT d\'enquête R6.', ar: 'كل بلاغ سائق بدون كود اعطال إلكتروني ينشئ تلقائياً أمر صيانة تحقيقي R6.', en: 'Any driver-reported incident without matching OBD code automatically triggers an R6 Investigation Work Order.' },
  { key: 'incidents.report_incident', namespace: 'incidents', fr: 'Déclarer un Incident', ar: 'تسجيل بلاغ جديد', en: 'Report New Incident' },

  // ==========================================
  // MECHANIC & DRIVER MOBILE NAMESPACE
  // ==========================================
  { key: 'mechanic.header_tag', namespace: 'mechanic', fr: 'Interface Mobile Mécanicien Atelier', ar: 'واجهة الفني والميكانيكي الجوالة', en: 'Workshop Mechanic Mobile View' },
  { key: 'mechanic.header_title', namespace: 'mechanic', fr: 'File de Tâches de l\'Atelier & Scanner OBD', ar: 'سجل مهام الورشة وفحص OBD', en: 'Workshop Task Queue & Diagnostic Scan' },
  { key: 'mechanic.header_desc', namespace: 'mechanic', fr: 'Vue mobile pour technicien. Scannez les ports OBD et clôturez les ordres de travail.', ar: 'واجهة الفني الجوالة. مسح منافذ OBD وإغلاق أوامر الصيانة.', en: 'Mobile view for technicians. Scan vehicle OBD ports and close completed work orders.' },
  { key: 'mechanic.scanner_title', namespace: 'mechanic', fr: 'Simuler Scanner Diagnostique OBD-II (Règle R1/R3)', ar: 'محاكاة الفحص الإلكتروني OBD-II', en: 'Simulate OBD-II Diagnostic Scan (Golden Path Trigger)' },
  { key: 'mechanic.scanner_desc', namespace: 'mechanic', fr: 'Connectez le scanner virtuel à l\'ECU du véhicule pour enregistrer les codes d\'erreur (DTC).', ar: 'ربط الفحص الإلكتروني بوحدة ECU الخاصة بالمركبة لتسجيل رموز الأعطال.', en: 'Connect virtual scanner to vehicle ECU to log diagnostic trouble codes (DTCs).' },
  { key: 'mechanic.target_vehicle', namespace: 'mechanic', fr: 'Véhicule Cible à l\'Atelier', ar: 'المركبة المستهدفة بالورشة', en: 'Target Vehicle in Workshop' },
  { key: 'mechanic.obd_code', namespace: 'mechanic', fr: 'Code d\'Erreur OBD-II', ar: 'رمز عطل OBD-II', en: 'OBD Trouble Code' },
  { key: 'mechanic.severity_tier', namespace: 'mechanic', fr: 'Niveau de Sévérité', ar: 'مستوى الخطورة', en: 'Severity Tier' },
  { key: 'mechanic.fault_name', namespace: 'mechanic', fr: 'Nom / Description du Défaut', ar: 'اسم العطل / الوصف', en: 'Fault Name / Description' },
  { key: 'mechanic.linked_part', namespace: 'mechanic', fr: 'Pièce Requise du Stock', ar: 'القطعة المطلوبة من المخزن', en: 'Linked Part Required from Warehouse' },
  { key: 'mechanic.none_required', namespace: 'mechanic', fr: 'Aucune Pièce Requise', ar: 'لا تتطلب قطعة غيار', en: 'None Required' },
  { key: 'mechanic.btn_scan', namespace: 'mechanic', fr: 'Enregistrer l\'Anomalie OBD', ar: 'تسجيل كود العطل بالمنظومة', en: 'Execute OBD Fault Scan Log' },
  { key: 'mechanic.assigned_orders', namespace: 'mechanic', fr: 'Ordres de Travail Ouverts Assignés', ar: 'أوامر الصيانة المفتوحة المكلف بها', en: 'Assigned Open Work Orders' },
  { key: 'mechanic.complete_deduct', namespace: 'mechanic', fr: 'Terminer & Déduire les Pièces', ar: 'إكمال العمل وإخصام القطع', en: 'Complete & Deduct Parts' },
  { key: 'mechanic.close_wo_title', namespace: 'mechanic', fr: 'Clôturer l\'Ordre de Travail #', ar: 'إغلاق أمر الصيانة #', en: 'Close Work Order #' },
  { key: 'mechanic.submit_completion', namespace: 'mechanic', fr: 'Valider l\'Achèvement', ar: 'تأكيد وإرسال الإكمال', en: 'Submit Completion' },

  { key: 'driver.header_tag', namespace: 'driver', fr: 'Interface Mobile Chauffeur Flotte', ar: 'واجهة السائق الإلكترونية', en: 'Fleet Driver Mobile View' },
  { key: 'driver.header_title', namespace: 'driver', fr: 'Enregistreur d\'Incidents Pre-Trip & Route', ar: 'مسجل بلاغات السائق وفحص ما قبل الرحلة', en: 'Pre-Trip & Route Incident Logger' },
  { key: 'driver.header_desc', namespace: 'driver', fr: 'Espace chauffeur pour vérifier l\'état et signaler toute anomalie.', ar: 'واجهة السائق لفحص المركبة وتسجيل الملاحظات.', en: 'Driver companion view for vehicle checks and incident logging.' },
  { key: 'driver.select_vehicle', namespace: 'driver', fr: 'Sélectionner le Véhicule Assigné', ar: 'اختر المركبة المكلف بها', en: 'Select Assigned Coach / Van' },
  { key: 'driver.status_title', namespace: 'driver', fr: 'Statut du Véhicule Assigné', ar: 'حالة المركبة المكلف بها', en: 'Assigned Vehicle Operational Status' },
  { key: 'driver.report_title', namespace: 'driver', fr: 'Signalement d\'Anomalie / Bruit Suspect (Règle R6)', ar: 'تسجيل بلاغ عطل أو صوت غريب (قاعدة R6)', en: 'Report Driver Observed Issue / Noise (Rule R6)' },
  { key: 'driver.issue_category', namespace: 'driver', fr: 'Catégorie de l\'Incident', ar: 'فئة البلاغ', en: 'Issue Category' },
  { key: 'driver.symptom_desc', namespace: 'driver', fr: 'Description des Symptômes', ar: 'وصف الأعراض والملاحظات', en: 'Description of Symptoms' },
  { key: 'driver.symptom_placeholder', namespace: 'driver', fr: 'Décrivez ce que vous avez entendu, vu ou ressenti pendant la conduite...', ar: 'صف ما سمعته أو لاحظته أثناء القيادة أو الفحص...', en: 'Describe what you heard, saw, or felt during drive or pre-trip inspection...' },
  { key: 'driver.btn_submit', namespace: 'driver', fr: 'Soumettre le Rapport d\'Incident Driver', ar: 'إرسال بلاغ السائق', en: 'Submit Driver Incident Report' },

  // ==========================================
  // STATUSES & DOMAIN STRINGS
  // ==========================================
  { key: 'status.healthy', namespace: 'domain', fr: 'Sain / Opérationnel', ar: 'سليم / جاهز', en: 'Healthy' },
  { key: 'status.attention', namespace: 'domain', fr: 'Attention Requis', ar: 'يتطلب انتباه', en: 'Attention' },
  { key: 'status.critical', namespace: 'domain', fr: 'Critique', ar: 'حرج', en: 'Critical' },
  { key: 'status.unsafe', namespace: 'domain', fr: 'Invalide / Dangereux', ar: 'غير آمن / أحمر', en: 'Unsafe / Red' },

  { key: 'wostatus.open', namespace: 'domain', fr: 'Ouvert', ar: 'مفتوح', en: 'Open' },
  { key: 'wostatus.approved', namespace: 'domain', fr: 'Approuvé', ar: 'معتمد', en: 'Approved' },
  { key: 'wostatus.in_progress', namespace: 'domain', fr: 'En Cours', ar: 'قيد التنفيذ', en: 'In Progress' },
  { key: 'wostatus.closed', namespace: 'domain', fr: 'Clôturé', ar: 'مغلق', en: 'Closed' },

  { key: 'wotype.preventative', namespace: 'domain', fr: 'Préventif', ar: 'وقائي', en: 'Preventative' },
  { key: 'wotype.corrective', namespace: 'domain', fr: 'Correctif', ar: 'تصحيحي', en: 'Corrective' },
  { key: 'wotype.emergency', namespace: 'domain', fr: 'Urgence', ar: 'طارئ', en: 'Emergency' },

  { key: 'incident.category_noise', namespace: 'domain', fr: 'Bruit Suspect', ar: 'صوت غريب', en: 'Noise' },
  { key: 'incident.category_warning', namespace: 'domain', fr: 'Voyant Lumineux', ar: 'مؤشر تحذيري', en: 'Warning Light' },
  { key: 'incident.category_damage', namespace: 'domain', fr: 'Dommage Physique', ar: 'ضرر هيكلي', en: 'Damage' },
  { key: 'incident.category_other', namespace: 'domain', fr: 'Autre Incident', ar: 'آخر', en: 'Other' },

  { key: 'severity.critical', namespace: 'domain', fr: 'Critique (Rouge)', ar: 'حرج (أحمر)', en: 'Critical (Red)' },
  { key: 'severity.warning', namespace: 'domain', fr: 'Avertissement (Orange)', ar: 'تحذير (برتقالي)', en: 'Warning (Amber)' },
  { key: 'severity.info', namespace: 'domain', fr: 'Information (Bleu)', ar: 'معلومات (أزرق)', en: 'Info (Blue)' },

  // ==========================================
  // MODALS & COMMON DETAILS
  // ==========================================
  { key: 'modal.vehicle_detail', namespace: 'modals', fr: 'Détails du Véhicule & Diagnostic', ar: 'تفاصيل المركبة والتقرير الفني', en: 'Vehicle Details & Diagnostic Report' },
  { key: 'modal.role_selector', namespace: 'modals', fr: 'Sélectionner un Rôle Utilisateur (RBAC)', ar: 'اختيار دور المستخدم (RBAC)', en: 'Select User Role (RBAC)' },
  { key: 'modal.golden_path', namespace: 'modals', fr: 'Démonstrations Interactives (Golden Path)', ar: 'مسارات التوضيح التفاعلية (Golden Path)', en: 'Interactive Demo Scenarios (Golden Path)' },
  { key: 'modal.active_role', namespace: 'modals', fr: 'Rôle Actif', ar: 'الدور الحالي', en: 'Active Role' },
  { key: 'modal.enter_as', namespace: 'modals', fr: 'Accéder en tant que', ar: 'الدخول بصفة', en: 'Enter as' },
  { key: 'modal.continue_role', namespace: 'modals', fr: 'Continuer avec le rôle actuel', ar: 'المتابعة بالدور الحالي', en: 'Continue with Current Role' },
  { key: 'modal.tab_summary', namespace: 'modals', fr: 'Résumé & Santé', ar: 'الملخص وحالة المركبة', en: 'Summary & Health' },
  { key: 'modal.tab_diagnostics', namespace: 'modals', fr: 'Diagnostic OBD', ar: 'الفحص الإلكتروني OBD', en: 'OBD Diagnostics' },
  { key: 'modal.tab_history', namespace: 'modals', fr: 'Historique Service', ar: 'سجل الصيانة', en: 'Service History' },
  { key: 'modal.tab_cost', namespace: 'modals', fr: 'Analyse des Coûts', ar: 'تحليل التكاليف', en: 'Cost Audit' },
  { key: 'modal.tab_parts', namespace: 'modals', fr: 'Pièces Associées', ar: 'قطع الغيار المرتبطة', en: 'Parts Allocation' },
  { key: 'modal.tab_work_orders', namespace: 'modals', fr: 'Ordres de Travail', ar: 'أوامر الصيانة', en: 'Work Orders' },

  // ==========================================
  // FUEL MODULE NAMESPACE
  // ==========================================
  { key: 'nav.fuel_logs', namespace: 'nav', fr: 'Carburant & Consommation', ar: 'الوقود والاستهلاك', en: 'Fuel & Consumption' },
  { key: 'nav.fuel_desc', namespace: 'nav', fr: 'Suivi carburant, L/100km & détection d\'anomalies R7', ar: 'تتبع الوقود، استهلاك L/100km واكتشاف التجاوزات R7', en: 'Log fuel, consumption L/100km & R7 anomaly detection' },
  { key: 'fuel.header_tag', namespace: 'fuel', fr: 'Télématique & Opérations Carburant', ar: 'التليمتريات وعمليات الوقود', en: 'Telemetry & Fleet Fuel Operations' },
  { key: 'fuel.header_title', namespace: 'fuel', fr: 'Consommation de Carburant & Détection d\'Anomalies R7', ar: 'استهلاك الوقود واكتشاف تجاوزات R7', en: 'Fuel Consumption & R7 Anomaly Detection' },
  { key: 'fuel.header_desc', namespace: 'fuel', fr: 'Enregistrez les pleins, calculez l\'efficacité en L/100km et détectez les pics dépassant 20% de la moyenne sur 90 jours.', ar: 'تسجيل عمليات التزود بالوقود، حساب L/100km واكتشاف الزيادات بنسبة >20% عن المعدل.', en: 'Track fuel logs, compute L/100km efficiency between refueling events, and flag consumption spikes exceeding 20% over the trailing 90-day baseline.' },
  { key: 'fuel.total_volume', namespace: 'fuel', fr: 'Volume Total de Carburant', ar: 'إجمالي حجم الوقود', en: 'Total Fuel Volume' },
  { key: 'fuel.total_cost', namespace: 'fuel', fr: 'Dépenses Totales Carburant', ar: 'إجمالي نفقات الوقود', en: 'Total Fuel Expenditure' },
  { key: 'fuel.avg_consumption', namespace: 'fuel', fr: 'Consommation Moyenne Flotte', ar: 'متوسط استهلاك الأسطول', en: 'Fleet Avg Consumption' },
  { key: 'fuel.anomalies_flagged', namespace: 'fuel', fr: 'Anomalies Carburant R7', ar: 'تجاوزات الوقود R7', en: 'R7 Fuel Anomalies' },
  { key: 'fuel.recorded_logs', namespace: 'fuel', fr: 'pleins enregistrés', ar: 'عملية تزود مسجلة', en: 'recorded refuel entries' },
  { key: 'fuel.log_entry_title', namespace: 'fuel', fr: 'Enregistrer un Plein de Carburant', ar: 'تسجيل عملية تزود بالوقود', en: 'Record Refuel Entry' },
  { key: 'fuel.select_vehicle', namespace: 'fuel', fr: 'Véhicule', ar: 'المركبة', en: 'Vehicle' },
  { key: 'fuel.volume_liters', namespace: 'fuel', fr: 'Volume (Litres)', ar: 'الحجم (لتر)', en: 'Fuel Volume (Liters)' },
  { key: 'fuel.cost_amount', namespace: 'fuel', fr: 'Coût', ar: 'التكلفة', en: 'Cost' },
  { key: 'fuel.odometer_km', namespace: 'fuel', fr: 'Compteur (km)', ar: 'عداد المسافة (كم)', en: 'Odometer (km)' },
  { key: 'fuel.logged_at', namespace: 'fuel', fr: 'Date & Heure du Plein', ar: 'تاريخ ووقت التزود', en: 'Refuel Date & Time' },
  { key: 'fuel.submit_btn', namespace: 'fuel', fr: 'Enregistrer le Plein', ar: 'تسجيل العملية', en: 'Record Refuel Entry' },
  { key: 'fuel.saving', namespace: 'fuel', fr: 'Enregistrement...', ar: 'جاري الحفظ...', en: 'Recording...' },
  { key: 'fuel.consumption_trend_title', namespace: 'fuel', fr: 'Tendance de Consommation par Véhicule', ar: 'اتجاه الاستهلاك حسب المركبة', en: 'Per-Vehicle Consumption & Log Trend' },

  // ==========================================
  // TELEMETRY STREAM NAMESPACE
  // ==========================================
  { key: 'nav.telemetry_stream', namespace: 'nav', fr: 'Flux Télématique Live', ar: 'البث التليمتري المباشر', en: 'Live Telemetry Stream' },
  { key: 'nav.telemetry_desc', namespace: 'nav', fr: 'Coord. GPS, codes défaut OBD & statut des adaptateurs', ar: 'إحداثيات GPS، رموز أعطال OBD وحالة المحولات', en: 'Real-time GPS coords, OBD faults & adapter statuses' },
  { key: 'telemetry.header_tag', namespace: 'telemetry', fr: 'Couche d\'Ingestion Vendor-Agnostic', ar: 'طبقة التجميع المستقلة عن الموردين', en: 'Vendor-Agnostic Ingestion Layer' },
  { key: 'telemetry.header_title', namespace: 'telemetry', fr: 'Flux Télématique & Positions en Temps Réel', ar: 'البث التليمتري والمواقع المباشرة', en: 'Real-Time Telemetry Stream & Positions' },
  { key: 'telemetry.header_desc', namespace: 'telemetry', fr: 'Visualisez les flux de télémétrie OBD-II et la géolocalisation des véhicules via le contrat d\'interface TelematicsProvider.', ar: 'عرض بيانات الفحص OBD-II والتتبع عبر واجهة TelematicsProvider الموحدة.', en: 'Visualize real-time OBD-II diagnostic streams and GPS coordinates normalized via the TelematicsProvider abstraction layer.' },
  { key: 'telemetry.active_streams', namespace: 'telemetry', fr: 'Flux Actifs Flotte', ar: 'التدفقات النشطة للأسطول', en: 'Active Fleet Streams' },
  { key: 'telemetry.manual_adapters', namespace: 'telemetry', fr: 'Adaptateurs Manuel / Pilote', ar: 'محولات الإدخال اليدوي', en: 'Manual / Pilot Adapters' },
  { key: 'telemetry.phase2_standby', namespace: 'telemetry', fr: 'Standby Connecteurs Phase 2', ar: 'محولات Phase 2 في انتظار الربط', en: 'Phase 2 Adapter Standby' },
  { key: 'telemetry.active_faults', namespace: 'telemetry', fr: 'Codes Défaut Actifs Streamed', ar: 'أعطال OBD المتدفقة', en: 'Active OBD Faults Streamed' },
  { key: 'telemetry.simulate_fault_btn', namespace: 'telemetry', fr: 'Injecter Défaut OBD (R1 Test)', ar: 'حقن عطل OBD اختبار R1', en: 'Simulate OBD Fault (R1 Test)' },
  { key: 'telemetry.simulate_ping_btn', namespace: 'telemetry', fr: 'Pinger Position GPS', ar: 'تحديث موقع GPS', en: 'Ping GPS Position' },
  { key: 'telemetry.chart_title', namespace: 'telemetry', fr: 'Tendance Télématique & Diagnostic (Dernière Heure)', ar: 'اتجاه البيانات التليمتري والتشخيص (الساعة الأخيرة)', en: 'Telemetry & Diagnostic Trend (Last 60 Mins)' },
  { key: 'telemetry.chart_desc', namespace: 'telemetry', fr: 'Évolution en temps réel des codes défauts OBD, vitesses GPS et température moteur.', ar: 'التطور المباشر لرموز أعطال OBD وسرعة GPS ودرجة حرارة المحرك.', en: 'Real-time progression of OBD fault codes, GPS speeds, and engine thermal metrics across the fleet.' },

  // ==========================================
  // AUDIT LOG NAMESPACE
  // ==========================================
  { key: 'nav.audit_log', namespace: 'nav', fr: 'Journal d\'Audit Immuable', ar: 'سجل المراجعة غير Qابل للتعديل', en: 'Immutable Audit Trail' },
  { key: 'nav.audit_desc', namespace: 'nav', fr: 'Traçabilité légale et immuable des mutations véhicules, ordres de travail, surcharges R1-R7 et décisions CAE', ar: 'التتبع القانوني للعمليات والقرارات', en: 'Append-only audit ledger for mutations, work orders, rule overrides & CAE decisions' },
  { key: 'audit.header_tag', namespace: 'audit', fr: 'Conformité & Registre Contractuel (Append-Only)', ar: 'سجل الامتثال والعقود', en: 'Compliance & Contractual Ledger (Append-Only)' },
  { key: 'audit.header_title', namespace: 'audit', fr: 'Journal d\'Audit Immuable Multi-Tenant', ar: 'سجل المراجعة المحفوظ للشركات', en: 'Multi-Tenant Immutable Audit Trail' },
  { key: 'audit.header_desc', namespace: 'audit', fr: 'Historique non-modifiable de toutes les modifications de véhicules, ordres de travail, dérogations de règles R1-R7 et approbations budgétaires CAE.', ar: 'سجل غير قابل للتعديل لجميع تحديثات المركبات، أوامر الصيانة، وتجاوزات القواعد.', en: 'Tamper-proof ledger of all vehicle updates, work order transitions, R1-R7 rule overrides, and CAE budget approvals.' },
  { key: 'audit.filter_entity', namespace: 'audit', fr: 'Type d\'Entité', ar: 'نوع الكيان', en: 'Entity Type' },
  { key: 'audit.filter_all_entities', namespace: 'audit', fr: 'Toutes les Entités', ar: 'جميع الكيانات', en: 'All Entities' },
  { key: 'audit.filter_start_date', namespace: 'audit', fr: 'Date Début', ar: 'تاريخ البداية', en: 'Start Date' },
  { key: 'audit.filter_end_date', namespace: 'audit', fr: 'Date Fin', ar: 'تاريخ النهاية', en: 'End Date' },
  { key: 'audit.col_timestamp', namespace: 'audit', fr: 'Horodatage (UTC)', ar: 'الطابع الزمني', en: 'Timestamp (UTC)' },
  { key: 'audit.col_actor', namespace: 'audit', fr: 'Acteur & Rôle', ar: 'الactor والرتبة', en: 'Actor & Role' },
  { key: 'audit.col_entity', namespace: 'audit', fr: 'Entité & ID', ar: 'الكيان والمُعرِّف', en: 'Entity & ID' },
  { key: 'audit.col_action', namespace: 'audit', fr: 'Action Executée', ar: 'الإجراء المُنَفَّذ', en: 'Action Executed' },
  { key: 'audit.col_diff', namespace: 'audit', fr: 'Différentiel État (Before / After)', ar: 'الفارق بين الحالتين', en: 'State Delta (Before / After)' },
  { key: 'audit.empty_trail', namespace: 'audit', fr: 'Aucune entrée d\'audit trouvée pour ces filtres.', ar: 'لم يتم العثور على أية سجلات تدقيق لهذه التصفية.', en: 'No audit trail entries matched the specified filters.' },

  // ==========================================
  // SAFETY LEADERBOARD NAMESPACE
  // ==========================================
  { key: 'safety.leaderboard_title', namespace: 'safety', fr: 'Classement & Champions Sécurité Conducteurs', ar: 'لوحة صدارة السائقين المتميزين للسلامة', en: 'Driver Safety Leaderboard & Champions' },
  { key: 'safety.leaderboard_desc', namespace: 'safety', fr: 'Classement dynamique fondé sur le score global de télémesure (G-Force, freinage, zéro alerte OBD)', ar: 'ترتيب ديناميكي مبني على نقاط التليمتري الشاملة (الفرملة، التسارع، وسلامة OBD)', en: 'Dynamic driver ranking derived from aggregate telemetry safety scores (G-force, braking, zero OBD faults)' },
  { key: 'safety.top_rank', namespace: 'safety', fr: 'Rang', ar: 'المرتبة', en: 'Rank' },
  { key: 'safety.award_bonus', namespace: 'safety', fr: 'Attribuer Prime CNPSR', ar: 'منح مكافأة السلامة', en: 'Award Safety Bonus' },
  { key: 'safety.podium_1st', namespace: 'safety', fr: '1er Rang - Or', ar: 'المركز الأول - ذهبي', en: '1st Place - Gold' },
  { key: 'safety.podium_2nd', namespace: 'safety', fr: '2ème Rang - Argent', ar: 'المركز الثاني - فضي', en: '2nd Place - Silver' },
  { key: 'safety.podium_3rd', namespace: 'safety', fr: '3ème Rang - Bronze', ar: 'المركز الثالث - برونزي', en: '3rd Place - Bronze' }
];

// Generate structured INITIAL_TRANSLATIONS array
export const INITIAL_TRANSLATIONS: TranslationRecord[] = [];

let trIdCounter = 1;
DICTIONARY_RAW_DATA.forEach((item) => {
  const languages: ('fr' | 'ar' | 'en')[] = ['fr', 'ar', 'en'];
  languages.forEach((lang) => {
    const idFormatted = `TR-${String(trIdCounter++).padStart(3, '0')}`;
    INITIAL_TRANSLATIONS.push({
      id: idFormatted,
      key: item.key,
      namespace: item.namespace,
      language: lang,
      value: item[lang],
      description: item.description,
      status: 'Approved',
      version: 1,
      lastModifiedBy: 'admin@nexttransit.com',
      createdAt: '2026-01-01',
      updatedAt: '2026-08-01',
    });
  });
});
