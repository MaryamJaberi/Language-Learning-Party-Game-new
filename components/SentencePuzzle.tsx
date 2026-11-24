import React, { useEffect, useMemo, useState } from 'react';
import { Puzzle, Keyboard } from 'lucide-react';
import { tx, txt } from '../i18n/runtime';
import { isRtlLang } from '../ui';
import { chunkSentence, piecesForStage, shuffledOrder, MAX_PUZZLE_STAGE } from '../src/engine/longSentence/chunker';

interface Props {
  /** جملهٔ درست (به زبان هدف) */
  text: string;
  lang: string;
  /** مرحلهٔ داربست این کارت: ۰ = تکه‌های بزرگ … */
  stage: number;
  isRTL: boolean;
  /** پازل کامل شد؛ mistakes = تعداد انتخاب‌های نادرست */
  onSolved: (mistakes: number) => void;
  /** بازیکن ترجیح می‌دهد خودش بنویسد یا بگوید */
  onSkipPuzzle: () => void;
  onTap?: (ok: boolean) => void;
}

/**
 * «پازل تکه‌ها»: جملهٔ بلند به چند تکهٔ معنادار شکسته می‌شود و بازیکن با لمس، آن‌ها را به ترتیب می‌چیند.
 * انتخاب نادرست جریمه ندارد؛ فقط تکه تکان می‌خورد و سر جایش می‌ماند.
 */
export default function SentencePuzzle({ text, lang, stage, isRTL, onSolved, onSkipPuzzle, onTap }: Props) {
  const chunks = useMemo(() => chunkSentence(text, lang, piecesForStage(stage)), [text, lang, stage]);
  const order = useMemo(() => shuffledOrder(chunks.length, `${text}|${stage}`), [chunks.length, text, stage]);
  const [placed, setPlaced] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);

  useEffect(() => {
    setPlaced(0);
    setMistakes(0);
    setWrong(null);
  }, [text, stage]);

  const dir = isRtlLang(lang) ? 'rtl' : 'ltr';

  const tap = (idx: number) => {
    if (idx < placed) return;
    if (idx === placed) {
      onTap?.(true);
      const next = placed + 1;
      setPlaced(next);
      setWrong(null);
      if (next === chunks.length) {
        // کمی مکث تا بازیکن جملهٔ کامل را ببیند
        setTimeout(() => onSolved(mistakes), 450);
      }
    } else {
      onTap?.(false);
      setMistakes((m) => m + 1);
      setWrong(idx);
      setTimeout(() => setWrong((w) => (w === idx ? null : w)), 450);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2.5 space-y-2 animate-fade-in" data-testid="sentence-puzzle">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--lapis)]">
          <Puzzle size={14} />
          <span>{tx(isRTL, 'پازل تکه‌ها: تکه‌ها را به ترتیب لمس کن', 'Chunk puzzle: tap the pieces in order')}</span>
        </div>
        <span className="text-[10px] font-bold text-[var(--mute)]" aria-label={txt(isRTL, 'مرحلهٔ {0} از {1}', 'Stage {0} of {1}', [stage + 1, MAX_PUZZLE_STAGE])}>
          {'●'.repeat(Math.min(stage + 1, MAX_PUZZLE_STAGE))}{'○'.repeat(Math.max(0, MAX_PUZZLE_STAGE - stage - 1))}
        </span>
      </div>

      {/* جملهٔ در حال ساخت */}
      <div
        dir={dir}
        lang={lang}
        aria-live="polite"
        data-testid="sentence-puzzle-built"
        className="min-h-[44px] rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm sm:text-base font-bold text-[var(--ink)] leading-relaxed"
      >
        {placed === 0 ? (
          <span className="text-[var(--mute)] font-medium text-xs">…</span>
        ) : (
          chunks.slice(0, placed).join(/\s/.test(text.trim()) ? ' ' : '')
        )}
      </div>

      {/* تکه‌های درهم */}
      <div dir={dir} className="flex flex-wrap gap-1.5 justify-center">
        {order.map((idx) =>
          idx < placed ? null : (
            <button
              key={idx}
              type="button"
              lang={lang}
              onClick={() => tap(idx)}
              data-testid="sentence-puzzle-piece"
              data-piece={idx}
              className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer active:scale-95 ${
                wrong === idx
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200 animate-shake'
                  : 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--lapis)] hover:bg-[var(--lapis-soft)]'
              }`}
            >
              {chunks[idx]}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={onSkipPuzzle}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-[var(--mute)] hover:text-[var(--ink)] py-1 cursor-pointer"
      >
        <Keyboard size={12} />
        <span>{tx(isRTL, 'خودم می‌نویسم یا می‌گویم', 'I’ll type or say it myself')}</span>
      </button>
    </div>
  );
}
