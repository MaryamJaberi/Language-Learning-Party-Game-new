import React from 'react';
import { tx, txt } from '../../i18n/runtime';

interface BicycleIllustrationProps {
  progressPercent: number; // 0 to 100 (% ride without wheels)
  activeWheelsCount: number;
  totalWheelsCount: number;
  isRtl?: boolean;
}

export const BicycleIllustration: React.FC<BicycleIllustrationProps> = ({
  progressPercent,
  activeWheelsCount,
  totalWheelsCount,
  isRtl = false
}) => {
  // Clamp progress 0 to 100
  const progress = Math.max(0, Math.min(100, progressPercent));
  const wheelsRemoved = totalWheelsCount - activeWheelsCount;

  return (
    <div
      data-testid="bicycle-training-wheels-illustration"
      className="relative flex flex-col items-center justify-center p-4 bg-gradient-to-b from-indigo-50/60 to-purple-50/40 dark:from-neutral-900/60 dark:to-neutral-950/60 rounded-2xl border border-indigo-200/50 dark:border-neutral-800 shadow-sm w-full max-w-lg mx-auto"
      dir={((isRtl ? 'rtl' : 'ltr'))}
    >
      {/* SVG Canvas for Bicycle */}
      <svg
        viewBox="0 0 400 220"
        className="w-full max-h-52 drop-shadow-md select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id="groundGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Backdrop gentle glow */}
        <circle cx="200" cy="110" r="90" fill="url(#sunGrad)" opacity="0.35" />

        {/* Road / Ground Line */}
        <line x1="20" y1="185" x2="380" y2="185" stroke="url(#groundGrad)" strokeWidth="3" strokeDasharray="8 6" />

        {/* BICYCLE FRAME & WHEELS */}
        {/* Rear Main Wheel (left: center at 110, 150) */}
        <circle cx="110" cy="150" r="35" fill="none" stroke="#334155" strokeWidth="4" />
        <circle cx="110" cy="150" r="30" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="110" cy="150" r="5" fill="#475569" />

        {/* Front Main Wheel (right: center at 290, 150) */}
        <circle cx="290" cy="150" r="35" fill="none" stroke="#334155" strokeWidth="4" />
        <circle cx="290" cy="150" r="30" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="290" cy="150" r="5" fill="#475569" />

        {/* Bicycle Frame Tubes */}
        {/* Bottom Bracket (Pedals) at 190, 150 */}
        <circle cx="190" cy="150" r="8" fill="#1E293B" />
        {/* Chainstay: Rear Hub to BB */}
        <line x1="110" y1="150" x2="190" y2="150" stroke="url(#frameGrad)" strokeWidth="5" strokeLinecap="round" />
        {/* Seatstay: Rear Hub to Saddle junction (150, 85) */}
        <line x1="110" y1="150" x2="155" y2="85" stroke="url(#frameGrad)" strokeWidth="5" strokeLinecap="round" />
        {/* Seat Tube: BB to Saddle junction */}
        <line x1="190" y1="150" x2="155" y2="85" stroke="url(#frameGrad)" strokeWidth="5" strokeLinecap="round" />
        {/* Saddle Post and Saddle */}
        <line x1="155" y1="85" x2="150" y2="70" stroke="#475569" strokeWidth="4" />
        <path d="M 135 68 Q 155 64 170 70 Q 155 76 135 68 Z" fill="#1E293B" />

        {/* Top Tube: Saddle junction to Head Tube (255, 80) */}
        <line x1="155" y1="85" x2="255" y2="80" stroke="url(#frameGrad)" strokeWidth="5" strokeLinecap="round" />
        {/* Down Tube: BB to Head Tube */}
        <line x1="190" y1="150" x2="255" y2="80" stroke="url(#frameGrad)" strokeWidth="5" strokeLinecap="round" />
        {/* Front Fork: Head Tube to Front Hub */}
        <line x1="255" y1="80" x2="290" y2="150" stroke="url(#frameGrad)" strokeWidth="5" strokeLinecap="round" />
        {/* Handlebars */}
        <line x1="255" y1="80" x2="250" y2="60" stroke="#475569" strokeWidth="4" />
        <path d="M 238 60 Q 252 50 268 60" fill="none" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />

        {/* Pedals & Chain ring */}
        <circle cx="190" cy="150" r="14" fill="none" stroke="#64748B" strokeWidth="2" strokeDasharray="4 2" />
        <line x1="182" y1="140" x2="198" y2="160" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
        <rect x="176" y="136" width="10" height="4" rx="2" fill="#0F172A" />
        <rect x="194" y="160" width="10" height="4" rx="2" fill="#0F172A" />

        {/* ======================================================== */}
        {/* TRAINING WHEELS ATTACHMENT (Mounted behind/beside rear wheel) */}
        {/* Training Wheel Strut from Rear Hub (110, 150) to Wheel Hub (75, 172) */}
        {/* ======================================================== */}
        <g id="training-wheel-group" className="transition-all duration-500">
          {/* Support bracket */}
          <line
            x1="110"
            y1="150"
            x2="70"
            y2={activeWheelsCount > 0 ? 172 : 158}
            stroke="#EA580C"
            strokeWidth="3.5"
            strokeDasharray={activeWheelsCount > 0 ? 'none' : '4 3'}
            strokeLinecap="round"
          />

          {/* The Training Wheel itself */}
          <circle
            cx="70"
            cy={activeWheelsCount > 0 ? 172 : 158}
            r="13"
            fill={activeWheelsCount > 0 ? '#FB923C' : '#E2E8F0'}
            stroke="#EA580C"
            strokeWidth="3"
            className="transition-all duration-300"
          />
          <circle
            cx="70"
            cy={activeWheelsCount > 0 ? 172 : 158}
            r="4"
            fill="#7C2D12"
          />

          {/* Sparkles / Little Badge indicating active aids */}
          {activeWheelsCount > 0 ? (
            <text
              x="70"
              y="142"
              textAnchor="middle"
              className="text-[10px] font-bold fill-orange-600 dark:fill-orange-400 select-none"
            >
              ⚙ {activeWheelsCount}
            </text>
          ) : (
            <text
              x="70"
              y="142"
              textAnchor="middle"
              className="text-[10px] font-bold fill-emerald-600 dark:fill-emerald-400 select-none"
            >
              ✨ بدون چرخ
            </text>
          )}
        </g>
      </svg>

      {/* Riding Without Wheels Progress Bar */}
      <div className="w-full mt-3 px-2">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--ink)] mb-1">
          <span>{tx(isRtl, 'میزان دوچرخه‌سواری مستقل شما:', 'How far you ride without training wheels:')}</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-black">{progress}%</span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
          <span>{txt(isRtl, '{0} چرخ کمکی باز شده', '{0} wheels removed', [wheelsRemoved])}</span>
          <span>{txt(isRtl, '{0} چرخ کمکی فعال', '{0} active', [activeWheelsCount])}</span>
        </div>
      </div>
    </div>
  );
};
