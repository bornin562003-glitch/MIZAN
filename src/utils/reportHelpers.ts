import { Envelope, ProfileData, Transaction } from '../types/finance';
import { getMonthKey } from './formatters';

export interface MonthlyEnvelopeLine {
  envelope: Envelope;
  spentInMonth: number;
  remaining: number;
  utilizationPct: number;
  isOverspent: boolean;
}

export interface MonthlyReportData {
  monthKey: string;
  monthLabel: string;
  monthlyInflow: number;
  monthlyOutflow: number;
  netCashFlow: number;
  transactions: Transaction[];
  envelopeLines: MonthlyEnvelopeLine[];
}

export function formatMonthKeyLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function getAvailableReportMonths(data: ProfileData, referenceDate = new Date()): string[] {
  const set = new Set<string>([getMonthKey(referenceDate)]);
  for (const tx of data.transactions) {
    if (tx.date.length >= 7) {
      set.add(tx.date.slice(0, 7));
    }
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function buildMonthlyReportData(data: ProfileData, monthKey: string): MonthlyReportData {
  const monthTxs = data.transactions
    .filter((tx) => tx.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));

  let monthlyInflow = 0;
  let monthlyOutflow = 0;
  const spentByEnvelope = new Map<string, number>();

  for (const tx of monthTxs) {
    if (tx.type === 'income' || tx.type === 'borrow') {
      monthlyInflow += tx.amount;
    } else if (tx.type === 'spend' || tx.type === 'lend') {
      monthlyOutflow += tx.amount;
      if (tx.type === 'spend') {
        for (const sp of tx.splits) {
          spentByEnvelope.set(sp.envelopeId, (spentByEnvelope.get(sp.envelopeId) ?? 0) + sp.amount);
        }
      }
    }
  }

  const envelopeLines: MonthlyEnvelopeLine[] = data.envelopes.map((envelope) => {
    const spentInMonth = spentByEnvelope.get(envelope.id) ?? 0;
    const remaining = envelope.assigned - spentInMonth;
    const utilizationPct =
      envelope.assigned > 0 ? Math.round((spentInMonth / envelope.assigned) * 100) : spentInMonth > 0 ? 100 : 0;
    return {
      envelope,
      spentInMonth,
      remaining,
      utilizationPct,
      isOverspent: remaining < 0,
    };
  });

  return {
    monthKey,
    monthLabel: formatMonthKeyLabel(monthKey),
    monthlyInflow,
    monthlyOutflow,
    netCashFlow: monthlyInflow - monthlyOutflow,
    transactions: monthTxs,
    envelopeLines,
  };
}
