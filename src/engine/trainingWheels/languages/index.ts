import { Language, LanguageCard } from '../../../../types';
import { TrainingWheelAidDefinition, WordAidsAnnotation } from '../types';
import { DUTCH_AIDS, analyzeDutchAids } from './nl';
import { GERMAN_AIDS, analyzeGermanAids } from './de';
import { ENGLISH_AIDS, analyzeEnglishAids } from './en';
import { PERSIAN_AIDS, analyzePersianAids } from './fa';

export { limitAids } from './shared';

export const ALL_LANGUAGE_AIDS: Record<string, TrainingWheelAidDefinition[]> = {
  nl: DUTCH_AIDS,
  de: GERMAN_AIDS,
  en: ENGLISH_AIDS,
  fa: PERSIAN_AIDS,
};

/** «en-US» و «en-GB» همان «en» هستند */
export const baseLang = (language: Language | string | undefined): string => String(language || '').split('-')[0];

export function getAidsForLanguage(language: Language | string): TrainingWheelAidDefinition[] {
  return ALL_LANGUAGE_AIDS[baseLang(language)] || [];
}

export function analyzeLanguageAids(
  card: LanguageCard,
  enabledAids: Record<string, boolean>
): WordAidsAnnotation {
  switch (baseLang(card.targetLanguage)) {
    case 'nl': return analyzeDutchAids(card, enabledAids);
    case 'de': return analyzeGermanAids(card, enabledAids);
    case 'en': return analyzeEnglishAids(card, enabledAids);
    case 'fa': return analyzePersianAids(card, enabledAids);
    default: return {};
  }
}
