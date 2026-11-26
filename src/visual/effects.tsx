import React from 'react';
import type { Effect } from './types';
import { C } from './people';

/** نشانه‌های کوچک کنار آدم‌ها یا در صحنه: سرفه، عرق نگرانی، قلب، خواب، علامت سؤال… (x,y = کنار سر) */
const S = { stroke: C.ink, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const EFFECTS: Record<Effect, () => React.ReactNode> = {
  cough: () => (
    <g {...S} fill="#FFFFFF" strokeOpacity={0.6}>
      <circle cx={10} cy={0} r={5} /><circle cx={20} cy={-4} r={7} /><circle cx={32} cy={-2} r={5} />
      <path d="M8,-10 l6,-4 M10,8 l6,4" fill="none" strokeOpacity={0.8} />
    </g>
  ),
  sweat: () => <path d="M0,-8 q6,8 0,12 q-6,-4 0,-12 z" fill="#7FC4EE" {...S} strokeOpacity={0.5} />,
  hearts: () => <g fill={C.red}>{[[0, 0, 1], [14, -12, 0.7], [-6, -18, 0.55]].map(([x, y, s]) => <path key={x} transform={`translate(${x},${y}) scale(${s})`} d="M0,8 C-12,-2 -8,-12 0,-6 C8,-12 12,-2 0,8 z" />)}</g>,
  zzz: () => <g {...S} fill="none" stroke={C.lapis} strokeWidth={2}>{[[0, 0, 8], [10, -12, 6], [18, -22, 5]].map(([x, y, s]) => <path key={x} d={`M${x},${y} h${s} l${-s},${s} h${s}`} />)}</g>,
  question: () => <g><circle cx={0} cy={0} r={11} fill={C.saffron} {...S} /><path d="M-3,-4 q0,-4 3,-4 q4,0 4,4 q0,3 -4,4 v2" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" /><circle cx={0} cy={6} r={1.3} fill={C.ink} /></g>,
  exclaim: () => <g><circle cx={0} cy={0} r={11} fill={C.red} {...S} /><path d="M0,-7 v8" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" /><circle cx={0} cy={5.5} r={1.5} fill="#FFFFFF" /></g>,
  rain: () => (
    <g>
      {Array.from({ length: 40 }, (_, i) => <path key={i} d={`M${(i * 53) % 400},${(i * 37) % 200} l-4,12`} stroke="#6FA8DC" strokeWidth={2} strokeLinecap="round" />)}
    </g>
  ),
  snow: () => <g fill="#FFFFFF" stroke="#BFD8EC">{Array.from({ length: 34 }, (_, i) => <circle key={i} cx={(i * 59) % 400} cy={(i * 41) % 210} r={3} />)}</g>,
  music: () => <g fill={C.lapis}><path d="M0,0 v-16 l10,-3 v14" stroke={C.lapis} strokeWidth={2} fill="none" /><circle cx={-2} cy={0} r={3} /><circle cx={8} cy={-5} r={3} /></g>,
  steam: () => <g fill="none" stroke={C.grey} strokeWidth={2} strokeLinecap="round"><path d="M0,0 q4,-6 0,-12 q-4,-6 0,-12" /><path d="M8,2 q4,-6 0,-12 q-4,-6 0,-12" /></g>,
  tears: () => <g fill="#7FC4EE" {...S} strokeOpacity={0.4}><path d="M0,0 q4,6 0,9 q-4,-3 0,-9 z" /><path d="M-22,0 q4,6 0,9 q-4,-3 0,-9 z" /></g>,
  anger: () => <path d="M-6,-6 q4,4 0,6 M6,-6 q-4,4 0,6 M-6,6 q4,-4 6,0 M6,6 q-4,-4 -6,0" stroke={C.red} strokeWidth={2.4} fill="none" strokeLinecap="round" />,
  sparkle: () => <g fill={C.saffron}>{[[0, 0, 1], [16, 8, 0.6], [-12, 10, 0.5]].map(([x, y, s]) => <path key={x} transform={`translate(${x},${y}) scale(${s})`} d="M0,-10 L3,-3 L10,0 L3,3 L0,10 L-3,3 L-10,0 L-3,-3 z" />)}</g>,
  idea: () => <g {...S}><circle cx={0} cy={0} r={9} fill={C.saffron} /><rect x={-4} y={8} width={8} height={5} fill={C.grey} />{[[-16, 0], [16, 0], [0, -16], [-11, -11], [11, -11]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x * 0.85},${y * 0.85} L${x * 1.15},${y * 1.15}`} />)}</g>,
  clock: () => <g {...S}><circle cx={0} cy={0} r={11} fill="#FFFFFF" /><path d="M0,0 v-7 M0,0 h5" strokeWidth={2} /></g>,
  hungry: () => <g {...S}><ellipse cx={0} cy={0} rx={12} ry={8} fill="#FFFFFF" /><path d="M-5,0 q2,-3 4,0 t4,0" fill="none" /><path d="M-14,10 l-4,4" /></g>,
  cold: () => <g fill="none" stroke="#7FC4EE" strokeWidth={2} strokeLinecap="round"><path d="M-8,0 h16 M0,-8 v16 M-6,-6 l12,12 M6,-6 l-12,12" /></g>,
  hot: () => <g fill="none" stroke={C.red} strokeWidth={2} strokeLinecap="round"><path d="M-6,0 q3,-5 0,-10 M2,0 q3,-5 0,-10 M10,0 q3,-5 0,-10" /></g>,
  money: () => <g {...S}><rect x={-10} y={-6} width={20} height={12} rx={2} fill="#7CC48A" /><rect x={-6} y={-12} width={20} height={12} rx={2} fill="#9BD6A7" /></g>,
  'phone-ring': () => <g fill="none" stroke={C.lapis} strokeWidth={2} strokeLinecap="round"><path d="M0,-6 q6,6 0,12 M5,-10 q10,10 0,20" /></g>,
};

export function EffectMark({ id, x, y }: { id: Effect; x: number; y: number }) {
  const draw = EFFECTS[id];
  if (!draw) return null;
  return <g transform={`translate(${x},${y})`}>{draw()}</g>;
}
