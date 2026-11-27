/**
 * صحنهٔ کارت از تکه‌های Canva.
 * برگه‌های پایه در Canva ساخته شده‌اند: هر شخصیت ۸ حالت، مکان‌ها، وسیله‌ها، حیوان‌ها و شغل‌ها.
 * تکه‌ها در public/data/art هستند و فهرستشان در art.json.
 * همان SceneSpec که صحنهٔ کدی را می‌سازد، اینجا با تکه‌های Canva چیده می‌شود.
 * دستگاه مختصات همان ۴۰۰×۲۶۰ است، پس نشانه‌های کدی (سرفه، عرق، باران…) روی آن می‌نشینند.
 */
import React, { useEffect, useState } from 'react';
import type { Actor, Effect, Expression, Pose, SceneSpec } from './types';
import { FAMILY, lookFor } from './people';
import { FAMILY_PETS } from './animals';
import { EffectMark } from './effects';
import { W, H } from './places';
import { fetchContentJSON, getContentBaseUrl } from '../../contentStore';
import { propMeta } from './propMeta';

type Piece = { w: number; h: number; reach?: 'left' | 'right' };
export interface ArtIndex {
  char: Record<string, Record<string, Piece>>;
  jobs: Record<string, Piece>;
  props: Record<string, Piece>;
  animals: Record<string, Piece>;
  places: Record<string, Piece>;
}

let artPromise: Promise<ArtIndex | null> | null = null;
export function loadArt(): Promise<ArtIndex | null> {
  if (!artPromise) artPromise = fetchContentJSON<ArtIndex>('data/art/art.json').then((a) => (a && a.char && a.places ? a : null)).catch(() => null);
  return artPromise;
}
export function useArt(): ArtIndex | null {
  const [art, setArt] = useState<ArtIndex | null>(null);
  useEffect(() => {
    let alive = true;
    loadArt().then((a) => { if (alive) setArt(a); });
    return () => { alive = false; };
  }, []);
  return art;
}
const url = (p: string) => getContentBaseUrl() + 'data/art/' + p + '.webp';

/** خط پای آدم‌ها در صحنهٔ Canva (پس‌زمینه‌ها کف بلندتری دارند تا صحنهٔ کدی) */
export const ART_FOOT = 252;
const ADULT_H = 178;
const PLACE_ALIAS: Record<string, string> = { hospital: 'doctor', outside: 'park' };

/** از حالت چهره و ژست، یکی از ۸ حالت برگهٔ شخصیت */
export function choosePose(expression: Expression = 'neutral', pose: Pose = 'stand'): string {
  if (pose === 'cough' || expression === 'sick') return 'sick';
  if (pose === 'phone') return 'phone';
  if (pose === 'point') return 'point';
  if (pose === 'wave') return 'wave';
  if (pose === 'comfort' || pose === 'hug') return 'worried';
  if (['worried', 'scared', 'surprised'].includes(expression)) return 'worried';
  if (pose === 'think' || pose === 'facepalm' || expression === 'thinking') return 'worried';
  if (['sad', 'tired', 'sleepy'].includes(expression)) return 'sad';
  if (['laugh', 'love'].includes(expression) || pose === 'cheer') return 'laugh';
  if (expression === 'angry') return 'point';
  return 'neutral';
}

function heightOf(who: string): number {
  const look = lookFor(who);
  if (!look) return ADULT_H;
  const k = look.age === 'baby' ? 0.42 : look.age === 'child' ? (look.heightScale && look.heightScale < 1 ? 0.6 : 0.7) : look.age === 'teen' ? 0.9 : 1;
  return ADULT_H * k * (look.heightScale && look.age !== 'child' ? look.heightScale : 1);
}

interface Placed { x: number; foot: number; w: number; h: number; mirror: boolean; f: 1 | -1 }

/** جای هر بازیگر در صحنه: اندازه، و اینکه تصویر باید آینه شود */
export function placeActor(art: ArtIndex, a: Actor): (Placed & { src: string }) | null {
  const desired: 1 | -1 = a.facing === 'left' ? -1 : 1;
  const scale = a.scale ?? 1;
  const pet = FAMILY_PETS[a.who] || (art.animals[a.who] ? a.who : undefined);
  if (pet) {
    const p = art.animals[pet];
    if (!p) return null;
    const h = 64 * scale;
    return { src: url('animals/' + pet), x: a.x, foot: ART_FOOT, h, w: (p.w / p.h) * h, mirror: desired === -1, f: desired };
  }
  if (a.who.startsWith('job:')) {
    const job = a.who.slice(4);
    const p = art.jobs[job];
    if (!p) return null;
    const h = (job === 'baby' ? ADULT_H * 0.4 : ADULT_H) * scale;
    return { src: url('jobs/' + job), x: a.x, foot: ART_FOOT, h, w: (p.w / p.h) * h, mirror: desired === -1, f: desired };
  }
  const set = art.char[a.who];
  if (!set) return null;
  let key = choosePose(a.expression, a.pose);
  if (!set[key]) key = 'neutral';
  const p = set[key];
  if (!p) return null;
  const h = heightOf(a.who) * scale;
  // دست اشاره یا دلداری باید رو به طرف مقابل باشد؛ بقیهٔ حالت‌ها رو به راست کشیده شده‌اند
  const facesRight = p.reach ? p.reach === 'right' : true;
  const mirror = facesRight !== (desired === 1);
  return { src: url(`char/${a.who}_${key}`), x: a.x, foot: ART_FOOT, h, w: (p.w / p.h) * h, mirror, f: desired };
}

function effectAt(pl: Placed, id: Effect): [number, number] {
  const top = pl.foot - pl.h;
  const head = top + pl.h * 0.09;
  switch (id) {
    case 'cough': return [pl.x + pl.w * 0.5 * pl.f, top + pl.h * 0.2];
    case 'sweat': return [pl.x - pl.w * 0.28 * pl.f, head];
    case 'tears': return [pl.x + pl.w * 0.12 * pl.f, top + pl.h * 0.12];
    default: return [pl.x + pl.w * 0.3 * pl.f, top - 6];
  }
}

const SCENE_WIDE: Effect[] = ['rain', 'snow'];

export function ArtSceneContent({ spec, art }: { spec: SceneSpec; art: ArtIndex }) {
  const placeId = PLACE_ALIAS[spec.place] || spec.place;
  const bg = art.places[placeId];
  const placed = spec.actors.map((a) => placeActor(art, a));
  const night = spec.time === 'night';
  /** وسیله‌ها: اندازه از propMeta (نسبت به قد آدم)، سایهٔ تماس برای هر چه روی زمین است، و دو لایه (پشت و جلوی آدم‌ها) */
  const drawProps = (front: boolean) => (spec.props || []).map((p, k) => {
    if (!!p.front !== front) return null;
    const pc = art.props[p.id];
    if (!pc) return null;
    // پس‌زمینهٔ Canva خودش این‌ها را دارد
    if ((placeId === 'station' && p.id === 'train') || (placeId === 'airport' && p.id === 'plane')) return null;
    const meta = propMeta(p.id);
    const onTable = meta.where === 'table';
    const h = meta.h * (onTable ? (p.scale ?? 1.2) / 1.2 * (p.hero ? 1.5 : 1) : 1);
    const w = (pc.w / pc.h) * h;
    const bottom = Math.min(p.y + 14, ART_FOOT);
    const grounded = meta.where !== 'sky' && bottom >= ART_FOOT - 1;
    return (
      <g key={`p${front ? 'f' : 'b'}${k}`}>
        {grounded && <ellipse cx={p.x} cy={bottom - 2} rx={w * 0.46} ry={Math.max(3, Math.min(7, w * 0.05))} fill="#5A3C1E" opacity={0.16} />}
        {onTable && !grounded && <ellipse cx={p.x} cy={bottom - 1} rx={w * 0.4} ry={2.2} fill="#5A3C1E" opacity={0.18} />}
        <image href={url('props/' + p.id)} x={p.x - w / 2} y={bottom - h} width={w} height={h} />
      </g>
    );
  });
  /** حباب موضوع: نشانهٔ چیزی که جمله درباره‌اش است، بالای سر گوینده و رو به شنونده */
  const bubble = () => {
    const b = spec.bubble;
    const pl = b ? placed[b.on] : null;
    if (!b || !pl) return null;
    const items = b.items.filter((id) => art.props[id]);
    if (!items.length) return null;
    const cell = 40, pad = 9, bh = 50;
    const bw = items.length * cell + pad * 2;
    const headY = pl.foot - pl.h;
    const by = Math.max(5, Math.min(headY - bh - 12, 16));
    const bx = Math.max(6, Math.min(W - bw - 6, pl.x + 34 * pl.f - bw / 2));
    const tx = Math.max(bx + 14, Math.min(bx + bw - 14, pl.x + 16 * pl.f));
    return (
      <g>
        <path d={`M${tx - 8},${by + bh - 1} L${pl.x + 8 * pl.f},${Math.max(by + bh + 4, headY - 3)} L${tx + 8},${by + bh - 1} Z`} fill="#FFFFFF" stroke="#16224A" strokeOpacity={0.22} strokeWidth={1.4} />
        <rect x={bx} y={by} width={bw} height={bh} rx={16} fill="#FFFFFF" stroke="#16224A" strokeOpacity={0.22} strokeWidth={1.4} />
        <rect x={tx - 7} y={by + bh - 3} width={14} height={3} fill="#FFFFFF" />
        {items.map((id, i) => {
          const pc = art.props[id];
          const k = Math.min(34 / pc.w, 34 / pc.h);
          const w = pc.w * k, h = pc.h * k;
          return <image key={id} href={url('props/' + id)} x={bx + pad + i * cell + (cell - w) / 2} y={by + (bh - h) / 2} width={w} height={h} />;
        })}
      </g>
    );
  };
  return (
    <g>
      {bg ? (
        <image href={url('places/' + placeId)} x={0} y={-3} width={W} height={W * (bg.h / bg.w)} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <rect width={W} height={H} fill="#FBF5EA" />
      )}
      {night && <rect width={W} height={H} fill="#15204A" opacity={0.35} />}
      {(spec.effects || []).filter((e) => SCENE_WIDE.includes(e.id)).map((e, k) => <g key={`w${k}`}><EffectMark id={e.id} x={0} y={0} /></g>)}
      {drawProps(false)}
      {placed.map((pl, i) => {
        if (!pl) return null;
        const a = spec.actors[i];
        const holds = a.holds && a.holds !== 'phone' && art.props[a.holds] ? art.props[a.holds] : null;
        const hh = 28;
        return (
          <g key={i}>
            <ellipse cx={pl.x} cy={pl.foot - 2} rx={pl.w * 0.42} ry={5} fill="#5A3C1E" opacity={0.16} />
            <image
              href={pl.src}
              x={pl.mirror ? -(pl.x + pl.w / 2) : pl.x - pl.w / 2}
              y={pl.foot - pl.h}
              width={pl.w}
              height={pl.h}
              transform={pl.mirror ? 'scale(-1,1)' : undefined}
            />
            {holds && (
              <image href={url('props/' + a.holds)} x={pl.x + pl.w * 0.35 * pl.f - (hh * holds.w / holds.h) / 2} y={pl.foot - pl.h * 0.6} width={hh * holds.w / holds.h} height={hh} />
            )}
          </g>
        );
      })}
      {drawProps(true)}
      {bubble()}
      {(spec.effects || []).filter((e) => !SCENE_WIDE.includes(e.id)).map((e, k) => {
        const pl = e.on !== undefined ? placed[e.on] : undefined;
        const [x, y] = pl ? effectAt(pl, e.id) : [e.x ?? 200, e.y ?? 60];
        return <g key={`e${k}`}><EffectMark id={e.id} x={x} y={y} /></g>;
      })}
    </g>
  );
}

/** صحنهٔ کامل. اگر تکه‌های Canva هنوز بار نشده‌اند، null برمی‌گرداند تا والد طرح کدی را نشان دهد. */
export default function ArtScene({ spec, art, className = '', title }: { spec: SceneSpec; art: ArtIndex; className?: string; title?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={title || spec.caption || ''} xmlns="http://www.w3.org/2000/svg">
      <ArtSceneContent spec={spec} art={art} />
    </svg>
  );
}

/** آیا همهٔ آدم‌های صحنه تکهٔ Canva دارند؟ اگر نه، طرح کدی بهتر است تا صحنهٔ نیمه‌کاره. */
export function artCovers(art: ArtIndex, spec: SceneSpec): boolean {
  return spec.actors.every((a) => !!placeActor(art, a));
}

export { FAMILY };
