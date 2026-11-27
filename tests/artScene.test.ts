import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { choosePose, placeActor, artCovers, type ArtIndex } from '../src/visual/ArtScene';
import { FAMILY } from '../src/visual/people';
import { allEntries } from '../src/visual/lexicon';
import { artHasVisual } from '../src/visual/ArtThumb';

const art: ArtIndex = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/art/art.json'), 'utf-8'));

describe('صحنه از تکه‌های Canva', () => {
  it('هر عضو فامیل هر ۸ حالت را دارد و فایلش هست', () => {
    for (const who of Object.keys(FAMILY)) {
      expect(Object.keys(art.char[who] || {}).sort()).toEqual(['laugh', 'neutral', 'phone', 'point', 'sad', 'sick', 'wave', 'worried']);
      expect(fs.existsSync(path.join(__dirname, `../public/data/art/char/${who}_sick.webp`))).toBe(true);
    }
  });
  it('حالت درست انتخاب می‌شود', () => {
    expect(choosePose('sick', 'cough')).toBe('sick');
    expect(choosePose('worried', 'comfort')).toBe('worried');
    expect(choosePose('happy', 'wave')).toBe('wave');
    expect(choosePose('sad')).toBe('sad');
  });
  it('دست دلداری رو به طرف مقابل است', () => {
    const p = art.char.sam.worried;
    const right = placeActor(art, { who: 'sam', x: 100, facing: 'right', expression: 'worried', pose: 'comfort' })!;
    const left = placeActor(art, { who: 'sam', x: 300, facing: 'left', expression: 'worried', pose: 'comfort' })!;
    expect(right.mirror).not.toBe(left.mirror);
    if (p.reach) expect(right.mirror).toBe(p.reach !== 'right');
  });
  it('بیشتر واژه‌های دیکشنری تکهٔ Canva دارند', () => {
    const all = allEntries();
    const covered = all.filter((e) => artHasVisual(art, e.visual)).length;
    expect(covered / all.length).toBeGreaterThan(0.9);
  });
  it('صحنهٔ دکتر کامل پوشش داده می‌شود', () => {
    expect(artCovers(art, { place: 'home', actors: [{ who: 'sam', x: 135, expression: 'worried', pose: 'comfort' }, { who: 'yusuf', x: 268, facing: 'left', expression: 'sick', pose: 'cough' }] })).toBe(true);
  });
});

// ---------- منطق تصویر کارت (docs/card-image-logic.md)
import { buildScene, isThingCard, MAX_WORDS_FOR_SCENE } from '../src/visual/autoScene';
import { propMeta, PROP_META } from '../src/visual/propMeta';
import * as fsx from 'fs';
import * as pathx from 'path';

describe('منطق تصویر کارت', () => {
  it('کارتِ «چیز» خودِ آن چیز را نشان می‌دهد، نه آدم‌های ایستاده', () => {
    const s: any = buildScene({ key: 'c_green_salad', en: 'Green salad', topic: 'Food', type: 'phrase' });
    expect(s.lex).toBe('salad');
    expect((buildScene({ key: 'k', en: 'hot coffee', topic: 'Food', type: 'phrase' }) as any).lex).toBe('coffee');
  });

  it('چیزی که نقاشی ندارد بدون تصویر می‌ماند و در فهرست کار می‌آید', () => {
    const s: any = buildScene({ key: 'k', en: 'fresh mango', topic: 'Food', type: 'vocabulary' });
    expect(s.none).toBe('no-art');
    expect(s.want).toBe('mango');
    expect(s.actors).toBeUndefined();
  });

  it('جملهٔ بدون لنگر دیدنی و جملهٔ بلند تصویر نمی‌گیرند', () => {
    expect((buildScene({ key: 'k', en: 'That depends on the context.', topic: 'Food', type: 'sentence' }) as any).none).toBe('no-anchor');
    const long = Array.from({ length: MAX_WORDS_FOR_SCENE + 1 }, () => 'bread').join(' ') + '.';
    expect((buildScene({ key: 'k', en: long, topic: 'Food', type: 'sentence' }) as any).none).toBe('no-anchor');
  });

  it('شیءِ نام‌برده روی میز و جلوی آدم‌هاست', () => {
    const s: any = buildScene({ key: 'k', en: 'I would like two bread rolls, please.', topic: 'Food', type: 'sentence' });
    const bread = s.props.find((p: any) => p.id === 'bread');
    expect(bread.hero && bread.front).toBe(true);
    expect(s.props.some((p: any) => p.id === 'table' && p.front)).toBe(true);
  });

  it('وسیلهٔ نقلیه صحنه را بیرون می‌برد و آدم‌ها جا باز می‌کنند', () => {
    const s: any = buildScene({ key: 'k', en: 'I bought a red car.', topic: 'Money', type: 'sentence' });
    expect(['street', 'park', 'station']).toContain(s.place);
    const car = s.props.find((p: any) => p.id === 'car');
    expect(Math.max(...s.actors.map((a: any) => a.x))).toBeLessThan(car.x - 100);
  });

  it('واژهٔ دوپهلو شیء نمی‌سازد', () => {
    const s: any = buildScene({ key: 'k', en: 'Do you have a table for two?', topic: 'Food', type: 'question' });
    expect((s.props || []).length).toBe(0);
  });

  it('تشخیص کارتِ «چیز»', () => {
    expect(isThingCard({ key: 'k', en: 'Green salad', topic: 'Food', type: 'phrase' })).toBe(true);
    expect(isThingCard({ key: 'k', en: 'See you later', topic: 'Food', type: 'phrase' })).toBe(false);
    expect(isThingCard({ key: 'k', en: 'Where is it?', topic: 'Food', type: 'phrase' })).toBe(false);
  });

  it('هر وسیله اندازه دارد و چیزهای روی میز از سر آدم بزرگ‌تر نیستند', () => {
    const art = JSON.parse(fsx.readFileSync(pathx.resolve(__dirname, '../public/data/art/art.json'), 'utf8'));
    for (const id of Object.keys(art.props)) expect(PROP_META[id], id).toBeTruthy();
    for (const [id, m] of Object.entries(PROP_META)) if (m.where === 'table') expect(m.h * 1.5, id).toBeLessThanOrEqual(46);
    expect(propMeta('unknown-thing').where).toBe('table');
  });

  it('واژه‌های دیکشنری که وسیله یا حیوان‌اند تکهٔ Canva دارند', () => {
    const art = JSON.parse(fsx.readFileSync(pathx.resolve(__dirname, '../public/data/art/art.json'), 'utf8'));
    for (const id of ['salad', 'juice', 'towel', 'pencil']) expect(art.props[id], id).toBeTruthy();
    for (const id of ['whale', 'fox', 'bee']) expect(art.animals[id], id).toBeTruthy();
  });
});
