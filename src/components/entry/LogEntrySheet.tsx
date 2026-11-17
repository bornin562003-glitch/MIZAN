import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, ScanLine, Sparkles, Split, Trash2, X } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { TransactionSplit, TransactionType } from '../../types/finance';
import { ParsedOcrItem, suggestCategorization, validateSplits } from '../../utils/categorizer';
import { formatCurrency, getTodayIso } from '../../utils/formatters';
import { OcrScannerModal } from './OcrScannerModal';

const SUGGESTED_TAGS = ['essential', 'work', 'commute', 'dining', 'groceries', 'family'];

export const LogEntrySheet: React.FC = () => {
  const open = useMizanStore((s) => s.entrySheetOpen);
  const initialType = useMizanStore((s) => s.entryInitialType);
  const entryInitialDate = useMizanStore((s) => s.entryInitialDate);
  const editingTransaction = useMizanStore((s) => s.editingTransaction);
  const closeEntrySheet = useMizanStore((s) => s.closeEntrySheet);
  const activeData = useMizanStore((s) => s.activeData);
  const addTransaction = useMizanStore((s) => s.addTransaction);
  const updateTransaction = useMizanStore((s) => s.updateTransaction);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);

  const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';

  const [type, setType] = useState<TransactionType>(initialType);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayIso());
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState<TransactionSplit[]>([]);
  const [autoMatchedEnvName, setAutoMatchedEnvName] = useState<string | null>(null);
  const [manualCategoryLock, setManualCategoryLock] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaultAcc = activeData.accounts[0]?.id ?? '';
    const secondAcc = activeData.accounts[1]?.id ?? defaultAcc;
    const defaultEnv = activeData.envelopes[0]?.id ?? '';

    if (editingTransaction) {
      setType(editingTransaction.type);
      setMerchant(editingTransaction.merchant);
      setAmount(String(editingTransaction.amount));
      setDate(editingTransaction.date);
      setAccountId(editingTransaction.accountId || defaultAcc);
      setToAccountId(editingTransaction.toAccountId || secondAcc);
      setCounterparty(editingTransaction.counterparty ?? '');
      const hasMultiSplits = editingTransaction.splits.length > 1;
      setSplitMode(hasMultiSplits);
      setSplits(
        editingTransaction.splits.length > 0
          ? editingTransaction.splits
          : [{ id: `sp-${Date.now()}`, envelopeId: defaultEnv, amount: editingTransaction.amount }],
      );
      setAutoMatchedEnvName(null);
      setManualCategoryLock(true);
      setTags(editingTransaction.tags);
      setCustomTag('');
      setNotes(editingTransaction.notes ?? '');
      setError(null);
      return;
    }

    setType(initialType);
    setMerchant('');
    setAmount('');
    setDate(entryInitialDate ?? getTodayIso());
    setAccountId(defaultAcc);
    setToAccountId(secondAcc);
    setCounterparty('');
    setSplitMode(false);
    setSplits([{ id: `sp-${Date.now()}`, envelopeId: defaultEnv, amount: 0 }]);
    setAutoMatchedEnvName(null);
    setManualCategoryLock(false);
    setTags([]);
    setCustomTag('');
    setNotes('');
    setError(null);
  }, [open, initialType, entryInitialDate, editingTransaction, activeData.accounts, activeData.envelopes]);

  useEffect(() => {
    if (splitMode) return;
    const num = Number(amount) || 0;
    setSplits((prev) => {
      const first = prev[0] ?? {
        id: `sp-${Date.now()}`,
        envelopeId: activeData.envelopes[0]?.id ?? '',
        amount: num,
      };
      return [{ ...first, amount: num }];
    });
  }, [amount, splitMode, activeData.envelopes]);

  const handleMerchantChange = (val: string) => {
    setMerchant(val);
    if (type !== 'spend' || splitMode || manualCategoryLock) return;

    const match = suggestCategorization(val, activeData.envelopes);
    if (match.matchedRule && match.envelopeId) {
      const env = activeData.envelopes.find((e) => e.id === match.envelopeId);
      setSplits((prev) => [
        {
          ...(prev[0] ?? { id: `sp-${Date.now()}`, amount: Number(amount) || 0 }),
          envelopeId: match.envelopeId!,
        },
      ]);
      setAutoMatchedEnvName(env?.name ?? null);
      if (match.suggestedTags.length > 0 && tags.length === 0) {
        setTags(match.suggestedTags);
      }
    } else {
      setAutoMatchedEnvName(null);
    }
  };

  const toggleTag = (tag: string) => {
    const clean = tag.replace(/^#/, '').trim().toLowerCase();
    if (!clean) return;
    setTags((prev) => (prev.includes(clean) ? prev.filter((t) => t !== clean) : [...prev, clean]));
  };

  const handleAddCustomTag = () => {
    if (!customTag.trim()) return;
    toggleTag(customTag);
    setCustomTag('');
  };

  const handleEnableSplitMode = () => {
    const total = Number(amount) || 0;
    const firstEnv = splits[0]?.envelopeId || activeData.envelopes[0]?.id || '';
    const secondEnv = activeData.envelopes.find((e) => e.id !== firstEnv)?.id ?? firstEnv;
    const firstAmt = total > 0 ? Math.round(total * 0.7) : 0;
    const secondAmt = total > 0 ? total - firstAmt : 0;
    setSplitMode(true);
    setSplits([
      { id: `sp-1-${Date.now()}`, envelopeId: firstEnv, amount: firstAmt },
      { id: `sp-2-${Date.now()}`, envelopeId: secondEnv, amount: secondAmt },
    ]);
  };

  const handleApplyOcr = (payload: { merchant: string; date: string; items: ParsedOcrItem[] }) => {
    setType('spend');
    setMerchant(payload.merchant);
    setDate(payload.date);
    const total = payload.items.reduce((s, i) => s + i.amount, 0);
    setAmount(String(total));

    if (payload.items.length > 1) {
      setSplitMode(true);
      setSplits(
        payload.items.map((item, idx) => ({
          id: `ocr-sp-${idx}-${Date.now()}`,
          envelopeId: item.envelopeId,
          amount: item.amount,
          note: item.description,
        })),
      );
    } else if (payload.items.length === 1) {
      setSplitMode(false);
      setSplits([
        {
          id: `ocr-sp-0-${Date.now()}`,
          envelopeId: payload.items[0].envelopeId,
          amount: payload.items[0].amount,
          note: payload.items[0].description,
        },
      ]);
    }
    setTags((prev) => (prev.includes('receipt') ? prev : [...prev, 'receipt']));
  };

  const totalNumeric = Number(amount) || 0;
  const splitValidation =
    type === 'spend'
      ? validateSplits(totalNumeric, splits)
      : { valid: true, difference: 0, error: null };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!merchant.trim()) {
      setError('Enter a merchant or description.');
      return;
    }
    if (!Number.isFinite(totalNumeric) || totalNumeric <= 0) {
      setError('Enter a valid positive amount.');
      return;
    }
    if (!accountId) {
      setError('Select an account.');
      return;
    }
    if (type === 'spend' && !splitValidation.valid) {
      setError(splitValidation.error);
      return;
    }
    if (type === 'transfer' && accountId === toAccountId) {
      setError('Choose two different accounts for a transfer.');
      return;
    }

    const payload = {
      type,
      amount: totalNumeric,
      date,
      merchant: merchant.trim(),
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      counterparty:
        type === 'borrow' || type === 'lend'
          ? counterparty.trim() || merchant.trim()
          : undefined,
      splits: type === 'spend' ? splits : [],
      tags,
      notes: notes.trim() || undefined,
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, payload);
    } else {
      addTransaction(payload);
    }

    closeEntrySheet();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEntrySheet}
              className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="log-entry-title"
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 36 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl"
            >
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />

              <div className="flex items-center justify-between gap-2">
                <h2 id="log-entry-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {editingTransaction ? 'Edit Transaction' : 'Log Transaction'}
                </h2>
                <div className="flex items-center gap-1.5">
                  {!editingTransaction && (
                    <button
                      type="button"
                      onClick={() => setOcrOpen(true)}
                      className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-teal-700 dark:text-teal-300 inline-flex items-center gap-1.5"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>Scan Receipt</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeEntrySheet}
                    aria-label="Close entry sheet"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {/* Transaction Type Selector */}
                <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {(['spend', 'income', 'transfer', 'borrow', 'lend'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`min-h-[38px] rounded-lg text-xs font-medium capitalize transition-colors ${
                        type === t
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Amount + Date */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-3">
                    <label htmlFor="entry-amount" className="block text-xs font-medium text-slate-500 mb-1">
                      Amount ({currency})
                    </label>
                    <input
                      id="entry-amount"
                      type="number"
                      min="1"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-base font-mono-num font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="entry-date" className="block text-xs font-medium text-slate-500 mb-1">
                      Date
                    </label>
                    <input
                      id="entry-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Merchant / Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="entry-merchant" className="text-xs font-medium text-slate-500">
                      {type === 'borrow' || type === 'lend' ? 'Description' : 'Merchant or Payee'}
                    </label>
                    {autoMatchedEnvName && type === 'spend' && !splitMode && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 dark:text-teal-400">
                        <Sparkles className="w-3 h-3" />
                        Auto-matched: {autoMatchedEnvName}
                      </span>
                    )}
                  </div>
                  <input
                    id="entry-merchant"
                    type="text"
                    value={merchant}
                    onChange={(e) => handleMerchantChange(e.target.value)}
                    placeholder={type === 'spend' ? 'e.g. Shell Station, Al-Fatah, Chai' : 'e.g. Monthly Salary'}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Account(s) */}
                <div className={`grid gap-3 ${type === 'transfer' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    <label htmlFor="entry-account" className="block text-xs font-medium text-slate-500 mb-1">
                      {type === 'transfer' ? 'From Account' : 'Account'}
                    </label>
                    <select
                      id="entry-account"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
                    >
                      {activeData.accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balance, currency, false, discreetMode)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {type === 'transfer' && (
                    <div>
                      <label htmlFor="entry-to-account" className="block text-xs font-medium text-slate-500 mb-1">
                        To Account
                      </label>
                      <select
                        id="entry-to-account"
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
                      >
                        {activeData.accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {(type === 'borrow' || type === 'lend') && (
                  <div>
                    <label htmlFor="entry-counterparty" className="block text-xs font-medium text-slate-500 mb-1">
                      Person / Counterparty
                    </label>
                    <input
                      id="entry-counterparty"
                      type="text"
                      value={counterparty}
                      onChange={(e) => setCounterparty(e.target.value)}
                      placeholder="e.g. Adeel"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm"
                    />
                  </div>
                )}

                {/* Envelope Allocation & Split Transactions (Spend only) */}
                {type === 'spend' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        {splitMode ? 'Split Across Envelopes' : 'Envelope'}
                      </span>
                      {!splitMode ? (
                        <button
                          type="button"
                          onClick={handleEnableSplitMode}
                          className="text-xs font-medium text-teal-600 dark:text-teal-400 inline-flex items-center gap-1 hover:underline"
                        >
                          <Split className="w-3.5 h-3.5" />
                          Split Transaction
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSplitMode(false);
                            setSplits([
                              {
                                id: `sp-${Date.now()}`,
                                envelopeId: splits[0]?.envelopeId ?? activeData.envelopes[0]?.id ?? '',
                                amount: totalNumeric,
                              },
                            ]);
                          }}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Single envelope
                        </button>
                      )}
                    </div>

                    {!splitMode ? (
                      <select
                        aria-label="Select envelope"
                        value={splits[0]?.envelopeId ?? ''}
                        onChange={(e) => {
                          setManualCategoryLock(true);
                          setAutoMatchedEnvName(null);
                          setSplits([
                            {
                              ...(splits[0] ?? { id: `sp-${Date.now()}`, amount: totalNumeric }),
                              envelopeId: e.target.value,
                            },
                          ]);
                        }}
                        className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
                      >
                        {activeData.envelopes.map((env) => (
                          <option key={env.id} value={env.id}>
                            {env.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-800/40">
                        {splits.map((sp, idx) => (
                          <div key={sp.id} className="flex items-center gap-2">
                            <select
                              aria-label={`Split ${idx + 1} envelope`}
                              value={sp.envelopeId}
                              onChange={(e) =>
                                setSplits((prev) =>
                                  prev.map((row) => (row.id === sp.id ? { ...row, envelopeId: e.target.value } : row)),
                                )
                              }
                              className="flex-1 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                            >
                              {activeData.envelopes.map((env) => (
                                <option key={env.id} value={env.id}>
                                  {env.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              aria-label={`Split ${idx + 1} amount`}
                              value={sp.amount || ''}
                              onChange={(e) =>
                                setSplits((prev) =>
                                  prev.map((row) =>
                                    row.id === sp.id ? { ...row, amount: Number(e.target.value) || 0 } : row,
                                  ),
                                )
                              }
                              placeholder="0"
                              className="w-24 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-mono-num text-right"
                            />
                            {splits.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setSplits((prev) => prev.filter((r) => r.id !== sp.id))}
                                aria-label="Remove split row"
                                className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setSplits((prev) => [
                                ...prev,
                                {
                                  id: `sp-${Date.now()}`,
                                  envelopeId: activeData.envelopes[0]?.id ?? '',
                                  amount: Math.max(0, splitValidation.difference),
                                },
                              ])
                            }
                            className="text-xs font-medium text-teal-600 dark:text-teal-400 inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Split Row
                          </button>
                          <span
                            className={`text-xs font-mono-num ${
                              splitValidation.valid
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {splitValidation.valid
                              ? 'Splits balanced'
                              : `${splitValidation.difference > 0 ? '+' : ''}${splitValidation.difference} unallocated`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tagging */}
                <div className="space-y-2">
                  <span className="block text-xs font-medium text-slate-500">Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_TAGS.map((tag) => {
                      const active = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }}
                      placeholder="Add custom tag..."
                      className="flex-1 min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-xs font-medium text-rose-500">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  {editingTransaction ? 'Save Changes' : 'Save Entry'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <OcrScannerModal
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        envelopes={activeData.envelopes}
        currency={currency}
        onApplyParsed={handleApplyOcr}
      />
    </>
  );
};
