import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, ShieldAlert, X } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { formatCurrency } from '../../utils/formatters';

export const BudgetAlertToasts: React.FC = () => {
  const budgetToasts = useMizanStore((s) => s.budgetToasts);
  const dismissBudgetToast = useMizanStore((s) => s.dismissBudgetToast);
  const setActiveTab = useMizanStore((s) => s.setActiveTab);
  const discreetMode = useMizanStore((s) => s.discreetMode);

  useEffect(() => {
    if (budgetToasts.length === 0) return;
    const timers = budgetToasts.map((toast) =>
      window.setTimeout(() => {
        dismissBudgetToast(toast.id);
      }, 9000),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [budgetToasts, dismissBudgetToast]);

  if (budgetToasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Real-time budget alerts"
      aria-live="polite"
      className="fixed top-[68px] lg:top-20 right-3 sm:right-5 z-50 w-[calc(100%-1.5rem)] max-w-sm space-y-2 pointer-events-none"
    >
      <AnimatePresence>
        {budgetToasts.map((toast) => {
          const isCritical = toast.threshold >= 100;
          const remaining = toast.assigned - toast.spent;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-xl backdrop-blur-md ${
                isCritical
                  ? 'border-rose-500/40 bg-white/95 dark:bg-slate-900/95'
                  : 'border-amber-500/40 bg-white/95 dark:bg-slate-900/95'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-semibold ${
                        isCritical
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {isCritical
                        ? `100% Budget Limit Reached · ${toast.percentUsed}%`
                        : `80% Budget Threshold Alert · ${toast.percentUsed}%`}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {toast.envelopeName}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-num mt-0.5">
                      {formatCurrency(toast.spent, toast.currency, false, discreetMode)} of{' '}
                      {formatCurrency(toast.assigned, toast.currency, false, discreetMode)}{' '}
                      {remaining < 0
                        ? `(${formatCurrency(Math.abs(remaining), toast.currency, false, discreetMode)} over)`
                        : `(${formatCurrency(remaining, toast.currency, false, discreetMode)} left)`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => dismissBudgetToast(toast.id)}
                  aria-label={`Dismiss alert for ${toast.envelopeName}`}
                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isCritical ? 'bg-rose-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, toast.percentUsed)}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('envelopes');
                    dismissBudgetToast(toast.id);
                  }}
                  className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Rebalance Envelopes</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
