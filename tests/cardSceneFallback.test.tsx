import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// تصویر Canva نیست؛ صحنه از فایل صحنه‌ها می‌آید
vi.mock('../contentStore', () => ({
  getContentBaseUrl: () => '/',
  fetchContentJSON: async (p: string) => {
    if (p.includes('card-images/manifest')) return {};
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

describe('صحنه به‌جای تصویر Canva', () => {
  it('کارت معمول (conceptId) صحنه‌اش را نشان می‌دهد', async () => {
    render(<CardImage card={{ conceptId: 'c_test', targetLanguage: 'en', targetText: "Let's go to the doctor" }} />);
    await waitFor(() => expect(screen.getByTestId('card-scene')).toBeInTheDocument());
    expect(screen.getByRole('img', { hidden: true }).getAttribute('aria-label')).toContain('دایی');
  });

  it('کارت بازی الگو (id) هم صحنه دارد', async () => {
    render(<CardImage card={{ id: 'pat_en_frames_1', targetLanguage: 'en', targetText: 'See if you can push it to next week.' }} />);
    await waitFor(() => expect(screen.getByTestId('card-scene')).toBeInTheDocument());
  });
});
