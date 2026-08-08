import React from 'react';
import { useLocalization } from '../../context/LocalizationContext';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  ShieldCheck,
  Info,
  Sparkles,
  MapPin,
  Trophy,
  Award
} from 'lucide-react';

export interface DriverTelemetry {
  id: string;
  name: string;
  role: string;
  vehiclePlate: string;
  vehicleName: string;
  routeSector: string;
  distanceKm: number;
  harshBrakingCount: number;
  rapidAccelCount: number;
  highCorneringCount: number;
  speedingIncidents: number;
  safetyScore: number;
  status: 'Exemplary' | 'Moderate Risk' | 'High Risk';
  mechanicalImpact: string;
  lastEventTime: string;
  lastEventType: string;
  fatigueHours: number;
}

interface DriverSafetyViewProps {
  drivers: DriverTelemetry[];
  simulatedDriverId: string;
  setSimulatedDriverId: (id: string) => void;
}

export const DriverSafetyView: React.FC<DriverSafetyViewProps> = ({
  drivers,
  simulatedDriverId,
  setSimulatedDriverId
}) => {
  const { currentLanguage, dir } = useLocalization();
  const currentDriver = drivers.find((d) => d.id === simulatedDriverId) || drivers[0];
  const driverRank = [...drivers].sort((a, b) => b.safetyScore - a.safetyScore).findIndex((d) => d.id === currentDriver.id) + 1;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Driver Simulation Select Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
            {currentLanguage === 'ar' ? 'معاينة حساب السائق (محاكاة)' : currentLanguage === 'en' ? 'Simulate Driver Profile' : 'Simuler le Profil Conducteur'}
          </span>
          <p className="text-xs text-slate-500">
            {currentLanguage === 'ar' 
              ? 'بصفتك سائقاً، يمكنك عرض نقاط الأمان والتعليقات المخصصة لك فقط دون حق الوصول إلى لوحة تحكم المسؤول.' 
              : currentLanguage === 'en' 
              ? 'As a driver, you can only see your own safety scores and localized feedback. Select a profile to simulate.' 
              : 'En tant que conducteur, vous ne voyez que vos propres scores et retours personnalisés. Choisissez un profil à simuler.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            {currentLanguage === 'ar' ? 'حساب السائق:' : 'Driver Account:'}
          </label>
          <select
            value={simulatedDriverId}
            onChange={(e) => setSimulatedDriverId(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer min-w-[200px]"
          >
            {drivers.map((drv) => (
              <option key={drv.id} value={drv.id}>
                {drv.name} ({drv.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-white/10 shadow-lg space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
            <UserCheck className="h-3 w-3" />
            {currentLanguage === 'ar' ? 'بوابة السائق الخاصة' : currentLanguage === 'en' ? 'Personal Driver Portal' : 'Portail Personnel Conducteur'}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
          {currentLanguage === 'ar' ? `مرحباً بك، السائق ${currentDriver.name}` : currentLanguage === 'en' ? `Welcome back, Driver ${currentDriver.name}` : `Bienvenue, Conducteur ${currentDriver.name}`}
        </h1>
        <p className="text-xs text-slate-300 max-w-xl">
          {currentLanguage === 'ar' ? 'تتبع نقاط السلامة الفردية والتعليقات الخاصة بك من مراقبة الأسطول لمساعدتك في القيادة الوقائية الآمنة.' : currentLanguage === 'en' ? 'Track your individual safety score and personalized recommendations from fleet operations to help you practice safe defensive driving.' : 'Suivez votre score de sécurité individuel et les retours personnalisés de la régulation de flotte pour vous accompagner dans une conduite préventive.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Score Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase font-display mb-1">
              {currentLanguage === 'ar' ? 'نقاط السلامة والأمان الخاصة بك' : currentLanguage === 'en' ? 'My Safety Score' : 'Mon Score Sécurité'}
            </h3>
            <p className="text-xs text-slate-500">
              {currentLanguage === 'ar' ? 'تم احتسابها بناءً على آخر 30 يوم من القيادة ومطابقة الحساسات.' : currentLanguage === 'en' ? 'Calculated based on the past 30 days of sensor log synchronization.' : 'Calculé sur les 30 derniers jours de télémesure.'}
            </p>
          </div>

          <div className="flex flex-col items-center py-4">
            <div className="relative flex items-center justify-center">
              <div className={`h-36 w-36 rounded-full border-8 flex flex-col items-center justify-center ${
                currentDriver.safetyScore >= 85 ? 'border-emerald-500 bg-emerald-50/30' :
                currentDriver.safetyScore >= 70 ? 'border-amber-500 bg-amber-50/30' :
                'border-red-500 bg-red-50/30'
              }`}>
                <span className="text-4xl font-extrabold text-slate-900 font-data">
                  {currentDriver.safetyScore}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>
            <div className="mt-4 text-center space-y-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                currentDriver.status === 'Exemplary' ? 'bg-emerald-100 text-emerald-800' :
                currentDriver.status === 'Moderate Risk' ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                {currentDriver.status === 'Exemplary' ? (currentLanguage === 'ar' ? 'سلوك ممتاز' : 'Exemplaire') :
                 currentDriver.status === 'Moderate Risk' ? (currentLanguage === 'ar' ? 'خطر متوسط' : 'Risque Modéré') :
                 (currentLanguage === 'ar' ? 'خطر مرتفع' : 'Risque Élevé')}
              </span>

              <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-full text-xs font-extrabold shadow-2xs">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {currentLanguage === 'ar'
                    ? `الترتيب في لوحة الصدارة: #${driverRank} من ${drivers.length}`
                    : currentLanguage === 'en'
                    ? `Leaderboard Rank: #${driverRank} of ${drivers.length}`
                    : `Rang au classement : #${driverRank} sur ${drivers.length}`}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-500">
              {currentLanguage === 'ar' ? 'الحالة: ملتزم بمعايير السلامة' : currentLanguage === 'en' ? 'Status: Defensive Driving Compliant' : 'Statut : Conforme à la conduite défensive'}
            </p>
          </div>
        </div>

        {/* Vehicle and Route Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase font-display">
            {currentLanguage === 'ar' ? 'المركبة والمسار المعين' : currentLanguage === 'en' ? 'Assigned Vehicle & Route' : 'Véhicule & Trajet Affecté'}
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{currentLanguage === 'ar' ? 'المركبة الحالية' : 'Vehicle'}</span>
                <span className="text-sm font-bold text-slate-800">{currentDriver.vehicleName}</span>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {currentDriver.vehiclePlate}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'منطقة العمل / الخط:' : 'Route Sector:'}</span>
                <span className="font-semibold text-slate-800 text-right">{currentDriver.routeSector}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'المسافة المقطوعة:' : 'Distance driven:'}</span>
                <span className="font-semibold text-slate-800 font-data">{currentDriver.distanceKm.toLocaleString()} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'آخر تحديث للحساسات:' : 'Last Sensor Update:'}</span>
                <span className="font-semibold text-slate-800">{currentDriver.lastEventTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'نوع الحدث الأخير:' : 'Last Event Type:'}</span>
                <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] max-w-[180px] truncate text-right">{currentDriver.lastEventType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks & Mechanical Impact Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase font-display mb-1">
              {currentLanguage === 'ar' ? 'ملاحظات الأثر الميكانيكي' : currentLanguage === 'en' ? 'Mechanical Wear & Correlation Feedback' : 'Retour d\'Impact Mécanique & Usure'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {currentLanguage === 'ar' ? 'كيف تؤثر عادات القيادة الفردية الخاصة بك على الأجزاء الصلبة والفرامل والمحرك.' : currentLanguage === 'en' ? 'How your physical driving habits map directly to fleet physical component degradation.' : 'Comment vos habitudes impactent directement l\'usure réelle du matériel.'}
            </p>

            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                <Info className="h-4 w-4 shrink-0" />
                <span>{currentLanguage === 'ar' ? 'تقرير فني من إدارة التشغيل' : currentLanguage === 'en' ? 'Operations Technical Analysis' : 'Analyse Technique Opérationnelle'}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-700 italic">
                "{currentDriver.mechanicalImpact}"
              </p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <strong>Rule R6 Check:</strong> Telemetry checks are cross-referenced with your physical checks to guarantee parts are replaced before any on-road failure occurs.
          </div>
        </div>
      </div>

      {/* Action Plan & Coaching Remarks Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
            <span>{currentLanguage === 'ar' ? 'التوجيهات والتدابير الوقائية الموصى بها لك' : currentLanguage === 'en' ? 'My Action Plan & Personal Coaching Plan' : 'Mes Actions & Recommandations de Conduite'}</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-bold uppercase">{currentLanguage === 'ar' ? 'خطة عمل مخصصة' : 'Personal Action Plan'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase">{currentLanguage === 'ar' ? 'إجراءات تحسين الأداء المطلوبة :' : 'Performance corrective requirements :'}</h4>
            <div className="space-y-3">
              {currentDriver.safetyScore < 70 ? (
                <>
                  <div className="flex items-start gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="font-bold text-red-800 block mb-1">
                        {currentLanguage === 'ar' ? 'خطة الحد من الكبح الحاد' : 'Reduce Harsh Deceleration'}
                      </strong>
                      <span className="text-red-700 leading-relaxed">
                        {currentLanguage === 'ar' 
                          ? `تم تسجيل ${currentDriver.harshBrakingCount} عملية كبح فجائي خطيرة. يرجى الحفاظ على مسافة أمان أكبر لتفادي الغرامات وتآكل الأقمشة.` 
                          : `You have logged ${currentDriver.harshBrakingCount} harsh braking instances. Please maintain a larger gap with preceding vehicles to lower emergency braking.`
                        }
                      </span>
                    </div>
                  </div>

                  {currentDriver.fatigueHours > 4.5 && (
                    <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="font-bold text-amber-800 block mb-1">
                          {currentLanguage === 'ar' ? 'إلزامية فترات الراحة (قانون الأمن الوطني)' : 'Mandatory Rest Periods Required'}
                        </strong>
                        <span className="text-amber-700 leading-relaxed">
                          {currentLanguage === 'ar' 
                            ? `لقد سجلت ${currentDriver.fatigueHours} ساعات متواصلة دون راحة. تنص لائحة السلامة على التوقف لمدة 45 دقيقة كاملة بعد كل 4.5 ساعات عمل.` 
                            : `Continuous driving logged at ${currentDriver.fatigueHours} hours. Regulations strictly mandate a 45-minute pause after 4.5 hours.`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : currentDriver.safetyScore < 85 ? (
                <>
                  <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <Zap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="font-bold text-amber-800 block mb-1">
                        {currentLanguage === 'ar' ? 'تحسين تسارع المحرك (RPM)' : 'Moderate Engine RPM Surges'}
                      </strong>
                      <span className="text-amber-700 leading-relaxed">
                        {currentLanguage === 'ar' 
                          ? `لديك ${currentDriver.rapidAccelCount} تسارع فجائي. القيادة الهادئة تقلل من معدل استهلاك الوقود الإضافي المقدر بـ +14%.` 
                          : `You logged ${currentDriver.rapidAccelCount} sudden RPM surges. Smoother acceleration cuts fuel overconsumption up to +14%.`
                        }
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="font-bold text-emerald-800 block mb-1">
                      {currentLanguage === 'ar' ? 'تهانينا: قيادة وقائية مثالية' : 'Outstanding Driving Record'}
                    </strong>
                    <span className="text-emerald-700 leading-relaxed">
                      {currentLanguage === 'ar' 
                        ? 'أنت ملتزم تماماً بالقيادة الدفاعية والآمنة. أسلوبك يحسن من العمر الافتراضي للمركبة ومعدلات الأمان.' 
                        : 'You are fully compliant with defensive driving. Your smooth telemetry preserves parts and increases road safety.'
                      }
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <strong className="font-bold text-slate-800 block mb-1">
                    {currentLanguage === 'ar' ? 'قواعد السلامة الخمس للأسطول' : 'General Fleet Safety Mandates'}
                  </strong>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-500">
                    <li>{currentLanguage === 'ar' ? 'الحد الأقصى للسرعة في المناطق الحضرية هو 60 كم/سا.' : 'Urban zones maximum speed 60 km/h.'}</li>
                    <li>{currentLanguage === 'ar' ? 'تجنب المنعطفات السريعة وحافظ على ثبات الأحمال.' : 'Avoid high lateral G cornering.'}</li>
                    <li>{currentLanguage === 'ar' ? 'فترة راحة إلزامية 45 دقيقة بعد 4.5 ساعات.' : 'Mandatory 45 min pause after 4.5 hours.'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase">{currentLanguage === 'ar' ? 'تفاصيل سجل الأحداث الأخيرة الحساسة :' : 'Recent individual event highlights :'}</h4>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-3.5 text-xs text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                <span className="font-semibold text-slate-900">{currentLanguage === 'ar' ? 'المؤشر الشخصي' : 'Personal Indicator'}</span>
                <span className="font-semibold text-slate-900">{currentLanguage === 'ar' ? 'العدد المسجل' : 'Logged Value'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'مرات الفرملة القاسية / الكبح الحاد (>0.4g)' : 'Harsh braking instances (>0.4g)'}</span>
                <span className={`font-bold font-data ${currentDriver.harshBrakingCount > 10 ? 'text-red-600' : 'text-slate-800'}`}>{currentDriver.harshBrakingCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'مرات التسارع الفجائي المضر' : 'Rapid acceleration spikes'}</span>
                <span className="font-bold font-data text-slate-800">{currentDriver.rapidAccelCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'تجاوزات السرعة المسجلة' : 'Speeding incidents'}</span>
                <span className={`font-bold font-data ${currentDriver.speedingIncidents > 0 ? 'text-red-600' : 'text-slate-800'}`}>{currentDriver.speedingIncidents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'المنعطفات القاسية وحيود التوازن (>0.35g)' : 'High G-Force cornering'}</span>
                <span className="font-bold font-data text-slate-800">{currentDriver.highCorneringCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{currentLanguage === 'ar' ? 'ساعات القيادة المستمرة دون راحة' : 'Hours without pause'}</span>
                <span className={`font-bold font-data ${currentDriver.fatigueHours > 4.5 ? 'text-red-600' : 'text-slate-800'}`}>{currentDriver.fatigueHours} h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
