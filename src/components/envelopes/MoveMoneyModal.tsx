import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRightLeft, X } from 'lucide-react';
import { EnvelopeSummary } from '../../utils/budgetEngine';
import { formatCurrency } from '../../utils/formatters';

interface MoveMoneyModalProps {
  open: boolean;
  onClose: () => void;
  summaries: EnvelopeSummary[];
  currency: string;
  initialToEnvelopeId?: string;
  onMove: (fromId: string, toId: string, amount: number) => void;
}

export const MoveMoneyModal: React.FC<MoveMoneyModalProps> = ({
  open,
  onClose,
  summaries,
  currency,
  initialToEnvelopeId,
  onMove,
}) => {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || summaries.length < 2) return;
    const targetId = initialToEnvelopeId ?? summaries[0].envelope.id;
    const sourceCandidate =
      summaries.find((s) => s.envelope.id !== targetId && s.remaining > 0)?.envelope.id ??
      summaries.find((s) => s.envelope.id !== targetId)?.envelope.id ??
      summaries[0].envelope.id;
    setToId(targetId);
    setFromId(sourceCandidate);
    const targetSummary = summaries.find((s) => s.envelope.id === targetId);
    if (targetSummary && targetSummary.isOverspent) {
      setAmount(String(Math.abs(targetSummary.remaining)));
    } else {
      setAmount('');
    }
    setError(null);
  }, [open, summaries, initialToEnvelopeId]);

  const fromSummary = summaries.find((s) => s.envelope.id === fromId);
  const toSummary = summaries.find((s) => s.envelope.id === toId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!fromId || !toId || fromId === toId) {
      setError('Select two different envelopes.');
      return;
    }
    if (!Number.isFinite(num) || num <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (fromSummary && num > fromSummary.envelope.assigned) {
      setError(`Source envelope only has ${formatCurrency(fromSummary.envelope.assigned, currency)} assigned.`);
      return;
    }
    onMove(fromId, toId, num);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-money-title"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h2 id="move-money-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Move Money Between Envelopes
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close move money dialog"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="move-from" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  From Envelope
                </label>
                <select
                  id="move-from"
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {summaries.map((s) => (
                    <option key={s.envelope.id} value={s.envelope.id}>
                      {s.envelope.name} (Avail: {formatCurrency(s.remaining, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="move-to" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  To Envelope
                </label>
                <select
                  id="move-to"
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {summaries.map((s) => (
                    <option key={s.envelope.id} value={s.envelope.id}>
                      {s.envelope.name} ({s.isOverspent ? 'Overspent' : `Avail: ${formatCurrency(s.remaining, currency)}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="move-amount" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Amount ({currency})
                </label>
                <input
                  id="move-amount"
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {fromSummary && toSummary && Number(amount) > 0 && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {fromSummary.envelope.name} → {formatCurrency(fromSummary.remaining - Number(amount), currency)} ·{' '}
                    {toSummary.envelope.name} → {formatCurrency(toSummary.remaining + Number(amount), currency)}
                  </p>
                )}
              </div>

              {error && <p className="text-xs text-rose-500">{error}</p>}

              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
              >
                Transfer Envelope Funds
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
