import React from 'react';
import type { Expression, Pose, PersonLook } from './types';

/**
 * یک آدم به سبک کارت‌های «دور»: تخت، گرد و ساده.
 * مبدأ (۰، ۰) کف پاهاست؛ بالا منفی است. «راست» یعنی رو به جهتی که آدم نگاه می‌کند؛
 * برای رو به چپ، کل شکل قرینه می‌شود.
 */

const HEIGHT: Record<PersonLook['age'], number> = { baby: 58, child: 100, teen: 140, adult: 158, elder: 150 };
const INK = '#15204A';

function darken(hex: string, amt = 0.18): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.round(v * (1 - amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

interface Geo {
  H: number; r: number; cy: number; sy: number; hipY: number; sx: number; L: number; tw: number; arm: number;
}

function geometry(look: PersonLook, pose: Pose): Geo {
  const H = HEIGHT[look.age] * (look.heightScale || 1);
  const r = look.age === 'child' ? 18.5 : look.age === 'baby' ? 16 : look.age === 'teen' ? 19 : 20;
  const tw = look.age === 'child' ? 24 : look.age === 'teen' ? 28 : look.feminine ? 30 : 34;
  let hipY = -H * (look.age === 'child' ? 0.4 : 0.46);
  let cy = -H + r;
  if (pose === 'sit') {
    const drop = H * 0.2;
    hipY += drop;
    cy += drop;
  }
  const sy = cy + r + 5;
  const sx = tw / 2 - 3;
  const L = (hipY - sy) * 0.55;
  const arm = look.age === 'child' ? 6.5 : 8;
  return { H, r, cy, sy, hipY, sx, L, tw, arm };
}

type Pt = [number, number];

/** جای دست راست و چپ برای هر حالت (x مثبت = رو به جلو/راست) */
function handTargets(pose: Pose, g: Geo): { R: Pt; L: Pt; bendR?: number; bendL?: number; eR?: Pt; eL?: Pt } {
  const { sx, sy, L, cy, r, hipY } = g;
  const stand: Pt = [sx + 0.3 * L, sy + 1.9 * L];
  const standL: Pt = [-(sx + 0.3 * L), sy + 1.9 * L];
  switch (pose) {
    case 'wave': return { R: [sx + 0.9 * L, sy - 1.3 * L], L: standL };
    case 'point': return { R: [sx + 1.95 * L, sy + 0.2 * L], L: standL };
    case 'hold': return { R: [5, sy + 1.25 * L], L: [-5, sy + 1.25 * L] };
    case 'cough': return { R: [r * 0.25, cy + r * 0.55], L: standL, bendR: 1, eR: [sx + 0.45 * L, sy + 0.8 * L] };
    case 'eat': return { R: [r * 0.35, cy + r * 0.45], L: [-4, sy + 1.3 * L], bendR: 1, eR: [sx + 0.45 * L, sy + 0.8 * L] };
    case 'think': return { R: [r * 0.35, cy + r + 3], L: [sx * 0.3, sy + 1.05 * L], bendR: 1, eR: [sx + 0.45 * L, sy + 0.8 * L] };
    case 'cheer': return { R: [sx + 0.6 * L, sy - 1.6 * L], L: [-(sx + 0.6 * L), sy - 1.6 * L] };
    case 'shrug': return { R: [sx + 1.2 * L, sy + 0.55 * L], L: [-(sx + 1.2 * L), sy + 0.55 * L], bendR: -1, bendL: -1 };
    case 'cross': return { R: [-sx * 0.7, sy + 0.95 * L], L: [sx * 0.7, sy + 0.85 * L] };
    case 'phone': return { R: [r * 0.95, cy + 2], L: standL, eR: [sx + 0.8 * L, sy + 0.55 * L] };
    case 'comfort': return { R: [sx + 1.85 * L, sy + 0.25 * L], L: standL };
    case 'hug': return { R: [sx + 1.5 * L, sy + 0.7 * L], L: [sx + 1.0 * L, sy + 0.95 * L] };
    case 'facepalm': return { R: [r * 0.1, cy - r * 0.35], L: standL, bendR: 1, eR: [sx + 0.45 * L, sy + 0.8 * L] };
    case 'run': return { R: [sx + 0.9 * L, sy + 0.5 * L], L: [-(sx + 0.7 * L), sy + 1.4 * L] };
    case 'sit': return { R: [8, hipY - 3], L: [-6, hipY - 3] };
    case 'write': return { R: [sx * 0.6, sy + 1.3 * L], L: [-sx * 0.4, sy + 1.25 * L] };
    default: return { R: stand, L: standL };
  }
}

function elbow(s: Pt, h: Pt, len: number, bend: number): Pt {
  const dx = h[0] - s[0], dy = h[1] - s[1];
  const d = Math.max(1, Math.hypot(dx, dy));
  const half = Math.min(d / 2, len);
  const off = Math.sqrt(Math.max(0, len * len - half * half));
  const mx = s[0] + dx / 2, my = s[1] + dy / 2;
  // عمود بر خط شانه-دست؛ bend جهت خم شدن را انتخاب می‌کند
  const nx = (-dy / d) * bend, ny = (dx / d) * bend;
  return [mx + nx * off, my + ny * off];
}

function Arm({ s, h, len, bend, sleeve, skin, w, shortSleeve, e: forced }: { s: Pt; h: Pt; len: number; bend: number; sleeve: string; skin: string; w: number; shortSleeve?: boolean; e?: Pt }) {
  const e = forced || elbow(s, h, len, bend);
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M${s[0]},${s[1]} L${e[0]},${e[1]} L${h[0]},${h[1]}`} stroke={darken(sleeve, 0.25)} strokeWidth={w + 2} />
      {shortSleeve ? (
        <>
          <path d={`M${e[0]},${e[1]} L${h[0]},${h[1]}`} stroke={skin} strokeWidth={w} />
          <path d={`M${s[0]},${s[1]} L${e[0]},${e[1]}`} stroke={sleeve} strokeWidth={w} />
        </>
      ) : (
        <path d={`M${s[0]},${s[1]} L${e[0]},${e[1]} L${h[0]},${h[1]}`} stroke={sleeve} strokeWidth={w} />
      )}
      <circle cx={h[0]} cy={h[1]} r={w * 0.62} fill={skin} stroke={darken(skin, 0.2)} strokeWidth={1} />
    </g>
  );
}

function Face({ expr, r, cy, look }: { expr: Expression; r: number; cy: number; look: PersonLook }) {
  const ex = r * 0.36, ey = cy - r * 0.02, lookX = r * 0.08;
  const eye = (x: number, rr = r * 0.11) => <circle cx={x + lookX} cy={ey} r={rr} fill={INK} />;
  const arcUp = (x: number) => <path d={`M${x - r * 0.15 + lookX},${ey + 1} q${r * 0.15},${-r * 0.2} ${r * 0.3},0`} stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />;
  const arcDown = (x: number) => <path d={`M${x - r * 0.15 + lookX},${ey - 1} q${r * 0.15},${r * 0.2} ${r * 0.3},0`} stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />;
  const lid = (x: number) => (
    <g>
      <circle cx={x + lookX} cy={ey + 1} r={r * 0.1} fill={INK} />
      <path d={`M${x - r * 0.16 + lookX},${ey - 1} h${r * 0.32}`} stroke={darken(look.skin, 0.35)} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
  const brow = (x: number, tilt: number, lift = 0) => (
    <path d={`M${x - r * 0.17 + lookX},${ey - r * 0.3 - lift + tilt * (x > 0 ? 1 : -1)} L${x + r * 0.17 + lookX},${ey - r * 0.3 - lift - tilt * (x > 0 ? 1 : -1)}`} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
  );
  const my = cy + r * 0.45, mx = lookX;
  const mouth: Record<string, React.ReactNode> = {
    neutral: <path d={`M${mx - r * 0.18},${my} q${r * 0.18},${r * 0.08} ${r * 0.36},0`} stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />,
    happy: <path d={`M${mx - r * 0.28},${my - 2} q${r * 0.28},${r * 0.32} ${r * 0.56},0`} stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />,
    laugh: <path d={`M${mx - r * 0.3},${my - 3} q${r * 0.3},${r * 0.55} ${r * 0.6},0 z`} fill={INK} />,
    sad: <path d={`M${mx - r * 0.24},${my + 3} q${r * 0.24},${-r * 0.26} ${r * 0.48},0`} stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />,
    worried: <path d={`M${mx - r * 0.22},${my + 1} q${r * 0.11},${-r * 0.12} ${r * 0.22},0 t${r * 0.22},0`} stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />,
    angry: <path d={`M${mx - r * 0.24},${my + 2} q${r * 0.24},${-r * 0.18} ${r * 0.48},0`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />,
    surprised: <ellipse cx={mx} cy={my + 1} rx={r * 0.12} ry={r * 0.16} fill={INK} />,
    sick: <path d={`M${mx - r * 0.22},${my} q${r * 0.07},${-r * 0.1} ${r * 0.14},0 t${r * 0.14},0 t${r * 0.14},0`} stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />,
    tired: <path d={`M${mx - r * 0.16},${my + 1} h${r * 0.32}`} stroke={INK} strokeWidth={2} strokeLinecap="round" />,
    thinking: <path d={`M${mx - r * 0.1},${my + 1} q${r * 0.16},${-r * 0.06} ${r * 0.3},${-r * 0.06}`} stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />,
    scared: <path d={`M${mx - r * 0.2},${my + 2} q${r * 0.1},${-r * 0.2} ${r * 0.2},0 t${r * 0.2},0 v${r * 0.06} q${-r * 0.2},${r * 0.12} ${-r * 0.4},0 z`} fill={INK} />,
    love: <path d={`M${mx - r * 0.26},${my - 2} q${r * 0.26},${r * 0.3} ${r * 0.52},0`} stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />,
    sleepy: <circle cx={mx} cy={my + 1} r={r * 0.07} fill={INK} />,
  };
  const heart = (x: number) => <path transform={`translate(${x + lookX},${ey}) scale(${r / 40})`} d="M0,6 C-9,-2 -6,-9 0,-4 C6,-9 9,-2 0,6 z" fill="#E0533D" />;
  let eyes: React.ReactNode;
  let brows: React.ReactNode = null;
  switch (expr) {
    case 'laugh': eyes = <>{arcUp(-ex)}{arcUp(ex)}</>; break;
    case 'sleepy': eyes = <>{arcDown(-ex)}{arcDown(ex)}</>; break;
    case 'tired': case 'sick': eyes = <>{lid(-ex)}{lid(ex)}</>; break;
    case 'surprised': case 'scared': eyes = <>{eye(-ex, r * 0.15)}{eye(ex, r * 0.15)}</>; break;
    case 'love': eyes = <>{heart(-ex)}{heart(ex)}</>; break;
    case 'thinking': eyes = <><circle cx={-ex + lookX + 1} cy={ey - 2} r={r * 0.11} fill={INK} /><circle cx={ex + lookX + 1} cy={ey - 2} r={r * 0.11} fill={INK} /></>; break;
    default: eyes = <>{eye(-ex)}{eye(ex)}</>;
  }
  switch (expr) {
    case 'sad': case 'worried': case 'scared': brows = <>{brow(-ex, -2.2, 1)}{brow(ex, -2.2, 1)}</>; break;
    case 'angry': brows = <>{brow(-ex, 3, -1)}{brow(ex, 3, -1)}</>; break;
    case 'surprised': brows = <>{brow(-ex, 0, 4)}{brow(ex, 0, 4)}</>; break;
    case 'thinking': brows = <>{brow(-ex, 0, 0)}{brow(ex, -1.5, 3)}</>; break;
    default: brows = null;
  }
  const blush = ['happy', 'laugh', 'love'].includes(expr) || expr === 'sick';
  return (
    <g>
      {blush && (
        <g fill={expr === 'sick' ? '#9CC97A' : '#F28DB2'} opacity={expr === 'sick' ? 0.55 : 0.45}>
          <circle cx={-ex - 2 + lookX} cy={cy + r * 0.3} r={r * 0.16} />
          <circle cx={ex + 2 + lookX} cy={cy + r * 0.3} r={r * 0.16} />
        </g>
      )}
      {eyes}
      {brows}
      {mouth[expr] || mouth.neutral}
    </g>
  );
}

function HairBack({ look, r, cy }: { look: PersonLook; r: number; cy: number }) {
  const c = look.hair.color;
  switch (look.hair.style) {
    case 'long-straight': return <rect x={-r * 1.08} y={cy - r * 0.6} width={r * 2.16} height={r * 2.5} rx={r * 0.5} fill={c} />;
    case 'long-wavy': return <path d={`M${-r * 1.1},${cy - r * 0.4} q${-r * 0.3},${r} 0,${r * 1.2} q${-r * 0.2},${r * 0.6} ${r * 0.3},${r * 0.9} h${r * 1.6} q${r * 0.5},${-r * 0.3} ${r * 0.3},${-r * 0.9} q${r * 0.3},${-r * 0.2} 0,${-r * 1.2} z`} fill={c} />;
    case 'bob': return <rect x={-r * 1.12} y={cy - r * 0.6} width={r * 2.24} height={r * 1.55} rx={r * 0.55} fill={c} />;
    case 'shoulder': return <rect x={-r * 1.12} y={cy - r * 0.6} width={r * 2.24} height={r * 1.95} rx={r * 0.5} fill={c} />;
    case 'ponytail': return <ellipse cx={-r * 1.05} cy={cy + r * 0.25} rx={r * 0.32} ry={r * 0.75} fill={c} transform={`rotate(18 ${-r * 1.05} ${cy + r * 0.25})`} />;
    case 'bun': return <circle cx={-r * 0.15} cy={cy - r * 1.0} r={r * 0.45} fill={c} />;
    case 'pigtails': return (
      <g fill={c}>
        <circle cx={-r * 1.15} cy={cy + r * 0.1} r={r * 0.42} />
        <circle cx={r * 1.15} cy={cy + r * 0.1} r={r * 0.42} />
      </g>
    );
    default: return null;
  }
}

function HairFront({ look, r, cy }: { look: PersonLook; r: number; cy: number }) {
  const c = look.hair.color;
  const cap = `M${-r * 1.02},${cy - r * 0.05} A${r},${r} 0 0 1 ${r * 1.02},${cy - r * 0.05}`;
  switch (look.hair.style) {
    case 'none': return look.age === 'baby' ? <path d={`M0,${cy - r} q${r * 0.3},${-r * 0.3} ${r * 0.1},${-r * 0.5}`} stroke={c} strokeWidth={2} fill="none" /> : null;
    case 'bald-sides': return (
      <g fill={c}>
        <ellipse cx={-r * 0.92} cy={cy - r * 0.05} rx={r * 0.18} ry={r * 0.35} />
        <ellipse cx={r * 0.92} cy={cy - r * 0.05} rx={r * 0.18} ry={r * 0.35} />
      </g>
    );
    case 'curly-up': return (
      <g fill={c}>
        <path d={`${cap} q${-r * 0.2},${-r * 0.4} ${-r * 1.02},${-r * 0.45} q${-r * 0.8},0 ${-r * 1.02},${r * 0.45} z`} />
        {[-0.6, -0.2, 0.2, 0.6].map((k) => <circle key={k} cx={k * r} cy={cy - r * 1.05} r={r * 0.32} />)}
        <circle cx={0} cy={cy - r * 1.35} r={r * 0.36} />
      </g>
    );
    case 'messy': return (
      <path fill={c} d={`M${-r * 1.02},${cy - r * 0.1} A${r},${r} 0 0 1 ${r * 1.02},${cy - r * 0.1} l${-r * 0.15},${r * 0.1} l${-r * 0.2},${-r * 0.25} l${-r * 0.25},${r * 0.2} l${-r * 0.25},${-r * 0.22} l${-r * 0.3},${r * 0.24} l${-r * 0.3},${-r * 0.2} l${-r * 0.25},${r * 0.22} z`} />
    );
    case 'pixie': return <path fill={c} d={`${cap} q${-r * 0.5},${-r * 0.25} ${-r * 1.0},${-r * 0.15} q${-r * 0.6},${r * 0.05} ${-r * 1.04},${r * 0.35} z`} />;
    default: {
      // short / neat / bob / long / ponytail / bun / shoulder / pigtails: کلاه موی ساده با چتری کوچک
      const fringe = look.hair.style === 'neat'
        ? `q${-r * 0.4},${-r * 0.5} ${-r * 1.2},${-r * 0.35} q${-r * 0.5},${r * 0.1} ${-r * 0.84},${r * 0.4}`
        : `q${-r * 0.6},${-r * 0.35} ${-r * 1.02},${-r * 0.3} q${-r * 0.6},${0} ${-r * 1.02},${r * 0.3}`;
      return <path fill={c} d={`${cap} ${fringe} z`} />;
    }
  }
}

function HatShape({ hat, r, cy }: { hat: NonNullable<PersonLook['hat']>; r: number; cy: number }) {
  const top = cy - r;
  switch (hat) {
    case 'flat-cap': return <path d={`M${-r * 0.95},${cy - r * 0.35} q0,${-r * 0.8} ${r},${-r * 0.75} q${r * 0.9},0 ${r * 1.0},${r * 0.55} l${r * 0.55},${r * 0.15} q${-r * 0.4},${r * 0.12} ${-r * 0.6},${r * 0.05} z`} fill="#6B5A4A" />;
    case 'sun-hat': return (
      <g>
        <ellipse cx={0} cy={cy - r * 0.55} rx={r * 1.75} ry={r * 0.3} fill="#E8C77E" />
        <path d={`M${-r * 0.8},${cy - r * 0.6} q0,${-r * 0.85} ${r * 0.8},${-r * 0.85} q${r * 0.8},0 ${r * 0.8},${r * 0.85} z`} fill="#E8C77E" />
        <rect x={-r * 0.8} y={cy - r * 0.8} width={r * 1.6} height={r * 0.18} fill="#E0533D" />
      </g>
    );
    case 'chef': return (
      <g fill="#FFFFFF" stroke="#D9DDE6" strokeWidth={1}>
        <rect x={-r * 0.7} y={top - r * 0.5} width={r * 1.4} height={r * 0.75} />
        <circle cx={-r * 0.5} cy={top - r * 0.75} r={r * 0.45} />
        <circle cx={r * 0.5} cy={top - r * 0.75} r={r * 0.45} />
        <circle cx={0} cy={top - r * 1.0} r={r * 0.55} />
      </g>
    );
    case 'police': return (
      <g>
        <path d={`M${-r * 0.95},${cy - r * 0.4} q0,${-r * 0.75} ${r * 0.95},${-r * 0.75} q${r * 0.95},0 ${r * 0.95},${r * 0.75} z`} fill="#1D2B5E" />
        <path d={`M${-r * 0.2},${cy - r * 0.42} h${r * 1.4} l${-r * 0.2},${r * 0.2} h${-r * 1.1} z`} fill="#15204A" />
        <circle cx={0} cy={cy - r * 0.8} r={r * 0.16} fill="#F5B52E" />
      </g>
    );
    case 'nurse': return (
      <g>
        <path d={`M${-r * 0.6},${cy - r * 0.75} h${r * 1.2} l${-r * 0.15},${-r * 0.4} h${-r * 0.9} z`} fill="#FFFFFF" stroke="#D9DDE6" />
        <path d={`M0,${cy - r * 1.05} v${r * 0.22} M${-r * 0.11},${cy - r * 0.94} h${r * 0.22}`} stroke="#E0533D" strokeWidth={2} />
      </g>
    );
    case 'hard-hat': return (
      <g fill="#F5B52E">
        <path d={`M${-r * 0.9},${cy - r * 0.45} q0,${-r * 0.85} ${r * 0.9},${-r * 0.85} q${r * 0.9},0 ${r * 0.9},${r * 0.85} z`} />
        <rect x={-r * 1.15} y={cy - r * 0.5} width={r * 2.3} height={r * 0.16} rx={2} />
        <rect x={-r * 0.12} y={cy - r * 1.25} width={r * 0.24} height={r * 0.75} fill="#E0A41F" />
      </g>
    );
    case 'pilot': return (
      <g>
        <path d={`M${-r * 0.95},${cy - r * 0.45} q0,${-r * 0.7} ${r * 0.95},${-r * 0.7} q${r * 0.95},0 ${r * 0.95},${r * 0.7} z`} fill="#1D2B5E" />
        <path d={`M${-r * 0.1},${cy - r * 0.47} h${r * 1.2} l${-r * 0.2},${r * 0.18} h${-r * 0.9} z`} fill="#15204A" />
        <rect x={-r * 0.3} y={cy - r * 0.85} width={r * 0.6} height={r * 0.14} fill="#F5B52E" />
      </g>
    );
    case 'fire': return (
      <g fill="#C8392B">
        <path d={`M${-r * 0.95},${cy - r * 0.4} q0,${-r * 0.9} ${r * 0.95},${-r * 0.9} q${r * 0.95},0 ${r * 0.95},${r * 0.9} z`} />
        <path d={`M${-r * 1.3},${cy - r * 0.45} h${r * 2.4} l${-r * 0.1},${r * 0.2} h${-r * 2.2} z`} />
        <rect x={-r * 0.18} y={cy - r * 1.05} width={r * 0.36} height={r * 0.4} fill="#F5B52E" />
      </g>
    );
    case 'cap': return (
      <g fill="#2347C5">
        <path d={`M${-r * 0.95},${cy - r * 0.4} q0,${-r * 0.8} ${r * 0.95},${-r * 0.8} q${r * 0.95},0 ${r * 0.95},${r * 0.8} z`} />
        <path d={`M${r * 0.3},${cy - r * 0.45} h${r * 1.1} q${r * 0.1},${r * 0.15} ${-r * 0.1},${r * 0.2} h${-r * 1.0} z`} />
      </g>
    );
    case 'graduation': return (
      <g fill="#15204A">
        <path d={`M${-r * 1.3},${cy - r * 1.05} L0,${cy - r * 1.45} L${r * 1.3},${cy - r * 1.05} L0,${cy - r * 0.7} z`} />
        <rect x={-r * 0.65} y={cy - r * 1.0} width={r * 1.3} height={r * 0.4} />
        <path d={`M${r * 1.2},${cy - r * 1.05} v${r * 0.7}`} stroke="#F5B52E" strokeWidth={2} />
      </g>
    );
    default: return null;
  }
}

export interface PersonProps {
  look: PersonLook;
  expression?: Expression;
  pose?: Pose;
  facing?: 'left' | 'right';
  x?: number;
  y?: number;
  scale?: number;
  /** شیئی که در دست است؛ در جای دست راست کشیده می‌شود */
  held?: React.ReactNode;
}

/** نقطهٔ سر و دست‌ها، برای اینکه صحنه اثرها (سرفه، عرق…) را درست جای بدهد */
export function personAnchors(look: PersonLook, pose: Pose = 'stand') {
  const g = geometry(look, pose);
  const t = handTargets(pose, g);
  return { head: [0, g.cy] as Pt, headR: g.r, mouth: [g.r * 0.3, g.cy + g.r * 0.45] as Pt, top: g.cy - g.r, handR: t.R, chest: [0, g.sy + 10] as Pt };
}

export default function Person({ look, expression = 'neutral', pose = 'stand', facing = 'right', x = 0, y = 0, scale = 1, held }: PersonProps) {
  const g = geometry(look, pose);
  const { r, cy, sy, hipY, sx, L, tw, arm } = g;
  const skin = look.skin;
  const top = look.top.color;
  const kind = look.top.kind || 'shirt';
  const pants = look.bottom || '#1D2B5E';
  const shoe = '#2A2F45';
  const t = handTargets(pose, g);
  const flip = facing === 'left' ? -1 : 1;
  const sleeve = kind === 'vest' ? '#FFFFFF' : top;
  const short = kind === 'tshirt' || kind === 'jersey' || kind === 'polo' || kind === 'dress';
  const legW = tw * 0.36;

  if (look.age === 'baby') {
    return (
      <g transform={`translate(${x},${y}) scale(${scale * flip},${scale})`}>
        <ellipse cx={0} cy={-18} rx={20} ry={18} fill={top} stroke={darken(top)} strokeWidth={1.5} />
        <ellipse cx={0} cy={-6} rx={14} ry={7} fill="#FFFFFF" />
        <circle cx={-16} cy={-22} r={5} fill={skin} />
        <circle cx={16} cy={-22} r={5} fill={skin} />
        <circle cx={0} cy={-46} r={r} fill={skin} stroke={darken(skin, 0.15)} strokeWidth={1.2} />
        <HairFront look={look} r={r} cy={-46} />
        <Face expr={expression} r={r} cy={-46} look={look} />
      </g>
    );
  }

  // پاها
  let legs: React.ReactNode;
  if (pose === 'sit') {
    const thigh = g.H * 0.24;
    legs = (
      <g>
        <rect x={-legW * 0.2} y={hipY - legW * 0.5} width={thigh} height={legW} rx={legW / 2} fill={pants} />
        <rect x={thigh - legW * 0.9} y={hipY - 2} width={legW} height={-hipY - 4} rx={legW / 2} fill={pants} />
        <ellipse cx={thigh - legW * 0.2} cy={-3} rx={legW * 0.75} ry={4} fill={shoe} />
      </g>
    );
  } else if (pose === 'run') {
    legs = (
      <g strokeLinecap="round" fill="none">
        <path d={`M${-legW * 0.5},${hipY} L${-legW * 1.6},${hipY * 0.45} L${-legW * 2.2},-4`} stroke={pants} strokeWidth={legW} />
        <path d={`M${legW * 0.5},${hipY} L${legW * 1.8},${hipY * 0.5} L${legW * 1.3},-3`} stroke={pants} strokeWidth={legW} />
        <ellipse cx={-legW * 2.2} cy={-3} rx={legW * 0.7} ry={4} fill={shoe} />
        <ellipse cx={legW * 1.6} cy={-3} rx={legW * 0.7} ry={4} fill={shoe} />
      </g>
    );
  } else {
    const legColor = kind === 'dress' ? skin : pants;
    legs = (
      <g>
        <rect x={-legW - 1} y={hipY - 4} width={legW} height={-hipY + 1} rx={legW / 2.4} fill={legColor} />
        <rect x={1} y={hipY - 4} width={legW} height={-hipY + 1} rx={legW / 2.4} fill={legColor} />
        <ellipse cx={-legW / 2 - 1 + 2} cy={-2.5} rx={legW * 0.75} ry={4} fill={shoe} />
        <ellipse cx={legW / 2 + 1 + 2} cy={-2.5} rx={legW * 0.75} ry={4} fill={shoe} />
      </g>
    );
  }

  // تنه
  const torsoBottom = kind === 'coat' ? hipY + (-hipY) * 0.45 : kind === 'dress' ? hipY + (-hipY) * 0.5 : hipY + 4;
  const torsoPath = kind === 'dress'
    ? `M${-tw / 2 + 2},${sy - 2} h${tw - 4} q4,2 4,8 l${tw * 0.25},${torsoBottom - sy - 6} h${-tw * 1.5 - 4} l${tw * 0.25},${-(torsoBottom - sy - 6)} q0,-6 4,-8 z`
    : `M${-tw / 2},${sy + 6} q0,-8 8,-8 h${tw - 16} q8,0 8,8 V${torsoBottom - 4} q0,4 -4,4 h${-tw + 8} q-4,0 -4,-4 z`;

  const behindArm = pose === 'hug' || pose === 'comfort';
  const armR = <Arm s={[sx, sy + 2]} h={t.R} len={L} bend={t.bendR ?? 1} sleeve={sleeve} skin={skin} w={arm} shortSleeve={short} e={t.eR} />;
  const armL = <Arm s={[-sx, sy + 2]} h={t.L} len={L} bend={t.bendL ?? -1} sleeve={sleeve} skin={skin} w={arm} shortSleeve={short} e={t.eL} />;

  // نشستن: یک چهارپایهٔ ساده زیر آدم
  const seat = pose === 'sit' ? (
    <g stroke={INK} strokeWidth={1.4}>
      <rect x={-tw * 0.7} y={hipY + legW * 0.5} width={tw * 1.5} height={6} rx={2} fill="#8A5A3B" />
      <path d={`M${-tw * 0.55},${hipY + legW * 0.5 + 6} V0 M${tw * 0.65},${hipY + legW * 0.5 + 6} V0`} strokeWidth={3.5} />
    </g>
  ) : null;

  return (
    <g transform={`translate(${x},${y}) scale(${scale * flip},${scale})`}>
      {seat}
      <HairBack look={look} r={r} cy={cy} />
      {behindArm && armL}
      {legs}
      <path d={torsoPath} fill={top} stroke={darken(top)} strokeWidth={1.5} />
      {/* جزئیات لباس */}
      {kind === 'vest' && <path d={`M${-tw / 2 + 3},${sy} L0,${sy + 16} L${tw / 2 - 3},${sy} V${hipY} H${-tw / 2 + 3} z`} fill={top} stroke={darken(top)} strokeWidth={1} />}
      {kind === 'vest' && <path d={`M-5,${sy - 1} L0,${sy + 14} L5,${sy - 1} z`} fill="#FFFFFF" />}
      {(kind === 'cardigan' || kind === 'coat') && <path d={`M0,${sy + 4} V${torsoBottom - 2}`} stroke={darken(top, 0.3)} strokeWidth={1.5} />}
      {kind === 'cardigan' && [0, 1, 2].map((i) => <circle key={i} cx={2.5} cy={sy + 12 + i * 10} r={1.4} fill={darken(top, 0.4)} />)}
      {kind === 'blazer' && <path d={`M${-tw / 2 + 4},${sy} L-2,${sy + 20} L-6,${sy} z M${tw / 2 - 4},${sy} L2,${sy + 20} L6,${sy} z`} fill={darken(top, 0.3)} />}
      {kind === 'blazer' && <path d={`M-6,${sy - 1} L0,${sy + 18} L6,${sy - 1} z`} fill="#FFFFFF" />}
      {(kind === 'shirt' || kind === 'polo' || kind === 'uniform') && <path d={`M-7,${sy - 2} L0,${sy + 6} L7,${sy - 2}`} fill="none" stroke={darken(top, 0.3)} strokeWidth={1.6} />}
      {kind === 'uniform' && <rect x={tw / 2 - 12} y={sy + 10} width={7} height={6} rx={1} fill="none" stroke={darken(top, 0.3)} />}
      {kind === 'hoodie' && <path d={`M${-tw / 2 + 4},${sy - 1} q${tw / 2 - 4},12 ${tw - 8},0`} fill="none" stroke={darken(top, 0.3)} strokeWidth={3} />}
      {kind === 'hoodie' && <rect x={-tw / 4} y={hipY - 16} width={tw / 2} height={9} rx={3} fill={darken(top, 0.12)} />}
      {kind === 'jersey' && <rect x={-tw / 2} y={sy + 14} width={tw} height={5} fill="#FFFFFF" opacity={0.85} />}
      {kind === 'sweater' && <path d={`M${-tw / 2},${torsoBottom - 6} h${tw}`} stroke={darken(top, 0.25)} strokeWidth={3} />}
      {look.apron && <path d={`M${-tw / 2 + 5},${sy + 14} h${tw - 10} V${hipY + (-hipY) * 0.4} q0,3 -3,3 h${-tw + 16} q-3,0 -3,-3 z`} fill={look.apron} stroke={darken(look.apron)} strokeWidth={1} />}
      {look.extra?.includes('tie') && <path d={`M-2.5,${sy} h5 l1.5,4 l-2.5,16 l-1.5,2 l-1.5,-2 l-2.5,-16 z`} fill="#E0533D" />}
      {look.extra?.includes('badge') && <circle cx={-tw / 2 + 8} cy={sy + 12} r={3} fill="#F5B52E" stroke="#C48A12" />}
      {look.extra?.includes('dino') && <g><circle cx={0} cy={sy + 18} r={6} fill="#2F7A3B" /><circle cx={2} cy={sy + 16} r={1.2} fill="#FFFFFF" /></g>}
      {look.extra?.includes('camera') && <g><path d={`M${-tw / 2 + 3},${sy} L2,${sy + 20} L${tw / 2 - 3},${sy}`} fill="none" stroke="#15204A" strokeWidth={1.5} /><rect x={-6} y={sy + 17} width={14} height={10} rx={2} fill="#15204A" /><circle cx={1} cy={sy + 22} r={3} fill="#8FA6EE" /></g>}
      {!behindArm && armL}
      {/* گردن و سر */}
      <rect x={-4} y={cy + r - 4} width={8} height={9} fill={darken(skin, 0.08)} />
      {look.scarf && <g><rect x={-tw / 2 + 4} y={sy - 4} width={tw - 8} height={7} rx={3.5} fill={look.scarf} /><rect x={-tw / 2 + 8} y={sy} width={6} height={16} rx={3} fill={look.scarf} /></g>}
      {look.extra?.includes('headset') && <path d={`M${-r * 0.8},${sy - 2} q${r * 0.8},${r * 0.9} ${r * 1.6},0`} fill="none" stroke="#15204A" strokeWidth={3} />}
      {look.extra?.includes('headphones') && <path d={`M${-r * 0.85},${sy - 3} q${r * 0.85},${r * 0.8} ${r * 1.7},0`} fill="none" stroke="#2347C5" strokeWidth={4} />}
      {look.extra?.includes('stethoscope') && <g fill="none" stroke="#15204A" strokeWidth={1.8}><path d={`M${-tw / 2 + 6},${sy} q-2,18 8,22 q10,-4 8,-22`} /><circle cx={2} cy={sy + 24} r={3} fill="#9AA3B5" /></g>}
      <circle cx={0} cy={cy} r={r} fill={skin} stroke={darken(skin, 0.15)} strokeWidth={1.2} />
      <ellipse cx={-r * 0.98} cy={cy + 2} rx={r * 0.16} ry={r * 0.24} fill={skin} stroke={darken(skin, 0.15)} strokeWidth={1} />
      <HairFront look={look} r={r} cy={cy} />
      {look.beard === 'full' && <path d={`M${-r * 0.9},${cy + r * 0.05} q0,${r * 1.05} ${r * 0.9},${r * 1.05} q${r * 0.9},0 ${r * 0.9},${-r * 1.05} q${-r * 0.4},${r * 0.35} ${-r * 0.9},${r * 0.3} q${-r * 0.5},0 ${-r * 0.9},${-r * 0.3} z`} fill={look.hair.color} />}
      {look.beard === 'short' && <path d={`M${-r * 0.8},${cy + r * 0.25} q0,${r * 0.8} ${r * 0.8},${r * 0.8} q${r * 0.8},0 ${r * 0.8},${-r * 0.8} q${-r * 0.4},${r * 0.3} ${-r * 0.8},${r * 0.28} q${-r * 0.4},0 ${-r * 0.8},${-r * 0.28} z`} fill={look.hair.color === '#F1F1F4' ? '#E4E4EA' : look.hair.color} />}
      <Face expr={expression} r={r} cy={cy} look={look} />
      {look.beard === 'mustache' && <path d={`M${r * 0.08 - r * 0.32},${cy + r * 0.36} q${r * 0.32},${-r * 0.16} ${r * 0.64},0 q${-r * 0.32},${r * 0.12} ${-r * 0.64},0 z`} fill={look.hair.color} />}
      {look.glasses && (
        <g fill="none" stroke="#15204A" strokeWidth={1.6}>
          {look.glasses === 'round'
            ? <><circle cx={-r * 0.36 + r * 0.08} cy={cy - r * 0.02} r={r * 0.24} /><circle cx={r * 0.36 + r * 0.08} cy={cy - r * 0.02} r={r * 0.24} /></>
            : <><rect x={-r * 0.62 + r * 0.08} y={cy - r * 0.2} width={r * 0.5} height={r * 0.34} rx={2} /><rect x={r * 0.12 + r * 0.08} y={cy - r * 0.2} width={r * 0.5} height={r * 0.34} rx={2} /></>}
          <path d={`M${-r * 0.12 + r * 0.08},${cy - r * 0.04} h${r * 0.24}`} />
        </g>
      )}
      {look.hat && <HatShape hat={look.hat} r={r} cy={cy} />}
      {held && <g transform={`translate(${t.R[0]},${t.R[1]})`}>{held}</g>}
      {!behindArm && armR}
      {behindArm && armR}
    </g>
  );
}
