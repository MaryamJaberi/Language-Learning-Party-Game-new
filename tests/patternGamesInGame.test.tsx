import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SinglePlayerScreen from '../screens/SinglePlayerScreen';
import { sound } from '../soundManager';
import { getPatternCards } from '../patterns';
import type { LanguageCard, SinglePlayerSettings } from '../types';

const settings = {
  targetLanguage: 'en', nativeLanguage: 'fa', cefrLevel: 'A2', displayMode: 'translate_to_target', questionCount: 1,
  timeLimitSeconds: 0, autoPlayAudio: false, selectedCategories: [],
} as unknown as SinglePlayerSettings;

const mount = (c: LanguageCard) =>
  render(<SinglePlayerScreen initialCards={[c]} initialSettings={settings} uiLanguage="en" onFinish={vi.fn()} onExit={vi.fn()} />);

describe('بازی‌های الگو در تمرین تک‌نفره', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  test('کارت سه‌تکه: پازل با مرزِ خودِ الگو می‌آید و با چیدن درست «درست» حساب می‌شود', () => {
    const ok = vi.spyOn(sound, 'playCorrect');
    const c = getPatternCards('en', 'fa', ['PAT_FRAMES'])[0];
    mount(c);
    const pieces = screen.getAllByTestId('sentence-puzzle-piece');
    expect(pieces.map((p) => p.textContent).sort()).toEqual([...c.puzzleChunks!].sort());
    for (let i = 0; i < pieces.length; i++) fireEvent.click(pieces.find((b) => b.getAttribute('data-piece') === String(i))!);
    act(() => { vi.advanceTimersByTime(600); });
    expect(ok).toHaveBeenCalled();
  });

  test('کارت دوتکه: پازل نیست؛ چهار گزینه (جواب درست + اشتباه‌های رایج) از اول دیده می‌شود', () => {
    const c = getPatternCards('en', 'fa', ['PAT_QUICK']).find((x) => x.puzzleChunks!.length === 2)!;
    mount(c);
    expect(screen.queryByTestId('sentence-puzzle')).toBeNull();
    for (const o of [c.targetText, ...c.fixedOptions!]) expect(screen.getByText(o)).toBeInTheDocument();
  });
});
