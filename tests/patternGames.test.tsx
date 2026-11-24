import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EN_PATTERNS } from '../patterns/en';
import { getPatternCards, applyPatternDeck, setPatternPrefs, getPatternPrefs, hasPatternDeck, getPatternCategories } from '../patterns';
import { generateChallengingReflexOptions } from '../utils/testQuestionEngine';
import { chunkSentence } from '../src/engine/longSentence/chunker';
import PatternGamePicker from '../components/PatternGamePicker';

const allIds = EN_PATTERNS.categories.map((c) => c.id);

describe('بازی‌های الگو: داده', () => {
  it('هر ردیف کامل است و گزینه‌های غلط با جواب درست یکی نیستند', () => {
    const seen = new Set<string>();
    for (const cat of EN_PATTERNS.categories) {
      expect(cat.id.startsWith('PAT_')).toBe(true);
      expect(cat.items.length).toBeGreaterThanOrEqual(8);
      for (const [text, fa, wrong, noteFa, noteEn] of cat.items) {
        const correct = text.split('|').map((s) => s.trim()).join(' ');
        expect(text.split('|').length).toBeGreaterThanOrEqual(2);
        expect(fa.trim().length).toBeGreaterThan(0);
        expect(noteFa.trim().length).toBeGreaterThan(0);
        expect(noteEn.trim().length).toBeGreaterThan(0);
        expect(wrong).toHaveLength(3);
        expect(new Set([correct, ...wrong]).size).toBe(4);
        expect(seen.has(correct)).toBe(false);
        seen.add(correct);
      }
    }
  });

  it('کارت‌ها شناسهٔ یکتا و تکه‌هایی دارند که کنار هم همان جمله می‌شوند', () => {
    const cards = getPatternCards('en', 'fa', allIds);
    expect(cards.length).toBeGreaterThan(100);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    for (const c of cards) {
      expect(c.puzzleChunks!.join(' ')).toBe(c.targetText);
      expect(c.fixedOptions).toHaveLength(3);
    }
  });

  it('برای جفت‌زبانی که محتوا ندارد چیزی برنمی‌گرداند', () => {
    expect(hasPatternDeck('en-US', 'fa')).toBe(true);
    expect(hasPatternDeck('nl', 'fa')).toBe(false);
    expect(getPatternCards('nl', 'fa', allIds)).toEqual([]);
  });
});

describe('بازی‌های الگو: انتخاب در هر حالت بازی', () => {
  beforeEach(() => localStorage.clear());

  it('بدون انتخاب، کارت‌های معمول می‌آید', () => {
    const fallback = [{ id: 'x' } as any];
    expect(applyPatternDeck('solo', ['en'], 'fa', () => fallback)).toBe(fallback);
  });

  it('انتخاب هر حالت جداست و تعداد کارت رعایت می‌شود', () => {
    setPatternPrefs('duel', ['PAT_HAVE_BEEN']);
    expect(getPatternPrefs('solo')).toEqual([]);
    const duel = applyPatternDeck('duel', ['en'], 'fa', () => []);
    expect(duel.length).toBe(10);
    expect(duel.every((c) => c.topic === 'PAT_HAVE_BEEN')).toBe(true);
    setPatternPrefs('solo', ['PAT_FRAMES', 'PAT_QUICK']);
    expect(applyPatternDeck('solo', ['en'], 'fa', () => [], 5)).toHaveLength(5);
  });

  it('اگر زبان هدف محتوا نداشته باشد به کارت‌های معمول برمی‌گردد', () => {
    setPatternPrefs('group', ['PAT_FRAMES']);
    const fallback = [{ id: 'nl1' } as any];
    expect(applyPatternDeck('group', ['nl'], 'fa', () => fallback)).toBe(fallback);
    expect(applyPatternDeck('group', ['nl', 'en-US'], 'fa', () => fallback)[0].topic).toBe('PAT_FRAMES');
  });
});

describe('بازی دونفره: کدام درست است؟', () => {
  it('چهار گزینه = جواب درست + سه اشتباه رایج، و روی هر دو گوشی یک ترتیب', () => {
    for (const card of getPatternCards('en', 'fa', allIds)) {
      const a = generateChallengingReflexOptions(card, [], 'en' as any);
      const b = generateChallengingReflexOptions(JSON.parse(JSON.stringify(card)), [card], 'en' as any);
      expect(a).toEqual(b);
      expect([...a].sort()).toEqual([card.targetText, ...card.fixedOptions!].sort());
    }
  });

  it('جواب درست همیشه در یک جای ثابت نیست', () => {
    const pos = new Set(getPatternCards('en', 'fa', allIds).map((c) => generateChallengingReflexOptions(c, [], 'en' as any).indexOf(c.targetText)));
    expect(pos.size).toBe(4);
  });
});

describe('تکه‌بندی خودکار: قالب آغازین یک تکه می‌ماند', () => {
  it('See if you can / It would be great if', () => {
    expect(chunkSentence('See if you can move the meeting to next week please', 'en', 3)[0]).toBe('See if you can');
    expect(chunkSentence('It would be great if we could meet on Friday morning', 'en', 5)[0]).toBe('It would be great if');
    const parts = chunkSentence('It would be great if we could meet on Friday morning', 'en', 5);
    expect(parts.join(' ')).toBe('It would be great if we could meet on Friday morning');
    expect(parts).toHaveLength(5);
  });
});

describe('انتخابگر بازی الگو', () => {
  beforeEach(() => localStorage.clear());

  it('دسته‌ها را نشان می‌دهد و انتخاب را ذخیره می‌کند', () => {
    render(<PatternGamePicker mode="duel" targetLanguage="en" nativeLanguage="fa" isRTL />);
    const first = getPatternCategories('en')[0];
    fireEvent.click(screen.getByText(first.title.fa));
    expect(getPatternPrefs('duel')).toEqual([first.id]);
    fireEvent.click(screen.getByText('پاک کردن'));
    expect(getPatternPrefs('duel')).toEqual([]);
  });

  it('برای زبانی که هنوز آماده نیست دکمه‌ای نشان نمی‌دهد', () => {
    render(<PatternGamePicker mode="solo" targetLanguage="nl" nativeLanguage="fa" isRTL />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
