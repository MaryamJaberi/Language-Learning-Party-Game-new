import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// c_canva_only تصویر Canva دارد؛ c_test و کارت الگو ندارند و صحنهٔ موقت می‌گیرند
vi.mock('../contentStore', () => ({
  getContentBaseUrl: () => '/',
  fetchContentJSON: async (p: string) => {
    if (p.includes('card-images/manifest')) return { c_canva_only: { file: 'c_canva_only.webp' } };
    if (p.includes('card-images/text')) return {};
    if (p.includes('data/scenes/')) {
      return {
        c_test: { place: 'home', actors: [{ who: 'omid', x: 140, expression: 'worried', speaking: true }, { who: 'yusuf', x: 268, facing: 'left', expression: 'sick', pose: 'cough' }], caption: 'دایی نگران بابابزرگ' },
        pat_en_frames_1: { place: 'office', actors: [{ who: 'sam', x: 140 }] },
      };
    }
    return {};
  },
}));

vi.mock('../src/visual/sceneStore', async (orig) => {
  const real: any = await orig();
  return { ...real, sceneShard: () => 0 };
});

import CardImage from '../components/CardImage';

describe('اول تصویر Canva، بعد صحنهٔ موقت', () => {
  it('کارتی که تصویر Canva دارد، همان را نشان می‌دهد', async () => {
    const { container } = render(<CardImage card={{ conceptId: 'c_canva_only', targetLanguage: 'en', targetText: 'x' }} />);
    await waitFor(() => expect(container.querySelector('img.card-image')).not.toBeNull());
  });

  it('کارت بی‌تصویر Canva صحنهٔ موقتش را نشان می‌دهد', async () => {
    render(<CardImage card={{ conceptId: 'c_test', targetLanguage: 'en', targetText: "Let's go to the doctor" }} />);
    await waitFor(() => expect(screen.getByTestId('card-scene')).toBeInTheDocument());
    expect(screen.getByRole('img', { hidden: true }).getAttribute('aria-label')).toContain('دایی');
  });

  it('کارت بازی الگو (id) هم صحنه دارد', async () => {
    render(<CardImage card={{ id: 'pat_en_frames_1', targetLanguage: 'en', targetText: 'See if you can push it to next week.' }} />);
    await waitFor(() => expect(screen.getByTestId('card-scene')).toBeInTheDocument());
  });
});

describe('دیکشنری تصویری', () => {
  it('هر واژهٔ دیکشنری یک ردیف در نقشهٔ تصویرها دارد', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { allEntries } = await import('../src/visual/lexicon');
    const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/card-images/plan.json'), 'utf-8'));
    const ids = new Set(plan.map((r: any) => r.conceptId));
    for (const e of allEntries()) expect(ids.has(`d_${e.id}`)).toBe(true);
  });
});
