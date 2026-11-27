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
      fa: art ? `شکل پایهٔ این اسم با «${art}» می‌آید. رنگ و شکل ${a.gender.visual.symbol} فقط کمک می‌کنند با هم یادت بمانند.` : `رنگ و شکل ${a.gender.visual.symbol} نشان می‌دهند این اسم کدام دسته است.`,
      en: art ? `The basic form of this noun comes with “${art}”. The colour and the ${a.gender.visual.symbol} shape just help you remember them together.` : `The colour and the ${a.gender.visual.symbol} shape show which group this noun belongs to.`,
    });
  }
  if (a.diminutive) {
    out.push({
      kind: 'diminutive',
      fa: `واژهٔ کوچک‌شدهٔ مفرد (با ‎-${a.diminutive.suffix}) همیشه «het» می‌گیرد.`,
      en: `A singular small-form word (ending in -${a.diminutive.suffix}) always takes “het”.`,
    });
  }
  if (a.caseEnding) {
    const t = a.caseEnding.caseType;
    out.push({
      kind: 'caseEnding',
      fa: t === 'accusative' ? 'حرف آخر این واژه عوض شده، چون کار روی همین آدم یا چیز انجام می‌شود، یا بعد از واژه‌هایی مثل für و durch آمده.'
        : t === 'dative' ? 'حرف آخر این واژه عوض شده، چون چیزی به این آدم یا چیز می‌رسد، جای چیزی را می‌گوید، یا بعد از واژه‌هایی مثل mit و zu آمده.'
        : t === 'genitive' ? 'حرف آخر این واژه عوض شده، چون می‌گوید چیزی مال کیست یا از چیست.'
        : 'حرف آخر این واژه به‌خاطر نقشش در جمله عوض شده.',
      en: t === 'accusative' ? 'The ending changed because the action is done to this person or thing, or it follows words like für and durch.'
        : t === 'dative' ? 'The ending changed because something goes to this person or thing, it says where something is, or it follows words like mit and zu.'
        : t === 'genitive' ? 'The ending changed because it says whose something is, or what it is of.'
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
      ? { kind: 'clause', fa: `در بخشی که با «${a.clause.subordinator}» شروع می‌شود، فعل به آخر می‌رود.`, en: `In the part that starts with “${a.clause.subordinator}”, the verb goes to the end.` }
      : { kind: 'clause', fa: `از «${a.clause.subordinator}» یک بخشِ وابسته (شرط، زمان یا دلیل) شروع می‌شود.`, en: `“${a.clause.subordinator}” starts a dependent part (a condition, a time or a reason).` });
  }
  if (a.v2Verb) {
    const first = a.v2Verb.position === 0;
    out.push(lang === 'en'
      ? (first
        ? { kind: 'verb', fa: `در سؤال، «${a.v2Verb.verbText}» اول می‌آید.`, en: `In a question, “${a.v2Verb.verbText}” comes first.` }
        : { kind: 'verb', fa: `«${a.v2Verb.verbText}» فعل کمکی است؛ سؤال و نفی با همین ساخته می‌شوند.`, en: `“${a.v2Verb.verbText}” is a helper verb; questions and “not” are made with it.` })
      : (first
        ? { kind: 'verb', fa: 'در سؤال، فعل اول می‌آید.', en: 'In a question, the verb comes first.' }
        : { kind: 'verb', fa: 'فعل در جای دوم می‌نشیند؛ جای اول می‌تواند چند واژه باشد.', en: 'The verb sits in second place; the first place can be several words.' }));
  }
  if (a.objectMarker) {
    out.push({ kind: 'objectMarker', fa: '«را» بعد از چیزِ مشخصی می‌آید که کار روی آن انجام می‌شود.', en: '«را» follows the specific thing the action is done to.' });
  }
  if (a.negation) {
    out.push({ kind: 'negation', fa: 'این واژه «نه» را دربارهٔ چیزی می‌گوید.', en: 'This word says “not” about something.' });
  }
  if (a.timePhrase) {
    out.push({ kind: 'timePhrase', fa: 'این چند واژه با هم زمان را می‌گویند؛ یک‌تکه یادشان بگیر.', en: 'These words tell the time together; learn them as one piece.' });
  }
  return out;
}
