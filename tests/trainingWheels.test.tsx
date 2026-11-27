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

// ------------------------------------------------------------------
// قواعد سندهای «تصویرسازی و رنگ» (هلندی، آلمانی، انگلیسی، فارسی)
// ------------------------------------------------------------------
import { analyzeLanguageAids, limitAids, getAidsForLanguage } from '../src/engine/trainingWheels/languages';
import { analyzeEnglishAids } from '../src/engine/trainingWheels/languages/en';
import { analyzePersianAids } from '../src/engine/trainingWheels/languages/fa';
import { getDefaultTrainingWheelsSettings } from '../src/engine/trainingWheels/trainingWheelsService';

const mkCard = (lang: string, targetText: string, article?: string): LanguageCard => ({
  id: `t_${lang}_${targetText}`, targetLanguage: lang, cefrLevel: 'A1', topic: 'T', contentType: 'Sentence',
  learningMode: 'Speak', prompt: '', targetText, translation: '', article, difficulty: 'easy', points: 1,
} as unknown as LanguageCard);

describe('6. قاعده: حدس نزن (نشانهٔ غلط بدتر از بی‌نشانگی است)', () => {
  it('هلندی: اسمی که به t ختم می‌شود فعل حساب نمی‌شود', () => {
    // قبلاً «kat» چون به t ختم می‌شد فعل حساب می‌شد
    expect(analyzeDutchAids(mkCard('nl', 'De kat is ziek'), {}).v2Verb?.verbText).toBe('is');
    expect(analyzeDutchAids(mkCard('nl', 'Het feest begint laat'), {}).v2Verb?.verbText).toBe('begint');
    expect(analyzeDutchAids(mkCard('nl', 'Goed idee'), {}).v2Verb).toBeUndefined();
  });

  it('هلندی: در سؤال بله/خیر فعل اول است', () => {
    const a = analyzeDutchAids(mkCard('nl', 'Hebben jullie dit in blauw?'), {});
    expect(a.v2Verb?.position).toBe(0);
  });

  it('هلندی: صفتِ آخر جمله جزء فعل نیست، و «er … mee» فعل جداشدنی نیست', () => {
    expect(analyzeDutchAids(mkCard('nl', 'Het is op zondag dicht'), {}).separableVerb).toBeUndefined();
    expect(analyzeDutchAids(mkCard('nl', 'Ik laat je er dan mee'), {}).separableVerb).toBeUndefined();
    expect(analyzeDutchAids(mkCard('nl', 'De bedenktijd loopt vrijdag af'), {}).separableVerb).toMatchObject({ verbPart: 'loopt', particlePart: 'af' });
    expect(analyzeDutchAids(mkCard('nl', 'Ik pak dit apart met je op'), {}).separableVerb?.particlePart).toBe('op');
  });

  it('هلندی: «om een muur» عبارت زمان نیست، «om acht uur» هست', () => {
    expect(analyzeDutchAids(mkCard('nl', 'We lopen om een muur'), {}).timePhrase).toBeUndefined();
    const a = analyzeDutchAids(mkCard('nl', 'Ik kom om acht uur'), {});
    expect(a.timePhrase).toEqual({ start: 2, end: 4 });
    expect(analyzeDutchAids(mkCard('nl', 'Het is op zondag dicht'), {}).timePhrase).toEqual({ start: 2, end: 3 });
  });

  it('هلندی: جملهٔ وابسته و نفی', () => {
    const a = analyzeDutchAids(mkCard('nl', 'Ik blijf thuis omdat ik ziek ben'), {});
    expect(a.clause?.subordinator).toBe('omdat');
    expect(a.subordinateVerbFinal?.endVerb).toBe('ben');
    expect(analyzeDutchAids(mkCard('nl', 'Ik heb geen tijd'), {}).negation?.indices).toEqual([2]);
    // «Wanneer kom je?» سؤال است، نه جملهٔ وابسته
    expect(analyzeDutchAids(mkCard('nl', 'Wanneer kom je morgen?'), {}).clause).toBeUndefined();
  });

  it('آلمانی: «der» معمولی حالت «به/برای» نیست', () => {
    // قبلاً هر «der» به‌عنوان Dativ علامت می‌خورد
    expect(analyzeGermanAids(mkCard('de', 'Der Mann ist nett'), {}).caseEnding).toBeUndefined();
    const dat = analyzeGermanAids(mkCard('de', 'Nach der Schule gehe ich nach Hause'), {});
    expect(dat.caseEnding).toMatchObject({ caseType: 'dative', index: 1 });
    const acc = analyzeGermanAids(mkCard('de', 'Ich nehme den Bus'), {});
    expect(acc.caseEnding).toMatchObject({ caseType: 'accusative', index: 2, endingText: 'en' });
    // «den Dingen» و «den Garten» از روی شکل جدا نمی‌شوند: نوع را نمی‌گوییم
    expect(analyzeGermanAids(mkCard('de', 'Ich gebe den Dingen Zeit'), {}).caseEnding?.caseType).toBeUndefined();
  });

  it('آلمانی: اسم (با حرف بزرگ) فعل حساب نمی‌شود؛ فعل جداشدنی و جای فعل', () => {
    expect(analyzeGermanAids(mkCard('de', 'Ich Arbeit'), {}).v2Verb).toBeUndefined();
    const a = analyzeGermanAids(mkCard('de', 'Ich hole es nächste Woche ab'), {});
    expect(a.v2Verb?.verbText).toBe('hole');
    expect(a.separableVerb).toMatchObject({ verbPart: 'hole', particlePart: 'ab' });
    // جزءِ فعلِ دوم («lege … ab») به فعل اول نسبت داده نمی‌شود
    expect(analyzeGermanAids(mkCard('de', 'Ich schreibe es auf und lege es ab'), {}).separableVerb).toBeUndefined();
  });

  it('انگلیسی: رنگ جنس ندارد؛ فعل کمکی، نفی، زمان، جملهٔ وابسته', () => {
    const q = analyzeEnglishAids(mkCard('en', 'Do you work at six?'), {});
    expect(q.gender).toBeUndefined();
    expect(q.v2Verb).toMatchObject({ verbText: 'do', position: 0 });
    expect(q.timePhrase).toEqual({ start: 3, end: 4 });
    expect(analyzeEnglishAids(mkCard('en', "I don't know"), {}).negation?.indices).toEqual([1]);
    expect(analyzeEnglishAids(mkCard('en', 'No, thanks a lot'), {}).negation).toBeUndefined();
    expect(analyzeEnglishAids(mkCard('en', 'We have no time'), {}).negation?.indices).toEqual([2]);
    expect(analyzeEnglishAids(mkCard('en', 'I stay home because it rains'), {}).clause?.subordinator).toBe('because');
    // en-US و en-GB همان انگلیسی‌اند
    expect(analyzeLanguageAids(mkCard('en-US', 'She is not here'), {}).negation?.indices).toEqual([2]);
  });

  it('فارسی: «را»، نفی، جملهٔ وابسته؛ واژه‌هایی مثل «نان» نفی نیستند', () => {
    const a = analyzePersianAids(mkCard('fa', 'من کتاب را نمی‌خوانم'), {});
    expect(a.gender).toBeUndefined();
    expect(a.objectMarker?.index).toBe(2);
    expect(a.negation?.indices).toEqual([3]);
    expect(analyzePersianAids(mkCard('fa', 'من نان و نمک دارم'), {}).negation).toBeUndefined();
    expect(analyzePersianAids(mkCard('fa', 'اگر وقت داشتم می‌آیم'), {}).clause?.subordinator).toBe('اگر');
  });
});

describe('7. قاعده: هر کارت حداکثر دو کمک، و فقط رنگ‌های معنادار', () => {
  it('limitAids بیش از دو کمک نگه نمی‌دارد و اولویت را رعایت می‌کند', () => {
    const all = analyzeGermanAids(mkCard('de', 'Ich nehme den Bus nicht, weil es am Montag regnet'), {});
    expect(Object.keys(all).length).toBeGreaterThan(3);
    const two = limitAids(all, 2);
    expect(two.caseEnding).toBeDefined();
    expect(two.clause).toBeDefined();
    expect(two.v2Verb).toBeUndefined();
    expect(two.negation).toBeUndefined();
    expect(two.timePhrase).toBeUndefined();
  });

  it('روی صفحه بیش از دو نوع نشانه نمی‌آید', () => {
    render(<TrainingWheelText card={mkCard('de', 'Ich nehme den Bus nicht, weil es am Montag regnet')} stage={0} uiLanguage="en" />);
    expect(screen.getByTestId('german-case-ending')).toBeDefined();
    expect(screen.getByTestId('clause-start')).toBeDefined();
    expect(screen.queryByTestId('negation-mark')).toBeNull();
    expect(screen.queryByTestId('time-frame')).toBeNull();
  });

  it('حرف تعریف در همهٔ مرحله‌ها همراه اسم دیده می‌شود', () => {
    for (const stage of [0, 1, 2, 3] as const) {
      const { container, unmount } = render(<TrainingWheelText card={mkCard('nl', 'huis', 'het')} stage={stage} uiLanguage="en" />);
      expect(container.textContent).toContain('het');
      expect(container.textContent).toContain('huis');
      unmount();
    }
  });

  it('فعل قرص نیلی دارد، نه رنگ زعفرانی (زعفرانی یعنی مؤنث)', () => {
    render(<TrainingWheelText card={mkCard('nl', 'Ik leer Nederlands')} stage={0} uiLanguage="en" />);
    const verb = screen.getByTestId('v2-verb-highlight');
    expect(verb.className).toContain('indigo');
    expect(verb.className).not.toContain('amber');
    expect(verb.className).toContain('rounded-full');
  });

  it('فقط واژهٔ حالت‌دار زیرخط می‌گیرد، نه هر واژه‌ای که «en» دارد', () => {
    render(<TrainingWheelText card={mkCard('de', 'Wir kennen den Mann')} stage={0} uiLanguage="en" />);
    expect(screen.getAllByTestId('german-case-ending').length).toBe(1);
    expect(screen.getByTestId('german-case-ending').textContent).toContain('den');
  });

  it('نفی و قاب زمان و «را» رسم می‌شوند؛ در مرحلهٔ ۳ هیچ نشانه‌ای نیست', () => {
    const { unmount } = render(<TrainingWheelText card={mkCard('en', 'We do not work on Monday')} stage={0} uiLanguage="en" />);
    expect(screen.getByTestId('v2-verb-highlight').textContent).toBe('do');
    expect(screen.getByTestId('negation-mark').textContent).toContain('not');
    unmount();
    const t = render(<TrainingWheelText card={mkCard('en', 'See you on Monday')} stage={0} uiLanguage="en" />);
    expect(screen.getByTestId('time-frame').textContent).toBe('onMonday');
    t.unmount();
    const f = render(<TrainingWheelText card={mkCard('fa', 'من کتاب را می‌خوانم')} stage={0} uiLanguage="fa" />);
    expect(screen.getByTestId('object-marker').textContent).toContain('را');
    f.unmount();
    render(<TrainingWheelText card={mkCard('en', 'We do not work on Monday')} stage={3} uiLanguage="en" />);
    expect(screen.queryByTestId('negation-mark')).toBeNull();
    expect(screen.queryByTestId('v2-verb-highlight')).toBeNull();
  });

  it('هر چهار زبان کمک دارند و همه در تنظیمات پیش‌فرض روشن‌اند', () => {
    const defaults = getDefaultTrainingWheelsSettings().enabledAids;
    for (const lang of ['nl', 'de', 'en', 'fa']) {
      const aids = getAidsForLanguage(lang);
      expect(aids.length).toBeGreaterThanOrEqual(3);
      for (const a of aids) expect(defaults[a.id], a.id).toBe(true);
    }
    expect(getAidsForLanguage('en-GB').length).toBe(getAidsForLanguage('en').length);
  });
});

// ------------------------------------------------------------------
// «چرا؟» و سنجش
// ------------------------------------------------------------------
import { fireEvent } from '@testing-library/react';
import { explainAids } from '../src/engine/trainingWheels/why';
import {
  logAidAnswer, readAidLog, clearAidLog, summarizeAidLog, setHoldoutEnabled, isHoldoutCard, aidKindsForCard,
} from '../src/engine/trainingWheels/measurement';

describe('8. دکمهٔ «چرا؟»: قاعدهٔ کوتاه، فقط وقتی خواسته شود', () => {
  it('توضیح‌ها اصطلاح دستوری ندارند و بیش از دو تا نیستند', () => {
    const a = limitAids(analyzeGermanAids(mkCard('de', 'Ich nehme den Bus nicht, weil es am Montag regnet'), {}), 2);
    const ex = explainAids(a, 'de');
    expect(ex.length).toBe(2);
    for (const x of ex) {
      expect(x.fa).not.toMatch(/آکوزاتیو|داتیو|مفعول|فاعل|Akkusativ|Dativ/);
      expect(x.en).not.toMatch(/accusative|dative|subordinate|finite/i);
    }
  });

  it('توضیح تا وقتی دکمه زده نشده دیده نمی‌شود', () => {
    render(<TrainingWheelText card={mkCard('nl', 'Ik bel je morgen op')} stage={0} uiLanguage="en" showWhy />);
    expect(screen.queryByTestId('aid-why-text')).toBeNull();
    fireEvent.click(screen.getByTestId('aid-why-button'));
    expect(screen.getByTestId('aid-why-text').textContent).toContain('one verb');
  });

  it('بدون showWhy یا بدون نشانه، دکمه‌ای نیست', () => {
    const a = render(<TrainingWheelText card={mkCard('nl', 'Ik bel je morgen op')} stage={0} uiLanguage="en" />);
    expect(screen.queryByTestId('aid-why-button')).toBeNull();
    a.unmount();
    render(<TrainingWheelText card={mkCard('nl', 'Goed idee')} stage={0} uiLanguage="en" showWhy />);
    expect(screen.queryByTestId('aid-why-button')).toBeNull();
  });
});

describe('9. سنجش: با کمک در برابر بدون کمک', () => {
  beforeEach(() => { localStorage.clear(); });

  it('جواب‌ها ثبت می‌شوند و خلاصه با کمک و بدون کمک را جدا می‌کند', () => {
    const card = mkCard('nl', 'Ik heb geen tijd');
    expect(aidKindsForCard(card)).toEqual(['v2Verb', 'negation']);
    logAidAnswer(card, 0, true, -1);
    logAidAnswer(card, 1, false, 1);
    logAidAnswer(card, 3, true, 8);
    expect(readAidLog().length).toBe(3);
    const neg = summarizeAidLog().find((r) => r.aid === 'negation')!;
    expect(neg.withAid).toEqual({ n: 2, correct: 1 });
    expect(neg.withoutAid).toEqual({ n: 1, correct: 1 });
    expect(neg.delayed7).toEqual({ n: 1, correct: 1 });
    expect(summarizeAidLog(undefined, 'de').length).toBe(0);
    clearAidLog();
    expect(readAidLog().length).toBe(0);
  });

  it('کارتی که هیچ کمکی نمی‌گیرد ثبت نمی‌شود', () => {
    logAidAnswer(mkCard('nl', 'Goed idee'), 0, true, -1);
    expect(readAidLog().length).toBe(0);
  });

  it('گروه مقایسه پیش‌فرض خاموش است؛ روشن که شود حدود یک‌دهم کارت‌ها بی‌کمک می‌مانند و ثابت‌اند', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `card_${i}`);
    expect(ids.filter(isHoldoutCard).length).toBe(0);
    setHoldoutEnabled(true);
    const first = ids.filter(isHoldoutCard);
    expect(first.length).toBeGreaterThan(60);
    expect(first.length).toBeLessThan(140);
    expect(ids.filter(isHoldoutCard)).toEqual(first);
    // کارت گروه مقایسه روی صفحه هیچ نشانه‌ای ندارد
    const card = { ...mkCard('nl', 'Ik heb geen tijd'), id: first[0] } as LanguageCard;
    render(<TrainingWheelText card={card} uiLanguage="en" />);
    expect(screen.queryByTestId('negation-mark')).toBeNull();
    setHoldoutEnabled(false);
  });
});
