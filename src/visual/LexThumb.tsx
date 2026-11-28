import React from 'react';
import type { Visual } from './lexicon';
import Person, { personAnchors } from './Person';
import { lookFor } from './people';
import { Prop } from './props';
import { Animal } from './animals';
import { Place, W, H } from './places';
import { SceneContent } from './Scene';

/** تصویر مربعی یک واژهٔ دیکشنری (۱۲۰×۱۲۰). */
const LexThumb: React.FC<{ visual: Visual; className?: string; title?: string }> = ({ visual, className = '', title }) => {
  let body: React.ReactNode = null;
  switch (visual.kind) {
    case 'person': {
      const look = lookFor(visual.who);
      if (look) {
        const held = visual.holds ? <Prop id={visual.holds} scale={0.8} /> : undefined;
        // نمای نزدیک: سر و شانه بزرگ؛ نمای عادی: از سر تا زانو
        const base = look.age === 'baby' ? 1.25 : look.age === 'child' ? 0.95 : look.age === 'teen' ? 0.8 : 0.74;
        const scale = visual.portrait ? base * 1.9 : base;
        const anchor = personAnchors(look, visual.pose || 'stand');
        const headY = anchor.head[1] * scale;
        const y = (visual.portrait ? 50 : 30) - headY;
        body = (
          <>
            <circle cx={60} cy={62} r={50} fill="#FFFFFF" opacity={0.7} />
            <Person look={look} x={60} y={y} scale={scale} expression={visual.expression} pose={visual.pose} held={held} />
          </>
        );
      }
      break;
    }
    case 'prop':
      body = (
        <>
          <circle cx={60} cy={60} r={46} fill="#FFFFFF" opacity={0.7} />
          <Prop id={visual.id} x={60} y={60} scale={1.9} />
        </>
      );
      break;
    case 'animal':
      body = (
        <>
          <circle cx={60} cy={60} r={46} fill="#FFFFFF" opacity={0.7} />
          <Animal id={visual.id} x={58} y={92} scale={1.45} />
        </>
      );
      break;
    case 'place':
      body = (
        <svg x={0} y={0} width={120} height={120} viewBox={`70 0 260 ${H}`} preserveAspectRatio="xMidYMid slice">
          <Place id={visual.id} night={visual.night} />
        </svg>
      );
      break;
    case 'scene': {
      // روی آدم‌ها زوم کن: پنجرهٔ مربعی دور بازیگران، از پایین صحنه
      const xs = visual.spec.actors.map((a) => a.x);
      const props = (visual.spec.props || []).map((p) => p.x);
      const all = [...xs, ...props];
      const minX = Math.min(...all), maxX = Math.max(...all);
      const size = Math.min(H, Math.max(236, maxX - minX + 130));
      const vx = Math.max(0, Math.min(W - size, (minX + maxX) / 2 - size / 2));
      body = (
        <svg x={0} y={0} width={120} height={120} viewBox={`${vx} ${H - size} ${size} ${size}`} preserveAspectRatio="xMidYMid slice">
          <SceneContent spec={visual.spec} />
        </svg>
      );
      break;
    }
  }
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title || ''} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="lexthumb-clip"><rect width={120} height={120} rx={14} /></clipPath>
      </defs>
      <g clipPath="url(#lexthumb-clip)">
        <rect width={120} height={120} fill="#FBF4E6" />
        {body}
      </g>
    </svg>
  );
};

export default LexThumb;
