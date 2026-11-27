import React from 'react';
import { LanguageCard, CEFRLevel } from '../../types';
import { FadingStage, WordAidsAnnotation } from '../../src/engine/trainingWheels/types';
import { getFadingStageForCard } from '../../src/engine/trainingWheels/fadingEngine';
import { getTrainingWheelsSettings } from '../../src/engine/trainingWheels/trainingWheelsService';
import { analyzeLanguageAids, limitAids } from '../../src/engine/trainingWheels/languages';
import { isRtlLang } from '../../ui';
import { tx } from '../../i18n/runtime';

interface TrainingWheelTextProps {
  card: LanguageCard;
  stage?: FadingStage;
  cefrLevel?: CEFRLevel;
  className?: string;
  uiLanguage?: string;
  /** سقف کمک‌های هم‌زمان روی یک کارت (قاعده: دو) */
  maxAids?: number;
}

/**
 * متن هدف با «چرخ‌های کمکی».
 * قاعده‌ها (سندهای «قواعد تصویرسازی و رنگ»):
 *  - فقط رنگ‌های جنس (روی حرف تعریف + اسم) و نیلیِ فعل معنا دارند؛ بقیه با خط، قاب و نشان.
 *  - هر رنگ یک شکل همزاد دارد (■ ▲ ● ◆ برای جنس، قرص برای فعل).
 *  - هر کارت حداکثر دو کمک.
 *  - مرحلهٔ ۰ و ۱: نشانهٔ کامل؛ مرحلهٔ ۲: فقط زیرخط نازک؛ مرحلهٔ ۳: متن ساده.
 */
export const TrainingWheelText: React.FC<TrainingWheelTextProps> = ({
  card,
  stage: explicitStage,
  cefrLevel,
  className = '',
  uiLanguage = 'fa',
  maxAids = 2,
}) => {
  const isRtl = uiLanguage === 'fa' || uiLanguage === 'ar';
  const settings = getTrainingWheelsSettings();
  const targetRtl = isRtlLang(card.targetLanguage);

  const effectiveStage: FadingStage =
    explicitStage !== undefined
      ? explicitStage
      : getFadingStageForCard(card.id, cefrLevel || card.cefrLevel);

  const text = (card.targetText || '').trim();
  // حرف تعریف همیشه همراه اسم دیده می‌شود: واحد یادگیری «het huis» است، نه «huis»
  const needsArticle = !!card.article && !text.toLowerCase().startsWith(card.article.toLowerCase() + ' ');
  const displayText = needsArticle ? `${card.article} ${text}` : text;

  if (effectiveStage === 3) {
    return <span className={className} dir={targetRtl ? 'rtl' : 'ltr'} lang={card.targetLanguage as string}>{displayText}</span>;
  }

  const aids: WordAidsAnnotation = limitAids(analyzeLanguageAids(card, settings.enabledAids), maxAids);
  const words = text.split(/\s+/).filter(Boolean);
  const full = effectiveStage <= 1;
  const subtle = effectiveStage === 2;

  // ---- جنس دستوری ----
  const genderAid = aids.gender;
  let genderBadge: React.ReactNode = null;
  let wordTextStyle = className;
  if (genderAid) {
    const { visual, article } = genderAid;
    if (effectiveStage === 0) {
      genderBadge = (
        <span
          data-testid="gender-badge-stage-0"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border ${visual.bgColor} ${visual.borderColor} mb-1 shadow-sm select-none`}
        >
          <span className="text-sm leading-none" aria-hidden="true">{visual.symbol}</span>
          <span>{article ? `${article} (${tx(isRtl, visual.labelFa, visual.labelEn)})` : tx(isRtl, visual.labelFa, visual.labelEn)}</span>
        </span>
      );
      wordTextStyle = `${className} ${visual.textColor} font-black`;
    } else if (effectiveStage === 1) {
      genderBadge = (
        <span
          data-testid="gender-badge-stage-1"
          className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-black border ${visual.bgColor} ${visual.borderColor} mb-0.5 select-none`}
          title={tx(isRtl, visual.labelFa, visual.labelEn)}
        >
          <span aria-hidden="true">{visual.symbol}</span>
        </span>
      );
      wordTextStyle = `${className} ${visual.textColor} font-bold`;
    } else {
      wordTextStyle = `${className} border-b-2 select-text`;
    }
  }

  const diminutiveAid = aids.diminutive;
  const dimBadge = diminutiveAid && full ? (
    <span
      data-testid="diminutive-hint"
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30 ml-1.5 select-none"
    >
      <span>-{diminutiveAid.suffix}</span>
      <span className="text-xs">→ het ■</span>
    </span>
  ) : null;

  // ---- نشانه‌های واژه‌به‌واژه ----
  const sep = aids.separableVerb;
  const sepVerbIdx = sep ? (sep.verbIndex ?? words.findIndex((w) => clean(w) === sep.verbPart.toLowerCase())) : -1;
  const sepPartIdx = sep ? (sep.particleIndex ?? lastIndex(words, (w) => clean(w) === sep.particlePart.toLowerCase())) : -1;
  const verbIdx = aids.v2Verb ? aids.v2Verb.position : -1;
  const caseIdx = aids.caseEnding ? (aids.caseEnding.index ?? -1) : -1;
  const subEndIdx = aids.subordinateVerbFinal
    ? (aids.subordinateVerbFinal.endIndex ?? lastIndex(words, (w) => clean(w) === aids.subordinateVerbFinal!.endVerb.toLowerCase()))
    : -1;
  const negSet = new Set(aids.negation?.indices || []);
  const raIdx = aids.objectMarker ? aids.objectMarker.index : -1;
  const clauseStart = aids.clause ? aids.clause.start : -1;
  const tp = aids.timePhrase;

  const VERB_PILL = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 px-1.5 rounded-full font-black';
  const SUBTLE = 'border-b border-indigo-400/70';
  const DOTTED = 'border-b-2 border-dotted border-indigo-500 text-indigo-700 dark:text-indigo-300 font-extrabold';

  const renderWord = (w: string, idx: number): React.ReactNode => {
    let node: React.ReactNode = <span>{w}</span>;

    if (idx === sepVerbIdx || idx === sepPartIdx) {
      node = (
        <span
          data-testid={idx === sepVerbIdx ? 'separable-verb-part' : 'separable-particle-part'}
          className={full ? DOTTED : SUBTLE}
          title={tx(isRtl, 'فعل دوتکه: این دو با هم یک فعل‌اند', 'Separable verb: these two belong together')}
        >
          {w}
        </span>
      );
    } else if (idx === subEndIdx) {
      node = (
        <span
          data-testid="german-subordinate-final-verb"
          className={full ? VERB_PILL : SUBTLE}
          title={tx(isRtl, 'در جملهٔ وابسته فعل آخر می‌آید', 'In a subordinate clause the verb goes last')}
        >
          {w}
        </span>
      );
    } else if (idx === verbIdx) {
      node = (
        <span
          data-testid="v2-verb-highlight"
          className={full ? VERB_PILL : SUBTLE}
          title={tx(isRtl, 'فعل', 'Verb')}
        >
          {w}
        </span>
      );
    } else if (idx === caseIdx && aids.caseEnding) {
      const m = w.match(new RegExp(`^(.*?)(${aids.caseEnding.endingText})([.,!?;:]*)$`, 'i'));
      const mark = aids.caseEnding.caseType === 'accusative' ? '→' : aids.caseEnding.caseType === 'dative' ? '⇢' : aids.caseEnding.caseType === 'genitive' ? '‿' : '';
      node = (
        <span
          data-testid="german-case-ending"
          className="inline-flex items-baseline"
          title={tx(isRtl, `حرف عوض‌شده: ${aids.caseEnding.endingText}-`, `Changed ending: -${aids.caseEnding.endingText}`)}
        >
          {m ? (
            <>
              <span>{m[1]}</span>
              <span className={full ? 'font-black underline decoration-2 underline-offset-4' : 'underline decoration-1 underline-offset-4'}>{m[2]}</span>
              <span>{m[3]}</span>
            </>
          ) : (
            <span className="underline decoration-2 underline-offset-4">{w}</span>
          )}
          {full && mark && <sup className="text-[0.55em] opacity-70 ms-0.5 select-none" aria-hidden="true">{mark}</sup>}
        </span>
      );
    } else if (negSet.has(idx)) {
      node = (
        <span data-testid="negation-mark" className="inline-flex items-baseline" title={tx(isRtl, 'نفی', 'Negation')}>
          <span className={full ? 'underline decoration-wavy decoration-2 underline-offset-4' : 'underline decoration-wavy decoration-1 underline-offset-4'}>{w}</span>
          {full && <sup className="text-[0.55em] opacity-70 ms-0.5 select-none" aria-hidden="true">⊘</sup>}
        </span>
      );
    } else if (idx === raIdx) {
      node = (
        <span data-testid="object-marker" className="inline-flex items-baseline" title={tx(isRtl, '«را» به واژهٔ پیش از خودش اشاره می‌کند', '«را» points to the word before it')}>
          {full && <span className="text-[0.6em] opacity-70 me-0.5 select-none" aria-hidden="true">→</span>}
          <span className={full ? 'font-black' : SUBTLE}>{w}</span>
        </span>
      );
    }

    return (
      <span key={`${w}_${idx}`} className="relative inline-flex items-center py-0.5">
        {idx === clauseStart && full && (
          <span data-testid="clause-start" className="text-[0.7em] opacity-70 me-1 select-none" aria-hidden="true">{targetRtl ? '↲' : '↳'}</span>
        )}
        {node}
      </span>
    );
  };

  const rendered: React.ReactNode[] = [];
  if (needsArticle) {
    rendered.push(<span key="article" className="relative inline-flex items-center py-0.5">{card.article}</span>);
  }
  for (let i = 0; i < words.length; i++) {
    if (tp && i === tp.start) {
      rendered.push(
        <span
          key={`time_${i}`}
          data-testid="time-frame"
          className={`inline-flex items-center gap-x-1.5 px-1.5 rounded-md ${full ? 'border border-dashed border-neutral-500/70' : 'border-b border-dashed border-neutral-500/60'}`}
          title={tx(isRtl, 'عبارت زمان: یک‌تکه یاد بگیر', 'Time phrase: learn it as one piece')}
        >
          {words.slice(tp.start, tp.end + 1).map((w, k) => renderWord(w, tp.start + k))}
        </span>
      );
      i = tp.end;
      continue;
    }
    rendered.push(renderWord(words[i], i));
  }

  return (
    <span className="inline-flex flex-col items-center justify-center max-w-full">
      {(genderBadge || dimBadge) && (
        <span className="flex items-center justify-center gap-2 mb-1 flex-wrap">
          {genderBadge}
          {dimBadge}
        </span>
      )}
      <span
        dir={targetRtl ? 'rtl' : 'ltr'}
        lang={card.targetLanguage as string}
        className={`inline-flex items-center justify-center flex-wrap gap-x-1.5 gap-y-1 ${wordTextStyle}`}
        style={subtle && genderAid ? { borderBottomColor: genderAid.visual.color } : undefined}
      >
        {rendered}
      </span>
    </span>
  );
};

function clean(w: string): string {
  return w.toLowerCase().replace(/[.,!?;:]/g, '');
}

function lastIndex(words: string[], pred: (w: string) => boolean): number {
  for (let i = words.length - 1; i >= 0; i--) if (pred(words[i])) return i;
  return -1;
}
