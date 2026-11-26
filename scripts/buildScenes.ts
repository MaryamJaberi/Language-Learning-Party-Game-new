/**
 * برای هر کارت یک صحنه می‌سازد و در public/data/scenes/<n>.json می‌نویسد.
 *   npx tsx scripts/buildScenes.ts
 *
 * منبع متن انگلیسی:
 *   - کارت‌های معمول: data/card-images/plan.json (ستون en، موضوع و نوع کارت)
 *   - کارت‌های بازی الگو: خود جملهٔ انگلیسی، یا معنی انگلیسی از patterns/natives/en.ts
 * ترتیب اولویت: صحنهٔ دست‌نوشته (src/visual/curatedScenes.ts) ← تصویر دیکشنری برای تک‌واژه‌ها ← صحنهٔ خودکار
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildScene, type SceneResult } from '../src/visual/autoScene';
import { curatedFor } from '../src/visual/curatedScenes';
import { SCENE_SHARDS, sceneShard } from '../src/visual/sceneStore';
import { getAllPatternDecks, getAllNativePacks } from '../patterns';
import type { SceneSpec } from '../src/visual/types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/data/scenes');

/** حذف مقدارهای پیش‌فرض تا فایل‌ها سبک بمانند */
function compact(s: SceneResult): SceneResult {
  if ('lex' in s) return s;
  const out: SceneSpec = { place: s.place, actors: s.actors.map((a) => {
    const c: any = { who: a.who, x: a.x };
    if (a.facing === 'left') c.facing = 'left';
    if (a.expression && a.expression !== 'neutral') c.expression = a.expression;
    if (a.pose && a.pose !== 'stand') c.pose = a.pose;
    if (a.holds) c.holds = a.holds;
    if (a.speaking) c.speaking = true;
    if (a.scale && a.scale !== 1) c.scale = a.scale;
    return c;
  }) };
  if (s.time === 'night') out.time = 'night';
  if (s.props?.length) out.props = s.props;
  if (s.effects?.length) out.effects = s.effects;
  if (s.caption) out.caption = s.caption;
  return out;
}

function sceneFor(key: string, en: string, topic?: string, type?: string): SceneResult {
  return curatedFor(en) || buildScene({ key, en, topic, type });
}

export function buildAllScenes(): Record<string, SceneResult> {
  const all: Record<string, SceneResult> = {};

  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/card-images/plan.json'), 'utf8')) as Array<{ conceptId: string; en: string; topic?: string; type?: string }>;
  for (const row of plan) {
    if (!row.conceptId || !row.en) continue;
    all[row.conceptId] = compact(sceneFor(row.conceptId, row.en, row.topic, row.type));
  }

  const enNative = getAllNativePacks().find((p) => p.native === 'en');
  for (const deck of getAllPatternDecks()) {
    for (const cat of deck.categories) {
      cat.items.forEach(([text], i) => {
        const id = `pat_${deck.language}_${cat.id.slice(4).toLowerCase()}_${i + 1}`;
        let en = '';
        if (deck.language === 'en') en = text.split('|').map((s) => s.trim()).join(' ');
        else {
          const e = enNative?.decks[deck.language]?.[cat.id]?.[i];
          en = Array.isArray(e) ? e[0] : e || '';
        }
        if (en) all[id] = compact(sceneFor(id, en, cat.title.en, 'sentence'));
      });
    }
  }
  return all;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = buildAllScenes();
  const shards: Record<string, SceneResult>[] = Array.from({ length: SCENE_SHARDS }, () => ({}));
  for (const [k, v] of Object.entries(all)) shards[sceneShard(k)][k] = v;
  fs.mkdirSync(OUT, { recursive: true });
  shards.forEach((s, n) => fs.writeFileSync(path.join(OUT, `${n}.json`), JSON.stringify(s)));
  const total = Object.keys(all).length;
  const lex = Object.values(all).filter((v) => 'lex' in v).length;
  console.log(`scenes: ${total} (dictionary images: ${lex}) → public/data/scenes/0..${SCENE_SHARDS - 1}.json`);
}
