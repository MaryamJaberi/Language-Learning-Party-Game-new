import { TrainingWheelAidDefinition, WordAidsAnnotation } from '../types';
import { LanguageCard } from '../../../../types';
import { tokenize, clean, findNegation, findClause } from './shared';

/**
 * فارسی (برای کسی که فارسی یاد می‌گیرد). جنس دستوری ندارد، پس رنگ جنس اینجا هیچ‌وقت نمی‌آید.
 * مهم‌ترین کمک فارسی حرکت‌گذاری است، ولی دادهٔ حرکت‌گذاری‌شده نداریم و حدس زدن ممنوع است؛
 * پس فعلاً فقط چیزهایی که با فهرست بسته قابل‌تشخیص‌اند: «را»، نفی، و شروع جملهٔ وابسته.
 */
export const PERSIAN_AIDS: TrainingWheelAidDefinition[] = [
  {
    id: 'fa_ra_marker',
    language: 'fa',
    titleFa: 'فلش «را» به مفعول',
    titleEn: 'Arrow from «را» to its object',
    descriptionFa: '«را» یک فلش کوچک به واژهٔ پیش از خودش دارد: همان چیزی که کار روی آن انجام می‌شود',
    descriptionEn: '«را» gets a small arrow to the word before it: the thing the action is done to',
    icon: 'arrow-right',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'fa_negation',
    language: 'fa',
    titleFa: 'نشانهٔ نفی (نمی‌…، نیست، ندارم)',
    titleEn: 'Negation mark (نمی‌…, نیست, ندارم)',
    descriptionFa: 'زیرخط موج‌دار و نشان ⊘ روی فعل منفی',
    descriptionEn: 'Wavy underline and ⊘ on the negative verb',
    icon: 'ban',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'fa_clause',
    language: 'fa',
    titleFa: 'شروع جملهٔ وابسته (چون، اگر، وقتی)',
    titleEn: 'Clause start (چون, اگر, وقتی)',
    descriptionFa: 'نشان ↲ پیش از چون، اگر و وقتی',
    descriptionEn: '↲ before چون, اگر and وقتی',
    icon: 'corner-down-left',
    category: 'grammar',
    defaultEnabled: true,
  },
];

// «تا» و «که» نیستند: «تا ساعت پنج» و «کتابی که…» جملهٔ وابستهٔ این نوع نیستند
const FA_SUBORDINATORS = new Set(['چون', 'اگر', 'وقتی', 'چونکه', 'هرچند']);
// فقط پیشوندهایی که تقریباً همیشه فعل منفی‌اند. «ن» تنها کافی نیست (نان، نام، نگاه…).
const FA_NEG_PREFIX = /^(نمی|نیست|ندار|نبود|نخواه|نشد|نکرد)/;

const faClean = (w: string) => clean(w).replace(/[،؛؟]/g, '').replace(/\u200c/g, '');

export function analyzePersianAids(card: LanguageCard, enabledAids: Record<string, boolean>): WordAidsAnnotation {
  const annotation: WordAidsAnnotation = {};
  const text = (card.targetText || '').trim();
  const words = tokenize(text);
  if (words.length < 2) return annotation;

  if (enabledAids.fa_ra_marker !== false) {
    const i = words.findIndex((w, idx) => idx > 0 && faClean(w) === 'را');
    if (i > 0) annotation.objectMarker = { index: i };
  }

  if (enabledAids.fa_negation !== false) {
    const neg = findNegation(words, (_c, _i, raw) => FA_NEG_PREFIX.test(faClean(raw)));
    if (neg.length) annotation.negation = { indices: neg };
  }

  if (enabledAids.fa_clause !== false) {
    const fake = words.map((w) => faClean(w) + (/[،؛]$/.test(w) ? ',' : ''));
    const cl = findClause(fake, FA_SUBORDINATORS);
    if (cl) annotation.clause = cl;
  }

  return annotation;
}
