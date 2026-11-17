import React from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { BudgetMetrics } from '../../utils/budgetEngine';
import { formatCurrency } from '../../utils/formatters';

interface BudgetHealthCardProps {
  metrics: BudgetMetrics;
  currency: string;
  onOpenEnvelopes: () => void;
}

export const BudgetHealthCard: React.FC<BudgetHealthCardProps> = ({
  metrics,
  currency,
  onOpenEnvelopes,
}) => {
  const { budgetHealthScore, healthStatus, overspentEnvelopes, unassignedCash, totalAssigned } = metrics;

  const isBalanced = healthStatus === 'Balanced';
  const isTight = healthStatus === 'Tight';

  const statusTone = isBalanced
    ? 'text-emerald-600 dark:text-emerald-400'
    : isTight
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  const barColor = isBalanced
    ? 'bg-emerald-500'
    : isTight
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <section
      aria-label="Zero-based budget health"
      className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : isTight ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Zero-Based Budget Health
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {overspentEnvelopes.length > 0
              ? `${overspentEnvelopes.length} envelope${overspentEnvelopes.length > 1 ? 's' : ''} overspent (${overspentEnvelopes.map((o) => o.envelope.name).join(', ')})`
              : unassignedCash < 0
                ? `Over-assigned by ${formatCurrency(Math.abs(unassignedCash), currency)} — rebalance envelopes`
                : unassignedCash > 0
                  ? `${formatCurrency(unassignedCash, currency)} ready to be given a job`
                  : totalAssigned > 0
                    ? 'Every unit of liquid cash is cleanly assigned'
                    : 'Assign funds to envelopes to begin zero-based tracking'}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className={`text-2xl font-bold font-mono-num ${statusTone}`}>
                {budgetHealthScore}
              </span>
              <span className="text-xs text-slate-400 font-mono-num">/ 100</span>
            </div>
            <div className={`text-xs font-medium ${statusTone}`}>{healthStatus}</div>
          </div>

          <button
            type="button"
            onClick={onOpenEnvelopes}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <span>Manage Envelopes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Health Score Progress Track */}
      <div className="mt-4 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${budgetHealthScore}%` }}
        />
      </div>
    </section>
  );
};
