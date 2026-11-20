/**
 * اصلاح‌های کیفیت متن که بعد از ادغام منابع و پیش از نوشتن فایل‌های بانک کارت اجرا می‌شود.
 * Post-merge fixes applied by importDatabase.ts before any deck file is written,
 * so they survive every re-run of the pipeline. Found by the full sentence/level audit (Nov 2026).
 * Every fix is idempotent.
 */

// 1. Exact text replacements per (language, conceptId)
const EXACT: Record<string, string> = {
  'zh|c_ill_add_you_on_whatsapp': '我在WhatsApp上加你。',
  'nl|c_better_safe_than_sorry': 'Voorkomen is beter dan genezen.',
};

// 2. Cyrillic look-alike letters typed by mistake inside Latin-script words (e.g. «guidо», «utrzymaм»)
const CYRILLIC_LOOKALIKES: Record<string, string> = {
  'о': 'o', 'а': 'a', 'е': 'e', 'с': 'c', 'р': 'p', 'х': 'x', 'м': 'm', 'О': 'O', 'А': 'A', 'Е': 'E',
};
const fixCyrillicInLatin = (t: string) => t.replace(/[оаесрхмОАЕ]/g, (ch) => CYRILLIC_LOOKALIKES[ch] || ch);

// 3. Persian words left inside Hindi sentences
const fixHindi = (t: string) =>
  t
    .replace(/سقف/g, 'सीमा') // cap / ceiling (feminine, matches «की»)
    .replace(/पतला پرده वाला/g, 'बमुश्किल छिपा हुआ') // "thinly veiled"
    .replace(/حاشیه‌ای/g, 'मामूली'); // "marginal" (concern)

// 4. Persian letters typed in Arabic text: ک → ك everywhere; ی → ي when a letter follows.
//    A final ی is left alone: it renders like ى and ي/ى cannot be told apart without a dictionary.
const fixArabic = (t: string) => t.replace(/ک/g, 'ك').replace(/ی(?=[ء-يٮ-ۓ])/g, 'ي');

// 5. English proper nouns written in lower case («monday», «spain»)
const PROPER = new Set([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'english', 'persian', 'dutch', 'german', 'french', 'spanish', 'italian', 'chinese', 'japanese', 'arabic', 'turkish',
  'spain', 'france', 'germany', 'italy', 'iran', 'china', 'japan', 'england', 'london', 'paris', 'netherlands', 'america',
]);
const fixEnglish = (t: string) => {
  const s = t.trim();
  return PROPER.has(s) ? t.replace(s, s[0].toUpperCase() + s.slice(1)) : t;
};

const PER_LANG: Record<string, (t: string) => string> = {
  ar: fixArabic,
  hi: fixHindi,
  en: fixEnglish, 'en-US': fixEnglish, 'en-GB': fixEnglish,
  it: fixCyrillicInLatin, pt: fixCyrillicInLatin, pl: fixCyrillicInLatin, es: fixCyrillicInLatin,
  fr: fixCyrillicInLatin, de: fixCyrillicInLatin, nl: fixCyrillicInLatin, tr: fixCyrillicInLatin,
};

export function fixDeckText(lang: string, conceptId: string, text: string): string {
  const exact = EXACT[`${lang}|${conceptId}`];
  if (exact) return exact;
  const f = PER_LANG[lang];
  return f ? f(text) : text;
}

/**
 * Applies all text fixes and makes card ids unique (137 rows of
 * «a1_a2_multilingual_level_check_N» reused an id of another concept; the later row gets «…_b_N»).
 * Mutates and returns the cards.
 */
export function applyDeckQualityFixes<T extends { id: string; conceptId?: string; translations?: Record<string, any> }>(cards: T[]): T[] {
  const seen = new Set<string>();
  for (const c of cards) {
    if (seen.has(c.id)) {
      let id = c.id.replace('a1_a2_multilingual_level_check_', 'a1_a2_multilingual_level_check_b_');
      let n = 2;
      while (seen.has(id)) id = `${c.id}_${n++}`;
      c.id = id;
    }
    seen.add(c.id);
    for (const [lang, tr] of Object.entries(c.translations || {})) {
      if (tr && typeof tr.text === 'string') tr.text = fixDeckText(lang, c.conceptId || c.id, tr.text);
    }
  }
  return cards;
}
