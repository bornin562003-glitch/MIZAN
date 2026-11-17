import React, { useEffect, useState } from 'react';
import { CalendarClock, Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { RecurringFrequency } from '../../types/finance';
import { formatCurrency, formatShortDate, getTodayIso } from '../../utils/formatters';

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export const RecurringTransactionsSection: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const addRecurringTransaction = useMizanStore((s) => s.addRecurringTransaction);
  const toggleRecurringActive = useMizanStore((s) => s.toggleRecurringActive);
  const deleteRecurringTransaction = useMizanStore((s) => s.deleteRecurringTransaction);
  const runRecurringTransactionNow = useMizanStore((s) => s.runRecurringTransactionNow);
  const processAllDueRecurring = useMizanStore((s) => s.processAllDueRecurring);

  const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
  const rules = activeData.recurringTransactions ?? [];

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'income' | 'spend'>('spend');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [accountId, setAccountId] = useState(activeData.accounts[0]?.id ?? '');
  const [envelopeId, setEnvelopeId] = useState(activeData.envelopes[0]?.id ?? '');
  const [nextRunDate, setNextRunDate] = useState(getTodayIso());
  const [autoPost, setAutoPost] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setAccountId((prev) =>
      activeData.accounts.some((a) => a.id === prev) ? prev : activeData.accounts[0]?.id ?? '',
    );
    setEnvelopeId((prev) =>
      activeData.envelopes.some((e) => e.id === prev) ? prev : activeData.envelopes[0]?.id ?? '',
    );
  }, [activeProfileId, activeData.accounts, activeData.envelopes]);

  const accountMap = new Map(activeData.accounts.map((a) => [a.id, a.name]));
  const envelopeMap = new Map(activeData.envelopes.map((e) => [e.id, e.name]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount);
    if (!title.trim() || !Number.isFinite(numeric) || numeric <= 0) return;

    addRecurringTransaction({
      title: title.trim(),
      type,
      amount: numeric,
      frequency,
      accountId: accountId || activeData.accounts[0]?.id || '',
      envelopeId: type === 'spend' ? envelopeId : undefined,
      nextRunDate,
      active: true,
      autoPost,
      tags: [type === 'income' ? 'salary' : 'bill'],
    });

    setTitle('');
    setAmount('');
    setAdding(false);
    setFeedback(`Scheduled "${title.trim()}" (${FREQ_LABELS[frequency]}) and synced projections.`);
    window.setTimeout(() => setFeedback(null), 4000);
  };

  const handleCheckDue = () => {
    const count = processAllDueRecurring();
    setFeedback(
      count > 0
        ? `Posted ${count} due recurring ${count === 1 ? 'entry' : 'entries'} to the ledger.`
        : 'All recurring bills and salaries are up to date.',
    );
    window.setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <section
      aria-label="Recurring transactions"
      className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recurring Transactions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automate daily, weekly, or monthly bills and salaries into ledger &amp; dashboard projections
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCheckDue}
            className="h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>Sync Due</span>
          </button>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="h-[38px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add Recurring</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"
        >
          {feedback}
        </div>
      )}

      {adding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="sm:col-span-2">
              <label htmlFor="rec-title" className="block text-[11px] font-medium text-slate-500 mb-1">
                Title (Bill or Salary)
              </label>
              <input
                id="rec-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly Salary, Fiber Internet"
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
              />
            </div>

            <div>
              <label htmlFor="rec-type" className="block text-[11px] font-medium text-slate-500 mb-1">
                Type
              </label>
              <select
                id="rec-type"
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'spend')}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
              >
                <option value="spend">Recurring Bill (Spend)</option>
                <option value="income">Recurring Salary (Income)</option>
              </select>
            </div>

            <div>
              <label htmlFor="rec-amount" className="block text-[11px] font-medium text-slate-500 mb-1">
                Amount ({currency})
              </label>
              <input
                id="rec-amount"
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono-num font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
            <div>
              <label htmlFor="rec-freq" className="block text-[11px] font-medium text-slate-500 mb-1">
                Frequency
              </label>
              <select
                id="rec-freq"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label htmlFor="rec-account" className="block text-[11px] font-medium text-slate-500 mb-1">
                Account
              </label>
              <select
                id="rec-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
              >
                {activeData.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {type === 'spend' ? (
              <div>
                <label htmlFor="rec-env" className="block text-[11px] font-medium text-slate-500 mb-1">
                  Envelope
                </label>
                <select
                  id="rec-env"
                  value={envelopeId}
                  onChange={(e) => setEnvelopeId(e.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                >
                  {activeData.envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pb-2">
                Income credits directly to account &amp; projections
              </div>
            )}

            <div>
              <label htmlFor="rec-next-date" className="block text-[11px] font-medium text-slate-500 mb-1">
                Next Run Date
              </label>
              <input
                id="rec-next-date"
                type="date"
                required
                value={nextRunDate}
                onChange={(e) => setNextRunDate(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPost}
                onChange={(e) => setAutoPost(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>Automatically log entry when due date arrives</span>
            </label>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-[38px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </form>
      )}

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-5 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No recurring bills or salaries scheduled yet. Add one to automate ledger entries and include it in dashboard projections.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {rules.map((rule) => {
            const accName = accountMap.get(rule.accountId) ?? 'Account';
            const envName = rule.envelopeId ? envelopeMap.get(rule.envelopeId) : null;
            return (
              <div
                key={rule.id}
                className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  !rule.active ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {rule.title}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        rule.active
                          ? 'text-teal-600 dark:text-teal-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {rule.active ? (rule.autoPost ? 'Auto' : 'Reminder') : 'Paused'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                    <span>{FREQ_LABELS[rule.frequency]}</span>
                    <span aria-hidden="true">·</span>
                    <span>Next {formatShortDate(rule.nextRunDate)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{accName}</span>
                    {envName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{envName}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  <span
                    className={`text-sm font-mono-num font-semibold sm:min-w-[110px] sm:text-right ${
                      rule.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {rule.type === 'income' ? '+' : '-'}
                    {formatCurrency(rule.amount, currency, false, discreetMode)}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        runRecurringTransactionNow(rule.id);
                        setFeedback(`Posted "${rule.title}" to today's ledger.`);
                        window.setTimeout(() => setFeedback(null), 3500);
                      }}
                      className="h-[36px] min-w-[96px] px-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-900/40 whitespace-nowrap"
                    >
                      <Play className="w-3 h-3 shrink-0" />
                      <span>Post Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleRecurringActive(rule.id)}
                      aria-label={rule.active ? `Pause ${rule.title}` : `Resume ${rule.title}`}
                      title={rule.active ? 'Pause schedule' : 'Resume schedule'}
                      className="h-[36px] w-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {rule.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteRecurringTransaction(rule.id)}
                      aria-label={`Delete recurring ${rule.title}`}
                      className="h-[36px] w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
