import { describe, it, expect } from 'vitest';
import { getAllNativePacks, getAllPatternDecks, getPatternCards, getPatternCategories, hasPatternDeck, patternNativeLanguages } from '../patterns';

const decks = Object.fromEntries(getAllPatternDecks().map((d) => [d.language, d]));

describe('بازی‌های الگو با زبان مادری غیر از فارسی', () => {
  for (const pack of getAllNativePacks()) {
    for (const [lang, cats] of Object.entries(pack.decks)) {
      it(`${pack.native} ← ${lang}: برای هر ردیف یک ترجمه، به همان تعداد`, () => {
        const deck = decks[lang];
        expect(deck).toBeTruthy();
        expect(lang).not.toBe(pack.native);
        expect(Object.keys(cats).sort()).toEqual(deck.categories.map((c) => c.id).sort());
        for (const cat of deck.categories) {
          const entries = cats[cat.id];
          expect(entries, cat.id).toHaveLength(cat.items.length);
          for (const e of entries) {
            const [meaning, note] = Array.isArray(e) ? e : [e, 'noteEn'];
            expect(meaning.trim().length).toBeGreaterThan(1);
            expect(note.trim().length).toBeGreaterThan(1);
          }
        }
      });

      it(`${pack.native} ← ${lang}: کارت‌ها معنی و نکته را به زبان مادری دارند`, () => {
        const ids = getPatternCategories(lang).map((c) => c.id);
        const cards = getPatternCards(lang, pack.native, ids);
        const total = decks[lang].categories.reduce((n, c) => n + c.items.length, 0);
        expect(cards).toHaveLength(total);
        for (const c of cards) {
          expect(c.nativeLanguage).toBe(pack.native);
          expect(c.translation).not.toMatch(/[؀-ۿ]/); // هیچ متن فارسی
          // نکتهٔ کارت‌های فارسی مثال فارسی دارد؛ برای بقیه هیچ متن فارسی نباید باشد
          if (lang !== 'fa') expect(c.grammarPoint).not.toMatch(/[؀-ۿ]/);
          else expect(c.grammarPoint).toMatch(/[A-Za-z]/);
        }
      });
    }
  }

  it('زبان هدف و مادری یکی نیستند؛ زبان مادری بی‌بسته هم چیزی نمی‌گیرد', () => {
    expect(hasPatternDeck('nl', 'nl')).toBe(false);
    expect(hasPatternDeck('fa', 'fa')).toBe(false);
    // همهٔ ۱۲ جفت بین چهار زبان
    for (const t of ['fa', 'en', 'nl', 'de']) for (const n of ['fa', 'en', 'nl', 'de']) expect(hasPatternDeck(t, n), `${t}←${n}`).toBe(t !== n);
    expect(hasPatternDeck('nl', 'tr')).toBe(false);
    expect(patternNativeLanguages()).toEqual(expect.arrayContaining(['fa', 'en', 'nl', 'de']));
    // «en-US» مثل «en» حساب می‌شود
    expect(hasPatternDeck('nl', 'en-US')).toBe(true);
    expect(getPatternCards('de', 'en-US', ['PAT_CASES'])[0].translation).toBe('I see the man over there.');
  });
});
