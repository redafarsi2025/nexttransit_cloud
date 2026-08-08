import React from 'react';
import { Award } from 'lucide-react';

interface LogosSectionProps {
  currentLanguage: string;
}

export const LogosSection: React.FC<LogosSectionProps> = ({ currentLanguage }) => {
  const isAr = currentLanguage === 'ar';
  
  const partnerTitle = isAr
    ? 'مشروع موجه وموثق بدقة'
    : currentLanguage === 'en'
    ? 'Academically Supervised & Rigorously Documented'
    : 'Un projet encadré et rigoureusement documenté';

  const certTitle = isAr
    ? 'معايير الجودة والمنهجية'
    : currentLanguage === 'en'
    ? 'Methodology & Data Quality Standards'
    : 'Normes de Méthodologie & Qualité';

  const credibility = [
    { name: 'ESGEN Incubator', sector: 'Structure d\'accompagnement 2025/2026' },
    { name: 'Pr. Rafika Tabti', sector: 'Encadrement BI & IT' },
    { name: 'Pr. Leila Douidene', sector: 'Encadrement Logistique & Supply Chain' },
    { name: 'ONS / joradp.dz', sector: 'Données de marché sourcées et vérifiables' },
  ];

  const stampBadges = [
    { code: 'VÉRIFIÉ', cls: 'border-2 border-verified text-verified -rotate-3' },
    { code: 'ESTIMÉ', cls: 'border-2 border-estime text-estime rotate-2' },
    { code: 'BENCHMARK', cls: 'border-2 border-benchmark text-benchmark -rotate-1' },
    { code: 'SCF READY', cls: 'border-2 border-ochre text-ochre rotate-1' },
  ];

  return (
    <div className="py-8 border border-white/10 bg-ink-2 rounded-3xl space-y-8 text-white">
      <div className="text-center space-y-1">
        <span className="text-[10px] uppercase text-ochre font-data font-bold tracking-wider block">
          {isAr ? 'الثقة والشفافية' : currentLanguage === 'en' ? 'TRUST & TRANSPARENCY' : 'CONFIANCE & TRANSPARENCE'}
        </span>
        <h3 className="text-xs font-display font-medium text-slate-doc">
          {partnerTitle}
        </h3>
      </div>

      {/* Credibility Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 items-center">
        {credibility.map((co, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-ink-3 border border-white/10 hover:border-ochre/40 transition duration-200 text-center"
          >
            <span className="font-display font-semibold text-white tracking-tight text-xs block">
              {co.name}
            </span>
            <span className="text-[9px] text-slate-doc font-data mt-1">
              {co.sector}
            </span>
          </div>
        ))}
      </div>

      {/* Audit Stamps Row */}
      <div className="flex flex-wrap items-center justify-center gap-6 px-6 pt-4 border-t border-white/10">
        <span className="text-[10px] font-data font-semibold text-slate-doc uppercase flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-ochre" />
          {certTitle}:
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {stampBadges.map((badge, i) => (
            <span
              key={i}
              className={`font-data text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-transparent ${badge.cls}`}
            >
              {badge.code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

