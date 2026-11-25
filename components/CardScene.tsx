import React, { useEffect, useState } from 'react';
import Scene from '../src/visual/Scene';
import LexThumb from '../src/visual/LexThumb';
import { loadScene } from '../src/visual/sceneStore';
import type { SceneResult } from '../src/visual/autoScene';
import { allEntries } from '../src/visual/lexicon';

/**
 * صحنهٔ کارت از دنیای تصویری «دور» (src/visual). وقتی کارت تصویر Canva ندارد، این نشان داده می‌شود.
 * کلید: conceptId برای کارت‌های معمول، id برای کارت‌های بازی الگو.
 */
export default function CardScene({ sceneKey, className = '' }: { sceneKey?: string; className?: string }) {
  const [scene, setScene] = useState<SceneResult | null>(null);
  useEffect(() => {
    let alive = true;
    setScene(null);
    if (!sceneKey) return;
    loadScene(sceneKey).then((s) => { if (alive && s) setScene(s); }).catch(() => {});
    return () => { alive = false; };
  }, [sceneKey]);

  if (!scene) return null;
  if ('lex' in scene) {
    const entry = allEntries().find((e) => e.id === scene.lex);
    if (!entry) return null;
    return (
      <div className={`card-scene mx-auto ${className}`} style={{ width: 'min(46vw, 24vh)' }} aria-hidden="true">
        <LexThumb visual={entry.visual} className="block w-full h-auto rounded-2xl border border-[var(--line)] shadow-xs" />
      </div>
    );
  }
  return (
    <div className={`card-scene mx-auto ${className}`} style={{ width: 'min(100%, 37vh)' }} aria-hidden="true" data-testid="card-scene">
      <Scene spec={scene} className="block w-full h-auto rounded-2xl border border-[var(--line)] shadow-xs" />
    </div>
  );
}
