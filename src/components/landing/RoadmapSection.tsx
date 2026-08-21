import React from 'react';
import { ControlPanelVisual } from './ControlPanelVisual';

interface RoadmapSectionProps {
  currentLanguage: string;
}

const PHASES = [
  { phase: 'Plateforme Actuelle', active: true, status: { fr: 'En production', en: 'Live', ar: 'قيد التشغيل' },
    title: { fr: 'Socle décisionnel', en: 'Decision core', ar: 'النواة القرارية' },
    desc: { fr: 'CAE, règles décisionnelles, multi-tenant RLS, SSO entreprise.', en: 'CAE, decision rules, multi-tenant RLS, enterprise SSO.', ar: 'محرك CAE، قواعد اتخاذ القرار، عزل بيانات متعدد المستأجرين.' } },
  { phase: 'Phase 2', active: false, status: { fr: 'Roadmap', en: 'Roadmap', ar: 'خارطة الطريق' },
    title: { fr: 'IoT temps réel & IA prédictive', en: 'Real-time IoT & predictive AI', ar: 'إنترنت الأشياء والذكاء التنبؤي' },
    desc: { fr: 'Connecteurs modules & plateforme propriétaires, streaming OBD, alerte 72h avant seuil critique.', en: 'Proprietary module connectors & platform, OBD streaming, 72h pre-alert before critical threshold.', ar: 'موصلات ومنصة خاصة بنا، بث OBD، تنبيه قبل 72 ساعة من الحد الحرج.' } },
  { phase: 'Phase 3', active: false, status: { fr: 'Roadmap', en: 'Roadmap', ar: 'خارطة الطريق' },
    title: { fr: 'Logistique & approvisionnement', en: 'Logistics & procurement', ar: 'اللوجستيات والتوريد' },
    desc: { fr: 'Commandes fournisseurs automatisées, RFID atelier, calendriers PM.', en: 'Automated supplier orders, workshop RFID, PM schedules.', ar: 'طلبات موردين آلية، تتبع RFID، جداول الصيانة.' } },
  { phase: 'Phase 4', active: false, status: { fr: 'Roadmap', en: 'Roadmap', ar: 'خارطة الطريق' },
    title: { fr: 'Conformité SCF & CNAS', en: 'SCF & CNAS compliance', ar: 'الامتثال المحاسبي والاجتماعي' },
    desc: { fr: 'Export comptable SAP/Odoo/Sage, déclarations sociales, bilan carbone, hébergement souverain On-Premise en Algérie.', en: 'SAP/Odoo/Sage export, social filings, carbon reporting, sovereign On-Premise hosting in Algeria.', ar: 'تصدير محاسبي، تصريحات اجتماعية، تقرير كربوني، استضافة سيادية محلية في الجزائر.' } },
  { phase: 'Phase 5', active: false, status: { fr: 'Vision', en: 'Vision', ar: 'رؤية' },
    title: { fr: 'ERP logistique complet', en: 'Full logistics ERP', ar: 'نظام تخطيط موارد لوجستي كامل' },
    desc: { fr: 'Offline-first atelier, portail garages partenaires, API ouvertes TMS/WMS.', en: 'Offline-first workshop, partner garage portal, open TMS/WMS APIs.', ar: 'عمل بدون اتصال، بوابة الشركاء، واجهات برمجية مفتوحة.' } },
];

export const RoadmapSection: React.FC<RoadmapSectionProps> = ({ currentLanguage }) => {
  const lang = (currentLanguage === 'ar' || currentLanguage === 'en') ? currentLanguage : 'fr';
  return (
    <div className="space-y-10 py-4">
      <div className="max-w-xl space-y-3">
        <span className="inline-flex items-center gap-2 text-[11px] font-data uppercase tracking-wider text-ochre">
          <span className="h-1.5 w-1.5 rounded-full bg-ochre" />
          {currentLanguage === 'ar' ? 'الرؤية' : currentLanguage === 'en' ? 'Vision' : 'Vision'}
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
          {currentLanguage === 'ar' ? 'ترى أداة قرار. إليك نظام ERP الذي نبنيه.' : currentLanguage === 'en' ? 'You see a decision tool. Here is the ERP we are building.' : 'Vous voyez un outil de décision. Voici l\'ERP que nous construisons.'}
        </h2>
        <p className="text-sm text-slate-doc">
          {currentLanguage === 'ar' ? 'البدء صغيراً ليس غياب الطموح — إنه الطريقة الوحيدة لتسليم نظام قابل للتدقيق منذ اليوم الأول.' : currentLanguage === 'en' ? 'Starting small is not the absence of ambition — it is the only way to ship an auditable system from day one.' : 'Commencer petit n\'est pas l\'absence d\'ambition — c\'est la seule façon de livrer un système auditable dès le jour 1.'}
        </p>
      </div>

      <ControlPanelVisual
        className="max-w-xl"
        windowLabel={currentLanguage === 'ar' ? 'مراقب مراحل التطوير' : currentLanguage === 'en' ? 'DELIVERY PHASE MONITOR' : 'MONITEUR DES PHASES DE LIVRAISON'}
        badgeLabel={`${PHASES.length} ${currentLanguage === 'ar' ? 'مراحل' : currentLanguage === 'en' ? 'PHASES' : 'PHASES'}`}
        badgeTone="ochre"
        rows={PHASES.map((p) => ({
          label: p.title[lang as 'fr' | 'en' | 'ar'],
          value: p.status[lang as 'fr' | 'en' | 'ar'],
          status: p.active ? 'ok' : 'neutral',
        }))}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {PHASES.map((p, i) => (
          <div key={i} className="space-y-3 p-4 rounded-xl bg-ink-2 border border-white/5">
            <div className={`h-3 w-3 rounded-full ${p.active ? 'bg-ochre' : 'bg-transparent border-2 border-slate-doc-2'}`} />
            <div className="font-data text-[10px] uppercase tracking-wider text-ochre">{p.phase}</div>
            <h4 className="font-display text-sm font-semibold text-white leading-snug">{p.title[lang as 'fr' | 'en' | 'ar']}</h4>
            <p className="text-[11px] text-slate-doc leading-relaxed">{p.desc[lang as 'fr' | 'en' | 'ar']}</p>
            <span className={`inline-block font-data text-[9px] uppercase px-2 py-1 rounded ${p.active ? 'bg-ochre/15 text-ochre' : 'bg-white/5 text-slate-doc-2'}`}>
              {p.status[lang as 'fr' | 'en' | 'ar']}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
