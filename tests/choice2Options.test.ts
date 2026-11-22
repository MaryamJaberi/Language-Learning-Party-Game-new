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

  it('در حالت ترجمه به زبان مادری (reverse)، پاسخ درست به زبان مادری در گزینه‌ها هست', () => {
    const nlCard: any = {
      id: 'c_good_morning',
      targetText: 'Goedemorgen',
      translation: 'صبح بخیر',
      targetLanguage: 'nl',
      nativeLanguage: 'fa',
      topic: 'CAT_GREETINGS',
      cefrLevel: 'A1',
    };
    for (let i = 0; i < 20; i++) {
      const all = generateChallengingReflexOptions(nlCard, [nlCard], 'fa', nlCard.translation);
      const two = pickTwoChoiceOptions(all, nlCard.translation);
      expect(two).toHaveLength(2);
      expect(two).toContain('صبح بخیر');
      expect(two).not.toContain('Goedemorgen'); // متن هلندی نباید گزینهٔ ترجمهٔ فارسی باشد
    }
  });
});
