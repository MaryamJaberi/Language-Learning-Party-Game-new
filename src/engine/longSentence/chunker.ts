/**
 * «پازل تکه‌ها» — داربست یادگیری برای جمله‌های بلند.
 *
 * چرا: حافظهٔ کاری حدود ۴ «تکه» را هم‌زمان نگه می‌دارد. جملهٔ ۱۸ کلمه‌ای اگر کلمه‌به‌کلمه دیده شود زیاد است،
 * ولی اگر ۳ تکهٔ معنادار باشد قابل‌هضم است (chunking). چیدن تکه‌ها به ترتیب، توجه را به ساختار جمله می‌برد
 * و نیاز به تایپِ طولانی را برمی‌دارد. با هر بار موفقیت تکه‌ها ریزتر می‌شوند و در پایان داربست برداشته می‌شود
 * (همان منطق «چرخ‌های کمکی»).
 *
 * مرحله‌ها (برای هر کارت جدا، در حافظهٔ همین دستگاه):
 *   0 → ۲ تا ۳ تکهٔ بزرگ   1 → ۴ تا ۵ تکه   2 → ۶ تا ۷ تکه   3 به بعد → بدون پازل (تایپ یا گفتن کامل)
 */

const NO_SPACE_LANGS = new Set(['zh', 'ja', 'ko', 'th']);
export const MAX_PUZZLE_STAGE = 3;
const PIECES_BY_STAGE = [3, 5, 7];
const STORAGE_KEY = 'dor_sentence_puzzle_v1';

function tokens(text: string, lang: string): string[] {
  const clean = (text || '').trim();
  if (!clean) return [];
  if (NO_SPACE_LANGS.has(lang) && !/\s/.test(clean)) {
    try {
      const seg = new (Intl as any).Segmenter(lang, { granularity: 'word' });
      const out: string[] = [];
      for (const s of seg.segment(clean) as Iterable<{ segment: string; isWordLike?: boolean }>) {
        // نشانهٔ نگارشی به کلمهٔ قبل می‌چسبد
        if (!s.isWordLike && out.length) out[out.length - 1] += s.segment;
        else out.push(s.segment);
      }
      return out.filter((t) => t.trim());
    } catch {
      return Array.from(clean);
    }
  }
  return clean.split(/\s+/).filter(Boolean);
}

export function countUnits(text: string, lang: string): number {
  return tokens(text, lang).length;
}

/** جمله برای پازل «بلند» حساب می‌شود؟ */
export function isLongSentence(text: string, lang: string): boolean {
  return countUnits(text, lang) >= 9;
}

/** مرز طبیعی بعد از این توکن؟ (نشانهٔ نگارشی پایان عبارت) */
function isBoundary(tok: string): boolean {
  return /[;,:،؛—–，；：、。]["'»”)]?$/.test(tok);
}

/**
 * جمله را به حداکثر `pieces` تکهٔ پشت‌سرهم می‌شکند. اول از مرزهای طبیعی (ویرگول، نقطه‌ویرگول، …)،
 * و اگر تکه‌ای هنوز بزرگ بود، از وسط. چسباندن دوبارهٔ تکه‌ها همان جملهٔ اصلی را می‌دهد.
 */
/**
 * قالب‌های آغازین پرکاربرد انگلیسی. اگر جمله با یکی از این‌ها شروع شود، همان قالب یک تکهٔ کامل می‌ماند
 * («See if you can | … »، «It would be great if | …») تا بازیکن قالب را به شکل یک واحد یاد بگیرد.
 */
const EN_FRAME_OPENERS = [
  'it would be great if', 'see if you can', 'could you check if', 'when it comes to', 'as far as i know',
  'would you mind if', 'do you mind if', 'i was wondering if', 'is there any chance', 'how long do i have',
  'check if', 'if i may', 'by when', 'in terms of', 'apart from', 'aside from', 'regardless of',
  'compared to', 'depending on', 'not to mention', 'instead of', 'you should have', 'you could have',
  'why should i', 'i have been', "i've been", 'let me', 'could you', 'would you',
].map((f) => f.split(' '));

/** قالب‌های آغازین پرکاربرد هلندی */
const NL_FRAME_OPENERS = [
  'het zou fijn zijn als', 'kun je even kijken of', 'mag ik vragen', 'in vergelijking met', 'afgezien van',
  'het hangt af van', 'volgens mij', 'zou je', 'kun je', 'kunt u', 'heb je zin om', 'ik wil graag',
].map((f) => f.split(' '));

function frameOpenerLength(toks: string[], lang: string): number {
  const isEn = lang === 'en' || lang.startsWith('en-');
  const isNl = lang === 'nl' || lang.startsWith('nl-');
  if (!isEn && !isNl) return 0;
  const openers = isEn ? EN_FRAME_OPENERS : NL_FRAME_OPENERS;
  const norm = toks.map((t) => t.toLowerCase().replace(/[’`]/g, "'").replace(/[.,!?;:]+$/, ''));
  let best = 0;
  for (const f of openers) {
    if (f.length > best && f.length < toks.length && f.every((w, i) => norm[i] === w)) best = f.length;
  }
  return best;
}

export function chunkSentence(text: string, lang: string, pieces: number): string[] {
  const toks = tokens(text, lang);
  const opener = frameOpenerLength(toks, lang);
  if (opener > 0 && pieces >= 3 && toks.length - opener >= 2) {
    return [toks.slice(0, opener).join(' '), ...chunkSentence(toks.slice(opener).join(' '), lang, pieces - 1)];
  }
  const joiner = NO_SPACE_LANGS.has(lang) && !/\s/.test(text.trim()) ? '' : ' ';
  if (toks.length <= 1) return toks;
  const target = Math.max(2, Math.min(pieces, toks.length));

  // تکه‌های اولیه از روی مرزهای طبیعی
  let groups: string[][] = [[]];
  for (const t of toks) {
    groups[groups.length - 1].push(t);
    if (isBoundary(t)) groups.push([]);
  }
  groups = groups.filter((g) => g.length);

  // بزرگ‌ترین تکه را از وسط نصف کن تا به تعداد برسیم
  while (groups.length < target) {
    let idx = 0;
    for (let i = 1; i < groups.length; i++) if (groups[i].length > groups[idx].length) idx = i;
    const g = groups[idx];
    if (g.length < 2) break;
    const mid = Math.ceil(g.length / 2);
    groups.splice(idx, 1, g.slice(0, mid), g.slice(mid));
  }
  // کوچک‌ترین جفتِ کنار هم را یکی کن تا از تعداد بیشتر نشود
  while (groups.length > target) {
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < groups.length - 1; i++) {
      const size = groups[i].length + groups[i + 1].length;
      if (size < best) { best = size; idx = i; }
    }
    groups.splice(idx, 2, [...groups[idx], ...groups[idx + 1]]);
  }
  return groups.map((g) => g.join(joiner));
}

export function piecesForStage(stage: number): number {
  return PIECES_BY_STAGE[Math.max(0, Math.min(stage, PIECES_BY_STAGE.length - 1))];
}

function readStages(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function getPuzzleStage(cardKey: string): number {
  return Number(readStages()[cardKey]) || 0;
}

/** بعد از حل پازل: بدون اشتباه (یا با یک اشتباه) یک مرحله جلو؛ با اشتباه زیاد همان مرحله می‌ماند. */
export function recordPuzzleSolved(cardKey: string, mistakes: number): number {
  const all = readStages();
  const cur = Number(all[cardKey]) || 0;
  const next = mistakes <= 1 ? Math.min(MAX_PUZZLE_STAGE, cur + 1) : cur;
  all[cardKey] = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* حافظه پر یا در دسترس نیست: فقط همین جلسه */
  }
  return next;
}

/** ترتیب درهمِ پایدار (برای هر کارت و مرحله یکسان، تا با هر رندر عوض نشود) و هرگز برابر ترتیب درست. */
export function shuffledOrder(n: number, seedText: string): number[] {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (n > 1 && order.every((v, i) => v === i)) order.push(order.shift() as number);
  return order;
}
