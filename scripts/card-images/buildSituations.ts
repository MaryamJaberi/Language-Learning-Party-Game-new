/**
 * برای هر کارت و هر واژهٔ دیکشنری یک «موقعیت» به انگلیسی می‌نویسد: کجا، چه کسی به چه کسی، با چه حالی.
 * این موقعیت بعداً پرامپت تصویر Canva می‌شود (scripts/card-images/build_plan.py).
 *   npx tsx scripts/card-images/buildSituations.ts
 * خروجی: data/card-images/situations.json
 *   { [key]: { en, kind, situation, cast: string[], generic: boolean } }
 * key برای کارت‌های معمول conceptId است، برای کارت‌های الگو id کارت (pat_…) و برای دیکشنری d_<id>.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildScene } from '../../src/visual/autoScene';
import { curatedFor } from '../../src/visual/curatedScenes';
import { LEXICON } from '../../src/visual/lexicon';
import { FAMILY, JOBS } from '../../src/visual/people';
import { getAllPatternDecks, getAllNativePacks } from '../../patterns';
import type { SceneSpec, Actor, Expression, Pose } from '../../src/visual/types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const PLACE: Record<string, string> = {
  home: 'in a cozy family living room', kitchen: 'in a home kitchen', bedroom: 'in a bedroom',
  doctor: "in a doctor's examination room", hospital: 'in a hospital ward', street: 'on a city street',
  park: 'in a green park', shop: 'in a small grocery shop', cafe: 'in a cafe', restaurant: 'at a restaurant table',
  school: 'in a classroom', office: 'in an office', station: 'on a train station platform', airport: 'in an airport terminal',
  beach: 'on a beach', bank: 'at a bank counter', outside: 'outdoors', plain: 'on a plain background',
};
const EXPR: Record<Expression, string> = {
  neutral: 'calm', happy: 'smiling', laugh: 'laughing', sad: 'sad', worried: 'worried and concerned', angry: 'annoyed and angry',
  surprised: 'surprised', sick: 'unwell and pale', tired: 'exhausted', thinking: 'thoughtful and unsure', scared: 'frightened',
  love: 'full of love', sleepy: 'sleepy',
};
const POSE: Record<Pose, string> = {
  stand: '', wave: 'waving', point: 'pointing', hold: 'holding something up', cough: 'coughing into a fist',
  think: 'with a hand on the chin', cheer: 'with both arms raised', shrug: 'shrugging', cross: 'with arms crossed',
  phone: 'talking on a phone', comfort: 'gently reaching out to comfort', hug: 'hugging', facepalm: 'with a hand on the forehead',
  run: 'running', sit: 'sitting', eat: 'eating', write: 'writing',
};
const ANIMAL_NAME: Record<string, string> = { pepper: 'Pepper the cat', biscuit: 'Biscuit the dog', coco: 'Coco the parrot' };

function nameOf(who: string): string {
  if (who.startsWith('job:')) return `a ${who.slice(4)}`;
  return ANIMAL_NAME[who] || FAMILY[who]?.name || who;
}
const castId = (who: string) => (who.startsWith('job:') ? '' : who);
const nice = (id: string) => id.replace(/-/g, ' ');
const MASS = new Set(['money', 'soup', 'water', 'coffee', 'tea', 'bread', 'rice', 'milk', 'cash']);
const art = (w: string) => (MASS.has(w) ? `some ${w}` : /^[aeiou]/.test(w) ? `an ${w}` : `a ${w}`);

function describeActor(a: Actor, other?: Actor): string {
  const bits: string[] = [];
  const ex = a.expression && a.expression !== 'neutral' ? EXPR[a.expression] : '';
  let pose = a.pose ? POSE[a.pose] : '';
  if (a.pose === 'comfort' && other) pose = `gently putting a hand on ${nameOf(other.who)}'s shoulder`;
  if (a.pose === 'point' && other && a.speaking) pose = `pointing towards ${nameOf(other.who)}`;
  if (a.holds) pose = `holding ${art(nice(a.holds))}` + (pose && a.pose !== 'hold' ? `, ${pose}` : '');
  if (ex) bits.push(/ing$/.test(ex) ? `is ${ex}` : `looks ${ex}`);
  if (pose) bits.push(`is ${pose}`);
  if (!bits.length) bits.push(a.speaking ? 'is talking' : 'is listening');
  return `${nameOf(a.who)} ${bits.join(' and ')}`;
}

function describeScene(s: SceneSpec, phrase?: string): { situation: string; cast: string[] } {
  const where = (PLACE[s.place] || 'in an everyday place') + (s.time === 'night' ? ', at night' : '');
  const [a, b0] = s.actors;
  const b = b0 && b0.who !== a?.who ? b0 : undefined;
  const parts: string[] = [`Setting: ${where}.`];
  const cap = (x: string) => x.replace(/^./, (c) => c.toUpperCase());
  if (a) parts.push(cap(describeActor(a, b)) + '.');
  if (b) parts.push(cap(describeActor(b, a)) + '.');
  if (a?.speaking && b && phrase) parts.push(`${cap(nameOf(a.who))} is the one saying "${phrase}" to ${nameOf(b.who)}.`);
  const props = (s.props || []).map((p) => nice(p.id));
  if (props.length) parts.push(`${props.map(art).join(' and ')} clearly visible.`.replace(/^./, (c) => c.toUpperCase()));
  const fx = (s.effects || []).map((e) => e.id);
  if (fx.includes('rain')) parts.push('It is raining.');
  if (fx.includes('snow')) parts.push('It is snowing.');
  return { situation: parts.join(' '), cast: [...new Set(s.actors.map((x) => castId(x.who)).filter(Boolean))] };
}

/** صحنهٔ عمومی = خانه، بدون شیء، بدون نشانه، چهره‌های عادی: یعنی قاعده‌ای پیدا نشد */
function isGeneric(s: SceneSpec): boolean {
  const flat = s.actors.every((x) => !x.expression || ['neutral', 'happy', 'thinking'].includes(x.expression));
  return s.place === 'home' && !(s.props || []).length && !(s.effects || []).some((e) => e.id !== 'question') && flat
    && s.actors.every((x) => !x.pose || ['stand', 'think'].includes(x.pose));
}

type Out = { en: string; kind: string; situation: string; cast: string[]; generic: boolean; category?: string };
const out: Record<string, Out> = {};

// واژه‌های نسبت: تنها نشان دادن یک آدم نسبت را نمی‌رساند، پس آدم را کنار کسی نشان می‌دهیم که نسبت را معنی‌دار می‌کند
const RELATION: Record<string, string> = {
  grandfather: 'Yusuf, the grandfather, sits in an armchair with his little granddaughter Mia on his knee, both smiling.',
  grandmother: 'Rosa, the grandmother, reads a picture book to her little grandson Timo, both smiling.',
  father: 'Sam, the father, carries his little son Timo on his shoulders.',
  mother: 'Leila, the mother, hugs her little son Timo.',
  son: 'Timo, a little boy, holds hands with his father Sam; Timo is clearly the son.',
  daughter: 'Mia, a little girl, holds hands with her mother Leila; Mia is clearly the daughter.',
  brother: 'Ryan and his twin sister Rona play a video game together on a sofa; the focus is on Ryan, the brother.',
  sister: 'Rona and her twin brother Ryan high-five each other; the focus is on Rona, the sister.',
  uncle: 'Omid, the uncle, gives a playful piggyback ride to his little niece Mia.',
  aunt: 'Zara, the aunt, gives a wrapped present to her little nephew Timo.',
  cousin: 'Two cousins of similar age, Nika and Luca, take a selfie together at a family party.',
  husband: 'Tony, the husband, stands arm in arm with his wife; both wear wedding rings; the focus is on Tony.',
  wife: 'Sofia, the wife, stands arm in arm with her husband; both wear wedding rings; the focus is on Sofia.',
  neighbor: 'Kim, the neighbor, waves hello over a low garden fence between two houses.',
  friend: 'Adam greets his friend with a warm high-five.',
};
// ۱) دیکشنری
const portraitEx = (who: string, ex?: Expression) => `A friendly close-up, head and shoulders, of ${nameOf(who)}, who is clearly ${EXPR[ex || 'happy']}. The feeling must be obvious from the face alone.`;
for (const cat of LEXICON) {
  for (const e of cat.entries) {
    const v = e.visual;
    let situation = '';
    let cast: string[] = [];
    if (v.kind === 'person') {
      cast = [castId(v.who)].filter(Boolean);
      if (v.portrait) situation = portraitEx(v.who, v.expression);
      else if (v.who.startsWith('job:')) situation = `A ${v.who.slice(4)} at work, full body, in the typical uniform and with the typical tools of that job.`;
      else if (RELATION[e.id]) situation = RELATION[e.id];
      else situation = `A full-body portrait of ${nameOf(v.who)}, standing and ${EXPR[v.expression || 'happy']}, on a plain cream background.`;
    } else if (v.kind === 'prop') situation = `A single large ${nice(v.id)}, centered, as the only subject. Nothing else in the picture.`;
    else if (v.kind === 'animal') { situation = ANIMAL_NAME[v.id] ? `${ANIMAL_NAME[v.id]}, full body, as the only subject.` : `A single ${nice(v.id)}, full body, friendly, as the only subject.`; if (ANIMAL_NAME[v.id]) cast = [v.id]; }
    else if (v.kind === 'place') situation = `A wide view of ${nice(v.id)}${v.night ? ' at night' : ''}, with no people, so the place itself is the subject.`;
    else ({ situation, cast } = describeScene(v.spec));
    for (const [k, f] of Object.entries(FAMILY)) if (new RegExp(`\\b${f.name}\\b`).test(situation) && !cast.includes(k)) cast.push(k);
    out[`d_${e.id}`] = { en: e.en, kind: 'dictionary', category: cat.id, situation, cast, generic: false };
  }
}

// ۲) کارت‌های معمول
const plan: any[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/card-images/plan.json'), 'utf8'));
const addCard = (key: string, en: string, topic?: string, type?: string) => {
  const cur = curatedFor(en);
  const s = cur || buildScene({ key, en, topic, type });
  if ('none' in s) {
    // عمداً بدون صحنه: یا نقاشی آن چیز را نداریم، یا جمله لنگر دیدنی ندارد
    out[key] = { en, kind: type || 'phrase', situation: '', cast: [], generic: true };
    return;
  }
  if ('lex' in s) {
    const d = out[`d_${s.lex}`];
    out[key] = { en, kind: 'word', situation: d.situation, cast: d.cast, generic: false };
    return;
  }
  const { situation, cast } = describeScene(s, en);
  out[key] = { en, kind: type || 'phrase', situation, cast, generic: !cur && isGeneric(s) };
};
for (const r of plan) if (!r.conceptId.startsWith('d_') && !r.conceptId.startsWith('pat_')) addCard(r.conceptId, r.en, r.topic, r.type);

// ۳) کارت‌های بازی الگو (معنی انگلیسی از بستهٔ زبان مادری انگلیسی، یا خود جملهٔ انگلیسی)
const enPack = getAllNativePacks().find((p) => p.native === 'en');
for (const deck of getAllPatternDecks()) {
  for (const cat of deck.categories) {
    cat.items.forEach(([text], i) => {
      const key = `pat_${deck.language}_${cat.id.slice(4).toLowerCase()}_${i + 1}`;
      let en = '';
      if (deck.language === 'en') en = text.split('|').map((x) => x.trim()).join(' ');
      else {
        const e = enPack?.decks[deck.language]?.[cat.id]?.[i];
        en = Array.isArray(e) ? e[0] : e || '';
      }
      if (en) addCard(key, en, cat.title.en, 'sentence');
    });
  }
}

fs.writeFileSync(path.join(ROOT, 'data/card-images/situations.json'), JSON.stringify(out, null, 0));
const vals = Object.values(out);
console.log(`situations: ${vals.length} (dictionary ${vals.filter((v) => v.kind === 'dictionary').length}, generic ${vals.filter((v) => v.generic).length})`);
console.log(out['d_grandfather'].situation);
