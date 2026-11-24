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
