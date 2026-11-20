import { Language, CEFRLevel, LanguageCard } from '../../../types';

export type GrammaticalGender = 'neuter' | 'masculine' | 'feminine' | 'common';

export type GenderShape = 'square' | 'triangle' | 'circle' | 'diamond';

export interface GenderVisualConfig {
  gender: GrammaticalGender;
  color: string; // Hex color code
  textColor: string; // Tailwind or Hex text color
  bgColor: string; // Tailwind or Hex background color
  borderColor: string;
  shape: GenderShape;
  symbol: string; // Unicode geometric shape (■, ▲, ●, ◆)
  labelFa: string;
  labelEn: string;
}

export type FadingStage = 0 | 1 | 2 | 3;
// 0: Full aids (Color + Shape + Label) - New word
// 1: Medium aids (Color + Shape, no label) - After correct answer
// 2: Subtle aids (Thin colored underline) - Near mastery
// 3: Mastered (Same as normal text) - Aids off

export interface TrainingWheelAidDefinition {
  id: string;
  language: Language | 'all';
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  icon: string;
  category: 'gender' | 'grammar' | 'phonetics' | 'audio';
  defaultEnabled: boolean;
  minCefrLevel?: CEFRLevel;
  maxCefrLevel?: CEFRLevel;
}

export interface TrainingWheelStats {
  aidId: string;
  totalWordsEncountered: number;
  wordsNoLongerNeeding: number; // Words that reached Stage 3 (Mastered)
  progressPercent: number; // Percentage ridden without training wheel
}

export interface WordAidsAnnotation {
  gender?: {
    gender: GrammaticalGender;
    visual: GenderVisualConfig;
    article?: string;
  };
  diminutive?: {
    isDiminutive: boolean;
    suffix: string;
    ruleHint: string;
  };
  separableVerb?: {
    isSeparable: boolean;
    verbPart: string;
    particlePart: string;
  };
  v2Verb?: {
    isV2: boolean;
    verbText: string;
    position: number;
  };
  caseEnding?: {
    hasEnding: boolean;
    endingText: string;
    caseType?: 'accusative' | 'dative' | 'genitive';
  };
  subordinateVerbFinal?: {
    isSubordinate: boolean;
    subordinator: string;
    endVerb: string;
  };
}
