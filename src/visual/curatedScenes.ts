import type { SceneSpec } from './types';

/**
 * صحنه‌های دست‌نوشته. کلید: جملهٔ انگلیسی کارت (حروف کوچک، بدون نشانه‌گذاری آخر).
 * این‌ها بر صحنه‌های خودکار مقدم‌اند. برای اضافه کردن، فقط یک ردیف بنویس:
 *   'جملهٔ انگلیسی': { place, actors: [...], props, effects, caption }
 */
export const CURATED: Record<string, SceneSpec> = {
  // مثال مریم: «بیا بریم دکتر؟» — دایی به بابابزرگ که سرفه می‌کند می‌گوید
  "let's go to the doctor": {
    caption: 'دایی نگران بابابزرگ است که سرفه می‌کند',
    place: 'home',
    actors: [
      { who: 'omid', x: 140, facing: 'right', expression: 'worried', pose: 'comfort', speaking: true },
      { who: 'yusuf', x: 268, facing: 'left', expression: 'sick', pose: 'cough' },
    ],
    effects: [{ id: 'cough', on: 1 }, { id: 'sweat', on: 0 }],
  },
  'shall we go to the doctor': {
    caption: 'دایی نگران بابابزرگ است که سرفه می‌کند',
    place: 'home',
    actors: [
      { who: 'omid', x: 140, facing: 'right', expression: 'worried', pose: 'comfort', speaking: true },
      { who: 'yusuf', x: 268, facing: 'left', expression: 'sick', pose: 'cough' },
    ],
    effects: [{ id: 'cough', on: 1 }, { id: 'sweat', on: 0 }],
  },
  "i'm locked out": {
    caption: 'اوا جلوی در خانه مانده و کلید ندارد',
    place: 'outside',
    actors: [{ who: 'eva', x: 170, facing: 'right', expression: 'worried', pose: 'facepalm', speaking: true }, { who: 'biscuit', x: 240, facing: 'left' }],
    props: [{ id: 'key', x: 300, y: 200, scale: 1.2 }],
    effects: [{ id: 'sweat', on: 0 }, { id: 'question', x: 310, y: 170 }],
  },
  'my key is still inside': {
    caption: 'اوا جلوی در خانه مانده و کلید ندارد',
    place: 'outside',
    actors: [{ who: 'eva', x: 170, facing: 'right', expression: 'worried', pose: 'facepalm', speaking: true }],
    effects: [{ id: 'sweat', on: 0 }],
  },
  'i was charged twice': {
    caption: 'سام با رسید در دست، کنار باجهٔ بانک، ناراحت است',
    place: 'bank',
    actors: [{ who: 'sam', x: 140, facing: 'right', expression: 'angry', pose: 'hold', holds: 'receipt', speaking: true }, { who: 'nora', x: 270, facing: 'left', expression: 'worried', pose: 'stand' }],
    effects: [{ id: 'money', on: 0 }, { id: 'anger', on: 0 }],
  },
  'the washing machine isn\'t working': {
    caption: 'لیلا کنار ماشین لباس‌شویی خراب به کیم زنگ زده',
    place: 'kitchen',
    actors: [{ who: 'leila', x: 140, facing: 'right', expression: 'worried', pose: 'phone', holds: 'phone', speaking: true }],
    props: [{ id: 'washing-machine', x: 270, y: 200, scale: 1.8 }],
    effects: [{ id: 'sweat', on: 0 }, { id: 'exclaim', x: 270, y: 140 }],
  },
  'could you lend me your pen': {
    caption: 'نیکا سر کلاس از رایان خودکار قرض می‌گیرد',
    place: 'school',
    actors: [{ who: 'nika', x: 140, facing: 'right', expression: 'happy', pose: 'point', speaking: true }, { who: 'ryan', x: 265, facing: 'left', expression: 'neutral', pose: 'hold', holds: 'pen' }],
  },
  'i missed the bus': {
    caption: 'آدم دوان‌دوان رسیده ولی اتوبوس رفته',
    place: 'street',
    actors: [{ who: 'adam', x: 130, facing: 'right', expression: 'sad', pose: 'run', speaking: true }],
    props: [{ id: 'bus', x: 340, y: 205, scale: 1.6 }],
    effects: [{ id: 'clock', on: 0 }, { id: 'sweat', on: 0 }],
  },
  'it’s been raining since monday': {
    caption: 'اوا زیر باران با چتر، خسته از هوای چند روزه',
    place: 'street',
    actors: [{ who: 'eva', x: 180, facing: 'right', expression: 'tired', holds: 'umbrella', speaking: true }, { who: 'biscuit', x: 250, facing: 'left' }],
    effects: [{ id: 'rain' }],
  },
  'i have a dentist appointment': {
    caption: 'تونی دستش را روی صورتش گذاشته و دندانش درد می‌کند',
    place: 'doctor',
    actors: [{ who: 'tony', x: 140, facing: 'right', expression: 'sick', pose: 'facepalm', speaking: true }, { who: 'job:doctor', x: 270, facing: 'left', expression: 'happy', pose: 'point' }],
  },
  'happy birthday': {
    caption: 'تولد میا با کیک و هدیهٔ مادربزرگ',
    place: 'home',
    actors: [{ who: 'rosa', x: 140, facing: 'right', expression: 'love', pose: 'hold', holds: 'gift', speaking: true }, { who: 'mia', x: 265, facing: 'left', expression: 'laugh', pose: 'cheer' }],
    props: [{ id: 'cake', x: 205, y: 205, scale: 1.3 }],
    effects: [{ id: 'sparkle', on: 1 }],
  },
  "don't worry, you've got this": {
    caption: 'لیلا به رونا قبل از مسابقه دلگرمی می‌دهد',
    place: 'park',
    actors: [{ who: 'leila', x: 140, facing: 'right', expression: 'happy', pose: 'comfort', speaking: true }, { who: 'rona', x: 262, facing: 'left', expression: 'worried', pose: 'hold', holds: 'ball' }],
    effects: [{ id: 'sweat', on: 1 }],
  },
};

export function curatedFor(en: string): SceneSpec | undefined {
  const k = en.toLowerCase().replace(/[’`]/g, "'").replace(/[.!?¿¡]+$/g, '').replace(/\s+/g, ' ').trim();
  return CURATED[k] || CURATED[k.replace(/'/g, '’')];
}
