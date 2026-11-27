import { TrainingWheelAidDefinition, WordAidsAnnotation } from '../types';
import { resolveGenderFromArticle, GENDER_VISUAL_MAP } from '../genderColors';
import { LanguageCard } from '../../../../types';
import { tokenize, clean, findFiniteVerb, findSeparable, findNegation, findTimePhrase, findClause, VerbRules, TimeRules } from './shared';

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
  },
  {
    id: 'nl_subordinate_clause',
    language: 'nl',
    titleFa: 'جملهٔ وابسته: فعل به آخر می‌رود',
    titleEn: 'Subordinate clause: verb goes last',
    descriptionFa: 'بعد از omdat، terwijl، zodat و مانند آن‌ها، شروع جمله‌واره با ↳ و فعلِ آخرش با قرص نیلی نشان داده می‌شود',
    descriptionEn: 'After omdat, terwijl, zodat… the clause start gets ↳ and its final verb an indigo pill',
    icon: 'corner-down-left',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'nl_negation',
    language: 'nl',
    titleFa: 'نشانهٔ نفی (niet و geen)',
    titleEn: 'Negation mark (niet, geen)',
    descriptionFa: 'زیرخط موج‌دار و نشان ⊘ روی niet، geen و nooit',
    descriptionEn: 'Wavy underline and ⊘ on niet, geen and nooit',
    icon: 'ban',
    category: 'grammar',
    defaultEnabled: true,
  },
  {
    id: 'nl_time_frames',
    language: 'nl',
    titleFa: 'قاب عبارت زمان (om acht uur، op maandag)',
    titleEn: 'Time phrase frame (om acht uur, op maandag)',
    descriptionFa: 'قاب نقطه‌چین دور کل عبارت زمان، تا حرف اضافه با عبارتش یک‌تکه یاد گرفته شود',
    descriptionEn: 'Dashed frame around the whole time phrase so the preposition is learned with it',
    icon: 'clock',
    category: 'grammar',
    defaultEnabled: true,
  }
];

// جزء جداشدنیِ فعل: فقط وقتی آخرین واژهٔ جمله‌واره باشد حساب می‌شود
const DUTCH_SEPARABLE_PREFIXES = new Set('op af aan uit in mee toe terug weg door'.split(' '));

const S = (x: string) => new Set(x.split(/\s+/).filter(Boolean));

const NL_VERBS: VerbRules = {
  verbs: S(`ben bent is zijn was waren heb hebt heeft hebben had hadden ga gaat gaan ging gingen kom komt komen kwam kwamen
    doe doet doen deed deden maak maakt maken maakte zie ziet zien zag zeg zegt zeggen zei neem neemt nemen nam
    bel belt bellen belde leer leert leren leerde spreek spreekt spreken sprak zoek zoekt zoeken zocht pak pakt pakken
    wil wilt willen wilde kan kunt kunnen kon moet moeten moest mag mogen mocht zal zult zullen zou zouden
    woon woont wonen werk werkt werken heet weet weten wist vind vindt vinden denk denkt denken blijf blijft blijven
    sta staat staan zit zitten lig ligt loop loopt lopen eet drink drinkt koop koopt kopen geef geeft geven krijg krijgt
    vraag vraagt help helpt hoor hoort kijk kijkt lees leest schrijf schrijft begin begint word wordt worden werd
    bedoel bedoelt begrijp begrijpt versta verstaat hou houdt houd breng brengt stuur stuurt wacht betaal betaalt
    nodigt wast zet`),
  subjects: S('ik jij u hij zij ze we wij jullie men'),
  weakSubjects: S('je het dat dit er'),
  ending: /(t|en)$/,
  notVerbs: S('niet het met dat wat uit ooit nooit echt recht direct een geen alleen tussen binnen buiten boven beneden samen even morgen misschien zelden ook nog al'),
  fronted: S('morgen vandaag nu dan daarna hier daar gisteren straks soms misschien daarom toch helaas'),
  determiners: S('de het een mijn je jouw zijn haar onze ons hun deze die dit dat'),
  nounLike: S('werk was eten drinken pak bel zijn'),
};

const NL_TIME: TimeRules = {
  clockPrep: S('om'),
  clockWord: S('uur'),
  numberWords: S('één twee drie vier vijf zes zeven acht negen tien elf twaalf half kwart'),
  prepNouns: [
    { preps: S('op'), nouns: S('maandag dinsdag woensdag donderdag vrijdag zaterdag zondag') },
    { preps: S('in'), nouns: S('januari februari maart april mei juni juli augustus september oktober november december lente zomer herfst winter weekend ochtend middag avond nacht'), optional: S('de het') },
    { preps: S("'s"), nouns: S('ochtends morgens middags avonds nachts') },
  ],
};

const NL_SUBORDINATORS = S('omdat terwijl zodat hoewel voordat nadat totdat wanneer toen doordat zodra');
const NL_NEGATION = S('niet geen nooit');
const NL_COPULA = S('ben bent is zijn was waren heb hebt heeft hebben had hadden word wordt worden werd');
const NL_PRONOMINAL = S('er daar hier waar');

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
  const words = tokenize(text);

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

  const verbIdx = findFiniteVerb(words, text, NL_VERBS);

  // 3. فعل جداشدنی
  if (enabledAids.nl_separable_verb_link !== false) {
    const sep = findSeparable(words, verbIdx, DUTCH_SEPARABLE_PREFIXES, { notWithVerbs: NL_COPULA, notWithWords: NL_PRONOMINAL });
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

  // 4. جای فعل صرف‌شده (دوم؛ در سؤال بله/خیر اول)
  if (enabledAids.nl_v2_verb_highlight !== false && verbIdx >= 0) {
    annotation.v2Verb = { isV2: true, verbText: clean(words[verbIdx]), position: verbIdx };
  }

  // 5. جملهٔ وابسته: فعل به آخر می‌رود
  if (enabledAids.nl_subordinate_clause !== false) {
    const cl = findClause(words, NL_SUBORDINATORS, { notFirstInQuestion: new Set(['wanneer']), text });
    if (cl) {
      annotation.clause = cl;
      annotation.subordinateVerbFinal = { isSubordinate: true, subordinator: cl.subordinator, endVerb: clean(words[cl.end]), endIndex: cl.end };
    }
  }

  // 6. نفی
  if (enabledAids.nl_negation !== false) {
    const neg = findNegation(words, (c) => NL_NEGATION.has(c));
    if (neg.length) annotation.negation = { indices: neg };
  }

  // 7. عبارت زمان
  if (enabledAids.nl_time_frames !== false) {
    const tp = findTimePhrase(words, NL_TIME);
    if (tp) annotation.timePhrase = tp;
  }

  return annotation;
}
