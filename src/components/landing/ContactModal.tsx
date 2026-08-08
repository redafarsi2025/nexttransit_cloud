import React, { useState } from 'react';
import { Calendar, Clock, X, CheckCircle2, Send, Phone } from 'lucide-react';

interface ContactModalProps {
  onClose: () => void;
  currentLanguage: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({ onClose, currentLanguage }) => {
  const isAr = currentLanguage === 'ar';
  const [step, setStep] = useState<'form' | 'success'>('form');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('10:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, we would submit to an API or database.
    // We will simulate a perfect success state.
    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-950">
                {isAr ? 'احجز عرضاً تجريبياً حياً ومخصصاً لشركتك' : currentLanguage === 'en' ? 'Book a Dedicated Live Product Demo' : 'Prendre Rendez-vous Démo'}
              </h3>
              <p className="text-xs text-slate-500 leading-normal">
                {isAr 
                  ? 'سيتواصل معك مهندس مبيعات لوجستي لمناقشة أسطولك وصيانة الورشة وتطبيق قوانين التشغيل.' 
                  : currentLanguage === 'en' 
                  ? 'A fleet specialist will reach out to analyze your operations and demonstrate decision formulas live.' 
                  : 'Un expert analysera votre flotte, l\'atelier, les stocks et vous démontrera nos formules décisionnelles en direct.'}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase block">{isAr ? 'الاسم واللقب' : 'Nom & Prénom'}</label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'أحمد بن علي' : 'Ex: Karim Benali'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-hidden transition"
                />
              </div>

              {/* Company */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase block">{isAr ? 'الشركة / المؤسسة' : 'Entreprise'}</label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'كوسيدر للأشغال العمومية' : 'Ex: Cosider BTP'}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-hidden transition"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block">{isAr ? 'رقم الهاتف' : 'N° Téléphone'}</label>
                  <input
                    type="tel"
                    required
                    placeholder="0550 00 00 00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-hidden transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block">{isAr ? 'البريد الإلكتروني' : 'Adresse Email'}</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@entreprise.dz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-hidden transition"
                  />
                </div>
              </div>

              {/* Booking Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-indigo-500" />
                    <span>{isAr ? 'تاريخ الموعد المفصل' : 'Date souhaitée'}</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-hidden transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block flex items-center gap-1">
                    <Clock className="h-3 w-3 text-indigo-500" />
                    <span>{isAr ? 'الوقت المفضل' : 'Heure souhaitée'}</span>
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-hidden transition"
                  >
                    <option value="09:00">09:00 (Matin)</option>
                    <option value="10:30">10:30 (Matin)</option>
                    <option value="13:30">13:30 (Après-midi)</option>
                    <option value="15:00">15:00 (Après-midi)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition duration-200 mt-2 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isAr ? 'تأكيد الحجز والتواصل' : 'Confirmer le Rendez-vous'}</span>
            </button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-950">
                {isAr ? 'تم تسجيل طلبك بنجاح!' : 'Votre demande a été enregistrée !'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr 
                  ? `شكراً لك ${name}. تم حجز موعد مبدئي في تاريخ ${preferredDate} على الساعة ${preferredTime}. سيتصل بك فريقنا على الرقم ${phone} لتأكيد الرابط.` 
                  : `Merci ${name}. Votre rendez-vous préliminaire est enregistré pour le ${preferredDate} à ${preferredTime}. Un spécialiste vous contactera au ${phone} sous 2 heures.`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold transition duration-150 cursor-pointer"
            >
              {isAr ? 'إغلاق النافذة' : 'Fermer'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
