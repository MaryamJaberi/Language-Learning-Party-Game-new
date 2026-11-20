/**
 * بررسی کامل «جمله‌ها و سطح‌ها در همهٔ زبان‌ها»:
 * هر زبانِ آمادهٔ تمرین، در هر سطح، جلسهٔ کامل و هم‌سطح می‌سازد و متن کارت‌ها خط درست دارد.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { getUniqueCardsForSession } from '../contentEngine';
import { PRACTICE_READY_LANGUAGES } from '../constants';
import { UNIVERSAL_CONCEPTS } from '../multiLangDictionary';

const LEVELS = ['Pre-A1', 'A0+', 'A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+', 'C2'];
const PLUS: Record<string, string[]> = {
  'A1+': ['A1', 'A2'], 'A2+': ['A2', 'B1'], 'B1+': ['B1', 'B2'], 'B2+': ['B2', 'C1'], 'C1+': ['C1', 'C2'],
};
const allowedLevels = (l: string) =>
  l === 'Pre-A1' ? ['Pre-A1', 'A0', 'A0+', 'easy'] : [l, ...(PLUS[l] || [])];

const meta: any[] = JSON.parse(readFileSync('data/decks/meta.json', 'utf8'));
const metaLevel = new Map(meta.map((m) => [m.id, m.rawLevel || m.level]));
const conceptLevel = new Map(UNIVERSAL_CONCEPTS.map((c) => [c.id, c.level]));

function trueLevel(c: any, target: string): string {
  if (c.id.startsWith('DYN_')) return 'generated';
  if (c.id.startsWith('UNI_')) return conceptLevel.get(c.id.slice(4).split(`_${target}_`)[0]) || c.cefrLevel;
  const base = c.id.endsWith('_' + target) ? c.id.slice(0, -(target.length + 1)) : c.id;
  return metaLevel.get(base) || c.cefrLevel;
}

beforeEach(() => localStorage.clear());

describe('language coverage', () => {
  it('every practice-ready language ships a non-empty deck', () => {
    for (const lang of PRACTICE_READY_LANGUAGES) {
      const p = `public/data/decks/${lang}.json`;
      expect(existsSync(p), p).toBe(true);
      expect(Object.keys(JSON.parse(readFileSync(p, 'utf8'))).length, p).toBeGreaterThan(1000);
    }
  });

  it('card ids in meta.json are unique', () => {
    const ids = meta.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const native of ['fa', 'en']) {
    it(`every ready language × every level gives a full, on-level session (native ${native})`, () => {
      const problems: string[] = [];
      for (const lang of PRACTICE_READY_LANGUAGES) {
        if (lang === native) continue;
        for (const lvl of LEVELS) {
          localStorage.clear();
          const cards = getUniqueCardsForSession(lang as any, native as any, lvl as any, [], 10, true);
          if (cards.length !== 10) problems.push(`${lang}/${lvl}: ${cards.length} cards`);
          const texts = new Set<string>();
          for (const c of cards) {
            const tl = trueLevel(c, lang);
            if (!allowedLevels(lvl).includes(tl)) problems.push(`${lang}/${lvl}: ${tl} «${c.targetText}»`);
            if (!c.targetText || !c.translation) problems.push(`${lang}/${lvl}: empty ${c.id}`);
            const k = c.targetText.trim().toLowerCase();
            if (texts.has(k)) problems.push(`${lang}/${lvl}: duplicate «${c.targetText}»`);
            texts.add(k);
          }
        }
      }
      expect(problems.slice(0, 20)).toEqual([]);
    }, 120000);
  }
});

describe('deck text uses the right script', () => {
  const LATIN = ['en', 'en-US', 'en-GB', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'tr'];
  const FOREIGN_IN_LATIN = /[Ѐ-ӿ؀-ۿ一-鿿ऀ-ॿ]/;
  const checks: Record<string, RegExp> = {
    ar: /[ک]/, // Persian ک inside Arabic
    hi: /[؀-ۿ]/,
    zh: /[؀-ۿ]/,
    ja: /[؀-ۿ]/,
    ko: /[؀-ۿ]/,
    uk: /[؀-ۿ]/,
  };
  for (const lang of [...LATIN, ...Object.keys(checks)]) {
    it(lang, () => {
      const p = `public/data/decks/${lang}.json`;
      if (!existsSync(p)) return;
      const deck: Record<string, { text: string }> = JSON.parse(readFileSync(p, 'utf8'));
      const rx = checks[lang] || FOREIGN_IN_LATIN;
      const bad = Object.entries(deck).filter(([, v]) => v?.text && rx.test(v.text)).map(([k, v]) => `${k}: ${v.text}`);
      expect(bad.slice(0, 10)).toEqual([]);
    });
  }
});
