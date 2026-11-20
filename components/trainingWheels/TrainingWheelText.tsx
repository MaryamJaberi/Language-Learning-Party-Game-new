import React from 'react';
import { LanguageCard, CEFRLevel } from '../../types';
import { FadingStage, WordAidsAnnotation } from '../../src/engine/trainingWheels/types';
import { getFadingStageForCard } from '../../src/engine/trainingWheels/fadingEngine';
import { getTrainingWheelsSettings } from '../../src/engine/trainingWheels/trainingWheelsService';
import { analyzeLanguageAids } from '../../src/engine/trainingWheels/languages';

interface TrainingWheelTextProps {
  card: LanguageCard;
  stage?: FadingStage;
  cefrLevel?: CEFRLevel;
  className?: string;
  uiLanguage?: string;
}

export const TrainingWheelText: React.FC<TrainingWheelTextProps> = ({
  card,
  stage: explicitStage,
  cefrLevel,
  className = '',
  uiLanguage = 'fa'
}) => {
  const isRtl = uiLanguage === 'fa' || uiLanguage === 'ar';
  const settings = getTrainingWheelsSettings();

  // If C1/C2 and forceEnableAll is false, check default stage
  const effectiveStage: FadingStage =
    explicitStage !== undefined
      ? explicitStage
      : getFadingStageForCard(card.id, cefrLevel || card.cefrLevel);

  // If stage is 3 (Mastered), render clean normal text with zero visual aids
  if (effectiveStage === 3) {
    const displayText =
      card.article && !card.targetText.toLowerCase().startsWith(card.article.toLowerCase() + ' ')
        ? `${card.article} ${card.targetText}`
        : card.targetText;
    return <span className={className}>{displayText}</span>;
  }

  // Analyze linguistic aids for the card
  const aids: WordAidsAnnotation = analyzeLanguageAids(card, settings.enabledAids);
  const text = (card.targetText || '').trim();
  const words = text.split(/\s+/).filter(Boolean);

  // 1. Grammatical Gender Aids (Neuter: Red square, Masculine: Lapis triangle, Feminine: Saffron circle, Common: Turquoise diamond)
  const genderAid = aids.gender;
  let genderBadge: React.ReactNode = null;
  let wordTextStyle = className;

  if (genderAid) {
    const { visual, article } = genderAid;

    if (effectiveStage === 0) {
      // Stage 0: Full aids (Color + Shape + Label)
      genderBadge = (
        <span
          data-testid="gender-badge-stage-0"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border ${visual.bgColor} ${visual.borderColor} mb-1 shadow-sm select-none`}
        >
          <span className="text-sm leading-none" aria-hidden="true">
            {visual.symbol}
          </span>
          <span>{article ? `${article} (${isRtl ? visual.labelFa : visual.labelEn})` : (isRtl ? visual.labelFa : visual.labelEn)}</span>
        </span>
      );
      wordTextStyle = `${className} ${visual.textColor} font-black`;
    } else if (effectiveStage === 1) {
      // Stage 1: Color + Shape (no label)
      genderBadge = (
        <span
          data-testid="gender-badge-stage-1"
          className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-black border ${visual.bgColor} ${visual.borderColor} mb-0.5 select-none`}
          title={isRtl ? visual.labelFa : visual.labelEn}
        >
          <span aria-hidden="true">{visual.symbol}</span>
        </span>
      );
      wordTextStyle = `${className} ${visual.textColor} font-bold`;
    } else if (effectiveStage === 2) {
      // Stage 2: Thin colored underline (near mastery)
      wordTextStyle = `${className} border-b-2 select-text`;
    }
  }

  // 2. Diminutive -je hint (Dutch)
  const diminutiveAid = aids.diminutive;
  let dimBadge: React.ReactNode = null;
  if (diminutiveAid && effectiveStage <= 1) {
    dimBadge = (
      <span
        data-testid="diminutive-hint"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30 ml-1.5 select-none"
      >
        <span>-{diminutiveAid.suffix}</span>
        <span className="text-xs">→ het ■</span>
      </span>
    );
  }

  // 3. Separable verb link (Dutch) or V2 highlight or German case / subordinate verb
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Top badges (Gender & Diminutive) */}
      {(genderBadge || dimBadge) && (
        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
          {genderBadge}
          {dimBadge}
        </div>
      )}

      {/* Main Target Phrase Display with Word-level annotations */}
      <div
        className={`flex items-center justify-center flex-wrap gap-x-1.5 gap-y-1 ${wordTextStyle}`}
        style={
          effectiveStage === 2 && genderAid
            ? { borderBottomColor: genderAid.visual.color }
            : undefined
        }
      >
        {words.map((w, idx) => {
          const clean = w.toLowerCase().replace(/[.,!?;:]/g, '');

          // Check if this word is a separable verb part (Dutch)
          const isSepVerb =
            aids.separableVerb &&
            (w === aids.separableVerb.verbPart || clean === aids.separableVerb.verbPart.toLowerCase());
          const isSepParticle =
            aids.separableVerb &&
            (w === aids.separableVerb.particlePart || clean === aids.separableVerb.particlePart.toLowerCase());

          // Check if this word is V2 verb (Dutch)
          const isV2 = aids.v2Verb && idx === aids.v2Verb.position;

          // Check if this word has a German case ending
          const isCaseWord =
            aids.caseEnding &&
            (clean.endsWith(aids.caseEnding.endingText) || w.toLowerCase().includes(aids.caseEnding.endingText));

          // Check if this word is German subordinate final verb
          const isSubEndVerb =
            aids.subordinateVerbFinal &&
            clean === aids.subordinateVerbFinal.endVerb.toLowerCase();

          return (
            <span
              key={`${w}_${idx}`}
              className="relative inline-flex items-center py-0.5"
            >
              {/* Separable verb connector */}
              {isSepVerb && effectiveStage <= 1 && (
                <span
                  data-testid="separable-verb-part"
                  className="border-b-2 border-dotted border-indigo-500 text-indigo-700 dark:text-indigo-300 font-extrabold"
                  title="Separable Verb"
                >
                  {w}
                </span>
              )}

              {isSepParticle && effectiveStage <= 1 && (
                <span
                  data-testid="separable-particle-part"
                  className="border-b-2 border-dotted border-indigo-500 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center gap-0.5"
                  title="Separated Particle"
                >
                  <span className="text-[10px] opacity-75">🔗</span>
                  {w}
                </span>
              )}

              {/* V2 verb highlight (Dutch) */}
              {!isSepVerb && !isSepParticle && isV2 && effectiveStage <= 1 && (
                <span
                  data-testid="v2-verb-highlight"
                  className="bg-amber-400/20 text-amber-900 dark:text-amber-100 px-1 rounded border-b-2 border-amber-500 font-black"
                  title="V2 Verb"
                >
                  {w}
                </span>
              )}

              {/* German Case Ending underline */}
              {!isSepVerb && !isSepParticle && !isV2 && isCaseWord && effectiveStage <= 1 && (
                <span
                  data-testid="german-case-ending"
                  className="underline decoration-indigo-500 decoration-2 font-bold"
                  title={`Case ending: -${aids.caseEnding?.endingText}`}
                >
                  {w}
                </span>
              )}

              {/* German Subordinate Final Verb */}
              {!isSepVerb && !isSepParticle && !isV2 && isSubEndVerb && effectiveStage <= 1 && (
                <span
                  data-testid="german-subordinate-final-verb"
                  className="inline-flex items-center gap-0.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 px-1 rounded border border-emerald-500/30 font-bold"
                  title="Nebensatz Verb-Final"
                >
                  <span>{w}</span>
                  <span className="text-xs" aria-hidden="true">↷</span>
                </span>
              )}

              {/* Default render if no specific syntactic aid matched this word */}
              {!isSepVerb && !isSepParticle && !isV2 && !isCaseWord && !isSubEndVerb && (
                <span>{w}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};
