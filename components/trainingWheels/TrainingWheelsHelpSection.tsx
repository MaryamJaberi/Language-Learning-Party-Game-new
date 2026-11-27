import React, { useState } from 'react';
import { Language, CEFRLevel, LanguageCard } from '../../types';
import { BicycleIllustration } from './BicycleIllustration';
import { TrainingWheelText } from './TrainingWheelText';
import {
  getTrainingWheelsSettings,
  saveTrainingWheelsSettings,
  getBicycleTrainingStats,
  toggleAidEnabled
} from '../../src/engine/trainingWheels/trainingWheelsService';
import { getAidsForLanguage } from '../../src/engine/trainingWheels/languages';
import { tx, txt } from '../../i18n/runtime';

interface TrainingWheelsHelpSectionProps {
  currentLanguage?: Language;
  currentCefr?: CEFRLevel;
  uiLanguage?: string;
}

export const TrainingWheelsHelpSection: React.FC<TrainingWheelsHelpSectionProps> = ({
  currentLanguage = 'nl',
  currentCefr = 'A1',
  uiLanguage = 'fa'
}) => {
  const isRtl = uiLanguage === 'fa' || uiLanguage === 'ar';
  const startLang = String(currentLanguage || 'nl').split('-')[0];
  const [selectedLang, setSelectedLang] = useState<Language>(
    (['nl', 'de', 'en', 'fa'].includes(startLang) ? startLang : 'nl') as Language
  );
  const [settings, setSettings] = useState(getTrainingWheelsSettings());

  const mk = (id: string, lang: string, contentType: string, targetText: string, translation: string, article?: string): LanguageCard => ({
    id, targetLanguage: lang, cefrLevel: 'A1', topic: 'CAT_EVERYDAY', contentType, learningMode: 'Explain',
    prompt: '', targetText, translation, article, difficulty: 'easy', points: 1,
  } as unknown as LanguageCard);

  // نمونهٔ واژه (رنگ و شکل جنس). انگلیسی و فارسی جنس دستوری ندارند، پس نمونهٔ واژه‌شان بی‌رنگ است.
  const SAMPLE_WORD: Record<string, LanguageCard> = {
    nl: mk('sample_nl_diminutive', 'nl', 'Vocabulary', 'het meisje', 'دختربچه', 'het'),
    de: mk('sample_de_neuter', 'de', 'Vocabulary', 'das Mädchen', 'دختربچه', 'das'),
    en: mk('sample_en_time', 'en', 'Sentence', 'We do not work on Monday', 'ما دوشنبه کار نمی‌کنیم'),
    fa: mk('sample_fa_ra', 'fa', 'Sentence', 'من کتاب را نمی‌خوانم', 'I am not reading the book'),
  };
  // نمونهٔ جمله (جای فعل، فعل دوتکه، جملهٔ وابسته)
  const SAMPLE_SENTENCE: Record<string, LanguageCard> = {
    nl: mk('sample_nl_sep', 'nl', 'Sentence', 'Ik bel je morgen op', 'فردا بهت زنگ می‌زنم'),
    de: mk('sample_de_nebensatz', 'de', 'Sentence', 'Ich lerne Deutsch, weil ich in Berlin wohne', 'من آلمانی یاد می‌گیرم چون در برلین زندگی می‌کنم'),
    en: mk('sample_en_question', 'en', 'Sentence', 'Do you work at six?', 'ساعت شش کار می‌کنی؟'),
    fa: mk('sample_fa_clause', 'fa', 'Sentence', 'اگر وقت داشته باشم می‌آیم', 'If I have time, I will come'),
  };
  const sampleCard = SAMPLE_WORD[selectedLang] || SAMPLE_WORD.nl;
  const sampleSentenceCard = SAMPLE_SENTENCE[selectedLang] || SAMPLE_SENTENCE.nl;
  const LANG_TABS: Array<{ code: Language; label: string; fa: string; en: string }> = [
    { code: 'nl' as Language, label: '🇳🇱 Nederlands', fa: 'هلندی', en: 'Dutch' },
    { code: 'de' as Language, label: '🇩🇪 Deutsch', fa: 'آلمانی', en: 'German' },
    { code: 'en' as Language, label: '🇬🇧 English', fa: 'انگلیسی', en: 'English' },
    { code: 'fa' as Language, label: '🇮🇷 فارسی', fa: 'فارسی', en: 'Persian' },
  ];
  const langName = LANG_TABS.find((x) => x.code === selectedLang) || LANG_TABS[0];

  const aids = getAidsForLanguage(selectedLang);
  const stats = getBicycleTrainingStats(selectedLang, currentCefr as CEFRLevel);

  const activeCount = aids.filter((a) => settings.enabledAids[a.id] !== false).length;

  const handleToggleAid = (aidId: string) => {
    const updated = toggleAidEnabled(aidId);
    setSettings({ ...updated });
  };

  return (
    <div
      data-testid="training-wheels-help-container"
      className="flex flex-col gap-6 w-full text-[var(--ink)]"
      dir={((isRtl ? 'rtl' : 'ltr'))}
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--bg)] p-4 rounded-xl border border-[var(--line)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>🚲</span>
            <span>{tx(isRtl, 'چرخ‌های کمکی شما (Training Wheels)', 'Your Training Wheels')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {tx(isRtl, 'کمک‌های بصری و صوتی هوشمند که با تثبیت هر واژه در جعبه لایتنر شما، گام‌به‌گام کم‌رنگ می‌شوند تا مستقل شوید.', 'Smart visual and audio learning aids that fade away per word as you master them in your Leitner box.')}
          </p>
        </div>

        {/* Language switch between Dutch and German */}
        <div className="flex items-center gap-1.5 bg-neutral-200 dark:bg-neutral-800 p-1 rounded-lg">
          {LANG_TABS.map((tab) => (
            <button
              key={tab.code}
              type="button"
              data-testid={`training-wheels-lang-${tab.code}`}
              onClick={() => setSelectedLang(tab.code)}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                selectedLang === tab.code
                  ? 'bg-white dark:bg-neutral-700 shadow text-indigo-600 dark:text-indigo-300'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bicycle Illustration & Global Progress */}
      <BicycleIllustration
        progressPercent={stats.overallRideWithoutWheelsPercent}
        activeWheelsCount={activeCount}
        totalWheelsCount={aids.length}
        isRtl={isRtl}
      />

      {/* 4 Fading Stages Walkthrough Showcase */}
      <div className="bg-[var(--panel)] p-4 rounded-xl border border-[var(--line)] shadow-sm">
        <h3 className="text-sm font-black mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <span>✨</span>
          <span>{tx(isRtl, 'مراحل ۴گانهٔ کم‌رنگ‌شدن چرخ‌های کمکی (Fading Stages):', 'The 4 Fading Stages Driven by Leitner Boxes:')}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Stage 0 */}
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col items-center text-center">
            <span className="text-xs font-black text-red-600 dark:text-red-400 mb-1">
              {tx(isRtl, 'مرحله ۰: واژهٔ تازه', 'Stage 0: New Word')}
            </span>
            <span className="text-[11px] text-neutral-500 mb-2">
              {tx(isRtl, 'رنگ + نماد هندسی + برچسب', 'Color + Shape + Label')}
            </span>
            <div className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 w-full flex items-center justify-center">
              <TrainingWheelText card={sampleCard} stage={0} uiLanguage={uiLanguage} />
            </div>
          </div>

          {/* Stage 1 */}
          <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex flex-col items-center text-center">
            <span className="text-xs font-black text-orange-600 dark:text-orange-400 mb-1">
              {tx(isRtl, 'مرحله ۱: پس از پاسخ درست', 'Stage 1: After 1 Correct')}
            </span>
            <span className="text-[11px] text-neutral-500 mb-2">
              {tx(isRtl, 'فقط رنگ + نماد هندسی', 'Color + Shape (No Label)')}
            </span>
            <div className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 w-full flex items-center justify-center">
              <TrainingWheelText card={sampleCard} stage={1} uiLanguage={uiLanguage} />
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 flex flex-col items-center text-center">
            <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 mb-1">
              {tx(isRtl, 'مرحله ۲: نزدیک تسلط', 'Stage 2: Near Mastery')}
            </span>
            <span className="text-[11px] text-neutral-500 mb-2">
              {tx(isRtl, 'خط زیر باریک و رنگی', 'Thin Colored Underline')}
            </span>
            <div className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 w-full flex items-center justify-center">
              <TrainingWheelText card={sampleCard} stage={2} uiLanguage={uiLanguage} />
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center text-center">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mb-1">
              {tx(isRtl, 'مرحله ۳: تسلط کامل', 'Stage 3: Mastered')}
            </span>
            <span className="text-[11px] text-neutral-500 mb-2">
              {tx(isRtl, 'متن کاملاً ساده و طبیعی', 'Clean Normal Text')}
            </span>
            <div className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 w-full flex items-center justify-center">
              <TrainingWheelText card={sampleCard} stage={3} uiLanguage={uiLanguage} />
            </div>
          </div>
        </div>
      </div>

      {/* نمونهٔ جمله: نشانه‌های دستوری (هر کارت حداکثر دو کمک) */}
      <div data-testid="training-wheels-sentence-sample" className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
          {tx(isRtl, 'نمونهٔ جمله: هر کارت حداکثر دو نشانه دارد', 'Sentence sample: at most two marks per card')}
        </span>
        <span className="text-lg font-black">
          <TrainingWheelText card={sampleSentenceCard} stage={0} uiLanguage={uiLanguage} />
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{sampleSentenceCard.translation}</span>
      </div>

      {/* List of Individual Training Wheels (Aids) with Toggles and Progress Bars */}
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-black flex items-center gap-2">
          <span>⚙️</span>
          <span>
            {txt(isRtl, 'تنظیمات چرخ‌های کمکی برای زبان {1}:', 'Training Wheels Configuration for {0}:', [langName.en, langName.fa])}
          </span>
        </h3>

        {aids.map((aid) => {
          const isEnabled = settings.enabledAids[aid.id] !== false;
          const aidStats = stats.aidsStats.find((s) => s.aidId === aid.id);
          const percent = aidStats?.progressPercent || stats.overallRideWithoutWheelsPercent;
          const noLongerNeed = aidStats?.wordsNoLongerNeeding || 0;

          return (
            <div
              key={aid.id}
              data-testid={`training-wheel-item-${aid.id}`}
              className={`p-4 rounded-xl border transition-all ${
                isEnabled
                  ? 'bg-[var(--panel)] border-[var(--line)] shadow-sm'
                  : 'bg-neutral-100/50 dark:bg-neutral-900/40 border-dashed border-neutral-300 dark:border-neutral-800 opacity-75'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Aid Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {aid.category === 'gender' ? '🎨' : aid.category === 'grammar' ? '📐' : '🎧'}
                    </span>
                    <h4 className="font-bold text-sm sm:text-base">
                      {tx(isRtl, aid.titleFa, aid.titleEn)}
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {tx(isRtl, aid.descriptionFa, aid.descriptionEn)}
                  </p>
                </div>

                {/* Toggle Button: Remove Wheel Early / Put Back */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleAid(aid.id)}
                    aria-label={isRtl ? (isEnabled ? 'باز کردن چرخ کمکی' : 'نصب مجدد چرخ کمکی') : (isEnabled ? 'Remove wheel' : 'Attach wheel')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isEnabled
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow'
                    }`}
                  >
                    <span>{isEnabled ? '🔓' : '🔒'}</span>
                    <span>
                      {isEnabled
                        ? (tx(isRtl, 'باز کردن چرخ کمکی', 'Remove wheel early'))
                        : (tx(isRtl, 'نصب مجدد چرخ', 'Put wheel back'))}
                    </span>
                  </button>
                </div>
              </div>

              {/* Progress Bar & Word Counter */}
              <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  <span>
                    {txt(isRtl, '{0} واژه دیگر به این چرخ کمکی نیاز ندارند', '{0} words ride without this wheel', [noLongerNeed])}
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{percent}%</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
