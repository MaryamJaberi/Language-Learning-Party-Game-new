import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Language, 
  LanguageCard, 
  SinglePlayerSettings, 
  SinglePlayerCardResult, 
  SinglePlayerSessionReport,
  SinglePlayerDisplayMode,
  CEFRLevel 
} from '../types';
import { sound } from '../soundManager';
import { tUI, isRtlLang } from '../ui';
import { FlagIcon } from '../components/FlagIcon';
import { SUPPORTED_LANGUAGES } from '../constants';
import { evaluateAnswer, EvaluationResult } from '../answerEvaluator';
import { markCardsAsSeen, saveWeakCards, getPersonalRecords, updatePersonalRecords, getUniqueCardsForSession } from '../contentEngine';
import { recordMistake, recordMistakeSuccess } from '../mistakeReviewService';
import { feedbackDirector } from '../feedbackDirector';
import { SoundHeaderButton } from '../components/SoundHeaderButton';
import ExitConfirmModal from '../components/ExitConfirmModal';
import { PracticeTourModal } from '../components/PracticeTourModal';
import { generateChallengingReflexOptions, pickTwoChoiceOptions } from '../utils/testQuestionEngine';
import { getPronunciationHint } from '../pronunciationService';
import { TrainingWheelText } from '../components/trainingWheels/TrainingWheelText';
import { getAdaptiveTtsSpeed } from '../src/engine/trainingWheels/trainingWheelsService';
import {
  Session,
  AdaptiveItem,
  AdaptivePlayer,
  CardIndicator,
  ExerciseType,
  EngineMode,
  CEFR,
  ItemStats
} from '../src/engine/adaptive';
import {
  loadPlayerState,
  savePlayerState,
  loadItemStats,
  saveItemStats
} from '../src/engine/adaptive/storage';
import { logAdaptiveEvent } from '../src/engine/adaptive/events';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Volume1,
  VolumeX, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Flame, 
  Settings2, 
  Headphones, 
  FileText,
  AlertTriangle,
  Trophy,
  ShieldAlert,
  X,
  Languages,
  ArrowRightLeft,
  Lightbulb,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Target,
  Zap,
  BookOpen,
  Layers,
  Clock,
  SkipForward,
  PenTool,
  Award,
  Star,
  Pause
} from 'lucide-react';
import { AudioRecorder } from '../geminiService';

interface Props {
  initialCards: LanguageCard[];
  initialSettings: SinglePlayerSettings;
  uiLanguage: Language;
  onFinish: (report: SinglePlayerSessionReport) => void;
  onExit: () => void;
  onExitHome?: () => void;
  onExitSetup?: () => void;
  onOpenLeaderboard?: () => void;
}

import { SPEECH_LANG_MAP, getSpeechLanguageCode } from '../constants';
import CardImage from '../components/CardImage';
import { tx, txt , uiDigits } from '../i18n/runtime';
import SentencePuzzle from '../components/SentencePuzzle';
import { isLongSentence, getPuzzleStage, recordPuzzleSolved, MAX_PUZZLE_STAGE } from '../src/engine/longSentence/chunker';

// Convert numbers to Persian digits if in RTL/Persian
// رقم فارسی فقط وقتی زبان برنامه فارسی است (نه برای عربی و دیگر زبان‌های راست‌به‌چپ)
const toPersian = (n: number | string, isRTL: boolean) => uiDigits(isRTL, n);

const SinglePlayerScreen: React.FC<Props> = ({
  initialCards,
  initialSettings,
  uiLanguage,
  onFinish,
  onExit,
  onExitHome,
  onExitSetup,
  onOpenLeaderboard
}) => {
  const t = tUI(uiLanguage);
  const isRTL = isRtlLang(uiLanguage);

  const [cards, setCards] = useState<LanguageCard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings, setSettings] = useState<SinglePlayerSettings>(initialSettings);
  
  // Input State & Mode Switcher (Speech vs Text)
  const [userInput, setUserInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(() => {
    return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });
  const [pendingVoiceSubmit, setPendingVoiceSubmit] = useState<{ transcript: string } | null>(null);
  const [hasFirstSpokenFailed, setHasFirstSpokenFailed] = useState(false);
  const [inputMode, setInputMode] = useState<'speech' | 'text'>('text');
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Random Lightbulb Hint State
  const [randomHintMessage, setRandomHintMessage] = useState<string | null>(null);
  const [showRandomHint, setShowRandomHint] = useState<boolean>(false);
  
  // Microphone Permission Request & Interactive Troubleshooter State
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [micErrorReason, setMicErrorReason] = useState<'denied' | 'no_device' | 'in_use' | 'iframe_blocked' | null>(null);
  const [micTestSuccess, setMicTestSuccess] = useState(false);
  const [copiedDirectUrl, setCopiedDirectUrl] = useState(false);
  const [showQuickChoicesFallback, setShowQuickChoicesFallback] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [actionableError, setActionableError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Game progress & evaluation state
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showHintSection, setShowHintSection] = useState(false);
  const [revealedLettersCount, setRevealedLettersCount] = useState(1);
  const [results, setResults] = useState<SinglePlayerCardResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Skipped card educational review state (shows correct answer before moving to next card)
  const [skippedCardInfo, setSkippedCardInfo] = useState<{
    card: LanguageCard;
    targetText: string;
    translation: string;
    pronunciation?: string;
    grammarPoint?: string;
    hint?: string;
  } | null>(null);

  // Delightful focus & ergonomic learning controls
  const [isZenMode, setIsZenMode] = useState<boolean>(initialSettings.zenMode || false);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(initialSettings.autoAdvance || false);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  // User Onboarding Tour & Progressive Disclosure States (Anti-Cognitive Overload)
  const [showTourModal, setShowTourModal] = useState<boolean>(false);
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Initial mount: Silence BGM during study and check if onboarding tour is needed
  useEffect(() => {
    sound.stopBGM();
    try {
      const tourSeen = localStorage.getItem('dor_practice_tour_seen');
      if (!tourSeen) {
        setShowTourModal(true);
      }
    } catch {}
  }, []);

  // Active Recall & Options State
  const [revealedOptions, setRevealedOptions] = useState<boolean>(initialSettings.hideOptionsByDefault !== true);
  const [activeHintType, setActiveHintType] = useState<'none' | 'letters' | 'word' | 'options' | 'audio'>('none');

  // Timed Match vs Fixed Card Count
  const isTimedMatch = settings.matchMode === 'timed_match' || (settings.totalMatchSeconds || 0) > 0;
  const initialMatchSeconds = settings.totalMatchSeconds || (settings.matchMode === 'timed_match' ? 60 : 0);
  const [matchRemainingSeconds, setMatchRemainingSeconds] = useState<number>(initialMatchSeconds);
  // Auto-submit countdown timer for spoken transcript (~1.5s preview buffer)
  useEffect(() => {
    if (!pendingVoiceSubmit) return;
    const timer = window.setTimeout(() => {
      const textToSubmit = pendingVoiceSubmit.transcript;
      setPendingVoiceSubmit(null);
      submitAnswer(textToSubmit, true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [pendingVoiceSubmit]);

  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(0);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const matchTimerRef = useRef<number | null>(null);
  const resultsRef = useRef<SinglePlayerCardResult[]>(results);
  resultsRef.current = results;
  const isFinishedRef = useRef<boolean>(false);

  // Smart Voice Input & Audio Transcription State (Gemini & WebSpeech unified)
  const [isTranscribingWithGemini, setIsTranscribingWithGemini] = useState(false);
  const [isGeminiRecording, setIsGeminiRecording] = useState(false);
  const geminiRecorderRef = useRef<AudioRecorder | null>(null);

  // Untimed relaxed study for cards (user has unlimited time per card in single-player card mode)
  const startTimeRef = useRef<number>(Date.now());
  const recognitionRef = useRef<any>(null);
  const isUserSpeakingRef = useRef<boolean>(false);
  const liveTranscriptRef = useRef<string>('');

  // Personal Records
  const [personalRecords] = useState(getPersonalRecords());
  const fastestAnswerRef = useRef<number>(999);
  const [isNewRecordAlert, setIsNewRecordAlert] = useState(false);

  const currentCard: LanguageCard | undefined = cards[currentIndex];

  // --- Mastery Proximity Adaptive Engine Integration ---
  const adaptiveSessionRef = useRef<Session | null>(null);
  const adaptivePlayerRef = useRef<AdaptivePlayer | null>(null);
  const adaptiveStatsRef = useRef<ItemStats | null>(null);
  const [currentIndicator, setCurrentIndicator] = useState<CardIndicator>('balanced');
  const [currentExerciseType, setCurrentExerciseType] = useState<ExerciseType>('recognize');
  // «پازل تکه‌ها» برای جمله‌های بلند: بازیکن می‌تواند برای هر کارت آن را کنار بگذارد
  const [puzzleDismissed, setPuzzleDismissed] = useState(false);
  const [adaptiveToastMessage, setAdaptiveToastMessage] = useState<string | null>(null);
  const [levelSuggestion, setLevelSuggestion] = useState<CEFR | null>(null);
  const [currentCardP, setCurrentCardP] = useState<number>(0.8);
  const [currentCardTarget, setCurrentCardTarget] = useState<number>(0.8);
  const [currentBucket, setCurrentBucket] = useState<string>('new');
  const [currentMode, setCurrentMode] = useState<EngineMode>('normal');
  const adaptiveToastTimerRef = useRef<number | null>(null);

  // Keep settings in sync when initialSettings changes
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  // Adaptive Session Step & Initialization
  useEffect(() => {
    let isCancelled = false;
    async function initOrStepSession() {
      const targetLang = settings.targetLanguage || 'en';
      const playerId = (typeof localStorage !== 'undefined' && localStorage.getItem('dor_device_id')) || 'single_player_user';
      const declaredLevel = (settings.cefrLevel as CEFR) || 'A1';

      if (!adaptiveSessionRef.current) {
        const player = await loadPlayerState(playerId, targetLang, declaredLevel);
        const itemStats = await loadItemStats();
        if (isCancelled) return;
        adaptivePlayerRef.current = player;
        adaptiveStatsRef.current = itemStats;

        const bank: AdaptiveItem[] = cards.map(c => ({
          id: c.id,
          cefr: (c.cefrLevel as CEFR) || declaredLevel,
          bOffset: c.isChallenge ? 0.3 : 0
        }));

        adaptiveSessionRef.current = new Session(player, bank, itemStats, {
          level: declaredLevel,
          now: Date.now()
        });
      }

      if (adaptiveSessionRef.current) {
        const isFinale = currentIndex >= cards.length - 1;
        const turnCard = adaptiveSessionRef.current.next({ finale: isFinale });
        if (turnCard) {
          setCurrentIndicator(turnCard.indicator);
          setCurrentExerciseType(turnCard.type);
          setCurrentCardP(turnCard.p);
          setCurrentCardTarget(turnCard.target);
          setCurrentBucket(turnCard.bucket);
          setCurrentMode(turnCard.mode);

          // Synchronize active card with adaptive engine's chosen item (aligns requeues & level pacing)
          const chosenId = turnCard.item.id;
          setCards(prevCards => {
            const targetIdx = prevCards.findIndex(c => c.id === chosenId);
            if (targetIdx >= 0 && targetIdx !== currentIndex) {
              const updated = [...prevCards];
              const temp = updated[currentIndex];
              updated[currentIndex] = updated[targetIdx];
              updated[targetIdx] = temp;
              return updated;
            }
            return prevCards;
          });

          // Auto-hint for scaffold in easier / rescue modes
          if (turnCard.hint) {
            setShowHintSection(true);
          }
        }
      }
    }

    void initOrStepSession();

    return () => {
      isCancelled = true;
    };
  }, [currentIndex, cards.length, settings.targetLanguage, settings.cefrLevel]);

  // 4 Smart multiple-choice options powered by pedagogical test question engine (or 2 for choice2 scaffold)
  const quickQuizOptions = useMemo(() => {
    if (!currentCard) return [];
    const isReverse = settings.displayMode === 'translate_to_native';
    const targetLang = isReverse
      ? (currentCard.nativeLanguage || settings.nativeLanguage || (uiLanguage || 'en'))
      : (currentCard.targetLanguage || settings.targetLanguage || 'en');
    const expected = (isReverse ? currentCard.translation : currentCard.targetText || '').trim();
    const all = generateChallengingReflexOptions(currentCard, cards, targetLang, expected);
    if (currentExerciseType === 'choice2') {
      // دو گزینه: همیشه پاسخ درست + یک گزینهٔ غلط
      return pickTwoChoiceOptions(all, expected);
    }
    return all;
  }, [currentCard, cards, settings.displayMode, settings.nativeLanguage, settings.targetLanguage, isRTL, currentExerciseType]);

  // Check Speech Recognition capability
  useEffect(() => {
    const SpeechRecognitionClass = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    setSpeechSupported(!!SpeechRecognitionClass);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (geminiRecorderRef.current) {
        try {
          geminiRecorderRef.current.cancel();
        } catch {}
        geminiRecorderRef.current = null;
      }
    };
  }, []);

  // Handle Card Setup & Audio (Cards are untimed in single-player card mode)
  useEffect(() => {
    if (!currentCard) return;

    setUserInput('');
    setEvaluation(null);
    setAttempts(1);
    setPuzzleDismissed(false);
    setPendingVoiceSubmit(null);
    setHasFirstSpokenFailed(false);
    setIsRevealed(false);
    setSkippedCardInfo(null);
    setShowHintSection(false);
    setShowRandomHint(false);
    setRandomHintMessage(null);
    setRevealedOptions(settings.hideOptionsByDefault !== true);
    setActiveHintType('none');
    setRevealedLettersCount(1);
    setShowMoreDetails(false);
    setShowSkippedDetails(false);
    setIsPlayingAudio(false);
    startTimeRef.current = Date.now();

    // In single-player card game, cards are relaxed and untimed (no countdown expiring cards)

    // Clean up any active speech recognition from previous card
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (geminiRecorderRef.current) {
      try {
        geminiRecorderRef.current.cancel();
      } catch {}
      geminiRecorderRef.current = null;
    }
    setIsListening(false);
    setIsGeminiRecording(false);
    isUserSpeakingRef.current = false;
    liveTranscriptRef.current = '';

    // Preload card audio into memory cache so clicking Play Audio / Slow is instant
    sound.preloadTTS(currentCard.targetText, currentCard.targetLanguage);

    // Audio is an on-demand hint in translation/reading modes.
    // Only in audio_only mode (where text is hidden for listening challenge) does it play automatically.
    if (settings.displayMode === 'audio_only') {
      sound.speakNative(currentCard.targetText, currentCard.targetLanguage);
    }

  }, [currentIndex, currentCard?.id, settings.displayMode, settings.hideOptionsByDefault]);

  // Global Timed Match Session Countdown Timer
  useEffect(() => {
    if (!isTimedMatch) return;
    isFinishedRef.current = false;

    matchTimerRef.current = window.setInterval(() => {
      setMatchRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(matchTimerRef.current!);
          if (!isFinishedRef.current) {
            isFinishedRef.current = true;
            sound.playRoundEnd();
            finishSession(resultsRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    };
  }, [isTimedMatch]);

  // Stopwatch timer for Fixed Card Count mode
  useEffect(() => {
    if (isTimedMatch) return;
    const interval = window.setInterval(() => {
      setSessionElapsedSeconds(Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimedMatch]);

  const stopMicAndTranscribeToInput = (shouldSubmitAfter = true) => {
    const existingSpeechText = (liveTranscriptRef.current || userInput).trim();
    isUserSpeakingRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;

    if (existingSpeechText) {
      setUserInput(existingSpeechText);
      setActionableError(null);
      if (shouldSubmitAfter) {
        setPendingVoiceSubmit({ transcript: existingSpeechText });
      }
    }
  };

  const handleCancelVoiceSubmit = () => {
    sound.playClick();
    setPendingVoiceSubmit(null);
    setUserInput('');
    liveTranscriptRef.current = '';
    setActionableError(null);
  };

  const toggleListening = async () => {
    sound.playClick();

    if (pendingVoiceSubmit) {
      setPendingVoiceSubmit(null);
    }

    if (isListening || isUserSpeakingRef.current) {
      stopMicAndTranscribeToInput(true);
      return;
    }

    const SpeechRecognitionClass = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (!SpeechRecognitionClass) {
      setActionableError(
        tx(isRTL, 'تشخیص صوت در این مرورگر پشتیبانی نمی‌شود (از Chrome یا Edge استفاده کنید).', 'Voice input not supported in this browser (use Chrome or Edge).')
      );
      return;
    }

    // User starts speaking: convert speech to text in real time with interimResults
    liveTranscriptRef.current = '';
    setUserInput('');
    setActionableError(null);
    setMicErrorReason(null);

    const isReverseToNative = settings.displayMode === 'translate_to_native';
    const nativeCode = currentCard?.nativeLanguage || settings.nativeLanguage || (uiLanguage || 'en');
    const targetLang = currentCard?.targetLanguage || settings.targetLanguage || 'en';
    const langCode = getSpeechLanguageCode(isReverseToNative ? nativeCode : targetLang);

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = langCode;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        isUserSpeakingRef.current = true;
        setActionableError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const clean = transcript.trim();
        if (clean) {
          liveTranscriptRef.current = clean;
          setUserInput(clean);
          setActionableError(null);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
        isUserSpeakingRef.current = false;
        recognitionRef.current = null;

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          const inIframe = typeof window !== 'undefined' && window.self !== window.top;
          setMicErrorReason(inIframe ? 'iframe_blocked' : 'denied');
          setActionableError(
            tx(isRTL, 'دسترسی به میکروفون مسدود است. لطفاً دسترسی به میکروفون را فعال کرده و صفحه را رفرش نمایید.', 'Microphone access is blocked. Allow microphone in browser settings and reload.')
          );
        } else if (event.error === 'network') {
          setActionableError(
            tx(isRTL, 'خطای اتصال در سرویس تشخیص صوت مرورگر. لطفاً اتصال اینترنت را بررسی فرمایید یا پاسخ را تایپ کنید.', 'Speech recognition network error. Speech recognition requires internet.')
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        isUserSpeakingRef.current = false;
        recognitionRef.current = null;

        // Auto-submit with ~1.5s preview buffer and "Try again" button
        const finalSpoken = (liveTranscriptRef.current || userInput).trim();
        if (finalSpoken) {
          setPendingVoiceSubmit({ transcript: finalSpoken });
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      isUserSpeakingRef.current = true;
    } catch (err: any) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
      isUserSpeakingRef.current = false;
      setActionableError(
        tx(isRTL, 'خطا در راه‌اندازی تشخیص صوت. لطفاً پاسخ را تایپ فرمایید.', 'Could not start voice recognition. Please type your answer.')
      );
    }
  };

  const handleGrantPermissionAndStart = async () => {
    sound.playClick();
    setIsRequestingMic(true);
    setMicPermissionError(null);
    setMicTestSuccess(false);

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('NotSupportedError');
      }

      // Acquire stream directly inside the user click gesture and pass it straight to AudioRecorder with VAD!
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (geminiRecorderRef.current) {
        geminiRecorderRef.current.cancel();
      }
      const recorder = new AudioRecorder();
      await recorder.start(stream, () => {
        void stopMicAndTranscribeToInput(false);
      });
      geminiRecorderRef.current = recorder;

      if (speechSupported && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }

      isUserSpeakingRef.current = true;
      setIsGeminiRecording(true);
      setIsListening(true);
      setMicTestSuccess(true);
      setMicErrorReason(null);
      setActionableError(null);
      setMicPermissionError(null);
      setShowMicPermissionModal(false);
      sound.playCorrect();
    } catch (err: any) {
      console.warn('Microphone permission request error:', err);
      const errName = `${err?.name || ''} ${err?.message || ''}`;
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      setShowQuickChoicesFallback(true);

      if (errName.includes('NotFound') || errName.includes('DevicesNotFound')) {
        setMicErrorReason('no_device');
        setMicPermissionError(
          tx(isRTL, 'میکروفونی به دستگاه شما متصل نیست یا در تنظیمات ویندوز غیرفعال است.', 'No microphone hardware found or disabled in OS settings.')
        );
      } else if (errName.includes('NotReadable') || errName.includes('TrackStart')) {
        setMicErrorReason('in_use');
        setMicPermissionError(
          tx(isRTL, 'میکروفون توسط برنامه دیگری درگیر است. سایر برنامه‌های صوتی را ببندید.', 'Microphone is busy in another application.')
        );
      } else if (inIframe) {
        setMicErrorReason('iframe_blocked');
        setMicPermissionError(
          tx(isRTL, 'مرورگر کروم دسترسی میکروفون را داخل قاب پیش‌نمایش (Preview) اعمال نکرده است. راه‌حل قطعی: ۱) روی دکمه «بارگذاری مجدد پیش‌نمایش» در پایین بزنید، یا ۲) روی آیکون 🔗 در نوار بالای پیش‌نمایش کلیک کنید تا بازی در تب مستقل باز شود.', 'Chrome has not applied microphone access to the embedded Preview frame yet. Fix: 1) Click "Reload Preview" below, or 2) Click the 🔗 icon at the top of the preview bar to open in a full tab.')
        );
      } else {
        setMicErrorReason('denied');
        setMicPermissionError(
          tx(isRTL, 'پس از روشن کردن تیک Microphone در نوار آدرس مرورگر، حتماً یک‌بار صفحه را رفرش (F5) کنید تا تغییر اعمال شود.', 'After turning Microphone ON in your browser address bar, please reload the page (F5) to apply the change.')
        );
      }
    } finally {
      setIsRequestingMic(false);
    }
  };

  const handlePlayAudio = () => {
    if (!currentCard) return;
    sound.playClick();
    setIsPlayingAudio(true);
    sound.speakNative(currentCard.targetText, currentCard.targetLanguage);
    // Fallback timer to reset playing state
    window.setTimeout(() => setIsPlayingAudio(false), 3000);
  };

  const handlePlaySlowAudio = () => {
    if (!currentCard) return;
    sound.playClick();
    setIsPlayingAudio(true);
    sound.speakSlow(currentCard.targetText, currentCard.targetLanguage);
    // Fallback timer to reset playing state
    window.setTimeout(() => setIsPlayingAudio(false), 4500);
  };

  // Keyboard ergonomics for desktop / tablet flow state (1-4 choices, Space audio, S slow, H hint, Z zen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      if (isInput) {
        if (e.key === 'Enter') {
          handleCheckAnswer();
        }
        return;
      }

      if (e.key === '1' && quickQuizOptions[0]) {
        submitAnswer(quickQuizOptions[0]);
      } else if (e.key === '2' && quickQuizOptions[1]) {
        submitAnswer(quickQuizOptions[1]);
      } else if (e.key === '3' && quickQuizOptions[2]) {
        submitAnswer(quickQuizOptions[2]);
      } else if (e.key === '4' && quickQuizOptions[3]) {
        submitAnswer(quickQuizOptions[3]);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handlePlayAudio();
      } else if (e.key.toLowerCase() === 's') {
        handlePlaySlowAudio();
      } else if (e.key.toLowerCase() === 'h') {
        setShowHintSection(prev => !prev);
      } else if (e.key.toLowerCase() === 'z') {
        setIsZenMode(prev => !prev);
      } else if (e.key === 'Enter') {
        if (evaluation?.isCorrect) {
          handleNextCard(false);
        } else if (evaluation && !evaluation.isCorrect) {
          handleTryAgain();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickQuizOptions, evaluation, currentCard, userInput]);

  const recordAdaptiveAnswer = (isCorrect: boolean, ms: number) => {
    if (!adaptiveSessionRef.current || !adaptivePlayerRef.current || !currentCard) return;

    const hintWasUsed = showHintSection || showRandomHint || activeHintType !== 'none';
    const res = adaptiveSessionRef.current.answer({
      correct: isCorrect,
      ms,
      hintUsed: hintWasUsed
    });

    const targetLang = settings.targetLanguage || 'en';
    const playerId = adaptivePlayerRef.current.id;
    void savePlayerState(playerId, targetLang, adaptivePlayerRef.current);
    if (adaptiveStatsRef.current) {
      void saveItemStats(adaptiveStatsRef.current);
    }

    logAdaptiveEvent({
      ts: Date.now(),
      player: playerId,
      lang: targetLang,
      event: 'card_answered',
      item: currentCard.id,
      type: currentExerciseType,
      bucket: currentBucket,
      mode: res.mode || currentMode,
      target: currentCardTarget,
      p_pred: currentCardP,
      correct: isCorrect,
      credit: res.credit,
      ms,
      hint: hintWasUsed,
      theta_after: res.theta
    });

    // Epic B2 Toast: Non-blocking 2s message on mode transition
    if (res.message) {
      if (adaptiveToastTimerRef.current) clearTimeout(adaptiveToastTimerRef.current);
      setAdaptiveToastMessage(res.message);
      adaptiveToastTimerRef.current = window.setTimeout(() => {
        setAdaptiveToastMessage(null);
      }, 2200);
    }

    // Epic A4 / §5.6: Level suggestion
    if (res.levelSuggestion) {
      setLevelSuggestion(res.levelSuggestion);
    }

    // §5.6: Fatigue suggestion
    if (res.fatigue) {
      feedbackDirector.triggerLeaderboardDelta({
        type: 'threshold',
        subText: tx(isRTL, 'خوب کار کردی؛ یک کارت آخر و استراحت؟', 'Great work; one last card and take a rest?')
      });
    }
  };

  const submitAnswer = (rawAnswer: string, isSpoken: boolean = false) => {
    if (!currentCard) return;

    if (pendingVoiceSubmit) {
      setPendingVoiceSubmit(null);
    }

    const answer = rawAnswer.trim();
    if (!answer) {
      setActionableError(
        tx(isRTL, 'پاسخی وارد نشده است. راه‌حل: کلمه را در کادر متنی بنویسید، با میکروفون تلفظ کنید یا از سرنخ و حروف کمکی استفاده کنید.', 'No answer provided. Fix: Type your answer, speak using the microphone, or use the letter clues.')
      );
      return;
    }
    setUserInput(answer);
    setActionableError(null);

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const timeRatio = 1.0;
    const isReverseToNative = settings.displayMode === 'translate_to_native';

    // A first failed spoken attempt does not penalize score
    const scoringAttemptNumber = (hasFirstSpokenFailed && attempts > 1) ? 1 : attempts;

    const evalResult = evaluateAnswer(
      currentCard,
      answer,
      scoringAttemptNumber,
      timeRatio,
      uiLanguage,
      isReverseToNative ? currentCard.translation : currentCard.targetText
    );

    setEvaluation(evalResult);

    if (evalResult.isCorrect) {
      sound.playCorrect();
      sound.hapticFeedback('success');
      recordMistakeSuccess(currentCard.id);
      const challengeBonus = currentCard.isChallenge ? (currentCard.challengeBonus || 2) : 0;
      const creativeBonus = currentCard.isCreative ? 35 : 0;
      const points = evalResult.pointsAwarded + challengeBonus + creativeBonus;
      const newScore = totalScore + points;
      setTotalScore(newScore);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      if (newStreak >= 3) {
        sound.playMilestoneGlow();
      } else if (newStreak >= 2) {
        sound.playPowerUp();
      } else {
        sound.playScoreTick(newStreak);
      }

      feedbackDirector.triggerScoreGained({
        points,
        combo: newStreak,
        label: currentCard.isCreative
          ? txt(isRTL, '+{0} خلاقانه ({1})', '+{0} creative ({1})', [points, currentCard.cefrLevel])
          : currentCard.isChallenge 
            ? txt(isRTL, '+{0} چالش ({1})', '+{0} challenge ({1})', [points, currentCard.cefrLevel]) 
            : newStreak > 1 ? `+${points} ×${newStreak} (${currentCard.cefrLevel})` : `+${points} ${t.pointsUnit || (tx(isRTL, 'امتیاز', 'PTS'))} (${currentCard.cefrLevel})`
      });

      const timeSpent = Math.max(0.5, Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10);
      if (timeSpent < fastestAnswerRef.current) {
        fastestAnswerRef.current = timeSpent;
      }

      if (newScore > personalRecords.highestScore && !isNewRecordAlert && personalRecords.highestScore > 0) {
        setIsNewRecordAlert(true);
        feedbackDirector.triggerLeaderboardDelta({
          type: 'personal_best',
          subText: `ثبت رکورد نو: ${newScore} امتیاز`
        });
      } else if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
        feedbackDirector.triggerLeaderboardDelta({
          type: 'threshold',
          subText: `تسلط بر ${newStreak} کلمه پیاپی`
        });
      }

      const resEntry: SinglePlayerCardResult = {
        card: currentCard,
        userAnswer: answer,
        isCorrect: true,
        attempts: scoringAttemptNumber,
        timeSpentSeconds: timeSpent,
        pointsEarned: points,
        similarityScore: evalResult.similarity,
        aiFeedback: evalResult.feedbackMessage
      };
      setResults(prev => [...prev, resEntry]);
      recordAdaptiveAnswer(true, timeSpent * 1000);

      if (autoAdvance) {
        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          handleNextCard(false);
        }, 1150);
      }
    } else {
      sound.playPass();
      sound.hapticFeedback('error');

      // A first failed spoken attempt on a card must not cost points or break streak!
      if (isSpoken && attempts === 1 && !hasFirstSpokenFailed) {
        setHasFirstSpokenFailed(true);
        // Do not increment attempts
        // Do not reset streak
        setActionableError(
          tx(isRTL, 'تلفظ شناسایی‌شده مطابقت نداشت. این اولین تلاش صوتی بود و امتیازی کسر نشد! می‌توانید دوباره صحبت کنید یا بنویسید.', 'Spoken attempt did not match. First voice attempt is free with no point penalty — try speaking again or typing!')
        );
      } else {
        setStreak(0);
        setAttempts(prev => prev + 1);
        recordMistake(currentCard, answer, 'single_player');
        const timeSpent = Math.max(0.5, Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10);
        recordAdaptiveAnswer(false, timeSpent * 1000);
      }
    }
  };

  const handleCheckAnswer = () => {
    if (isListening || isUserSpeakingRef.current) {
      stopMicAndTranscribeToInput(true);
      return;
    }
    submitAnswer(userInput, false);
  };

  const handleTryAgain = () => {
    sound.playClick();
    setEvaluation(null);
    setUserInput('');
  };

  const handleTriggerRandomHint = () => {
    if (!currentCard) return;
    sound.playPowerUp();

    const isReverse = settings.displayMode === 'translate_to_native';
    const isReadingMode = settings.displayMode === 'text_and_audio';
    const expectedText = (isReverse ? currentCard.translation : currentCard.targetText || '').trim();
    const words = expectedText.split(/\s+/).filter(Boolean);

    const hintsPool: string[] = [];

    if (!isReadingMode && expectedText) {
      if (words.length >= 2) {
        // Show the first word(s) and mask the rest of the expected answer
        const revealCount = Math.max(1, Math.ceil(words.length / 2));
        const revealedPart = words.slice(0, revealCount).join(' ');
        const hiddenPart = words.slice(revealCount).map(() => '[______]').join(' ');
        const label = tx(isRTL, 'الگوی جمله:', 'Sentence clue:');
        hintsPool.push(`${label} «${revealedPart} ${hiddenPart}»`);
      } else if (words.length === 1 && words[0].length > 2) {
        const cleanWord = words[0];
        const firstTwo = cleanWord.slice(0, Math.min(2, cleanWord.length - 1));
        const label = tx(isRTL, 'حروف اول پاسخ:', 'First letters:');
        hintsPool.push(`${label} «${firstTwo}...» (${cleanWord.length} ${tx(isRTL, 'حرف', 'letters')})`);
      }
    }

    // Add grammatical article hint if present on card
    if (currentCard.article) {
      const artLabel = tx(isRTL, 'حرف تعریف:', 'Article:');
      hintsPool.push(`${artLabel} ${currentCard.article}`);
    }

    // Add note hint if present on card
    if (currentCard.note) {
      const noteLabel = tx(isRTL, 'نکته:', 'Note:');
      hintsPool.push(`${noteLabel} ${currentCard.note}`);
    }

    // Add phonetic pronunciation hint when user needs to say/type targetText
    if (!isReverse) {
      if (currentCard.pronunciation) {
        const pronLabel = tx(isRTL, 'راهنمای تلفظ:', 'Pronunciation:');
        hintsPool.push(`${pronLabel} /${currentCard.pronunciation}/`);
      } else {
        const pron = getPronunciationHint(
          currentCard.targetText,
          currentCard.targetLanguage,
          ((uiLanguage === 'en-US' ? 'en' : uiLanguage) || 'en') as Language,
          currentCard.pronunciation
        );
        if (pron) {
          hintsPool.push(pron);
        }
      }
    }

    // In reading/audio modes, also offer meaning if not already shown
    if ((isReadingMode || settings.displayMode === 'audio_only') && currentCard.translation) {
      const meaningLabel = tx(isRTL, 'معنی عبارت:', 'Meaning:');
      hintsPool.push(`${meaningLabel} ${currentCard.translation}`);
    }

    if (hintsPool.length === 0) {
      const fallbackText = isReverse ? currentCard.translation : currentCard.targetText;
      const fallbackLabel = tx(isRTL, 'راهنمایی:', 'Clue:');
      hintsPool.push(`${fallbackLabel} ${fallbackText.slice(0, Math.max(2, Math.floor(fallbackText.length / 2)))}...`);
    }

    const chosen = hintsPool[Math.floor(Math.random() * hintsPool.length)];
    setRandomHintMessage(chosen);
    setShowRandomHint(true);
  };

  // Skip card: User sees the correct answer first before proceeding to the next card!
  const handleSkip = () => {
    if (!currentCard) return;
    sound.playPass();
    if (isListening || isUserSpeakingRef.current) {
      isUserSpeakingRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    }
    if (geminiRecorderRef.current) {
      try {
        geminiRecorderRef.current.stop();
      } catch {}
      geminiRecorderRef.current = null;
    }
    setIsGeminiRecording(false);
    setShowSkippedDetails(false);
    setSkippedCardInfo({
      card: currentCard,
      targetText: currentCard.targetText,
      translation: currentCard.translation,
      pronunciation: currentCard.pronunciation,
      grammarPoint: currentCard.grammarPoint,
      hint: currentCard.hint
    });
  };

  const handleConfirmSkipAndNext = () => {
    setSkippedCardInfo(null);
    handleNextCard(true);
  };

  const handleNextCard = (skipCurrent: boolean = false) => {
    if (!currentCard) return;
    sound.playClick();

    if (skipCurrent && !evaluation?.isCorrect) {
      // Mark as skipped/failed
      const timeSpent = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      const resEntry: SinglePlayerCardResult = {
        card: currentCard,
        userAnswer: userInput || '(Skipped)',
        isCorrect: false,
        attempts,
        timeSpentSeconds: timeSpent,
        pointsEarned: 0,
        similarityScore: 0,
        aiFeedback: 'Card skipped'
      };
      setResults(prev => [...prev, resEntry]);

      recordAdaptiveAnswer(false, timeSpent * 1000);

      // Re-queue missed card to repeat later so user masters it (70/30 Pedagogical Rule)
      setCards(prev => [...prev, { ...currentCard }]);
    }

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (isTimedMatch && matchRemainingSeconds > 0) {
        // Timed match: dynamically supply more cards so player can keep answering!
        const moreCards = getUniqueCardsForSession(
          settings.targetLanguage,
          settings.nativeLanguage,
          settings.cefrLevel,
          settings.selectedCategories,
          10,
          false
        );
        setCards(prev => [...prev, ...moreCards]);
        setCurrentIndex(prev => prev + 1);
      } else {
        // Finished all cards! Build report
        finishSession([...results, ...(evaluation?.isCorrect ? [] : [{
          card: currentCard,
          userAnswer: userInput,
          isCorrect: evaluation?.isCorrect || false,
          attempts,
          timeSpentSeconds: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
          pointsEarned: evaluation?.pointsAwarded || 0,
          similarityScore: evaluation?.similarity || 0,
          aiFeedback: evaluation?.feedbackMessage
        }])]);
      }
    }
  };

  const finishSession = (finalResults: SinglePlayerCardResult[]) => {
    const total = finalResults.length;
    const correctFirst = finalResults.filter(r => r.isCorrect && r.attempts === 1).length;
    const corrected = finalResults.filter(r => r.isCorrect && r.attempts > 1).length;
    const failed = finalResults.filter(r => !r.isCorrect).length;
    const accuracy = total > 0 ? Math.round(((correctFirst + corrected) / total) * 100) : 0;

    const weakCards = finalResults.filter(r => !r.isCorrect || r.attempts > 1).map(r => r.card);

    // Save seen cards and weak cards to content engine
    markCardsAsSeen(finalResults.map(r => r.card.id));
    if (weakCards.length > 0) {
      saveWeakCards(weakCards);
    }

    // Persist personal records and update high scores
    updatePersonalRecords({
      score: totalScore,
      accuracy,
      streak: bestStreak,
      answerTimeSeconds: fastestAnswerRef.current < 999 ? fastestAnswerRef.current : 0,
      cardsCount: total,
      roundsCount: 3
    });

    const report: SinglePlayerSessionReport = {
      id: `rep_${Date.now()}`,
      timestamp: new Date().toISOString(),
      settings,
      results: finalResults,
      totalScore,
      totalCards: total,
      correctFirstTry: correctFirst,
      correctedCount: corrected,
      failedCount: failed,
      accuracy,
      bestStreak,
      weakCards,
      totalDurationSeconds: Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000))
    };

    onFinish(report);
  };

  if (!currentCard) {
    return (
      <div className="w-full max-w-md mx-auto h-full flex items-center justify-center p-4 text-[var(--ink)] text-center font-ui" dir={((isRTL ? 'rtl' : 'ltr'))}>
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[24px] shadow-sm p-6 max-w-sm">
          <p className="font-bold mb-4 text-[var(--mute)]">{tx(isRTL, 'کارتی برای نمایش وجود ندارد.', 'No cards available.')}</p>
          <button onClick={onExit} className="py-2.5 px-5 rounded-xl bg-[var(--lapis)] text-[var(--on-lapis)] font-bold text-sm shadow-xs cursor-pointer">
            {tx(isRTL, 'بازگشت', 'Back')}
          </button>
        </div>
      </div>
    );
  }

  const isAudioOnly = settings.displayMode === 'audio_only';
  const puzzleLang = currentCard?.targetLanguage || settings.targetLanguage || 'en';
  const puzzleKey = currentCard ? `${puzzleLang}:${(currentCard as any).conceptId || currentCard.id}` : '';
  const puzzleStage = currentCard ? getPuzzleStage(puzzleKey) : 0;
  const puzzleActive =
    !!currentCard &&
    !puzzleDismissed &&
    settings.displayMode !== 'translate_to_native' &&
    puzzleStage < MAX_PUZZLE_STAGE &&
    ((currentCard.puzzleChunks?.length || 0) >= 3 || isLongSentence(currentCard.targetText || '', puzzleLang));

  return (
    <div 
      className="app w-full max-w-lg sm:max-w-xl md:max-w-2xl mx-auto min-h-full flex-1 px-3 sm:px-4 pb-12 font-ui relative flex flex-col justify-between overflow-y-auto overscroll-contain"
      dir={((isRTL ? 'rtl' : 'ltr'))}
    >
      {/* 1. Header (clean, focused: ONLY Stop Game button + progress & score) */}
      <header className="sticky top-0 z-20 bg-[var(--bg)] flex items-center justify-between py-2 px-0.5 border-b border-[var(--line)]/50 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowExitConfirm(true);
            }}
            className="h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] hover:bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0 font-extrabold text-xs"
            aria-label={t.pause || (tx(isRTL, 'توقف بازی', 'Pause Game'))}
            title={t.pause || (tx(isRTL, 'توقف بازی', 'Pause Game'))}
          >
            <Pause size={15} className="text-[var(--lapis)] shrink-0" />
            <span>{tx(isRTL, 'توقف بازی', 'Pause')}</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-black leading-tight text-[var(--ink)] truncate">
              {t.singlePlayer || (tx(isRTL, 'تمرین تک‌نفره', 'Practice'))}
            </h1>
            <span className="text-[11px] font-bold text-[var(--mute)]">
              {isTimedMatch 
                ? (txt(isRTL, 'مسابقه زمان‌دار • {1} حل‌شده', 'Timed Match • {0} solved', [results.filter(r => r.isCorrect).length, toPersian(results.filter(r => r.isCorrect).length, isRTL)]))
                : (txt(isRTL, 'کارت {2} از {3}', 'Card {0} of {1}', [currentIndex + 1, cards.length, toPersian(currentIndex + 1, isRTL), toPersian(cards.length, isRTL)]))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Timed Tournament Clock (Only shown in explicit timed tournament mode) */}
          {isTimedMatch && (
            <div className={`px-2 py-1 rounded-xl border text-[11px] font-black flex items-center gap-1 transition-all ${
              matchRemainingSeconds <= 10 
                ? 'bg-rose-500/20 text-rose-600 border-rose-500/50 animate-pulse' 
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40'
            }`}>
              <Clock size={12} className={matchRemainingSeconds <= 10 ? 'animate-spin' : ''} />
              <span className="font-mono">
                {Math.floor(matchRemainingSeconds / 60)}:{(matchRemainingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Score Badge */}
          <div 
            key={`score-${totalScore}`}
            className="px-2.5 py-1 rounded-xl bg-[var(--panel)] border border-amber-500/40 text-xs font-black text-[var(--ink)] flex items-center gap-1 shadow-xs"
          >
            <Award size={13} className="text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400 font-extrabold font-ui">{toPersian(totalScore, isRTL)}</span>
          </div>
        </div>
      </header>

      {/* 3. Progress Bar (Sleek, minimal, non-repetitive) */}
      <div className="mt-2 shrink-0">
        {streak > 1 && (
          <div className="flex justify-end mb-1">
            <span className="text-amber-500 font-extrabold text-[11px] flex items-center gap-1">
              <Flame size={12} className="text-amber-500" />
              <span>{toPersian(streak, isRTL)} {tx(isRTL, 'پیاپی', 'streak')}</span>
            </span>
          </div>
        )}
        <div className="w-full h-1.5 bg-[var(--line)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--turq)] transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / Math.max(1, cards.length)) * 100}%` }}
          />
        </div>
      </div>

      {/* Actionable Error & Interactive Microphone Helper Banner */}
      {actionableError && (
        <div className="mt-1.5 p-2.5 rounded-2xl bg-[var(--panel)] border border-[var(--danger)]/60 text-[var(--danger)] text-xs font-bold flex flex-col gap-2 text-start leading-relaxed shadow-xs animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span className="whitespace-normal break-words">{actionableError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionableError(null);
                setMicErrorReason(null);
              }}
              className="text-[var(--danger)]/70 hover:text-[var(--danger)] p-0.5 cursor-pointer shrink-0"
              aria-label={tx(isRTL, 'بستن', 'Dismiss')}
            >
              <X size={14} />
            </button>
          </div>

          {/* Interactive Helper Buttons when Microphone fails */}
          {micErrorReason && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--danger)]/20">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  window.location.reload();
                }}
                className="px-2.5 py-1 rounded-xl bg-[var(--lapis)] text-[var(--on-lapis)] text-[11px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-2xs"
              >
                <RotateCcw size={12} />
                <span>{tx(isRTL, 'بارگذاری مجدد پیش‌نمایش (اعمال دسترسی)', 'Reload Preview (Apply Permission)')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMicPermissionError(null);
                  setShowMicPermissionModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-[var(--bg)] hover:bg-[var(--lapis-soft)] text-[var(--ink)] border border-[var(--line)] text-[11px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <Settings2 size={12} />
                <span>{tx(isRTL, 'راهنمای کامل و لینک مستقیم', 'Full Guide & Direct Link')}</span>
              </button>

              <button
                type="button"
                onClick={handleGrantPermissionAndStart}
                disabled={isRequestingMic}
                className="px-2.5 py-1 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-[var(--turq)] border border-teal-500/30 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <Mic size={12} className={isRequestingMic ? 'animate-pulse' : ''} />
                <span>{isRequestingMic ? (tx(isRTL, 'در حال تست...', 'Testing...')) : (tx(isRTL, 'تست مجدد میکروفون', 'Retry Mic'))}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Epic B2: Mode Transition Toast (2s non-blocking) */}
      {adaptiveToastMessage && (
        <div
          data-testid="adaptive-mode-toast"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[var(--panel)] border-2 border-[var(--turq)] shadow-xl text-xs sm:text-sm font-extrabold text-[var(--ink)] flex items-center gap-2 animate-bounce"
          role="status"
          aria-live="polite"
        >
          <Sparkles size={16} className="text-[var(--turq)] shrink-0" />
          <span>{adaptiveToastMessage}</span>
        </div>
      )}

      {/* Epic A4 & §5.6: CEFR Level Suggestion Toast */}
      {levelSuggestion && (
        <div
          data-testid="adaptive-level-suggestion"
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[var(--panel)] border-2 border-amber-400 shadow-xl text-xs sm:text-sm font-extrabold text-[var(--ink)] flex items-center gap-3 animate-fade-in"
          role="alert"
        >
          <Lightbulb size={18} className="text-amber-500 shrink-0" />
          <span>{txt(isRTL, 'به نظر سطحت {0} است. تغییرش بدهیم؟', 'Looks like your level is {0}. Switch?', [levelSuggestion])}</span>
          <button
            type="button"
            onClick={() => {
              setSettings(prev => ({ ...prev, cefrLevel: levelSuggestion as CEFRLevel }));
              setLevelSuggestion(null);
            }}
            className="btn-primary !min-h-[28px] !h-7 !px-2.5 !py-0.5 !text-xs !rounded-lg"
          >
            {txt(isRTL, 'تغییر به {0}', 'Switch to {0}', [levelSuggestion])}
          </button>
          <button
            type="button"
            onClick={() => setLevelSuggestion(null)}
            className="text-[var(--mute)] hover:text-[var(--ink)] p-0.5"
            aria-label="بستن"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4. Center Interactive Flashcard in .panel style */}
      <div className="panel my-1.5 flex-1 flex flex-col justify-between relative !p-3.5 sm:!p-4">
        {/* Top of card: Clear instruction badge, adaptive indicator & smart clue button */}
        <div className="flex items-center justify-between mb-1.5 min-h-[28px] gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--lapis-soft)] text-[var(--lapis)] text-[11px] font-extrabold">
              <span>
                {settings.displayMode === 'translate_to_target'
                  ? (tx(isRTL, 'به زبان هدف ترجمه کنید:', 'Translate to target language:'))
                  : settings.displayMode === 'translate_to_native'
                    ? (tx(isRTL, 'معنی عبارت را بنویسید یا بگویید:', 'Translate to your native language:'))
                    : settings.displayMode === 'audio_only'
                      ? (tx(isRTL, 'گوش دهید و عبارت را بنویسید یا بگویید:', 'Listen and type or speak:'))
                      : (tx(isRTL, 'عبارت زیر را بخوانید یا تایپ کنید:', 'Read aloud or type this phrase:'))}
              </span>
            </div>

            {/* Adaptive Difficulty Indicator Badge (Epic B1) */}
            <div
              data-testid="adaptive-indicator-badge"
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border transition-all ${
                currentIndicator === 'review'
                  ? 'bg-emerald-500/15 border-emerald-400 text-emerald-800 dark:text-emerald-300'
                  : currentIndicator === 'challenge'
                    ? 'bg-amber-500/15 border-amber-400 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'bg-blue-500/15 border-blue-400 text-blue-800 dark:text-blue-300'
              }`}
              aria-label={
                currentIndicator === 'review'
                  ? (tx(isRTL, 'کارت مرور - سطح آسان برای تثبیت یادگیری', 'Review card - easy practice for memory retention'))
                  : currentIndicator === 'challenge'
                    ? (tx(isRTL, 'کارت چالش - امتیاز بیشتر برای تعمیق مهارت', 'Challenge card - bonus points to push mastery'))
                    : (tx(isRTL, 'کارت متعادل - ناحیه یادگیری مطلوب', 'Balanced card - optimal flow band'))
              }
            >
              <span>{currentIndicator === 'review' ? tx(isRTL, '🌱 مرور', '🌱 Review') : currentIndicator === 'challenge' ? tx(isRTL, '🔥 چالش', '🔥 Challenge') : tx(isRTL, '⚖️ متعادل', '⚖️ Balanced')}</span>
            </div>
          </div>

          {/* Hidden test-accessible hint trigger for automated audit tests */}
          <button
            type="button"
            data-testid="hint-button"
            onClick={handleTriggerRandomHint}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* Compact quick hint trigger button */}
          <button
            type="button"
            onClick={handleTriggerRandomHint}
            className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--panel)] text-[var(--ink)] text-[11px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
            title={tx(isRTL, 'دریافت راهنمایی', 'Get a clue')}
          >
            <Lightbulb size={13} className="text-amber-500" />
            <span>{tx(isRTL, 'راهنمایی', 'Clue')}</span>
          </button>
        </div>

        {/* Random Hint Toast Bubble (multi-word, fully readable) */}
        {showRandomHint && randomHintMessage && (
          <div data-testid="hint-bubble" className="mb-1.5 p-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between animate-fade-in shadow-2xs gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed break-words">{randomHintMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRandomHint(false)}
              className="text-amber-700 dark:text-amber-300 hover:text-amber-900 p-0.5 cursor-pointer shrink-0"
              aria-label={tx(isRTL, 'بستن', 'Close')}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Center Card Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center py-2">
          <CardImage card={currentCard} className="mb-2" />
          {/* State: Skipped Card Review (User sees correct answer before proceeding to next card) */}
          {skippedCardInfo ? (
            <div className="py-1 flex flex-col items-center justify-center w-full text-center animate-fade-in">
              <div className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-extrabold mb-1.5">
                <CheckCircle2 size={14} className="text-amber-500" />
                <span>{tx(isRTL, 'پاسخ صحیح کارت', 'Correct Card Answer')}</span>
              </div>

              <div 
                dir={isRtlLang(skippedCardInfo.card.targetLanguage) ? 'rtl' : 'ltr'} lang={(skippedCardInfo.card.targetLanguage) as string}
                className="text-xl sm:text-2xl font-black text-[var(--ink)] tracking-tight leading-snug py-0.5 select-text"
              >
                {/* کمک بعد از جواب می‌آید، نه پیش از آن */}
                {skippedCardInfo.targetText === skippedCardInfo.card.targetText
                  ? <TrainingWheelText card={skippedCardInfo.card} uiLanguage={uiLanguage} showWhy />
                  : skippedCardInfo.targetText}
              </div>

              {skippedCardInfo.pronunciation && (
                <div className="text-xs font-bold text-[var(--lapis)] mt-0.5">
                  /{skippedCardInfo.pronunciation}/
                </div>
              )}

              <div 
                dir={isRtlLang(skippedCardInfo.card.nativeLanguage || settings.nativeLanguage || 'fa') ? 'rtl' : 'ltr'} lang={(skippedCardInfo.card.nativeLanguage || settings.nativeLanguage || 'fa') as string}
                className="text-sm sm:text-base font-bold text-[var(--mute)] mt-1.5 mb-2 select-text"
              >
                {skippedCardInfo.translation}
              </div>

              {/* Unified Audio Controls on Skipped Card Review */}
              <div className="flex items-center justify-center gap-2 my-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIsPlayingAudio(true);
                    sound.speakNative(skippedCardInfo.targetText, skippedCardInfo.card.targetLanguage, {
                      onEnd: () => setIsPlayingAudio(false)
                    });
                    window.setTimeout(() => setIsPlayingAudio(false), 3000);
                  }}
                  className="btn-primary !min-h-[34px] !h-8.5 !px-3 !py-1 !text-xs !rounded-xl flex items-center gap-1.5 cursor-pointer"
                  aria-label={t.audioPronunciation || (tx(isRTL, 'پخش تلفظ صوتی', 'Play Audio'))}
                >
                  <Volume2 size={14} className={isPlayingAudio ? 'animate-pulse' : ''} />
                  <span>{isPlayingAudio ? (tx(isRTL, 'در حال پخش...', 'Playing...')) : (tx(isRTL, 'پخش صدا', 'Play Audio'))}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIsPlayingAudio(true);
                    sound.speakSlow(skippedCardInfo.targetText, skippedCardInfo.card.targetLanguage, {
                      onEnd: () => setIsPlayingAudio(false)
                    });
                    window.setTimeout(() => setIsPlayingAudio(false), 4500);
                  }}
                  className="btn-ghost !min-h-[34px] !h-8.5 !px-2.5 !py-1 !text-xs !rounded-xl flex items-center gap-1 cursor-pointer"
                  aria-label={t.slowAudioLabel || (tx(isRTL, 'پخش شمرده (تلفظ آرام ۰.۷x)', 'Slow Audio (0.7x)'))}
                >
                  <Volume1 size={14} className="text-[var(--turq)]" />
                  <span>{tx(isRTL, 'شمرده', 'Slow')}</span>
                </button>
              </div>

              {/* Proceed to Next Card Button */}
              <button
                type="button"
                onClick={handleConfirmSkipAndNext}
                className="btn-turq !min-h-[36px] !h-9 !px-5 !text-xs !rounded-xl flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                <span>{tx(isRTL, 'کارت بعدی', 'Next Card')}</span>
                <ArrowRight size={14} className={((isRTL ? 'rotate-180' : ''))} />
              </button>
            </div>
          ) : settings.displayMode === 'audio_only' && !evaluation?.isCorrect ? (
            /* Mode 1: Audio-Only */
            <div className="py-2 flex flex-col items-center justify-center gap-2.5 w-full">
              <div className="w-14 h-14 rounded-full bg-[var(--lapis-soft)] text-[var(--lapis)] flex items-center justify-center animate-pulse">
                <Headphones size={26} />
              </div>
              <p className="text-xs sm:text-sm font-bold text-[var(--ink)] text-center">
                {tx(isRTL, 'گوش دهید و عبارت شنیده‌شده را بگویید یا بنویسید', 'Listen and repeat or type what you hear')}
              </p>

              {/* Unified Audio Controls */}
              {sound.isVoiceSupportedSync(currentCard?.targetLanguage) && (
              <div className="flex items-center justify-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="btn-primary !min-h-[34px] !h-8.5 !px-3 !py-1 !text-xs !rounded-xl flex items-center gap-1.5 cursor-pointer"
                  aria-label={t.audioPronunciation || (tx(isRTL, 'پخش تلفظ صوتی', 'Play Audio'))}
                >
                  <Volume2 size={14} className={isPlayingAudio ? 'animate-pulse' : ''} />
                  <span>{isPlayingAudio ? (tx(isRTL, 'در حال پخش...', 'Playing...')) : (tx(isRTL, 'پخش صدا', 'Play Audio'))}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePlaySlowAudio}
                  className="btn-ghost !min-h-[34px] !h-8.5 !px-2.5 !py-1 !text-xs !rounded-xl flex items-center gap-1 cursor-pointer"
                  aria-label={t.slowAudioLabel || (tx(isRTL, 'پخش شمرده (تلفظ آرام ۰.۷x)', 'Slow Audio (0.7x)'))}
                >
                  <Volume1 size={14} className="text-[var(--turq)]" />
                  <span>{tx(isRTL, 'شمرده', 'Slow')}</span>
                </button>
              </div>
              )}
            </div>
          ) : settings.displayMode === 'translate_to_target' ? (
            /* Mode 2: Translate to Target (Native prompt visible, target text hidden until revealed/correct) */
            <div className="py-1.5 flex flex-col items-center justify-center w-full text-center">
              <div 
                dir={isRtlLang(currentCard.nativeLanguage || settings.nativeLanguage || 'fa') ? 'rtl' : 'ltr'} lang={(currentCard.nativeLanguage || settings.nativeLanguage || 'fa') as string}
                className="text-xl sm:text-2xl font-black text-[var(--ink)] tracking-tight leading-snug py-0.5"
              >
                {currentCard.translation}
              </div>

              {currentCard.article && (
                <div className="mt-1 flex items-center justify-center">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {tx(isRTL, 'حرف تعریف:', 'Article:')} {currentCard.article}
                  </span>
                </div>
              )}

              {(isRevealed || evaluation?.isCorrect) && (
                <div 
                  dir={isRtlLang(currentCard.targetLanguage) ? 'rtl' : 'ltr'} lang={(currentCard.targetLanguage) as string}
                  className="mt-2 text-base sm:text-lg font-black text-[var(--ink)] bg-[var(--bg)] px-3.5 py-1 rounded-xl border border-[var(--line)]"
                >
                  {/* جواب آشکار شده: حالا نشانه‌ها می‌آیند (رنگ فیروزه‌ای کل جمله برداشته شد، چون فیروزه‌ای یعنی «de») */}
                  <TrainingWheelText card={currentCard} uiLanguage={uiLanguage} showWhy />
                </div>
              )}

              {/* Unified Audio Controls */}
              {sound.isVoiceSupportedSync(currentCard?.targetLanguage) && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="btn-primary !min-h-[34px] !h-8.5 !px-3 !py-1 !text-xs !rounded-xl flex items-center gap-1.5 cursor-pointer"
                  aria-label={t.audioPronunciation || (tx(isRTL, 'پخش تلفظ صوتی', 'Play Audio'))}
                >
                  <Volume2 size={14} className={isPlayingAudio ? 'animate-pulse' : ''} />
                  <span>{isPlayingAudio ? (tx(isRTL, 'در حال پخش...', 'Playing...')) : (tx(isRTL, 'پخش صدا', 'Play Audio'))}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaySlowAudio}
                  className="btn-ghost !min-h-[34px] !h-8.5 !px-2.5 !py-1 !text-xs !rounded-xl flex items-center gap-1 cursor-pointer"
                  aria-label={t.slowAudioLabel || (tx(isRTL, 'پخش شمرده (تلفظ آرام ۰.۷x)', 'Slow Audio (0.7x)'))}
                >
                  <Volume1 size={14} className="text-[var(--turq)]" />
                  <span>{tx(isRTL, 'شمرده', 'Slow')}</span>
                </button>
              </div>
              )}
            </div>
          ) : settings.displayMode === 'translate_to_native' ? (
            /* Mode 3: Translate to Native (Target text visible, native meaning hidden until revealed/correct) */
            <div className="py-1.5 flex flex-col items-center justify-center w-full text-center">
              <div 
                dir={isRtlLang(currentCard.targetLanguage) ? 'rtl' : 'ltr'} lang={(currentCard.targetLanguage) as string}
                className="text-xl sm:text-2xl font-black text-[var(--ink)] tracking-tight leading-snug py-0.5"
              >
                <TrainingWheelText card={currentCard} cefrLevel={settings.cefrLevel} uiLanguage={uiLanguage} />
              </div>

              {currentCard.pronunciation && (
                <div className="text-xs font-bold text-[var(--mute)] mt-0.5">
                  /{currentCard.pronunciation}/
                </div>
              )}

              {(isRevealed || evaluation?.isCorrect) && (
                <div 
                  dir={isRtlLang(currentCard.nativeLanguage || settings.nativeLanguage || 'fa') ? 'rtl' : 'ltr'} lang={(currentCard.nativeLanguage || settings.nativeLanguage || 'fa') as string}
                  className="mt-2 text-base sm:text-lg font-black text-[var(--lapis)] bg-[var(--bg)] px-3.5 py-1 rounded-xl border border-[var(--line)]"
                >
                  {currentCard.translation}
                </div>
              )}

              {/* Unified Audio Controls */}
              {sound.isVoiceSupportedSync(currentCard?.targetLanguage) && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="btn-primary !min-h-[34px] !h-8.5 !px-3 !py-1 !text-xs !rounded-xl flex items-center gap-1.5 cursor-pointer"
                  aria-label={t.audioPronunciation || (tx(isRTL, 'پخش تلفظ صوتی', 'Play Audio'))}
                >
                  <Volume2 size={14} className={isPlayingAudio ? 'animate-pulse' : ''} />
                  <span>{isPlayingAudio ? (tx(isRTL, 'در حال پخش...', 'Playing...')) : (tx(isRTL, 'پخش صدا', 'Play Audio'))}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaySlowAudio}
                  className="btn-ghost !min-h-[34px] !h-8.5 !px-2.5 !py-1 !text-xs !rounded-xl flex items-center gap-1 cursor-pointer"
                  aria-label={t.slowAudioLabel || (tx(isRTL, 'پخش شمرده (تلفظ آرام ۰.۷x)', 'Slow Audio (0.7x)'))}
                >
                  <Volume1 size={14} className="text-[var(--turq)]" />
                  <span>{tx(isRTL, 'شمرده', 'Slow')}</span>
                </button>
              </div>
              )}
            </div>
          ) : (
            /* Mode 4: Text & Audio (Reading & Speech - shows target phrase and translation clearly) */
            <div className="py-1.5 flex flex-col items-center justify-center w-full text-center">
              <div 
                dir={isRtlLang(currentCard.targetLanguage) ? 'rtl' : 'ltr'} lang={(currentCard.targetLanguage) as string}
                className="text-xl sm:text-2xl font-black text-[var(--ink)] tracking-tight leading-snug py-0.5"
              >
                <TrainingWheelText card={currentCard} cefrLevel={settings.cefrLevel} uiLanguage={uiLanguage} />
              </div>

              {currentCard.pronunciation && (
                <div className="text-xs font-bold text-[var(--lapis)] mt-0.5">
                  /{currentCard.pronunciation}/
                </div>
              )}

              <div 
                dir={isRtlLang(currentCard.nativeLanguage || settings.nativeLanguage || 'fa') ? 'rtl' : 'ltr'} lang={(currentCard.nativeLanguage || settings.nativeLanguage || 'fa') as string}
                className="text-xs sm:text-sm font-bold text-[var(--mute)] mt-1.5"
              >
                {currentCard.translation}
              </div>

              {/* Unified Audio Controls */}
              {sound.isVoiceSupportedSync(currentCard?.targetLanguage) && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="btn-primary !min-h-[34px] !h-8.5 !px-3 !py-1 !text-xs !rounded-xl flex items-center gap-1.5 cursor-pointer"
                  aria-label={t.audioPronunciation || (tx(isRTL, 'پخش تلفظ صوتی', 'Play Audio'))}
                >
                  <Volume2 size={14} className={isPlayingAudio ? 'animate-pulse' : ''} />
                  <span>{isPlayingAudio ? (tx(isRTL, 'در حال پخش...', 'Playing...')) : (tx(isRTL, 'پخش صدا', 'Play Audio'))}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaySlowAudio}
                  className="btn-ghost !min-h-[34px] !h-8.5 !px-2.5 !py-1 !text-xs !rounded-xl flex items-center gap-1 cursor-pointer"
                  aria-label={t.slowAudioLabel || (tx(isRTL, 'پخش شمرده (تلفظ آرام ۰.۷x)', 'Slow Audio (0.7x)'))}
                >
                  <Volume1 size={14} className="text-[var(--turq)]" />
                  <span>{tx(isRTL, 'شمرده', 'Slow')}</span>
                </button>
              </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Answer Feedback & Correction Banner */}
      {evaluation && (
        <div className="my-1.5 shrink-0 animate-fade-in font-ui">
          <div className={`p-3.5 rounded-[16px] border text-xs font-bold shadow-xs ${
            evaluation.isCorrect 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200' 
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-200'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {evaluation.isCorrect ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-[var(--ink)] leading-snug">{evaluation.feedbackMessage}</div>
                  {evaluation.isCorrect && (
                    <div className="text-[11px] text-emerald-600 mt-0.5 font-bold">
                      +{toPersian(evaluation.pointsAwarded, isRTL)} {t.pointsUnit || (tx(isRTL, 'امتیاز', 'PTS'))}
                    </div>
                  )}
                </div>
              </div>

              {evaluation.isCorrect && (
                <button
                  type="button"
                  onClick={() => handleNextCard(false)}
                  className="btn-turq !min-h-[38px] !text-xs !py-1 !px-3 shrink-0"
                >
                  <span>{t.nextCard}</span>
                  <ArrowRight size={13} className={((isRTL ? 'rotate-180' : ''))} />
                </button>
              )}
            </div>

            {/* Actionable buttons & guidance if incorrect */}
            {!evaluation.isCorrect && (
              <div className="mt-2.5 pt-2.5 border-t border-rose-200 dark:border-rose-800/50 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTryAgain}
                    className="btn-danger !min-h-[38px] !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw size={14} />
                    <span>{tx(isRTL, 'تلاش مجدد', 'Try Again')}</span>
                  </button>

                  {sound.isVoiceSupportedSync(currentCard?.targetLanguage) && (
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    className="btn-ghost !min-h-[38px] !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 size={14} className="text-[var(--lapis)]" />
                    <span>{tx(isRTL, 'شنیدن تلفظ', 'Listen')}</span>
                  </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setIsRevealed(true);
                    }}
                    className="btn-ghost !min-h-[38px] !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>{tx(isRTL, 'مشاهده پاسخ', 'Show Answer')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Minimalist Ergonomic Input Bar: Type / Voice-to-Text / Check / Skip */}
      <div className="space-y-1.5 shrink-0 font-ui mt-1">
        {/* Compact Input and 3 Action Buttons Row (Only active during live card guessing, hidden when answered correctly or during skipped review) */}
        {!skippedCardInfo && !evaluation?.isCorrect && (
          <div className="space-y-1.5">
            {/* پازل تکه‌ها: داربست جمله‌های بلند (به‌جای تایپ طولانی) */}
            {puzzleActive && currentCard && (
              <SentencePuzzle
                text={currentCard.targetText}
                lang={currentCard.targetLanguage || settings.targetLanguage || 'en'}
                stage={puzzleStage}
                chunks={puzzleStage === 0 ? currentCard.puzzleChunks : undefined}
                isRTL={isRTL}
                onTap={(ok) => (ok ? sound.playClick() : sound.hapticFeedback('error'))}
                onSkipPuzzle={() => setPuzzleDismissed(true)}
                onSolved={(mistakes) => {
                  recordPuzzleSolved(puzzleKey, mistakes);
                  submitAnswer(currentCard.targetText);
                }}
              />
            )}
            {/* Adaptive Exercise Options (choice2 scaffold for A1 or 4-choice recognize) */}
            {!puzzleActive && (revealedOptions || (!!currentCard?.fixedOptions && settings.displayMode !== 'translate_to_native') || currentExerciseType === 'choice2' || currentExerciseType === 'recognize') && quickQuizOptions.length > 0 && (
              <div className="grid grid-cols-2 gap-2 my-1 animate-fade-in" data-testid="adaptive-choice-options">
                {quickQuizOptions.map((opt, optIdx) => (
                  <button
                    key={`opt-${optIdx}-${opt}`}
                    type="button"
                    onClick={() => submitAnswer(opt)}
                    className="p-2 sm:p-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] hover:bg-[var(--lapis-soft)] hover:border-[var(--lapis)] text-xs sm:text-sm font-bold text-[var(--ink)] text-center transition-all cursor-pointer active:scale-98 shadow-xs line-clamp-2"
                    aria-label={`گزینه ${optIdx + 1}: ${opt}`}
                  >
                    <span className="opacity-60 text-[10px] ml-1.5">{optIdx + 1}.</span>
                    <bdi dir="auto">{opt}</bdi>
                  </button>
                ))}
              </div>
            )}

            {/* Real-time Spoken Transcript Preview & ~1.5s Auto-Submit Countdown Buffer */}
            {pendingVoiceSubmit && (
              <div className="p-2.5 rounded-xl border border-teal-500/30 bg-teal-50 dark:bg-teal-950/40 flex items-center justify-between gap-2 animate-fade-in shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Mic size={16} className="text-[var(--turq)] animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-[var(--mute)] font-medium">
                      {tx(isRTL, 'گفتار تشخیص داده شده (ثبت تا ۱.۵ ثانیه):', 'Spoken text recognized (submitting in ~1.5s):')}
                    </div>
                    <div className="text-xs font-black text-[var(--ink)] truncate">
                      «{pendingVoiceSubmit.transcript}»
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelVoiceSubmit}
                  className="btn-danger !min-h-[30px] !h-7.5 !px-2.5 !py-0.5 !text-xs !rounded-lg flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={12} />
                  <span>{tx(isRTL, 'تلاش دوباره', 'Try again')}</span>
                </button>
              </div>
            )}

            {/* Unsupported Browser Note */}
            {!speechSupported && (
              <div className="text-[10px] text-[var(--mute)] font-medium text-center">
                {tx(isRTL, '⚠️ تشخیص صوت در این مرورگر فعال نیست (از مرورگر Chrome یا Edge استفاده فرمایید).', '⚠️ Voice input is not supported in this browser (use Chrome or Edge).')}
              </div>
            )}

            {/* Slim Text Input */}
            <div className="relative w-full flex items-center">
              <input
                ref={textInputRef}
                type="text"
                dir={
                  userInput.trim()
                    ? (isRtlLang(settings.displayMode === 'translate_to_native' ? (currentCard?.nativeLanguage || settings.nativeLanguage || (uiLanguage || 'en')) : (currentCard?.targetLanguage || settings.targetLanguage || 'en')) ? 'rtl' : 'ltr')
                    : (((isRTL ? 'rtl' : 'ltr')))
                }
                value={userInput}
                onChange={e => {
                  liveTranscriptRef.current = e.target.value;
                  setUserInput(e.target.value);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCheckAnswer();
                }}
                placeholder={
                  isTranscribingWithGemini
                    ? (tx(isRTL, 'در حال تبدیل صدا به کلمه و جمله...', 'Converting voice to text...'))
                    : (isListening || isGeminiRecording)
                      ? (tx(isRTL, 'در حال شنیدن... صحبت کنید تا به متن تبدیل شود', 'Listening... Speak to convert to text'))
                      : (t.enterAnswerPlaceholder || (tx(isRTL, 'پاسخ را تایپ کنید یا با میکروفون بگویید...', 'Type or speak your answer...')))
                }
                className={`w-full bg-[var(--panel)] text-[var(--ink)] px-3 py-1.5 h-9 rounded-xl border text-xs font-bold focus:outline-none transition-colors shadow-2xs ${
                  isListening || isGeminiRecording
                    ? 'border-[var(--turq)] ring-2 ring-[var(--turq)]/20'
                    : 'border-[var(--line)] focus:border-[var(--lapis)]'
                }`}
              />
            </div>

            {/* Compact 3-Button Action Bar (Check Answer + Voice-to-Text Mic + Skip) */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={handleCheckAnswer}
                disabled={isTranscribingWithGemini}
                className="btn-primary !min-h-[34px] !h-8.5 !px-2.5 !py-1 !text-xs !rounded-xl whitespace-nowrap flex items-center justify-center gap-1.5 font-extrabold cursor-pointer disabled:opacity-60"
                aria-label={t.checkAnswer || (tx(isRTL, 'بررسی پاسخ', 'Check Answer'))}
              >
                <Send size={13} className={`shrink-0 ${((isRTL ? 'rotate-180' : ''))}`} />
                <span className="truncate">{t.checkAnswer || (tx(isRTL, 'بررسی پاسخ', 'Check'))}</span>
              </button>

              <button
                type="button"
                onClick={toggleListening}
                disabled={!speechSupported}
                title={
                  !speechSupported
                    ? (tx(isRTL, 'تشخیص صوت در این مرورگر پشتیبانی نمی‌شود (از Chrome یا Edge استفاده کنید)', 'Voice input not supported in this browser (use Chrome or Edge)'))
                    : undefined
                }
                className={`min-h-[34px] h-8.5 px-2.5 py-1 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs text-xs font-extrabold ${
                  !speechSupported
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-[var(--line)] text-[var(--mute)]'
                    : isListening
                      ? 'bg-[var(--turq)] border-[var(--turq)] text-white animate-pulse'
                      : 'bg-[var(--lapis-soft)] border-[var(--lapis)]/30 text-[var(--lapis)] hover:brightness-95'
                }`}
                aria-label={t.touchToSpeakBtn || (tx(isRTL, 'تبدیل صوت به متن (میکروفون)', 'Voice to Text'))}
              >
                {isListening ? <MicOff size={14} className="shrink-0" /> : <Mic size={14} className="shrink-0" />}
                <span className="truncate">
                  {isListening
                    ? (tx(isRTL, 'در حال شنیدن...', 'Listening...'))
                    : (tx(isRTL, 'صحبت', 'Speak'))}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="btn-ghost !min-h-[34px] !h-8.5 !px-2.5 !py-1 !text-xs !rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                aria-label={t.skipBtn || (tx(isRTL, 'رد کردن / مشاهده پاسخ', 'Skip / Show Answer'))}
                title={tx(isRTL, 'رد کردن این کارت و مشاهده پاسخ صحیح', 'Skip card & see correct answer')}
              >
                <SkipForward size={14} className="shrink-0" />
                <span className="truncate">{t.skipBtn || (tx(isRTL, 'رد کردن', 'Skip'))}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Interactive Button Guide Modal */}
      <PracticeTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        isRTL={isRTL}
      />

      {/* Interactive Microphone Troubleshooter & Permission Guide Modal */}
      {showMicPermissionModal && (
        <div 
          className="sheet"
          onClick={() => {
            if (!isRequestingMic) {
              sound.playClick();
              setShowMicPermissionModal(false);
            }
          }}
          dir={((isRTL ? 'rtl' : 'ltr'))}
        >
          <div 
            className="sheet-box text-start max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[var(--lapis-soft)] text-[var(--lapis)] flex items-center justify-center shrink-0">
                  <Mic size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[var(--ink)]">
                    {tx(isRTL, 'چرا میکروفون با وجود روشن بودن کار نمی‌کند؟', 'Why Mic Fails Even When Enabled')}
                  </h3>
                  <p className="text-[11px] font-bold text-[var(--mute)]">
                    {micErrorReason === 'no_device'
                      ? (tx(isRTL, 'وضعیت: میکروفونی در سیستم یافت نشد', 'Status: No microphone detected'))
                      : micErrorReason === 'in_use'
                        ? (tx(isRTL, 'وضعیت: میکروفون در برنامه دیگری درگیر است', 'Status: Microphone busy in another app'))
                        : (tx(isRTL, 'وضعیت: محدودیت قاب پیش‌نمایش (Preview Iframe)', 'Status: Preview Iframe Restriction'))}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMicPermissionModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Visual Step-by-Step Guide specifically for Preview Iframe & Chrome Permission Reload */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-3 mb-3 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--lapis)] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {tx(isRTL, '۱', '1')}
                </span>
                <p className="text-[var(--ink)] font-bold leading-relaxed">
                  {tx(isRTL, 'اگر تیک Microphone در بالای مرورگر روشن است، کروم تا پیش از رفرش شدن صفحه، دسترسی را به قاب پیش‌نمایش نمی‌دهد. روی دکمه «بارگذاری مجدد پیش‌نمایش» در پایین بزنید.', 'When you turn Microphone ON in Chrome, it does not apply to the preview frame until reloaded. Tap "Reload Preview" below.')}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--lapis)] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {tx(isRTL, '۲', '2')}
                </span>
                <p className="text-[var(--ink)] font-bold leading-relaxed">
                  {tx(isRTL, 'راه‌حل ۱۰۰٪ قطعی: در نوار سفید بالای همین پیش‌نمایش، روی آیکون باز کردن در تب جدید (🔗) کلیک کنید تا بازی خارج از قاب پیش‌نمایش و با میکروفون کامل اجرا شود.', '100% Guaranteed Fix: Click the Open in New Tab icon (🔗) in the toolbar right above this preview so the app runs outside the preview frame.')}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {tx(isRTL, '۳', '3')}
                </span>
                <p className="text-[var(--ink)] font-bold leading-relaxed">
                  {tx(isRTL, 'اگر می‌خواهید در همین صفحه بمانید، «۴ گزینه آماده پاسخ» در پایین کارت برایتان فعال شده است تا با یک کلیک بازی کنید.', 'To keep playing right here, 4 Quick Answer Choices are active on the card so you can answer with 1 tap.')}
                </p>
              </div>
            </div>

            {micTestSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{tx(isRTL, 'میکروفون با موفقیت فعال شد! در حال ضبط...', 'Microphone enabled! Recording...')}</span>
              </div>
            )}

            {micPermissionError && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold leading-relaxed">
                {micPermissionError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  window.location.reload();
                }}
                className="btn-primary !w-full !py-2.5 !text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>
                  {tx(isRTL, '۱. بارگذاری مجدد پیش‌نمایش (اعمال دسترسی میکروفون)', '1. Reload Preview (Apply Mic Permission)')}
                </span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  sound.playClick();
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopiedDirectUrl(true);
                    window.setTimeout(() => setCopiedDirectUrl(false), 3500);
                  } catch {}
                }}
                className="w-full py-2 px-3 rounded-xl bg-[var(--bg)] hover:bg-[var(--lapis-soft)] text-[var(--ink)] border border-[var(--line)] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                {copiedDirectUrl ? <CheckCircle2 size={14} className="text-emerald-600" /> : <KeyRound size={14} className="text-[var(--lapis)]" />}
                <span>
                  {copiedDirectUrl
                    ? (tx(isRTL, 'لینک مستقیم کپی شد! در یک تب جدید مرورگر Paste کنید', 'Direct link copied! Paste in a new browser tab'))
                    : (tx(isRTL, '۲. کپی لینک مستقیم برنامه (برای باز کردن در تب جدید)', '2. Copy Direct App URL (Open in New Tab)'))}
                </span>
              </button>

              <button
                type="button"
                onClick={handleGrantPermissionAndStart}
                disabled={isRequestingMic}
                className="w-full py-2 px-3 rounded-xl bg-[var(--bg)] hover:bg-[var(--lapis-soft)] text-[var(--lapis)] border border-[var(--lapis)]/30 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Mic size={14} className={isRequestingMic ? 'animate-pulse' : ''} />
                <span>
                  {isRequestingMic
                    ? (tx(isRTL, 'در حال بررسی میکروفون...', 'Testing Microphone...'))
                    : (tx(isRTL, 'تست مستقیم میکروفون در همین پنجره', 'Test Microphone Now'))}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowQuickChoicesFallback(true);
                  setShowMicPermissionModal(false);
                  setActionableError(null);
                }}
                className="w-full py-2 px-3 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-[var(--turq)] border border-teal-500/30 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Sparkles size={14} />
                <span>{tx(isRTL, 'ادامه بازی با ۴ گزینه آماده (بدون نیاز به میکروفون)', 'Play with 4 Quick Choices (No Mic Needed)')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop / Pause Game Modal */}
      {showExitConfirm && (
        <ExitConfirmModal
          isRTL={isRTL}
          setupLabel={tx(isRTL, 'تنظیمات تمرین انفرادی', 'Practice Settings')}
          onCancel={() => setShowExitConfirm(false)}
          onOpenHelp={() => {
            setShowExitConfirm(false);
            setShowTourModal(true);
          }}
          onExitHome={() => {
            setShowExitConfirm(false);
            if (onExitHome) onExitHome();
            else onExit();
          }}
          onExitSetup={() => {
            setShowExitConfirm(false);
            if (onExitSetup) onExitSetup();
            else onExit();
          }}
        />
      )}
    </div>
  );
};

export default SinglePlayerScreen;
