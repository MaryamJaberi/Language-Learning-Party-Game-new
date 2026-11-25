import React from 'react';
import type { Actor, Effect, SceneSpec } from './types';
import Person, { personAnchors } from './Person';
import { lookFor } from './people';
import { Animal, ANIMALS, FAMILY_PETS } from './animals';
import { Prop } from './props';
import { EffectMark } from './effects';
import { Place, W, H, GROUND } from './places';

const SCENE_WIDE: Effect[] = ['rain', 'snow'];
/** اندازهٔ پایهٔ آدم‌ها در صحنه */
const BASE = 1.05;

function isAnimal(who: string) {
  return !!FAMILY_PETS[who] || !!ANIMALS[who];
}

/** جای یک اثر نسبت به بازیگر */
function effectPos(actor: Actor, id: Effect): [number, number] {
  const look = lookFor(actor.who);
  const s = (actor.scale ?? 1) * BASE;
  const f = actor.facing === 'left' ? -1 : 1;
  if (!look) return [actor.x + 20 * f, GROUND - 60 * s];
  const a = personAnchors(look, actor.pose || 'stand');
  const head: [number, number] = [actor.x + a.head[0] * s * f, GROUND + a.head[1] * s];
  const r = a.headR * s;
  switch (id) {
    case 'cough': return [actor.x + a.mouth[0] * s * f + 4 * f, GROUND + a.mouth[1] * s];
    case 'sweat': return [head[0] - r * 1.05 * f, head[1] - r * 0.5];
    case 'tears': return [head[0] + r * 0.45 * f, head[1] + r * 0.25];
    case 'anger': return [head[0] + r * 0.7 * f, head[1] - r * 0.8];
    default: return [head[0] + r * 0.9 * f, head[1] - r * 1.7];
  }
}

function SpeakingMark({ actor }: { actor: Actor }) {
  const look = lookFor(actor.who);
  if (!look) return null;
  const s = (actor.scale ?? 1) * BASE;
  const f = actor.facing === 'left' ? -1 : 1;
  const a = personAnchors(look, actor.pose || 'stand');
  const x = actor.x + (a.headR * 1.25) * s * f;
  const y = GROUND + a.mouth[1] * s;
  return (
    <g transform={`translate(${x},${y}) scale(${f},1)`} fill="none" stroke="#15204A" strokeWidth={2} strokeLinecap="round" opacity={0.75}>
      <path d="M0,-6 q4,6 0,12" />
      <path d="M6,-10 q7,10 0,20" />
    </g>
  );
}

export function SceneContent({ spec }: { spec: SceneSpec }) {
  const night = spec.time === 'night';
  // پشت‌سرها (کوچک‌تر یا دورتر) اول کشیده می‌شوند
  const actors = spec.actors.map((a, i) => ({ a, i }));
  return (
    <g>
      <Place id={spec.place} night={night} />
      {(spec.effects || []).filter((e) => SCENE_WIDE.includes(e.id)).map((e, k) => <g key={`w${k}`}><EffectMark id={e.id} x={0} y={0} /></g>)}
      {(spec.props || []).map((p, k) => <g key={`p${k}`}><Prop id={p.id} x={p.x} y={p.y} scale={p.scale ?? 1.2} /></g>)}
      {actors.map(({ a, i }) => {
        if (isAnimal(a.who)) return <g key={i}><Animal id={a.who} x={a.x} y={GROUND} scale={(a.scale ?? 1) * 1.3} facing={a.facing} /></g>;
        const look = lookFor(a.who);
        if (!look) return null;
        const sc = (a.scale ?? 1) * BASE;
        // چتر بالای سر گرفته می‌شود، بقیهٔ چیزها در دست
        const umbrella = a.holds === 'umbrella';
        const held = a.holds && !umbrella ? <Prop id={a.holds} scale={0.8} /> : undefined;
        const top = umbrella ? personAnchors(look, a.pose || 'stand').top : 0;
        return (
          <g key={i}>
            <Person look={look} x={a.x} y={GROUND} scale={sc} facing={a.facing} expression={a.expression} pose={umbrella ? 'wave' : a.pose} held={held} />
            {umbrella && <Prop id="umbrella" x={a.x + 8 * (a.facing === 'left' ? -1 : 1)} y={GROUND + top * sc - 4} scale={1.5} />}
          </g>
        );
      })}
      {spec.actors.map((a, i) => (a.speaking ? <g key={`s${i}`}><SpeakingMark actor={a} /></g> : null))}
      {(spec.effects || []).filter((e) => !SCENE_WIDE.includes(e.id)).map((e, k) => {
        const actor = e.on !== undefined ? spec.actors[e.on] : undefined;
        const [x, y] = actor ? effectPos(actor, e.id) : [e.x ?? 200, e.y ?? 60];
        return <g key={`e${k}`}><EffectMark id={e.id} x={x} y={y} /></g>;
      })}
    </g>
  );
}

/** صحنهٔ کامل به شکل SVG. اندازه را والد تعیین می‌کند (عرض ۱۰۰٪). */
export default function Scene({ spec, className = '', title }: { spec: SceneSpec; className?: string; title?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={title || spec.caption || ''} xmlns="http://www.w3.org/2000/svg">
      <SceneContent spec={spec} />
    </svg>
  );
}
