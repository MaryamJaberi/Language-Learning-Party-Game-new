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
