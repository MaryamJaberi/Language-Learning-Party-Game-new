/**
 * دنیای تصویری «دور»: تکه‌هایی که با کد کشیده می‌شوند و کنار هم صحنه می‌سازند.
 * همهٔ اندازه‌ها در یک صحنهٔ ۴۰۰×۲۶۰ است؛ آدم‌ها از کف پا (y = خط زمین) کشیده می‌شوند.
 */

export type Expression =
  | 'neutral' | 'happy' | 'laugh' | 'sad' | 'worried' | 'angry' | 'surprised'
  | 'sick' | 'tired' | 'thinking' | 'scared' | 'love' | 'sleepy';

export type Pose =
  | 'stand' | 'wave' | 'point' | 'hold' | 'cough' | 'think' | 'cheer' | 'shrug'
  | 'cross' | 'phone' | 'comfort' | 'hug' | 'facepalm' | 'run' | 'sit' | 'eat' | 'write';

export type Age = 'baby' | 'child' | 'teen' | 'adult' | 'elder';

export type HairStyle =
  | 'bun' | 'short' | 'bob' | 'curly-up' | 'ponytail' | 'long-straight' | 'long-wavy'
  | 'pixie' | 'messy' | 'pigtails' | 'neat' | 'bald-sides' | 'shoulder' | 'none';

export type Hat = 'flat-cap' | 'sun-hat' | 'chef' | 'police' | 'nurse' | 'hard-hat' | 'pilot' | 'fire' | 'cap' | 'graduation';

export interface PersonLook {
  age: Age;
  skin: string;
  hair: { style: HairStyle; color: string };
  beard?: 'short' | 'full' | 'mustache' | 'stubble';
  glasses?: 'round' | 'rect';
  hat?: Hat;
  top: { color: string; kind?: 'shirt' | 'cardigan' | 'blazer' | 'hoodie' | 'jersey' | 'dress' | 'tshirt' | 'coat' | 'vest' | 'uniform' | 'sweater' | 'polo' };
  bottom?: string;
  scarf?: string;
  apron?: string;
  extra?: Array<'headset' | 'camera' | 'headphones' | 'stethoscope' | 'tie' | 'badge' | 'dino'>;
  /** برای آدم‌های بلند/کوتاه */
  heightScale?: number;
  feminine?: boolean;
}

export interface Actor {
  /** شناسهٔ شخصیت فامیل (rosa، yusuf…) یا شغل (job:doctor) */
  who: string;
  expression?: Expression;
  pose?: Pose;
  /** مرکز افقی در صحنه (۰ تا ۴۰۰) */
  x: number;
  /** رو به کدام طرف */
  facing?: 'left' | 'right';
  /** نشانهٔ «دارد حرف می‌زند» */
  speaking?: boolean;
  /** شیئی که در دست دارد */
  holds?: string;
  /** اندازه (پیش‌فرض ۱) */
  scale?: number;
}

export interface PropPlacement {
  id: string;
  x: number;
  y: number;
  scale?: number;
}

export type Effect =
  | 'cough' | 'sweat' | 'hearts' | 'zzz' | 'question' | 'exclaim' | 'rain' | 'snow' | 'music'
  | 'steam' | 'tears' | 'anger' | 'sparkle' | 'idea' | 'clock' | 'hungry' | 'cold' | 'hot' | 'money' | 'phone-ring';

export interface EffectPlacement {
  id: Effect;
  /** روی کدام بازیگر (شمارهٔ بازیگر) یا در کل صحنه */
  on?: number;
  x?: number;
  y?: number;
}

export interface SceneSpec {
  place: string;
  /** شب یا روز */
  time?: 'day' | 'night';
  actors: Actor[];
  props?: PropPlacement[];
  effects?: EffectPlacement[];
  /** توضیح کوتاه به فارسی، برای بازبینی و دسترس‌پذیری (alt) */
  caption?: string;
}
