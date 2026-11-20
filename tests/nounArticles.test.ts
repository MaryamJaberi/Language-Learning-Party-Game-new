import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// جنسیت دستوری اسم‌ها: هر اسمی که در data/sources/noun_articles.json بازبینی شده
// باید در بستهٔ کارت‌های هر زبان همان حرف تعریف را داشته باشد.
const ALLOWED: Record<string, string[]> = {
  nl: ['de', 'het'],
  de: ['der', 'die', 'das'],
  fr: ['le', 'la', "l'", 'les'],
  es: ['el', 'la', 'los', 'las'],
  it: ['il', 'lo', 'la', "l'", 'i', 'gli', 'le'],
  pt: ['o', 'a', 'os', 'as'],
};

const source = JSON.parse(
  fs.readFileSync(path.resolve('data/sources/noun_articles.json'), 'utf-8'),
).articles as Record<string, Record<string, { article: string; text?: string }>>;

const decks: Record<string, Record<string, { text: string; article?: string }>> = {};
for (const lang of Object.keys(ALLOWED)) {
  decks[lang] = JSON.parse(fs.readFileSync(path.resolve(`data/decks/${lang}.json`), 'utf-8'));
}

describe('جنسیت دستوری اسم‌ها', () => {
  it('هر حرف تعریف در فهرست مجاز همان زبان است', () => {
    for (const [cid, langs] of Object.entries(source)) {
      for (const [lang, { article }] of Object.entries(langs)) {
        expect(ALLOWED[lang], `${cid}/${lang}`).toContain(article);
      }
    }
  });

  it('بستهٔ کارت‌ها همان حرف تعریف بازبینی‌شده را دارد', () => {
    for (const [cid, langs] of Object.entries(source)) {
      for (const [lang, fix] of Object.entries(langs)) {
        const card = decks[lang][cid];
        expect(card, `${cid} در ${lang}`).toBeDefined();
        expect(card.article, `${cid}/${lang}`).toBe(fix.article);
        if (fix.text) expect(card.text, `${cid}/${lang}`).toBe(fix.text);
        // حرف تعریف نباید دوباره در متن بیاید
        expect(card.text.toLowerCase().startsWith(fix.article.toLowerCase() + ' '), `${cid}/${lang}`).toBe(false);
      }
    }
  });

  it('همهٔ اسم‌های پایهٔ هلندی و آلمانی جنسیت دارند', () => {
    for (const cid of ['c_table', 'c_chair', 'c_bed', 'c_bread', 'c_door', 'c_window', 'c_house', 'c_child']) {
      expect(decks.nl[cid].article, cid).toBeTruthy();
      expect(decks.de[cid].article, cid).toBeTruthy();
    }
  });
});
