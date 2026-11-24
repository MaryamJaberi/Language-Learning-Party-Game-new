export type PatternRow = [text: string, fa: string, wrong: [string, string, string], noteFa: string, noteEn: string];

export interface PatternCategory {
  id: string; // PAT_*
  title: { fa: string; en: string };
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  items: PatternRow[];
}

export interface PatternDeck {
  language: string;
  categories: PatternCategory[];
}

export type PatternMode = 'solo' | 'duel' | 'group';

/**
 * بستهٔ یک زبان مادری غیر از فارسی: برای هر زبان هدف، برای هر دسته، به ترتیب ردیف‌ها
 * یا فقط معنی (وقتی نکته از ستون noteEn می‌آید) یا [معنی، نکته].
 */
export type NativeEntry = string | [meaning: string, note: string];
export interface NativePack {
  native: string;
  decks: Record<string, Record<string, NativeEntry[]>>;
}
