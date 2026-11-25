/** تصویر مربعی واژهٔ دیکشنری از تکه‌های Canva (همتای LexThumb). */
import React from 'react';
import type { Visual } from './lexicon';
import { ArtSceneContent, placeActor, ART_FOOT, type ArtIndex } from './ArtScene';
import { FAMILY_PETS } from './animals';
import { W, H } from './places';
import { getContentBaseUrl } from '../../contentStore';

const url = (p: string) => getContentBaseUrl() + 'data/art/' + p + '.webp';
const S = 120;

function fit(w: number, h: number, box: number) {
  const k = Math.min(box / w, box / h);
  return { w: w * k, h: h * k };
}

/** آیا این واژه تکهٔ Canva دارد؟ */
export function artHasVisual(art: ArtIndex, v: Visual): boolean {
  switch (v.kind) {
    case 'person': return !!placeActor(art, { who: v.who, x: 0, expression: v.expression, pose: v.pose });
    case 'prop': return !!art.props[v.id];
    case 'animal': return !!art.animals[FAMILY_PETS[v.id] || v.id];
    case 'place': return !!art.places[v.id === 'hospital' ? 'doctor' : v.id === 'outside' ? 'park' : v.id];
    case 'scene': return v.spec.actors.every((a) => !!placeActor(art, a));
  }
}

export default function ArtThumb({ visual, art, className = '', title }: { visual: Visual; art: ArtIndex; className?: string; title?: string }) {
  let body: React.ReactNode = null;
  let viewBox = `0 0 ${S} ${S}`;
  const disc = <circle cx={60} cy={62} r={50} fill="#FFFFFF" opacity={0.75} />;
  switch (visual.kind) {
    case 'person': {
      const pl = placeActor(art, { who: visual.who, x: 0, expression: visual.expression, pose: visual.pose });
      if (!pl) break;
      // نمای نزدیک برای احساس‌ها: فقط سر و شانه
      const h = visual.portrait ? 300 : 112;
      const w = (pl.w / pl.h) * h;
      const x = 60 - w / 2;
      const y = visual.portrait ? 4 : 4;
      body = (
        <>
          {disc}
          <image href={pl.src} x={pl.mirror ? -(x + w) : x} y={y} width={w} height={h} transform={pl.mirror ? 'scale(-1,1)' : undefined} />
        </>
      );
      break;
    }
    case 'prop': {
      const p = art.props[visual.id];
      if (!p) break;
      const { w, h } = fit(p.w, p.h, 88);
      body = <>{disc}<image href={url('props/' + visual.id)} x={60 - w / 2} y={62 - h / 2} width={w} height={h} /></>;
      break;
    }
    case 'animal': {
      const id = FAMILY_PETS[visual.id] || visual.id;
      const p = art.animals[id];
      if (!p) break;
      const { w, h } = fit(p.w, p.h, 94);
      body = <>{disc}<image href={url('animals/' + id)} x={60 - w / 2} y={62 - h / 2} width={w} height={h} /></>;
      break;
    }
    case 'place': {
      const id = visual.id === 'hospital' ? 'doctor' : visual.id === 'outside' ? 'park' : visual.id;
      if (!art.places[id]) break;
      body = <image href={url('places/' + id)} x={-60} y={0} width={240} height={160} preserveAspectRatio="xMidYMid slice" />;
      if (visual.night) body = <>{body}<rect width={S} height={S} fill="#15204A" opacity={0.35} /></>;
      break;
    }
    case 'scene': {
      // روی آدم‌ها زوم کن: مربعی دور بازیگران، تا کف صحنه
      const xs = visual.spec.actors.map((a) => a.x);
      const cx = xs.reduce((s, x) => s + x, 0) / Math.max(xs.length, 1);
      const spread = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
      const size = Math.min(H, Math.max(205, spread + 150));
      const x0 = Math.max(0, Math.min(W - size, cx - size / 2));
      const y0 = Math.max(0, ART_FOOT + 6 - size);
      viewBox = `${x0} ${y0} ${size} ${size}`;
      body = <ArtSceneContent spec={visual.spec} art={art} />;
      break;
    }
  }
  if (!body) return null;
  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={title || ''} xmlns="http://www.w3.org/2000/svg">
      {visual.kind !== 'scene' && <rect width={S} height={S} rx={14} fill="#FBF0DC" />}
      {body}
    </svg>
  );
}
