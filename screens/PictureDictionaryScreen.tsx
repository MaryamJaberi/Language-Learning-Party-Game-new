import React, { useEffect, useMemo, useState } from 'react';
import { loadManifest } from '../components/CardImage';
import { getContentBaseUrl } from '../contentStore';
import { ArrowLeft, ArrowRight, Volume2, BookOpenText } from 'lucide-react';
import LexThumb from '../src/visual/LexThumb';
import { LEXICON, type LexEntry } from '../src/visual/lexicon';
import { tx, txt, uiDigits } from '../i18n/runtime';
import { sound } from '../soundManager';
import { TrainingWheelText } from '../components/trainingWheels/TrainingWheelText';
import type { LanguageCard } from '../types';

/**
 * دیکشنری تصویری: همهٔ واژه‌های دنیای تصویری «دور»، دسته به دسته.
 * هر واژه به زبانی که یاد می‌گیری (بزرگ، با رنگ حرف تعریف) و زبان خودت (کوچک) نشان داده می‌شود؛ لمس کن تا بشنوی.
 */
const LANGS = ['fa', 'en', 'nl', 'de'] as const;
type DictLang = (typeof LANGS)[number];
const LANG_LABEL: Record<DictLang, { fa: string; en: string }> = {
  fa: { fa: 'فارسی', en: 'Persian' },
  en: { fa: 'انگلیسی', en: 'English' },
  nl: { fa: 'هلندی', en: 'Dutch' },
  de: { fa: 'آلمانی', en: 'German' },
};

const toDictLang = (l: string | undefined, fallback: DictLang): DictLang => {
  const base = (l || '').split('-')[0] as DictLang;
  return (LANGS as readonly string[]).includes(base) ? base : fallback;
};

/** «de opa» → حرف تعریف جدا، تا رنگ جنس دستوری روی آن بنشیند */
function splitArticle(word: string, lang: DictLang): { article?: string; text: string } {
  const m = lang === 'nl' ? word.match(/^(de|het) (.+)$/) : lang === 'de' ? word.match(/^(der|die|das) (.+)$/) : null;
  return m ? { article: m[1], text: m[2] } : { text: word };
}

function Word({ entry, lang, uiLanguage }: { entry: LexEntry; lang: DictLang; uiLanguage: string }) {
  const word = entry[lang];
  const { article, text } = splitArticle(word, lang);
  if (!article) return <span>{word}</span>;
  const card = { id: `dict_${lang}_${entry.id}`, targetText: `${article} ${text}`, article, targetLanguage: lang, cefrLevel: 'A1' } as unknown as LanguageCard;
  return <TrainingWheelText card={card} stage={1} uiLanguage={uiLanguage} />;
}

interface Props {
  language: string;
  isRTL: boolean;
  targetLanguage?: string;
  nativeLanguage?: string;
  onExit: () => void;
}

export default function PictureDictionaryScreen({ language, isRTL, targetLanguage, nativeLanguage, onExit }: Props) {
  const [target, setTarget] = useState<DictLang>(toDictLang(targetLanguage, 'en'));
  const [native, setNative] = useState<DictLang>(() => {
    const n = toDictLang(nativeLanguage || language, 'fa');
    return n === toDictLang(targetLanguage, 'en') ? (n === 'fa' ? 'en' : 'fa') : n;
  });
  const [catId, setCatId] = useState(LEXICON[0].id);
  // تصویرهای Canva دیکشنری (d_<id>)؛ تا ساخته نشده‌اند، طرح موقت با کد نشان داده می‌شود
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    loadManifest().then((m) => {
      if (!alive) return;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(m)) if (k.startsWith('d_')) out[k] = getContentBaseUrl() + 'data/card-images/' + v.file;
      setImages(out);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const cat = useMemo(() => LEXICON.find((c) => c.id === catId) || LEXICON[0], [catId]);
  const titleKey = (['fa', 'en', 'nl', 'de'].includes(language.split('-')[0]) ? language.split('-')[0] : 'en') as 'fa' | 'en' | 'nl' | 'de';

  const say = (entry: LexEntry) => {
    sound.speak(entry[target], target, { force: true });
  };

  const LangPick = ({ value, onChange, label }: { value: DictLang; onChange: (l: DictLang) => void; label: string }) => (
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--mute)]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DictLang)}
        className="min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--panel)] px-2 text-xs font-black text-[var(--ink)] cursor-pointer"
      >
        {LANGS.map((l) => <option key={l} value={l}>{tx(isRTL, LANG_LABEL[l].fa, LANG_LABEL[l].en)}</option>)}
      </select>
    </label>
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)]" dir={isRTL ? 'rtl' : 'ltr'} data-testid="picture-dictionary">
      <div className="max-w-3xl mx-auto px-3 pt-3 pb-24 space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { sound.playClick(); onExit(); }}
            aria-label={tx(isRTL, 'بازگشت', 'Back')}
            className="w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--panel)] flex items-center justify-center cursor-pointer"
          >
            {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          </button>
          <div className="w-9 h-9 rounded-xl bg-[var(--lapis-soft)] text-[var(--lapis)] flex items-center justify-center"><BookOpenText size={18} /></div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black leading-tight">{tx(isRTL, 'دیکشنری تصویری', 'Picture dictionary')}</h1>
            <p className="text-[11px] text-[var(--mute)] font-medium leading-snug">{tx(isRTL, 'هر واژه یک تصویر از دنیای فامیل «دور». لمس کن تا تلفظش را بشنوی.', 'Every word has a picture from the Dour family’s world. Tap to hear it.')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LangPick value={target} onChange={(l) => { setTarget(l); if (l === native) setNative(l === 'fa' ? 'en' : 'fa'); }} label={tx(isRTL, 'یاد می‌گیرم:', 'Learning:')} />
          <LangPick value={native} onChange={(l) => { setNative(l); if (l === target) setTarget(l === 'en' ? 'nl' : 'en'); }} label={tx(isRTL, 'زبان من:', 'My language:')} />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
          {LEXICON.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === catId}
              onClick={() => { sound.playClick(); setCatId(c.id); }}
              className={`shrink-0 min-h-[36px] px-3 rounded-xl border text-xs font-black cursor-pointer transition-colors ${
                c.id === catId ? 'bg-[var(--lapis)] border-[var(--lapis)] text-white' : 'bg-[var(--panel)] border-[var(--line)] text-[var(--ink)]'
              }`}
            >
              {c.title[titleKey]} <span className="opacity-70">{uiDigits(isRTL, c.entries.length)}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2" role="list" aria-label={txt(isRTL, '{0} واژه', '{0} words', [cat.entries.length])}>
          {cat.entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="listitem"
              onClick={() => say(entry)}
              className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1.5 text-center cursor-pointer active:scale-[0.97] transition-transform"
              data-testid={`dict-${entry.id}`}
            >
              {images[`d_${entry.id}`] ? (
                <img src={images[`d_${entry.id}`]} alt={entry[target]} loading="lazy" decoding="async" className="block w-full h-auto rounded-xl object-cover" style={{ aspectRatio: '1 / 1', objectPosition: '50% 35%' }} />
              ) : (
                <LexThumb visual={entry.visual} title={entry[target]} className="block w-full h-auto" />
              )}
              <div className="mt-1 text-sm font-black leading-tight" dir={target === 'fa' ? 'rtl' : 'ltr'} lang={target}>
                <Word entry={entry} lang={target} uiLanguage={language} />
              </div>
              <div className="text-[11px] text-[var(--mute)] font-medium leading-tight" dir={native === 'fa' ? 'rtl' : 'ltr'} lang={native}>{entry[native]}</div>
              <Volume2 size={12} className="mx-auto mt-0.5 text-[var(--mute)] opacity-60 group-hover:opacity-100" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
