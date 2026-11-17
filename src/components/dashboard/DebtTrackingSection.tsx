import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar, CheckCircle2, CreditCard, Percent, Plus, Trash2, TrendingDown } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { computePortfolioDebtSummary } from '../../utils/debtEngine';
import { formatCurrency } from '../../utils/formatters';

export const DebtTrackingSection: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const addDebt = useMizanStore((s) => s.addDebt);
  const deleteDebt = useMizanStore((s) => s.deleteDebt);
  const recordDebtPayment = useMizanStore((s) => s.recordDebtPayment);

  const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
  const debts = activeData.debts ?? [];
  const showDebtTracker = activeData.preferences?.enabledTrackers.debtTracker ?? true;

  const [extraPayment, setExtraPayment] = useState<number>(0);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [principalOriginal, setPrincipalOriginal] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [apr, setApr] = useState('12');
  const [monthlyPayment, setMonthlyPayment] = useState('');

  // Inline payment capture state
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(activeData.accounts[0]?.id ?? '');

  useEffect(() => {
    setPaymentAccountId((prev) =>
      activeData.accounts.some((a) => a.id === prev) ? prev : activeData.accounts[0]?.id ?? '',
    );
  }, [activeProfileId, activeData.accounts]);

  const summary = useMemo(
    () => computePortfolioDebtSummary(debts, extraPayment),
    [debts, extraPayment],
  );

  if (!showDebtTracker) return null;

  const chartData = summary.items.map((item) => ({
    name: item.debt.name.length > 14 ? `${item.debt.name.slice(0, 14)}…` : item.debt.name,
    paid: item.repaidAmount,
    remaining: item.debt.currentBalance,
  }));

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const curBal = Number(currentBalance);
    const orig = Number(principalOriginal) || curBal;
    const pay = Number(monthlyPayment);
    const rate = Math.max(0, Number(apr) || 0);
    if (!name.trim() || !Number.isFinite(curBal) || curBal <= 0 || !Number.isFinite(pay) || pay <= 0) {
      return;
    }

    addDebt({
      name: name.trim(),
      lender: lender.trim() || 'Lender',
      principalOriginal: Math.max(orig, curBal),
      currentBalance: curBal,
      annualInterestRate: rate,
      monthlyPayment: pay,
      accountId: activeData.accounts[0]?.id,
    });

    setName('');
    setLender('');
    setPrincipalOriginal('');
    setCurrentBalance('');
    setMonthlyPayment('');
    setApr('12');
    setAdding(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!payingDebtId || !Number.isFinite(amt) || amt <= 0) return;
    recordDebtPayment(payingDebtId, amt, paymentAccountId);
    setPayingDebtId(null);
    setPaymentAmount('');
  };

  const stepExtra = currency === 'PKR' ? 2500 : 100;

  return (
    <section
      aria-label="Debt and loan repayment tracker"
      className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Debt &amp; Loan Repayment Tracker
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Amortization progress, APR interest impact, and projected debt-free dates
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="h-[40px] px-3.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Add Loan / Debt</span>
        </button>
      </div>

      {/* Add Debt Form */}
      {adding && (
        <form
          onSubmit={handleAddDebt}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label htmlFor="debt-name" className="block text-[11px] font-medium text-slate-500 mb-1">
                Loan / Card Name
              </label>
              <input
                id="debt-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Auto Loan, Visa Card"
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
              />
            </div>
            <div>
              <label htmlFor="debt-lender" className="block text-[11px] font-medium text-slate-500 mb-1">
                Lender / Bank
              </label>
              <input
                id="debt-lender"
                type="text"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="e.g. Meezan Bank"
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
              />
            </div>
            <div>
              <label htmlFor="debt-apr" className="block text-[11px] font-medium text-slate-500 mb-1">
                Annual Interest Rate (APR %)
              </label>
              <input
                id="debt-apr"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={apr}
                onChange={(e) => setApr(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label htmlFor="debt-orig" className="block text-[11px] font-medium text-slate-500 mb-1">
                Original Principal ({currency})
              </label>
              <input
                id="debt-orig"
                type="number"
                min="1"
                step="any"
                value={principalOriginal}
                onChange={(e) => setPrincipalOriginal(e.target.value)}
                placeholder="Optional (defaults to current)"
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="debt-cur" className="block text-[11px] font-medium text-slate-500 mb-1">
                Current Balance ({currency})
              </label>
              <input
                id="debt-cur"
                type="number"
                min="1"
                step="any"
                required
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                placeholder="0"
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono-num font-semibold"
              />
            </div>
            <div>
              <label htmlFor="debt-pay" className="block text-[11px] font-medium text-slate-500 mb-1">
                Monthly Payment ({currency})
              </label>
              <input
                id="debt-pay"
                type="number"
                min="1"
                step="any"
                required
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                placeholder="0"
                className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono-num font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[38px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              Save Debt
            </button>
          </div>
        </form>
      )}

      {debts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center space-y-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No active loans or debts tracked
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add financing, credit cards, or personal loans to calculate APR interest cost and payoff timelines.
          </p>
        </div>
      ) : (
        <>
          {/* Portfolio Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Remaining Debt</div>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono-num text-rose-600 dark:text-rose-400">
                {formatCurrency(summary.totalRemainingBalance, currency, false, discreetMode)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                {summary.overallRepaidPercent}% paid off
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Percent className="w-3 h-3" />
                <span>Weighted APR</span>
              </div>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {summary.weightedApr}%
              </div>
              <div className="mt-0.5 text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                ~{formatCurrency(summary.totalMonthlyInterest, currency, false, discreetMode)}/mo interest
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Monthly Commitment</div>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {formatCurrency(summary.totalMonthlyCommitment, currency, false, discreetMode)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                Projected interest:{' '}
                {Number.isFinite(summary.totalInterestRemaining)
                  ? formatCurrency(summary.totalInterestRemaining, currency, true, discreetMode)
                  : 'N/A'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Expected Payoff</span>
              </div>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono-num text-teal-700 dark:text-teal-400">
                {summary.latestPayoffDate}
              </div>
              <div className="mt-0.5 text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                {Number.isFinite(summary.maxMonthsToPayoff)
                  ? `${summary.maxMonthsToPayoff} months remaining`
                  : 'Adjust monthly payment'}
              </div>
            </div>
          </div>

          {/* Chart + Extra Monthly Accelerator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-7 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Repayment Progress by Loan
                </span>
                <span className="text-slate-500 dark:text-slate-400">Paid vs. Remaining</span>
              </div>
              <div className="h-44 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        discreetMode ? '••' : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={96}
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => formatCurrency(Number(val ?? 0), currency, false, discreetMode)}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="paid" name="Paid Principal" stackId="d" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="remaining" name="Remaining Balance" stackId="d" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <TrendingDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Payoff Accelerator Simulator</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Test adding extra principal per loan each month to see interest &amp; time saved.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">Extra monthly boost</span>
                  <strong className="font-mono-num text-teal-700 dark:text-teal-300">
                    +{formatCurrency(extraPayment, currency, false, discreetMode)}/mo
                  </strong>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[0, stepExtra, stepExtra * 2, stepExtra * 4].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setExtraPayment(preset)}
                      className={`h-[36px] px-2.5 rounded-lg text-xs font-mono-num font-medium border inline-flex items-center justify-center whitespace-nowrap transition-colors ${
                        extraPayment === preset
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset === 0 ? 'Base' : `+${formatCurrency(preset, currency, true, discreetMode)}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-3 text-xs">
                {extraPayment > 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 dark:text-slate-300">Interest saved across loans</span>
                    <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(summary.totalInterestSavedWithExtra, currency, false, discreetMode)}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    Select an extra monthly amount above to preview accelerated payoff dates.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Individual Debt Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.items.map((item) => {
              const { debt, repaidPercent, monthlyInterestCharge, principalPortionNextMonth, baseline, withExtra, monthsSaved } = item;
              const isPaying = payingDebtId === debt.id;

              return (
                <div
                  key={debt.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {debt.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {debt.lender} · {debt.annualInterestRate}% APR
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {debt.currentBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingDebtId(isPaying ? null : debt.id);
                            setPaymentAmount(String(Math.min(debt.currentBalance, debt.monthlyPayment)));
                          }}
                          className="h-[34px] px-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-medium hover:bg-teal-100 dark:hover:bg-teal-900/40 whitespace-nowrap"
                        >
                          Record Payment
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteDebt(debt.id)}
                        aria-label={`Delete debt ${debt.name}`}
                        className="h-[34px] w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono-num">
                      <span className="text-slate-500 dark:text-slate-400">
                        Balance {formatCurrency(debt.currentBalance, currency, false, discreetMode)} of{' '}
                        {formatCurrency(debt.principalOriginal, currency, false, discreetMode)}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {repaidPercent}% paid
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${repaidPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Amortization Details */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Monthly Plan</span>
                      <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(debt.monthlyPayment, currency, false, discreetMode)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Interest / Principal</span>
                      <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(monthlyInterestCharge, currency, true, discreetMode)} /{' '}
                        {formatCurrency(principalPortionNextMonth, currency, true, discreetMode)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Payoff Date</span>
                      <span className="font-mono-num font-semibold text-teal-700 dark:text-teal-400">
                        {extraPayment > 0 && monthsSaved > 0
                          ? `${withExtra.expectedPayoffDate} (-${monthsSaved}m)`
                          : baseline.expectedPayoffDate}
                      </span>
                    </div>
                  </div>

                  {/* Inline Payment Form */}
                  {isPaying && (
                    <form
                      onSubmit={handleRecordPayment}
                      className="pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end"
                    >
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">
                          Payment ({currency})
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          required
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">
                          Pay From Account
                        </label>
                        <select
                          value={paymentAccountId}
                          onChange={(e) => setPaymentAccountId(e.target.value)}
                          className="w-full h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs"
                        >
                          {activeData.accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="h-[38px] rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                      >
                        Apply Payment
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};
