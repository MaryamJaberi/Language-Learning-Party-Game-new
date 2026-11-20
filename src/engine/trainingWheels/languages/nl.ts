import { TrainingWheelAidDefinition, WordAidsAnnotation } from '../types';
import { resolveGenderFromArticle, GENDER_VISUAL_MAP } from '../genderColors';
import { LanguageCard } from '../../../../types';

export const DUTCH_AIDS: TrainingWheelAidDefinition[] = [
  {
    id: 'nl_de_het_colors',
    language: 'nl',
    titleFa: 'رنگ و نماد حروف تعریف de و het',
    titleEn: 'de / het Gender Colors & Shapes',
    descriptionFa: 'کلمات het به رنگ سرخ با نماد مربع (خنثی) و کلمات de به رنگ فیروزه‌ای با لوزی (مشترک)',
    descriptionEn: 'het words in red with square (neuter); de words in turquoise with diamond (common)',
    icon: 'palette',
    category: 'gender',
    defaultEnabled: true,
  },
  {
    id: 'nl_diminutive_het_hint',
    language: 'nl',
    titleFa: 'قاعدهٔ کلمات مصغر (-je همیشه het است)',
    titleEn: 'Diminutive -je is always "het"',
    descriptionFa: 'تمام واژه‌هایی که با پسوند je-، tje-، pje- ختم می‌شوند بدون استثنا خنثی (het) هستند',
    descriptionEn: 'All diminutive nouns ending in -je, -tje, -pje are strictly neuter (het)',
    icon: 'sparkles',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'nl_separable_verb_link',
    language: 'nl',
    titleFa: 'اتصال نقطه‌چین افعال دوتکه (Separable Verbs)',
    titleEn: 'Dotted link for separable verbs',
    descriptionFa: 'نمایش خط نقطه‌چین بین بخش صرف‌شده و پیشوند جداشدهٔ فعل در جمله (مانند bel ... op)',
    descriptionEn: 'Dotted link connecting the conjugated verb and its separated particle (e.g. bel ... op)',
    icon: 'link',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'nl_v2_verb_highlight',
    language: 'nl',
    titleFa: 'برجسته‌سازی فعل در جایگاه دوم (قاعدهٔ V2)',
    titleEn: 'V2 finite verb highlight',
    descriptionFa: 'مشخص کردن فعل صرف‌شده در موقعیت دوم جملهٔ هلندی برای تثبیت ترتیب واژگان',
    descriptionEn: 'Subtle highlight on the finite verb occupying second position in Dutch main clauses',
    icon: 'bookmark',
    category: 'grammar',
    defaultEnabled: true,
  }
];

// Common Dutch separable verb prefixes
const DUTCH_SEPARABLE_PREFIXES = new Set([
  'op', 'af', 'aan', 'uit', 'in', 'mee', 'toe', 'om', 'door', 'over', 'terug', 'schoon', 'klaar', 'vast'
]);

// Common Dutch finite verb forms
const COMMON_DUTCH_VERBS = new Set([
  'ben', 'bent', 'is', 'zijn', 'was', 'waren',
  'heb', 'hebt', 'heeft', 'hebben', 'had', 'hadden',
  'ga', 'gaat', 'gaan', 'ging', 'gingen',
  'kom', 'komt', 'komen', 'kwam', 'kwamen',
  'doe', 'doet', 'doen', 'deed', 'deden',
  'maak', 'maakt', 'maken', 'maakte', 'maakten',
  'zie', 'ziet', 'zien', 'zag', 'zagen',
  'zeg', 'zegt', 'zeggen', 'zei', 'zeiden',
  'neem', 'neemt', 'nemen', 'nam', 'namen',
  'bel', 'belt', 'bellen', 'belde', 'belden',
  'nodig', 'nodigt', 'nodigen', 'nodigde', 'nodigden',
  'was', 'wast', 'wassen', 'waste', 'wasten',
  'zet', 'zetten', 'zette', 'zetten',
  'leer', 'leert', 'leren', 'leerde', 'leerden',
  'spreek', 'spreekt', 'spreken', 'sprak', 'spraken',
  'zoek', 'zoekt', 'zoeken', 'zocht', 'zochten',
  'pak', 'pakt', 'pakken', 'pakte', 'pakten'
]);

/**
 * Checks if a Dutch noun is diminutive ending with -je, -tje, -pje, -etje, -kje
 */
export function isDutchDiminutive(word: string): { isDiminutive: boolean; suffix: string } {
  const clean = word.toLowerCase().replace(/[.,!?;:]/g, '').trim();
  if (clean.length < 4) return { isDiminutive: false, suffix: '' };

  const suffixes = ['tjes', 'pjes', 'kjes', 'etjes', 'jes', 'tje', 'pje', 'kje', 'etje', 'je'];
  for (const sfx of suffixes) {
    if (clean.endsWith(sfx)) {
      return { isDiminutive: true, suffix: sfx };
    }
  }
  return { isDiminutive: false, suffix: '' };
}

/**
 * Analyzes a Dutch target phrase or sentence for all active training wheels aids
 */
export function analyzeDutchAids(
  card: LanguageCard,
  enabledAids: Record<string, boolean>
): WordAidsAnnotation {
  const annotation: WordAidsAnnotation = {};
  const text = (card.targetText || '').trim();
  const words = text.split(/\s+/).filter(Boolean);

  // 1. de / het Gender Colors & Shapes
  if (enabledAids.nl_de_het_colors !== false && card.article) {
    const gender = resolveGenderFromArticle('nl', card.article);
    if (gender) {
      annotation.gender = {
        gender,
        visual: GENDER_VISUAL_MAP[gender],
        article: card.article
      };
    }
  }

  // 2. Diminutive -je is always "het" hint
  if (enabledAids.nl_diminutive_het_hint !== false) {
    // Check main word or single-word vocab
    const candidate = words.length === 1 ? words[0] : (words[1] || words[0]);
    const dim = isDutchDiminutive(candidate || '');
    if (dim.isDiminutive) {
      annotation.diminutive = {
        isDiminutive: true,
        suffix: dim.suffix,
        ruleHint: 'Diminutive: -' + dim.suffix + ' → always "het" (■ neuter)'
      };
    }
  }

  // 3. Separable verb detection
  if (enabledAids.nl_separable_verb_link !== false && words.length >= 2) {
    // Look for a conjugated verb early and a separable prefix at or near the end
    let verbIdx = -1;
    let verbPart = '';
    let particleIdx = -1;
    let particlePart = '';

    for (let i = 0; i < Math.min(3, words.length); i++) {
      const cleanW = words[i].toLowerCase().replace(/[.,!?;:]/g, '');
      if (COMMON_DUTCH_VERBS.has(cleanW) || cleanW.endsWith('t') || cleanW.endsWith('en')) {
        verbIdx = i;
        verbPart = words[i];
        break;
      }
    }

    if (verbIdx !== -1) {
      // Look for particle in the latter half or at the end
      for (let j = words.length - 1; j > verbIdx; j--) {
        const cleanP = words[j].toLowerCase().replace(/[.,!?;:]/g, '');
        if (DUTCH_SEPARABLE_PREFIXES.has(cleanP)) {
          particleIdx = j;
          particlePart = words[j];
          break;
        }
      }
    }

    if (verbIdx !== -1 && particleIdx !== -1) {
      annotation.separableVerb = {
        isSeparable: true,
        verbPart,
        particlePart
      };
    }
  }

  // 4. V2 verb highlight (in Dutch main clauses, finite verb is at position 2)
  if (enabledAids.nl_v2_verb_highlight !== false && words.length >= 2) {
    const secondWord = words[1];
    const cleanSecond = secondWord.toLowerCase().replace(/[.,!?;:]/g, '');
    if (
      COMMON_DUTCH_VERBS.has(cleanSecond) ||
      cleanSecond.endsWith('t') ||
      cleanSecond.endsWith('en') ||
      cleanSecond.endsWith('de') ||
      cleanSecond.endsWith('te')
    ) {
      annotation.v2Verb = {
        isV2: true,
        verbText: secondWord,
        position: 1
      };
    }
  }

  return annotation;
}
