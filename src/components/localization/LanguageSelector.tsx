import React, { useState } from 'react';
import { useLocalization } from '../../context/LocalizationContext';
import { Globe, ChevronDown, Check, Sparkles } from 'lucide-react';
import { LanguageCode } from '../../types/localization';

export const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage, supportedLanguages, dir } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);

  const activeLang = supportedLanguages.find((l) => l.code === currentLanguage) || supportedLanguages[0];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs hover:border-slate-300 transition cursor-pointer"
        title="Change Interface Language & RTL Layout"
      >
        <span className="text-base leading-none">{activeLang.flag}</span>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-slate-900 leading-none flex items-center gap-1">
            {activeLang.nativeName}
            {activeLang.dir === 'rtl' && (
              <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                RTL
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            {activeLang.code.toUpperCase()} • Instant Translate
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white p-2 shadow-xl border border-slate-200 z-50 animate-in fade-in-0 zoom-in-95">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-600" />
                  Language & Localization
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                  Fallback Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Instant switching with fallback: Arabic → English → French.
              </p>
            </div>

            <div className="space-y-1">
              {supportedLanguages.map((lang) => {
                const isSelected = currentLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as LanguageCode);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none">{lang.flag}</span>
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          {lang.name} ({lang.nativeName})
                          {lang.dir === 'rtl' && (
                            <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                              RTL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {lang.isDefault ? 'Default Primary' : 'Enterprise Supported'}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                Gemini AI Realtime Translation Enabled
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
