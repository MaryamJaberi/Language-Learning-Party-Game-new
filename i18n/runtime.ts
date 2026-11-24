/**
 * لایهٔ زمان‌اجرای ترجمه برای متن‌هایی که در کد به شکل «فارسی یا انگلیسی» نوشته شده‌اند.
 *
 * پیش از این، در کد صدها جا `isRTL ? 'فارسی' : 'English'` بود. نتیجه:
 *  - کاربر عربی/اردو/عبری (که آن‌ها هم راست‌به‌چپ‌اند) متن فارسی می‌دید؛
 *  - کاربر هلندی، آلمانی، ترکی و … همیشه انگلیسی می‌دید.
 *
 * حالا همان جاها `tx(isRTL, 'فارسی', 'English')` است:
 *  - زبان برنامه فارسی ← متن فارسی؛
 *  - زبان دیگر ← ترجمهٔ همان متن انگلیسی از i18n/phrases/<زبان>.json، وگرنه خود انگلیسی؛
 *  - اگر زبان برنامه هنوز تنظیم نشده (مثلاً در یک تست تکی)، همان رفتار قدیم: شرط ← فارسی/انگلیسی.
 *
 * App.tsx با هر تغییر تنظیمات، setUiLanguage را صدا می‌زند.
 */
import nl from './phrases/nl.json';
import ar from './phrases/ar.json';
import de from './phrases/de.json';

type Catalog = Record<string, string>;

const CATALOGS: Record<string, Catalog> = { nl, ar, de };

let current: string | null = null;

export function setUiLanguage(lang: string | null | undefined): void {
  current = lang ? (lang === 'en-US' || lang === 'en-GB' ? 'en' : lang) : null;
}

export function getUiLanguage(): string | null {
  return current;
}

/** فقط برای تست‌ها و ابزار گزارش. */
export function registerCatalog(lang: string, catalog: Catalog): void {
  CATALOGS[lang] = { ...(CATALOGS[lang] || {}), ...catalog };
}

export function getCatalog(lang: string): Catalog {
  return CATALOGS[lang] || {};
}

function lookup(lang: string, en: string): string | undefined {
  const c = CATALOGS[lang];
  if (!c) return undefined;
  const v = c[en];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** متن ثابت: tx(isRTL, 'فارسی', 'English') */
export function tx(faHint: boolean | undefined | null, fa: string, en: string): string {
  const lang = current;
  if (!lang) return faHint ? fa : en;
  if (lang === 'fa') return fa;
  if (lang === 'en') return en;
  return lookup(lang, en) ?? en;
}

/**
 * متن با جای‌خالی: txt(isRTL, 'امتیاز {0}', 'Score {0}', [score])
 * کلید ترجمه همان قالب انگلیسی با {0}، {1}، … است.
 */
export function txt(
  faHint: boolean | undefined | null,
  fa: string,
  en: string,
  args: ReadonlyArray<unknown> = [],
): string {
  const tpl = tx(faHint, fa, en);
  return tpl.replace(/\{(\d+)\}/g, (_, i) => {
    const v = args[Number(i)];
    return v === undefined || v === null ? '' : String(v);
  });
}

const DIGITS: Record<string, string> = {
  fa: '۰۱۲۳۴۵۶۷۸۹',
  ur: '۰۱۲۳۴۵۶۷۸۹',
  ku: '٠١٢٣٤٥٦٧٨٩',
};

/** رقم‌های لاتین را به رقم‌های بومی زبان (فقط برای زبان‌هایی که معمولاً رقم بومی دارند) برمی‌گرداند. */
export function localizeDigits(str: string | number, lang: string | null | undefined): string {
  const set = lang ? DIGITS[lang] : undefined;
  if (!set) return String(str);
  return String(str).replace(/[0-9]/g, (d) => set[Number(d)]);
}

const LOCALE: Record<string, string> = {
  fa: 'fa-IR', en: 'en-GB', 'en-US': 'en-US', nl: 'nl-NL', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
  it: 'it-IT', ar: 'ar', tr: 'tr-TR', ru: 'ru-RU', pt: 'pt-BR', zh: 'zh-CN', ja: 'ja-JP',
  ko: 'ko-KR', hi: 'hi-IN', sv: 'sv-SE', pl: 'pl-PL', uk: 'uk-UA',
};

/** برچسب BCP-47 برای Intl (تاریخ، عدد). */
export function uiLocale(lang?: string | null): string {
  const l = lang || current || 'en';
  return LOCALE[l] || l;
}

export function formatNumber(n: number, lang?: string | null): string {
  try {
    return n.toLocaleString(uiLocale(lang));
  } catch {
    return String(n);
  }
}

export function formatDate(d: Date | number = new Date(), lang?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  try {
    return date.toLocaleDateString(uiLocale(lang), opts);
  } catch {
    return date.toDateString();
  }
}

/**
 * عدد با رقم‌های بومی فقط وقتی زبان برنامه فارسی است.
 * (پیش‌تر `isRTL ? toPersianDigits(x) : x` بود و کاربر عربی هم رقم فارسی می‌دید.)
 */
export function uiDigits(faHint: boolean | undefined | null, value: string | number): string {
  const lang = current ?? (faHint ? 'fa' : 'en');
  return localizeDigits(value, lang);
}

/**
 * نام یک زبان به زبان برنامه: فارسی ← نام فارسی؛ بقیه ← Intl.DisplayNames (مثلاً «Nederlands» برای هلندی،
 * «الهولندية» برای عربی)، وگرنه نام انگلیسی. پیش‌تر کاربر عربی نام فارسی زبان‌ها را می‌دید.
 */
export function langName(
  info: { code: string; name: string; persianName?: string } | null | undefined,
  faHint?: boolean | null,
): string {
  if (!info) return '';
  const lang = current ?? (faHint ? 'fa' : 'en');
  if (lang === 'fa') return info.persianName || info.name;
  if (lang === 'en') return info.name;
  try {
    const dn = new (Intl as any).DisplayNames([uiLocale(lang)], { type: 'language' });
    const v = dn.of(info.code);
    if (v && v !== info.code) return v.charAt(0).toLocaleUpperCase(uiLocale(lang)) + v.slice(1);
  } catch {
    /* ignore */
  }
  return info.name;
}
