import { Language, LanguageCard } from '../../../../types';
import { TrainingWheelAidDefinition, WordAidsAnnotation } from '../types';
import { DUTCH_AIDS, analyzeDutchAids } from './nl';
import { GERMAN_AIDS, analyzeGermanAids } from './de';

export const ALL_LANGUAGE_AIDS: Record<string, TrainingWheelAidDefinition[]> = {
  nl: DUTCH_AIDS,
  de: GERMAN_AIDS,
};

export function getAidsForLanguage(language: Language | string): TrainingWheelAidDefinition[] {
  return ALL_LANGUAGE_AIDS[language] || [];
}

export function analyzeLanguageAids(
  card: LanguageCard,
  enabledAids: Record<string, boolean>
): WordAidsAnnotation {
  const lang = card.targetLanguage;
  if (lang === 'nl') {
    return analyzeDutchAids(card, enabledAids);
  }
  if (lang === 'de') {
    return analyzeGermanAids(card, enabledAids);
  }
  return {};
}
