import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Plus, RotateCcw, Sparkles, X, Zap } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { suggestCategorization } from '../../utils/categorizer';
import { formatCurrency, getTodayIso } from '../../utils/formatters';

interface LastLoggedNotice {
  txId: string;
  label: string;
  amount: number;
  envelopeName: string;
}

export const FloatingQuickAdd: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const entrySheetOpen = useMizanStore((s) => s.entrySheetOpen);
  const reportModalOpen = useMizanStore((s) => s.reportModalOpen);
  const addTransaction = useMizanStore((s) => s.addTransaction);
  const deleteTransaction = useMizanStore((s) => s.deleteTransaction);
  const openEntrySheet = useMizanStore((s) => s.openEntrySheet);

  const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
  const presets = activeData.quickPresets ?? [];

  const preferredEnvelope =
    activeData.envelopes.find((e) => e.group === 'daily_living') ?? activeData.envelopes[0];

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [item, setItem] = useState('');
  const [envelopeId, setEnvelopeId] = useState(preferredEnvelope?.id ?? '');
  const [accountId, setAccountId] = useState(activeData.accounts[0]?.id ?? '');
  const [autoMatchedName, setAutoMatchedName] = useState<string | null>(null);
  const [manualLock, setManualLock] = useState(false);
  const [notice, setNotice] = useState<LastLoggedNotice | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  // Sync defaults when profile or accounts/envelopes change
  useEffect(() => {
    setEnvelopeId((prev) =>
      activeData.envelopes.some((e) => e.id === prev) ? prev : preferredEnvelope?.id ?? '',
    );
    setAccountId((prev) =>
      activeData.accounts.some((a) => a.id === prev) ? prev : activeData.accounts[0]?.id ?? '',
    );
  }, [activeProfileId, activeData.envelopes, activeData.accounts, preferredEnvelope?.id]);

  // Auto-focus amount input whenever Quick-Add popover opens
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      amountInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(id);
  }, [open]);

  // Close popover on Escape or outside click (no blocking backdrop needed)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  // Auto-dismiss confirmation notice after 6s
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Hide FAB when full modal dialogs are open
  if (entrySheetOpen || reportModalOpen) {
    return null;
  }

  const handleItemChange = (val: string) => {
    setItem(val);
    if (manualLock) return;
    const match = suggestCategorization(val, activeData.envelopes);
    if (match.matchedRule && match.envelopeId) {
      const env = activeData.envelopes.find((e) => e.id === match.envelopeId);
      setEnvelopeId(match.envelopeId);
      setAutoMatchedName(env?.name ?? null);
    } else {
      setAutoMatchedName(null);
    }
  };

  const handleInstantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const targetEnv = activeData.envelopes.find((env) => env.id === envelopeId);
    const label = item.trim() || targetEnv?.name || 'Quick Expense';
    const created = addTransaction({
      type: 'spend',
      amount: numeric,
      date: getTodayIso(),
      merchant: label,
      accountId: accountId || activeData.accounts[0]?.id || '',
      splits: envelopeId ? [{ id: `fab-${Date.now()}`, envelopeId, amount: numeric }] : [],
      tags: ['quick-add'],
    });
    setNotice({
      txId: created.id,
      label,
      amount: numeric,
      envelopeName: targetEnv?.name ?? 'General',
    });
    setAmount('');
    setItem('');
    setAutoMatchedName(null);
    setManualLock(false);
    amountInputRef.current?.focus();
  };

  const handlePresetTap = (preset: NonNullable<typeof activeData.quickPresets>[number]) => {
    const targetEnv = activeData.envelopes.find((env) => env.id === preset.envelopeId);
    const created = addTransaction({
      type: 'spend',
      amount: preset.amount,
      date: getTodayIso(),
      merchant: preset.label,
      accountId: preset.accountId || accountId || activeData.accounts[0]?.id || '',
      splits: preset.envelopeId
        ? [{ id: `fab-pre-${Date.now()}`, envelopeId: preset.envelopeId, amount: preset.amount }]
        : [],
      tags: ['quick-add', 'preset'],
    });
    setNotice({
      txId: created.id,
      label: preset.label,
      amount: preset.amount,
      envelopeName: targetEnv?.name ?? 'General',
    });
  };

  const handleUndo = () => {
    if (!notice) return;
    deleteTransaction(notice.txId);
    setNotice(null);
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-[76px] lg:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end"
    >
      <AnimatePresence>
        {open && (
          <motion.section
            id="floating-quick-add-panel"
            role="dialog"
            aria-label="Quick-add single expense"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 w-[min(calc(100vw-2rem),360px)] rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
                    Quick-Add Expense
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                    Instant single-item log for today
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openEntrySheet('spend');
                  }}
                  className="h-8 px-2 rounded-lg text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 whitespace-nowrap"
                >
                  Full form
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close quick-add panel"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Instant 1-Tap Common Items */}
            {presets.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  One-Tap Common Items
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {presets.slice(0, 6).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetTap(preset)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 hover:border-teal-500 hover:bg-teal-50/70 dark:hover:bg-teal-950/40 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <span>{preset.label}</span>
                      <span className="font-mono-num text-[11px] text-teal-600 dark:text-teal-400">
                        {formatCurrency(preset.amount, currency, false, discreetMode)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Instant Single-Item Form */}
            <form onSubmit={handleInstantSubmit} className="space-y-2.5">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label
                    htmlFor="fab-quick-amount"
                    className="min-h-[18px] flex items-center text-[11px] font-medium text-slate-500 mb-1 whitespace-nowrap"
                  >
                    Amount ({currency})
                  </label>
                  <input
                    ref={amountInputRef}
                    id="fab-quick-amount"
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="col-span-7">
                  <div className="min-h-[18px] flex items-center justify-between gap-1 mb-1">
                    <label
                      htmlFor="fab-quick-item"
                      className="text-[11px] font-medium text-slate-500 whitespace-nowrap"
                    >
                      Item / Cause
                    </label>
                    {autoMatchedName && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-400 truncate">
                        <Sparkles className="w-2.5 h-2.5 shrink-0" />
                        {autoMatchedName}
                      </span>
                    )}
                  </div>
                  <input
                    id="fab-quick-item"
                    type="text"
                    value={item}
                    onChange={(e) => handleItemChange(e.target.value)}
                    placeholder="Coffee, Chai, Fuel..."
                    className="w-full h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="fab-quick-envelope"
                    className="min-h-[18px] flex items-center text-[11px] font-medium text-slate-500 mb-1 whitespace-nowrap"
                  >
                    Envelope
                  </label>
                  <select
                    id="fab-quick-envelope"
                    value={envelopeId}
                    onChange={(e) => {
                      setManualLock(true);
                      setAutoMatchedName(null);
                      setEnvelopeId(e.target.value);
                    }}
                    className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {activeData.envelopes.map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="fab-quick-account"
                    className="min-h-[18px] flex items-center text-[11px] font-medium text-slate-500 mb-1 whitespace-nowrap"
                  >
                    Paid From
                  </label>
                  <select
                    id="fab-quick-account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {activeData.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-[40px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>Log Expense</span>
              </button>
            </form>

            {/* Confirmation & Instant Undo */}
            {notice && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Logged{' '}
                    <strong className="font-mono-num">
                      {formatCurrency(notice.amount, currency, false, discreetMode)}
                    </strong>{' '}
                    · {notice.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUndo}
                  className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Floating Quick-Add Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="floating-quick-add-panel"
        aria-label={open ? 'Close Quick-Add expense drawer' : 'Quick-Add instant expense'}
        className={`h-12 px-4 rounded-2xl text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500 whitespace-nowrap ${
          open
            ? 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-slate-950/20'
            : 'bg-teal-600 hover:bg-teal-700 shadow-teal-950/25 dark:shadow-black/50'
        }`}
      >
        {open ? (
          <>
            <X className="w-4 h-4 shrink-0" />
            <span>Close</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 shrink-0" />
            <span>Quick-Add</span>
          </>
        )}
      </button>
    </div>
  );
};
