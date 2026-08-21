import React, { useState } from 'react';
import { 
  Play, ShieldCheck, Activity, Wrench, AlertTriangle, 
  CheckCircle2, Server, Terminal, ArrowRight 
} from 'lucide-react';

interface DemoSectionProps {
  currentLanguage: string;
}

export const DemoSection: React.FC<DemoSectionProps> = ({ currentLanguage }) => {
  const isAr = currentLanguage === 'ar';
  const [activeWorkflow, setActiveWorkflow] = useState<string>('critical-alert');

  const heading = isAr
    ? 'محاكاة تفاعلية لسير العمل والقرارات'
    : currentLanguage === 'en'
    ? 'Interactive Workflow & Dashboard Simulator'
    : 'Simulateur de Décisions & Workflows';

  const subheading = isAr
    ? 'شاهد كيف يتفاعل النظام مع الأعطال في الوقت الفعلي ويقوم بمطابقة الفواتير وحساب استهلاك الوقود.'
    : currentLanguage === 'en'
    ? 'Observe how NextTransit handles live diagnostic failures, auto-reconciles driver reports, and manages budgets.'
    : 'Découvrez comment notre moteur de décision traite les pannes en temps réel, ajuste l\'inventaire et sécurise vos marges.';

  const workflows = [
    {
      id: 'critical-alert',
      label: isAr ? 'الإيقاف الطارئ' : currentLanguage === 'en' ? 'Emergency Safety Stop' : 'Arrêt de Sécurité Urgent',
      title: isAr ? 'سير العمل: كشف الأعطال الحرجة OBD-II' : currentLanguage === 'en' ? 'Workflow: Critical OBD-II Fault Tracing' : 'Flux : Alerte Diagnostic Critique OBD-II',
      steps: isAr
        ? [
            { text: 'شاحنة مرسيدس Actros ترسل كود خطأ حرج (ضغظ زيت الفرامل منخفض) عبر Mobilis 4G.', time: '12:00:01' },
            { text: 'النظام يفعل قاعدة السلامة فوراً: تغيير حالة الشاحنة إلى "غير آمنة / حمراء".', time: '12:00:02' },
            { text: 'سحب تلقائي للشاحنة من جدول رحلة باتجاه قسنطينة غداً لتفادي الخطر.', time: '12:00:03' },
            { text: 'إنشاء أمر صيانة فوري وحجز فحمات الفرامل المناسبة من المخزون بموجب القاعدة R3.', time: '12:00:05' },
          ]
        : [
            { text: 'Heavy truck (Actros 3340) triggers an OBD active code (low brake pressure) in Atlas mountain range.', time: '12:00:01' },
            { text: 'The Decision Engine activates instantly, marking the vehicle status as Unsafe / Red.', time: '12:00:02' },
            { text: 'System blocks vehicle from scheduled departure to Constantine tomorrow; dispatcher is alerted.', time: '12:00:03' },
            { text: 'Maintenance work order created; required brake pads are locked in inventory under R3.', time: '12:00:05' },
          ],
      statusText: 'Safety Rule - Enforced Successfully',
      statusColor: 'text-red-600 bg-red-50 border-red-200',
    },
    {
      id: 'r6-audit',
      label: isAr ? 'بلاغات السائقين R6' : currentLanguage === 'en' ? 'R6 Driver Audit' : 'Réconciliation R6',
      title: isAr ? 'سير العمل: مطابقة بلاغات السائقين الميكانيكية' : currentLanguage === 'en' ? 'Workflow: Non-Electronic Mechanical Incidents' : 'Flux : Rapport d\'Incident Chauffeur non-OBD',
      steps: isAr
        ? [
            { text: 'السائق يسجل بلاغ اهتزاز شديد بالفرامل عبر واجهة الهاتف الذكي.', time: '14:30:00' },
            { text: 'النظام يتحقق تلقائياً من أكواد OBD-II الإلكترونية الحالية: لا يوجد رمز خطأ.', time: '14:30:02' },
            { text: 'تفعيل تلقائي للقاعدة R6: إنشاء أمر عمل تحقيق ميكانيكي لقطع الشك باليقين.', time: '14:30:04' },
            { text: 'توجيه الشاحنة للفحص اليدوي في الورشة قبل المغادرة في الرحلة القادمة.', time: '14:30:05' },
          ]
        : [
            { text: 'Driver logs manual report of severe brake vibrations on mobile inspection tool.', time: '14:30:00' },
            { text: 'NextTransit runs immediate telemetry check; no electronic fault code is reported by OBD.', time: '14:30:02' },
            { text: 'R6 Rule initiates an automated investigation task to detect non-electronic wear.', time: '14:30:04' },
            { text: 'Vehicle is rerouted to the physical workshop queue for hand-on inspection.', time: '14:30:05' },
          ],
      statusText: 'R6 - Mechanical Audit Opened',
      statusColor: 'text-orange-600 bg-orange-50 border-orange-200',
    },
    {
      id: 'r3-stock',
      label: isAr ? 'حجز المشتريات R3' : currentLanguage === 'en' ? 'R3 Stock Reservation' : 'Approvisionnement R3',
      title: isAr ? 'سير العمل: حجز مخزن قطع الغيار الآلي' : currentLanguage === 'en' ? 'Workflow: Low Stock & Procurement triggers' : 'Flux : Réservation de Pièces & Alerte Re-order',
      steps: isAr
        ? [
            { text: 'الميكانيكي يحدد قطعة (فيلتر هواء صحراوي) لأمر صيانة شاحنة بحاسي مسعود.', time: '09:15:00' },
            { text: 'القاعدة R3 تفعل فوراً: حجز 1 قطعة فيلتر في المستودع وتغيير حالته إلى "محجوز".', time: '09:15:02' },
            { text: 'الكمية المتوفرة تنخفض عن الحد الأدنى للأمان (أقل من 5 قطع).', time: '09:15:03' },
            { text: 'المساعد الذكي يولد فوراً مسودة طلب شراء وإرسالها لمدير المشتريات للموافقة.', time: '09:15:05' },
          ]
        : [
            { text: 'Mechanic requests specialized air filter for work order on deep desert truck.', time: '09:15:00' },
            { text: 'R3 rule locks 1 item in central warehouse and marks status as Reserved.', time: '09:15:02' },
            { text: 'Physical stock levels fall below safety buffer threshold (less than 5 pieces remaining).', time: '09:15:03' },
            { text: 'AI automatically drafts a supplier purchase order (PO) in DZD for procurement approval.', time: '09:15:05' },
          ],
      statusText: 'R3 - Stock Safety Requisitioned',
      statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  ];

  const currentWf = workflows.find(w => w.id === activeWorkflow) || workflows[0];

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <span className="text-[10px] uppercase text-ochre font-extrabold tracking-wider block">
          {isAr ? 'بيئة تشغيلية تفاعلية' : currentLanguage === 'en' ? 'LIVE DEMO SIMULATOR' : 'WORKFLOWS EN TEMPS RÉEL'}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-doc leading-relaxed">
          {subheading}
        </p>
      </div>

      {/* Tabs of workflows */}
      <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
        {workflows.map((wf) => (
          <button
            key={wf.id}
            onClick={() => setActiveWorkflow(wf.id)}
            className={`px-3 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
              activeWorkflow === wf.id
                ? 'border-ochre bg-ochre/15 text-ochre shadow-md shadow-amber-500/10'
                : 'border-white/10 bg-[#101726] text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {wf.label}
          </button>
        ))}
      </div>

      {/* Workflow Simulation Terminal Container */}
      <div className="rounded-3xl border border-white/10 bg-slate-950 text-slate-300 p-5 sm:p-6 shadow-lg max-w-3xl mx-auto font-mono text-xs">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-[10px] text-slate-500 font-bold ml-2">NextTransit Moteur Décisionnel CLI</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${currentWf.statusColor}`}>
            {currentWf.statusText}
          </span>
        </div>

        {/* Workflow Title */}
        <div className="text-white font-bold text-xs sm:text-sm mb-4">
          {currentWf.title}
        </div>

        {/* Terminal Steps */}
        <div className="space-y-3 pt-1">
          {currentWf.steps.map((st, i) => (
            <div key={i} className="flex gap-3 leading-relaxed items-start">
              <span className="text-slate-600 shrink-0">[{st.time}]</span>
              <span className="text-ochre font-bold shrink-0">➜</span>
              <span className="text-slate-100 flex-1">{st.text}</span>
            </div>
          ))}
        </div>

        {/* Terminal Success Banner */}
        <div className="mt-6 p-3 bg-ochre/10 rounded-xl border border-ochre/30 text-[11px] text-ochre flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-ochre shrink-0" />
            <span>{isAr ? 'تم التحقق وتطبيق القوانين بنجاح' : currentLanguage === 'en' ? 'Telemetry rules reconciled with 0 execution lag.' : 'Règles appliquées et comptabilité consolidée.'}</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-bold">100% OK</span>
        </div>

      </div>
    </div>
  );
};
