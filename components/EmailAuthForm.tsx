import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Mail, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, resetPasswordByEmail } from '../firebase';
import { tx, txt } from '../i18n/runtime';

interface Props {
  isRTL: boolean;
  onSignedIn: (user: User) => void;
}

const errorText = (code: string | undefined, rtl: boolean): string => {
  const fa: Record<string, string> = {
    'auth/invalid-email': 'ایمیل درست نیست.',
    'auth/missing-password': 'رمز را وارد کنید.',
    'auth/weak-password': 'رمز باید دست‌کم ۶ نویسه باشد.',
    'auth/email-already-in-use': 'با این ایمیل قبلاً حساب ساخته شده؛ وارد شوید.',
    'auth/invalid-credential': 'ایمیل یا رمز درست نیست.',
    'auth/user-not-found': 'حسابی با این ایمیل نیست.',
    'auth/wrong-password': 'رمز درست نیست.',
    'auth/too-many-requests': 'تلاش زیاد بود؛ چند دقیقه بعد دوباره امتحان کنید.',
    'auth/network-request-failed': 'اینترنت وصل نیست.',
    'auth/operation-not-allowed': 'ورود با ایمیل هنوز در تنظیمات سرور روشن نشده است.',
  };
  const en: Record<string, string> = {
    'auth/invalid-email': 'That email is not valid.',
    'auth/missing-password': 'Enter a password.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/email-already-in-use': 'An account with this email already exists — sign in instead.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account with this email.',
    'auth/wrong-password': 'Wrong password.',
    'auth/too-many-requests': 'Too many attempts; try again in a few minutes.',
    'auth/network-request-failed': 'No internet connection.',
    'auth/operation-not-allowed': 'Email sign-in is not enabled on the server yet.',
  };
  if (code && en[code]) return tx(rtl, fa[code], en[code]);
  return tx(rtl, 'ورود انجام نشد؛ دوباره امتحان کنید.', 'Sign-in failed; please try again.');
};

/** ورود و ثبت‌نام با ایمیل و رمز، برای کسانی که نمی‌خواهند با گوگل وارد شوند */
export const EmailAuthForm: React.FC<Props> = ({ isRTL, onSignedIn }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const user = mode === 'signup'
        ? await signUpWithEmail(email, password, name)
        : await signInWithEmail(email, password);
      onSignedIn(user);
    } catch (err: any) {
      setError(errorText(err?.code, isRTL));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError(tx(isRTL, 'اول ایمیل را بنویسید.', 'Enter your email first.'));
      return;
    }
    try {
      await resetPasswordByEmail(email);
      setInfo(tx(isRTL, 'ایمیل بازیابی رمز فرستاده شد.', 'Password reset email sent.'));
    } catch (err: any) {
      setError(errorText(err?.code, isRTL));
    }
  };

  const input = 'w-full h-10 px-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--lapis)]';

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 h-10 px-3.5 text-xs font-semibold text-[var(--ink)] cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Mail size={15} className="text-[var(--lapis)]" />
          {tx(isRTL, 'ورود یا ثبت‌نام با ایمیل (بدون گوگل)', 'Sign in or sign up with email (no Google)')}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <form onSubmit={submit} className="px-3.5 pb-3.5 space-y-2" dir={((isRTL ? 'rtl' : 'ltr'))}>
          <div className="flex gap-1 p-1 rounded-full bg-[var(--panel)] border border-[var(--line)]">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setInfo(null); }}
                className={`flex-1 h-8 rounded-full text-xs font-bold cursor-pointer ${mode === m ? 'bg-[var(--lapis)] text-white' : 'text-[var(--mute)]'}`}
              >
                {m === 'signin' ? (tx(isRTL, 'ورود', 'Sign in')) : (tx(isRTL, 'ساخت حساب', 'Create account'))}
              </button>
            ))}
          </div>

          {mode === 'signup' && (
            <input className={input} value={name} onChange={(e) => setName(e.target.value)}
              placeholder={tx(isRTL, 'نام (اختیاری)', 'Name (optional)')} autoComplete="name" />
          )}
          <input className={input} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={tx(isRTL, 'ایمیل', 'Email')} autoComplete="email" required />
          <input className={input} type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={tx(isRTL, 'رمز (دست‌کم ۶ نویسه)', 'Password (6+ characters)')} minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />

          {error && <p className="text-[11px] text-red-600">{error}</p>}
          {info && <p className="text-[11px] text-emerald-600">{info}</p>}

          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-1.5 h-10 rounded-full bg-[var(--lapis)] text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === 'signin' ? (tx(isRTL, 'ورود', 'Sign in')) : (tx(isRTL, 'ساخت حساب', 'Create account'))}
          </button>

          {mode === 'signin' && (
            <button type="button" onClick={forgot} className="text-[11px] text-[var(--mute)] hover:text-[var(--lapis)] cursor-pointer">
              {tx(isRTL, 'رمز را فراموش کرده‌ام', 'Forgot password?')}
            </button>
          )}
        </form>
      )}
    </div>
  );
};
