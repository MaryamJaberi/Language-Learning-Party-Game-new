import { Language, CEFRLevel } from '../../../types';
import { TrainingWheelStats, FadingStage } from './types';
import { getAidsForLanguage } from './languages';
import { getLeitnerState } from '../../../leitnerBoxService';
import { getFadingStageForCard } from './fadingEngine';

const STORAGE_TRAINING_WHEELS = 'dor_training_wheels_config_v1';

export interface TrainingWheelsSettings {
  enabledAids: Record<string, boolean>; // aidId -> enabled/disabled
  forceEnableAll: boolean; // Overrides C1/C2 default-off
  audioAdaptiveSpeed: boolean; // Slower TTS at low levels moving to normal
  audioSyllableHighlight: boolean; // Highlight syllables while playing
  customStageOverrides: Record<string, FadingStage>; // cardId -> manual stage
}

export function getDefaultTrainingWheelsSettings(): TrainingWheelsSettings {
  return {
    enabledAids: {
      nl_de_het_colors: true,
      nl_diminutive_het_hint: true,
      nl_separable_verb_link: true,
      nl_v2_verb_highlight: true,
      de_gender_colors: true,
      de_case_endings: true,
      de_subordinate_verb_final: true,
      nl_subordinate_clause: true,
      nl_negation: true,
      nl_time_frames: true,
      de_v2_verb_highlight: true,
      de_separable_verb_link: true,
      de_negation: true,
      de_time_frames: true,
      en_aux_verb_highlight: true,
      en_negation: true,
      en_time_frames: true,
      en_clause: true,
      fa_ra_marker: true,
      fa_negation: true,
      fa_clause: true,
    },
    forceEnableAll: false,
    audioAdaptiveSpeed: true,
    audioSyllableHighlight: true,
    customStageOverrides: {},
  };
}

export function getTrainingWheelsSettings(): TrainingWheelsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_TRAINING_WHEELS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getDefaultTrainingWheelsSettings(),
        ...parsed,
        enabledAids: {
          ...getDefaultTrainingWheelsSettings().enabledAids,
          ...(parsed.enabledAids || {})
        }
      };
    }
  } catch (e) {
    console.warn('Failed to parse training wheels settings:', e);
  }
  return getDefaultTrainingWheelsSettings();
}

export function saveTrainingWheelsSettings(settings: TrainingWheelsSettings): void {
  try {
    localStorage.setItem(STORAGE_TRAINING_WHEELS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save training wheels settings:', e);
  }
}

export function toggleAidEnabled(aidId: string, enabled?: boolean): TrainingWheelsSettings {
  const current = getTrainingWheelsSettings();
  const nextVal = enabled !== undefined ? enabled : !current.enabledAids[aidId];
  current.enabledAids[aidId] = nextVal;
  saveTrainingWheelsSettings(current);
  return current;
}

/**
 * Computes bicycle progress stats for all aids of a specific language
 * Shows how many words no longer need each training wheel and progress percentage
 */
export function getBicycleTrainingStats(
  language: Language,
  cefrLevel: CEFRLevel = 'A1'
): {
  overallRideWithoutWheelsPercent: number;
  totalActiveCards: number;
  masteredCardsCount: number;
  aidsStats: TrainingWheelStats[];
} {
  const aids = getAidsForLanguage(language);
  const leitner = getLeitnerState();
  const relevantCards = leitner.cards.filter(
    (c) => !c.card?.targetLanguage || c.card.targetLanguage === language
  );

  const totalCards = Math.max(relevantCards.length, 10); // Baseline sample
  let masteredCount = 0;

  relevantCards.forEach((c) => {
    const stage = getFadingStageForCard(c.cardId || c.id, cefrLevel);
    if (stage === 3 || c.boxIndex >= 3) {
      masteredCount++;
    }
  });

  const overallPercent = Math.min(100, Math.round((masteredCount / totalCards) * 100));

  const aidsStats: TrainingWheelStats[] = aids.map((aid) => {
    // Each aid computes how many words have graduated from needing it
    const noLongerNeed = masteredCount;
    const progress = Math.min(100, Math.round((noLongerNeed / totalCards) * 100));
    return {
      aidId: aid.id,
      totalWordsEncountered: totalCards,
      wordsNoLongerNeeding: noLongerNeed,
      progressPercent: progress,
    };
  });

  return {
    overallRideWithoutWheelsPercent: overallPercent,
    totalActiveCards: totalCards,
    masteredCardsCount: masteredCount,
    aidsStats,
  };
}

/**
 * Calculates adaptive TTS playback rate:
 * Slower at lower levels (Pre-A1/A1 = 0.75x) progressing to normal 1.0x at higher levels and mastered stage
 */
export function getAdaptiveTtsSpeed(cefrLevel: CEFRLevel, stage: FadingStage = 0): number {
  const settings = getTrainingWheelsSettings();
  if (!settings.audioAdaptiveSpeed) return 1.0;

  // Mastered stage always plays at normal speed
  if (stage === 3) return 1.0;

  switch (cefrLevel) {
    case 'Pre-A1':
    case 'A0':
    case 'A1':
      return stage === 0 ? 0.75 : 0.85;
    case 'A1+':
    case 'A2':
      return stage === 0 ? 0.85 : 0.92;
    case 'B1':
    case 'B2':
      return 0.95;
    case 'C1':
    case 'C2':
    default:
      return 1.0;
  }
}
