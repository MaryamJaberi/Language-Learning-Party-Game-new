import { describe, it, expect } from 'vitest';
import { generateChallengingReflexOptions, pickTwoChoiceOptions } from '../utils/testQuestionEngine';

// باگ گزارش‌شده: در تمرین دوگزینه‌ای «می‌تونم یک لیوان آب داشته باشم، لطفاً؟» هیچ‌کدام از دو گزینه پاسخ درست نبود.
describe('تمرین دوگزینه‌ای', () => {
  const card: any = {
    id: 'c_could_i_have_a_glass_of_water_please',
    targetText: 'Could I have a glass of water, please?',
    translation: 'می‌تونم یک لیوان آب داشته باشم، لطفاً؟',
    targetLanguage: 'en',
    nativeLanguage: 'fa',
    topic: 'CAT_FOOD',
    cefrLevel: 'A1',
  };

  it('پاسخ درست همیشه یکی از دو گزینه است', () => {
    for (let i = 0; i < 50; i++) {
      const all = generateChallengingReflexOptions(card, [card], 'en');
      const two = pickTwoChoiceOptions(all, card.targetText);
      expect(two).toHaveLength(2);
      expect(two).toContain(card.targetText);
      expect(two[0]).not.toBe(two[1]);
    }
  });

  it('اگر پاسخ درست آخرِ فهرست باشد هم حذف نمی‌شود', () => {
    const two = pickTwoChoiceOptions(['A?', 'B?', 'C?', 'Could I have a glass of water, please?'], card.targetText);
    expect(two).toContain('Could I have a glass of water, please?');
  });

  it('جای پاسخ درست با هر بار صدا زدن عوض نمی‌شود', () => {
    const a = pickTwoChoiceOptions(['x', card.targetText, 'y'], card.targetText);
    const b = pickTwoChoiceOptions(['x', card.targetText, 'y'], card.targetText);
    expect(a).toEqual(b);
  });
});
