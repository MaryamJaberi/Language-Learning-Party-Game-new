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
  const [selectedLang, setSelectedLang] = useState<Language>(
    currentLanguage === 'de' ? 'de' : 'nl'
  );
  const [settings, setSettings] = useState(getTrainingWheelsSettings());

  // Interactive sample card for previewing visual aids
  const sampleCard: LanguageCard = selectedLang === 'nl'
    ? {
        id: 'sample_nl_diminutive',
        targetLanguage: 'nl',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Vocabulary',
        learningMode: 'Explain',
        prompt: 'کلمهٔ هلندی به همراه حرف تعریف و پسوند مصغر',
        targetText: 'het meisje',
        translation: 'دختربچه',
        article: 'het',
        difficulty: 'easy',
        points: 1
      }
    : {
        id: 'sample_de_neuter',
        targetLanguage: 'de',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Vocabulary',
        learningMode: 'Explain',
        prompt: 'کلمهٔ آلمانی با حرف تعریف خنثی',
        targetText: 'das Mädchen',
        translation: 'دختربچه',
        article: 'das',
        difficulty: 'easy',
        points: 1
      };

  const sampleSentenceCard: LanguageCard = selectedLang === 'nl'
    ? {
        id: 'sample_nl_sep',
        targetLanguage: 'nl',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Sentence',
        learningMode: 'Speak',
        prompt: 'فعل دوتکه هلندی opbellen (زنگ زدن)',
        targetText: 'Ik bel je morgen op',
        translation: 'فردا بهت زنگ می‌زنم',
        difficulty: 'easy',
        points: 1
      }
    : {
        id: 'sample_de_nebensatz',
        targetLanguage: 'de',
        cefrLevel: 'A1',
        topic: 'CAT_EVERYDAY',
        contentType: 'Sentence',
        learningMode: 'Speak',
        prompt: 'جملهٔ پیرو آلمانی با weil و انتقال فعل به انتها',
        targetText: 'Ich lerne Deutsch, weil ich in Berlin wohne',
        translation: 'من آلمانی یاد می‌گیرم چون در برلین زندگی می‌کنم',
        difficulty: 'easy',
        points: 1
      };

  const aids = getAidsForLanguage(selectedLang);
  const stats = getBicycleTrainingStats(selectedLang, currentCefr);

  const activeCount = aids.filter((a) => settings.enabledAids[a.id] !== false).length;

  const handleToggleAid = (aidId: string) => {
    const updated = toggleAidEnabled(aidId);
    setSettings({ ...updated });
  };

  return (
    <div
      data-testid="training-wheels-help-container"
      className="flex flex-col gap-6 w-full text-[var(--ink)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--surface-sunken)] p-4 rounded-xl border border-[var(--border-subtle)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>🚲</span>
            <span>{isRtl ? 'چرخ‌های کمکی شما (Training Wheels)' : 'Your Training Wheels'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {isRtl
              ? 'کمک‌های بصری و صوتی هوشمند که با تثبیت هر واژه در جعبه لایتنر شما، گام‌به‌گام کم‌رنگ می‌شوند تا مستقل شوید.'
              : 'Smart visual and audio learning aids that fade away per word as you master them in your Leitner box.'}
          </p>
        </div>

        {/* Language switch between Dutch and German */}
        <div className="flex items-center gap-1.5 bg-neutral-200 dark:bg-neutral-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setSelectedLang('nl')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              selectedLang === 'nl'
                ? 'bg-white dark:bg-neutral-700 shadow text-indigo-600 dark:text-indigo-300'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            🇳🇱 Nederlands
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang('de')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              selectedLang === 'de'
                ? 'bg-white dark:bg-neutral-700 shadow text-indigo-600 dark:text-indigo-300'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            🇩🇪 Deutsch
          </button>
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
      <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-sm">
        <h3 className="text-sm font-black mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <span>✨</span>
          <span>{isRtl ? 'مراحل ۴گانهٔ کم‌رنگ‌شدن چرخ‌های کمکی (Fading Stages):' : 'The 4 Fading Stages Driven by Leitner Boxes:'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Stage 0 */}
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col items-center text-center">
            <span className="text-xs font-black text-red-600 dark:text-red-400 mb-1">
              {isRtl ? 'مرحله ۰: واژهٔ تازه' : 'Stage 0: New Word'}
            </span>
            <span className="text-[11px] text-neutral-500 mb-2">
              {isRtl ? 'رنگ + نماد هندسی + برچسب' : 'Color + Shape + Label'}
            </span>
            <div className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 w-full flex items-center justify-center">
              <TrainingWheelText card={sampleCard} stage={0} uiLanguage={uiLanguage} />
            </div>
          </div>

          {/* Stage 1 */}
          <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex flex-col items-center text-center">
            <span className="text-xs font-black text-orange-600 dark:text-orange-400 mb-1">
              {isRtl ? 'مرحله ۱: پس از پاسخ درست' : 'Stage 1: After 1 Correct'}
            </span>
            <span className="text-[11px] text-neutral-500 mb-2">
              {isRtl ? 'فقط رنگ + نماد هندسی' : 'Color + Shape (No Label)'}
            </span>
            <div className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 w-full flex items-center justify-center">
              <TrainingWheelText card={sampleCard} stage={1} uiLanguage={uiLanguage} />
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 flex flex-col items-center text-center">
            <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 mb-1">
              {isRtl ? 'مرحله ۲: نزدیک تسلط' : 'Stage 2: Near Mastery'}
            </span>
            <span className="text-[11px] text-neutral-500 mb-2">
              {isRtl ? 'خط زیر باریک و رنگی' : 'Thin Colored Underline'}
            </span>
            <div className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 w-full flex items-center justify-center">
              <TrainingWheelText card={sampleCard} stage={2} uiLanguage={uiLanguage} />
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center text-center">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mb-1">
              {isRtl ? 'مرحله ۳: تسلط کامل' : 'Stage 3: Mastered'}
            </span>
            <span className="text-[11px] text-neutral-500 mb-2">
              {isRtl ? 'متن کاملاً ساده و طبیعی' : 'Clean Normal Text'}
            </span>
            <div className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 w-full flex items-center justify-center">
              <TrainingWheelText card={sampleCard} stage={3} uiLanguage={uiLanguage} />
            </div>
          </div>
        </div>
      </div>

      {/* List of Individual Training Wheels (Aids) with Toggles and Progress Bars */}
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-black flex items-center gap-2">
          <span>⚙️</span>
          <span>
            {isRtl
              ? `تنظیمات چرخ‌های کمکی برای زبان ${selectedLang === 'nl' ? 'هلندی' : 'آلمانی'}:`
              : `Training Wheels Configuration for ${selectedLang === 'nl' ? 'Dutch' : 'German'}:`}
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
                  ? 'bg-[var(--surface-card)] border-[var(--border-subtle)] shadow-sm'
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
                      {isRtl ? aid.titleFa : aid.titleEn}
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {isRtl ? aid.descriptionFa : aid.descriptionEn}
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
                        ? (isRtl ? 'باز کردن چرخ کمکی' : 'Remove wheel early')
                        : (isRtl ? 'نصب مجدد چرخ' : 'Put wheel back')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Progress Bar & Word Counter */}
              <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  <span>
                    {isRtl
                      ? `${noLongerNeed} واژه دیگر به این چرخ کمکی نیاز ندارند`
                      : `${noLongerNeed} words ride without this wheel`}
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
