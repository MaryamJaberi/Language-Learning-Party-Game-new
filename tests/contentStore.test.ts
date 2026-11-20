import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchContentJSON,
  setContentMode,
  getContentMode,
  listSavedContent,
  downloadLanguagesForOffline,
  clearSavedContent,
} from '../contentStore';

// Cache Storage ساده در حافظه برای تست
function installFakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return {
      match: async (url: string) => m.get(typeof url === 'string' ? url : (url as any).url)?.clone(),
      put: async (url: string, res: Response) => { m.set(url, res.clone()); },
      keys: async () => Array.from(m.keys()).map((u) => ({ url: u })),
      delete: async (url: string) => m.delete(url),
    };
  };
  (globalThis as any).caches = { open, delete: async (n: string) => stores.delete(n) };
  (window as any).caches = (globalThis as any).caches;
  return stores;
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('contentStore — انتخاب کاربر برای ذخیرهٔ محتوا', () => {
  let stores: Map<string, Map<string, Response>>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.clear();
    stores = installFakeCaches();
    fetchMock = vi.fn(async (url: string) => json({ url }));
    (globalThis as any).fetch = fetchMock;
  });

  it('پیش‌فرض «هوشمند» است', () => {
    expect(getContentMode()).toBe('smart');
  });

  it('در حالت هوشمند، زبان بعد از اولین دانلود روی گوشی می‌ماند', async () => {
    await fetchContentJSON('data/decks/nl.json');
    const saved = await listSavedContent();
    expect(saved.map((s) => s.id)).toContain('nl');
  });

  it('در حالت همیشه آنلاین چیزی ذخیره نمی‌شود و ذخیره‌های قبلی پاک می‌شوند', async () => {
    await fetchContentJSON('data/decks/nl.json');
    await setContentMode('online');
    await fetchContentJSON('data/decks/de.json');
    expect(await listSavedContent()).toEqual([]);
  });

  it('دانلود آفلاین فهرست کارت‌ها و همهٔ زبان‌های انتخابی را ذخیره می‌کند', async () => {
    const res = await downloadLanguagesForOffline(['fa', 'nl']);
    expect(res.failed).toEqual([]);
    const ids = (await listSavedContent()).map((s) => s.id).sort();
    expect(ids).toEqual(['fa', 'meta', 'nl']);
  });

  it('بدون اینترنت، محتوای ذخیره‌شده باز هم کار می‌کند', async () => {
    await fetchContentJSON('data/decks/fa.json');
    fetchMock.mockImplementation(async () => { throw new Error('offline'); });
    const data = await fetchContentJSON<{ url: string }>('data/decks/fa.json');
    expect(data.url).toContain('data/decks/fa.json');
  });

  it('پاک کردن همه، حافظه را خالی می‌کند', async () => {
    await downloadLanguagesForOffline(['fa']);
    await clearSavedContent();
    expect(await listSavedContent()).toEqual([]);
  });
});
