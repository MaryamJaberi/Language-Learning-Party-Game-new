import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SentencePuzzle from '../components/SentencePuzzle';
import {
  chunkSentence, isLongSentence, piecesForStage, shuffledOrder,
  getPuzzleStage, recordPuzzleSolved, MAX_PUZZLE_STAGE,
} from '../src/engine/longSentence/chunker';

const LONG = "I'll keep the card statement until the merchant name matches the shop I walked into; a string of digits is not a shop I can query.";

describe('پازل تکه‌ها — شکستن جمله', () => {
  it('جملهٔ کوتاه پازل نمی‌شود، جملهٔ بلند می‌شود', () => {
    expect(isLongSentence('Where is the station?', 'en')).toBe(false);
    expect(isLongSentence(LONG, 'en')).toBe(true);
  });

  it('چسباندن تکه‌ها همان جمله را می‌دهد (در هر مرحله و چند زبان)', () => {
    const samples: [string, string][] = [
      [LONG, 'en'],
      ['Ik houd het rekeninguittreksel tot de winkelnaam klopt met de zaak waar ik binnenging; een rij cijfers is geen winkel.', 'nl'],
      ['تا اسم پذیرنده با فروشگاهی که وارد شدم یکی شود صورتحساب کارت را نگه می‌دارم؛ رشته رقم مغازه‌ای نیست که پیگیری کنم.', 'fa'],
    ];
    for (const [text, lang] of samples) {
      for (let stage = 0; stage < MAX_PUZZLE_STAGE; stage++) {
        const chunks = chunkSentence(text, lang, piecesForStage(stage));
        expect(chunks.join(' ')).toBe(text);
        expect(chunks.length).toBeLessThanOrEqual(piecesForStage(stage));
        expect(chunks.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('اول از مرز طبیعی (نقطه‌ویرگول) می‌شکند', () => {
    const chunks = chunkSentence(LONG, 'en', 2);
    expect(chunks[0].endsWith('into;')).toBe(true);
  });

  it('چینی و ژاپنی بدون فاصله هم درست شکسته و دوباره چسبانده می‌شوند', () => {
    const zh = '他们估计停电只会持续几分钟，可是这几分钟好像是用另一只钟算出来的。';
    const chunks = chunkSentence(zh, 'zh', 3);
    expect(chunks.join('')).toBe(zh);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('ترتیب درهم پایدار است و هیچ‌وقت همان ترتیب درست نیست', () => {
    for (let n = 2; n <= 7; n++) {
      const a = shuffledOrder(n, 'x' + n);
      expect(a).toEqual(shuffledOrder(n, 'x' + n));
      expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(a.every((v, i) => v === i)).toBe(false);
    }
  });
});

describe('پازل تکه‌ها — مرحله‌ها (داربست کم‌کم برداشته می‌شود)', () => {
  beforeEach(() => localStorage.clear());

  it('با حل تمیز یک مرحله جلو می‌رود و بعد از مرحلهٔ آخر پازل تمام می‌شود', () => {
    expect(getPuzzleStage('en:c1')).toBe(0);
    expect(recordPuzzleSolved('en:c1', 0)).toBe(1);
    expect(recordPuzzleSolved('en:c1', 1)).toBe(2);
    expect(recordPuzzleSolved('en:c1', 0)).toBe(MAX_PUZZLE_STAGE);
    expect(recordPuzzleSolved('en:c1', 0)).toBe(MAX_PUZZLE_STAGE);
  });

  it('با اشتباه زیاد در همان مرحله می‌ماند', () => {
    expect(recordPuzzleSolved('en:c2', 4)).toBe(0);
  });
});

describe('پازل تکه‌ها — رابط', () => {
  it('انتخاب نادرست جلو نمی‌رود؛ چیدن درست onSolved را با تعداد اشتباه صدا می‌زند', () => {
    vi.useFakeTimers();
    const onSolved = vi.fn();
    render(<SentencePuzzle text={LONG} lang="en" stage={0} isRTL={false} onSolved={onSolved} onSkipPuzzle={() => {}} />);
    const piece = (i: number) => screen.getAllByTestId('sentence-puzzle-piece').find((b) => b.getAttribute('data-piece') === String(i))!;
    const total = screen.getAllByTestId('sentence-puzzle-piece').length;
    fireEvent.click(piece(1)); // نادرست: هنوز تکهٔ ۰ چیده نشده
    expect(screen.getAllByTestId('sentence-puzzle-piece').length).toBe(total);
    for (let i = 0; i < total; i++) fireEvent.click(piece(i));
    act(() => { vi.runAllTimers(); });
    expect(onSolved).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('sentence-puzzle-built').textContent).toBe(LONG);
    vi.useRealTimers();
  });

  it('دکمهٔ «خودم می‌نویسم» پازل را کنار می‌گذارد', () => {
    const onSkip = vi.fn();
    render(<SentencePuzzle text={LONG} lang="en" stage={0} isRTL={false} onSolved={() => {}} onSkipPuzzle={onSkip} />);
    fireEvent.click(screen.getByText(/type or say it myself/i));
    expect(onSkip).toHaveBeenCalled();
  });
});
