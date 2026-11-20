import React, { useEffect, useState } from 'react';
import { fetchContentJSON, getContentBaseUrl } from '../contentStore';

/**
 * تصویر کارت. تصویرها بر اساس conceptId نام‌گذاری شده‌اند، پس یک تصویر برای همهٔ زبان‌های یک کارت کار می‌کند.
 * فهرست تصویرهای آماده در public/data/card-images/manifest.json است و نقشهٔ کامل (چه تصویری، کدام شخصیت، کدام پرامپت)
 * در data/card-images/plan.json. اگر کارتی هنوز تصویر نداشته باشد، چیزی نشان داده نمی‌شود و خطایی هم پیش نمی‌آید.
 */
type Manifest = Record<string, { file: string; character?: string }>;

let manifestPromise: Promise<Manifest> | null = null;
function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = fetchContentJSON<Manifest>('data/card-images/manifest.json').catch(() => ({} as Manifest));
  }
  return manifestPromise;
}

/** conceptId را از شناسهٔ کارت (مثل csv_1_nl) هم می‌شود ساخت، ولی کارت‌ها conceptId خودشان را دارند. */
export default function CardImage({ conceptId, className = '' }: { conceptId?: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setFailed(false);
    if (!conceptId) return;
    loadManifest().then((m) => {
      const entry = m[conceptId];
      if (alive && entry) setSrc(getContentBaseUrl() + 'data/card-images/' + entry.file);
    });
    return () => {
      alive = false;
    };
  }, [conceptId]);

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
