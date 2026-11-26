import { fetchContentJSON } from '../../contentStore';
import type { SceneResult } from './autoScene';

/**
 * صحنهٔ هر کارت از قبل ساخته شده و در public/data/scenes/<n>.json است (۱۶ تکه، تا همه یک‌جا بار نشود).
 * کلید: conceptId برای کارت‌های معمول، id برای کارت‌های بازی الگو (pat_…).
 * ساختن دوباره: npx tsx scripts/buildScenes.ts
 */
export const SCENE_SHARDS = 16;

export function sceneShard(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % SCENE_SHARDS;
}

const shards: Record<number, Promise<Record<string, SceneResult>>> = {};

export function loadScene(key: string): Promise<SceneResult | undefined> {
  const n = sceneShard(key);
  if (!shards[n]) {
    shards[n] = fetchContentJSON<Record<string, SceneResult>>(`data/scenes/${n}.json`).catch(() => ({}));
  }
  return shards[n].then((m) => m[key]);
}
