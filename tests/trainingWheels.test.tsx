import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GENDER_VISUAL_MAP, resolveGenderFromArticle } from '../src/engine/trainingWheels/genderColors';
import { DUTCH_AIDS, isDutchDiminutive, analyzeDutchAids } from '../src/engine/trainingWheels/languages/nl';
import { GERMAN_AIDS, analyzeGermanAids } from '../src/engine/trainingWheels/languages/de';
import {
  getStartingStageForCefr,
  getFadingStageForCard,
  demoteStageOnMistake,
  promoteStageOnSuccess
} from '../src/engine/trainingWheels/fadingEngine';
import {
  getTrainingWheelsSettings,
  saveTrainingWheelsSettings,
  toggleAidEnabled,
  getBicycleTrainingStats,
  getAdaptiveTtsSpeed
} from '../src/engine/trainingWheels/trainingWheelsService';
import { TrainingWheelText } from '../components/trainingWheels/TrainingWheelText';
import { BicycleIllustration } from '../components/trainingWheels/BicycleIllustration';
import { TrainingWheelsHelpSection } from '../components/trainingWheels/TrainingWheelsHelpSection';
import { LanguageCard } from '../types';

describe('Training Wheels - Visual & Audio Learning Aids System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Grammatical Gender Colors & Shapes (Colorblind-Safe)', () => {
    it('maps neuter to red + square (■)', () => {
      const neuter = GENDER_VISUAL_MAP.neuter;
      expect(neuter.color).toBe('#EF4444');
      expect(neuter.shape).toBe('square');
      expect(neuter.symbol).toBe('■');
      expect(resolveGenderFromArticle('nl', 'het')).toBe('neuter');
      expect(resolveGenderFromArticle('de', 'das')).toBe('neuter');
    });

    it('maps masculine to lapis blue + triangle (▲)', () => {
      const masc = GENDER_VISUAL_MAP.masculine;
      expect(masc.color).toBe('#2563EB');
      expect(masc.shape).toBe('triangle');
      expect(masc.symbol).toBe('▲');
      expect(resolveGenderFromArticle('de', 'der')).toBe('masculine');
      expect(resolveGenderFromArticle('fr', 'le')).toBe('masculine');
      expect(resolveGenderFromArticle('es', 'el')).toBe('masculine');
    });

    it('maps feminine to saffron + circle (●)', () => {
      const fem = GENDER_VISUAL_MAP.feminine;
      expect(fem.color).toBe('#F59E0B');
      expect(fem.shape).toBe('circle');
      expect(fem.symbol).toBe('●');
      expect(resolveGenderFromArticle('de', 'die')).toBe('feminine');
      expect(resolveGenderFromArticle('de', 'eine')).toBe('feminine');
      expect(resolveGenderFromArticle('fr', 'la')).toBe('feminine');
    });

    it('maps common gender to turquoise + diamond (◆)', () => {
      const common = GENDER_VISUAL_MAP.common;
      expect(common.color).toBe('#06B6D4');
      expect(common.shape).toBe('diamond');
      expect(common.symbol).toBe('◆');
      expect(resolveGenderFromArticle('nl', 'de')).toBe('common');
    });

    it('strictly resolves gender from article field and NEVER guesses if article is missing or empty', () => {
      expect(resolveGenderFromArticle('nl', undefined)).toBeNull();
      expect(resolveGenderFromArticle('nl', '')).toBeNull();
      expect(resolveGenderFromArticle('de', undefined)).toBeNull();
      expect(resolveGenderFromArticle('de', 'random_word')).toBeNull();
    });
  });

  describe('2. Dutch Aids (nl.ts)', () => {
    it('defines all 4 required Dutch aids in its configuration', () => {
      const aidIds = DUTCH_AIDS.map((a) => a.id);
      expect(aidIds).toContain('nl_de_het_colors');
      expect(aidIds).toContain('nl_diminutive_het_hint');
      expect(aidIds).toContain('nl_separable_verb_link');
      expect(aidIds).toContain('nl_v2_verb_highlight');
    });

    it('detects Dutch diminutive nouns ending in -je, -tje, -pje and tags always het', () => {
      expect(isDutchDiminutive('meisje').isDiminutive).toBe(true);
      expect(isDutchDiminutive('kopje').isDiminutive).toBe(true);
      expect(isDutchDiminutive('boompje').isDiminutive).toBe(true);
      expect(isDutchDiminutive('stoel').isDiminutive).toBe(false);

      const card: LanguageCard = {
        id: 'test_nl_dim',
        targetLanguage: 'nl',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Vocabulary',
        learningMode: 'Explain',
        prompt: 'test',
        targetText: 'meisje',
        translation: 'دختربچه',
        article: 'het',
        difficulty: 'easy',
        points: 1
      };

      const analysis = analyzeDutchAids(card, { nl_diminutive_het_hint: true, nl_de_het_colors: true });
      expect(analysis.diminutive?.isDiminutive).toBe(true);
      expect(analysis.diminutive?.ruleHint).toContain('always "het"');
      expect(analysis.gender?.gender).toBe('neuter');
    });

    it('detects separable verbs and identifies conjugated verb and separated particle', () => {
      const card: LanguageCard = {
        id: 'test_nl_sep',
        targetLanguage: 'nl',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Sentence',
        learningMode: 'Speak',
        prompt: 'test',
        targetText: 'Ik bel je morgen op',
        translation: 'فردا بهت زنگ می‌زنم',
        difficulty: 'easy',
        points: 1
      };

      const analysis = analyzeDutchAids(card, { nl_separable_verb_link: true });
      expect(analysis.separableVerb?.isSeparable).toBe(true);
      expect(analysis.separableVerb?.verbPart).toBe('bel');
      expect(analysis.separableVerb?.particlePart).toBe('op');
    });

    it('highlights the finite verb in second position (V2 rule)', () => {
      const card: LanguageCard = {
        id: 'test_nl_v2',
        targetLanguage: 'nl',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Sentence',
        learningMode: 'Speak',
        prompt: 'test',
        targetText: 'Ik leer Nederlands',
        translation: 'من هلندی یاد می‌گیرم',
        difficulty: 'easy',
        points: 1
      };

      const analysis = analyzeDutchAids(card, { nl_v2_verb_highlight: true });
      expect(analysis.v2Verb?.isV2).toBe(true);
      expect(analysis.v2Verb?.verbText).toBe('leer');
      expect(analysis.v2Verb?.position).toBe(1);
    });
  });

  describe('3. German Aids (de.ts)', () => {
    it('defines all 3 required German aids in its configuration', () => {
      const aidIds = GERMAN_AIDS.map((a) => a.id);
      expect(aidIds).toContain('de_gender_colors');
      expect(aidIds).toContain('de_case_endings');
      expect(aidIds).toContain('de_subordinate_verb_final');
    });

    it('detects German case endings (-en, -em, -es, -er)', () => {
      const card: LanguageCard = {
        id: 'test_de_case',
        targetLanguage: 'de',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Phrase',
        learningMode: 'Translate',
        prompt: 'test',
        targetText: 'Ich sehe den Hund',
        translation: 'سگ را می‌بینم',
        difficulty: 'easy',
        points: 1
      };

      const analysis = analyzeGermanAids(card, { de_case_endings: true });
      expect(analysis.caseEnding?.hasEnding).toBe(true);
      expect(analysis.caseEnding?.endingText).toBe('en');
      expect(analysis.caseEnding?.caseType).toBe('accusative');
    });

    it('marks verb sent to the end of a subordinate clause (Nebensatz)', () => {
      const card: LanguageCard = {
        id: 'test_de_neben',
        targetLanguage: 'de',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Sentence',
        learningMode: 'Speak',
        prompt: 'test',
        targetText: 'Ich lerne Deutsch, weil ich in Berlin wohne',
        translation: 'من آلمانی می‌خوانم چون در برلین زندگی می‌کنم',
        difficulty: 'easy',
        points: 1
      };

      const analysis = analyzeGermanAids(card, { de_subordinate_verb_final: true });
      expect(analysis.subordinateVerbFinal?.isSubordinate).toBe(true);
      expect(analysis.subordinateVerbFinal?.subordinator).toBe('weil');
      expect(analysis.subordinateVerbFinal?.endVerb).toBe('wohne');
    });
  });

  describe('4. Fading Stages Driven by Leitner Boxes', () => {
    it('determines starting stage based on CEFR level', () => {
      expect(getStartingStageForCefr('Pre-A1')).toBe(0); // Stage 0: Full aids
      expect(getStartingStageForCefr('A1')).toBe(0);
      expect(getStartingStageForCefr('A2')).toBe(1); // Stage 1: Color + shape
      expect(getStartingStageForCefr('B1')).toBe(2); // Stage 2: Underline
      expect(getStartingStageForCefr('C1')).toBe(3); // Stage 3: Aids off
      expect(getStartingStageForCefr('C2')).toBe(3);
    });

    it('moves word back one stage on mistake', () => {
      expect(demoteStageOnMistake(2)).toBe(1);
      expect(demoteStageOnMistake(1)).toBe(0);
      expect(demoteStageOnMistake(0)).toBe(0); // Clamped at 0
    });

    it('moves word forward one stage on correct answer', () => {
      expect(promoteStageOnSuccess(0)).toBe(1);
      expect(promoteStageOnSuccess(1)).toBe(2);
      expect(promoteStageOnSuccess(2)).toBe(3);
      expect(promoteStageOnSuccess(3)).toBe(3); // Clamped at 3
    });

    it('renders Stage 0 with color + shape + label', () => {
      const card: LanguageCard = {
        id: 'c_glas',
        targetLanguage: 'nl',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Vocabulary',
        learningMode: 'Explain',
        prompt: 'test',
        targetText: 'glas',
        translation: 'لیوان',
        article: 'het',
        difficulty: 'easy',
        points: 1
      };

      render(<TrainingWheelText card={card} stage={0} uiLanguage="en" />);
      const badge = screen.getByTestId('gender-badge-stage-0');
      expect(badge).toBeDefined();
      expect(badge.textContent).toContain('■');
      expect(badge.textContent).toContain('het');
      expect(badge.textContent).toContain('Neuter');
    });

    it('renders Stage 1 with color + shape but NO text label', () => {
      const card: LanguageCard = {
        id: 'c_glas',
        targetLanguage: 'nl',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Vocabulary',
        learningMode: 'Explain',
        prompt: 'test',
        targetText: 'glas',
        translation: 'لیوان',
        article: 'het',
        difficulty: 'easy',
        points: 1
      };

      render(<TrainingWheelText card={card} stage={1} uiLanguage="en" />);
      const badge = screen.getByTestId('gender-badge-stage-1');
      expect(badge).toBeDefined();
      expect(badge.textContent).toContain('■');
      expect(badge.textContent).not.toContain('Neuter');
    });

    it('renders Stage 3 as clean normal text with zero training wheel badges', () => {
      const card: LanguageCard = {
        id: 'c_glas',
        targetLanguage: 'nl',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Vocabulary',
        learningMode: 'Explain',
        prompt: 'test',
        targetText: 'glas',
        translation: 'لیوان',
        article: 'het',
        difficulty: 'easy',
        points: 1
      };

      render(<TrainingWheelText card={card} stage={3} uiLanguage="en" />);
      expect(screen.queryByTestId('gender-badge-stage-0')).toBeNull();
      expect(screen.queryByTestId('gender-badge-stage-1')).toBeNull();
      expect(screen.getByText('het glas')).toBeDefined();
    });
  });

  describe('5. Help Screen "Your Training Wheels" & Bicycle Illustration', () => {
    it('renders bicycle illustration with progress percent and wheels count', () => {
      render(
        <BicycleIllustration
          progressPercent={65}
          activeWheelsCount={2}
          totalWheelsCount={4}
          isRtl={true}
        />
      );

      const bicycle = screen.getByTestId('bicycle-training-wheels-illustration');
      expect(bicycle).toBeDefined();
      expect(screen.getByText('65%')).toBeDefined();
      expect(screen.getByText('2 چرخ کمکی باز شده')).toBeDefined();
      expect(screen.getByText('2 چرخ کمکی فعال')).toBeDefined();
    });

    it('allows toggling an aid off (removing wheel early) and putting it back', () => {
      const initial = getTrainingWheelsSettings();
      expect(initial.enabledAids.nl_de_het_colors).toBe(true);

      const toggled = toggleAidEnabled('nl_de_het_colors');
      expect(toggled.enabledAids.nl_de_het_colors).toBe(false);

      const restored = toggleAidEnabled('nl_de_het_colors');
      expect(restored.enabledAids.nl_de_het_colors).toBe(true);
    });

    it('renders the complete TrainingWheelsHelpSection with language tabs and aids', () => {
      render(<TrainingWheelsHelpSection currentLanguage="nl" uiLanguage="fa" />);
      expect(screen.getByTestId('training-wheels-help-container')).toBeDefined();
      expect(screen.getByTestId('training-wheel-item-nl_de_het_colors')).toBeDefined();
      expect(screen.getByTestId('training-wheel-item-nl_diminutive_het_hint')).toBeDefined();
      expect(screen.getByTestId('training-wheel-item-nl_separable_verb_link')).toBeDefined();
      expect(screen.getByTestId('training-wheel-item-nl_v2_verb_highlight')).toBeDefined();
    });
  });

  describe('6. Audio Training Wheels', () => {
    it('provides adaptive TTS rate that is slower at A1 (0.75x) and normal at higher levels / mastered', () => {
      expect(getAdaptiveTtsSpeed('A1', 0)).toBe(0.75); // Slow rate for beginners with full aids
      expect(getAdaptiveTtsSpeed('A1', 1)).toBe(0.85);
      expect(getAdaptiveTtsSpeed('A2', 0)).toBe(0.85);
      expect(getAdaptiveTtsSpeed('B1', 1)).toBe(0.95);
      expect(getAdaptiveTtsSpeed('C1', 0)).toBe(1.0); // Normal rate
      expect(getAdaptiveTtsSpeed('A1', 3)).toBe(1.0); // Mastered stage always plays at normal speed
    });
  });
});
