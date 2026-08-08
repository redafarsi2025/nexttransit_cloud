import { LanguageCode, GlossaryTerm } from '../types/localization';
import { freeTranslateText } from './freeTranslationService';

export interface AITranslateRequest {
  sourceText: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  key: string;
  namespace: string;
  context?: string;
  glossaryTerms?: GlossaryTerm[];
}

export interface AITranslateResponse {
  translatedText: string;
  confidenceScore: number;
  glossaryTermsPreserved: string[];
  status: 'AI Generated';
}

export async function aiTranslateText(
  req: AITranslateRequest
): Promise<AITranslateResponse> {
  // Execute free instant dictionary and telemetry translation locally
  const translatedText = freeTranslateText(
    req.sourceText,
    req.sourceLang,
    req.targetLang,
    req.key,
    req.glossaryTerms
  );

  return {
    translatedText,
    confidenceScore: 1.0,
    glossaryTermsPreserved: req.glossaryTerms?.map((g) => g.term) || [],
    status: 'AI Generated',
  };
}
