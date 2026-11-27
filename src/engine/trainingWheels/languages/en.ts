import { TrainingWheelAidDefinition, WordAidsAnnotation } from '../types';
import { LanguageCard } from '../../../../types';
import { tokenize, clean, findFiniteVerb, findNegation, findTimePhrase, findClause, VerbRules, TimeRules } from './shared';

/**
 * انگلیسی جنس دستوری ندارد، پس رنگ جنس اینجا هیچ‌وقت نمی‌آید.
 * کمک‌ها: فعل کمکی و be (که در سؤال اول می‌آید)، نفی، عبارت زمان با at/on/in، جملهٔ وابسته.
 */
export const ENGLISH_AIDS: TrainingWheelAidDefinition[] = [
  {
    id: 'en_aux_verb_highlight',
    language: 'en',
    titleFa: 'فعل کمکی و be (do، is، can…)',
    titleEn: 'Helper verbs and be (do, is, can…)',
    descriptionFa: 'قرص نیلی دور do، does، is، can و مانند آن‌ها؛ در سؤال اول جمله می‌آیند',
    descriptionEn: 'Indigo pill around do, does, is, can…; they move to the front in questions',
    icon: 'bookmark',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'en_negation',
    language: 'en',
    titleFa: "نشانهٔ نفی (not، n't، never)",
    titleEn: "Negation mark (not, n't, never)",
    descriptionFa: "زیرخط موج‌دار و نشان ⊘ روی not، don't، never و no",
    descriptionEn: "Wavy underline and ⊘ on not, don't, never and no",
    icon: 'ban',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'en_time_frames',
    language: 'en',
    titleFa: 'قاب عبارت زمان (at six، on Monday، in May)',
    titleEn: 'Time phrase frame (at six, on Monday, in May)',
    descriptionFa: 'قاب نقطه‌چین دور کل عبارت زمان، تا at / on / in با عبارتش یک‌تکه یاد گرفته شود',
    descriptionEn: 'Dashed frame around the whole time phrase so at / on / in is learned with it',
    icon: 'clock',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'en_clause',
    language: 'en',
    titleFa: 'شروع جملهٔ وابسته (because، if، although)',
    titleEn: 'Clause start (because, if, although)',
    descriptionFa: 'نشان ↳ پیش از because، if، although و مانند آن‌ها',
    descriptionEn: '↳ before because, if, although…',
    icon: 'corner-down-left',
    category: 'grammar',
    defaultEnabled: true,
  },
];

const S = (x: string) => new Set(x.split(/\s+/).filter(Boolean));

const EN_VERBS: VerbRules = {
  verbs: S("do does did is are am was were can could will would should shall must may might have has had don't doesn't didn't isn't aren't wasn't weren't can't couldn't won't wouldn't shouldn't haven't hasn't hadn't"),
  subjects: S('i you he she we they'),
  weakSubjects: S('it there this that these those'),
  ending: /$^/, // انگلیسی پایانهٔ قابل‌اعتماد ندارد: فقط فهرست بسته
  notVerbs: new Set(),
  fronted: new Set(),
  determiners: S('the a an my your his her our their this that'),
  nounLike: S('can will may might must'),
};

const EN_TIME: TimeRules = {
  clockPrep: S('at'),
  clockWord: S("o'clock am pm a.m p.m"),
  numberWords: S('two three four five six seven eight nine ten eleven twelve half'),
  prepNouns: [
    { preps: S('at'), nouns: S('noon midnight night') },
    { preps: S('on'), nouns: S('monday tuesday wednesday thursday friday saturday sunday') },
    { preps: S('in'), nouns: S('january february march april may june july august september october november december spring summer autumn fall winter morning afternoon evening'), optional: S('the') },
  ],
};

const EN_SUBORDINATORS = S('because although though unless while if when until whereas');

export function analyzeEnglishAids(card: LanguageCard, enabledAids: Record<string, boolean>): WordAidsAnnotation {
  const annotation: WordAidsAnnotation = {};
  const text = (card.targetText || '').trim();
  const words = tokenize(text);
  if (words.length < 2) return annotation;

  if (enabledAids.en_aux_verb_highlight !== false) {
    const v = findFiniteVerb(words, text, EN_VERBS);
    if (v >= 0) annotation.v2Verb = { isV2: true, verbText: clean(words[v]), position: v };
  }

  if (enabledAids.en_negation !== false) {
    const neg = findNegation(words, (c, i, raw) => {
      if (c === 'not' || c === 'never' || /n't$/.test(c)) return true;
      // «No, thanks» جواب است، نه نفیِ اسم؛ «no time» نفی است
      return c === 'no' && i < words.length - 1 && !/[,.!?]$/.test(raw);
    });
    if (neg.length) annotation.negation = { indices: neg };
  }

  if (enabledAids.en_time_frames !== false) {
    const tp = findTimePhrase(words, EN_TIME);
    if (tp) annotation.timePhrase = tp;
  }

  if (enabledAids.en_clause !== false) {
    const cl = findClause(words, EN_SUBORDINATORS, { notFirstInQuestion: new Set(['when', 'if']), text });
    if (cl) annotation.clause = cl;
  }

  return annotation;
}
