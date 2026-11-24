import { Language, CEFRLevel, LanguageCard, LeitnerCardItem, LeitnerState } from './types';
import { CURATED_LANGUAGE_CARDS } from './cardsData';
import { buildSessionCardPool } from './cardsData';
import { getUniqueCardsForSession } from './contentEngine';

const STORAGE_LEITNER = 'dor_leitner_box_state';

// Leitner Review Intervals in days: [Box 1 (1 day), Box 2 (3 days), Box 3 (7 days)], capped at 100 cards
export const LEITNER_INTERVALS = [1, 3, 7];
export const MAX_LEITNER_CARDS = 100;

/**
 * Format today's date in YYYY-MM-DD local time
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a local calendar Date without UTC shift
 */
function parseLocalDateString(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || '').trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Calculate signed difference in calendar days between date1 and date2 (date2 - date1)
 */
export function calculateDaysDifference(date1: string, date2: string): number {
  if (!date1 || !date2) return 0;
  const d1 = parseLocalDateString(date1);
  const d2 = parseLocalDateString(date2);
  if (!d1 || !d2) return 0;
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a YYYY-MM-DD string safely across all timezones
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const base = parseLocalDateString(dateStr) || new Date();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Load Leitner State from local storage or initialize fresh deck
 */
export function getLeitnerState(): LeitnerState {
  try {
    const raw = localStorage.getItem(STORAGE_LEITNER);
    if (raw) {
      const parsed: LeitnerState = JSON.parse(raw);
      return checkAndApplyDailyDecay(parsed);
    }
  } catch (e) {
    console.warn('Failed to parse Leitner state:', e);
  }

  // Initial fresh state
  const today = getTodayDateString();
  const defaultState: LeitnerState = {
    targetLanguage: 'nl',
    nativeLanguage: 'fa',
    cefrLevel: 'A1',
    cards: [],
    lastVisitDate: today,
    consecutiveStreak: 0,
    totalCardsMastered: 0,
    notificationsEnabled: false,
    preferredReminderHour: 20,
    missedDayWarningShown: false
  };
  return defaultState;
}

/**
 * Check if the user missed a day and apply strict penalty:
 * "اگر کاربر یک روز نیاد برای جعبه لایتنرش اون دوره رو از دست میده وباید دوباره از اول شروع کنه"
 */
export function checkAndApplyDailyDecay(state: LeitnerState): LeitnerState {
  const today = getTodayDateString();
  const lastVisit = state.lastVisitDate;

  if (!lastVisit) {
    state.lastVisitDate = today;
    return state;
  }

  const daysPassed = calculateDaysDifference(lastVisit, today);

  if (!Number.isFinite(daysPassed) || daysPassed <= 0) {
    // Same day visit or backward clock skew, no penalty
    return state;
  }

  if (daysPassed === 1) {
    // Perfect! Visited on the very next consecutive day
    state.consecutiveStreak += 1;
    state.lastVisitDate = today;
    state.missedDayWarningShown = false;
    saveLeitnerState(state);
    return state;
  }

  // STRICT RULE APPLIED:
  // User missed 2 or more days (skipped a day or more!)
  // They lost the streak and must start this cycle over from Box 0!
  state.consecutiveStreak = 0;
  state.lastVisitDate = today;
  state.missedDayWarningShown = true;

  // Demote all unmastered cards back to Box 0 (House 1)
  state.cards = state.cards.map(c => {
    if (c.boxIndex < LEITNER_INTERVALS.length) {
      return {
        ...c,
        boxIndex: 0,
        nextReviewDate: today
      };
    }
    return c;
  });

  saveLeitnerState(state);
  return state;
}

/**
 * Save Leitner State to localStorage
 */
export function saveLeitnerState(state: LeitnerState): void {
  try {
    localStorage.setItem(STORAGE_LEITNER, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save Leitner state:', e);
  }
}

/**
 * Enroll new course cards into Leitner Box
 */
export function enrollCardsInLeitner(
  targetLanguage: Language,
  nativeLanguage: Language,
  cefrLevel: CEFRLevel = 'A1',
  count: number = 25
): LeitnerState {
  const state = getLeitnerState();
  state.targetLanguage = targetLanguage;
  state.nativeLanguage = nativeLanguage;
  state.cefrLevel = cefrLevel;

  // Retrieve unique curated & universal cards for this level
  const baseCards = getUniqueCardsForSession(
    targetLanguage,
    nativeLanguage,
    cefrLevel,
    [],
    count,
    false
  );

  const today = getTodayDateString();
  const newLeitnerItems: LeitnerCardItem[] = baseCards.map((card, idx) => ({
    id: `leitner_${card.id}_${idx}`,
    cardId: card.id,
    card,
    boxIndex: 0, // Starts in Box 1
    dateAdded: today,
    lastReviewedDate: '',
    nextReviewDate: today, // Due today!
    reviewHistory: []
  }));

  // Append non-duplicate cards up to MAX_LEITNER_CARDS
  const existingIds = new Set(state.cards.map(c => c.cardId));
  const filtered = newLeitnerItems.filter(c => !existingIds.has(c.cardId));

  state.cards = [...state.cards, ...filtered].slice(0, MAX_LEITNER_CARDS);
  saveLeitnerState(state);
  return state;
}

/**
 * Get cards that are due for review today, with randomized sequence
 * and entertaining alternative questions
 */
export function getDueLeitnerCards(state: LeitnerState): Array<{
  item: LeitnerCardItem;
  entertainingQuestion: string;
  gameType: 'speed_recall' | 'scenario' | 'mystery_word' | 'reverse_flip';
}> {
  const today = getTodayDateString();

  // Find cards where nextReviewDate <= today and boxIndex < LEITNER_INTERVALS.length (not already mastered)
  const dueItems = state.cards.filter(c => {
    if (c.boxIndex >= LEITNER_INTERVALS.length) return false;
    return !c.nextReviewDate || c.nextReviewDate <= today;
  });

  // Always randomized for engaging learning as requested by user
  const shuffled = [...dueItems].sort(() => Math.random() - 0.5);

  const gameTypes: Array<'speed_recall' | 'scenario' | 'mystery_word' | 'reverse_flip'> = [
    'speed_recall',
    'scenario',
    'mystery_word',
    'reverse_flip'
  ];

  return shuffled.map((item, idx) => {
    const gameType = gameTypes[idx % gameTypes.length];
    let entertainingQuestion = '';

    const target = item.card.targetText;
    const trans = item.card.translation;

    switch (gameType) {
      case 'speed_recall':
        entertainingQuestion = `⚡ چالش سرعتی: معادل «${trans}» را به زبان مقصد بیان کن!`;
        break;
      case 'scenario':
        entertainingQuestion = `🎭 موقعیت واقعی: در موقعیت «${item.card.prompt || trans}» بهترین جمله چیه؟`;
        break;
      case 'mystery_word':
        entertainingQuestion = `🔍 کلمه گمشده: در جمله مربوط به «${trans}»، کلمه کلیدی کدام است؟`;
        break;
      case 'reverse_flip':
        entertainingQuestion = `🔄 چالش ترجمه دقیق: عبارت «${target}» یعنی چی؟`;
        break;
    }

    if (item.card.isChallenge) {
      entertainingQuestion = `⭐ [کارت چالش +یادگیری - بدون جریمه]: ` + entertainingQuestion;
    }

    return {
      item,
      entertainingQuestion,
      gameType
    };
  });
}

/**
 * Handle Leitner review outcome for a single card:
 * If correct -> promotes to next box (interval doubles)
 * If wrong -> demotes back to Box 0 (starts interval again)
 */
export function recordLeitnerCardReview(
  cardId: string,
  isCorrect: boolean
): { promotedToBox: number; isMastered: boolean } {
  const state = getLeitnerState();
  const today = getTodayDateString();
  const item = state.cards.find(c => c.cardId === cardId || c.id === cardId);

  if (!item) {
    return { promotedToBox: 0, isMastered: false };
  }

  item.lastReviewedDate = today;
  item.reviewHistory.push({ date: today, success: isCorrect });

  if (isCorrect) {
    // Advance to next box (Boxes 1 to 3, index 0 to 2; boxIndex >= 3 is Mastered)
    const prevBox = item.boxIndex;
    const nextBox = Math.min(prevBox + 1, LEITNER_INTERVALS.length);
    item.boxIndex = nextBox;
    const isMastered = nextBox >= LEITNER_INTERVALS.length;
    const intervalDays = LEITNER_INTERVALS[Math.min(nextBox, LEITNER_INTERVALS.length - 1)] || 7;
    item.nextReviewDate = addDaysToDateString(today, intervalDays);

    if (isMastered && prevBox < LEITNER_INTERVALS.length) {
      state.totalCardsMastered += 1;
    }

    saveLeitnerState(state);
    return { promotedToBox: Math.min(nextBox + 1, LEITNER_INTERVALS.length), isMastered };
  } else {
    // Demote back to Box 0 (House 1) for spaced re-learning
    item.boxIndex = 0;
    item.nextReviewDate = addDaysToDateString(today, 1);
    saveLeitnerState(state);
    return { promotedToBox: 1, isMastered: false };
  }
}

/**
 * Enroll missed session cards into Leitner review (Box 1, due today, cap 100)
 */
export function enrollMissedCardsInLeitner(missedCards: LanguageCard[]): void {
  const state = getLeitnerState();
  const today = getTodayDateString();
  const existingMap = new Map<string, LeitnerCardItem>();
  state.cards.forEach(c => existingMap.set(c.card?.id || c.cardId || c.id, c));

  for (const card of missedCards) {
    const id = card.id;
    if (existingMap.has(id)) {
      const existing = existingMap.get(id)!;
      existing.boxIndex = 0;
      existing.nextReviewDate = today;
      existing.mistakeCount = (existing.mistakeCount || 0) + 1;
    } else {
      if (existingMap.size >= MAX_LEITNER_CARDS) break;
      existingMap.set(id, {
        id,
        cardId: id,
        card,
        boxIndex: 0,
        dateAdded: today,
        nextReviewDate: today,
        lastReviewedDate: '',
        reviewHistory: [],
        mistakeCount: 1
      });
    }
  }

  state.cards = Array.from(existingMap.values()).slice(0, MAX_LEITNER_CARDS);
  saveLeitnerState(state);
}

/**
 * Request Notification Permission for Leitner daily reminder
 */
export async function requestLeitnerNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';

    const state = getLeitnerState();
    state.notificationsEnabled = granted;
    saveLeitnerState(state);

    if (granted) {
      scheduleLocalReminderNotification();
    }
    return granted;
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return false;
  }
}

/**
 * Send an immediate confirmation notification or schedule local reminder
 */
export function scheduleLocalReminderNotification(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    // Immediate welcome reminder confirmation
    new Notification('جعبه لایتنر فعال شد! 🔔', {
      body: 'هر روز کارت‌های جدید لایتنر آماده مرور هستند تا دوره‌ات نسوزه!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png'
    });
  } catch (e) {
    // Ignore notification exceptions in iframes
  }
}
