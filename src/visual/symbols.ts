/**
 * «حباب موضوع»: وقتی جمله دربارهٔ چیزی است که نمی‌شود وسط صحنه گذاشت (قرارداد، صبر، قیمت، قرار ملاقات…)،
 * نشانهٔ آن چیز در حباب گفتار بالای سر گوینده می‌آید. این‌طور صحنه به خودِ جمله ربط پیدا می‌کند،
 * بدون اینکه واژه‌ای نوشته شود (تصویر برای همهٔ زبان‌ها یکی است).
 *
 * هر ردیف: شناسهٔ تکهٔ Canva ← واژه‌های انگلیسی که آن را صدا می‌زنند (ریشهٔ واژه؛ s، ed و ing خودکار برداشته می‌شود).
 * ترتیب ردیف‌ها مهم است: ردیف بالاتر دقیق‌تر است و زودتر انتخاب می‌شود.
 */
const TABLE = `
contract: contract sign signature agreement clause terms lease deal
handshake: agree agreed shake compromise partner settle cooperate welcome introduce
stamp: stamp official approve approval permit licence license visa certify authority municipality council
scale: legal law lawyer court judge fair unfair right rights claim liable liability dispute justice proceeding sue
padlock: password secure security lock locked private privacy confidential pin access
wifi: wifi internet connection online offline signal network router
printer: print printer scan copy photocopy
headset: support helpline hotline helpdesk operator customer
box: delivery deliver parcel package courier shipping order
tools: fix repair broken leak plumber mechanic maintenance install
price-tag: price fee cost charge discount offer rate deposit refund expensive cheap quote tariff fare
chart: budget figure number data result statistic percent growth increase decrease trend sales profit report forecast
money: pay paid payment salary wage rent cash money euro bill invoice tax fine debt loan owe afford
coins: coin tip change
receipt: receipt
card: card
calendar-day: appointment deadline date schedule reschedule monday tuesday wednesday thursday friday saturday sunday weekend tomorrow yesterday week month slot booking booked
stopwatch: minute second quick quickly hurry rush urgent soon late early fast
hourglass: wait waiting delay delayed patience pending queue long
clock: clock hour time oclock noon midnight
calendar: calendar year annual
bell: remind reminder notice notify notification alert alarm announce announcement
megaphone: complain complaint protest shout loud noise noisy announce public
warning: risk danger dangerous warning careful caution problem issue trouble mistake error fault damage emergency
check: yes correct right confirm confirmed accept accepted done finish finished ready sure pass passed valid approve
cross: no wrong cancel cancelled decline refuse reject rejected never fail failed invalid mistake deny
thumbs-up: good great well like enjoy happy pleased glad recommend best better nice perfect love
thumbs-down: bad worse worst dislike hate terrible awful poor disappointed disappointing
question-mark: question ask asked why how wonder unclear confused confusing doubt unsure
bulb: idea suggest suggestion solution think thought plan propose proposal imagine creative
magnifier: check look search find detail review inspect inspection examine investigate proof evidence compare read
speech: talk speak conversation chat discuss discussion say said tell told mention answer reply opinion argue debate word sentence phrase explain
microphone: voice speech presentation announce interview podcast sing
books: language grammar verb noun clause tense vocabulary dictionary study learn lesson library homework read
grad-cap: school course class university college degree exam test student teacher diploma education training
document: document form paper page letter file list note draft policy report statement application copy text version record written writing certificate
folder: folder file case archive record dossier
checklist: checklist list task todo plan step requirement rule procedure agenda
envelope: email mail send sent post message inbox reply letter
newspaper: news newspaper headline article story media press journalist magazine
phone: call phone ring text app message screen
laptop: laptop computer software update system website portal online login account data
tv: tv television watch film movie series show channel episode
camera: photo picture camera screenshot image
house: home house flat apartment landlord tenant rent room neighbour neighbor move
key: key
hotel: hotel reservation reception checkin guest
passport: passport border customs identity
suitcase: luggage suitcase baggage pack trip travel holiday vacation journey
signpost: direction way route turn left straight map lost where address street
traffic-light: traffic stop crossing junction
train: train platform station
bus: bus tram
plane: flight plane airport fly
car: car drive driving parking garage taxi
bicycle: bike bicycle cycle cycling
globe: world country abroad international foreign culture global
rain-cloud: rain rainy storm weather wet forecast
sun: sun sunny hot summer warm
recycle: recycle recycling waste rubbish bin garbage plastic environment climate pollution energy
plant: plant garden green nature tree grow flower
groceries: groceries supermarket shopping shop buy market
cart: cart trolley
heart: love feeling feel heart care miss relationship friend friendship family kind
gift: gift present birthday surprise party celebrate
trophy: win won winner champion prize medal competition tournament score
whistle: match game team coach referee sport training play
ball: ball football soccer goal
medicine-bottle: medicine pill prescription pharmacy drug
thermometer: fever temperature
first-aid: doctor hospital nurse clinic health injury hurt pain sick ill ambulance
battery: battery charge charger power energy tired exhausted
coffee: coffee cafe
tea: tea
water: water drink
bread: bread breakfast
fork-knife: eat food meal lunch dinner restaurant menu dish hungry
pizza: pizza
cake: cake dessert
bed: sleep bed night
door: door entrance exit
`;

/** واژه ← شناسهٔ تکه؛ اولین ردیفی که واژه را دارد برنده است */
const WORD_TO_SYMBOL = new Map<string, string>();
const ORDER = new Map<string, number>();
TABLE.trim().split('\n').forEach((line, i) => {
  const [id, words] = line.split(':').map((x) => x.trim());
  ORDER.set(id, i);
  for (const w of words.split(/\s+/)) if (!WORD_TO_SYMBOL.has(w)) WORD_TO_SYMBOL.set(w, id);
});

/** واژه‌هایی که آن‌قدر عمومی‌اند که تنها وقتی چیز بهتری نیست به کار می‌آیند */
const WEAK = new Set(['good', 'well', 'like', 'right', 'no', 'yes', 'long', 'time', 'look', 'find', 'read', 'say', 'said', 'tell', 'told', 'how', 'why', 'ask', 'think', 'plan', 'change', 'left', 'way', 'turn', 'where', 'play', 'game', 'hold', 'order', 'room', 'move', 'stop', 'check', 'done', 'sure', 'never', 'best', 'better', 'love', 'care', 'kind', 'feel', 'note', 'copy', 'text', 'list', 'file', 'case', 'step', 'rule', 'word', 'answer', 'reply', 'explain', 'call', 'show', 'watch', 'night', 'drink', 'eat', 'tired', 'power', 'green', 'grow', 'buy', 'shop', 'trip', 'pack', 'fine', 'bill', 'second', 'fast', 'early', 'late', 'soon', 'hour', 'week', 'month', 'year', 'date', 'ready', 'finish', 'finished', 'pass', 'fail', 'issue', 'problem', 'mistake', 'public', 'loud', 'post', 'sent', 'send', 'mail', 'letter', 'page', 'paper', 'form', 'report', 'data', 'number', 'figure', 'result', 'rate', 'offer', 'charge', 'cost', 'change', 'tip', 'deal', 'terms', 'sign', 'welcome', 'settle', 'access', 'pin', 'hold', 'agent', 'order', 'ship', 'install', 'fix']);

function stems(w: string): string[] {
  const out = [w];
  if (w.endsWith("'s")) out.push(w.slice(0, -2));
  if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) out.push(w.slice(0, -2));
  if (w.endsWith('s')) out.push(w.slice(0, -1));
  if (w.endsWith('ed')) out.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith('ing')) out.push(w.slice(0, -3), w.slice(0, -3) + 'e');
  if (w.endsWith('ly')) out.push(w.slice(0, -2));
  return out;
}

/**
 * نشانه‌های موضوع یک جمله، بهترین‌ها اول (حداکثر max).
 * واژهٔ دقیق (قرارداد، رسید، قطار) بر واژهٔ عمومی (خوب، گفتن) مقدم است.
 */
export function symbolsFor(text: string, max = 2): string[] {
  const strong: string[] = [];
  const weak: string[] = [];
  for (const raw of text.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z' -]/g, ' ').split(/[\s-]+/)) {
    if (!raw) continue;
    for (const s of stems(raw)) {
      const id = WORD_TO_SYMBOL.get(s);
      if (!id) continue;
      if (WEAK.has(s)) {
        if (!strong.includes(id) && !weak.includes(id)) weak.push(id);
      } else if (!strong.includes(id)) {
        // واژهٔ دقیق همان نشانه‌ای را که واژهٔ عمومی آورده بود جلو می‌اندازد
        const w = weak.indexOf(id);
        if (w >= 0) weak.splice(w, 1);
        strong.push(id);
      }
      break;
    }
  }
  return [...strong, ...weak].slice(0, max);
}

/** اگر هیچ واژه‌ای نشانه نداشت: نشانهٔ موضوع کارت */
const TOPIC_SYMBOL: Array<[RegExp, string]> = [
  [/work|job|business|career|occupation/i, 'laptop'],
  [/negotiat/i, 'handshake'],
  [/legal|law|rights/i, 'scale'],
  [/bureaucra|admin|services|appointment/i, 'document'],
  [/money|bank|shopping|finance/i, 'money'],
  [/housing|home|house/i, 'house'],
  [/travel|transport|direction|places|city/i, 'suitcase'],
  [/health|body|emergenc/i, 'first-aid'],
  [/technolog|media|internet/i, 'laptop'],
  [/environment|nature|weather/i, 'plant'],
  [/education|school/i, 'grad-cap'],
  [/food|drink|restaurant/i, 'fork-knife'],
  [/sport/i, 'whistle'],
  [/complain/i, 'megaphone'],
  [/feeling|relationship|family|social|self/i, 'heart'],
  [/time|daily/i, 'clock'],
  [/culture|society/i, 'globe'],
  [/opinion|discourse|communicat|small talk|closing|register|request|polite|decision/i, 'speech'],
];
/** موضوع‌های دستوری و اصطلاح‌ها: خودِ زبان موضوع است */
export function topicSymbol(topic = ''): string {
  for (const [re, id] of TOPIC_SYMBOL) if (re.test(topic)) return id;
  return 'books';
}

export const SYMBOL_IDS = [...ORDER.keys()];
