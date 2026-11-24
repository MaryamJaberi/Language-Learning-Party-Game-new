import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import App from '../App';
import { tUI } from '../ui';
import { setUiLanguage, tx, txt, uiDigits, getCatalog } from '../i18n/runtime';
import { normalizeText } from '../answerEvaluator';
import { getSpeechLanguageCode, SUPPORTED_LANGUAGES } from '../constants';
import { NATIVE_LANGUAGE_NAMES } from '../translations';

/**
 * سناریوهای بین‌المللی‌سازی برای هر ۱۸ زبانِ رابط کاربری.
 * هدف: هیچ کاربرِ غیرفارسی نباید متن فارسی ببیند (به‌ویژه عربی که پیش‌تر به‌خاطر راست‌به‌چپ بودن، فارسی می‌دید)،
 * جهت و زبان سند درست باشد، و دکمه‌های اصلی به زبان خود کاربر باشند.
 */
const UI_LANGS = ['fa', 'nl', 'en', 'de', 'fr', 'es', 'it', 'tr', 'ar', 'ru', 'pt', 'zh', 'ja', 'ko', 'hi', 'sv', 'pl', 'uk'];
const RTL = new Set(['fa', 'ar']);
// حروف خاص فارسی که در عربی نیستند: پ چ ژ گ ک(فارسی) ی(فارسی)
const PERSIAN_ONLY = /[پچژگکی]/;

const LATIN_NAMES = ['Alex', 'Sam', 'Noor', 'Kim', 'Lee', 'Ana', 'Max', 'Eva'];

function seed(lang: string) {
  localStorage.setItem(
    'dor_settings',
    JSON.stringify({
      language: lang,
      nativeLanguage: lang === 'fa' ? 'fa' : 'en',
      targetLanguages: ['nl'],
      playerNames: LATIN_NAMES,
      playerCount: 4,
    }),
  );
}

// نام بومی زبان‌ها (مثل «فارسی» در فهرست زبان‌ها) نشت نیست؛ پیش از بررسی حذف می‌شوند
const NATIVE_NAMES = [
  ...Object.values(NATIVE_LANGUAGE_NAMES),
  ...SUPPORTED_LANGUAGES.map((l: any) => l.nativeName).filter(Boolean),
].sort((a, b) => b.length - a.length);

function stripNames(t: string): string {
  for (const n of NATIVE_NAMES) t = t.split(n).join(' ');
  return t;
}

function visibleText(): string {
  return stripNames(document.body.textContent || '');
}

function persianLeak(text: string): string | null {
  const m = text.match(new RegExp(`.{0,25}${PERSIAN_ONLY.source}.{0,25}`));
  return m ? m[0] : null;
}

describe('i18n — scenario per UI language', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    setUiLanguage(null);
  });

  for (const lang of UI_LANGS) {
    test(`${lang}: home screen — direction, lang attribute, no Persian leak, localized start button`, () => {
      seed(lang);
      render(<App />);
      expect(document.documentElement.lang).toBe(lang);
      expect(document.documentElement.dir).toBe(RTL.has(lang) ? 'rtl' : 'ltr');
      if (lang !== 'fa') {
        expect(persianLeak(visibleText()), `Persian text on ${lang} home screen`).toBeNull();
      }
      const t = tUI(lang);
      if (lang !== 'en') {
        expect(t.startNewGame).not.toBe(tUI('en').startNewGame);
      }
    });

    test(`${lang}: every home button and one level deeper — no Persian text or labels`, () => {
      if (lang === 'fa') return;
      const leaks = new Set<string>();
      const collect = (where: string) => {
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = w.nextNode())) {
          const t = stripNames(n.textContent || '');
          if (PERSIAN_ONLY.test(t)) leaks.add(`${where}: ${t.trim().slice(0, 60)}`);
        }
        document.querySelectorAll('[aria-label],[title],[placeholder]').forEach((e) => {
          for (const at of ['aria-label', 'title', 'placeholder']) {
            const v = stripNames(e.getAttribute(at) || '');
            if (PERSIAN_ONLY.test(v)) leaks.add(`${where} @${at}: ${v.slice(0, 60)}`);
          }
        });
      };
      const fresh = () => { cleanup(); localStorage.clear(); seed(lang); render(<App />); };
      fresh();
      collect('home');
      const count = screen.queryAllByRole('button').length;
      for (let i = 0; i < count; i++) {
        fresh();
        const b = screen.queryAllByRole('button')[i];
        if (!b) continue;
        const label = (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 20);
        if (/^[A-Z]{2}$/.test(label)) continue; // language switcher chip
        fireEvent.click(b);
        collect(label);
        const inner = screen.queryAllByRole('button').slice(0, 25);
        for (const ib of inner) {
          try { fireEvent.click(ib); } catch { /* ignore */ }
          collect(`${label} > ${(ib.textContent || '').trim().slice(0, 15)}`);
        }
      }
      expect([...leaks], `Persian text in ${lang} UI`).toEqual([]);
    });
  }
});

describe('i18n — runtime', () => {
  afterEach(() => setUiLanguage(null));

  test('tx: Persian only for fa; Arabic gets Arabic (not Persian); unknown falls back to English', () => {
    setUiLanguage('fa');
    expect(tx(true, 'بازگشت', 'Back')).toBe('بازگشت');
    setUiLanguage('ar');
    expect(tx(true, 'بازگشت', 'Back')).toBe('رجوع');
    setUiLanguage('nl');
    expect(tx(false, 'بازگشت', 'Back')).toBe('Terug');
    setUiLanguage('ja');
    expect(tx(false, 'بازگشت', 'Back')).toBe('Back');
  });

  test('tx without a UI language keeps old behaviour (isolated components / tests)', () => {
    setUiLanguage(null);
    expect(tx(true, 'بازگشت', 'Back')).toBe('بازگشت');
    expect(tx(false, 'بازگشت', 'Back')).toBe('Back');
  });

  test('txt fills placeholders in every language', () => {
    setUiLanguage('de');
    expect(txt(false, 'کارت {0} از {1}', 'Card {0} of {1}', [3, 10])).toBe('Karte 3 von 10');
    setUiLanguage('ar');
    expect(txt(true, 'کارت {0} از {1}', 'Card {0} of {1}', [3, 10])).toBe('البطاقة 3 من 10');
  });

  test('uiDigits: Persian digits only in the Persian UI', () => {
    setUiLanguage('fa');
    expect(uiDigits(true, 12)).toBe('۱۲');
    setUiLanguage('ar');
    expect(uiDigits(true, 12)).toBe('12');
  });

  test('phrase catalogs keep every {n} placeholder', () => {
    for (const lang of ['nl', 'ar', 'de']) {
      for (const [en, tr] of Object.entries(getCatalog(lang))) {
        const a = (en.match(/\{\d+\}/g) || []).sort().join();
        const b = (tr.match(/\{\d+\}/g) || []).sort().join();
        expect(b, `${lang}: ${en}`).toBe(a);
      }
    }
  });

  test('core UI keys are translated for every offered UI language', () => {
    const en = tUI('en');
    const keys = ['checkAnswer', 'nextCard', 'showAnswer', 'cancel', 'saveChanges', 'leaderboard', 'cardOf'];
    for (const lang of UI_LANGS.filter((l) => l !== 'en')) {
      const t = tUI(lang);
      for (const k of keys) expect(t[k], `${lang}.${k}`).not.toBe(en[k]);
    }
  });
});

describe('i18n — answer normalization across scripts', () => {
  test('Turkish dotted capital I', () => {
    expect(normalizeText('İstanbul')).toBe(normalizeText('istanbul'));
  });
  test('Persian and Arabic-Indic digits', () => {
    expect(normalizeText('۲ قهوه')).toBe(normalizeText('2 قهوه'));
    expect(normalizeText('٣ أيام')).toBe(normalizeText('3 أيام'));
  });
  test('Spanish inverted punctuation', () => {
    expect(normalizeText('¿Cómo estás?')).toBe(normalizeText('Cómo estás'));
  });
  test('CJK full-width punctuation', () => {
    expect(normalizeText('你好！')).toBe(normalizeText('你好'));
    expect(normalizeText('はい、そうです。')).toBe(normalizeText('はい そうです'));
  });
  test('Hebrew vowel points', () => {
    expect(normalizeText('שָׁלוֹם')).toBe(normalizeText('שלום'));
  });
  test('Arabic comma and question mark', () => {
    expect(normalizeText('نعم، شكرا؟')).toBe(normalizeText('نعم شكرا'));
  });
});

describe('i18n — speech codes', () => {
  test('no invented region codes', () => {
    expect(getSpeechLanguageCode('sv')).toBe('sv-SE');
    expect(getSpeechLanguageCode('uk')).toBe('uk-UA');
    expect(getSpeechLanguageCode('ko')).toBe('ko-KR');
    expect(getSpeechLanguageCode('ru')).toBe('ru-RU');
    expect(getSpeechLanguageCode('xx')).toBe('xx');
  });
});
