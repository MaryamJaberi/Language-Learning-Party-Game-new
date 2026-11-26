import React from 'react';
import { C } from './people';

/**
 * حیوان‌ها، نیم‌رخ و رو به راست؛ کف پا روی y=0 (مثل آدم‌ها). سه حیوان فامیل هم اینجا هستند:
 * pepper (گربهٔ نارنجی بداخلاق)، biscuit (سگ طلایی شاد)، coco (طوطی سبز).
 */
const S = { stroke: C.ink, strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const eye = (x: number, y: number, r = 2.2) => <circle cx={x} cy={y} r={r} fill={C.ink} stroke="none" />;

export const ANIMALS: Record<string, () => React.ReactNode> = {
  cat: () => (
    <g {...S}>
      <path d="M-22,-14 q-12,-6 -10,-20" fill="none" stroke="#E8913A" strokeWidth={5} />
      <ellipse cx={-6} cy={-14} rx={18} ry={12} fill="#E8913A" />
      <path d="M-16,-4 v4 M-6,-3 v3 M4,-4 v4" strokeWidth={4} stroke="#E8913A" />
      <circle cx={14} cy={-26} r={11} fill="#E8913A" />
      <path d="M6,-33 l2,-10 l6,6 z M16,-35 l6,-8 l2,10 z" fill="#E8913A" />
      <path d="M12,-28 h5 M20,-28 h5" strokeWidth={2} />
      <path d="M16,-21 q2,1 4,0" fill="none" />
    </g>
  ),
  dog: () => (
    <g {...S}>
      <path d="M-24,-20 q-10,-8 -6,-16" fill="none" stroke="#E2B85C" strokeWidth={5} />
      <ellipse cx={-6} cy={-16} rx={20} ry={12} fill="#E2B85C" />
      <path d="M-18,-6 v6 M-8,-5 v5 M2,-5 v5 M10,-6 v6" strokeWidth={4.5} stroke="#E2B85C" />
      <circle cx={16} cy={-28} r={11} fill="#E2B85C" />
      <ellipse cx={10} cy={-28} rx={4} ry={8} fill="#C8963F" />
      <ellipse cx={26} cy={-25} rx={5} ry={4} fill="#E2B85C" />
      <circle cx={30} cy={-26} r={2} fill={C.ink} stroke="none" />
      {eye(19, -31)}
      <path d="M20,-21 q4,4 8,0" fill={C.pink} />
      <rect x={6} y={-20} width={12} height={4} rx={2} fill={C.turq} />
    </g>
  ),
  parrot: () => (
    <g {...S}>
      <path d="M-4,0 q-4,10 -10,18" stroke={C.red} strokeWidth={5} fill="none" />
      <ellipse cx={0} cy={-14} rx={10} ry={16} fill={C.green} />
      <circle cx={2} cy={-32} r={9} fill={C.green} />
      <path d="M9,-34 q8,2 4,10 q-3,-4 -6,-4 z" fill={C.saffron} />
      {eye(4, -35)}
      <path d="M-8,-18 q-6,8 4,14" fill="#3E8A4B" />
      <path d="M-2,2 v4 M3,2 v4" strokeWidth={2} />
    </g>
  ),
  bird: () => <g {...S}><ellipse cx={0} cy={-10} rx={12} ry={9} fill={C.lapisSoft} /><circle cx={9} cy={-18} r={6} fill={C.lapisSoft} /><path d="M14,-18 l6,2 l-6,2 z" fill={C.saffron} />{eye(10, -19, 1.6)}<path d="M-12,-10 l-8,-4 l2,8 z" fill={C.lapisSoft} /><path d="M-2,-2 v4 M3,-2 v4" /></g>,
  fish: () => <g {...S}><path d="M-16,-14 q16,-14 30,0 q-14,14 -30,0 z" fill="#F39A2E" /><path d="M-16,-14 l-10,-8 v16 z" fill="#F39A2E" />{eye(8, -16)}</g>,
  horse: () => <g {...S}><ellipse cx={-4} cy={-30} rx={22} ry={11} fill={C.brown} /><path d="M-20,-22 v22 M-12,-22 v22 M6,-22 v22 M14,-22 v22" strokeWidth={4} stroke={C.brown} /><path d="M12,-36 l10,-18 q8,-2 10,6 l-6,6 l-8,12 z" fill={C.brown} />{eye(24, -48)}<path d="M14,-40 l8,-16" stroke={C.ink} strokeWidth={3} /><path d="M-26,-32 q-8,4 -6,14" stroke={C.ink} strokeWidth={3} fill="none" /></g>,
  cow: () => <g {...S}><ellipse cx={-4} cy={-28} rx={22} ry={12} fill={C.white} /><circle cx={-10} cy={-30} r={5} fill={C.ink} /><circle cx={4} cy={-24} r={4} fill={C.ink} /><path d="M-18,-18 v18 M-10,-18 v18 M4,-18 v18 M12,-18 v18" strokeWidth={4} /><circle cx={20} cy={-34} r={10} fill={C.white} /><ellipse cx={24} cy={-28} rx={7} ry={5} fill={C.pink} />{eye(19, -37)}<path d="M14,-42 l-3,-5 M24,-43 l3,-5" strokeWidth={2.4} /></g>,
  sheep: () => <g {...S}>{[-14, -4, 6].map((x) => <circle key={x} cx={x} cy={-22} r={9} fill={C.white} />)}<ellipse cx={-4} cy={-18} rx={18} ry={9} fill={C.white} /><path d="M-14,-10 v10 M4,-10 v10" strokeWidth={3.5} /><ellipse cx={16} cy={-24} rx={6} ry={8} fill={C.ink} />{eye(18, -26, 1.6)}</g>,
  chicken: () => <g {...S}><ellipse cx={-2} cy={-12} rx={12} ry={10} fill={C.white} /><circle cx={8} cy={-24} r={6} fill={C.white} /><path d="M13,-24 l5,1 l-5,2 z" fill={C.saffron} /><path d="M6,-30 q2,-4 4,0 q2,-4 4,0" fill={C.red} />{eye(9, -25, 1.5)}<path d="M-4,-2 v4 M2,-2 v4" stroke={C.saffron} strokeWidth={2} /></g>,
  rabbit: () => <g {...S}><ellipse cx={-4} cy={-10} rx={13} ry={10} fill={C.white} /><circle cx={9} cy={-18} r={7} fill={C.white} /><ellipse cx={7} cy={-32} rx={3} ry={9} fill={C.white} /><ellipse cx={12} cy={-31} rx={3} ry={9} fill={C.white} />{eye(11, -19, 1.6)}<circle cx={-16} cy={-12} r={3} fill={C.white} /></g>,
  mouse: () => <g {...S}><ellipse cx={0} cy={-6} rx={10} ry={6} fill={C.grey} /><circle cx={7} cy={-12} r={4} fill={C.grey} />{eye(10, -8, 1.2)}<path d="M-10,-6 q-10,0 -12,6" fill="none" /></g>,
  lion: () => <g {...S}><ellipse cx={-6} cy={-18} rx={20} ry={11} fill={C.saffron} /><path d="M-18,-8 v8 M-8,-8 v8 M2,-8 v8 M10,-8 v8" strokeWidth={4.5} stroke={C.saffron} /><circle cx={18} cy={-28} r={15} fill="#C8802F" /><circle cx={20} cy={-27} r={9} fill={C.saffron} />{eye(23, -29)}<path d="M-26,-20 q-8,0 -8,-10" fill="none" stroke={C.saffron} strokeWidth={3} /></g>,
  elephant: () => <g {...S}><ellipse cx={-4} cy={-30} rx={24} ry={16} fill={C.grey} /><path d="M-18,-16 v16 M-8,-16 v16 M6,-16 v16 M14,-16 v16" strokeWidth={6} stroke={C.grey} /><circle cx={20} cy={-36} r={11} fill={C.grey} /><path d="M28,-34 q8,10 2,26" fill="none" stroke={C.grey} strokeWidth={6} /><ellipse cx={12} cy={-36} rx={8} ry={10} fill="#B5BCCB" />{eye(23, -39)}</g>,
  bear: () => <g {...S}><ellipse cx={-4} cy={-20} rx={20} ry={13} fill={C.brown} /><path d="M-16,-10 v10 M-6,-10 v10 M4,-10 v10 M12,-10 v10" strokeWidth={6} stroke={C.brown} /><circle cx={16} cy={-30} r={11} fill={C.brown} /><circle cx={12} cy={-40} r={4} fill={C.brown} /><circle cx={21} cy={-40} r={4} fill={C.brown} /><ellipse cx={22} cy={-27} rx={5} ry={4} fill="#C99A72" />{eye(17, -32)}</g>,
  monkey: () => <g {...S}><path d="M-12,-10 q-14,0 -12,-18" fill="none" stroke={C.brown} strokeWidth={3} /><ellipse cx={0} cy={-14} rx={10} ry={13} fill={C.brown} /><circle cx={2} cy={-32} r={10} fill={C.brown} /><ellipse cx={4} cy={-30} rx={7} ry={6} fill="#E1B590" /><circle cx={-8} cy={-32} r={4} fill="#E1B590" />{eye(2, -32, 1.5)}{eye(7, -32, 1.5)}</g>,
  duck: () => <g {...S}><ellipse cx={-2} cy={-10} rx={14} ry={9} fill={C.saffron} /><circle cx={9} cy={-22} r={7} fill={C.saffron} /><path d="M15,-22 h7 q0,3 -7,3 z" fill="#F39A2E" />{eye(10, -24, 1.5)}</g>,
  butterfly: () => <g {...S}><ellipse cx={-8} cy={-20} rx={8} ry={10} fill={C.purple} /><ellipse cx={8} cy={-20} rx={8} ry={10} fill={C.pink} /><ellipse cx={-7} cy={-8} rx={6} ry={5} fill={C.purple} /><ellipse cx={7} cy={-8} rx={6} ry={5} fill={C.pink} /><path d="M0,-26 v20" strokeWidth={2.4} /></g>,
  turtle: () => <g {...S}><path d="M-18,-4 q0,-20 18,-20 q18,0 18,20 z" fill={C.green} /><circle cx={22} cy={-8} r={6} fill="#9CC97A" />{eye(24, -9, 1.4)}<path d="M-12,-4 v4 M10,-4 v4" strokeWidth={3} stroke="#9CC97A" /></g>,
  frog: () => <g {...S}><ellipse cx={0} cy={-8} rx={14} ry={9} fill="#6CC070" /><circle cx={-6} cy={-18} r={5} fill="#6CC070" /><circle cx={6} cy={-18} r={5} fill="#6CC070" />{eye(-6, -18, 2)}{eye(6, -18, 2)}<path d="M-6,-6 q6,4 12,0" fill="none" /></g>,
};

/** حیوان‌های فامیل */
export const FAMILY_PETS: Record<string, string> = { pepper: 'cat', biscuit: 'dog', coco: 'parrot' };

export function Animal({ id, x = 0, y = 0, scale = 1, facing = 'right' }: { id: string; x?: number; y?: number; scale?: number; facing?: 'left' | 'right' }) {
  const kind = FAMILY_PETS[id] || id;
  const draw = ANIMALS[kind];
  if (!draw) return null;
  const f = facing === 'left' ? -1 : 1;
  return <g transform={`translate(${x},${y}) scale(${scale * f},${scale})`}>{draw()}</g>;
}
