import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert, X } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { BudgetAlert, getMonthPrefix } from '../../utils/budgetEngine';
import { formatCurrency } from '../../utils/formatters';

interface BudgetWarningsBannerProps {
  alerts: BudgetAlert[];
  currency: string;
  onAction: () => void;
  actionLabel?: string;
}

export const BudgetWarningsBanner: React.FC<BudgetWarningsBannerProps> = ({
  alerts,
  currency,
  onAction,
  actionLabel = 'Rebalance',
}) => {
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const dismissedAlertKeys = useMizanStore((s) => s.dismissedAlertKeys);
  const dismissBudgetAlertBanner = useMizanStore((s) => s.dismissBudgetAlertBanner);

  const monthPrefix = getMonthPrefix(new Date());
  const visibleAlerts = alerts.filter((alert) => {
    const key = `${activeProfileId}:${alert.envelopeId}:${alert.threshold}:${monthPrefix}`;
    return !dismissedAlertKeys[key];
  });

  if (visibleAlerts.length === 0) return null;

  const criticalCount = visibleAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = visibleAlerts.length - criticalCount;

  return (
    <section
      aria-label="Envelope budget threshold warnings"
      className={`rounded-2xl border p-4 space-y-3 ${
        criticalCount > 0
          ? 'border-rose-500/35 bg-rose-50/60 dark:bg-rose-950/20'
          : 'border-amber-500/35 bg-amber-50/60 dark:bg-amber-950/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              criticalCount > 0
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}
          >
            {criticalCount > 0 ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Budget Threshold Warnings
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {criticalCount > 0 && `${criticalCount} at 100%+ limit`}
              {criticalCount > 0 && warningCount > 0 && ' · '}
              {warningCount > 0 && `${warningCount} above 80% threshold`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
        {visibleAlerts.map((alert) => {
          const isCritical = alert.severity === 'critical';
          return (
            <div
              key={`${alert.envelopeId}-${alert.threshold}`}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {alert.envelopeName}
                  </span>
                  <span
                    className={`font-mono-num font-semibold shrink-0 ${
                      isCritical
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {alert.percentUsed}% · {isCritical ? 'Limit Reached (100%+)' : 'Near Limit (80%+)'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                  <span>
                    Spent {formatCurrency(alert.spent, currency, false, discreetMode)} /{' '}
                    {formatCurrency(alert.assigned, currency, false, discreetMode)}
                  </span>
                  <span>
                    {alert.remaining < 0
                      ? `${formatCurrency(Math.abs(alert.remaining), currency, false, discreetMode)} over`
                      : `${formatCurrency(alert.remaining, currency, false, discreetMode)} remaining`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissBudgetAlertBanner(alert.envelopeId, alert.threshold)}
                aria-label={`Dismiss ${alert.envelopeName} warning`}
                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
