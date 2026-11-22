import { FadingStage } from './types';
import { CEFRLevel } from '../../../types';
import { getLeitnerState } from '../../../leitnerBoxService';

/**
 * Determines the default starting fading stage based on CEFR level
 * - Pre-A1 / A1: Start at full aids (Stage 0)
 * - A2 / B1 / B2: Progressive starting stage (Stage 1 or 2)
 * - C1 / C2: Start with aids OFF (Stage 3), player can turn them on
 */
export function getStartingStageForCefr(level?: CEFRLevel): FadingStage {
  if (!level) return 0;
  switch (level) {
    case 'Pre-A1':
    case 'A0':
    case 'A0+':
    case 'A1':
      return 0; // Stage 0: Full aids (color + shape + label)
    case 'A1+':
    case 'A2':
    case 'A2+':
      return 1; // Stage 1: Color + shape
    case 'B1':
    case 'B1+':
    case 'B2':
    case 'B2+':
      return 2; // Stage 2: Thin colored underline
    case 'C1':
    case 'C1+':
    case 'C2':
      return 3; // Stage 3: Mastered / aids off by default
    default:
      return 0;
  }
}

/**
 * Determines the current fading stage for a specific word/card, driven by the player's Leitner box progress:
 * - Box 0 (New word) = Stage 0: Color + Shape + Label
 * - Box 1 (After correct answer) = Stage 1: Color + Shape
 * - Box 2 (Near mastery) = Stage 2: Thin colored underline
 * - Box 3+ (Mastered) = Stage 3: Same as normal text (aids off)
 */
export function getFadingStageForCard(
  cardId: string,
  cefrLevel: CEFRLevel = 'A1',
  customStageOverride?: FadingStage
): FadingStage {
  if (customStageOverride !== undefined && customStageOverride !== null) {
    return customStageOverride;
  }

  // 1. Check if card exists in Leitner box state
  try {
    const leitner = getLeitnerState();
    const item = leitner.cards.find((c) => c.cardId === cardId || c.id === cardId || c.card?.id === cardId);
    if (item) {
      if (item.boxIndex >= 3 || (item.reviewHistory && item.reviewHistory.length >= 3 && item.reviewHistory.slice(-3).every(h => h.success))) {
        return 3; // Mastered: normal text (training wheels completely faded)
      }
      if (item.boxIndex === 2) return 2; // Near mastery: thin colored underline
      if (item.boxIndex === 1) return 1; // Moderate: color + shape
      return 0; // Box 0: full aids
    }
  } catch (e) {
    console.warn('Failed to query Leitner state for fading stage:', e);
  }

  // 2. If not yet in Leitner, use default starting stage for the player's CEFR level
  return getStartingStageForCefr(cefrLevel);
}

/**
 * Calculate previous stage when a mistake occurs (moves that word back one stage)
 */
export function demoteStageOnMistake(currentStage: FadingStage): FadingStage {
  if (currentStage <= 0) return 0;
  return (currentStage - 1) as FadingStage;
}

/**
 * Calculate next stage when a correct answer occurs (promotes word towards mastery)
 */
export function promoteStageOnSuccess(currentStage: FadingStage): FadingStage {
  if (currentStage >= 3) return 3;
  return (currentStage + 1) as FadingStage;
}
