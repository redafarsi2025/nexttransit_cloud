import { LanguageCode, GlossaryTerm } from '../types/localization';
import { INITIAL_TRANSLATIONS } from '../data/translations/dictionary';
import lexiconData from '../data/translations/technicalLexicon.json';

// Load externalized lexicon and phrases
const TECHNICAL_LEXICON: Record<string, { en: string; ar: string }> = lexiconData.technicalLexicon;
const ENTERPRISE_PHRASES: Record<string, { en: string; ar: string }> = lexiconData.enterprisePhrases;

export function freeTranslateText(
  sourceText: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  key?: string,
  glossaryTerms: GlossaryTerm[] = []
): string {
  if (!sourceText || typeof sourceText !== 'string') return '';
  const trimmedText = sourceText.trim();

  // If source and target are the same, return as is
  if (sourceLang === targetLang) {
    return sourceText;
  }

  // 1. Check exact key in local storage / memory / INITIAL_TRANSLATIONS first!
  if (key) {
    const matchedRecord = INITIAL_TRANSLATIONS.find(
      (t) => t.key === key && t.language === targetLang
    );
    if (matchedRecord && matchedRecord.value) {
      return matchedRecord.value;
    }
  }

  // 2. Check if the exact text matches a known dictionary key
  const matchByValue = INITIAL_TRANSLATIONS.find(
    (t) => t.language === sourceLang && t.value.toLowerCase() === trimmedText.toLowerCase()
  );
  if (matchByValue) {
    const targetMatch = INITIAL_TRANSLATIONS.find(
      (t) => t.key === matchByValue.key && t.language === targetLang
    );
    if (targetMatch && targetMatch.value) {
      return targetMatch.value;
    }
  }

  // 3. Check exact Enterprise Phrases
  if (ENTERPRISE_PHRASES[trimmedText]) {
    const val = ENTERPRISE_PHRASES[trimmedText];
    if (targetLang === 'ar') return val.ar;
    if (targetLang === 'en') return val.en;
  }

  // Find dynamic phrase matches (case-insensitive)
  for (const [fText, tObj] of Object.entries(ENTERPRISE_PHRASES)) {
    if (trimmedText.toLowerCase() === fText.toLowerCase()) {
      if (targetLang === 'ar') return tObj.ar;
      if (targetLang === 'en') return tObj.en;
    }
  }

  // 4. Apply Glossary Rules
  let translated = trimmedText;
  if (glossaryTerms && glossaryTerms.length > 0) {
    // Sort terms by length descending to replace larger phrases first
    const sortedGlossary = [...glossaryTerms].sort((a, b) => b.term.length - a.term.length);
    for (const term of sortedGlossary) {
      const srcTerm = term.translations[sourceLang] || term.term;
      const tgtTerm = term.translations[targetLang] || term.term;

      if (srcTerm && srcTerm.length > 2) {
        // Safe regex replacement (case insensitive)
        const escaped = srcTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        translated = translated.replace(regex, tgtTerm);
      }
    }
  }

  // If glossary fully handled it, return
  if (translated !== trimmedText) {
    return translated;
  }

  // 5. Smart Token Substitution (Heuristic Machine Translation Simulator)
  const placeholders: string[] = [];
  let tokenized = translated;
  
  // Match curly-brace placeholders
  const placeholderRegex = /\{[a-zA-Z0-9_]+\}/g;
  let match;
  while ((match = placeholderRegex.exec(translated)) !== null) {
    placeholders.push(match[0]);
  }

  // Replace placeholders with unique indices to protect them
  placeholders.forEach((placeholder, idx) => {
    tokenized = tokenized.replace(placeholder, ` __PH_${idx}__ `);
  });

  // Split into words, preserving spaces and punctuation
  const words = tokenized.split(/(\s+|[,.!?;:()\[\]])/);

  const translatedWords = words.map((word) => {
    const trimmedWord = word.trim();
    if (!trimmedWord) return word; // whitespace

    // If it's a placeholder token
    if (trimmedWord.startsWith('__PH_') && trimmedWord.endsWith('__')) {
      const idx = parseInt(trimmedWord.replace('__PH_', '').replace('__', ''), 10);
      return placeholders[idx] || word;
    }

    // Standard word lookup
    const lowerWord = trimmedWord.toLowerCase();
    const cleanWord = lowerWord.replace(/['’]/g, ''); // normalize apostrophe

    if (TECHNICAL_LEXICON[cleanWord]) {
      const mapped = TECHNICAL_LEXICON[cleanWord];
      let res = targetLang === 'ar' ? mapped.ar : mapped.en;

      // Handle capitalization for English
      if (targetLang === 'en' && res) {
        if (word[0] === word[0].toUpperCase()) {
          res = res.charAt(0).toUpperCase() + res.slice(1);
        }
      }
      return res || word;
    }

    if (TECHNICAL_LEXICON[lowerWord]) {
      const mapped = TECHNICAL_LEXICON[lowerWord];
      let res = targetLang === 'ar' ? mapped.ar : mapped.en;
      if (targetLang === 'en' && res) {
        if (word[0] === word[0].toUpperCase()) {
          res = res.charAt(0).toUpperCase() + res.slice(1);
        }
      }
      return res || word;
    }

    return word; // unrecognized word, keep as is
  });

  let result = translatedWords.join('');

  // Remove triple or double spacing that can occur from tokens
  result = result.replace(/\s+/g, ' ').trim();

  // If Arabic, reverse direction of exclamation/question marks for aesthetic natural feel
  if (targetLang === 'ar') {
    result = result.replace('!', '!');
    result = result.replace('?', '؟');
  }

  return result;
}
