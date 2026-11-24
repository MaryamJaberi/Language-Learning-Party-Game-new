import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// سلامت دیتابیس کارت‌ها: این تست‌ها باگ‌هایی را می‌گیرند که در خط تولید داده (importDatabase.ts) پیدا شد.
const db = JSON.parse(fs.readFileSync(path.resolve('data/curatedDeckDatabase.json'), 'utf-8')) as any[];
const active = db.filter((c) => !c.excluded);
const byId = Object.fromEntries(db.map((c) => [c.id, c]));

describe('دیتابیس کارت‌ها', () => {
  it('متن عربی حروف خاص فارسی (ی ک پ چ ژ گ) ندارد', () => {
    const bad = active.filter((c) => /[پچژگکی]/.test(c.translations.ar?.text || ''));
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it('متن فارسی «ي/ك» عربی ندارد', () => {
    const bad = active.filter((c) => /[يك]/.test(c.translations.fa?.text || ''));
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it('اسلشِ داخل جمله متن را نمی‌بُرد', () => {
    expect(byId['c1_multilingual_phrases_final_C1-3093'].translations.es.text).toContain('Estimado/a señor/a»');
    expect(byId['c1_multilingual_phrases_final_C1-2619'].translations.nl.text).toContain('en/of voor rekeningen');
  });

  it('گیومه‌ها و پرانتزها در هیچ ترجمه‌ای نیمه‌کاره نیستند', () => {
    const bad: string[] = [];
    for (const c of active) {
      for (const [l, v] of Object.entries<any>(c.translations)) {
        const t = v.text || '';
        if (t.split('«').length !== t.split('»').length) bad.push(`${c.id}/${l}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('هر کارت فعال در همهٔ زبان‌های اصلی متن دارد', () => {
    for (const l of ['fa', 'en', 'nl', 'de', 'fr', 'es', 'it', 'ar', 'tr']) {
      expect(active.filter((c) => !(c.translations[l]?.text || '').trim()).length, l).toBe(0);
    }
  });
});
