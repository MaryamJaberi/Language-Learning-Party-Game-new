import React, { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Wifi, WifiOff, Sparkles, Download, Trash2, Loader2, HardDrive, CheckCircle2 } from 'lucide-react';
import {
  ContentMode,
  getContentMode,
  setContentMode,
  listSavedContent,
  clearSavedContent,
  removeSavedLanguage,
  downloadLanguagesForOffline,
  formatBytes,
  SavedContentItem,
} from '../contentStore';
import { SUPPORTED_LANGUAGES } from '../constants';
import { db } from '../firebase';
import { tx, txt, langName as localizedLangName } from '../i18n/runtime';

/** زبان‌هایی که فایل کارت دارند (public/data/decks) */
export const DECK_LANGUAGES = ['fa', 'en', 'en-US', 'en-GB', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'ar', 'tr', 'pl', 'uk', 'ru', 'zh', 'ja', 'ko', 'hi'];

/** زبان مادری و زبان‌های یادگیری که کاربر در تنظیمات بازی انتخاب کرده */
export function getSelectedLanguages(): string[] {
  try {
    const s = JSON.parse(localStorage.getItem('dor_settings') || '{}');
    const targets: string[] = Array.isArray(s.targetLanguages) && s.targetLanguages.length ? s.targetLanguages : [s.targetLanguage || 'en'];
    const native = s.nativeLanguage || s.language || 'fa';
    return Array.from(new Set([native, ...targets])).filter((l) => DECK_LANGUAGES.includes(l));
  } catch {
    return ['fa', 'en'];
  }
}

const langName = (code: string, rtl: boolean) => {
  const info = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  if (code === 'en-GB') return tx(rtl, 'انگلیسی بریتانیایی', 'English (UK)');
  if (!info) return code;
  return `${info.flag} ${localizedLangName(info, rtl)}`;
};

interface Props {
  isRTL: boolean;
  currentUser: User | null;
}

export const ContentStorageSettings: React.FC<Props> = ({ isRTL, currentUser }) => {
  const [mode, setMode] = useState<ContentMode>(getContentMode());
  const [saved, setSaved] = useState<SavedContentItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selected = getSelectedLanguages();

  const refresh = useCallback(async () => {
    setSaved(await listSavedContent());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // انتخاب کاربر روی پروفایلش هم ذخیره می‌شود و با ورود روی گوشی دیگر برمی‌گردد
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem('dour_content_mode')) return; // انتخاب همین گوشی مقدم است
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        const cloud = snap.exists() ? (snap.data() as any)?.preferences?.contentMode : null;
        if (!cancelled && cloud && cloud !== mode) {
          await setContentMode(cloud);
          setMode(cloud);
          refresh();
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseMode = async (m: ContentMode) => {
    setMessage(null);
    await setContentMode(m);
    setMode(m);
    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid), { preferences: { contentMode: m } }, { merge: true }).catch(() => {});
    }
    if (m === 'offline') await download(selected);
    await refresh();
  };

  const download = async (langs: string[]) => {
    setBusy('download');
    setMessage(null);
    const res = await downloadLanguagesForOffline(langs, (done, total) => setProgress({ done, total }));
    setProgress(null);
    setBusy(null);
    setMessage(
      res.failed.length
        ? (tx(isRTL, 'بعضی فایل‌ها دانلود نشدند. اینترنت را بررسی کنید و دوباره امتحان کنید.', 'Some files failed to download. Check your connection and try again.'))
        : (tx(isRTL, 'آماده شد؛ این زبان‌ها حالا بدون اینترنت هم کار می‌کنند.', 'Done — these languages now work offline.'))
    );
    await refresh();
  };

  const clearAll = async () => {
    setBusy('clear');
    await clearSavedContent();
    setBusy(null);
    setMessage(tx(isRTL, 'همهٔ محتوای ذخیره‌شده از گوشی پاک شد.', 'All saved content was removed from this device.'));
    await refresh();
  };

  const total = saved.reduce((a, b) => a + b.bytes, 0);
  const savedLangs = saved.filter((s) => s.id !== 'meta');

  const options: { id: ContentMode; icon: React.ReactNode; title: string; desc: string }[] = [
    {
      id: 'smart',
      icon: <Sparkles size={18} />,
      title: tx(isRTL, 'هوشمند (پیشنهادی)', 'Smart (recommended)'),
      desc: tx(isRTL, 'هر زبانی که بازی کنی یک بار دانلود و روی گوشی ذخیره می‌شود؛ دفعهٔ بعد بدون اینترنت هم کار می‌کند.', 'Each language you play is downloaded once and kept on this device, so it works offline next time.'),
    },
    {
      id: 'offline',
      icon: <WifiOff size={18} />,
      title: tx(isRTL, 'کاملاً آفلاین', 'Fully offline'),
      desc: tx(isRTL, 'زبان‌های انتخابی‌ات همین حالا کامل دانلود می‌شوند تا هر جا بدون اینترنت بازی کنی.', 'Your chosen languages are downloaded in full now, so you can play anywhere without internet.'),
    },
    {
      id: 'online',
      icon: <Wifi size={18} />,
      title: tx(isRTL, 'همیشه آنلاین', 'Always online'),
      desc: tx(isRTL, 'هیچ محتوایی روی گوشی ذخیره نمی‌شود؛ همه‌چیز هر بار از اینترنت می‌آید.', 'Nothing is stored on this device; everything is loaded from the internet each time.'),
    },
  ];

  return (
    <div className="space-y-4 text-start" dir={((isRTL ? 'rtl' : 'ltr'))}>
      <div>
        <h3 className="text-sm font-bold text-[var(--ink)] mb-1">{tx(isRTL, 'محتوای بازی روی گوشی', 'Game content on this device')}</h3>
        <p className="text-[11px] text-[var(--mute)] leading-relaxed">
          {tx(isRTL, 'کارت‌ها و ترجمه‌ها داخل خود اپ نیستند تا اپ سبک بماند. انتخاب کن که روی گوشی ذخیره شوند یا نه.', 'Cards and translations are not bundled with the app, so it stays light. Choose whether to keep them on your device.')}
        </p>
      </div>

      <div role="radiogroup" className="space-y-2">
        {options.map((o) => {
          const active = mode === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={busy !== null}
              onClick={() => chooseMode(o.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-2xl border text-start transition-all cursor-pointer disabled:opacity-60 ${
                active ? 'border-[var(--lapis)] bg-[var(--lapis)]/10' : 'border-[var(--line)] bg-[var(--bg)] hover:border-[var(--lapis)]/50'
              }`}
            >
              <span className={`mt-0.5 ${active ? 'text-[var(--lapis)]' : 'text-[var(--mute)]'}`}>{o.icon}</span>
              <span className="flex-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
                  {o.title}
                  {active && <CheckCircle2 size={14} className="text-[var(--lapis)]" />}
                </span>
                <span className="block text-[11px] text-[var(--mute)] leading-relaxed mt-0.5">{o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {mode !== 'online' && (
        <div className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--bg)] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
              <HardDrive size={15} />
              {tx(isRTL, 'ذخیره‌شده روی گوشی', 'Saved on this device')}
            </span>
            <span className="text-xs text-[var(--mute)]">{formatBytes(total, isRTL)}</span>
          </div>

          {savedLangs.length === 0 ? (
            <p className="text-[11px] text-[var(--mute)]">{tx(isRTL, 'هنوز زبانی ذخیره نشده.', 'No languages saved yet.')}</p>
          ) : (
            <ul className="space-y-1">
              {savedLangs.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-[11px] text-[var(--ink)]">
                  <span>{langName(s.id, isRTL)}</span>
                  <span className="flex items-center gap-2 text-[var(--mute)]">
                    {formatBytes(s.bytes, isRTL)}
                    <button
                      type="button"
                      onClick={async () => { await removeSavedLanguage(s.id); refresh(); }}
                      className="p-1 rounded-full hover:bg-red-500/10 text-red-500 cursor-pointer"
                      aria-label={tx(isRTL, 'پاک کردن', 'Remove')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => download(selected)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-full bg-[var(--lapis)] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {busy === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {busy === 'download' && progress
                ? `${progress.done}/${progress.total}`
                : (tx(isRTL, 'دانلود زبان‌های من برای آفلاین', 'Download my languages for offline'))}
            </button>
            <button
              type="button"
              disabled={busy !== null || saved.length === 0}
              onClick={clearAll}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-full border border-[var(--line)] text-xs font-semibold text-red-600 cursor-pointer disabled:opacity-50"
            >
              {busy === 'clear' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {tx(isRTL, 'پاک کردن همه', 'Remove all')}
            </button>
          </div>
          <p className="text-[10px] text-[var(--mute)]">
            {tx(isRTL, 'زبان‌های من: ', 'My languages: ')}
            {selected.map((l) => langName(l, isRTL)).join('، ')}
          </p>
        </div>
      )}

      {message && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{message}</p>}
    </div>
  );
};
