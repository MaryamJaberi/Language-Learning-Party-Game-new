import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DuelSetupModal } from '../components/DuelSetupModal';

describe('دوئل: زبان مادری از تنظیمات خوانده می‌شود', () => {
  beforeEach(() => localStorage.clear());

  it('هلندی‌زبانی که انگلیسی یاد می‌گیرد دسته‌های الگو را می‌بیند', () => {
    render(<DuelSetupModal isOpen onClose={vi.fn()} onStartDuel={vi.fn()} currentLanguage={'en' as any} uiLanguage={'nl' as any} nativeLanguage={'nl' as any} isRTL={false} />);
    const picker = screen.getByTestId('pattern-picker-duel');
    expect(picker.querySelectorAll('button[aria-pressed]').length).toBeGreaterThan(5);
  });

  it('بدون زبان مادری در تنظیمات، رفتار قبلی (حدس از زبان برنامه) می‌ماند', () => {
    render(<DuelSetupModal isOpen onClose={vi.fn()} onStartDuel={vi.fn()} currentLanguage={'en' as any} uiLanguage={'en' as any} isRTL={false} />);
    const picker = screen.getByTestId('pattern-picker-duel');
    expect(picker.querySelectorAll('button[aria-pressed]').length).toBe(0);
  });
});
