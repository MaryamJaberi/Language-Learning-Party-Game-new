import React, { useState } from 'react';
import { Puzzle, Zap, MessagesSquare } from 'lucide-react';
import { tx, txt } from '../i18n/runtime';
import { getPatternCategories, getPatternPrefs, setPatternPrefs, hasPatternDeck, type PatternMode } from '../patterns';

interface Props {
  mode: PatternMode;
  targetLanguage: string;
  nativeLanguage: string;
  isRTL: boolean;
  onChange?: (ids: string[]) => void;
}

/** انتخاب «بازی‌های الگو» برای همین حالت بازی. انتخاب روی همین دستگاه می‌ماند. */
export default function PatternGamePicker({ mode, targetLanguage, nativeLanguage, isRTL, onChange }: Props) {
  const [selected, setSelected] = useState<string[]>(() => getPatternPrefs(mode));
  const cats = getPatternCategories(targetLanguage);
  const ready = hasPatternDeck(targetLanguage, nativeLanguage);

  const Icon = mode === 'solo' ? Puzzle : mode === 'duel' ? Zap : MessagesSquare;
  const title =
    mode === 'solo' ? tx(isRTL, 'بازی‌های الگو: پازل تکه‌ها و چهارگزینه‌ای', 'Pattern games: chunk puzzle & quick choice')
    : mode === 'duel' ? tx(isRTL, 'بازی‌های الگو: کدام درست است؟', 'Pattern games: which one is right?')
    : tx(isRTL, 'بازی‌های الگو: جمله را برسان', 'Pattern games: get the sentence across');
  const desc =
    mode === 'solo' ? tx(isRTL, 'الگوهای پرکاربرد را تکه‌تکه بچین؛ اشتباه‌های رایج گزینه‌های غلط‌اند.', 'Build common patterns piece by piece; the wrong options are typical mistakes.')
    : mode === 'duel' ? tx(isRTL, 'هر که زودتر جملهٔ درست را از بین اشتباه‌های رایج پیدا کند امتیاز می‌گیرد.', 'Whoever spots the correct sentence among common mistakes first wins the point.')
    : tx(isRTL, 'جمله را توضیح بده یا بازی کن تا هم‌تیمی‌ات همان الگو را بگوید.', 'Explain or act out the sentence so your teammate says the same pattern.');

  const update = (ids: string[]) => {
    setSelected(ids);
    setPatternPrefs(mode, ids);
    onChange?.(ids);
  };
  const toggle = (id: string) => update(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3 space-y-2" data-testid={`pattern-picker-${mode}`}>
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--lapis-soft)] text-[var(--lapis)] flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-black text-[var(--ink)] leading-tight">{title}</div>
          <div className="text-[11px] text-[var(--mute)] font-medium leading-snug">{desc}</div>
        </div>
      </div>

      {!ready || cats.length === 0 ? (
        <div className="text-[11px] text-[var(--mute)] font-medium">
          {tx(isRTL, 'فعلاً برای یادگیری انگلیسی با زبان مادری فارسی آماده است؛ زبان‌های دیگر به‌زودی.', 'Ready for learning English with Persian as native language for now; more languages soon.')}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c.id)}
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    on
                      ? 'border-[var(--lapis)] bg-[var(--lapis)] text-white'
                      : 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--lapis)]'
                  }`}
                >
                  {tx(isRTL, c.title.fa, c.title.en)}
                  <span className="opacity-70 ms-1">{c.level}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
            <span className={selected.length ? 'text-[var(--turq)]' : 'text-[var(--mute)]'}>
              {selected.length
                ? txt(isRTL, '{0} دسته انتخاب شد؛ این بازی با کارت‌های الگو شروع می‌شود', '{0} selected — this game will use pattern cards', [selected.length])
                : tx(isRTL, 'دسته‌ای انتخاب نشده؛ بازی با کارت‌های معمول است', 'None selected — the game uses regular cards')}
            </span>
            {selected.length > 0 && (
              <button type="button" onClick={() => update([])} className="text-[var(--mute)] hover:text-[var(--ink)] underline cursor-pointer">
                {tx(isRTL, 'پاک کردن', 'Clear')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
