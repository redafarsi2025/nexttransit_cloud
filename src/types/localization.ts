export type LanguageCode = 'fr' | 'ar' | 'en' | string;
export type TextDirection = 'ltr' | 'rtl';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir: TextDirection;
  flag: string;
  isDefault?: boolean;
  enabled: boolean;
}

export type TranslationStatus = 'Draft' | 'AI Generated' | 'Reviewed' | 'Approved';

export type TranslationNamespace =
  | 'common'
  | 'auth'
  | 'dashboard'
  | 'fleet'
  | 'maintenance'
  | 'inventory'
  | 'finance'
  | 'crm'
  | 'settings'
  | 'localization';

export interface TranslationRecord {
  id: string;
  key: string;
  namespace: TranslationNamespace | string;
  language: LanguageCode;
  value: string;
  description?: string;
  context?: string;
  status: TranslationStatus;
  version: number;
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  namespace: TranslationNamespace | string;
  definition: string;
  translations: Record<LanguageCode, string>;
  status: 'Approved' | 'Draft';
  forbidAutoTranslate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationMemoryEntry {
  id: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  sourceText: string;
  targetText: string;
  namespace: string;
  usageCount: number;
  qualityScore: number;
  lastUsedAt: string;
}

export interface TranslationAuditLog {
  id: string;
  timestamp: string;
  key: string;
  namespace: string;
  language: LanguageCode;
  previousValue?: string;
  newValue: string;
  statusFrom?: TranslationStatus;
  statusTo: TranslationStatus;
  userRole: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'AI_TRANSLATE' | 'APPROVE' | 'REJECT' | 'DELETE' | 'IMPORT';
}

export interface MissingKeyReport {
  key: string;
  namespace: string;
  detectedInComponent?: string;
  defaultText?: string;
  detectedAt: string;
}

export type LocalizationRole =
  | 'Super Admin'
  | 'Localization Manager'
  | 'Translator'
  | 'Reviewer'
  | 'Viewer';

export interface LanguageCoverage {
  code: LanguageCode;
  name: string;
  totalKeys: number;
  translatedCount: number;
  approvedCount: number;
  aiGeneratedCount: number;
  missingCount: number;
  coveragePercent: number;
  approvalPercent: number;
}
