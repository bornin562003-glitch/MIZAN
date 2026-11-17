import React, { useEffect, useState } from 'react';
import { Plus, Sparkles, X, Zap } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { suggestCategorization } from '../../utils/categorizer';
import { formatCurrency, getTodayIso } from '../../utils/formatters';

export const QuickSpendCard: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const addTransaction = useMizanStore((s) => s.addTransaction);
  const addQuickPreset = useMizanStore((s) => s.addQuickPreset);
  const deleteQuickPreset = useMizanStore((s) => s.deleteQuickPreset);

  const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
  const presets = activeData.quickPresets ?? [];

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [envelopeId, setEnvelopeId] = useState(activeData.envelopes[0]?.id ?? '');
  const [accountId, setAccountId] = useState(activeData.accounts[0]?.id ?? '');
  const [autoMatchedName, setAutoMatchedName] = useState<string | null>(null);
  const [manualLock, setManualLock] = useState(false);

  const [addingPreset, setAddingPreset] = useState(false);
  const [presetLabel, setPresetLabel] = useState('');
  const [presetAmount, setPresetAmount] = useState('');
  const [presetEnvId, setPresetEnvId] = useState(activeData.envelopes[0]?.id ?? '');

  useEffect(() => {
    setEnvelopeId((prev) =>
      activeData.envelopes.some((e) => e.id === prev) ? prev : activeData.envelopes[0]?.id ?? '',
    );
    setAccountId((prev) =>
      activeData.accounts.some((a) => a.id === prev) ? prev : activeData.accounts[0]?.id ?? '',
    );
    setPresetEnvId((prev) =>
      activeData.envelopes.some((e) => e.id === prev) ? prev : activeData.envelopes[0]?.id ?? '',
    );
  }, [activeProfileId, activeData.envelopes, activeData.accounts]);

  const todayIso = getTodayIso();
  const todaySpendTotal = activeData.transactions
    .filter((tx) => tx.type === 'spend' && tx.date === todayIso)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const handleMerchantInput = (val: string) => {
    setMerchant(val);
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

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const label = merchant.trim() || activeData.envelopes.find((env) => env.id === envelopeId)?.name || 'Quick Spend';
    addTransaction({
      type: 'spend',
      amount: numeric,
      date: todayIso,
      merchant: label,
      accountId: accountId || activeData.accounts[0]?.id || '',
      splits: envelopeId ? [{ id: `qs-${Date.now()}`, envelopeId, amount: numeric }] : [],
      tags: ['quick-log'],
    });
    setAmount('');
    setMerchant('');
    setAutoMatchedName(null);
    setManualLock(false);
  };

  const handleTapPreset = (preset: NonNullable<typeof activeData.quickPresets>[number]) => {
    addTransaction({
      type: 'spend',
      amount: preset.amount,
      date: todayIso,
      merchant: preset.label,
      accountId: preset.accountId || accountId || activeData.accounts[0]?.id || '',
      splits: preset.envelopeId
        ? [{ id: `pre-sp-${Date.now()}`, envelopeId: preset.envelopeId, amount: preset.amount }]
        : [],
      tags: ['preset'],
    });
  };

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(presetAmount);
    if (!presetLabel.trim() || !Number.isFinite(amt) || amt <= 0) return;
    addQuickPreset({
      label: presetLabel.trim(),
      amount: amt,
      envelopeId: presetEnvId || activeData.envelopes[0]?.id || '',
      accountId: accountId || activeData.accounts[0]?.id,
    });
    setPresetLabel('');
    setPresetAmount('');
    setAddingPreset(false);
  };

  return (
    <section
      aria-label="Quick daily spend log"
      className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Quick Daily Spending Log
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            One-tap everyday presets or instant spend entry without leaving Overview
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Today:{' '}
            <strong className="font-mono-num text-slate-900 dark:text-slate-100">
              {formatCurrency(todaySpendTotal, currency, false, discreetMode)}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setAddingPreset((v) => !v)}
            className="h-[36px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-teal-700 dark:text-teal-300 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add Preset</span>
          </button>
        </div>
      </div>

      {/* One-Tap Presets Strip */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <div key={preset.id} className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 overflow-hidden">
              <button
                type="button"
                onClick={() => handleTapPreset(preset)}
                className="min-h-[36px] pl-2.5 pr-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Zap className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{preset.label}</span>
                <span className="font-mono-num text-slate-500 dark:text-slate-400">
                  {formatCurrency(preset.amount, currency, false, discreetMode)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => deleteQuickPreset(preset.id)}
                aria-label={`Remove ${preset.label} preset`}
                className="min-h-[36px] px-1.5 text-slate-400 hover:text-rose-500 border-l border-slate-200 dark:border-slate-700/80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Optional Add Preset Form */}
      {addingPreset && (
        <form
          onSubmit={handleCreatePreset}
          className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80"
        >
          <input
            type="text"
            required
            value={presetLabel}
            onChange={(e) => setPresetLabel(e.target.value)}
            placeholder="Preset label (e.g. Milk)"
            aria-label="Preset label"
            className="min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
          />
          <input
            type="number"
            min="1"
            step="any"
            required
            value={presetAmount}
            onChange={(e) => setPresetAmount(e.target.value)}
            placeholder={`Amount (${currency})`}
            aria-label="Preset amount"
            className="min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono-num"
          />
          <select
            aria-label="Preset envelope"
            value={presetEnvId}
            onChange={(e) => setPresetEnvId(e.target.value)}
            className="min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
          >
            {activeData.envelopes.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button
              type="submit"
              className="flex-1 min-h-[38px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
            >
              Save Preset
            </button>
            <button
              type="button"
              onClick={() => setAddingPreset(false)}
              className="min-h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Inline Fast Spend Bar */}
      <form onSubmit={handleQuickSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
        <div className="sm:col-span-3">
          <label
            htmlFor="quick-spend-amount"
            className="min-h-[20px] flex items-center text-[11px] font-medium text-slate-500 mb-1 whitespace-nowrap"
          >
            Amount ({currency})
          </label>
          <input
            id="quick-spend-amount"
            type="number"
            min="1"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num font-semibold"
          />
        </div>

        <div className="sm:col-span-4">
          <div className="min-h-[20px] flex items-center justify-between gap-2 mb-1">
            <label htmlFor="quick-spend-merchant" className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
              Item / Merchant
            </label>
            {autoMatchedName && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-600 dark:text-teal-400 truncate">
                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                {autoMatchedName}
              </span>
            )}
          </div>
          <input
            id="quick-spend-merchant"
            type="text"
            value={merchant}
            onChange={(e) => handleMerchantInput(e.target.value)}
            placeholder="e.g. Fresh Bakery, Shell"
            className="w-full h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="quick-spend-env"
            className="min-h-[20px] flex items-center text-[11px] font-medium text-slate-500 mb-1 whitespace-nowrap"
          >
            Envelope
          </label>
          <select
            id="quick-spend-env"
            value={envelopeId}
            onChange={(e) => {
              setManualLock(true);
              setAutoMatchedName(null);
              setEnvelopeId(e.target.value);
            }}
            className="w-full h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
          >
            {activeData.envelopes.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 flex gap-2 items-end">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="quick-spend-acc"
              className="min-h-[20px] flex items-center text-[11px] font-medium text-slate-500 mb-1 whitespace-nowrap"
            >
              Paid From
            </label>
            <select
              id="quick-spend-acc"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs truncate"
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
            className="h-[42px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            Log
          </button>
        </div>
      </form>
    </section>
  );
};
