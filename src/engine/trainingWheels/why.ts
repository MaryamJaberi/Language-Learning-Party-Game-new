/**
 * دکمهٔ «چرا؟»: توضیح یک‌جمله‌ای هر نشانه، فقط وقتی زبان‌آموز خودش بخواهد.
 * قاعده: قاعده جلوی چشم نیست، ولی وجود دارد (توضیح کوتاه اثر دارد؛ حذفش نکن).
 * بدون اصطلاح دستوری: نه «آکوزاتیو»، نه «بن مضارع».
 */
import { WordAidsAnnotation } from './types';

export interface AidExplanation { kind: string; fa: string; en: string }

export function explainAids(a: WordAidsAnnotation, language: string): AidExplanation[] {
  const lang = String(language || '').split('-')[0];
  const out: AidExplanation[] = [];
  const verbFinal = lang === 'nl' || lang === 'de';

  if (a.gender) {
    const art = a.gender.article || '';
    out.push({
      kind: 'gender',
      fa: `این اسم همیشه با «${art}» می‌آید. رنگ و شکل ${a.gender.visual.symbol} فقط کمک می‌کنند با هم یادت بمانند.`,
      en: `This noun always comes with “${art}”. The colour and the ${a.gender.visual.symbol} shape just help you remember them together.`,
    });
  }
  if (a.diminutive) {
    out.push({
      kind: 'diminutive',
      fa: `واژه‌های کوچک‌شده (با ‎-${a.diminutive.suffix}) همیشه «het» می‌گیرند.`,
      en: `Small-form words (ending in -${a.diminutive.suffix}) always take “het”.`,
    });
  }
  if (a.caseEnding) {
    const t = a.caseEnding.caseType;
    out.push({
      kind: 'caseEnding',
      fa: t === 'accusative' ? 'حرف آخر این واژه عوض شده، چون کار روی همین آدم یا چیز انجام می‌شود.'
        : t === 'dative' ? 'حرف آخر این واژه عوض شده، چون چیزی به این آدم یا چیز می‌رسد، یا بعد از واژه‌هایی مثل mit و zu آمده.'
        : t === 'genitive' ? 'حرف آخر این واژه عوض شده، چون صاحبِ چیزی را نشان می‌دهد.'
        : 'حرف آخر این واژه به‌خاطر نقشش در جمله عوض شده.',
      en: t === 'accusative' ? 'The ending changed because the action is done to this person or thing.'
        : t === 'dative' ? 'The ending changed because something goes to this person or thing, or it follows words like mit and zu.'
        : t === 'genitive' ? 'The ending changed because it shows who owns something.'
        : 'The ending changed because of the job this word does in the sentence.',
    });
  }
  if (a.separableVerb) {
    out.push({
      kind: 'separableVerb',
      fa: `«${a.separableVerb.verbPart}» و «${a.separableVerb.particlePart}» با هم یک فعل‌اند؛ تکهٔ دوم به آخر جمله می‌رود.`,
      en: `“${a.separableVerb.verbPart}” and “${a.separableVerb.particlePart}” are one verb; the second piece goes to the end.`,
    });
  }
  if (a.clause) {
    out.push(verbFinal && a.subordinateVerbFinal
      ? { kind: 'clause', fa: `بعد از «${a.clause.subordinator}» فعل به آخر می‌رود.`, en: `After “${a.clause.subordinator}” the verb goes to the end.` }
      : { kind: 'clause', fa: `از «${a.clause.subordinator}» بخش دومِ جمله شروع می‌شود.`, en: `“${a.clause.subordinator}” starts the second part of the sentence.` });
  }
  if (a.v2Verb) {
    const first = a.v2Verb.position === 0;
    out.push(lang === 'en'
      ? (first
        ? { kind: 'verb', fa: `در سؤال، «${a.v2Verb.verbText}» اول می‌آید.`, en: `In a question, “${a.v2Verb.verbText}” comes first.` }
        : { kind: 'verb', fa: `«${a.v2Verb.verbText}» جمله را می‌سازد؛ سؤال و نفی هم با همین ساخته می‌شوند.`, en: `“${a.v2Verb.verbText}” builds the sentence; questions and “not” are made with it too.` })
      : (first
        ? { kind: 'verb', fa: 'در سؤال، فعل اول می‌آید.', en: 'In a question, the verb comes first.' }
        : { kind: 'verb', fa: 'فعل در جای دوم می‌نشیند، هر چه اولِ جمله باشد.', en: 'The verb sits in second place, whatever comes first.' }));
  }
  if (a.objectMarker) {
    out.push({ kind: 'objectMarker', fa: '«را» بعد از چیزی می‌آید که کار روی آن انجام می‌شود.', en: '«را» comes after the thing the action is done to.' });
  }
  if (a.negation) {
    out.push({ kind: 'negation', fa: 'این واژه جمله را منفی می‌کند.', en: 'This word makes the sentence negative.' });
  }
  if (a.timePhrase) {
    out.push({ kind: 'timePhrase', fa: 'این چند واژه با هم زمان را می‌گویند؛ یک‌تکه یادشان بگیر.', en: 'These words tell the time together; learn them as one piece.' });
  }
  return out;
}
