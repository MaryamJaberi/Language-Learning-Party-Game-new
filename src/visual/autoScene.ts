import type { Actor, EffectPlacement, Expression, Pose, PropPlacement, SceneSpec } from './types';
import { allEntries } from './lexicon';
import { GROUND } from './places';

/**
 * ساختن خودکار صحنه برای یک کارت از روی متن انگلیسی‌اش و موضوعش.
 * قاعده‌ها ساده و قابل خواندن‌اند؛ صحنه‌های دست‌نوشته (curatedScenes) همیشه بر این‌ها مقدم‌اند.
 *
 * منطق: «این جمله کجا، بین چه کسانی و با چه حسی گفته می‌شود؟»
 *   ۱. مکان از واژه‌های جمله، وگرنه از موضوع کارت
 *   ۲. گوینده و شنونده از فامیل (هر مکان آدم‌های خودش را دارد؛ دکتر، گارسون، معلم…)
 *   ۳. حالت چهره و ژست از واژه‌های احساس و کار
 *   ۴. یک شیء از واژه‌های جمله، و نشانه‌ها (سرفه، باران، ساعت…)
 */

export interface CardInfo {
  key: string;
  en: string;
  topic?: string;
  type?: string;
}

export type SceneResult = SceneSpec | { lex: string };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const has = (t: string, re: RegExp) => re.test(t);

// ---------- ۱. مکان
const PLACE_WORDS: Array<[RegExp, string]> = [
  [/\b(doctor|hospital|clinic|nurse|medicine|pill|prescription|symptom|fever|pharmac\w*|dentist|appointment with)\b/, 'doctor'],
  [/\b(restaurant|menu|waiter|order(ing)? food|the bill|tip|table for|dinner reservation)\b/, 'restaurant'],
  [/\b(caf[eé]|coffee|latte|espresso|cappuccino)\b/, 'cafe'],
  [/\b(kitchen|cook|recipe|oven|fridge|boil|bake|fry|dishes)\b/, 'kitchen'],
  [/\b(shop|store|supermarket|buy|bought|price|discount|refund|return (this|these|it|them)|size|cheaper|expensive|receipt|cashier|checkout|sale)\b/, 'shop'],
  [/\b(bank|account|loan|mortgage|transfer|atm|withdraw|deposit|charged)\b/, 'bank'],
  [/\b(train|station|platform|tram|metro|subway)\b/, 'station'],
  [/\b(plane|flight|airport|gate|boarding|passport|luggage|check-in|connection)\b/, 'airport'],
  [/\b(beach|sea|swim|sunbath\w*|holiday|vacation)\b/, 'beach'],
  [/\b(school|class|classroom|teacher|homework|exam|lesson|course|student|university|study|studying)\b/, 'school'],
  [/\b(office|meeting|boss|manager|colleague|deadline|project|email|interview|client|report|presentation|salary|hiring|role|job)\b/, 'office'],
  [/\b(bed|bedroom|sleep|asleep|nap|wake up|woke up|alarm)\b/, 'bedroom'],
  [/\b(park|walk|garden|picnic|outside|nature)\b/, 'park'],
  [/\b(street|traffic|bus|car|bike|bicycle|cycle|drive|driving|parking|corner|crossing|directions?)\b/, 'street'],
];
const TOPIC_PLACE: Array<[RegExp, string]> = [
  [/health|emergenc|body/i, 'doctor'],
  [/food|restaurant|drink|ordering/i, 'restaurant'],
  [/shop/i, 'shop'],
  [/money|bank/i, 'bank'],
  [/work|job|occupation|negotiation|business|interview|appointments|admin|bureaucra|legal/i, 'office'],
  [/travel|transport|vehicle|direction/i, 'station'],
  [/educat|school|language|library/i, 'school'],
  [/weather|nature|environment|sport/i, 'park'],
  [/city|places/i, 'street'],
];

function pickPlace(t: string, topic = ''): string {
  for (const [re, p] of PLACE_WORDS) if (has(t, re)) return p;
  for (const [re, p] of TOPIC_PLACE) if (re.test(topic)) return p;
  return 'home';
}

// ---------- ۲. آدم‌ها
const CAST: Record<string, string[]> = {
  home: ['rosa', 'yusuf', 'leila', 'sam', 'omid', 'zara', 'sofia', 'tony', 'nika', 'adam', 'mia', 'timo'],
  kitchen: ['dani', 'zara', 'rosa', 'leila', 'timo', 'mia'],
  doctor: ['yusuf', 'rosa', 'leila', 'ryan', 'adam'],
  restaurant: ['adam', 'nika', 'sofia', 'tony', 'eva', 'omid'],
  cafe: ['nika', 'adam', 'sofia', 'sara', 'luca', 'eva'],
  shop: ['rosa', 'eva', 'luca', 'sam', 'marta'],
  bank: ['sam', 'nora', 'luca', 'kim', 'rosa'],
  station: ['marta', 'omid', 'sofia', 'tony', 'eva'],
  airport: ['marta', 'tony', 'sofia', 'eva', 'kim'],
  beach: ['marta', 'tony', 'sara', 'rona', 'timo'],
  school: ['nika', 'ryan', 'rona', 'timo', 'eva'],
  office: ['sam', 'nora', 'luca', 'adam', 'zara', 'sofia'],
  bedroom: ['adam', 'nika', 'mia', 'timo', 'ryan'],
  park: ['marta', 'sara', 'eva', 'rona', 'omid', 'timo'],
  street: ['eva', 'omid', 'kim', 'luca', 'sara', 'tony'],
};
/** کسی که در آن مکان «کار می‌کند» و گاهی شنونده است */
const STAFF: Record<string, string> = {
  doctor: 'job:doctor', restaurant: 'job:waiter', shop: 'job:cashier', school: 'job:teacher', bank: 'nora', cafe: 'zara',
};
/** کارت‌هایی که دربارهٔ کسی هستند که حضورش واضح است */
const PERSON_WORDS: Array<[RegExp, string]> = [
  [/\b(police|officer)\b/, 'job:police'],
  [/\b(doctor)\b/, 'job:doctor'],
  [/\b(nurse)\b/, 'job:nurse'],
  [/\b(teacher)\b/, 'job:teacher'],
  [/\b(waiter|waitress)\b/, 'job:waiter'],
  [/\b(chef)\b/, 'job:chef'],
  [/\b(pilot)\b/, 'job:pilot'],
  [/\b(driver)\b/, 'job:driver'],
  [/\b(baby)\b/, 'job:baby'],
  [/\b(grandma|grandmother|granny)\b/, 'rosa'],
  [/\b(grandpa|grandfather)\b/, 'yusuf'],
  [/\b(kids?|children|son|daughter)\b/, 'timo'],
  [/\b(dog|puppy)\b/, 'biscuit'],
  [/\b(cat|kitten)\b/, 'pepper'],
  [/\b(parrot|bird)\b/, 'coco'],
];

// ---------- ۳. احساس و ژست
const MOODS: Array<[RegExp, Expression, Expression?]> = [
  // [الگو، حالت گوینده، حالت شنونده]
  [/\b(watch out|look out|careful|help!|emergency|stop!|fire)\b/, 'scared', 'surprised'],
  [/\b(sorry|apolog\w*|my bad|my fault|on me)\b/, 'sad', 'neutral'],
  [/\b(angry|annoy\w*|unacceptable|ridiculous|how dare|no right|fed up|stop it|cut it out|leave me alone|not what we agreed|on purpose|throw me under)\b/, 'angry', 'worried'],
  [/\b(worried|afraid|concern\w*|nervous|anxious|stress|hope (everything|it)|scared|panic)\b/, 'worried', 'worried'],
  [/\b(sick|ill|cough|fever|hurt|pain|headache|ache|flu|a cold|dizzy|allerg\w*)/, 'sick', 'worried'],
  [/\b(tired|exhausted|sleepy|beat|wiped)\b/, 'tired', 'neutral'],
  [/\b(sad|miss you|lonely|cry|bad news|passed away)\b/, 'sad', 'sad'],
  [/\b(love|adore\w*|darling|sweetheart)\b/, 'love', 'happy'],
  [/\b(haha|funny|joke|kidding|laugh|hilarious)\b/, 'laugh', 'laugh'],
  [/\b(wow|really\?|no way|seriously|can't believe|surprise)\b/, 'surprised', 'happy'],
  [/\b(congrat\w*|great|awesome|wonderful|amazing|perfect|fantastic|excellent|glad|happy|thank|thanks|welcome|enjoy|delicious|fun)\b/, 'happy', 'happy'],
  [/\b(don't understand|what do you mean|confus\w*|not sure|no idea|i wonder|wondering|maybe|perhaps|think so|decide|torn between|second thoughts)\b/, 'thinking', 'neutral'],
  [/\b(hungry|starving)\b/, 'sad', 'happy'],
];
const POSES: Array<[RegExp, Pose, string?]> = [
  [/\b(hello|hi|hey|good (morning|afternoon|evening)|bye|goodbye|see you|welcome|nice to meet)\b/, 'wave'],
  [/\b(call|phone|ring me|text me)\b/, 'phone', 'phone'],
  [/\b(watch out|look out|careful)\b/, 'point'],
  [/\b(headache|forgot|oh no)\b/, 'facepalm'],
  [/\b(cough)\b/, 'cough'],
  [/\b(eat|eating|bite|taste)\b/, 'eat'],
  [/\b(coffee)\b/, 'hold', 'coffee'],
  [/\b(tea)\b/, 'hold', 'tea'],
  [/\b(drink|water|thirsty)\b/, 'hold', 'water'],
  [/\b(congrat\w*|we won|hooray|yay|celebrat\w*|great news|passed)\b/, 'cheer'],
  [/\b(hug|miss you)\b/, 'hug'],
  [/\b(sign|form|write|fill (in|out))\b/, 'write', 'pen'],
  [/\b(read|book)\b/, 'hold', 'book'],
  [/\b(pay|money|cash|price|cost)\b/, 'hold', 'money'],
  [/\b(card)\b/, 'hold', 'card'],
  [/\b(gift|present)\b/, 'hold', 'gift'],
  [/\b(laptop|computer|email)\b/, 'hold', 'laptop'],
  [/\b(think|wonder|hmm|let me see|let me think|sleep on it)\b/, 'think'],
  [/\b(look|there|this one|that one|over there|which one|point)\b/, 'point'],
  [/\b(i don't know|no idea|whatever|who knows|doesn't matter)\b/, 'shrug'],
  [/\b(sit|seat|have a seat)\b/, 'sit'],
  [/\b(run|hurry|quick|late|rush)\b/, 'run'],
  [/\b(oh no|facepalm|forgot|i can't believe i)\b/, 'facepalm'],
];
/** شیئی که روی زمین/میز صحنه گذاشته می‌شود */
const OBJECT_WORDS: Array<[RegExp, string]> = [
  [/\bumbrella\b/, 'umbrella'], [/\bkeys?\b/, 'key'], [/\bbags?\b/, 'bag'], [/\bsuitcase|luggage\b/, 'suitcase'],
  [/\bticket\b/, 'ticket'], [/\bbus\b/, 'bus'], [/\btrain\b/, 'train'], [/\bcar\b/, 'car'], [/\bbike|bicycle\b/, 'bicycle'],
  [/\bcake|birthday\b/, 'cake'], [/\bpizza\b/, 'pizza'], [/\bbread\b/, 'bread'], [/\bapples?\b/, 'apple'], [/\bsoup\b/, 'soup'],
  [/\bflowers?\b/, 'flower'], [/\bclock|time\b/, 'clock'], [/\bletter|mail\b/, 'letter'], [/\bcalendar|schedule|date\b/, 'calendar'],
  [/\bmedicine|pills?\b/, 'medicine-bottle'], [/\bthermometer|temperature\b/, 'thermometer'], [/\bshoes?\b/, 'shoe'],
  [/\bshirt\b/, 'shirt'], [/\bdress\b/, 'dress'], [/\bjacket|coat\b/, 'jacket'], [/\bwashing machine\b/, 'washing-machine'],
  [/\bheating|radiator\b/, 'lamp'], [/\bball|football|soccer\b/, 'ball'], [/\bguitar|music\b/, 'guitar'], [/\bcamera|photo\b/, 'camera'],
  [/\bmap|directions?\b/, 'map'], [/\bplane|flight\b/, 'plane'], [/\breceipt|bill\b/, 'receipt'], [/\bcart\b/, 'cart'],
];
const EFFECT_WORDS: Array<[RegExp, EffectPlacement['id'], 'speaker' | 'listener' | 'scene']> = [
  [/\b(rain|raining|umbrella|wet)\b/, 'rain', 'scene'],
  [/\b(snow|snowing)\b/, 'snow', 'scene'],
  [/\b(cough)/, 'cough', 'listener'],
  [/\b(late|hurry|deadline|by when|on time|wait|waiting|how long)\b/, 'clock', 'speaker'],
  [/\b(sleep|asleep|nap|sleepy)\b/, 'zzz', 'speaker'],
  [/\b(love|miss you|adore\w*)\b/, 'hearts', 'speaker'],
  [/\b(idea|plan|suggest|how about|what if)\b/, 'idea', 'speaker'],
  [/\b(music|song|sing|party|dance)\b/, 'music', 'speaker'],
  [/\b(hungry|starving)\b/, 'hungry', 'speaker'],
  [/\b(cold|freezing)\b/, 'cold', 'speaker'],
  [/\b(hot|warm)\b/, 'hot', 'speaker'],
  [/\b(price|cost|expensive|cheap|money|pay|discount|refund|charged|salary)\b/, 'money', 'speaker'],
  [/\b(watch out|careful|help!|emergency|fire|stop!|look out)\b/, 'exclaim', 'speaker'],
  [/\b(congrat\w*|we won|great news|amazing)\b/, 'sparkle', 'listener'],
  [/\b(call|phone|ring)\b/, 'phone-ring', 'speaker'],
];

/** واژهٔ تک‌کلمه‌ای در دیکشنری تصویری؟ */
let LEX_INDEX: Map<string, string> | null = null;
function lexIndex(): Map<string, string> {
  if (!LEX_INDEX) {
    LEX_INDEX = new Map();
    for (const e of allEntries()) {
      const key = e.en.toLowerCase().replace(/^to /, '').trim();
      LEX_INDEX.set(key, e.id);
    }
  }
  return LEX_INDEX;
}
export function lexForWord(en: string): string | undefined {
  const w = en.toLowerCase().replace(/[.!?¿¡,"]/g, '').replace(/^(the|a|an|to) /, '').trim();
  return lexIndex().get(w) || lexIndex().get(w.replace(/s$/, ''));
}

export function buildScene(card: CardInfo): SceneResult {
  const raw = (card.en || '').trim();
  const t = ' ' + raw.toLowerCase().replace(/[’`]/g, "'") + ' ';
  const h = hash(card.key);

  // واژهٔ تنها → تصویر دیکشنری
  if (card.type === 'vocabulary' || raw.split(/\s+/).length <= 2) {
    const lex = lexForWord(raw);
    if (lex) return { lex };
  }

  let place = pickPlace(t, card.topic);
  const effects: EffectPlacement[] = [];
  const props: PropPlacement[] = [];

  // پیشنهاد رفتن پیش دکتر یعنی کسی مریض است و ما هنوز خانه‌ایم (مثال مریم: «بیا بریم دکتر» → دایی نگران، بابابزرگ سرفه)
  const goToDoctor = has(t, /\b(let's|let us|shall we|should|we need to|you need to|go|take you|see)\b[^.?!]*\b(doctor|hospital)\b/);
  if (goToDoctor) place = 'home';

  // آدم‌ها
  const cast = CAST[place] || CAST.home;
  let speaker = cast[h % cast.length];
  let listener = cast[(h >>> 5) % cast.length];
  if (listener === speaker) listener = cast[(cast.indexOf(speaker) + 1) % cast.length];
  if (STAFF[place] && !goToDoctor && h % 3 !== 0) listener = STAFF[place];
  for (const [re, who] of PERSON_WORDS) {
    if (has(t, re) && !(goToDoctor && who === 'job:doctor')) {
      if (who !== speaker) listener = who;
      break;
    }
  }
  if (goToDoctor) {
    speaker = ['omid', 'leila', 'sam', 'zara'][h % 4];
    listener = ['yusuf', 'rosa'][(h >>> 3) % 2];
  }

  // حالت‌ها
  let sExpr: Expression = 'neutral';
  let lExpr: Expression = 'neutral';
  for (const [re, s, l] of MOODS) {
    if (has(t, re)) {
      sExpr = s;
      lExpr = l || 'neutral';
      break;
    }
  }
  // «من مریضم» → گوینده مریض است؛ «تو مریضی؟» → شنونده
  const sickWords = /\b(sick|ill|cough|fever|hurt|pain|headache|ache|flu|dizzy)\b/;
  if (has(t, sickWords)) {
    const aboutMe = has(t, /\b(i|i'm|i've|my|me)\b/);
    if (aboutMe && !goToDoctor) { sExpr = 'sick'; lExpr = 'worried'; } else { sExpr = 'worried'; lExpr = 'sick'; }
  }
  // «من باید برم دکتر» → خود گوینده مریض است؛ «تو/بیا بریم» → شنونده
  const iNeedDoctor = goToDoctor && has(t, /^\s*i\b|\bi need\b|\bi have to\b|\bi should\b/) && !has(t, /\b(you|let's)\b/);
  if (goToDoctor) { sExpr = iNeedDoctor ? 'sick' : 'worried'; lExpr = iNeedDoctor ? 'worried' : 'sick'; }
  if (sExpr === 'neutral' && raw.endsWith('?')) lExpr = 'thinking';
  if (sExpr === 'neutral') sExpr = h % 2 ? 'happy' : 'neutral';

  // ژست
  let sPose: Pose = 'stand';
  let sHolds: string | undefined;
  for (const [re, pose, holds] of POSES) {
    if (has(t, re)) {
      sPose = pose;
      sHolds = holds;
      break;
    }
  }
  let lPose: Pose = 'stand';
  if (lExpr === 'sick') lPose = 'cough';
  // «کجاست؟ / چطور برم؟» → شنونده راه را نشان می‌دهد
  if (has(t, /^\s*(where|how do i get|which way)\b/)) { lPose = 'point'; lExpr = 'happy'; if (sExpr === 'happy' || sExpr === 'neutral') sExpr = 'thinking'; }
  if (sExpr === 'angry' && sPose === 'stand') sPose = 'point';
  if (lExpr === 'angry' || (sExpr === 'angry' && h % 2)) lPose = 'cross';
  if (sExpr === 'worried' && lExpr === 'sick') sPose = 'comfort';
  if (iNeedDoctor) { lPose = 'comfort'; }
  if (sExpr === 'thinking' && sPose === 'stand') sPose = 'think';
  if (sExpr === 'sick' && sPose === 'stand') sPose = has(t, /\bhead/) ? 'facepalm' : 'cough';

  const actors: Actor[] = [
    { who: speaker, x: 135, facing: 'right', expression: sExpr, pose: sPose, holds: sHolds, speaking: true },
    { who: listener, x: 268, facing: 'left', expression: lExpr, pose: lPose },
  ];
  // حیوان‌ها کوچک‌اند و کنار پای آدم‌ها می‌نشینند
  if (['biscuit', 'pepper', 'coco'].includes(listener)) {
    actors[1] = { who: listener, x: 250, facing: 'left' };
  }

  // شیء
  for (const [re, id] of OBJECT_WORDS) {
    if (has(t, re) && id !== sHolds) {
      const big = ['bus', 'train', 'car', 'plane', 'washing-machine'].includes(id);
      props.push(big ? { id, x: 345, y: GROUND - 22, scale: 1.5 } : { id, x: 202, y: GROUND - 14, scale: 1.25 });
      break;
    }
  }

  // نشانه‌ها
  for (const [re, id, on] of EFFECT_WORDS) {
    if (!has(t, re)) continue;
    if (effects.some((e) => e.id === id)) continue;
    if (on === 'scene') effects.push({ id });
    else effects.push({ id, on: on === 'speaker' ? 0 : 1 });
    if (effects.length >= 2) break;
  }
  if (lExpr === 'sick' && !effects.some((e) => e.id === 'cough')) effects.push({ id: 'cough', on: 1 });
  if (sExpr === 'sick' && sPose === 'cough' && !effects.some((e) => e.id === 'cough')) effects.push({ id: 'cough', on: 0 });
  if (effects.length > 3) effects.length = 3;
  if (sExpr === 'worried' && effects.length < 3) effects.push({ id: 'sweat', on: 0 });
  if (sExpr === 'angry') effects.push({ id: 'anger', on: 0 });
  if (raw.endsWith('?') && effects.length === 0 && sExpr === 'thinking') effects.push({ id: 'question', on: 0 });

  const night = has(t, /\b(night|tonight|evening|midnight|sleep|asleep|dark)\b/);
  if (effects.some((e) => e.id === 'rain' || e.id === 'snow') && ['home', 'kitchen', 'office', 'bedroom', 'shop', 'bank', 'school', 'doctor', 'restaurant', 'cafe'].includes(place)) {
    place = h % 2 ? 'street' : 'park';
  }

  return { place, time: night ? 'night' : 'day', actors, props, effects };
}
