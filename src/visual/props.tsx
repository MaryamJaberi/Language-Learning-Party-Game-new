import React from 'react';
import { C } from './people';

/**
 * اشیا و خوراکی‌ها. هر شیء در جعبه‌ای حدود ۴۰×۴۰ دور مبدأ کشیده می‌شود (کف شیء نزدیک y=+20).
 * بدون هیچ نوشته یا عدد، مثل کارت‌های Canva.
 */
const S = { stroke: C.ink, strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export const PROPS: Record<string, () => React.ReactNode> = {
  // ---- خانه
  chair: () => <g {...S} fill={C.brown}><rect x={-14} y={-4} width={28} height={5} /><rect x={-14} y={-26} width={5} height={24} /><path d="M-12,1 v19 M12,1 v19" strokeWidth={3.5} /></g>,
  table: () => <g {...S} fill={C.brown}><rect x={-22} y={-4} width={44} height={6} rx={2} /><path d="M-17,2 v18 M17,2 v18" strokeWidth={4} /></g>,
  bed: () => <g {...S}><rect x={-24} y={-2} width={48} height={14} rx={3} fill={C.lapisSoft} /><rect x={-24} y={-14} width={8} height={26} rx={2} fill={C.brown} /><rect x={-15} y={-8} width={12} height={7} rx={3} fill={C.white} /><path d="M-22,12 v8 M22,12 v8" strokeWidth={3} /></g>,
  sofa: () => <g {...S} fill={C.turq}><rect x={-24} y={-10} width={48} height={22} rx={6} /><rect x={-28} y={-2} width={8} height={18} rx={4} /><rect x={20} y={-2} width={8} height={18} rx={4} /><path d="M-20,16 v4 M20,16 v4" /></g>,
  lamp: () => <g {...S}><path d="M-10,-18 h20 l5,14 h-30 z" fill={C.saffron} /><path d="M0,-4 v22" /><ellipse cx={0} cy={19} rx={8} ry={2} fill={C.ink} /></g>,
  door: () => <g {...S}><rect x={-12} y={-22} width={24} height={42} rx={2} fill={C.brown} /><circle cx={7} cy={0} r={2} fill={C.saffron} /></g>,
  window: () => <g {...S}><rect x={-16} y={-16} width={32} height={30} rx={2} fill="#CFE6F5" /><path d="M0,-16 v30 M-16,-1 h32" /></g>,
  key: () => <g {...S} fill={C.saffron}><circle cx={-10} cy={0} r={7} /><circle cx={-10} cy={0} r={2.5} fill={C.cream} /><path d="M-3,0 h18 M11,0 v5 M15,0 v4" strokeWidth={3} /></g>,
  clock: () => <g {...S}><circle cx={0} cy={0} r={15} fill={C.white} /><path d="M0,0 v-9 M0,0 h7" strokeWidth={2.2} /></g>,
  tv: () => <g {...S}><rect x={-20} y={-14} width={40} height={26} rx={3} fill={C.ink} /><rect x={-17} y={-11} width={34} height={20} fill="#3E6BD6" /><path d="M-6,16 h12 M0,12 v4" /></g>,
  fridge: () => <g {...S}><rect x={-12} y={-24} width={24} height={44} rx={3} fill={C.white} /><path d="M-12,-6 h24 M7,-18 v6 M7,0 v8" /></g>,
  stove: () => <g {...S}><rect x={-16} y={-10} width={32} height={30} rx={2} fill={C.white} /><rect x={-16} y={-14} width={32} height={5} fill={C.grey} /><rect x={-10} y={-2} width={20} height={14} rx={1} fill={C.ink} /></g>,
  microwave: () => <g {...S}><rect x={-18} y={-10} width={36} height={22} rx={3} fill={C.white} /><rect x={-14} y={-6} width={20} height={14} rx={1} fill="#3E6BD6" /><circle cx={11} cy={-2} r={2} /><circle cx={11} cy={5} r={2} /></g>,
  'washing-machine': () => <g {...S}><rect x={-15} y={-18} width={30} height={36} rx={3} fill={C.white} /><circle cx={0} cy={4} r={9} fill="#8FC9F0" /><path d="M-11,-12 h8" /></g>,
  kettle: () => <g {...S}><path d="M-11,14 q-2,-20 11,-20 q13,0 11,20 z" fill={C.red} /><path d="M10,-2 l9,-6" strokeWidth={3} /><path d="M-5,-8 q5,-8 10,0" fill="none" /></g>,
  // ---- غذا و نوشیدنی
  cup: () => <g {...S}><path d="M-10,-8 h20 l-2,20 h-16 z" fill={C.white} /><path d="M10,-3 q8,0 7,7 q-1,5 -8,4" fill="none" /><rect x={-9} y={-6} width={18} height={4} fill={C.brown} stroke="none" /></g>,
  coffee: () => <g {...S}><path d="M-10,-8 h20 l-2,20 h-16 z" fill={C.saffron} /><path d="M10,-3 q8,0 7,7 q-1,5 -8,4" fill="none" /><path d="M-4,-14 q3,-4 0,-8 M3,-14 q3,-4 0,-8" fill="none" strokeWidth={1.2} /></g>,
  tea: () => <g {...S}><path d="M-8,-12 q-2,14 3,24 h10 q5,-10 3,-24 z" fill="#E7A35A" opacity={0.9} /><ellipse cx={0} cy={14} rx={12} ry={3} fill={C.white} /></g>,
  water: () => <g {...S}><path d="M-8,-14 h16 l-2,28 h-12 z" fill="#CFE6F5" /><path d="M-7,-4 h14" stroke="#7FB7E0" /></g>,
  glass: () => <g {...S}><path d="M-8,-14 h16 l-2,28 h-12 z" fill="#E9F3FA" /></g>,
  plate: () => <g {...S}><ellipse cx={0} cy={6} rx={20} ry={6} fill={C.white} /><ellipse cx={0} cy={5} rx={12} ry={3} fill="none" stroke={C.grey} /></g>,
  bread: () => <g {...S}><path d="M-18,8 q-2,-16 18,-16 q20,0 18,16 z" fill="#E7B36A" /><path d="M-8,-4 l3,5 M0,-6 l3,5 M8,-4 l3,5" /></g>,
  apple: () => <g {...S}><path d="M0,-8 q-14,-6 -14,8 q0,14 14,14 q14,0 14,-14 q0,-14 -14,-8 z" fill={C.red} /><path d="M0,-8 q1,-6 4,-8" fill="none" /><path d="M2,-12 q6,-4 8,0 q-4,3 -8,0" fill={C.green} /></g>,
  banana: () => <g {...S}><path d="M-16,-6 q4,22 30,12 q-22,4 -26,-14 z" fill={C.saffron} /></g>,
  orange: () => <g {...S}><circle cx={0} cy={2} r={13} fill="#F39A2E" /><path d="M0,-11 q3,-4 7,-3" fill="none" stroke={C.green} strokeWidth={2.4} /></g>,
  pizza: () => <g {...S}><path d="M-16,-12 L16,-12 L0,16 z" fill="#F2C56B" /><path d="M-16,-12 q16,-6 32,0" fill="#C8802F" /><circle cx={-4} cy={-4} r={2.6} fill={C.red} /><circle cx={5} cy={-2} r={2.6} fill={C.red} /><circle cx={0} cy={5} r={2.4} fill={C.red} /></g>,
  cake: () => <g {...S}><rect x={-16} y={-2} width={32} height={16} rx={2} fill={C.pink} /><path d="M-16,2 q4,4 8,0 q4,4 8,0 q4,4 8,0 q4,4 8,0" fill={C.white} /><path d="M0,-2 v-9" strokeWidth={2.4} stroke={C.saffron} /><path d="M0,-15 q2,2 0,4 q-2,-2 0,-4 z" fill={C.red} /></g>,
  egg: () => <g {...S}><ellipse cx={0} cy={2} rx={10} ry={13} fill={C.white} /></g>,
  cheese: () => <g {...S}><path d="M-16,10 L16,10 L16,-4 L-16,-10 z" fill={C.saffron} /><circle cx={-6} cy={2} r={2.5} fill="#E0A41F" /><circle cx={6} cy={4} r={2} fill="#E0A41F" /></g>,
  milk: () => <g {...S}><path d="M-9,-10 h18 v24 h-18 z" fill={C.white} /><path d="M-9,-10 l4,-8 h10 l4,8" fill={C.lapisSoft} /><rect x={-9} y={0} width={18} height={6} fill={C.lapis} /></g>,
  soup: () => <g {...S}><path d="M-18,-2 h36 q-2,16 -18,16 q-16,0 -18,-16 z" fill={C.white} /><ellipse cx={0} cy={-2} rx={18} ry={4} fill="#E0A44A" /><path d="M-4,-10 q3,-4 0,-7 M4,-10 q3,-4 0,-7" fill="none" strokeWidth={1.2} /></g>,
  rice: () => <g {...S}><path d="M-18,-2 h36 q-2,16 -18,16 q-16,0 -18,-16 z" fill={C.lapisSoft} /><path d="M-15,-2 q15,-14 30,0 z" fill={C.white} /></g>,
  'fork-knife': () => <g {...S}><path d="M-8,-16 v32 M-12,-16 v8 q4,4 8,0 v-8" fill="none" strokeWidth={2.2} /><path d="M8,16 v-32 q6,6 0,16" fill={C.grey} strokeWidth={2.2} /></g>,
  // ---- لوازم شخصی
  phone: () => <g {...S}><rect x={-8} y={-14} width={16} height={28} rx={3} fill={C.ink} /><rect x={-6} y={-11} width={12} height={20} rx={1} fill="#3E6BD6" /></g>,
  laptop: () => <g {...S}><rect x={-18} y={-14} width={36} height={22} rx={2} fill={C.grey} /><rect x={-15} y={-11} width={30} height={16} fill="#3E6BD6" /><path d="M-22,8 h44 l-3,5 h-38 z" fill={C.grey} /></g>,
  book: () => <g {...S}><path d="M0,-10 q-10,-5 -18,-2 v22 q8,-3 18,2 z" fill={C.lapis} /><path d="M0,-10 q10,-5 18,-2 v22 q-8,-3 -18,2 z" fill={C.turq} /></g>,
  pen: () => <g {...S}><path d="M-14,10 l20,-20 l4,4 l-20,20 l-6,2 z" fill={C.lapis} /></g>,
  bag: () => <g {...S}><rect x={-16} y={-6} width={32} height={22} rx={3} fill={C.brown} /><path d="M-7,-6 q0,-10 7,-10 q7,0 7,10" fill="none" strokeWidth={2.4} /></g>,
  backpack: () => <g {...S}><rect x={-13} y={-14} width={26} height={30} rx={7} fill={C.lapis} /><rect x={-8} y={2} width={16} height={9} rx={2} fill={C.lapisSoft} /></g>,
  umbrella: () => <g {...S}><path d="M-20,-2 q20,-26 40,0 q-5,-4 -10,0 q-5,-4 -10,0 q-5,-4 -10,0 q-5,-4 -10,0 z" fill={C.red} /><path d="M0,-2 v18 q0,4 -4,4" fill="none" strokeWidth={2.2} /></g>,
  glasses: () => <g {...S} fill="none" strokeWidth={2.2}><circle cx={-9} cy={0} r={7} /><circle cx={9} cy={0} r={7} /><path d="M-2,0 h4" /></g>,
  shoe: () => <g {...S}><path d="M-18,8 v-10 h10 q2,8 12,8 h10 q4,0 4,6 v2 h-36 z" fill={C.red} /></g>,
  shirt: () => <g {...S}><path d="M-8,-14 l-12,6 l4,8 l4,-2 v18 h24 v-18 l4,2 l4,-8 l-12,-6 q-8,6 -16,0 z" fill={C.lapisSoft} /></g>,
  dress: () => <g {...S}><path d="M-6,-16 h12 l2,10 l8,22 h-32 l8,-22 z" fill={C.pink} /></g>,
  hat: () => <g {...S}><ellipse cx={0} cy={6} rx={20} ry={5} fill={C.saffron} /><path d="M-10,6 q0,-18 10,-18 q10,0 10,18 z" fill={C.saffron} /></g>,
  jacket: () => <g {...S}><path d="M-8,-14 l-12,6 v24 h40 v-24 l-12,-6 l-8,10 z" fill={C.saffron} /><path d="M0,-4 v20" /></g>,
  scarf: () => <g {...S}><path d="M-16,-8 q16,10 32,0 l-2,8 q-14,8 -28,0 z" fill={C.red} /><rect x={6} y={-2} width={8} height={20} rx={2} fill={C.red} /></g>,
  // ---- پول و خرید
  money: () => <g {...S}><rect x={-18} y={-10} width={36} height={20} rx={2} fill="#7CC48A" /><circle cx={0} cy={0} r={5} fill="#5EA96C" /></g>,
  coins: () => <g {...S} fill={C.saffron}><ellipse cx={-6} cy={8} rx={9} ry={4} /><ellipse cx={-6} cy={4} rx={9} ry={4} /><ellipse cx={6} cy={10} rx={9} ry={4} /></g>,
  card: () => <g {...S}><rect x={-18} y={-11} width={36} height={22} rx={3} fill={C.lapis} /><rect x={-18} y={-5} width={36} height={5} fill={C.ink} /><rect x={-13} y={4} width={9} height={4} rx={1} fill={C.saffron} /></g>,
  cart: () => <g {...S}><path d="M-20,-12 h6 l5,18 h22 l4,-12 h-29" fill="none" strokeWidth={2.4} /><circle cx={-6} cy={12} r={3} fill={C.ink} /><circle cx={9} cy={12} r={3} fill={C.ink} /></g>,
  gift: () => <g {...S}><rect x={-15} y={-6} width={30} height={22} fill={C.turq} /><rect x={-17} y={-12} width={34} height={7} fill={C.turq} /><path d="M0,-12 v28" stroke={C.saffron} strokeWidth={4} /><path d="M0,-12 q-10,-10 -8,0 M0,-12 q10,-10 8,0" fill="none" stroke={C.saffron} strokeWidth={2.4} /></g>,
  receipt: () => <g {...S}><path d="M-11,-16 h22 v32 l-4,-3 l-4,3 l-3,-3 l-4,3 l-3,-3 l-4,3 z" fill={C.white} /><path d="M-6,-9 h12 M-6,-3 h12 M-6,3 h8" stroke={C.grey} /></g>,
  // ---- سلامت
  pill: () => <g {...S}><rect x={-14} y={-6} width={28} height={12} rx={6} fill={C.white} transform="rotate(-25)" /><path d="M0,-6 v12" transform="rotate(-25)" /><rect x={-14} y={-6} width={14} height={12} rx={6} fill={C.red} transform="rotate(-25)" /></g>,
  thermometer: () => <g {...S}><rect x={-3} y={-18} width={6} height={28} rx={3} fill={C.white} /><circle cx={0} cy={12} r={5} fill={C.red} /><rect x={-1.2} y={-6} width={2.4} height={16} fill={C.red} stroke="none" /></g>,
  'medicine-bottle': () => <g {...S}><rect x={-9} y={-10} width={18} height={24} rx={3} fill="#F39A2E" /><rect x={-7} y={-16} width={14} height={6} rx={1} fill={C.white} /><rect x={-9} y={-2} width={18} height={8} fill={C.white} /></g>,
  'first-aid': () => <g {...S}><rect x={-16} y={-10} width={32} height={24} rx={3} fill={C.white} /><path d="M0,-4 v12 M-6,2 h12" stroke={C.red} strokeWidth={3.5} /></g>,
  toothbrush: () => <g {...S}><rect x={-18} y={-2} width={30} height={5} rx={2} fill={C.turq} /><rect x={8} y={-8} width={10} height={6} fill={C.white} /></g>,
  // ---- رفت‌وآمد و سفر
  car: () => <g {...S}><path d="M-26,8 v-8 q0,-4 4,-4 h6 l6,-10 h18 l8,10 h6 q4,0 4,4 v8 z" fill={C.red} /><path d="M-8,-12 h7 v8 h-12 z M3,-12 h7 l5,8 h-12 z" fill="#CFE6F5" /><circle cx={-14} cy={9} r={5} fill={C.ink} /><circle cx={14} cy={9} r={5} fill={C.ink} /></g>,
  bicycle: () => <g {...S} fill="none" strokeWidth={2.2}><circle cx={-14} cy={6} r={10} /><circle cx={14} cy={6} r={10} /><path d="M-14,6 l8,-14 h14 l6,14 M-6,-8 l8,14 l8,-14 M-8,-12 h6" stroke={C.lapis} /></g>,
  bus: () => <g {...S}><rect x={-28} y={-18} width={56} height={30} rx={5} fill={C.saffron} /><rect x={-24} y={-14} width={10} height={10} rx={1} fill="#CFE6F5" /><rect x={-10} y={-14} width={10} height={10} rx={1} fill="#CFE6F5" /><rect x={4} y={-14} width={10} height={10} rx={1} fill="#CFE6F5" /><rect x={18} y={-14} width={7} height={18} rx={1} fill="#CFE6F5" /><circle cx={-16} cy={13} r={5} fill={C.ink} /><circle cx={16} cy={13} r={5} fill={C.ink} /></g>,
  train: () => <g {...S}><rect x={-30} y={-18} width={60} height={28} rx={8} fill={C.lapis} /><rect x={-24} y={-12} width={12} height={9} rx={2} fill="#CFE6F5" /><rect x={-6} y={-12} width={12} height={9} rx={2} fill="#CFE6F5" /><rect x={12} y={-12} width={12} height={9} rx={2} fill="#CFE6F5" /><path d="M-30,16 h60" strokeWidth={2.4} /><circle cx={-18} cy={12} r={4} fill={C.ink} /><circle cx={18} cy={12} r={4} fill={C.ink} /></g>,
  plane: () => <g {...S}><path d="M-26,2 q0,-6 8,-6 h34 q10,0 10,6 q0,4 -10,4 h-34 q-8,0 -8,-4 z" fill={C.white} /><path d="M-4,-2 l-6,-14 h6 l10,14 M-4,4 l-6,12 h6 l10,-12 M-22,-2 l-4,-10 h5 l6,8" fill={C.lapis} /></g>,
  suitcase: () => <g {...S}><rect x={-14} y={-12} width={28} height={30} rx={4} fill={C.turq} /><path d="M-5,-12 v-5 h10 v5" fill="none" strokeWidth={2.2} /><path d="M-6,-6 v20 M6,-6 v20" stroke={C.ink} /></g>,
  ticket: () => <g {...S}><path d="M-18,-9 h36 v6 q-4,0 -4,4 q0,4 4,4 v4 h-36 v-4 q4,0 4,-4 q0,-4 -4,-4 z" fill={C.saffron} /><path d="M6,-9 v18" strokeDasharray="2 2" /></g>,
  map: () => <g {...S}><path d="M-18,-12 l12,-4 l12,4 l12,-4 v26 l-12,4 l-12,-4 l-12,4 z" fill="#D8EFD9" /><path d="M-6,-16 v26 M6,-12 v26" /><circle cx={2} cy={-2} r={3} fill={C.red} stroke="none" /></g>,
  // ---- طبیعت
  flower: () => <g {...S}><path d="M0,0 v18" stroke={C.green} strokeWidth={2.4} />{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6} cy={-6 + Math.sin((a * Math.PI) / 180) * 6} r={5} fill={C.pink} />)}<circle cx={0} cy={-6} r={4} fill={C.saffron} /></g>,
  tree: () => <g {...S}><rect x={-4} y={0} width={8} height={22} fill={C.brown} /><circle cx={0} cy={-10} r={16} fill={C.green} /></g>,
  sun: () => <g {...S} stroke={C.saffron} strokeWidth={2.4}>{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d={`M${Math.cos((a * Math.PI) / 180) * 14},${Math.sin((a * Math.PI) / 180) * 14} L${Math.cos((a * Math.PI) / 180) * 20},${Math.sin((a * Math.PI) / 180) * 20}`} />)}<circle cx={0} cy={0} r={10} fill={C.saffron} /></g>,
  cloud: () => <g {...S} fill={C.white}><path d="M-18,8 q-8,0 -8,-7 q0,-7 8,-7 q2,-10 12,-9 q8,-8 16,0 q10,0 10,9 q8,1 6,9 q-2,5 -8,5 z" /></g>,
  moon: () => <g {...S}><path d="M4,-16 a16,16 0 1,0 10,28 a12,12 0 1,1 -10,-28 z" fill={C.saffron} /></g>,
  ball: () => <g {...S}><circle cx={0} cy={0} r={13} fill={C.white} /><path d="M0,-5 l5,3 l-2,6 h-6 l-2,-6 z" fill={C.ink} /></g>,
  guitar: () => <g {...S}><path d="M-4,20 q-14,0 -12,-12 q2,-6 6,-6 q-2,-6 4,-8 q6,2 4,8 q4,0 6,6 q2,12 -12,12 z" fill="#C8802F" transform="rotate(-30)" /><rect x={-1.5} y={-24} width={3} height={22} fill={C.ink} transform="rotate(-30)" /></g>,
  camera: () => <g {...S}><rect x={-16} y={-8} width={32} height={20} rx={3} fill={C.ink} /><rect x={-6} y={-12} width={10} height={5} fill={C.ink} /><circle cx={0} cy={2} r={6} fill="#8FA6EE" /></g>,
  letter: () => <g {...S}><rect x={-18} y={-11} width={36} height={24} rx={2} fill={C.white} /><path d="M-18,-11 l18,14 l18,-14" fill="none" /></g>,
  calendar: () => <g {...S}><rect x={-15} y={-13} width={30} height={28} rx={3} fill={C.white} /><rect x={-15} y={-13} width={30} height={8} fill={C.red} />{[-8, 0, 8].map((x) => [0, 7].map((y) => <rect key={`${x}${y}`} x={x - 2} y={y - 2} width={4} height={4} fill={C.grey} stroke="none" />))}</g>,
  football: () => <g {...S}><circle cx={0} cy={0} r={13} fill={C.white} /><path d="M0,-5 l5,3 l-2,6 h-6 l-2,-6 z" fill={C.ink} /></g>,
  basket: () => <g {...S}><path d="M-18,-4 h36 l-5,20 h-26 z" fill="#C8802F" /><path d="M-12,-4 q12,-18 24,0" fill="none" strokeWidth={2.4} /></g>,
};

export function Prop({ id, x = 0, y = 0, scale = 1 }: { id: string; x?: number; y?: number; scale?: number }) {
  const draw = PROPS[id];
  if (!draw) return null;
  return <g transform={`translate(${x},${y}) scale(${scale})`}>{draw()}</g>;
}
