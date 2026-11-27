/**
 * طرح کدی (SVG) یک کارت یا واژه را به PNG می‌کشد تا «اسکچ» Canva شود.
 *   npx tsx scripts/card-images/renderSketch.tsx <outDir> <key> [<key> …]
 * key: conceptId (c_…)، id کارت الگو (pat_…) یا واژهٔ دیکشنری (d_<id>).
 * صحنه‌ها افقی ۷۸۰×۵۰۷ (نسبت ۳:۲ تقریبی)، واژه‌های تکی مربع ۵۱۲×۵۱۲.
 * خروجی: <outDir>/<key>.png و یک خط JSON برای هر key: {key, file, shape: "scene"|"square"}
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { SceneContent } from '../../src/visual/Scene';
import LexThumb from '../../src/visual/LexThumb';
import { allEntries, type Visual } from '../../src/visual/lexicon';
import { sceneShard } from '../../src/visual/sceneStore';
import type { SceneSpec } from '../../src/visual/types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lex = new Map(allEntries().map((e) => [e.id, e]));
const shards = new Map<number, Record<string, any>>();
function scene(key: string): any {
  const n = sceneShard(key);
  if (!shards.has(n)) shards.set(n, JSON.parse(fs.readFileSync(path.join(ROOT, `public/data/scenes/${n}.json`), 'utf8')));
  return shards.get(n)![key];
}

function svgFor(key: string): { svg: string; shape: 'scene' | 'square' } | null {
  let visual: Visual | undefined;
  if (key.startsWith('d_')) visual = lex.get(key.slice(2))?.visual;
  else {
    const s = scene(key);
    if (!s || s.none) return null;
    if (s.lex) visual = lex.get(s.lex)?.visual;
    else visual = { kind: 'scene', spec: s as SceneSpec };
  }
  if (!visual) return null;
  if (visual.kind === 'scene') {
    return { shape: 'scene', svg: renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width={400} height={260}><SceneContent spec={visual.spec} /></svg>) };
  }
  return { shape: 'square', svg: renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width={120} height={120}><LexThumb visual={visual} /></svg>) };
}

const [outDir, ...keys] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
for (const key of keys) {
  const r = svgFor(key);
  if (!r) { console.log(JSON.stringify({ key, error: 'no sketch' })); continue; }
  const svgPath = path.join(outDir, `${key}.svg`);
  const png = path.join(outDir, `${key}.png`);
  fs.writeFileSync(svgPath, r.svg);
  execFileSync('rsvg-convert', ['-w', r.shape === 'scene' ? '780' : '512', svgPath, '-o', png]);
  console.log(JSON.stringify({ key, file: png, shape: r.shape }));
}
