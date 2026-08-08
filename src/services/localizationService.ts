import {
  TranslationRecord,
  LanguageCode,
  GlossaryTerm,
  TranslationMemoryEntry,
  TranslationAuditLog,
  MissingKeyReport,
  LanguageCoverage,
  TranslationStatus,
} from '../types/localization';
import { SUPPORTED_LANGUAGES, INITIAL_TRANSLATIONS } from '../data/translations/dictionary';
import { INITIAL_GLOSSARY_TERMS } from '../data/translations/glossary';
import { INITIAL_TRANSLATION_MEMORY } from '../data/translations/memory';

class LocalizationService {
  private translations: TranslationRecord[] = [...INITIAL_TRANSLATIONS];
  private glossary: GlossaryTerm[] = [...INITIAL_GLOSSARY_TERMS];
  private memory: TranslationMemoryEntry[] = [...INITIAL_TRANSLATION_MEMORY];
  private auditLogs: TranslationAuditLog[] = [];
  private missingKeys: MissingKeyReport[] = [];

  constructor() {
    this.seedInitialAuditLogs();
  }

  private seedInitialAuditLogs() {
    this.auditLogs = [
      {
        id: 'LOG-001',
        timestamp: '2026-08-01 10:00:00',
        key: 'common.welcome_user',
        namespace: 'common',
        language: 'ar',
        newValue: 'مرحباً بك، {username}!',
        statusTo: 'Approved',
        userRole: 'Super Admin',
        userEmail: 'admin@nexttransit.com',
        action: 'APPROVE',
      },
      {
        id: 'LOG-002',
        timestamp: '2026-08-01 10:15:00',
        key: 'fleet.rule_r1_alert',
        namespace: 'fleet',
        language: 'ar',
        newValue: 'القاعدة R1: إيقاف طارئ إجباري (عطل تشخيصي خطير OBD-II)',
        statusTo: 'AI Generated',
        userRole: 'Localization Manager',
        userEmail: 'loc.manager@nexttransit.com',
        action: 'AI_TRANSLATE',
      },
    ];
  }

  // Primary Translation Retrieval with Fallback Chain
  public translate(
    key: string,
    params: Record<string, any> = {},
    currentLang: LanguageCode = 'fr',
    fallbackLang: LanguageCode = 'en'
  ): string {
    // 1. Try target language
    let record = this.translations.find(
      (t) => t.key === key && t.language === currentLang && t.value.trim() !== ''
    );

    // 2. Try fallback language if missing
    if (!record && currentLang !== fallbackLang) {
      record = this.translations.find(
        (t) => t.key === key && t.language === fallbackLang && t.value.trim() !== ''
      );
    }

    // 3. Try default language (fr)
    if (!record && currentLang !== 'fr' && fallbackLang !== 'fr') {
      record = this.translations.find(
        (t) => t.key === key && t.language === 'fr' && t.value.trim() !== ''
      );
    }

    // If still missing, log missing key and return fallback text or raw key
    if (!record) {
      this.recordMissingKey(key, params.defaultText || key);
      return this.interpolate(params.defaultText || key, params);
    }

    return this.interpolate(record.value, params);
  }

  // Interpolate placeholders e.g. {username}, {count}, {date}
  public interpolate(text: string, params: Record<string, any>): string {
    if (!text || Object.keys(params).length === 0) return text;
    let result = text;
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      const regex = new RegExp(`\\{${paramKey}\\}`, 'g');
      result = result.replace(regex, String(paramVal));
    });
    return result;
  }

  // Track missing key
  private recordMissingKey(key: string, defaultText: string) {
    const existing = this.missingKeys.find((m) => m.key === key);
    if (!existing) {
      const parts = key.split('.');
      const namespace = parts.length > 1 ? parts[0] : 'common';
      this.missingKeys.push({
        key,
        namespace,
        defaultText,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // Format Currency according to locale & tenant settings
  public formatCurrency(
    amount: number,
    currencyCode: string = 'DZD',
    locale: LanguageCode = 'fr'
  ): string {
    const localeMap: Record<string, string> = {
      fr: 'fr-DZ',
      ar: 'ar-DZ',
      en: 'en-US',
    };
    const targetLocale = localeMap[locale] || 'fr-DZ';

    try {
      return new Intl.NumberFormat(targetLocale, {
        style: 'currency',
        currency: currencyCode === 'DZD (DA)' || currencyCode === 'DA' ? 'DZD' : currencyCode.split(' ')[0],
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currencyCode}`;
    }
  }

  // Format Numbers
  public formatNumber(val: number, locale: LanguageCode = 'fr'): string {
    const localeMap: Record<string, string> = {
      fr: 'fr-FR',
      ar: 'ar-EG',
      en: 'en-US',
    };
    return new Intl.NumberFormat(localeMap[locale] || 'fr-FR').format(val);
  }

  // Format Dates
  public formatDate(
    dateStr: string | Date,
    locale: LanguageCode = 'fr',
    options?: Intl.DateTimeFormatOptions
  ): string {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const localeMap: Record<string, string> = {
      fr: 'fr-FR',
      ar: 'ar-DZ',
      en: 'en-US',
    };
    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Intl.DateTimeFormat(localeMap[locale] || 'fr-FR', defaultOptions).format(date);
  }

  // Get all translation records
  public getTranslations(): TranslationRecord[] {
    return [...this.translations];
  }

  // Add or Update translation
  public upsertTranslation(
    key: string,
    namespace: string,
    language: LanguageCode,
    value: string,
    status: TranslationStatus = 'Draft',
    modifiedBy: string = 'User',
    userRole: string = 'Translator'
  ): TranslationRecord {
    const index = this.translations.findIndex(
      (t) => t.key === key && t.language === language
    );

    let prevValue = '';
    let statusFrom: TranslationStatus = 'Draft';
    let record: TranslationRecord;

    if (index >= 0) {
      prevValue = this.translations[index].value;
      statusFrom = this.translations[index].status;
      record = {
        ...this.translations[index],
        value,
        status,
        version: this.translations[index].version + 1,
        lastModifiedBy: modifiedBy,
        updatedAt: new Date().toISOString().split('T')[0],
      };
      this.translations[index] = record;
    } else {
      record = {
        id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
        key,
        namespace,
        language,
        value,
        status,
        version: 1,
        lastModifiedBy: modifiedBy,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      this.translations.push(record);
    }

    // Add audit log
    this.auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      key,
      namespace,
      language,
      previousValue: prevValue || undefined,
      newValue: value,
      statusFrom,
      statusTo: status,
      userRole,
      userEmail: modifiedBy,
      action: index >= 0 ? 'UPDATE' : 'CREATE',
    });

    // Also update Translation Memory if approved
    if (status === 'Approved' && value.trim()) {
      this.updateTranslationMemory(key, namespace, language, value);
    }

    return record;
  }

  // Update status (e.g. Approve / Review)
  public updateStatus(
    id: string,
    newStatus: TranslationStatus,
    modifiedBy: string = 'User',
    userRole: string = 'Reviewer'
  ): boolean {
    const record = this.translations.find((t) => t.id === id);
    if (!record) return false;

    const oldStatus = record.status;
    record.status = newStatus;
    record.lastModifiedBy = modifiedBy;
    record.updatedAt = new Date().toISOString().split('T')[0];

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      key: record.key,
      namespace: record.namespace,
      language: record.language,
      previousValue: record.value,
      newValue: record.value,
      statusFrom: oldStatus,
      statusTo: newStatus,
      userRole,
      userEmail: modifiedBy,
      action: newStatus === 'Approved' ? 'APPROVE' : 'UPDATE',
    });

    return true;
  }

  // Bulk Approve
  public bulkApprove(ids: string[], modifiedBy: string = 'User'): number {
    let count = 0;
    ids.forEach((id) => {
      if (this.updateStatus(id, 'Approved', modifiedBy, 'Localization Manager')) {
        count++;
      }
    });
    return count;
  }

  // Update Translation Memory
  private updateTranslationMemory(
    key: string,
    namespace: string,
    targetLang: LanguageCode,
    targetText: string
  ) {
    const frRecord = this.translations.find((t) => t.key === key && t.language === 'fr');
    if (!frRecord || !frRecord.value) return;

    const existingMemory = this.memory.find(
      (m) =>
        m.sourceLang === 'fr' &&
        m.targetLang === targetLang &&
        m.sourceText.toLowerCase() === frRecord.value.toLowerCase()
    );

    if (existingMemory) {
      existingMemory.targetText = targetText;
      existingMemory.usageCount += 1;
      existingMemory.lastUsedAt = new Date().toISOString().split('T')[0];
    } else {
      this.memory.push({
        id: `TM-${Date.now()}`,
        sourceLang: 'fr',
        targetLang,
        sourceText: frRecord.value,
        targetText,
        namespace,
        usageCount: 1,
        qualityScore: 100,
        lastUsedAt: new Date().toISOString().split('T')[0],
      });
    }
  }

  // Get Glossary
  public getGlossary(): GlossaryTerm[] {
    return [...this.glossary];
  }

  public addGlossaryTerm(term: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>): GlossaryTerm {
    const newTerm: GlossaryTerm = {
      ...term,
      id: `GLOSS-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.glossary.push(newTerm);
    return newTerm;
  }

  // Get Translation Memory
  public getTranslationMemory(): TranslationMemoryEntry[] {
    return [...this.memory];
  }

  // Get Audit Logs
  public getAuditLogs(): TranslationAuditLog[] {
    return [...this.auditLogs];
  }

  // Get Missing Keys Report
  public getMissingKeysReport(): MissingKeyReport[] {
    return [...this.missingKeys];
  }

  // Compute Coverage Statistics
  public getCoverageStats(): LanguageCoverage[] {
    const allUniqueKeys = Array.from(new Set(this.translations.map((t) => t.key)));
    const totalUniqueKeys = allUniqueKeys.length || 1;

    return SUPPORTED_LANGUAGES.map((lang) => {
      const langRecords = this.translations.filter((t) => t.language === lang.code);

      const translatedCount = langRecords.filter((t) => t.value && t.value.trim() !== '').length;
      const approvedCount = langRecords.filter((t) => t.status === 'Approved').length;
      const aiGeneratedCount = langRecords.filter((t) => t.status === 'AI Generated').length;
      const missingCount = Math.max(0, totalUniqueKeys - translatedCount);

      const coveragePercent = Math.round((translatedCount / totalUniqueKeys) * 100);
      const approvalPercent = Math.round((approvedCount / totalUniqueKeys) * 100);

      return {
        code: lang.code,
        name: lang.name,
        totalKeys: totalUniqueKeys,
        translatedCount,
        approvedCount,
        aiGeneratedCount,
        missingCount,
        coveragePercent,
        approvalPercent,
      };
    });
  }

  // Export Translations as JSON or CSV
  public exportData(format: 'json' | 'csv', language?: LanguageCode): string {
    const records = language
      ? this.translations.filter((t) => t.language === language)
      : this.translations;

    if (format === 'json') {
      const structured: Record<string, Record<string, string>> = {};
      records.forEach((r) => {
        if (!structured[r.language]) structured[r.language] = {};
        structured[r.language][r.key] = r.value;
      });
      return JSON.stringify(structured, null, 2);
    } else {
      // CSV Export
      const header = 'Key,Namespace,Language,Value,Status,LastModifiedBy\n';
      const rows = records
        .map(
          (r) =>
            `"${r.key}","${r.namespace}","${r.language}","${r.value.replace(
              /"/g,
              '""'
            )}","${r.status}","${r.lastModifiedBy}"`
        )
        .join('\n');
      return header + rows;
    }
  }

  // Import JSON / CSV
  public importData(content: string, format: 'json' | 'csv', user: string = 'Admin'): number {
    let importedCount = 0;
    if (format === 'json') {
      try {
        const parsed = JSON.parse(content);
        // Expect format: { "fr": { "common.save": "Enregistrer" }, "ar": { ... } }
        Object.entries(parsed).forEach(([lang, keysObj]) => {
          if (typeof keysObj === 'object' && keysObj !== null) {
            Object.entries(keysObj as Record<string, string>).forEach(([key, val]) => {
              const namespace = key.split('.')[0] || 'common';
              this.upsertTranslation(key, namespace, lang, String(val), 'Reviewed', user);
              importedCount++;
            });
          }
        });
      } catch (e) {
        console.error('Failed to parse JSON import:', e);
      }
    } else if (format === 'csv') {
      const lines = content.split('\n');
      lines.slice(1).forEach((line) => {
        if (!line.trim()) return;
        const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
        if (matches && matches.length >= 4) {
          const clean = (str: string) => str.replace(/^,?"?|"$/g, '').replace(/""/g, '"');
          const key = clean(matches[0]);
          const namespace = clean(matches[1]);
          const lang = clean(matches[2]);
          const val = clean(matches[3]);
          if (key && lang && val) {
            this.upsertTranslation(key, namespace, lang, val, 'Reviewed', user);
            importedCount++;
          }
        }
      });
    }
    return importedCount;
  }
}

export const localizationService = new LocalizationService();
