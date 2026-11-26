import type { PersonLook } from './types';

/** رنگ‌های پوست، مو و لباس — همان پالت کارت‌ها: لاجوردی، زعفرانی، فیروزه‌ای روی کرم */
export const SKIN = {
  light: '#F6D7C3',
  fair: '#EFC7A6',
  medium: '#D9A47A',
  olive: '#C68C5F',
  tan: '#A86E45',
  deep: '#7A4A2B',
};
export const HAIR = {
  black: '#1E1B24',
  dark: '#3B2A22',
  brown: '#6B4429',
  blonde: '#E2B85C',
  grey: '#A9A9B2',
  silver: '#D3D3DA',
  white: '#F1F1F4',
  ginger: '#C8642B',
};
export const C = {
  lapis: '#2347C5',
  lapisSoft: '#8FA6EE',
  saffron: '#F5B52E',
  turq: '#12B5A4',
  cream: '#FBF4E6',
  ink: '#15204A',
  red: '#E0533D',
  green: '#4BA35A',
  beige: '#D9C3A0',
  grey: '#9AA3B5',
  white: '#FFFFFF',
  pink: '#F28DB2',
  purple: '#8D6BD1',
  brown: '#8A5A3B',
  navy: '#1D2B5E',
};

/**
 * فامیل بزرگ «دور» — همان شخصیت‌های scripts/card-images/build_plan.py، این بار با کد کشیده می‌شوند.
 */
export const FAMILY: Record<string, PersonLook & { name: string; fa: string; desc: string }> = {
  rosa: { name: 'Rosa', fa: 'رزا', desc: 'مادربزرگ برزیلی، ۷۲ ساله', age: 'elder', feminine: true, skin: SKIN.fair, hair: { style: 'bun', color: HAIR.silver }, glasses: 'round', top: { color: C.saffron, kind: 'cardigan' }, bottom: C.navy, scarf: C.pink },
  yusuf: { name: 'Yusuf', fa: 'یوسف', desc: 'پدربزرگ ایرانی، ۷۵ ساله', age: 'elder', skin: SKIN.olive, hair: { style: 'bald-sides', color: HAIR.white }, beard: 'short', hat: 'flat-cap', top: { color: C.brown, kind: 'vest' }, bottom: C.grey },
  marta: { name: 'Marta', fa: 'مارتا', desc: 'خانم ماجراجوی برزیلی، ۶۸ ساله', age: 'elder', feminine: true, skin: SKIN.medium, hair: { style: 'bob', color: HAIR.grey }, hat: 'sun-hat', top: { color: C.turq, kind: 'shirt' }, bottom: C.navy, scarf: C.red },
  zara: { name: 'Zara', fa: 'زارا', desc: 'صاحب کافه، ۵۲ ساله', age: 'adult', feminine: true, skin: SKIN.medium, hair: { style: 'curly-up', color: HAIR.dark }, top: { color: C.lapis, kind: 'shirt' }, apron: C.saffron, bottom: C.ink },
  omid: { name: 'Omid', fa: 'امید', desc: 'مرد شوخ افغان، ۵۵ ساله', age: 'adult', skin: SKIN.tan, hair: { style: 'short', color: HAIR.dark }, beard: 'mustache', top: { color: C.lapisSoft, kind: 'polo' }, bottom: C.ink },
  sam: { name: 'Sam', fa: 'سام', desc: 'مهندس، ۴۸ ساله', age: 'adult', skin: SKIN.medium, hair: { style: 'neat', color: HAIR.dark }, glasses: 'rect', top: { color: C.white, kind: 'shirt' }, bottom: C.navy },
  leila: { name: 'Leila', fa: 'لیلا', desc: 'زن مهربان مراکشی، ۴۵ ساله', age: 'adult', feminine: true, skin: SKIN.olive, hair: { style: 'ponytail', color: HAIR.black }, top: { color: C.turq, kind: 'shirt' }, bottom: C.navy },
  dani: { name: 'Dani', fa: 'دانی', desc: 'آشپز، ۴۲ ساله', age: 'adult', skin: SKIN.medium, hair: { style: 'messy', color: HAIR.dark }, top: { color: C.white, kind: 'uniform' }, bottom: C.ink },
  eva: { name: 'Eva', fa: 'اوا', desc: 'زن قدبلند هلندی، ۴۰ ساله', age: 'adult', feminine: true, heightScale: 1.08, skin: SKIN.light, hair: { style: 'long-straight', color: HAIR.blonde }, top: { color: C.saffron, kind: 'coat' }, bottom: C.navy },
  nora: { name: 'Nora', fa: 'نورا', desc: 'وکیل، ۳۸ ساله', age: 'adult', feminine: true, skin: SKIN.fair, hair: { style: 'shoulder', color: HAIR.black }, top: { color: C.lapis, kind: 'blazer' }, bottom: C.ink },
  adam: { name: 'Adam', fa: 'آدم', desc: 'مرد جوان، ۲۷ ساله', age: 'adult', skin: SKIN.olive, hair: { style: 'short', color: HAIR.black }, beard: 'short', top: { color: C.grey, kind: 'hoodie' }, bottom: C.navy },
  sara: { name: 'Sara', fa: 'سارا', desc: 'عکاس نیجریه‌ای-هلندی، ۲۸ ساله', age: 'adult', feminine: true, skin: SKIN.deep, hair: { style: 'pixie', color: HAIR.black }, top: { color: C.saffron, kind: 'tshirt' }, bottom: C.lapis, extra: ['camera'] },
  ryan: { name: 'Ryan', fa: 'رایان', desc: 'پسر ۱۴ ساله', age: 'teen', skin: SKIN.olive, hair: { style: 'messy', color: HAIR.black }, top: { color: C.lapis, kind: 'hoodie' }, bottom: C.ink, extra: ['headset'] },
  rona: { name: 'Rona', fa: 'رونا', desc: 'دختر ۱۴ ساله، فوتبالیست', age: 'teen', feminine: true, skin: SKIN.olive, hair: { style: 'ponytail', color: HAIR.black }, top: { color: C.red, kind: 'jersey' }, bottom: C.white },
  nika: { name: 'Nika', fa: 'نیکا', desc: 'دانشجوی ۱۹ ساله', age: 'teen', feminine: true, heightScale: 1.06, skin: SKIN.medium, hair: { style: 'long-wavy', color: HAIR.brown }, top: { color: C.purple, kind: 'sweater' }, bottom: C.navy },
  timo: { name: 'Timo', fa: 'تیمو', desc: 'پسر ۸ ساله', age: 'child', skin: SKIN.medium, hair: { style: 'messy', color: HAIR.dark }, top: { color: C.green, kind: 'tshirt' }, bottom: C.lapis, extra: ['dino'] },
  luca: { name: 'Luca', fa: 'لوکا', desc: 'مرد جوان، ۲۳ ساله', age: 'adult', skin: SKIN.light, hair: { style: 'neat', color: HAIR.brown }, top: { color: C.lapisSoft, kind: 'shirt' }, bottom: C.ink, extra: ['tie'] },
  sofia: { name: 'Sofia', fa: 'سوفیا', desc: 'معمار اوکراینی، ۲۶ ساله', age: 'adult', feminine: true, skin: SKIN.light, hair: { style: 'long-wavy', color: HAIR.brown }, top: { color: C.turq, kind: 'sweater' }, bottom: C.navy },
  mia: { name: 'Mia', fa: 'میا', desc: 'دختر ۵ ساله', age: 'child', feminine: true, heightScale: 0.9, skin: SKIN.fair, hair: { style: 'pigtails', color: HAIR.brown }, top: { color: C.saffron, kind: 'dress' } },
  tony: { name: 'Tony', fa: 'تونی', desc: 'مرد برزیلی، ۳۵ ساله', age: 'adult', skin: SKIN.tan, hair: { style: 'short', color: HAIR.dark }, beard: 'full', top: { color: C.red, kind: 'tshirt' }, bottom: C.navy, extra: ['headphones'] },
  kim: { name: 'Kim', fa: 'کیم', desc: 'آقای کره‌ای، ۶۰ ساله', age: 'elder', skin: SKIN.fair, hair: { style: 'neat', color: HAIR.grey }, top: { color: C.beige, kind: 'cardigan' }, bottom: C.navy },
};

/** شغل‌ها: آدم بی‌نام با لباس کار. رنگ پوست‌ها عمداً متنوع است. */
export const JOBS: Record<string, PersonLook> = {
  doctor: { age: 'adult', feminine: true, skin: SKIN.tan, hair: { style: 'bun', color: HAIR.black }, top: { color: C.white, kind: 'coat' }, bottom: C.lapis, extra: ['stethoscope'] },
  nurse: { age: 'adult', skin: SKIN.deep, hair: { style: 'short', color: HAIR.black }, hat: 'nurse', top: { color: C.turq, kind: 'uniform' }, bottom: C.turq, extra: ['badge'] },
  teacher: { age: 'adult', feminine: true, skin: SKIN.light, hair: { style: 'bob', color: HAIR.ginger }, glasses: 'round', top: { color: C.purple, kind: 'cardigan' }, bottom: C.ink },
  police: { age: 'adult', skin: SKIN.medium, hair: { style: 'short', color: HAIR.dark }, hat: 'police', top: { color: C.navy, kind: 'uniform' }, bottom: C.navy, extra: ['badge'] },
  chef: { age: 'adult', skin: SKIN.olive, hair: { style: 'short', color: HAIR.dark }, beard: 'mustache', hat: 'chef', top: { color: C.white, kind: 'uniform' }, bottom: C.ink },
  waiter: { age: 'adult', skin: SKIN.fair, hair: { style: 'neat', color: HAIR.blonde }, top: { color: C.white, kind: 'shirt' }, apron: C.ink, bottom: C.ink, extra: ['tie'] },
  driver: { age: 'adult', skin: SKIN.deep, hair: { style: 'short', color: HAIR.black }, hat: 'cap', top: { color: C.lapis, kind: 'uniform' }, bottom: C.navy },
  firefighter: { age: 'adult', feminine: true, skin: SKIN.medium, hair: { style: 'ponytail', color: HAIR.brown }, hat: 'fire', top: { color: C.red, kind: 'uniform' }, bottom: C.red },
  farmer: { age: 'adult', skin: SKIN.tan, hair: { style: 'short', color: HAIR.brown }, hat: 'sun-hat', top: { color: C.green, kind: 'shirt' }, bottom: C.lapis },
  builder: { age: 'adult', skin: SKIN.olive, hair: { style: 'short', color: HAIR.black }, hat: 'hard-hat', top: { color: C.saffron, kind: 'vest' }, bottom: C.navy },
  pilot: { age: 'adult', feminine: true, skin: SKIN.deep, hair: { style: 'bun', color: HAIR.black }, hat: 'pilot', top: { color: C.navy, kind: 'uniform' }, bottom: C.navy, extra: ['tie'] },
  mechanic: { age: 'adult', skin: SKIN.light, hair: { style: 'messy', color: HAIR.ginger }, top: { color: C.lapis, kind: 'uniform' }, bottom: C.lapis },
  cashier: { age: 'adult', feminine: true, skin: SKIN.olive, hair: { style: 'ponytail', color: HAIR.dark }, top: { color: C.red, kind: 'polo' }, bottom: C.ink, extra: ['badge'] },
  student: { age: 'teen', skin: SKIN.fair, hair: { style: 'messy', color: HAIR.blonde }, top: { color: C.saffron, kind: 'hoodie' }, bottom: C.navy },
  postman: { age: 'adult', skin: SKIN.medium, hair: { style: 'short', color: HAIR.dark }, hat: 'cap', top: { color: C.saffron, kind: 'uniform' }, bottom: C.navy },
  engineer: { age: 'adult', feminine: true, skin: SKIN.light, hair: { style: 'ponytail', color: HAIR.blonde }, hat: 'hard-hat', top: { color: C.lapisSoft, kind: 'shirt' }, bottom: C.navy },
  lawyer: { age: 'adult', skin: SKIN.deep, hair: { style: 'neat', color: HAIR.black }, glasses: 'rect', top: { color: C.ink, kind: 'blazer' }, bottom: C.ink, extra: ['tie'] },
  baby: { age: 'baby', skin: SKIN.fair, hair: { style: 'none', color: HAIR.brown }, top: { color: C.lapisSoft, kind: 'tshirt' } },
};

export function lookFor(who: string): PersonLook | undefined {
  if (who.startsWith('job:')) return JOBS[who.slice(4)];
  return FAMILY[who];
}
