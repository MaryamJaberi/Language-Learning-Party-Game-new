/**
 * «بازی‌های الگو»: الگوها و عبارت‌های کاربردی به شکل کارت وارد همان بازی‌های موجود می‌شوند.
 *  - تک‌نفره: پازل تکه‌ها با مرزِ خودِ الگو («See if you can | push it | to next week.») و چهارگزینه‌ای
 *  - دونفره (حضوری و آنلاین): «کدام درست است؟» — گزینه‌های غلط همان اشتباه‌های رایج‌اند
 *  - گروهی (حضوری و اتاق آنلاین): «جمله را برسان» — هم‌تیمی باید همان جمله را بگوید
 * چون خروجی فقط «کارت» است، هر جا کارت‌ها می‌روند (از جمله اتاق و دوئل آنلاین) این بازی‌ها هم می‌روند.
 */
import type { LanguageCard, Language } from '../types';
import type { PatternCategory, PatternDeck, PatternMode } from './types';
import { EN_PATTERNS } from './en';
import { NL_PATTERNS } from './nl';
import { DE_PATTERNS } from './de';
import { tx } from '../i18n/runtime';

const DECKS: Record<string, PatternDeck> = { en: EN_PATTERNS, nl: NL_PATTERNS, de: DE_PATTERNS };

/** همهٔ دسته‌های آماده (برای تست‌ها و ابزارها) */
export function getAllPatternDecks(): PatternDeck[] {
  return Object.values(DECKS);
}
/** زبان‌های مادری‌ای که معنی/موقعیتِ کارت‌ها برایشان نوشته شده */
const NATIVE_READY = new Set(['fa']);
const PREF_KEY = 'dor_pattern_games_v1';

const deckLang = (target: string) => (target.startsWith('en-') ? 'en' : target.startsWith('nl-') ? 'nl' : target.startsWith('de-') ? 'de' : target);

/** اولین زبان هدفی که برای این زبان مادری بازی الگو دارد */
export function firstPatternTarget(targets: Array<string | undefined>, native: string): string | undefined {
  return targets.find((t): t is string => !!t && hasPatternDeck(t, native));
}

export function hasPatternDeck(target: string, native: string): boolean {
  return !!DECKS[deckLang(target)] && NATIVE_READY.has(native);
}

export function getPatternCategories(target: string): PatternCategory[] {
  return DECKS[deckLang(target)]?.categories || [];
}

export function isPatternCategory(id: string): boolean {
  return id.startsWith('PAT_');
}

const POINTS: Record<string, [LanguageCard['difficulty'], number]> = {
  A1: ['easy', 1], A2: ['easy', 1], B1: ['medium', 2], B2: ['hard', 3], C1: ['hard', 4],
};

export function getPatternCards(target: Language | string, native: Language | string, categoryIds: string[]): LanguageCard[] {
  if (!hasPatternDeck(target, native)) return [];
  const out: LanguageCard[] = [];
  for (const cat of getPatternCategories(target)) {
    if (!categoryIds.includes(cat.id)) continue;
    const [difficulty, points] = POINTS[cat.level] || ['medium', 2];
    cat.items.forEach(([text, fa, wrong, noteFa], i) => {
      const chunks = text.split('|').map((s) => s.trim()).filter(Boolean);
      const card: any = {
        id: `pat_${deckLang(target)}_${cat.id.slice(4).toLowerCase()}_${i + 1}`,
        targetLanguage: target as Language,
        nativeLanguage: native as Language,
        cefrLevel: cat.level,
        topic: cat.id,
        contentType: 'Sentence',
        learningMode: 'Translate',
        prompt: tx(native === 'fa', 'این جمله را طوری به هم‌تیمی‌ات برسان که همین را بگوید', 'Get this sentence across so your teammate says it'),
        targetText: chunks.join(' '),
        translation: fa,
        grammarPoint: noteFa,
        difficulty,
        points,
        // فیلدهای ویژهٔ بازی‌های الگو
        puzzleChunks: chunks,
        fixedOptions: wrong,
      };
      out.push(card as LanguageCard);
    });
  }
  return out;
}

function readPrefs(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function getPatternPrefs(mode: PatternMode): string[] {
  const v = readPrefs()[mode];
  return Array.isArray(v) ? v.filter(isPatternCategory) : [];
}

export function setPatternPrefs(mode: PatternMode, ids: string[]): void {
  const all = readPrefs();
  all[mode] = ids;
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

/**
 * اگر بازیکن برای این حالت بازی (تک‌نفره/دونفره/گروهی) بازی الگو انتخاب کرده و برای این جفت‌زبان محتوا هست،
 * کارت‌های الگو را برمی‌گرداند؛ وگرنه همان کارت‌های معمول.
 */
export function applyPatternDeck(
  mode: PatternMode,
  targets: Array<Language | string>,
  native: Language | string,
  fallback: () => LanguageCard[],
  limit?: number,
): LanguageCard[] {
  const ids = getPatternPrefs(mode);
  if (ids.length) {
    const target = targets.find((t) => hasPatternDeck(t, native));
    if (target) {
      const cards = shuffle(getPatternCards(target, native, ids));
      if (cards.length) return limit ? cards.slice(0, Math.max(1, limit)) : cards;
    }
  }
  return fallback();
}

export type { PatternMode, PatternCategory };
