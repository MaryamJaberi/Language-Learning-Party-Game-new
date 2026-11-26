import type { Expression, Pose, SceneSpec } from './types';

/**
 * دیکشنری تصویری «دور»: هر واژه یک تصویر از همان دنیای کارت‌ها دارد.
 * اسم‌های هلندی و آلمانی با حرف تعریف آمده‌اند (de/het، der/die/das) تا رنگ جنس دستوری روی آن‌ها کار کند.
 *
 * انواع تصویر:
 *   person  → یکی از فامیل یا شغل‌ها، با حالت و ژست
 *   prop    → شیء یا خوراکی
 *   animal  → حیوان
 *   place   → پس‌زمینهٔ یک مکان
 *   scene   → صحنهٔ کوچک (برای موقعیت‌ها)
 */
export type Visual =
  | { kind: 'person'; who: string; expression?: Expression; pose?: Pose; holds?: string; portrait?: boolean }
  | { kind: 'prop'; id: string }
  | { kind: 'animal'; id: string }
  | { kind: 'place'; id: string; night?: boolean }
  | { kind: 'scene'; spec: SceneSpec };

export interface LexEntry {
  id: string;
  fa: string;
  en: string;
  nl: string;
  de: string;
  visual: Visual;
}

export interface LexCategory {
  id: string;
  title: { fa: string; en: string; nl: string; de: string };
  entries: LexEntry[];
}

const P = (who: string, expression: Expression = 'happy', pose: Pose = 'stand', holds?: string): Visual => ({ kind: 'person', who, expression, pose, holds });
/** نمای نزدیک (سر و شانه) برای احساس‌ها */
const PF = (who: string, expression: Expression, pose: Pose = 'stand'): Visual => ({ kind: 'person', who, expression, pose, portrait: true });
const O = (id: string): Visual => ({ kind: 'prop', id });
const A = (id: string): Visual => ({ kind: 'animal', id });
const PL = (id: string, night = false): Visual => ({ kind: 'place', id, night });
const SC = (spec: SceneSpec): Visual => ({ kind: 'scene', spec });
const e = (id: string, fa: string, en: string, nl: string, de: string, visual: Visual): LexEntry => ({ id, fa, en, nl, de, visual });

export const LEXICON: LexCategory[] = [
  {
    id: 'family',
    title: { fa: 'فامیل', en: 'Family', nl: 'Familie', de: 'Familie' },
    entries: [
      e('grandfather', 'پدربزرگ', 'grandfather', 'de opa', 'der Opa', P('yusuf')),
      e('grandmother', 'مادربزرگ', 'grandmother', 'de oma', 'die Oma', P('rosa')),
      e('father', 'پدر', 'father', 'de vader', 'der Vater', P('sam')),
      e('mother', 'مادر', 'mother', 'de moeder', 'die Mutter', P('leila')),
      e('son', 'پسر', 'son', 'de zoon', 'der Sohn', P('timo')),
      e('daughter', 'دختر', 'daughter', 'de dochter', 'die Tochter', P('mia')),
      e('brother', 'برادر', 'brother', 'de broer', 'der Bruder', P('ryan')),
      e('sister', 'خواهر', 'sister', 'de zus', 'die Schwester', P('rona')),
      e('baby', 'نوزاد', 'baby', 'de baby', 'das Baby', P('job:baby')),
      e('uncle', 'دایی / عمو', 'uncle', 'de oom', 'der Onkel', P('omid')),
      e('aunt', 'خاله / عمه', 'aunt', 'de tante', 'die Tante', P('zara')),
      e('cousin', 'دخترخاله، پسرعمو…', 'cousin', 'de neef / de nicht', 'der Cousin / die Cousine', P('nika')),
      e('husband', 'شوهر', 'husband', 'de man', 'der Ehemann', P('tony')),
      e('wife', 'همسر (زن)', 'wife', 'de vrouw', 'die Ehefrau', P('sofia')),
      e('friend', 'دوست', 'friend', 'de vriend', 'der Freund', P('adam', 'happy', 'wave')),
      e('neighbor', 'همسایه', 'neighbor', 'de buurman', 'der Nachbar', P('kim', 'happy', 'wave')),
      e('family', 'خانواده', 'family', 'het gezin', 'die Familie', SC({ place: 'home', actors: [{ who: 'sam', x: 110, expression: 'happy' }, { who: 'mia', x: 175, expression: 'laugh', pose: 'cheer' }, { who: 'timo', x: 235, expression: 'happy' }, { who: 'leila', x: 300, expression: 'happy', facing: 'left' }] })),
    ],
  },
  {
    id: 'feelings',
    title: { fa: 'احساس‌ها', en: 'Feelings', nl: 'Gevoelens', de: 'Gefühle' },
    entries: [
      e('happy', 'خوشحال', 'happy', 'blij', 'froh', PF('nika', 'laugh', 'cheer')),
      e('sad', 'غمگین', 'sad', 'verdrietig', 'traurig', PF('adam', 'sad')),
      e('angry', 'عصبانی', 'angry', 'boos', 'wütend', PF('sam', 'angry', 'cross')),
      e('worried', 'نگران', 'worried', 'bezorgd', 'besorgt', PF('leila', 'worried', 'think')),
      e('surprised', 'متعجب', 'surprised', 'verrast', 'überrascht', PF('rona', 'surprised', 'shrug')),
      e('tired', 'خسته', 'tired', 'moe', 'müde', PF('adam', 'tired')),
      e('sick', 'مریض', 'sick', 'ziek', 'krank', PF('yusuf', 'sick', 'cough')),
      e('scared', 'ترسیده', 'scared', 'bang', 'ängstlich', PF('timo', 'scared')),
      e('in-love', 'عاشق', 'in love', 'verliefd', 'verliebt', PF('tony', 'love')),
      e('sleepy', 'خواب‌آلود', 'sleepy', 'slaperig', 'schläfrig', PF('mia', 'sleepy')),
      e('confused', 'گیج', 'confused', 'in de war', 'verwirrt', PF('omid', 'thinking', 'shrug')),
      e('embarrassed', 'خجالت‌زده', 'embarrassed', 'beschaamd', 'verlegen', PF('luca', 'worried', 'facepalm')),
    ],
  },
  {
    id: 'actions',
    title: { fa: 'کارها', en: 'Actions', nl: 'Werkwoorden', de: 'Tätigkeiten' },
    entries: [
      e('eat', 'خوردن', 'to eat', 'eten', 'essen', P('timo', 'happy', 'eat', 'apple')),
      e('drink', 'نوشیدن', 'to drink', 'drinken', 'trinken', P('zara', 'happy', 'eat', 'coffee')),
      e('sleep', 'خوابیدن', 'to sleep', 'slapen', 'schlafen', SC({ place: 'bedroom', time: 'night', actors: [{ who: 'mia', x: 140, expression: 'sleepy' }], effects: [{ id: 'zzz', on: 0 }] })),
      e('run', 'دویدن', 'to run', 'rennen', 'rennen', P('rona', 'happy', 'run')),
      e('write', 'نوشتن', 'to write', 'schrijven', 'schreiben', P('nika', 'thinking', 'write', 'pen')),
      e('read', 'خواندن', 'to read', 'lezen', 'lesen', P('kim', 'neutral', 'hold', 'book')),
      e('call', 'زنگ زدن', 'to call', 'bellen', 'anrufen', P('nora', 'happy', 'phone', 'phone')),
      e('greet', 'سلام کردن', 'to say hello', 'groeten', 'grüßen', P('omid', 'happy', 'wave')),
      e('think', 'فکر کردن', 'to think', 'denken', 'denken', P('sofia', 'thinking', 'think')),
      e('cough', 'سرفه کردن', 'to cough', 'hoesten', 'husten', SC({ place: 'plain', actors: [{ who: 'yusuf', x: 200, expression: 'sick', pose: 'cough' }], effects: [{ id: 'cough', on: 0 }] })),
      e('hug', 'بغل کردن', 'to hug', 'knuffelen', 'umarmen', SC({ place: 'plain', actors: [{ who: 'rosa', x: 175, expression: 'love', pose: 'hug' }, { who: 'mia', x: 230, expression: 'happy', pose: 'hug', facing: 'left' }] })),
      e('point', 'اشاره کردن', 'to point', 'wijzen', 'zeigen', P('sam', 'neutral', 'point')),
      e('cook', 'آشپزی کردن', 'to cook', 'koken', 'kochen', SC({ place: 'kitchen', actors: [{ who: 'dani', x: 180, expression: 'happy', pose: 'hold', holds: 'soup' }], effects: [{ id: 'steam', x: 215, y: 120 }] })),
      e('celebrate', 'جشن گرفتن', 'to celebrate', 'vieren', 'feiern', P('tony', 'laugh', 'cheer')),
      e('shrug', 'شانه بالا انداختن', 'to shrug', 'je schouders ophalen', 'mit den Schultern zucken', P('ryan', 'neutral', 'shrug')),
      e('sit', 'نشستن', 'to sit', 'zitten', 'sitzen', P('rosa', 'happy', 'sit')),
    ],
  },
  {
    id: 'home',
    title: { fa: 'وسایل خانه', en: 'Home', nl: 'In huis', de: 'Zuhause' },
    entries: [
      e('chair', 'صندلی', 'chair', 'de stoel', 'der Stuhl', O('chair')),
      e('table', 'میز', 'table', 'de tafel', 'der Tisch', O('table')),
      e('bed', 'تخت', 'bed', 'het bed', 'das Bett', O('bed')),
      e('sofa', 'مبل', 'sofa', 'de bank', 'das Sofa', O('sofa')),
      e('lamp', 'چراغ', 'lamp', 'de lamp', 'die Lampe', O('lamp')),
      e('door', 'در', 'door', 'de deur', 'die Tür', O('door')),
      e('window', 'پنجره', 'window', 'het raam', 'das Fenster', O('window')),
      e('key', 'کلید', 'key', 'de sleutel', 'der Schlüssel', O('key')),
      e('clock', 'ساعت', 'clock', 'de klok', 'die Uhr', O('clock')),
      e('tv', 'تلویزیون', 'TV', 'de tv', 'der Fernseher', O('tv')),
      e('fridge', 'یخچال', 'fridge', 'de koelkast', 'der Kühlschrank', O('fridge')),
      e('stove', 'اجاق', 'stove', 'het fornuis', 'der Herd', O('stove')),
      e('microwave', 'مایکروویو', 'microwave', 'de magnetron', 'die Mikrowelle', O('microwave')),
      e('washing-machine', 'ماشین لباس‌شویی', 'washing machine', 'de wasmachine', 'die Waschmaschine', O('washing-machine')),
      e('kettle', 'کتری', 'kettle', 'de waterkoker', 'der Wasserkocher', O('kettle')),
      e('phone', 'گوشی', 'phone', 'de telefoon', 'das Handy', O('phone')),
      e('laptop', 'لپ‌تاپ', 'laptop', 'de laptop', 'der Laptop', O('laptop')),
      e('book', 'کتاب', 'book', 'het boek', 'das Buch', O('book')),
      e('pen', 'خودکار', 'pen', 'de pen', 'der Kuli', O('pen')),
      e('bag', 'کیف', 'bag', 'de tas', 'die Tasche', O('bag')),
      e('backpack', 'کوله‌پشتی', 'backpack', 'de rugzak', 'der Rucksack', O('backpack')),
      e('umbrella', 'چتر', 'umbrella', 'de paraplu', 'der Regenschirm', O('umbrella')),
      e('glasses', 'عینک', 'glasses', 'de bril', 'die Brille', O('glasses')),
      e('toothbrush', 'مسواک', 'toothbrush', 'de tandenborstel', 'die Zahnbürste', O('toothbrush')),
      e('letter', 'نامه', 'letter', 'de brief', 'der Brief', O('letter')),
      e('calendar', 'تقویم', 'calendar', 'de kalender', 'der Kalender', O('calendar')),
      e('camera', 'دوربین', 'camera', 'de camera', 'die Kamera', O('camera')),
      e('guitar', 'گیتار', 'guitar', 'de gitaar', 'die Gitarre', O('guitar')),
      e('ball', 'توپ', 'ball', 'de bal', 'der Ball', O('ball')),
      e('gift', 'هدیه', 'gift', 'het cadeau', 'das Geschenk', O('gift')),
    ],
  },
  {
    id: 'food',
    title: { fa: 'خوراکی و نوشیدنی', en: 'Food and drink', nl: 'Eten en drinken', de: 'Essen und Trinken' },
    entries: [
      e('bread', 'نان', 'bread', 'het brood', 'das Brot', O('bread')),
      e('apple', 'سیب', 'apple', 'de appel', 'der Apfel', O('apple')),
      e('banana', 'موز', 'banana', 'de banaan', 'die Banane', O('banana')),
      e('orange', 'پرتقال', 'orange', 'de sinaasappel', 'die Orange', O('orange')),
      e('egg', 'تخم‌مرغ', 'egg', 'het ei', 'das Ei', O('egg')),
      e('cheese', 'پنیر', 'cheese', 'de kaas', 'der Käse', O('cheese')),
      e('milk', 'شیر', 'milk', 'de melk', 'die Milch', O('milk')),
      e('rice', 'برنج', 'rice', 'de rijst', 'der Reis', O('rice')),
      e('soup', 'سوپ', 'soup', 'de soep', 'die Suppe', O('soup')),
      e('pizza', 'پیتزا', 'pizza', 'de pizza', 'die Pizza', O('pizza')),
      e('cake', 'کیک', 'cake', 'de taart', 'der Kuchen', O('cake')),
      e('coffee', 'قهوه', 'coffee', 'de koffie', 'der Kaffee', O('coffee')),
      e('tea', 'چای', 'tea', 'de thee', 'der Tee', O('tea')),
      e('water', 'آب', 'water', 'het water', 'das Wasser', O('water')),
      e('plate', 'بشقاب', 'plate', 'het bord', 'der Teller', O('plate')),
      e('cup', 'فنجان', 'cup', 'de kop', 'die Tasse', O('cup')),
      e('glass', 'لیوان', 'glass', 'het glas', 'das Glas', O('glass')),
      e('cutlery', 'قاشق و چنگال', 'cutlery', 'het bestek', 'das Besteck', O('fork-knife')),
    ],
  },
  {
    id: 'clothes',
    title: { fa: 'لباس', en: 'Clothes', nl: 'Kleding', de: 'Kleidung' },
    entries: [
      e('shirt', 'پیراهن', 'shirt', 'het overhemd', 'das Hemd', O('shirt')),
      e('dress', 'پیراهن زنانه', 'dress', 'de jurk', 'das Kleid', O('dress')),
      e('jacket', 'کت', 'jacket', 'de jas', 'die Jacke', O('jacket')),
      e('hat', 'کلاه', 'hat', 'de hoed', 'der Hut', O('hat')),
      e('shoe', 'کفش', 'shoe', 'de schoen', 'der Schuh', O('shoe')),
      e('scarf', 'شال‌گردن', 'scarf', 'de sjaal', 'der Schal', O('scarf')),
    ],
  },
  {
    id: 'money-health',
    title: { fa: 'پول و سلامت', en: 'Money and health', nl: 'Geld en gezondheid', de: 'Geld und Gesundheit' },
    entries: [
      e('money', 'پول', 'money', 'het geld', 'das Geld', O('money')),
      e('coins', 'سکه', 'coins', 'de munten', 'die Münzen', O('coins')),
      e('bank-card', 'کارت بانکی', 'bank card', 'de pinpas', 'die Bankkarte', O('card')),
      e('receipt', 'رسید', 'receipt', 'de bon', 'der Kassenbon', O('receipt')),
      e('cart', 'چرخ خرید', 'shopping cart', 'het winkelwagentje', 'der Einkaufswagen', O('cart')),
      e('basket', 'سبد', 'basket', 'de mand', 'der Korb', O('basket')),
      e('pill', 'قرص', 'pill', 'de pil', 'die Tablette', O('pill')),
      e('medicine', 'دارو', 'medicine', 'het medicijn', 'das Medikament', O('medicine-bottle')),
      e('thermometer', 'دماسنج', 'thermometer', 'de thermometer', 'das Thermometer', O('thermometer')),
      e('first-aid', 'جعبهٔ کمک‌های اولیه', 'first-aid kit', 'de verbanddoos', 'der Verbandskasten', O('first-aid')),
    ],
  },
  {
    id: 'transport',
    title: { fa: 'رفت‌وآمد و سفر', en: 'Transport and travel', nl: 'Vervoer en reizen', de: 'Verkehr und Reisen' },
    entries: [
      e('car', 'ماشین', 'car', 'de auto', 'das Auto', O('car')),
      e('bicycle', 'دوچرخه', 'bicycle', 'de fiets', 'das Fahrrad', O('bicycle')),
      e('bus', 'اتوبوس', 'bus', 'de bus', 'der Bus', O('bus')),
      e('train', 'قطار', 'train', 'de trein', 'der Zug', O('train')),
      e('plane', 'هواپیما', 'plane', 'het vliegtuig', 'das Flugzeug', O('plane')),
      e('suitcase', 'چمدان', 'suitcase', 'de koffer', 'der Koffer', O('suitcase')),
      e('ticket', 'بلیت', 'ticket', 'het kaartje', 'die Fahrkarte', O('ticket')),
      e('map', 'نقشه', 'map', 'de kaart', 'die Karte', O('map')),
    ],
  },
  {
    id: 'animals',
    title: { fa: 'حیوان‌ها', en: 'Animals', nl: 'Dieren', de: 'Tiere' },
    entries: [
      e('cat', 'گربه', 'cat', 'de kat', 'die Katze', A('pepper')),
      e('dog', 'سگ', 'dog', 'de hond', 'der Hund', A('biscuit')),
      e('parrot', 'طوطی', 'parrot', 'de papegaai', 'der Papagei', A('coco')),
      e('bird', 'پرنده', 'bird', 'de vogel', 'der Vogel', A('bird')),
      e('fish', 'ماهی', 'fish', 'de vis', 'der Fisch', A('fish')),
      e('horse', 'اسب', 'horse', 'het paard', 'das Pferd', A('horse')),
      e('cow', 'گاو', 'cow', 'de koe', 'die Kuh', A('cow')),
      e('sheep', 'گوسفند', 'sheep', 'het schaap', 'das Schaf', A('sheep')),
      e('chicken', 'مرغ', 'chicken', 'de kip', 'das Huhn', A('chicken')),
      e('rabbit', 'خرگوش', 'rabbit', 'het konijn', 'das Kaninchen', A('rabbit')),
      e('mouse', 'موش', 'mouse', 'de muis', 'die Maus', A('mouse')),
      e('lion', 'شیر', 'lion', 'de leeuw', 'der Löwe', A('lion')),
      e('elephant', 'فیل', 'elephant', 'de olifant', 'der Elefant', A('elephant')),
      e('bear', 'خرس', 'bear', 'de beer', 'der Bär', A('bear')),
      e('monkey', 'میمون', 'monkey', 'de aap', 'der Affe', A('monkey')),
      e('duck', 'اردک', 'duck', 'de eend', 'die Ente', A('duck')),
      e('butterfly', 'پروانه', 'butterfly', 'de vlinder', 'der Schmetterling', A('butterfly')),
      e('turtle', 'لاک‌پشت', 'turtle', 'de schildpad', 'die Schildkröte', A('turtle')),
      e('frog', 'قورباغه', 'frog', 'de kikker', 'der Frosch', A('frog')),
    ],
  },
  {
    id: 'places',
    title: { fa: 'مکان‌ها', en: 'Places', nl: 'Plekken', de: 'Orte' },
    entries: [
      e('home', 'خانه', 'home', 'het huis', 'das Zuhause', PL('home')),
      e('kitchen', 'آشپزخانه', 'kitchen', 'de keuken', 'die Küche', PL('kitchen')),
      e('bedroom', 'اتاق خواب', 'bedroom', 'de slaapkamer', 'das Schlafzimmer', PL('bedroom')),
      e('doctor-office', 'مطب', "doctor's office", 'de huisartsenpraktijk', 'die Arztpraxis', PL('doctor')),
      e('street', 'خیابان', 'street', 'de straat', 'die Straße', PL('street')),
      e('park', 'پارک', 'park', 'het park', 'der Park', PL('park')),
      e('shop', 'فروشگاه', 'shop', 'de winkel', 'der Laden', PL('shop')),
      e('cafe', 'کافه', 'café', 'het café', 'das Café', PL('cafe')),
      e('restaurant', 'رستوران', 'restaurant', 'het restaurant', 'das Restaurant', PL('restaurant')),
      e('school', 'مدرسه', 'school', 'de school', 'die Schule', PL('school')),
      e('office', 'دفتر کار', 'office', 'het kantoor', 'das Büro', PL('office')),
      e('station', 'ایستگاه قطار', 'station', 'het station', 'der Bahnhof', PL('station')),
      e('airport', 'فرودگاه', 'airport', 'het vliegveld', 'der Flughafen', PL('airport')),
      e('beach', 'ساحل', 'beach', 'het strand', 'der Strand', PL('beach')),
      e('bank', 'بانک', 'bank', 'de bank', 'die Bank', PL('bank')),
    ],
  },
  {
    id: 'jobs',
    title: { fa: 'شغل‌ها', en: 'Jobs', nl: 'Beroepen', de: 'Berufe' },
    entries: [
      e('doctor', 'دکتر', 'doctor', 'de dokter', 'die Ärztin', P('job:doctor')),
      e('nurse', 'پرستار', 'nurse', 'de verpleger', 'der Pfleger', P('job:nurse')),
      e('teacher', 'معلم', 'teacher', 'de lerares', 'die Lehrerin', P('job:teacher', 'happy', 'point')),
      e('police', 'پلیس', 'police officer', 'de agent', 'der Polizist', P('job:police', 'neutral')),
      e('chef', 'آشپز', 'chef', 'de kok', 'der Koch', P('job:chef', 'happy', 'hold', 'soup')),
      e('waiter', 'گارسون', 'waiter', 'de ober', 'der Kellner', P('job:waiter', 'happy', 'hold', 'plate')),
      e('driver', 'راننده', 'driver', 'de chauffeur', 'der Fahrer', P('job:driver')),
      e('firefighter', 'آتش‌نشان', 'firefighter', 'de brandweervrouw', 'die Feuerwehrfrau', P('job:firefighter')),
      e('farmer', 'کشاورز', 'farmer', 'de boer', 'der Bauer', P('job:farmer')),
      e('builder', 'بنّا', 'builder', 'de bouwvakker', 'der Bauarbeiter', P('job:builder')),
      e('pilot', 'خلبان', 'pilot', 'de piloot', 'die Pilotin', P('job:pilot', 'happy', 'wave')),
      e('mechanic', 'مکانیک', 'mechanic', 'de monteur', 'der Mechaniker', P('job:mechanic')),
      e('cashier', 'صندوق‌دار', 'cashier', 'de caissière', 'die Kassiererin', P('job:cashier')),
      e('student', 'دانشجو', 'student', 'de student', 'der Student', P('job:student', 'happy', 'hold', 'book')),
      e('postman', 'پستچی', 'mail carrier', 'de postbode', 'der Briefträger', P('job:postman', 'happy', 'hold', 'letter')),
      e('engineer', 'مهندس', 'engineer', 'de ingenieur', 'die Ingenieurin', P('job:engineer')),
      e('lawyer', 'وکیل', 'lawyer', 'de advocaat', 'der Anwalt', P('job:lawyer')),
    ],
  },
  {
    id: 'nature',
    title: { fa: 'طبیعت و هوا', en: 'Nature and weather', nl: 'Natuur en weer', de: 'Natur und Wetter' },
    entries: [
      e('sun', 'خورشید', 'sun', 'de zon', 'die Sonne', O('sun')),
      e('cloud', 'ابر', 'cloud', 'de wolk', 'die Wolke', O('cloud')),
      e('moon', 'ماه', 'moon', 'de maan', 'der Mond', O('moon')),
      e('tree', 'درخت', 'tree', 'de boom', 'der Baum', O('tree')),
      e('flower', 'گل', 'flower', 'de bloem', 'die Blume', O('flower')),
      e('rain', 'باران', 'rain', 'de regen', 'der Regen', SC({ place: 'street', actors: [{ who: 'eva', x: 200, expression: 'sad', holds: 'umbrella' }], effects: [{ id: 'rain' }] })),
      e('snow', 'برف', 'snow', 'de sneeuw', 'der Schnee', SC({ place: 'park', actors: [{ who: 'timo', x: 200, expression: 'laugh', pose: 'cheer' }], effects: [{ id: 'snow' }] })),
      e('night', 'شب', 'night', 'de nacht', 'die Nacht', PL('park', true)),
    ],
  },
  {
    id: 'situations',
    title: { fa: 'موقعیت‌ها', en: 'Situations', nl: 'Situaties', de: 'Situationen' },
    entries: [
      e('at-the-doctor', 'پیش دکتر', 'at the doctor', 'bij de dokter', 'beim Arzt', SC({ place: 'doctor', actors: [{ who: 'job:doctor', x: 270, expression: 'happy', pose: 'point', facing: 'left', speaking: true }, { who: 'yusuf', x: 140, expression: 'sick', pose: 'cough' }], effects: [{ id: 'cough', on: 1 }] })),
      e('birthday', 'تولد', 'birthday', 'de verjaardag', 'der Geburtstag', SC({ place: 'home', actors: [{ who: 'mia', x: 150, expression: 'laugh', pose: 'cheer' }, { who: 'rosa', x: 280, expression: 'love', pose: 'hold', holds: 'gift', facing: 'left' }], props: [{ id: 'cake', x: 215, y: 205, scale: 1.4 }], effects: [{ id: 'sparkle', on: 0 }] })),
      e('shopping', 'خرید کردن', 'shopping', 'boodschappen doen', 'einkaufen', SC({ place: 'shop', actors: [{ who: 'eva', x: 170, expression: 'happy', pose: 'hold', holds: 'basket' }], props: [{ id: 'cart', x: 250, y: 210, scale: 1.4 }] })),
      e('waiting-bus', 'منتظر اتوبوس', 'waiting for the bus', 'op de bus wachten', 'auf den Bus warten', SC({ place: 'street', actors: [{ who: 'kim', x: 130, expression: 'tired', pose: 'cross' }], props: [{ id: 'bus', x: 310, y: 205, scale: 1.7 }], effects: [{ id: 'clock', on: 0 }] })),
      e('studying', 'درس خواندن', 'studying', 'studeren', 'lernen', SC({ place: 'school', actors: [{ who: 'nika', x: 200, expression: 'thinking', pose: 'write', holds: 'pen' }], effects: [{ id: 'idea', on: 0 }] })),
      e('working', 'کار کردن', 'working', 'werken', 'arbeiten', SC({ place: 'office', actors: [{ who: 'sam', x: 200, expression: 'thinking', pose: 'hold', holds: 'laptop' }] })),
      e('phone-call', 'تلفن زدن', 'phone call', 'het telefoongesprek', 'das Telefonat', SC({ place: 'home', actors: [{ who: 'nora', x: 200, expression: 'happy', pose: 'phone', holds: 'phone', speaking: true }], effects: [{ id: 'phone-ring', on: 0 }] })),
      e('argument', 'دعوا', 'argument', 'de ruzie', 'der Streit', SC({ place: 'home', actors: [{ who: 'tony', x: 140, expression: 'angry', pose: 'point', speaking: true }, { who: 'sofia', x: 270, expression: 'angry', pose: 'cross', facing: 'left' }], effects: [{ id: 'anger', on: 0 }, { id: 'anger', on: 1 }] })),
      e('apology', 'عذرخواهی', 'apology', 'het excuus', 'die Entschuldigung', SC({ place: 'home', actors: [{ who: 'ryan', x: 150, expression: 'sad', pose: 'shrug', speaking: true }, { who: 'leila', x: 270, expression: 'neutral', pose: 'cross', facing: 'left' }] })),
      e('travel', 'سفر', 'trip', 'de reis', 'die Reise', SC({ place: 'airport', actors: [{ who: 'marta', x: 170, expression: 'laugh', pose: 'wave' }], props: [{ id: 'suitcase', x: 230, y: 205, scale: 1.5 }] })),
      e('party', 'مهمانی', 'party', 'het feest', 'die Party', SC({ place: 'home', time: 'night', actors: [{ who: 'tony', x: 110, expression: 'laugh', pose: 'cheer' }, { who: 'sara', x: 200, expression: 'happy', pose: 'hold', holds: 'camera' }, { who: 'omid', x: 290, expression: 'laugh', pose: 'cheer', facing: 'left' }], effects: [{ id: 'music', on: 0 }, { id: 'sparkle', on: 2 }] })),
      e('ordering', 'سفارش دادن', 'ordering food', 'bestellen', 'bestellen', SC({ place: 'cafe', actors: [{ who: 'adam', x: 130, expression: 'happy', pose: 'point', speaking: true }, { who: 'zara', x: 260, expression: 'happy', pose: 'hold', holds: 'coffee', facing: 'left' }] })),
    ],
  },
];

export function allEntries(): LexEntry[] {
  return LEXICON.flatMap((c) => c.entries);
}
