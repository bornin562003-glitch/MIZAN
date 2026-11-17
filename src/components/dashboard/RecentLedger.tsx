import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckSquare,
  HandCoins,
  Pencil,
  Square,
  Trash2,
} from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { Envelope, Transaction, TransactionType } from '../../types/finance';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { EmptyState } from '../layout/EmptyState';

interface RecentLedgerProps {
  transactions: Transaction[];
  envelopes: Envelope[];
  currency: string;
  searchQuery: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (txId: string) => void;
  onBulkDelete: (txIds: string[]) => void;
  onAddEntry: () => void;
}

type LedgerFilter = 'all' | 'spend' | 'income' | 'other';

export const RecentLedger: React.FC<RecentLedgerProps> = ({
  transactions,
  envelopes,
  currency,
  searchQuery,
  onEdit,
  onDelete,
  onBulkDelete,
  onAddEntry,
}) => {
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const envelopeMap = new Map(envelopes.map((e) => [e.id, e.name]));

  const filtered = transactions.filter((tx) => {
    if (filter === 'spend' && tx.type !== 'spend') return false;
    if (filter === 'income' && tx.type !== 'income') return false;
    if (filter === 'other' && (tx.type === 'spend' || tx.type === 'income')) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const envNames = tx.splits
      .map((s) => envelopeMap.get(s.envelopeId) ?? '')
      .join(' ')
      .toLowerCase();
    return (
      tx.merchant.toLowerCase().includes(q) ||
      tx.tags.some((t) => t.toLowerCase().includes(q)) ||
      tx.type.toLowerCase().includes(q) ||
      envNames.includes(q)
    );
  });

  const visibleRows = filtered.slice(0, 15);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const renderIcon = (type: TransactionType) => {
    if (type === 'income') return <ArrowDownLeft className="w-4 h-4" />;
    if (type === 'transfer') return <ArrowLeftRight className="w-4 h-4" />;
    if (type === 'borrow' || type === 'lend') return <HandCoins className="w-4 h-4" />;
    return <ArrowUpRight className="w-4 h-4" />;
  };

  return (
    <section aria-label="Recent ledger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {searchQuery ? `Ledger matching "${searchQuery}"` : 'Recent Transactions'}
          </h2>
          {visibleRows.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectMode((v) => !v);
                setSelectedIds([]);
              }}
              className={`h-[34px] px-3 rounded-xl border text-xs font-medium inline-flex items-center transition-colors ${
                selectMode
                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {selectMode ? 'Done' : 'Select'}
            </button>
          )}
        </div>

        <div className="inline-flex h-[40px] items-center gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/90 self-start sm:self-auto overflow-x-auto max-w-full">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'spend', label: 'Spend' },
              { id: 'income', label: 'Income' },
              { id: 'other', label: 'Transfers & Debt' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`h-[30px] px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {selectMode && selectedIds.length > 0 && (
        <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
            {selectedIds.length} transaction{selectedIds.length === 1 ? '' : 's'} selected
          </span>
          <button
            type="button"
            onClick={() => {
              onBulkDelete(selectedIds);
              setSelectedIds([]);
              setSelectMode(false);
            }}
            className="min-h-[34px] px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
          >
            Delete Selected
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions match"
          description="Record a new transaction or switch filters to inspect another part of your ledger."
          actionLabel="Add Entry"
          onAction={onAddEntry}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {visibleRows.map((tx) => {
            const isInflow = tx.type === 'income' || tx.type === 'borrow';
            const splitLabel =
              tx.splits.length > 1
                ? `${tx.splits.length} splits`
                : tx.splits.length === 1
                  ? envelopeMap.get(tx.splits[0].envelopeId) ?? 'Envelope'
                  : tx.counterparty
                    ? `${tx.type === 'lend' ? 'Lent to' : 'From'} ${tx.counterparty}`
                    : tx.type;
            const isChecked = selectedIds.includes(tx.id);

            return (
              <div
                key={tx.id}
                className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {selectMode && (
                    <button
                      type="button"
                      onClick={() => toggleSelect(tx.id)}
                      aria-label={`Select ${tx.merchant}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0"
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>
                  )}

                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isInflow
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : tx.type === 'transfer'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {renderIcon(tx.type)}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {tx.merchant}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span>{formatShortDate(tx.date)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{splitLabel}</span>
                      {tx.tags.slice(0, 2).map((tag) => (
                        <React.Fragment key={tag}>
                          <span aria-hidden="true">·</span>
                          <span>#{tag}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`text-sm font-semibold font-mono-num whitespace-nowrap sm:min-w-[96px] text-right mr-1 ${
                      isInflow
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {isInflow ? '+' : tx.type === 'transfer' ? '' : '-'}
                    {formatCurrency(tx.amount, currency, false, discreetMode)}
                  </div>

                  {!selectMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEdit(tx)}
                        aria-label={`Edit ${tx.merchant}`}
                        className="h-[36px] w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {confirmDeleteId === tx.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(tx.id);
                            setConfirmDeleteId(null);
                          }}
                          className="h-[36px] px-2.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(tx.id)}
                          aria-label={`Delete ${tx.merchant}`}
                          className="h-[36px] w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
