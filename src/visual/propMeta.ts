/**
 * اندازه و جای هر وسیله در صحنهٔ کارت، تا نسبت‌ها منطقی بماند.
 * واحد: همان صحنهٔ ۴۰۰×۲۶۰؛ قد آدم بزرگ ۱۷۸ است.
 *   sky     → در آسمان (خورشید، ماه، ابر)
 *   floor   → روی زمین، با سایه (مبل، دوچرخه، چمدان…)
 *   vehicle → روی زمین و فقط در فضای باز
 *   symbol  → نشانهٔ یک فکر (قرارداد، صبر، قیمت…): فقط در حباب موضوع می‌آید، نه وسط صحنه
 *   table   → روی میز (خوراکی، فنجان، کلید…): کوچک است، پس وقتی موضوع کارت است بزرگ‌تر و جلوی صحنه می‌آید
 */
export type PropWhere = 'sky' | 'floor' | 'vehicle' | 'table' | 'symbol';
export interface PropMeta { where: PropWhere; h: number }

const M = (where: PropWhere, h: number, ids: string): Array<[string, PropMeta]> => ids.split(' ').map((id) => [id, { where, h }]);

export const PROP_META: Record<string, PropMeta> = Object.fromEntries([
  ...M('sky', 44, 'sun moon cloud'),
  ...M('symbol', 30, 'document contract folder checklist stamp magnifier megaphone speech question-mark bulb hourglass envelope handshake thumbs-up thumbs-down scale padlock wifi chart price-tag house newspaper recycle trophy stopwatch bell warning battery printer headset box tools heart check cross calendar-day signpost globe grad-cap books microphone passport traffic-light rain-cloud hotel whistle groceries plant'),
  ...M('vehicle', 150, 'bus train'), ...M('vehicle', 120, 'plane'), ...M('vehicle', 96, 'car'),
  ...M('floor', 168, 'tree door'), ...M('floor', 132, 'fridge'), ...M('floor', 96, 'bicycle'),
  ...M('floor', 84, 'sofa bed washing-machine stove window oven'), ...M('floor', 100, 'broom mirror'), ...M('floor', 40, 'bucket carpet'), ...M('floor', 78, 'chair cart lamp'), ...M('floor', 70, 'table tv'),
  ...M('floor', 58, 'suitcase guitar umbrella'), ...M('floor', 46, 'bag backpack basket microwave jacket dress shirt'),
  ...M('table', 30, 'cake pizza soup rice plate laptop kettle bread gift ball football milk water flower map calendar first-aid salad pasta watermelon hamburger pot pan bottle towel pillow blanket'),
  ...M('table', 24, 'apple banana orange cheese egg coffee tea cup glass book phone camera clock hat scarf shoe letter money medicine-bottle fork-knife juice yogurt potato tomato cucumber onion carrot meat grape kebab fries jam beer wine pomegranate soap'),
  ...M('table', 18, 'key pill coins pen ticket card receipt glasses thermometer toothbrush spoon knife comb pencil sunglasses'),
]);

export function propMeta(id: string): PropMeta {
  return PROP_META[id] || { where: 'table', h: 26 };
}

/** مکان‌های سرباز: وسیلهٔ نقلیه فقط این‌جاها معنی دارد */
export const OUTDOOR = ['street', 'park', 'station', 'airport', 'beach', 'outside'];
