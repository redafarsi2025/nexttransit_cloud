import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  LanguageCode,
  TextDirection,
  LanguageInfo,
  TranslationRecord,
  GlossaryTerm,
  TranslationMemoryEntry,
  TranslationAuditLog,
  MissingKeyReport,
  LanguageCoverage,
  TranslationStatus,
  LocalizationRole,
} from '../types/localization';
import { SUPPORTED_LANGUAGES } from '../data/translations/dictionary';
import { localizationService } from '../services/localizationService';
import { aiTranslateText } from '../services/geminiTranslationService';

interface LocalizationContextType {
  currentLanguage: LanguageCode;
  dir: TextDirection;
  setLanguage: (lang: LanguageCode) => void;
  supportedLanguages: LanguageInfo[];
  t: (key: string, params?: Record<string, any>, fallbackText?: string) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  formatNumber: (val: number) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  translations: TranslationRecord[];
  glossary: GlossaryTerm[];
  memory: TranslationMemoryEntry[];
  auditLogs: TranslationAuditLog[];
  missingKeys: MissingKeyReport[];
  coverageStats: LanguageCoverage[];
  currentLocalizationRole: LocalizationRole;
  setLocalizationRole: (role: LocalizationRole) => void;
  updateTranslation: (
    key: string,
    namespace: string,
    language: LanguageCode,
    value: string,
    status?: TranslationStatus
  ) => void;
  approveTranslation: (id: string) => void;
  bulkApproveTranslations: (ids: string[]) => number;
  aiTranslateSingleKey: (key: string, targetLang: LanguageCode) => Promise<void>;
  aiTranslateNamespaceKeys: (namespace: string, targetLang: LanguageCode) => Promise<number>;
  addGlossaryTerm: (term: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>) => void;
  importTranslations: (content: string, format: 'json' | 'csv') => number;
  exportTranslations: (format: 'json' | 'csv', language?: LanguageCode) => string;
  refreshData: () => void;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>('fr');
  const [dir, setDir] = useState<TextDirection>('ltr');
  const [currentLocalizationRole, setLocalizationRole] = useState<LocalizationRole>('Super Admin');

  // Trigger re-renders when translations update
  const [, setTick] = useState(0);
  const refreshData = () => setTick((t) => t + 1);

  // Set Language and update DOM direction for RTL support
  const setLanguage = (lang: LanguageCode) => {
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
    setCurrentLanguageState(langObj.code);
    setDir(langObj.dir);

    // Update HTML root element direction & lang attributes
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', langObj.dir);
      document.documentElement.setAttribute('lang', langObj.code);
    }
  };

  useEffect(() => {
    // Initial direction set
    setLanguage('fr');
  }, []);

  // Translation Function
  const t = (key: string, params: Record<string, any> = {}, fallbackText?: string): string => {
    return localizationService.translate(
      key,
      { ...params, defaultText: fallbackText },
      currentLanguage,
      'en'
    );
  };

  const formatCurrency = (amount: number, currencyCode?: string): string => {
    return localizationService.formatCurrency(amount, currencyCode, currentLanguage);
  };

  const formatNumber = (val: number): string => {
    return localizationService.formatNumber(val, currentLanguage);
  };

  const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
    return localizationService.formatDate(date, currentLanguage, options);
  };

  const updateTranslation = (
    key: string,
    namespace: string,
    language: LanguageCode,
    value: string,
    status: TranslationStatus = 'Draft'
  ) => {
    localizationService.upsertTranslation(
      key,
      namespace,
      language,
      value,
      status,
      'admin@nexttransit.com',
      currentLocalizationRole
    );
    refreshData();
  };

  const approveTranslation = (id: string) => {
    localizationService.updateStatus(id, 'Approved', 'admin@nexttransit.com', currentLocalizationRole);
    refreshData();
  };

  const bulkApproveTranslations = (ids: string[]): number => {
    const count = localizationService.bulkApprove(ids, 'admin@nexttransit.com');
    refreshData();
    return count;
  };

  const aiTranslateSingleKey = async (key: string, targetLang: LanguageCode) => {
    const frRecord = localizationService
      .getTranslations()
      .find((t) => t.key === key && t.language === 'fr');
    const sourceText = frRecord ? frRecord.value : key;
    const namespace = key.split('.')[0] || 'common';

    const res = await aiTranslateText({
      sourceText,
      sourceLang: 'fr',
      targetLang,
      key,
      namespace,
      glossaryTerms: localizationService.getGlossary(),
    });

    localizationService.upsertTranslation(
      key,
      namespace,
      targetLang,
      res.translatedText,
      'AI Generated',
      'Gemini AI Agent',
      'AI Translator'
    );
    refreshData();
  };

  const aiTranslateNamespaceKeys = async (
    namespace: string,
    targetLang: LanguageCode
  ): Promise<number> => {
    const allRecords = localizationService.getTranslations();
    const frRecordsInNs = allRecords.filter((t) => t.namespace === namespace && t.language === 'fr');

    let count = 0;
    for (const frRec of frRecordsInNs) {
      const existing = allRecords.find((t) => t.key === frRec.key && t.language === targetLang);
      if (!existing || existing.status !== 'Approved') {
        const res = await aiTranslateText({
          sourceText: frRec.value,
          sourceLang: 'fr',
          targetLang,
          key: frRec.key,
          namespace,
          glossaryTerms: localizationService.getGlossary(),
        });

        localizationService.upsertTranslation(
          frRec.key,
          namespace,
          targetLang,
          res.translatedText,
          'AI Generated',
          'Gemini AI Agent',
          'AI Translator'
        );
        count++;
      }
    }
    refreshData();
    return count;
  };

  const addGlossaryTerm = (term: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>) => {
    localizationService.addGlossaryTerm(term);
    refreshData();
  };

  const importTranslations = (content: string, format: 'json' | 'csv'): number => {
    const count = localizationService.importData(content, format, 'admin@nexttransit.com');
    refreshData();
    return count;
  };

  const exportTranslations = (format: 'json' | 'csv', language?: LanguageCode): string => {
    return localizationService.exportData(format, language);
  };

  return (
    <LocalizationContext.Provider
      value={{
        currentLanguage,
        dir,
        setLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
        t,
        formatCurrency,
        formatNumber,
        formatDate,
        translations: localizationService.getTranslations(),
        glossary: localizationService.getGlossary(),
        memory: localizationService.getTranslationMemory(),
        auditLogs: localizationService.getAuditLogs(),
        missingKeys: localizationService.getMissingKeysReport(),
        coverageStats: localizationService.getCoverageStats(),
        currentLocalizationRole,
        setLocalizationRole,
        updateTranslation,
        approveTranslation,
        bulkApproveTranslations,
        aiTranslateSingleKey,
        aiTranslateNamespaceKeys,
        addGlossaryTerm,
        importTranslations,
        exportTranslations,
        refreshData,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
