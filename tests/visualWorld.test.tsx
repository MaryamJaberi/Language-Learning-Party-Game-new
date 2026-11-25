import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import { LEXICON, allEntries } from '../src/visual/lexicon';
import LexThumb from '../src/visual/LexThumb';
import Scene from '../src/visual/Scene';
import { FAMILY, JOBS, lookFor } from '../src/visual/people';
import { PROPS } from '../src/visual/props';
import { ANIMALS, FAMILY_PETS } from '../src/visual/animals';
import { PLACES } from '../src/visual/places';
import { buildScene, lexForWord } from '../src/visual/autoScene';
import { curatedFor, CURATED } from '../src/visual/curatedScenes';
import { SCENE_SHARDS, sceneShard } from '../src/visual/sceneStore';
import type { SceneSpec } from '../src/visual/types';

const isWho = (w: string) => !!lookFor(w) || !!FAMILY_PETS[w] || !!ANIMALS[w];

function checkSpec(s: SceneSpec, where: string) {
  expect(PLACES[s.place], `${where}: place ${s.place}`).toBeTruthy();
  for (const a of s.actors) expect(isWho(a.who), `${where}: who ${a.who}`).toBe(true);
  for (const a of s.actors) if (a.holds) expect(PROPS[a.holds], `${where}: holds ${a.holds}`).toBeTruthy();
  for (const p of s.props || []) expect(PROPS[p.id], `${where}: prop ${p.id}`).toBeTruthy();
}

describe('دیکشنری تصویری: داده', () => {
  it('هر واژه شناسهٔ یکتا و برچسب در هر چهار زبان دارد', () => {
    const ids = allEntries().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(180);
    for (const e of allEntries()) for (const l of ['fa', 'en', 'nl', 'de'] as const) expect(e[l].trim().length, `${e.id}.${l}`).toBeGreaterThan(0);
  });

  it('اسم‌های هلندی و آلمانی حرف تعریف دارند (برای رنگ جنس دستوری)', () => {
    const nounCats = ['family', 'home', 'food', 'clothes', 'money-health', 'transport', 'animals', 'places', 'jobs', 'nature'];
    for (const c of LEXICON.filter((x) => nounCats.includes(x.id))) {
      for (const e of c.entries) {
        expect(e.nl, `${e.id}.nl`).toMatch(/^(de|het) /);
        expect(e.de, `${e.id}.de`).toMatch(/^(der|die|das) /);
      }
    }
  });

  it('هر تصویر به یک تکهٔ موجود اشاره می‌کند', () => {
    for (const e of allEntries()) {
      const v = e.visual;
      if (v.kind === 'person') expect(isWho(v.who), e.id).toBe(true);
      if (v.kind === 'prop') expect(PROPS[v.id], e.id).toBeTruthy();
      if (v.kind === 'animal') expect(isWho(v.id), e.id).toBe(true);
      if (v.kind === 'place') expect(PLACES[v.id], e.id).toBeTruthy();
      if (v.kind === 'scene') checkSpec(v.spec, e.id);
    }
  });

  it('همهٔ ۲۱ آدم فامیل و همهٔ شغل‌ها بدون خطا کشیده می‌شوند', () => {
    expect(Object.keys(FAMILY)).toHaveLength(21);
    const actors = [...Object.keys(FAMILY), ...Object.keys(JOBS).map((j) => `job:${j}`)].map((who, i) => ({ who, x: 20 + i * 10 }));
    const { container } = render(<Scene spec={{ place: 'home', actors }} />);
    expect(container.querySelectorAll('svg circle').length).toBeGreaterThan(50);
  });

  it('همهٔ تصویرهای دیکشنری رندر می‌شوند', () => {
    const { container } = render(<div>{allEntries().map((e) => <LexThumb key={e.id} visual={e.visual} title={e.en} />)}</div>);
    expect(container.querySelectorAll('svg[role="img"]').length).toBe(allEntries().length);
  });
});

describe('صحنهٔ کارت‌ها', () => {
  it('مثال مریم: «بیا بریم دکتر» → دایی نگران، بابابزرگ مریض در حال سرفه، در خانه', () => {
    const s = curatedFor("Let's go to the doctor.")!;
    expect(s.place).toBe('home');
    expect(s.actors[0]).toMatchObject({ who: 'omid', expression: 'worried', speaking: true });
    expect(s.actors[1]).toMatchObject({ who: 'yusuf', expression: 'sick', pose: 'cough' });
    // قاعدهٔ خودکار هم همین را برای جمله‌های مشابه می‌سازد
    const auto = buildScene({ key: 'x', en: 'You should go to the doctor.' }) as SceneSpec;
    expect(auto.place).toBe('home');
    expect(auto.actors[0].expression).toBe('worried');
    expect(auto.actors[1]).toMatchObject({ expression: 'sick', pose: 'cough' });
    expect(auto.effects?.some((e) => e.id === 'cough')).toBe(true);
  });

  it('سرمای هوا با سرماخوردگی قاطی نمی‌شود', () => {
    const s = buildScene({ key: 'y', en: "It's cold today" }) as SceneSpec;
    expect(s.actors.every((a) => a.expression !== 'sick')).toBe(true);
    expect(s.effects?.some((e) => e.id === 'cold')).toBe(true);
  });

  it('واژهٔ تنها تصویر دیکشنری می‌گیرد', () => {
    expect(lexForWord('cat')).toBe('cat');
    expect(lexForWord('the bus')).toBe('bus');
    expect(buildScene({ key: 'z', en: 'apple', type: 'vocabulary' })).toEqual({ lex: 'apple' });
  });

  it('صحنه‌های دست‌نوشته معتبرند', () => {
    for (const [k, s] of Object.entries(CURATED)) checkSpec(s, k);
  });

  it('فایل‌های صحنه برای همهٔ کارت‌ها ساخته شده‌اند و معتبرند', () => {
    const dir = path.resolve(__dirname, '../public/data/scenes');
    let total = 0;
    for (let n = 0; n < SCENE_SHARDS; n++) {
      const shard = JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));
      for (const [k, v] of Object.entries<any>(shard)) {
        expect(sceneShard(k)).toBe(n);
        if (v.lex) expect(allEntries().some((e) => e.id === v.lex)).toBe(true);
        else checkSpec(v, k);
        total++;
      }
    }
    expect(total).toBeGreaterThan(7000);
  });
});

describe('صفحهٔ دیکشنری تصویری', () => {
  beforeEach(() => localStorage.clear());

  it('دسته‌ها را عوض می‌کند و با لمس واژه تلفظ می‌کند', async () => {
    const { sound } = await import('../soundManager');
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => undefined as any);
    const { default: PictureDictionaryScreen } = await import('../screens/PictureDictionaryScreen');
    render(<PictureDictionaryScreen language="fa" isRTL targetLanguage="nl" nativeLanguage="fa" onExit={vi.fn()} />);
    expect(screen.getByTestId('dict-grandfather')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /حیوان‌ها/ }));
    await waitFor(() => expect(screen.getByTestId('dict-cat')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('dict-cat'));
    expect(speak).toHaveBeenCalledWith('de kat', 'nl', expect.anything());
  });
});
