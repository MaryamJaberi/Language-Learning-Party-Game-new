import { TrainingWheelAidDefinition, WordAidsAnnotation } from '../types';
import { resolveGenderFromArticle, GENDER_VISUAL_MAP } from '../genderColors';
import { LanguageCard } from '../../../../types';

export const GERMAN_AIDS: TrainingWheelAidDefinition[] = [
  {
    id: 'de_gender_colors',
    language: 'de',
    titleFa: 'رنگ و نماد حروف تعریف der و die و das',
    titleEn: 'der / die / das Gender Colors & Shapes',
    descriptionFa: 'das با رنگ سرخ و مربع (خنثی)، der با لاجوردی و مثلث (مذکر)، die با زعفرانی و دایره (مؤنث)',
    descriptionEn: 'das in red with square (neuter); der in lapis blue with triangle (masculine); die in saffron with circle (feminine)',
    icon: 'palette',
    category: 'gender',
    defaultEnabled: true,
  },
  {
    id: 'de_case_endings',
    language: 'de',
    titleFa: 'خط زیر پسوندهای حالت‌های گرامری (Case Endings)',
    titleEn: 'Underline grammatical case endings',
    descriptionFa: 'نمایش خط زیر پسوندهای حالت‌های مفعولی (Akkusativ: -en) و مفعول باواسطه (Dativ: -em, -er, -en) و ملکی (Genitiv: -es)',
    descriptionEn: 'Underlines case endings for Akkusativ (-en), Dativ (-em, -er, -en), and Genitiv (-es, -s)',
    icon: 'edit-3',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'de_subordinate_verb_final',
    language: 'de',
    titleFa: 'نشانه‌گذاری فعل در انتهای جملهٔ پیرو (Nebensatz Verb-Final)',
    titleEn: 'Mark verb sent to end of subordinate clause',
    descriptionFa: 'نمایش نشانگر ویژه روی فعلی که به خاطر کلمات ربط پیرو (مانند weil, dass, wenn) به انتهای جمله منتقل شده است',
    descriptionEn: 'Marks the conjugated verb relocated to the end of subordinate clauses (e.g. after weil, dass, wenn)',
    icon: 'corner-down-left',
    category: 'grammar',
    defaultEnabled: true,
  }
];

// Common German subordinate conjunctions
const GERMAN_SUBORDINATORS = new Set([
  'weil', 'dass', 'daß', 'wenn', 'ob', 'obwohl', 'da', 'als', 'während', 'bevor', 'damit', 'nachdem', 'solange', 'sodass'
]);

// Common German case ending patterns on articles/pronouns
const CASE_ENDING_WORDS = [
  { regex: /\b(den|einen|keinen|meinen|deinen|seinen)\b/i, ending: 'en', case: 'accusative' as const },
  { regex: /\b(dem|einem|keinem|meinem|deinem|seinem)\b/i, ending: 'em', case: 'dative' as const },
  { regex: /\b(der|einer|keiner|meiner|deiner|seiner)\b/i, ending: 'er', case: 'dative' as const },
  { regex: /\b(des|eines|keines|meines|deines|seines)\b/i, ending: 'es', case: 'genitive' as const }
];

/**
 * Analyzes a German target phrase or sentence for all active training wheels aids
 */
export function analyzeGermanAids(
  card: LanguageCard,
  enabledAids: Record<string, boolean>
): WordAidsAnnotation {
  const annotation: WordAidsAnnotation = {};
  const text = (card.targetText || '').trim();
  const words = text.split(/\s+/).filter(Boolean);

  // 1. der / die / das Gender Colors & Shapes
  if (enabledAids.de_gender_colors !== false && card.article) {
    const gender = resolveGenderFromArticle('de', card.article);
    if (gender) {
      annotation.gender = {
        gender,
        visual: GENDER_VISUAL_MAP[gender],
        article: card.article
      };
    }
  }

  // 2. Underline case endings
  if (enabledAids.de_case_endings !== false) {
    for (const pattern of CASE_ENDING_WORDS) {
      const match = text.match(pattern.regex);
      if (match) {
        annotation.caseEnding = {
          hasEnding: true,
          endingText: pattern.ending,
          caseType: pattern.case
        };
        break;
      }
    }
  }

  // 3. Mark the verb sent to the end of a subordinate clause
  if (enabledAids.de_subordinate_verb_final !== false && words.length >= 3) {
    let subordinator = '';
    for (let i = 0; i < words.length - 1; i++) {
      const cleanW = words[i].toLowerCase().replace(/[,.!?;:]/g, '');
      if (GERMAN_SUBORDINATORS.has(cleanW)) {
        subordinator = cleanW;
        break;
      }
    }

    if (subordinator) {
      // The verb is at the end of the clause/sentence
      const lastWord = words[words.length - 1].replace(/[.!?;:]/g, '');
      annotation.subordinateVerbFinal = {
        isSubordinate: true,
        subordinator,
        endVerb: lastWord
      };
    }
  }

  return annotation;
}
