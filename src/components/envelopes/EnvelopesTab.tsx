import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Briefcase,
  CheckCircle2,
  CheckSquare,
  ListChecks,
  Minus,
  Pencil,
  Play,
  Plus,
  ReceiptText,
  Square,
  Trash2,
} from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { EnvelopeGroup } from '../../types/finance';
import { computeBudgetMetrics } from '../../utils/budgetEngine';
import { formatCurrency, getTodayIso } from '../../utils/formatters';
import { BudgetWarningsBanner } from '../notifications/BudgetWarningsBanner';
import { MoveMoneyModal } from './MoveMoneyModal';
import { RecurringTransactionsSection } from './RecurringTransactionsSection';

const GROUP_META: { id: EnvelopeGroup; title: string; subtitle: string }[] = [
  { id: 'daily_living', title: 'Daily Living', subtitle: 'Variable everyday categories' },
  { id: 'fixed_expenses', title: 'Fixed Expenses', subtitle: 'Rent, utilities, and commitments' },
  { id: 'savings', title: 'Savings & Reserves', subtitle: 'Emergency buffer and long-term goals' },
];

export const EnvelopesTab: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const assignCashToEnvelope = useMizanStore((s) => s.assignCashToEnvelope);
  const setEnvelopeAssigned = useMizanStore((s) => s.setEnvelopeAssigned);
  const moveEnvelopeMoney = useMizanStore((s) => s.moveEnvelopeMoney);
  const createEnvelope = useMizanStore((s) => s.createEnvelope);
  const addTransaction = useMizanStore((s) => s.addTransaction);
  const applyPaydayTemplate = useMizanStore((s) => s.applyPaydayTemplate);
  const addPaydayTemplate = useMizanStore((s) => s.addPaydayTemplate);
  const deletePaydayTemplate = useMizanStore((s) => s.deletePaydayTemplate);
  const updateSideProject = useMizanStore((s) => s.updateSideProject);
  const toggleProjectChecklist = useMizanStore((s) => s.toggleProjectChecklist);
  const addChecklistItem = useMizanStore((s) => s.addChecklistItem);

  const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';

  const [planningHorizon, setPlanningHorizon] = useState<'current' | 'next'>('current');
  const referenceDate = useMemo(() => {
    const now = new Date();
    return planningHorizon === 'next'
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
      : now;
  }, [planningHorizon]);

  const metrics = useMemo(() => computeBudgetMetrics(activeData, referenceDate), [activeData, referenceDate]);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<EnvelopeGroup>('daily_living');
  const [newAssigned, setNewAssigned] = useState('');

  // Quick Daily Living expense state (always ready inside Daily Living section)
  const dailyLivingEnvelopes = useMemo(
    () => activeData.envelopes.filter((e) => e.group === 'daily_living'),
    [activeData.envelopes],
  );
  const [livingEnvId, setLivingEnvId] = useState(dailyLivingEnvelopes[0]?.id ?? '');
  const [livingAmount, setLivingAmount] = useState('');
  const [livingCause, setLivingCause] = useState('');
  const [livingAccountId, setLivingAccountId] = useState(activeData.accounts[0]?.id ?? '');
  const [livingToast, setLivingToast] = useState<string | null>(null);

  // Per-envelope inline custom spend (amount + cause) & custom budget editing
  const [loggingEnvId, setLoggingEnvId] = useState<string | null>(null);
  const [rowAmount, setRowAmount] = useState('');
  const [rowCause, setRowCause] = useState('');
  const [rowAccountId, setRowAccountId] = useState(activeData.accounts[0]?.id ?? '');

  const [editingBudgetEnvId, setEditingBudgetEnvId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState('');

  // Payday Template form state
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplType, setTplType] = useState<'income' | 'spend'>('spend');
  const [tplAmount, setTplAmount] = useState('');
  const [tplEnvId, setTplEnvId] = useState(activeData.envelopes[0]?.id ?? '');
  const [tplCadence, setTplCadence] = useState('Monthly · 1st');
  const [templateToast, setTemplateToast] = useState<string | null>(null);

  // Next month checklist input
  const [newChecklistText, setNewChecklistText] = useState('');

  useEffect(() => {
    setTplEnvId((prev) =>
      activeData.envelopes.some((e) => e.id === prev) ? prev : activeData.envelopes[0]?.id ?? '',
    );
    setLivingEnvId((prev) =>
      dailyLivingEnvelopes.some((e) => e.id === prev) ? prev : dailyLivingEnvelopes[0]?.id ?? '',
    );
    setLivingAccountId((prev) =>
      activeData.accounts.some((a) => a.id === prev) ? prev : activeData.accounts[0]?.id ?? '',
    );
    setRowAccountId((prev) =>
      activeData.accounts.some((a) => a.id === prev) ? prev : activeData.accounts[0]?.id ?? '',
    );
  }, [activeProfileId, activeData.envelopes, activeData.accounts, dailyLivingEnvelopes]);

  const stepSize = currency === 'PKR' ? 1000 : 50;
  const templates = activeData.paydayTemplates ?? [];
  const sideProject = activeData.sideProject;
  const showSideHustle = activeData.preferences?.enabledTrackers.sideHustlePnl ?? true;

  const handleCreateEnvelope = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createEnvelope({
      name: newName.trim(),
      group: newGroup,
      assigned: Math.max(0, Number(newAssigned) || 0),
      dailyHabitTarget: newGroup === 'daily_living' ? (currency === 'PKR' ? 500 : 25) : undefined,
      isEssential: newGroup !== 'savings',
    });
    setNewName('');
    setNewAssigned('');
    setCreating(false);
  };

  const handleLogDailyLiving = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(livingAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const targetEnv = dailyLivingEnvelopes.find((env) => env.id === livingEnvId) ?? dailyLivingEnvelopes[0];
    const causeText = livingCause.trim() || targetEnv?.name || 'Daily Living Expense';
    addTransaction({
      type: 'spend',
      amount: numeric,
      date: getTodayIso(),
      merchant: causeText,
      accountId: livingAccountId || activeData.accounts[0]?.id || '',
      splits: targetEnv ? [{ id: `dl-${Date.now()}`, envelopeId: targetEnv.id, amount: numeric }] : [],
      tags: ['daily-living'],
    });
    setLivingAmount('');
    setLivingCause('');
    setLivingToast(`Logged ${formatCurrency(numeric, currency, false, discreetMode)} for "${causeText}".`);
    window.setTimeout(() => setLivingToast(null), 3500);
  };

  const handleLogEnvelopeExpense = (e: React.FormEvent, envId: string, envName: string) => {
    e.preventDefault();
    const numeric = Number(rowAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const causeText = rowCause.trim() || envName;
    addTransaction({
      type: 'spend',
      amount: numeric,
      date: getTodayIso(),
      merchant: causeText,
      accountId: rowAccountId || activeData.accounts[0]?.id || '',
      splits: [{ id: `env-sp-${Date.now()}`, envelopeId: envId, amount: numeric }],
      tags: ['envelope-log'],
    });
    setRowAmount('');
    setRowCause('');
    setLoggingEnvId(null);
  };

  const handleSaveCustomBudget = (e: React.FormEvent, envId: string) => {
    e.preventDefault();
    const numeric = Number(budgetDraft);
    if (!Number.isFinite(numeric) || numeric < 0) return;
    setEnvelopeAssigned(envId, numeric);
    setEditingBudgetEnvId(null);
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(tplAmount);
    if (!tplName.trim() || !Number.isFinite(amt) || amt <= 0) return;
    addPaydayTemplate({
      name: tplName.trim(),
      type: tplType,
      amount: amt,
      accountId: activeData.accounts[0]?.id ?? '',
      envelopeId: tplType === 'spend' ? tplEnvId : undefined,
      cadence: tplCadence.trim() || 'Monthly',
    });
    setTplName('');
    setTplAmount('');
    setAddingTemplate(false);
  };

  const handleApplyTemplate = (id: string, name: string) => {
    applyPaydayTemplate(id);
    setTemplateToast(`Applied "${name}" to today's ledger.`);
    window.setTimeout(() => setTemplateToast(null), 3500);
  };

  const breakEvenPct =
    sideProject && sideProject.invested > 0
      ? Math.min(200, Math.round((sideProject.revenue / sideProject.invested) * 100))
      : sideProject && sideProject.revenue > 0
        ? 100
        : 0;

  return (
    <motion.div
      key={`envelopes-${activeProfileId}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header + Month Scope Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Zero-Based Envelopes
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Give every unit of cash a clear job before spending
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Planning month"
            className="inline-flex h-[40px] items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
          >
            <button
              type="button"
              onClick={() => setPlanningHorizon('current')}
              className={`h-[30px] px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors ${
                planningHorizon === 'current'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => setPlanningHorizon('next')}
              className={`h-[30px] px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors ${
                planningHorizon === 'next'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Next Month
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMoveTargetId(undefined);
              setMoveOpen(true);
            }}
            className="h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <ArrowRightLeft className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Move Money</span>
          </button>

          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="h-[40px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Envelope</span>
          </button>
        </div>
      </div>

      {/* Unassigned Cash & Allocation Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`rounded-2xl border p-5 ${
            metrics.unassignedCash < 0
              ? 'border-rose-500/40 bg-rose-50/60 dark:bg-rose-950/20'
              : 'border-teal-600/30 dark:border-teal-500/30 bg-white dark:bg-slate-900/70'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Ready to Assign
          </div>
          <div
            className={`mt-1.5 text-2xl font-bold font-mono-num ${
              metrics.unassignedCash < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-teal-700 dark:text-teal-400'
            }`}
          >
            {formatCurrency(metrics.unassignedCash, currency, false, discreetMode)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {metrics.unassignedCash < 0 ? 'Over-allocated — reduce an envelope' : 'Available to assign to envelopes'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Assigned
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatCurrency(metrics.totalAssigned, currency, false, discreetMode)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {activeData.envelopes.length} envelopes
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Spent ({planningHorizon === 'next' ? 'Next Month' : 'This Month'})
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatCurrency(metrics.monthlySpend, currency, false, discreetMode)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {metrics.overspentEnvelopes.length > 0
              ? `${metrics.overspentEnvelopes.length} overspent`
              : metrics.budgetAlerts.length > 0
                ? `${metrics.budgetAlerts.length} near or at limit`
                : 'All envelopes within limits'}
          </div>
        </div>
      </div>

      {/* Real-Time Budget Warnings Banner (80% / 100%) */}
      <BudgetWarningsBanner
        alerts={metrics.budgetAlerts}
        currency={currency}
        actionLabel="Move Money"
        onAction={() => {
          setMoveTargetId(undefined);
          setMoveOpen(true);
        }}
      />

      {/* Inline New Envelope Form */}
      {creating && (
        <form
          onSubmit={handleCreateEnvelope}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label htmlFor="env-name" className="block text-xs font-medium text-slate-500 mb-1.5">
              Envelope Name
            </label>
            <input
              id="env-name"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Health & Fitness"
              className="w-full h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="env-group" className="block text-xs font-medium text-slate-500 mb-1.5">
              Group
            </label>
            <select
              id="env-group"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value as EnvelopeGroup)}
              className="w-full h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
            >
              <option value="daily_living">Daily Living</option>
              <option value="fixed_expenses">Fixed Expenses</option>
              <option value="savings">Savings & Reserves</option>
            </select>
          </div>
          <div>
            <label htmlFor="env-assigned" className="block text-xs font-medium text-slate-500 mb-1.5">
              Initial Assignment ({currency})
            </label>
            <input
              id="env-assigned"
              type="number"
              min="0"
              value={newAssigned}
              onChange={(e) => setNewAssigned(e.target.value)}
              placeholder="0"
              className="w-full h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 h-[42px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Automated Recurring Bills & Salaries */}
      <RecurringTransactionsSection />

      {/* Payday & Bill Templates */}
      <section
        aria-label="Payday and bill templates"
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Payday & Recurring Bill Templates
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apply predictable salary deposits or monthly fixed bills in one tap
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddingTemplate((v) => !v)}
            className="h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-teal-700 dark:text-teal-300 inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Template</span>
          </button>
        </div>

        {templateToast && (
          <div role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{templateToast}</span>
          </div>
        )}

        {addingTemplate && (
          <form onSubmit={handleAddTemplate} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 items-end">
            <input
              type="text"
              required
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Template name"
              aria-label="Template name"
              className="h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
            />
            <select
              value={tplType}
              onChange={(e) => setTplType(e.target.value as 'income' | 'spend')}
              aria-label="Template type"
              className="h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
            >
              <option value="spend">Fixed Bill (Spend)</option>
              <option value="income">Payday (Income)</option>
            </select>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={tplAmount}
              onChange={(e) => setTplAmount(e.target.value)}
              placeholder={`Amount (${currency})`}
              aria-label="Template amount"
              className="h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono-num"
            />
            {tplType === 'spend' ? (
              <select
                value={tplEnvId}
                onChange={(e) => setTplEnvId(e.target.value)}
                aria-label="Template envelope"
                className="h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
              >
                {activeData.envelopes.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={tplCadence}
                onChange={(e) => setTplCadence(e.target.value)}
                placeholder="Cadence (e.g. 1st)"
                aria-label="Template cadence"
                className="h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
              />
            )}
            <button
              type="submit"
              className="h-[38px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              Save Template
            </button>
          </form>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {templates.map((tpl) => (
            <div key={tpl.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {tpl.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tpl.cadence}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <span className="text-sm font-mono-num font-semibold text-slate-900 dark:text-slate-100 sm:min-w-[110px] sm:text-right">
                  {formatCurrency(tpl.amount, currency, false, discreetMode)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(tpl.id, tpl.name)}
                    className="h-[36px] min-w-[104px] px-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-900/40 whitespace-nowrap"
                  >
                    <Play className="w-3 h-3 shrink-0" />
                    <span>Apply Today</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePaydayTemplate(tpl.id)}
                    aria-label={`Delete ${tpl.name} template`}
                    className="h-[36px] w-[36px] flex items-center justify-center rounded-lg border border-transparent text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Envelope Groups */}
      <div className="space-y-6">
        {GROUP_META.map((group) => {
          const items = metrics.envelopeSummaries.filter((s) => s.envelope.group === group.id);
          if (items.length === 0) return null;

          return (
            <section key={group.id} aria-label={group.title} className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {group.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{group.subtitle}</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                {/* Direct Quick Living Expense Entry (type arbitrary amount & cause inside Daily Living) */}
                {group.id === 'daily_living' && dailyLivingEnvelopes.length > 0 && (
                  <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/30 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                        <ReceiptText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Quick Daily Living Expense (Type Amount &amp; Cause)</span>
                      </div>
                      {livingToast && (
                        <span role="status" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {livingToast}
                        </span>
                      )}
                    </div>

                    <form
                      onSubmit={handleLogDailyLiving}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                    >
                      <div className="sm:col-span-3">
                        <label htmlFor="living-env" className="block text-[11px] font-medium text-slate-500 mb-1">
                          Category
                        </label>
                        <select
                          id="living-env"
                          value={livingEnvId}
                          onChange={(e) => setLivingEnvId(e.target.value)}
                          className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                        >
                          {dailyLivingEnvelopes.map((env) => (
                            <option key={env.id} value={env.id}>
                              {env.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="living-amount" className="block text-[11px] font-medium text-slate-500 mb-1">
                          Amount ({currency})
                        </label>
                        <input
                          id="living-amount"
                          type="number"
                          min="1"
                          step="any"
                          required
                          value={livingAmount}
                          onChange={(e) => setLivingAmount(e.target.value)}
                          placeholder="0"
                          className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-mono-num font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="living-cause" className="block text-[11px] font-medium text-slate-500 mb-1">
                          Cause / Reason
                        </label>
                        <input
                          id="living-cause"
                          type="text"
                          required
                          value={livingCause}
                          onChange={(e) => setLivingCause(e.target.value)}
                          placeholder="e.g. Groceries, Fuel, Chai, Pharmacy"
                          className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3 flex gap-2 items-end">
                        <div className="flex-1 min-w-0">
                          <label htmlFor="living-acc" className="block text-[11px] font-medium text-slate-500 mb-1">
                            Paid From
                          </label>
                          <select
                            id="living-acc"
                            value={livingAccountId}
                            onChange={(e) => setLivingAccountId(e.target.value)}
                            className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs truncate"
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
                          className="h-[40px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                        >
                          Log Spend
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {items.map((item) => {
                  const { envelope, spent, remaining, percentUsed, isOverspent } = item;
                  const barWidth = Math.min(100, Math.max(0, percentUsed));
                  const isLimitReached = !isOverspent && percentUsed >= 100;
                  const isNearLimit = !isOverspent && !isLimitReached && percentUsed >= 80;
                  const barTone =
                    isOverspent || isLimitReached
                      ? 'bg-rose-500'
                      : isNearLimit
                        ? 'bg-amber-500'
                        : 'bg-teal-500';
                  const isLoggingRow = loggingEnvId === envelope.id;
                  const isEditingBudget = editingBudgetEnvId === envelope.id;

                  return (
                    <div key={envelope.id} className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {envelope.name}
                            </span>
                            {isOverspent && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Overspent
                              </span>
                            )}
                            {isLimitReached && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Limit Reached (100%)
                              </span>
                            )}
                            {isNearLimit && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Near Limit ({percentUsed}%)
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                            Assigned {formatCurrency(envelope.assigned, currency, false, discreetMode)} · Spent{' '}
                            {formatCurrency(spent, currency, false, discreetMode)} ({percentUsed}%)
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
                          <div className="text-left sm:text-right sm:min-w-[118px]">
                            <div
                              className={`text-sm font-bold font-mono-num whitespace-nowrap ${
                                isOverspent
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isOverspent
                                ? `-${formatCurrency(Math.abs(remaining), currency, false, discreetMode)}`
                                : `${formatCurrency(remaining, currency, false, discreetMode)} left`}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBudgetEnvId(null);
                                setLoggingEnvId(isLoggingRow ? null : envelope.id);
                                setRowAmount('');
                                setRowCause('');
                              }}
                              aria-label={`Log spend in ${envelope.name}`}
                              className={`h-[36px] px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                                isLoggingRow
                                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <ReceiptText className="w-3.5 h-3.5 shrink-0" />
                              <span>Log</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setLoggingEnvId(null);
                                setEditingBudgetEnvId(isEditingBudget ? null : envelope.id);
                                setBudgetDraft(String(envelope.assigned));
                              }}
                              aria-label={`Set exact budget for ${envelope.name}`}
                              title="Type custom budget amount"
                              className={`h-[36px] w-[36px] flex items-center justify-center rounded-lg border transition-colors ${
                                isEditingBudget
                                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => assignCashToEnvelope(envelope.id, -stepSize)}
                              aria-label={`Decrease ${envelope.name} budget`}
                              className="h-[36px] w-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => assignCashToEnvelope(envelope.id, stepSize)}
                              aria-label={`Increase ${envelope.name} budget`}
                              className="h-[36px] w-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>

                            {isOverspent && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMoveTargetId(envelope.id);
                                  setMoveOpen(true);
                                }}
                                className="h-[36px] px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium whitespace-nowrap"
                              >
                                Cover
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barTone}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>

                      {/* Inline per-envelope custom spend form (Amount + Cause) */}
                      {isLoggingRow && (
                        <form
                          onSubmit={(e) => handleLogEnvelopeExpense(e, envelope.id, envelope.name)}
                          className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                        >
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Amount ({currency})
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              required
                              autoFocus
                              value={rowAmount}
                              onChange={(e) => setRowAmount(e.target.value)}
                              placeholder="0"
                              aria-label={`Expense amount for ${envelope.name}`}
                              className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono-num font-semibold"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Cause / Reason
                            </label>
                            <input
                              type="text"
                              required
                              value={rowCause}
                              onChange={(e) => setRowCause(e.target.value)}
                              placeholder={`e.g. ${envelope.name} item or note`}
                              aria-label={`Expense cause for ${envelope.name}`}
                              className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Paid From
                            </label>
                            <select
                              value={rowAccountId}
                              onChange={(e) => setRowAccountId(e.target.value)}
                              aria-label={`Account for ${envelope.name}`}
                              className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
                            >
                              {activeData.accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 flex gap-1.5">
                            <button
                              type="submit"
                              className="flex-1 h-[38px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setLoggingEnvId(null)}
                              className="h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Inline custom Assigned budget input */}
                      {isEditingBudget && (
                        <form
                          onSubmit={(e) => handleSaveCustomBudget(e, envelope.id)}
                          className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-end gap-2"
                        >
                          <div className="flex-1 min-w-[160px]">
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Custom Assigned Budget for {envelope.name} ({currency})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              autoFocus
                              value={budgetDraft}
                              onChange={(e) => setBudgetDraft(e.target.value)}
                              aria-label={`Custom budget for ${envelope.name}`}
                              className="w-full h-[38px] rounded-xl border border-teal-500 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono-num font-semibold"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="submit"
                              className="h-[38px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                            >
                              Update Budget
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBudgetEnvId(null)}
                              className="h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Side Project P&L + Next-Month Action Checklists & Rule 3 Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {showSideHustle && sideProject && (
          <section
            aria-label="Side project P&L and guardrails"
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {sideProject.name}
                </h2>
              </div>
              <span className="text-xs font-mono-num text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap shrink-0">
                {breakEvenPct}% break-even
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label
                  htmlFor="side-reserve"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-none whitespace-nowrap truncate"
                >
                  Planned Reserve
                </label>
                <input
                  id="side-reserve"
                  type="number"
                  min="0"
                  aria-label="Side project planned reserve"
                  value={sideProject.plannedReserve}
                  onChange={(e) => updateSideProject({ plannedReserve: Number(e.target.value) || 0 })}
                  className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num font-semibold"
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label
                  htmlFor="side-invested"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-none whitespace-nowrap truncate"
                >
                  Invested
                </label>
                <input
                  id="side-invested"
                  type="number"
                  min="0"
                  aria-label="Side project invested"
                  value={sideProject.invested}
                  onChange={(e) => updateSideProject({ invested: Number(e.target.value) || 0 })}
                  className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num font-semibold"
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label
                  htmlFor="side-revenue"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-none whitespace-nowrap truncate"
                >
                  Revenue
                </label>
                <input
                  id="side-revenue"
                  type="number"
                  min="0"
                  aria-label="Side project revenue"
                  value={sideProject.revenue}
                  onChange={(e) => updateSideProject({ revenue: Number(e.target.value) || 0 })}
                  className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num font-semibold"
                />
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${Math.min(100, breakEvenPct)}%` }}
              />
            </div>

            {sideProject.guardrails.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Guardrail Checklist
                </div>
                {sideProject.guardrails.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleProjectChecklist('guardrails', item.id)}
                    className="w-full text-left flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 py-1"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className={item.checked ? 'line-through text-slate-400' : ''}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section
          aria-label="Roll with the punches and next-month checklist"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Roll-With-Punches & Next-Month Checklist
            </h2>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              Rule 3 Priority Order (When Covering Overspend):
            </div>
            <div>1. Discretionary Allowances → 2. Savings Buffer → 3. Unassigned Cash Reserve</div>
          </div>

          <div className="space-y-2">
            {(sideProject?.nextMonthChecklist ?? []).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleProjectChecklist('nextMonthChecklist', item.id)}
                className="w-full text-left flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 py-1"
              >
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className={item.checked ? 'line-through text-slate-400' : ''}>{item.label}</span>
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newChecklistText.trim()) return;
              addChecklistItem('nextMonthChecklist', newChecklistText);
              setNewChecklistText('');
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              placeholder="Add next-month action item..."
              aria-label="Add next-month checklist item"
              className="flex-1 h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
            />
            <button
              type="submit"
              className="h-[38px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium whitespace-nowrap"
            >
              Add
            </button>
          </form>
        </section>
      </div>

      <MoveMoneyModal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        summaries={metrics.envelopeSummaries}
        currency={currency}
        initialToEnvelopeId={moveTargetId}
        onMove={moveEnvelopeMoney}
      />
    </motion.div>
  );
};

