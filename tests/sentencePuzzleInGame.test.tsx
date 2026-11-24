import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SinglePlayerScreen from '../screens/SinglePlayerScreen';
import { sound } from '../soundManager';
import { getPuzzleStage } from '../src/engine/longSentence/chunker';
import type { LanguageCard, SinglePlayerSettings } from '../types';

const LONG = "I'll keep the card statement until the merchant name matches the shop I walked into; a string of digits is not a shop I can query.";

const card = (over: Partial<LanguageCard> = {}): LanguageCard => ({
  id: 'long-card', targetText: LONG, translation: 'ترجمهٔ جملهٔ بلند', targetLanguage: 'en', nativeLanguage: 'fa',
  cefrLevel: 'C1', topic: 'Money', contentType: 'Sentence', learningMode: 'Translate', prompt: 'Translate', difficulty: 'hard', points: 10,
  ...over,
} as LanguageCard);

const settings = (over: Partial<SinglePlayerSettings> = {}): SinglePlayerSettings => ({
  targetLanguage: 'en', nativeLanguage: 'fa', cefrLevel: 'C1', displayMode: 'translate_to_target', questionCount: 1,
  timeLimitSeconds: 0, autoPlayAudio: false, selectedCategories: ['Money'], ...over,
} as SinglePlayerSettings);

const mount = (c: LanguageCard, s: SinglePlayerSettings) =>
  render(<SinglePlayerScreen initialCards={[c]} initialSettings={s} uiLanguage="en" onFinish={vi.fn()} onExit={vi.fn()} />);

describe('پازل تکه‌ها در تمرین تک‌نفره', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  test('جملهٔ بلند: پازل می‌آید، با چیدن درست کارت «درست» حساب می‌شود و مرحله جلو می‌رود', () => {
    const ok = vi.spyOn(sound, 'playCorrect');
    mount(card(), settings());
    expect(screen.getByTestId('sentence-puzzle')).toBeInTheDocument();
    const pieces = screen.getAllByTestId('sentence-puzzle-piece');
    const byIdx = (i: number) => pieces.find((b) => b.getAttribute('data-piece') === String(i))!;
    for (let i = 0; i < pieces.length; i++) fireEvent.click(byIdx(i));
    act(() => { vi.advanceTimersByTime(600); });
    expect(ok).toHaveBeenCalled();
    expect(getPuzzleStage('en:long-card')).toBe(1);
  });

  test('جملهٔ کوتاه پازل ندارد', () => {
    mount(card({ id: 'short', targetText: 'Where is the station?' }), settings());
    expect(screen.queryByTestId('sentence-puzzle')).toBeNull();
  });

  test('«خودم می‌نویسم» پازل را برمی‌دارد و کادر نوشتن می‌ماند', () => {
    mount(card(), settings());
    fireEvent.click(screen.getByText(/type or say it myself/i));
    expect(screen.queryByTestId('sentence-puzzle')).toBeNull();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('وقتی پاسخ به زبان مادری است (ترجمه به زبان مادری) پازل نمی‌آید', () => {
    mount(card(), settings({ displayMode: 'translate_to_native' } as any));
    expect(screen.queryByTestId('sentence-puzzle')).toBeNull();
  });
});
