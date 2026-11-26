import React from 'react';
import { C } from './people';

/** پس‌زمینهٔ صحنه‌ها، ۴۰۰×۲۶۰. خط زمین y=228 است. بدون هیچ نوشته‌ای روی تابلوها. */
export const W = 400;
export const H = 260;
export const GROUND = 228;
const S = { stroke: C.ink, strokeWidth: 1.4, strokeLinejoin: 'round' as const };

const wall = (color: string, floor: string) => (
  <g>
    <rect width={W} height={GROUND} fill={color} />
    <rect y={GROUND} width={W} height={H - GROUND} fill={floor} />
    <path d={`M0,${GROUND} H${W}`} stroke={C.ink} strokeOpacity={0.25} strokeWidth={2} />
  </g>
);
const windowAt = (x: number, y: number, w = 70, h = 60, night = false) => (
  <g {...S}>
    <rect x={x} y={y} width={w} height={h} rx={3} fill={night ? '#2B3A6E' : '#CFE6F5'} />
    <path d={`M${x + w / 2},${y} v${h} M${x},${y + h / 2} h${w}`} />
    {night && <circle cx={x + w * 0.72} cy={y + h * 0.28} r={6} fill={C.saffron} stroke="none" />}
  </g>
);
const sky = (night: boolean) => <rect width={W} height={GROUND} fill={night ? '#1E2A5A' : '#CFE9F7'} />;
const groundOut = (c = '#9ED39B') => <rect y={GROUND} width={W} height={H - GROUND} fill={c} />;
const buildings = (night: boolean) => (
  <g {...S} strokeOpacity={0.5}>
    {[[10, 90, 60], [80, 60, 55], [145, 110, 50], [205, 70, 65], [280, 100, 50], [340, 80, 60]].map(([x, top, w]) => (
      <g key={x}>
        <rect x={x} y={top} width={w} height={GROUND - top} fill={night ? '#34417A' : '#E7DCC8'} />
        {[0, 1, 2].map((r) => [0, 1].map((c) => (
          <rect key={`${r}${c}`} x={x + 8 + c * (w / 2 - 4)} y={top + 12 + r * 30} width={w / 2 - 14} height={14} fill={night ? '#F5D36B' : '#BFD8EC'} strokeOpacity={0.3} />
        )))}
      </g>
    ))}
  </g>
);

export const PLACES: Record<string, (night: boolean) => React.ReactNode> = {
  home: (n) => (
    <g>
      {wall(n ? '#3C3A5E' : '#F6E7CF', '#D9B98F')}
      {windowAt(300, 50, 70, 60, n)}
      <g {...S}><rect x={30} y={50} width={46} height={36} fill="#FFFFFF" /><path d="M30,86 l18,-22 l12,12 l8,-8 l8,18" fill="#9ED39B" /></g>
      <rect x={0} y={GROUND - 4} width={W} height={4} fill="#C9A274" />
      <ellipse cx={200} cy={GROUND + 16} rx={150} ry={10} fill="#E9C9A0" opacity={0.6} />
      <g {...S}>
        <rect x={140} y={170} width={120} height={40} rx={10} fill="#12B5A4" />
        <rect x={130} y={186} width={16} height={34} rx={7} fill="#12B5A4" />
        <rect x={254} y={186} width={16} height={34} rx={7} fill="#12B5A4" />
        <rect x={150} y={150} width={100} height={26} rx={8} fill="#0F9C8D" />
        <path d="M150,212 v14 M250,212 v14" />
      </g>
    </g>
  ),
  kitchen: (n) => (
    <g>
      {wall(n ? '#3C3A5E' : '#E5F1EE', '#C9D4DE')}
      {windowAt(160, 40, 80, 56, n)}
      <g {...S}>
        <rect x={0} y={150} width={W} height={10} fill="#BFA27C" />
        <rect x={0} y={160} width={W} height={GROUND - 160} fill="#FFFFFF" />
        {[40, 120, 280, 360].map((x) => <path key={x} d={`M${x},165 v55`} strokeOpacity={0.3} />)}
        <rect x={20} y={40} width={110} height={44} fill="#FFFFFF" />
        <rect x={270} y={40} width={110} height={44} fill="#FFFFFF" />
      </g>
    </g>
  ),
  bedroom: (n) => (
    <g>
      {wall(n ? '#2E2F55' : '#EDE3F6', '#CDB79A')}
      {windowAt(40, 50, 60, 60, n)}
      <g {...S}><rect x={250} y={170} width={140} height={44} rx={6} fill={C.lapisSoft} /><rect x={250} y={150} width={14} height={78} rx={3} fill={C.brown} /><rect x={268} y={160} width={36} height={14} rx={6} fill="#FFFFFF" /></g>
    </g>
  ),
  doctor: (n) => (
    <g>
      {wall(n ? '#33405F' : '#E6F3F7', '#D6E2E8')}
      {windowAt(310, 46, 62, 56, n)}
      <g {...S}>
        <rect x={30} y={40} width={40} height={40} rx={4} fill="#FFFFFF" />
        <path d="M50,50 v20 M40,60 h20" stroke={C.red} strokeWidth={6} />
        <rect x={120} y={60} width={26} height={70} rx={3} fill="#FFFFFF" />
        {[0, 1, 2, 3].map((r) => <rect key={r} x={125} y={66 + r * 15} width={16} height={8} fill={C.lapisSoft} strokeOpacity={0.3} />)}
        <rect x={160} y={180} width={110} height={18} rx={6} fill="#BFE4E0" />
        <path d="M172,198 v30 M258,198 v30" strokeWidth={3} />
      </g>
    </g>
  ),
  hospital: (n) => PLACES.doctor(n),
  street: (n) => (
    <g>
      {sky(n)}
      {buildings(n)}
      <rect y={GROUND} width={W} height={H - GROUND} fill="#B9BDC8" />
      <path d={`M0,${GROUND + 14} H${W}`} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="18 14" />
    </g>
  ),
  park: (n) => (
    <g>
      {sky(n)}
      <ellipse cx={90} cy={GROUND} rx={160} ry={50} fill="#B7E0A9" />
      <ellipse cx={330} cy={GROUND} rx={150} ry={40} fill="#A6D896" />
      {[[40, 150], [350, 160], [300, 140]].map(([x, y]) => (
        <g key={x} {...S}><rect x={x - 5} y={y} width={10} height={GROUND - y} fill={C.brown} /><circle cx={x} cy={y - 18} r={28} fill="#5DAE62" /></g>
      ))}
      {groundOut()}
      {n ? <circle cx={60} cy={40} r={14} fill={C.saffron} /> : <circle cx={60} cy={40} r={18} fill={C.saffron} />}
    </g>
  ),
  shop: (n) => (
    <g>
      {wall(n ? '#3A3F63' : '#FFF6E2', '#E3D6C2')}
      <g {...S}>
        {[30, 290].map((x) => (
          <g key={x}>
            <rect x={x} y={50} width={90} height={150} fill="#E9DDC8" />
            {[0, 1, 2].map((r) => (
              <g key={r}>
                <rect x={x} y={90 + r * 44} width={90} height={5} fill={C.brown} />
                {[0, 1, 2, 3].map((c) => <rect key={c} x={x + 6 + c * 21} y={70 + r * 44} width={15} height={20} rx={2} fill={[C.red, C.saffron, C.turq, C.lapisSoft][(c + r) % 4]} />)}
              </g>
            ))}
          </g>
        ))}
        <rect x={150} y={36} width={100} height={22} rx={4} fill={C.lapis} />
      </g>
    </g>
  ),
  cafe: (n) => (
    <g>
      {wall(n ? '#3E3554' : '#F8E9D6', '#C79E74')}
      {windowAt(40, 46, 90, 70, n)}
      <g {...S}>
        <path d="M250,40 h120 v14 q-60,10 -120,0 z" fill={C.saffron} />
        <rect x={260} y={150} width={120} height={78} fill="#B9805A" />
        <rect x={252} y={142} width={136} height={10} rx={3} fill="#8A5A3B" />
        <circle cx={160} cy={70} r={14} fill="#FFFFFF" />
      </g>
    </g>
  ),
  restaurant: (n) => (
    <g>
      {wall(n ? '#3A2E4C' : '#F3E2E0', '#B9805A')}
      {windowAt(160, 40, 80, 60, n)}
      <g {...S}><path d="M40,30 v30 M360,30 v30" /><circle cx={40} cy={66} r={9} fill={C.saffron} /><circle cx={360} cy={66} r={9} fill={C.saffron} /></g>
      <g {...S}>
        <rect x={150} y={168} width={100} height={8} rx={2} fill="#FFFFFF" />
        <path d="M160,176 v52 M240,176 v52" strokeWidth={4} />
        <ellipse cx={180} cy={166} rx={14} ry={3} fill="#FFFFFF" />
        <ellipse cx={222} cy={166} rx={14} ry={3} fill="#FFFFFF" />
        <path d="M200,166 v-14" stroke={C.saffron} strokeWidth={3} />
      </g>
    </g>
  ),
  school: (n) => (
    <g>
      {wall(n ? '#33425F' : '#EAF2E3', '#D2B48C')}
      <g {...S}>
        <rect x={110} y={36} width={180} height={90} rx={4} fill="#2F5D4A" />
        <path d="M130,60 q20,-10 40,0 M190,80 h60 M130,96 h40" stroke="#FFFFFF" strokeOpacity={0.7} fill="none" />
        <rect x={110} y={126} width={180} height={6} fill={C.brown} />
      </g>
      {windowAt(320, 50, 58, 56, n)}
    </g>
  ),
  office: (n) => (
    <g>
      {wall(n ? '#2F3A5C' : '#EEF2F7', '#B7C0CF')}
      {windowAt(40, 40, 120, 80, n)}
      <g {...S}>
        <rect x={250} y={60} width={60} height={44} rx={3} fill="#FFFFFF" />
        <path d="M258,94 l12,-14 l10,8 l14,-20" fill="none" stroke={C.turq} strokeWidth={3} />
        <path d="M330,228 v-60 q0,-10 10,-10 q10,0 10,10" fill="none" stroke="#5DAE62" strokeWidth={4} />
        <circle cx={340} cy={150} r={14} fill="#5DAE62" />
      </g>
    </g>
  ),
  station: (n) => (
    <g>
      {sky(n)}
      <g {...S}>
        <rect x={0} y={60} width={W} height={10} fill={C.grey} />
        {[20, 140, 260, 380].map((x) => <rect key={x} x={x - 4} y={60} width={8} height={GROUND - 60} fill={C.grey} />)}
        <rect x={150} y={80} width={100} height={30} rx={3} fill={C.ink} />
        {[0, 1, 2].map((i) => <rect key={i} x={160 + i * 30} y={88} width={20} height={6} fill={C.saffron} stroke="none" />)}
      </g>
      <rect y={GROUND} width={W} height={H - GROUND} fill="#C9CDD6" />
      <path d={`M0,${GROUND + 2} H${W}`} stroke={C.saffron} strokeWidth={4} />
    </g>
  ),
  airport: (n) => (
    <g>
      {sky(n)}
      <g {...S}>
        <rect x={0} y={80} width={W} height={GROUND - 80} fill={n ? '#2D3766' : '#E7EEF6'} />
        <rect x={20} y={96} width={360} height={80} fill={n ? '#1E2A5A' : '#BFD8EC'} />
        <path d="M60,140 q40,-24 120,-24 h40 l20,-16 h10 l-8,16 h40 q10,0 10,6 q0,6 -10,6 h-200 z" fill="#FFFFFF" strokeOpacity={0.6} />
      </g>
      <rect y={GROUND} width={W} height={H - GROUND} fill="#D5D9E2" />
    </g>
  ),
  beach: (n) => (
    <g>
      {sky(n)}
      <rect y={140} width={W} height={60} fill="#5FB8D8" />
      <path d={`M0,200 q100,-14 200,0 t200,0 V${H} H0 z`} fill="#F3D9A0" />
      <circle cx={330} cy={50} r={20} fill={C.saffron} />
    </g>
  ),
  bank: (n) => (
    <g>
      {wall(n ? '#353B5E' : '#EEF0F6', '#C9CDD6')}
      <g {...S}>
        <path d="M120,40 h160 l-80,-24 z" fill={C.lapisSoft} />
        {[140, 180, 220, 260].map((x) => <rect key={x} x={x - 6} y={46} width={12} height={110} fill="#FFFFFF" />)}
        <rect x={120} y={156} width={160} height={8} fill={C.grey} />
        <rect x={20} y={140} width={80} height={88} fill="#B9805A" />
      </g>
    </g>
  ),
  outside: (n) => (
    <g>
      {sky(n)}
      <g {...S}><path d="M40,228 v-90 l50,-40 l50,40 v90 z" fill="#F6E7CF" /><rect x={78} y={180} width={24} height={48} fill={C.brown} /></g>
      {groundOut()}
      <g {...S}><rect x={290} y={160} width={10} height={68} fill={C.brown} /><circle cx={295} cy={140} r={34} fill="#5DAE62" /></g>
    </g>
  ),
  plain: () => <rect width={W} height={H} fill={C.cream} />,
};

export function Place({ id, night = false }: { id: string; night?: boolean }) {
  return <>{(PLACES[id] || PLACES.plain)(night)}</>;
}
