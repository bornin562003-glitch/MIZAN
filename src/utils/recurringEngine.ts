import { Account, ProfileData, RecurringFrequency, RecurringTransaction, Transaction } from '../types/finance';

export interface UpcomingRecurringEvent {
  id: string;
  ruleId: string;
  title: string;
  type: 'income' | 'spend';
  amount: number;
  date: string;
  frequency: RecurringFrequency;
}

export interface MonthRecurringProjection {
  upcomingIncome: number;
  upcomingBills: number;
  upcomingNet: number;
  upcomingEvents: UpcomingRecurringEvent[];
}

function parseIsoDateLocal(dateIso: string): Date | null {
  const parts = dateIso.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function advanceRecurringDate(dateIso: string, frequency: RecurringFrequency): string {
  const base = parseIsoDateLocal(dateIso);
  if (!base) return dateIso;

  if (frequency === 'daily') {
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
    return toIsoLocal(next);
  }
  if (frequency === 'weekly') {
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7);
    return toIsoLocal(next);
  }

  // Monthly with safe day-of-month clamping (e.g. Jan 31 -> Feb 28/29)
  const targetYear = base.getFullYear();
  const targetMonth = base.getMonth() + 1;
  const maxDayNextMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(base.getDate(), maxDayNextMonth);
  const next = new Date(targetYear, targetMonth, clampedDay);
  return toIsoLocal(next);
}

function applySingleTransactionToAccounts(accounts: Account[], tx: Transaction): Account[] {
  const nowIso = new Date().toISOString();
  return accounts.map((acc) => {
    if (acc.id !== tx.accountId) return acc;
    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    return {
      ...acc,
      balance: acc.balance + delta,
      updatedAt: nowIso,
    };
  });
}

export function processDueRecurringTransactions(
  data: ProfileData,
  todayIso: string,
): { updatedData: ProfileData; postedTransactions: Transaction[] } {
  const rules = data.recurringTransactions ?? [];
  if (rules.length === 0) {
    return { updatedData: data, postedTransactions: [] };
  }

  let nextAccounts = data.accounts;
  const postedTransactions: Transaction[] = [];
  const nowIso = new Date().toISOString();
  const fallbackAccountId = data.accounts[0]?.id ?? '';

  const updatedRules: RecurringTransaction[] = rules.map((rule) => {
    if (!rule.active || !rule.autoPost || rule.amount <= 0) {
      return rule;
    }

    let cursorDate = rule.nextRunDate;
    let lastRun = rule.lastRunDate;
    let guard = 0;

    // Safely catch up missed runs (max 31 runs per rule to prevent runaway loops on stale years)
    while (cursorDate <= todayIso && guard < 31) {
      const accountId =
        data.accounts.some((a) => a.id === rule.accountId) ? rule.accountId : fallbackAccountId;
      const envelopeValid =
        rule.type === 'spend' &&
        rule.envelopeId &&
        data.envelopes.some((e) => e.id === rule.envelopeId);

      const newTx: Transaction = {
        id: `tx-rec-${rule.id}-${cursorDate}-${guard}`,
        type: rule.type,
        amount: rule.amount,
        date: cursorDate,
        merchant: rule.title,
        accountId,
        splits: envelopeValid
          ? [{ id: `sp-rec-${rule.id}-${cursorDate}-${guard}`, envelopeId: rule.envelopeId!, amount: rule.amount }]
          : [],
        tags: Array.from(new Set([...(rule.tags ?? []), 'recurring', rule.frequency])),
        notes: `Automatic ${rule.frequency} schedule`,
        createdAt: nowIso,
      };

      nextAccounts = applySingleTransactionToAccounts(nextAccounts, newTx);
      postedTransactions.push(newTx);
      lastRun = cursorDate;
      cursorDate = advanceRecurringDate(cursorDate, rule.frequency);
      guard += 1;
    }

    if (guard === 0) return rule;

    return {
      ...rule,
      nextRunDate: cursorDate,
      lastRunDate: lastRun,
    };
  });

  if (postedTransactions.length === 0) {
    return { updatedData: data, postedTransactions: [] };
  }

  return {
    updatedData: {
      ...data,
      accounts: nextAccounts,
      recurringTransactions: updatedRules,
      transactions: [...postedTransactions.reverse(), ...data.transactions],
    },
    postedTransactions,
  };
}

export function calculateRemainingMonthRecurring(
  recurring: RecurringTransaction[] = [],
  referenceDate: Date = new Date(),
): MonthRecurringProjection {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayIso = toIsoLocal(referenceDate);
  const monthEndIso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  let upcomingIncome = 0;
  let upcomingBills = 0;
  const upcomingEvents: UpcomingRecurringEvent[] = [];

  for (const rule of recurring) {
    if (!rule.active || rule.amount <= 0) continue;

    let cursor = rule.nextRunDate;
    let guard = 0;

    // Fast-forward past dates that are strictly before today if autoPost is off
    while (cursor < todayIso && guard < 62) {
      cursor = advanceRecurringDate(cursor, rule.frequency);
      guard += 1;
    }

    let monthGuard = 0;
    while (cursor >= todayIso && cursor <= monthEndIso && monthGuard < 35) {
      // Skip if already posted on this exact date
      if (rule.lastRunDate !== cursor) {
        if (rule.type === 'income') {
          upcomingIncome += rule.amount;
        } else {
          upcomingBills += rule.amount;
        }
        upcomingEvents.push({
          id: `${rule.id}-${cursor}`,
          ruleId: rule.id,
          title: rule.title,
          type: rule.type,
          amount: rule.amount,
          date: cursor,
          frequency: rule.frequency,
        });
      }
      cursor = advanceRecurringDate(cursor, rule.frequency);
      monthGuard += 1;
    }
  }

  upcomingEvents.sort((a, b) => a.date.localeCompare(b.date));

  return {
    upcomingIncome,
    upcomingBills,
    upcomingNet: upcomingIncome - upcomingBills,
    upcomingEvents,
  };
}
