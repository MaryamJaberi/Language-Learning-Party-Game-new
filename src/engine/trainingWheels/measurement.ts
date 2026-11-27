/**
 * سنجش چرخ‌های کمکی: آیا این کمک‌ها واقعاً کمک می‌کنند؟
 *
 * - هر جواب در مرور لایتنر ثبت می‌شود: چه کمک‌هایی روی کارت بود، مرحلهٔ محو شدن، درست/غلط، فاصله از مرور قبلی.
 * - همه‌چیز فقط روی همین دستگاه می‌ماند (localStorage)؛ هیچ‌چیز فرستاده نمی‌شود.
 * - «گروه مقایسه» (پیش‌فرض خاموش): حدود یک‌دهم کارت‌ها به‌تصادف هیچ کمکی نمی‌گیرند،
 *   تا بشود کارتِ کمک‌گرفته را با کارتِ بی‌کمک مقایسه کرد. کاربر آن را در راهنما می‌بیند و روشن و خاموش می‌کند.
 */
import { LanguageCard } from '../../../types';
import { analyzeLanguageAids, limitAids, baseLang } from './languages';

const STORAGE_LOG = 'dor_aid_log_v1';
const STORAGE_MEASURE = 'dor_aid_measure_v1';
const MAX_LOG = 2000;

export interface AidLogEntry {
  /** زمان (میلی‌ثانیه) */
  t: number;
  id: string;
  lang: string;
  /** نوع کمک‌هایی که این کارت می‌تواند بگیرد (حداکثر دو) */
  aids: string[];
  /** مرحلهٔ محو شدن هنگام جواب: ۰ و ۱ کمک کامل، ۲ کم‌رنگ، ۳ بدون کمک */
  stage: number;
  /** کارتِ گروه مقایسه (هیچ‌وقت کمک نگرفته) */
  holdout: boolean;
  ok: boolean;
  /** روز از مرور قبلی؛ ‎-1 یعنی اولین بار */
  gap: number;
}

interface MeasureSettings { holdoutEnabled: boolean; seed: string }

function readMeasure(): MeasureSettings {
  try {
    const raw = localStorage.getItem(STORAGE_MEASURE);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.seed === 'string') return { holdoutEnabled: !!p.holdoutEnabled, seed: p.seed };
    }
  } catch { /* ignore */ }
  const fresh = { holdoutEnabled: false, seed: Math.random().toString(36).slice(2, 10) };
  try { localStorage.setItem(STORAGE_MEASURE, JSON.stringify(fresh)); } catch { /* ignore */ }
  return fresh;
}

export function isHoldoutEnabled(): boolean { return readMeasure().holdoutEnabled; }

export function setHoldoutEnabled(on: boolean): void {
  const m = readMeasure();
  try { localStorage.setItem(STORAGE_MEASURE, JSON.stringify({ ...m, holdoutEnabled: on })); } catch { /* ignore */ }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** آیا این کارت در گروه مقایسه است؟ برای هر دستگاه ثابت می‌ماند (حدود یک‌دهم کارت‌ها). */
export function isHoldoutCard(cardId: string): boolean {
  const m = readMeasure();
  if (!m.holdoutEnabled) return false;
  return hash(m.seed + '|' + cardId) % 10 === 0;
}

export function aidKindsForCard(card: LanguageCard): string[] {
  try {
    const a = limitAids(analyzeLanguageAids(card, {}), 2);
    return Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] && k !== 'subordinateVerbFinal' && k !== 'diminutive');
  } catch {
    return [];
  }
}

export function readAidLog(): AidLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_LOG);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function clearAidLog(): void {
  try { localStorage.removeItem(STORAGE_LOG); } catch { /* ignore */ }
}

/** یک جواب را ثبت می‌کند. کارت‌هایی که هیچ کمکی نمی‌توانند بگیرند ثبت نمی‌شوند. */
export function logAidAnswer(card: LanguageCard | undefined, stage: number, ok: boolean, gapDays: number, now = Date.now()): void {
  if (!card?.id || !card.targetText) return;
  const aids = aidKindsForCard(card);
  if (!aids.length) return;
  const entry: AidLogEntry = {
    t: now, id: card.id, lang: baseLang(card.targetLanguage), aids,
    stage: Math.max(0, Math.min(3, stage)), holdout: isHoldoutCard(card.id), ok, gap: gapDays,
  };
  try {
    const log = readAidLog();
    log.push(entry);
    localStorage.setItem(STORAGE_LOG, JSON.stringify(log.slice(-MAX_LOG)));
  } catch { /* ignore */ }
}

export interface AidSummaryRow {
  aid: string;
  /** جواب‌هایی که کمک روی صفحه بود (مرحلهٔ ۰ تا ۲، نه گروه مقایسه) */
  withAid: { n: number; correct: number };
  /** جواب‌هایی که کمک نبود (مرحلهٔ ۳ یا گروه مقایسه) */
  withoutAid: { n: number; correct: number };
  /** یادآوری با فاصلهٔ دست‌کم ۷ روز، برای کارت‌هایی که کمک گرفته بودند */
  delayed7: { n: number; correct: number };
  /** همان، برای گروه مقایسه */
  delayed7Holdout: { n: number; correct: number };
}

/** حداقل تعداد جواب در هر طرف، پیش از اینکه بشود چیزی گفت */
export const MIN_ANSWERS_TO_JUDGE = 200;

export function summarizeAidLog(log: AidLogEntry[] = readAidLog(), lang?: string): AidSummaryRow[] {
  const rows = new Map<string, AidSummaryRow>();
  const row = (aid: string) => {
    if (!rows.has(aid)) rows.set(aid, { aid, withAid: { n: 0, correct: 0 }, withoutAid: { n: 0, correct: 0 }, delayed7: { n: 0, correct: 0 }, delayed7Holdout: { n: 0, correct: 0 } });
    return rows.get(aid)!;
  };
  for (const e of log) {
    if (lang && e.lang !== lang) continue;
    for (const aid of e.aids) {
      const r = row(aid);
      const visible = !e.holdout && e.stage < 3;
      const bucket = visible ? r.withAid : r.withoutAid;
      bucket.n++; if (e.ok) bucket.correct++;
      if (e.gap >= 7) {
        const d = e.holdout ? r.delayed7Holdout : r.delayed7;
        d.n++; if (e.ok) d.correct++;
      }
    }
  }
  return [...rows.values()].sort((a, b) => (b.withAid.n + b.withoutAid.n) - (a.withAid.n + a.withoutAid.n));
}
