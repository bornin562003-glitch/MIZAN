import React from 'react';
import { Maximize2, Monitor, Smartphone } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { ViewportMode } from '../../types/finance';
import { ViewportFitResult } from '../../utils/viewportFit';

const MODE_OPTIONS: {
  id: ViewportMode;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'auto', label: 'Auto Fit', short: 'Auto', icon: Maximize2 },
  { id: 'mobile', label: 'Mobile (9:19.5)', short: 'Mobile', icon: Smartphone },
  { id: 'desktop', label: 'Desktop (16:10)', short: 'Desktop', icon: Monitor },
];

export const ViewportModeSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const viewportMode = useMizanStore((s) => s.viewportMode);
  const setViewportMode = useMizanStore((s) => s.setViewportMode);

  return (
    <div
      role="group"
      aria-label="Screen layout view mode"
      className="inline-flex items-center gap-0.5 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/80 shrink-0"
    >
      {MODE_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = viewportMode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setViewportMode(opt.id)}
            aria-pressed={active}
            aria-label={`Switch to ${opt.label} view`}
            className={`${
              compact ? 'min-h-[30px] px-2 text-[11px]' : 'min-h-[34px] px-2.5 text-xs'
            } rounded-lg font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
              active
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{compact ? opt.short : opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const ViewportStageChrome: React.FC<{ fit: ViewportFitResult }> = ({ fit }) => {
  const scalePct = Math.round(fit.scale * 100);
  const ratioShort = fit.mode === 'mobile' ? '9:19.5' : '16:10';

  return (
    <div className="w-full h-11 shrink-0 px-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-2 z-40">
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
          {ratioShort}
        </span>
        <span className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400 whitespace-nowrap">
          · {scalePct}% fit
        </span>
      </div>
      <ViewportModeSelector compact />
    </div>
  );
};
