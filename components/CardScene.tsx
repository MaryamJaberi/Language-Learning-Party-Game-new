import React, { useEffect, useState } from 'react';
import Scene from '../src/visual/Scene';
import LexThumb from '../src/visual/LexThumb';
import { loadScene } from '../src/visual/sceneStore';
import type { SceneResult } from '../src/visual/autoScene';
import { allEntries } from '../src/visual/lexicon';
import ArtScene, { useArt, artCovers } from '../src/visual/ArtScene';
import ArtThumb, { artHasVisual } from '../src/visual/ArtThumb';

/**
 * صحنهٔ کارت. موقعیت کارت (چه کسی، کجا، با چه حالی) از src/visual می‌آید و با تکه‌های Canva
 * (public/data/art) چیده می‌شود. اگر تکه‌ای نبود، طرح کدی جایش را می‌گیرد.
 * کلید: conceptId برای کارت‌های معمول، id برای کارت‌های بازی الگو.
 */
export default function CardScene({ sceneKey, className = '' }: { sceneKey?: string; className?: string }) {
  const [scene, setScene] = useState<SceneResult | null>(null);
  const art = useArt();
  useEffect(() => {
    let alive = true;
    setScene(null);
    if (!sceneKey) return;
    loadScene(sceneKey).then((s) => { if (alive && s) setScene(s); }).catch(() => {});
    return () => { alive = false; };
  }, [sceneKey]);

  // none = عمداً بدون تصویر (تصویر بی‌ربط بدتر از بی‌تصویری است)
  if (!scene || 'none' in scene) return null;
  if ('lex' in scene) {
    const entry = allEntries().find((e) => e.id === scene.lex);
    if (!entry) return null;
    return (
      <div className={`card-scene mx-auto ${className}`} style={{ width: 'min(46vw, 24vh)' }} aria-hidden="true">
        {art && artHasVisual(art, entry.visual) ? (
          <ArtThumb visual={entry.visual} art={art} className="block w-full h-auto rounded-2xl border border-[var(--line)] shadow-xs" />
        ) : (
          <LexThumb visual={entry.visual} className="block w-full h-auto rounded-2xl border border-[var(--line)] shadow-xs" />
        )}
      </div>
    );
  }
  return (
    <div className={`card-scene mx-auto ${className}`} style={{ width: 'min(100%, 37vh)' }} aria-hidden="true" data-testid="card-scene">
      {art && artCovers(art, scene) ? (
        <ArtScene spec={scene} art={art} className="block w-full h-auto rounded-2xl border border-[var(--line)] shadow-xs" />
      ) : (
        <Scene spec={scene} className="block w-full h-auto rounded-2xl border border-[var(--line)] shadow-xs" />
      )}
    </div>
  );
}
