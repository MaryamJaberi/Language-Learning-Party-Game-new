/**
 * محتوای بازی (کارت‌ها و ترجمه‌ها) دیگر داخل خود اپ نیست؛ هر زبان وقتی لازم شد از اینترنت می‌آید.
 * کاربر در تنظیمات انتخاب می‌کند که این محتوا روی گوشی ذخیره شود یا نه:
 *
 *  - smart   (پیش‌فرض) هر زبانی که بازی می‌کنی یک بار دانلود و ذخیره می‌شود؛ دفعهٔ بعد بدون اینترنت هم کار می‌کند.
 *  - offline زبان‌های انتخاب‌شده همین حالا کامل دانلود می‌شوند تا بازی کاملاً آفلاین باشد.
 *  - online  هیچ چیزی روی گوشی ذخیره نمی‌شود؛ همه‌چیز همیشه از اینترنت می‌آید.
 */

export type ContentMode = 'smart' | 'offline' | 'online';

export const CONTENT_MODES: ContentMode[] = ['smart', 'offline', 'online'];

const MODE_KEY = 'dour_content_mode';
const CACHE_NAME = 'dour-content-v1';
/** کش قدیمی Service Worker که پیش‌تر کارت‌ها را بی‌اجازه ذخیره می‌کرد */
const LEGACY_CACHES = ['language-decks-cache'];

/** نشانی عمومی سایت؛ نسخهٔ اندروید (که از file:// اجرا می‌شود) محتوا را از اینجا می‌گیرد */
export const PUBLIC_SITE_URL = 'https://maryamjaberi.github.io/Language-Learning-Party-Game/';

const hasWindow = () => typeof window !== 'undefined';
const hasCaches = () => hasWindow() && 'caches' in window;

export function getContentBaseUrl(): string {
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const override = env.VITE_CONTENT_BASE_URL as string | undefined;
  if (override) return override.endsWith('/') ? override : override + '/';
  if (hasWindow() && window.location?.protocol === 'file:') return PUBLIC_SITE_URL;
  const base = (env.BASE_URL as string | undefined) || './';
  return base.endsWith('/') ? base : base + '/';
}

export function getContentMode(): ContentMode {
  try {
    const v = localStorage.getItem(MODE_KEY) as ContentMode | null;
    if (v && CONTENT_MODES.includes(v)) return v;
  } catch {}
  return 'smart';
}

type Listener = (mode: ContentMode) => void;
const listeners = new Set<Listener>();
export function onContentModeChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function setContentMode(mode: ContentMode): Promise<void> {
  if (!CONTENT_MODES.includes(mode)) return;
  try { localStorage.setItem(MODE_KEY, mode); } catch {}
  if (mode === 'online') await clearSavedContent();
  listeners.forEach((fn) => fn(mode));
}

/** پاک کردن کش قدیمی Service Worker (یک بار، بی‌صدا) */
export async function removeLegacyCaches(): Promise<void> {
  if (!hasCaches()) return;
  await Promise.all(LEGACY_CACHES.map((n) => caches.delete(n).catch(() => false)));
}

/**
 * یک فایل JSON محتوا را (مثلاً data/decks/nl.json) با رعایت انتخاب کاربر برمی‌گرداند.
 * در حالت smart/offline: اول از حافظهٔ گوشی، و اگر اینترنت باشد بی‌صدا به‌روزش می‌کند.
 */
export async function fetchContentJSON<T = unknown>(relPath: string): Promise<T> {
  const url = getContentBaseUrl() + relPath.replace(/^\//, '');
  const mode = getContentMode();

  if (mode === 'online' || !hasCaches()) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${relPath}`);
    return res.json() as Promise<T>;
  }

  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(url);
  if (hit) {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      // به‌روزرسانی بی‌صدا در پس‌زمینه
      fetch(url, { cache: 'no-cache' })
        .then((r) => (r.ok ? cache.put(url, r) : undefined))
        .catch(() => {});
    }
    return hit.json() as Promise<T>;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${relPath}`);
  await cache.put(url, res.clone()).catch(() => {});
  return res.json() as Promise<T>;
}

/** دانلود کامل زبان‌ها برای بازی آفلاین. onProgress(انجام‌شده، کل) */
export async function downloadLanguagesForOffline(
  langs: string[],
  onProgress?: (done: number, total: number) => void
): Promise<{ ok: string[]; failed: string[] }> {
  const files = ['data/decks/meta.json', ...Array.from(new Set(langs.filter(Boolean))).map((l) => `data/decks/${l}.json`)];
  const ok: string[] = [];
  const failed: string[] = [];
  if (!hasCaches()) return { ok, failed: files };
  const cache = await caches.open(CACHE_NAME);
  let done = 0;
  onProgress?.(0, files.length);
  for (const f of files) {
    const url = getContentBaseUrl() + f;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      await cache.put(url, res);
      ok.push(f);
    } catch {
      failed.push(f);
    }
    done += 1;
    onProgress?.(done, files.length);
  }
  return { ok, failed };
}

export interface SavedContentItem {
  /** کد زبان، یا 'meta' برای فهرست کارت‌ها */
  id: string;
  bytes: number;
}

export async function listSavedContent(): Promise<SavedContentItem[]> {
  if (!hasCaches()) return [];
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const items: SavedContentItem[] = [];
  for (const req of keys) {
    const m = req.url.match(/data\/decks\/([^/]+)\.json/);
    if (!m) continue;
    const res = await cache.match(req);
    const bytes = res ? (await res.clone().blob()).size : 0;
    items.push({ id: m[1], bytes });
  }
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

export async function clearSavedContent(): Promise<void> {
  if (!hasCaches()) return;
  await caches.delete(CACHE_NAME).catch(() => false);
  await removeLegacyCaches();
}

export async function removeSavedLanguage(lang: string): Promise<void> {
  if (!hasCaches()) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(getContentBaseUrl() + `data/decks/${lang}.json`);
}

export function formatBytes(bytes: number, rtl = false): string {
  const mb = bytes / (1024 * 1024);
  const s = mb >= 1 ? mb.toFixed(1) : (bytes / 1024).toFixed(0);
  const unit = mb >= 1 ? (rtl ? 'مگابایت' : 'MB') : (rtl ? 'کیلوبایت' : 'KB');
  const out = `${s} ${unit}`;
  return rtl ? out.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace('.', '٫') : out;
}
