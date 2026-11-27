import { TrainingWheelAidDefinition, WordAidsAnnotation } from '../types';
import { resolveGenderFromArticle, GENDER_VISUAL_MAP } from '../genderColors';
import { LanguageCard } from '../../../../types';
import { tokenize, clean, findFiniteVerb, findSeparable, findNegation, findTimePhrase, findClause, VerbRules, TimeRules } from './shared';

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
  },
  {
    id: 'de_v2_verb_highlight',
    language: 'de',
    titleFa: 'جای فعل صرف‌شده (دوم؛ در سؤال اول)',
    titleEn: 'Finite verb position (second; first in questions)',
    descriptionFa: 'قرص نیلی دور فعل صرف‌شدهٔ جملهٔ اصلی',
    descriptionEn: 'Indigo pill around the finite verb of the main clause',
    icon: 'bookmark',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'de_separable_verb_link',
    language: 'de',
    titleFa: 'اتصال نقطه‌چین فعل جداشدنی (rufe … an)',
    titleEn: 'Dotted link for separable verbs (rufe … an)',
    descriptionFa: 'خط نقطه‌چین نیلی زیر فعل و جزئی که به آخر جمله رفته',
    descriptionEn: 'Indigo dotted underline on the verb and the particle sent to the end',
    icon: 'link',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'de_negation',
    language: 'de',
    titleFa: 'نشانهٔ نفی (nicht و kein)',
    titleEn: 'Negation mark (nicht, kein)',
    descriptionFa: 'زیرخط موج‌دار و نشان ⊘ روی nicht، kein و nie',
    descriptionEn: 'Wavy underline and ⊘ on nicht, kein and nie',
    icon: 'ban',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'de_time_frames',
    language: 'de',
    titleFa: 'قاب عبارت زمان (um acht Uhr، am Montag)',
    titleEn: 'Time phrase frame (um acht Uhr, am Montag)',
    descriptionFa: 'قاب نقطه‌چین دور کل عبارت زمان',
    descriptionEn: 'Dashed frame around the whole time phrase',
    icon: 'clock',
    category: 'grammar',
    defaultEnabled: true,
  }
];

const S = (x: string) => new Set(x.split(/\s+/).filter(Boolean));

// فقط حرف ربط‌هایی که معنی دیگری ندارند (als، da، während و damit کنار گذاشته شده‌اند)
const GERMAN_SUBORDINATORS = S('weil dass daß wenn ob obwohl bevor nachdem solange sodass falls');

const ACC = S('den einen keinen meinen deinen seinen ihren unseren');
const DAT_M = S('dem einem keinem meinem deinem seinem ihrem unserem');
const DAT_CONTRACTED_M = S('zum im am vom beim');
const DER_FORMS = S('der einer keiner meiner deiner seiner ihrer');
const GEN = S('des eines keines meines deines seines');
/** بعد از این حرف‌های اضافه همیشه «به/برای» (Dativ) می‌آید */
const DATIVE_PREPS = S('mit zu bei von aus nach seit');

const DE_VERBS: VerbRules = {
  verbs: S(`bin bist ist sind seid war waren habe hast hat haben habt hatte hatten gehe gehst geht gehen komme kommst kommt kommen
    mache machst macht machen kann kannst können könnt will willst wollen muss musst müssen darf dürfen soll sollen
    möchte möchtest möchten werde wirst wird werden wohne wohnst wohnt wohnen heiße heißt heißen lerne lernst lernt lernen
    arbeite arbeitet arbeiten spreche sprichst spricht sprechen sehe siehst sieht sehen gebe gibst gibt geben
    nehme nimmst nimmt nehmen weiß weißt wissen brauche braucht brauchen rufe rufst ruft rufen kaufe kauft kaufen
    stehe steht stehen fahre fährst fährt fahren esse isst trinke trinkt finde findest findet finden glaube glaubt
    denke denkt bleibe bleibt bleiben hätte wäre würde könnte sollte fange fängt höre hört lese liest schreibe schreibt
    helfe hilft zeige zeigt bringe bringt hole holt lade lädt mag magst mögen gefällt tut tue läuft laufe sage sagt
    frage fragt warte wartet suche sucht liebe liebt verstehe versteht kenne kennt`),
  subjects: S('ich du er wir ihr man'),
  weakSubjects: S('sie es das'),
  ending: /(e|st|t|en)$/,
  notVerbs: S(`nicht heute gerne alle eine keine meine bitte danke jetzt oft mit fast erst selbst bereit vielleicht recht echt
    statt weit seit morgen zusammen hinten unten oben draußen drinnen wegen gegen zwischen neben einen keinen meinen den ihn
    ihnen diesen beide viele ohne lange diese jede`),
  fronted: S('heute morgen jetzt dann hier danach später gestern leider vielleicht deshalb trotzdem manchmal'),
  determiners: S('der die das ein eine mein meine dein deine sein seine ihr ihre unser unsere dieser diese dieses'),
  verbIsLowercase: true,
};

// جزء جداشدنی: فقط وقتی آخرین واژهٔ جمله‌واره باشد
const DE_SEPARABLE_PREFIXES = S('an auf aus ein mit ab vor zurück weg los zu her hin fern fest teil vorbei weiter zusammen');
const DE_COPULA = S('bin bist ist sind seid war waren habe hast hat haben habt hatte hatten werde wirst wird werden');
const DE_NEGATION = S('nicht nie nichts kein keine keinen keinem keiner keines');

const DE_TIME: TimeRules = {
  clockPrep: S('um'),
  clockWord: S('uhr'),
  numberWords: S('eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf halb'),
  prepNouns: [
    { preps: S('am'), nouns: S('montag dienstag mittwoch donnerstag freitag samstag sonntag morgen vormittag mittag nachmittag abend wochenende') },
    { preps: S('im'), nouns: S('januar februar märz april mai juni juli august september oktober november dezember frühling sommer herbst winter') },
  ],
};

/** واژه‌ای که حرفش به‌خاطر حالت عوض شده. «der» فقط بعد از حرف اضافهٔ Dativ حساب می‌شود، وگرنه همان «der» معمولی است. */
function findCaseWord(words: string[]): { index: number; ending: string; caseType?: 'accusative' | 'dative' | 'genitive' } | null {
  const w = words.map(clean);
  for (let i = 0; i < w.length; i++) {
    const afterDativePrep = i > 0 && DATIVE_PREPS.has(w[i - 1]) && !/[,;:.!?]$/.test(words[i - 1]);
    if (ACC.has(w[i])) {
      // «den Dingen» (جمع، «به/برای») و «den Garten» (مفرد، گیرندهٔ کار) از روی شکل جدا نمی‌شوند: نوع را حدس نمی‌زنیم
      const ambiguous = w[i] === 'den' && !afterDativePrep && /n$/.test(w[i + 1] || '');
      return { index: i, ending: 'en', caseType: ambiguous ? undefined : afterDativePrep ? 'dative' : 'accusative' };
    }
    if (DAT_M.has(w[i])) return { index: i, ending: 'em', caseType: 'dative' };
    if (DAT_CONTRACTED_M.has(w[i])) return { index: i, ending: 'm', caseType: 'dative' };
    if (w[i] === 'zur') return { index: i, ending: 'r', caseType: 'dative' };
    if (DER_FORMS.has(w[i]) && afterDativePrep) return { index: i, ending: 'er', caseType: 'dative' };
    if (GEN.has(w[i]) && i > 0) return { index: i, ending: 'es', caseType: 'genitive' };
  }
  return null;
}

/**
 * Analyzes a German target phrase or sentence for all active training wheels aids
 */
export function analyzeGermanAids(
  card: LanguageCard,
  enabledAids: Record<string, boolean>
): WordAidsAnnotation {
  const annotation: WordAidsAnnotation = {};
  const text = (card.targetText || '').trim();
  const words = tokenize(text);

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

  // 2. حرفی که به‌خاطر حالت عوض شده
  if (enabledAids.de_case_endings !== false) {
    const cw = findCaseWord(words);
    if (cw) annotation.caseEnding = { hasEnding: true, endingText: cw.ending, caseType: cw.caseType, index: cw.index };
  }

  // 3. جملهٔ وابسته: فعل به آخر می‌رود
  if (enabledAids.de_subordinate_verb_final !== false) {
    const cl = findClause(words, GERMAN_SUBORDINATORS);
    if (cl) {
      annotation.clause = cl;
      annotation.subordinateVerbFinal = { isSubordinate: true, subordinator: cl.subordinator, endVerb: clean(words[cl.end]), endIndex: cl.end };
    }
  }

  const verbIdx = findFiniteVerb(words, text, DE_VERBS);

  // 4. فعل جداشدنی
  if (enabledAids.de_separable_verb_link !== false) {
    const sep = findSeparable(words, verbIdx, DE_SEPARABLE_PREFIXES, { notWithVerbs: DE_COPULA });
    if (sep) {
      annotation.separableVerb = {
        isSeparable: true,
        verbPart: clean(words[sep.verbIndex]),
        particlePart: clean(words[sep.particleIndex]),
        verbIndex: sep.verbIndex,
        particleIndex: sep.particleIndex,
      };
    }
  }

  // 5. جای فعل صرف‌شده
  if (enabledAids.de_v2_verb_highlight !== false && verbIdx >= 0) {
    annotation.v2Verb = { isV2: true, verbText: clean(words[verbIdx]), position: verbIdx };
  }

  // 6. نفی
  if (enabledAids.de_negation !== false) {
    const neg = findNegation(words, (c) => DE_NEGATION.has(c));
    if (neg.length) annotation.negation = { indices: neg };
  }

  // 7. عبارت زمان
  if (enabledAids.de_time_frames !== false) {
    const tp = findTimePhrase(words, DE_TIME);
    if (tp) annotation.timePhrase = tp;
  }

  return annotation;
}
