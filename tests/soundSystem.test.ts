import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { sound } from '../soundManager';

describe('Sound System and Audio Synthesizer Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sound.setMuted(false);
  });

  afterEach(() => {
    sound.setBgmAllowed(true);
    sound.resumeFromBackground();
    sound.stopBGM();
    delete (window as any).AndroidTTS;
  });

  test('AudioContext initializes correctly and provides valid context', () => {
    const ctx = sound.getAudioContext();
    expect(ctx).toBeDefined();
    expect(ctx).not.toBeNull();
  });

  test('Mute and sound enabled toggles work accurately', () => {
    sound.setSoundEnabled(false);
    expect(sound.getMuted()).toBe(true);
    expect(sound.isSoundEnabled()).toBe(false);

    sound.setSoundEnabled(true);
    expect(sound.getMuted()).toBe(false);
    expect(sound.isSoundEnabled()).toBe(true);
  });

  test('Tactile click sound triggers without error and respects mute', () => {
    expect(() => sound.playClick()).not.toThrow();

    sound.setMuted(true);
    expect(() => sound.playClick()).not.toThrow();
  });

  test('Toggle / option switch sound executes with musical intervals', () => {
    for (let i = 0; i < 5; i++) {
      expect(() => sound.playToggle()).not.toThrow();
    }
  });

  test('Start game fanfare triggers multiple ascending notes', () => {
    expect(() => sound.playStartGame()).not.toThrow();
  });

  test('Correct guess chimes rotate through diverse melodic variations', () => {
    // Call 10 times to ensure variant cycling and randomness works without crashing
    for (let i = 0; i < 10; i++) {
      expect(() => sound.playCorrect()).not.toThrow();
    }
  });

  test('Word swap swoosh sound executes all variations without error', () => {
    for (let i = 0; i < 6; i++) {
      expect(() => sound.playSwap()).not.toThrow();
    }
  });

  test('Tick-tock alternating clock sounds execute properly', () => {
    // Tick 1
    expect(() => sound.playTick()).not.toThrow();
    // Tock 2
    expect(() => sound.playTick()).not.toThrow();
    // Tick 3
    expect(() => sound.playTick()).not.toThrow();
  });

  test('Urgent countdown alarm escalates pitch from 5 down to 1 second', () => {
    for (let sec = 5; sec >= 1; sec--) {
      expect(() => sound.playUrgentTick(sec)).not.toThrow();
    }
  });

  test('Round end resonant gong and team elimination tones execute safely', () => {
    expect(() => sound.playRoundEnd()).not.toThrow();
    expect(() => sound.playElimination()).not.toThrow();
  });

  test('Victory celebration fanfare triggers correctly', () => {
    expect(() => sound.playVictory()).not.toThrow();
    expect(() => sound.playWinner()).not.toThrow();
  });

  test('Procedural Menu BGM and Gameplay BGM schedule and stop cleanly', () => {
    vi.useFakeTimers();

    sound.startMenuBGM();
    // Advance timers by several beats
    vi.advanceTimersByTime(1200);

    // Switch to Gameplay BGM
    sound.startGameplayBGM(60);
    vi.advanceTimersByTime(1000);

    // Stop BGM
    sound.stopBGM();
    expect(() => sound.stopBGM()).not.toThrow();

    vi.useRealTimers();
  });

  test('isVoiceSupportedFor waits for voiceschanged event when getVoices() is initially empty', async () => {
    let voicesList: any[] = [];
    let voicesChangedCallback: (() => void) | null = null;

    const mockSpeechSynthesis = {
      getVoices: vi.fn(() => voicesList),
      onvoiceschanged: null as any,
      addEventListener: vi.fn((event, cb) => {
        if (event === 'voiceschanged') voicesChangedCallback = cb;
      }),
      removeEventListener: vi.fn(),
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: false,
      paused: false,
      pending: false
    };

    const originalSpeech = window.speechSynthesis;
    (window as any).speechSynthesis = mockSpeechSynthesis;

    try {
      // Clear cached voices on sound manager
      (sound as any).cachedVoices = [];

      // Initially empty
      expect(mockSpeechSynthesis.getVoices().length).toBe(0);

      // Start waiting for voice support check asynchronously
      const checkPromise = sound.isVoiceSupportedFor('en-US');

      // Simulate asynchronous voices population
      voicesList = [
        { name: 'Google US English', lang: 'en-US', default: true }
      ];

      // Trigger voiceschanged event
      if (typeof mockSpeechSynthesis.onvoiceschanged === 'function') {
        mockSpeechSynthesis.onvoiceschanged(new Event('voiceschanged'));
      }
      if (voicesChangedCallback) {
        (voicesChangedCallback as any)();
      }

      const supported = await checkPromise;
      expect(supported).toBe(true);
    } finally {
      (window as any).speechSynthesis = originalSpeech;
    }
  });

  test('BGM only plays when bgmAllowed is true (Intro screen) and stays off on other screens', () => {
    sound.setBgmAllowed(true);
    sound.startMenuBGM();
    expect((sound as any).currentBgmMode).toBe('menu');

    // Leaving Intro screen immediately stops BGM
    sound.setBgmAllowed(false);
    expect((sound as any).currentBgmMode).toBe('none');

    // Trying to start BGM or unmuting on a non-Intro screen does NOT restart BGM
    sound.startMenuBGM();
    expect((sound as any).currentBgmMode).toBe('none');
    sound.setMuted(true);
    sound.setMuted(false);
    expect((sound as any).currentBgmMode).toBe('none');
  });

  test('App going to background immediately pauses BGM and stops speech, resuming only on Intro', () => {
    sound.setBgmAllowed(true);
    sound.startMenuBGM();
    expect((sound as any).currentBgmMode).toBe('menu');

    // App goes to background
    sound.pauseForBackground();
    expect((sound as any).currentBgmMode).toBe('none');

    // App returns to foreground while on Intro -> resumes menu BGM
    sound.resumeFromBackground();
    expect((sound as any).currentBgmMode).toBe('menu');

    // App goes to background, screen changes away from Intro, app returns -> stays silent
    sound.pauseForBackground();
    sound.setBgmAllowed(false);
    sound.resumeFromBackground();
    expect((sound as any).currentBgmMode).toBe('none');
  });

  test('Native AndroidTTS bridge is used for pronunciation when available and fires callbacks', () => {
    const mockSpeak = vi.fn(() => true);
    const mockStop = vi.fn();
    (window as any).AndroidTTS = {
      isAvailable: vi.fn(() => true),
      speak: mockSpeak,
      stop: mockStop
    };

    const onStart = vi.fn();
    const onEnd = vi.fn();

    // Works even if BGM/SFX is muted
    sound.setMuted(true);
    sound.speakTargetPhrase('Goedemorgen', 'nl', { onStart, onEnd });

    expect(mockSpeak).toHaveBeenCalledWith('Goedemorgen', 'nl-NL', 0.9);
    expect(onStart).toHaveBeenCalledTimes(1);

    // Native Android callback signals speech completion
    (window as any).__dourOnAndroidTtsDone();
    expect(onEnd).toHaveBeenCalledTimes(1);

    // Slow speech uses 0.68 rate
    sound.speakSlow('Guten Morgen', 'de');
    expect(mockSpeak).toHaveBeenCalledWith('Guten Morgen', 'de-DE', 0.68);
  });
});
