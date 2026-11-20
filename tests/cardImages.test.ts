import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/data/card-images/manifest.json'), 'utf-8'));
const plan: Array<{ conceptId: string; status: string; file: string }> = JSON.parse(
  fs.readFileSync(path.join(root, 'data/card-images/plan.json'), 'utf-8'),
);

describe('card images', () => {
  it('every image in the manifest exists on disk and is planned as done', () => {
    const byId = new Map(plan.map((p) => [p.conceptId, p]));
    for (const [conceptId, entry] of Object.entries<{ file: string }>(manifest)) {
      expect(fs.existsSync(path.join(root, 'public/data/card-images', entry.file))).toBe(true);
      expect(byId.get(conceptId)?.status).toBe('done');
    }
  });

  it('every done plan row is in the manifest', () => {
    for (const p of plan.filter((r) => r.status === 'done')) expect(manifest[p.conceptId]).toBeTruthy();
  });

  it('plan has one row per concept', () => {
    expect(new Set(plan.map((p) => p.conceptId)).size).toBe(plan.length);
  });
});
