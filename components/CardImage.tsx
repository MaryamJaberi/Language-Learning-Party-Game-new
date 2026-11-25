import React, { useEffect, useState } from 'react';
import { fetchContentJSON, getContentBaseUrl } from '../contentStore';
import CardScene from './CardScene';
import { loadScene } from '../src/visual/sceneStore';

/**
 * تصویر کارت. تصویرها بر اساس conceptId نام‌گذاری شده‌اند، پس یک تصویر برای همهٔ زبان‌های یک کارت کار می‌کند.
 * فهرست تصویرهای آماده در public/data/card-images/manifest.json است و نقشهٔ کامل (چه تصویری، کدام شخصیت، کدام پرامپت)
 * در data/card-images/plan.json.
 * ترتیب: اول تصویر Canva؛ تا وقتی تصویر Canva کارت ساخته نشده، صحنهٔ موقت دنیای تصویری با کد (src/visual).
 * اگر هیچ‌کدام نبود، چیزی نشان داده نمی‌شود و خطایی هم پیش نمی‌آید.
 */
type Manifest = Record<string, { file: string; character?: string }>;

let manifestPromise: Promise<Manifest> | null = null;
function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = fetchContentJSON<Manifest>('data/card-images/manifest.json').catch(() => ({} as Manifest));
  }
  return manifestPromise;
}

const textIndexes: Record<string, Promise<Record<string, string>>> = {};
function loadTextIndex(lang?: string): Promise<Record<string, string>> {
  if (!lang) return Promise.resolve({});
  if (!textIndexes[lang]) {
    textIndexes[lang] = fetchContentJSON<Record<string, string>>(`data/card-images/text/${lang}.json`).catch(() => ({}));
  }
  return textIndexes[lang];
}

/** همان نرمال‌سازی اسکریپت ingest.py: حروف کوچک، بدون نشانه‌های نگارشی. */
export { loadManifest };

export function normalizeCardText(t?: string): string {
  return (t || '')
    .toLowerCase()
    .trim()
    .replace(/[\s\u200c]+/g, ' ')
    .replace(/[.!?؟,،;:«»"'()\[\]¡¿…]+/g, '')
    .trim();
}

interface CardLike {
  id?: string;
  conceptId?: string;
  targetText?: string;
  targetLanguage?: string;
  translation?: string;
  nativeLanguage?: string;
}

/** شناسهٔ مفهوم کارت: اول conceptId خود کارت، وگرنه از روی متن کارت در فهرست متن‌ها. */
async function resolveConceptId(card: CardLike, manifest: Manifest): Promise<string | undefined> {
  if (card.conceptId && manifest[card.conceptId]) return card.conceptId;
  const byTarget = await loadTextIndex(card.targetLanguage);
  const t = byTarget[normalizeCardText(card.targetText)];
  if (t && manifest[t]) return t;
  const byNative = await loadTextIndex(card.nativeLanguage);
  const n = byNative[normalizeCardText(card.translation)];
  if (n && manifest[n]) return n;
  return undefined;
}

export default function CardImage({ card, className = '' }: { card?: CardLike | null; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [hasScene, setHasScene] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const key = card ? `${card.id}|${card.conceptId}|${card.targetLanguage}|${card.targetText}` : '';
  // کارت‌های الگو با id، بقیه با conceptId
  const sceneKey = card?.id?.startsWith('pat_') ? card.id : card?.conceptId;

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setFailed(false);
    setHasScene(null);
    if (!card) return;
    loadManifest()
      .then(async (m) => {
        const cid = sceneKey && m[sceneKey] ? sceneKey : await resolveConceptId(card, m);
        if (!alive) return;
        if (cid) { setSrc(getContentBaseUrl() + 'data/card-images/' + m[cid].file); setHasScene(false); return; }
        const ok = sceneKey ? await loadScene(sceneKey).then((x) => !!x).catch(() => false) : false;
        if (alive) setHasScene(ok);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (hasScene && !src) return <CardScene sceneKey={sceneKey} className={className} />;
  if (failed && sceneKey) return <CardScene sceneKey={sceneKey} className={className} />;
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`card-image block mx-auto rounded-2xl border border-[var(--line)] object-cover shadow-xs ${className}`}
      style={{ aspectRatio: '3 / 4', maxHeight: '28vh', width: 'auto' }}
    />
  );
}
