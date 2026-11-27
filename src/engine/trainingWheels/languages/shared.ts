/**
 * ابزارهای مشترک چرخ‌های کمکی.
 * قاعدهٔ اصلی: حدس نزن. اگر مطمئن نیستیم واژه‌ای فعل یا نشانهٔ نفی است، نشانه نمی‌گذاریم
 * (نشانهٔ غلط بدتر از بی‌نشانگی است). پس همهٔ تشخیص‌ها با فهرست بسته یا قاعدهٔ محکم‌اند.
 */
import { WordAidsAnnotation } from '../types';

export const tokenize = (text: string): string[] => (text || '').trim().split(/\s+/).filter(Boolean);
export const clean = (w: string): string => (w || '').toLowerCase().replace(/[.,!?;:"“”„«»()…]/g, '').replace(/[’`]/g, "'");
export const endsClause = (w: string): boolean => /[,;:]$/.test(w);
export const isQuestion = (text: string): boolean => /[?؟]\s*$/.test(text || '');

const NUM = /^\d{1,2}([:.]\d{2})?$/;

export interface VerbRules {
  /** فعل‌های صرف‌شدهٔ پرکاربرد */
  verbs: Set<string>;
  /** ضمیرهای فاعلیِ بی‌ابهام: واژهٔ بعدشان اگر پایانهٔ فعلی داشته باشد فعل است */
  subjects: Set<string>;
  /** واژه‌هایی که می‌توانند فاعل باشند ولی حرف تعریف یا چیز دیگری هم هستند (het, dat, je, sie) */
  weakSubjects?: Set<string>;
  /** پایانهٔ فعل صرف‌شده، فقط بعد از ضمیر فاعلیِ بی‌ابهام به کار می‌رود */
  ending: RegExp;
  /** واژه‌هایی که پایانهٔ فعلی دارند ولی فعل نیستند */
  notVerbs: Set<string>;
  /** قیدهایی که اول جمله می‌آیند و فعل را دوم نگه می‌دارند */
  fronted: Set<string>;
  /** حرف تعریف و ملکی: بعدشان اسم می‌آید، پس فعل سوم است («De kat is ziek») */
  determiners?: Set<string>;
  /** واژه‌هایی که هم اسم‌اند هم فعل (werk, was): بعد از حرف تعریف اسم‌اند */
  nounLike?: Set<string>;
  /** آلمانی: اسم با حرف بزرگ نوشته می‌شود، پس فعل باید با حرف کوچک باشد */
  verbIsLowercase?: boolean;
}

/** جای فعل صرف‌شده در جملهٔ اصلی (اول در سؤال بله/خیر، دوم در بقیه)؛ اگر مطمئن نیستیم ‎-1 */
export function findFiniteVerb(words: string[], text: string, r: VerbRules): number {
  if (words.length < 2) return -1;
  const w = words.map(clean);
  const anySubject = (x: string) => r.subjects.has(x) || !!r.weakSubjects?.has(x);
  const lower = (i: number) => !r.verbIsLowercase || /^[a-zäöüß]/.test(words[i].replace(/^["„«(]+/, ''));
  const known = (i: number) => r.verbs.has(w[i]) && (i === 0 || lower(i));
  const byEnding = (i: number) => lower(i) && r.ending.test(w[i]) && !r.notVerbs.has(w[i]) && !anySubject(w[i]) && !r.determiners?.has(w[i]);
  // سؤال بله/خیر: فعل اول، فاعل دوم
  if (isQuestion(text) && r.verbs.has(w[0]) && anySubject(w[1])) return 0;
  if (r.subjects.has(w[0]) && (known(1) || byEnding(1))) return 1;
  if (known(1) && !r.verbs.has(w[0]) && !(r.determiners?.has(w[0]) && r.nounLike?.has(w[1]))) return 1;
  if (r.fronted.has(w[0]) && w.length >= 3 && anySubject(w[2]) && byEnding(1)) return 1;
  // «De kat is ziek»: حرف تعریف + اسم + فعل
  if (w.length >= 3 && r.determiners?.has(w[0]) && !r.verbs.has(w[1]) && known(2)) return 2;
  return -1;
}

const BREAKERS = new Set(['und', 'oder', 'aber', 'en', 'of', 'maar', 'and', 'or', 'but']);

/** فعل جداشدنی: فعل صرف‌شده + جزء جداشده که آخرین واژهٔ همان جمله‌واره است */
export function findSeparable(
  words: string[],
  verbIdx: number,
  prefixes: Set<string>,
  opts: { notWithVerbs?: Set<string>; notWithWords?: Set<string> } = {}
): { verbIndex: number; particleIndex: number } | null {
  if (verbIdx < 0) return null;
  // «Het is op zondag dicht»: بعد از «بودن/داشتن» واژهٔ آخر صفت است، نه جزء فعل
  if (opts.notWithVerbs?.has(clean(words[verbIdx]))) return null;
  // «Ik laat je er dan mee»: با er/daar واژهٔ آخر قید ضمیری است
  if (opts.notWithWords && words.some((x) => opts.notWithWords!.has(clean(x)))) return null;
  let end = words.length - 1;
  for (let i = verbIdx; i < words.length; i++) if (endsClause(words[i])) { end = i; break; }
  if (end - verbIdx < 2) return null; // «Ik ga uit» خیلی کوتاه است و «uit» می‌تواند حرف اضافه باشد
  // «… und lege sie ab»: بعد از «و/یا/اما» فعل دیگری آمده و جزء مالِ آن است
  for (let i = verbIdx + 1; i < end; i++) if (BREAKERS.has(clean(words[i]))) return null;
  return prefixes.has(clean(words[end])) ? { verbIndex: verbIdx, particleIndex: end } : null;
}

export function findNegation(words: string[], isNeg: (cleanWord: string, i: number, raw: string) => boolean): number[] {
  const out: number[] = [];
  words.forEach((raw, i) => { if (isNeg(clean(raw), i, raw)) out.push(i); });
  return out;
}

export interface TimeRules {
  /** حرف اضافهٔ ساعت + واژه‌ای که بعد از عدد می‌آید (uur / Uhr / o'clock) */
  clockPrep: Set<string>;
  clockWord: Set<string>;
  numberWords: Set<string>;
  /** حرف اضافه ← واژه‌هایی که بعدش عبارت زمان می‌سازند (روز هفته، ماه، بخش روز) */
  prepNouns: Array<{ preps: Set<string>; nouns: Set<string>; optional?: Set<string> }>;
}

/** اولین عبارت زمانِ جمله: کل عبارت قاب می‌گیرد، نه فقط حرف اضافه */
export function findTimePhrase(words: string[], r: TimeRules): { start: number; end: number } | null {
  const w = words.map(clean);
  for (let i = 0; i < w.length - 1; i++) {
    if (r.clockPrep.has(w[i]) && (NUM.test(w[i + 1]) || r.numberWords.has(w[i + 1]))) {
      let end = i + 1;
      if (w[end + 1] && (r.clockWord.has(w[end + 1]) || r.numberWords.has(w[end + 1]))) end++;
      if (w[end + 1] && r.clockWord.has(w[end + 1])) end++;
      return { start: i, end };
    }
    for (const p of r.prepNouns) {
      if (!p.preps.has(w[i])) continue;
      if (p.nouns.has(w[i + 1])) return { start: i, end: i + 1 };
      if (p.optional?.has(w[i + 1]) && w[i + 2] && p.nouns.has(w[i + 2])) return { start: i, end: i + 2 };
    }
  }
  return null;
}

/** جمله‌وارهٔ وابسته: از حرف ربط تا اولین ویرگول یا آخر جمله */
export function findClause(words: string[], subordinators: Set<string>, opts: { notFirstInQuestion?: Set<string>; text?: string; accept?: (i: number, c: string) => boolean } = {}): { start: number; end: number; subordinator: string } | null {
  for (let i = 0; i < words.length - 1; i++) {
    const c = clean(words[i]);
    if (!subordinators.has(c)) continue;
    if (i === 0 && opts.notFirstInQuestion?.has(c) && isQuestion(opts.text || '')) continue;
    if (opts.accept && !opts.accept(i, c)) continue;
    let end = words.length - 1;
    for (let j = i + 1; j < words.length; j++) if (endsClause(words[j])) { end = j; break; }
    if (end - i < 2) continue;
    return { start: i, end, subordinator: c };
  }
  return null;
}

/**
 * «هر کارت حداکثر دو کمک»: شلوغی توجه را از معنا می‌گیرد.
 * ترتیب اولویت: جنس (با پسوند مصغر یکی حساب می‌شود) ← حالت ← فعل جداشدنی ← جملهٔ وابسته ← جای فعل ← «را» ← نفی ← زمان.
 */
export function limitAids(a: WordAidsAnnotation, max = 2): WordAidsAnnotation {
  const out: WordAidsAnnotation = {};
  let n = 0;
  const take = (ok: unknown, apply: () => void) => { if (ok && n < max) { apply(); n++; } };
  take(a.gender || a.diminutive, () => { out.gender = a.gender; out.diminutive = a.diminutive; });
  take(a.caseEnding, () => { out.caseEnding = a.caseEnding; });
  take(a.separableVerb, () => { out.separableVerb = a.separableVerb; });
  take(a.clause || a.subordinateVerbFinal, () => { out.clause = a.clause; out.subordinateVerbFinal = a.subordinateVerbFinal; });
  // فعل جداشدنی خودش جای فعل را نشان می‌دهد
  take(a.v2Verb && !out.separableVerb, () => { out.v2Verb = a.v2Verb; });
  take(a.objectMarker, () => { out.objectMarker = a.objectMarker; });
  take(a.negation, () => { out.negation = a.negation; });
  take(a.timePhrase, () => { out.timePhrase = a.timePhrase; });
  return out;
}
