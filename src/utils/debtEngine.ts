import { DebtItem } from '../types/finance';

export interface DebtPayoffSimulation {
  monthsToPayoff: number;
  canPayOff: boolean;
  totalProjectedInterest: number;
  expectedPayoffDate: string; // e.g., "Oct 2027"
  expectedPayoffIso: string | null; // e.g., "2027-10"
}

export interface DebtAnalytics {
  debt: DebtItem;
  repaidAmount: number;
  repaidPercent: number;
  monthlyInterestCharge: number;
  principalPortionNextMonth: number;
  baseline: DebtPayoffSimulation;
  withExtra: DebtPayoffSimulation;
  monthsSaved: number;
  interestSaved: number;
}

export interface PortfolioDebtSummary {
  totalOriginalPrincipal: number;
  totalRemainingBalance: number;
  totalRepaid: number;
  overallRepaidPercent: number;
  weightedApr: number;
  totalMonthlyCommitment: number;
  totalMonthlyInterest: number;
  latestPayoffDate: string;
  maxMonthsToPayoff: number;
  totalInterestRemaining: number;
  totalInterestSavedWithExtra: number;
  items: DebtAnalytics[];
}

function formatMonthYear(date: Date): { label: string; iso: string } {
  const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return { label, iso };
}

export function simulateDebtPayoff(
  currentBalance: number,
  annualInterestRate: number,
  monthlyPayment: number,
  referenceDate: Date = new Date(),
): DebtPayoffSimulation {
  if (currentBalance <= 0) {
    const nowFmt = formatMonthYear(referenceDate);
    return {
      monthsToPayoff: 0,
      canPayOff: true,
      totalProjectedInterest: 0,
      expectedPayoffDate: 'Paid Off',
      expectedPayoffIso: nowFmt.iso,
    };
  }

  const monthlyRate = Math.max(0, annualInterestRate) / 100 / 12;
  const firstMonthInterest = currentBalance * monthlyRate;

  if (monthlyPayment <= 0 || monthlyPayment <= firstMonthInterest + 0.0001) {
    return {
      monthsToPayoff: Infinity,
      canPayOff: false,
      totalProjectedInterest: Infinity,
      expectedPayoffDate: 'Payment ≤ interest',
      expectedPayoffIso: null,
    };
  }

  let balance = currentBalance;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600;

  while (balance > 0.01 && months < maxMonths) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    const principalPaid = Math.min(balance, monthlyPayment - interest);
    balance = Math.max(0, balance + interest - (interest + principalPaid));
    months += 1;
  }

  if (balance > 0.01) {
    return {
      monthsToPayoff: Infinity,
      canPayOff: false,
      totalProjectedInterest: Infinity,
      expectedPayoffDate: '50+ years',
      expectedPayoffIso: null,
    };
  }

  const payoffDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + months, 1);
  const fmt = formatMonthYear(payoffDate);

  return {
    monthsToPayoff: months,
    canPayOff: true,
    totalProjectedInterest: Math.round(totalInterest),
    expectedPayoffDate: fmt.label,
    expectedPayoffIso: fmt.iso,
  };
}

export function computeDebtAnalytics(
  debt: DebtItem,
  extraMonthlyPayment: number = 0,
  referenceDate: Date = new Date(),
): DebtAnalytics {
  const original = Math.max(debt.principalOriginal, debt.currentBalance);
  const repaidAmount = Math.max(0, original - debt.currentBalance);
  const repaidPercent =
    original > 0 ? Math.min(100, Math.round((repaidAmount / original) * 100)) : 100;

  const monthlyRate = Math.max(0, debt.annualInterestRate) / 100 / 12;
  const monthlyInterestCharge = Math.round(debt.currentBalance * monthlyRate);
  const principalPortionNextMonth = Math.max(0, Math.round(debt.monthlyPayment - monthlyInterestCharge));

  const baseline = simulateDebtPayoff(
    debt.currentBalance,
    debt.annualInterestRate,
    debt.monthlyPayment,
    referenceDate,
  );
  const withExtra = simulateDebtPayoff(
    debt.currentBalance,
    debt.annualInterestRate,
    debt.monthlyPayment + Math.max(0, extraMonthlyPayment),
    referenceDate,
  );

  const monthsSaved =
    baseline.canPayOff && withExtra.canPayOff
      ? Math.max(0, baseline.monthsToPayoff - withExtra.monthsToPayoff)
      : 0;
  const interestSaved =
    baseline.canPayOff && withExtra.canPayOff
      ? Math.max(0, baseline.totalProjectedInterest - withExtra.totalProjectedInterest)
      : 0;

  return {
    debt,
    repaidAmount,
    repaidPercent,
    monthlyInterestCharge,
    principalPortionNextMonth,
    baseline,
    withExtra,
    monthsSaved,
    interestSaved,
  };
}

export function computePortfolioDebtSummary(
  debts: DebtItem[] = [],
  extraMonthlyPayment: number = 0,
  referenceDate: Date = new Date(),
): PortfolioDebtSummary {
  const items = debts.map((d) => computeDebtAnalytics(d, extraMonthlyPayment, referenceDate));

  const totalOriginalPrincipal = debts.reduce(
    (sum, d) => sum + Math.max(d.principalOriginal, d.currentBalance),
    0,
  );
  const totalRemainingBalance = debts.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0);
  const totalRepaid = Math.max(0, totalOriginalPrincipal - totalRemainingBalance);
  const overallRepaidPercent =
    totalOriginalPrincipal > 0
      ? Math.min(100, Math.round((totalRepaid / totalOriginalPrincipal) * 100))
      : 0;

  const weightedApr =
    totalRemainingBalance > 0
      ? Math.round(
          (debts.reduce((sum, d) => sum + d.currentBalance * d.annualInterestRate, 0) /
            totalRemainingBalance) *
            10,
        ) / 10
      : 0;

  const activeDebts = debts.filter((d) => d.currentBalance > 0);
  const totalMonthlyCommitment = activeDebts.reduce((sum, d) => sum + d.monthlyPayment, 0);
  const totalMonthlyInterest = items.reduce((sum, item) => sum + item.monthlyInterestCharge, 0);

  let maxMonthsToPayoff = 0;
  let latestPayoffDate = activeDebts.length === 0 ? 'Debt-Free' : 'Paid Off';
  let hasUnpayable = false;
  let totalInterestRemaining = 0;
  let totalInterestSavedWithExtra = 0;

  for (const item of items) {
    if (!item.baseline.canPayOff) {
      hasUnpayable = true;
    } else {
      totalInterestRemaining += item.baseline.totalProjectedInterest;
      if (item.baseline.monthsToPayoff >= maxMonthsToPayoff) {
        maxMonthsToPayoff = item.baseline.monthsToPayoff;
        if (item.baseline.monthsToPayoff > 0) {
          latestPayoffDate = item.baseline.expectedPayoffDate;
        }
      }
    }
    totalInterestSavedWithExtra += item.interestSaved;
  }

  if (hasUnpayable) {
    latestPayoffDate = 'Increase Payment';
  }

  return {
    totalOriginalPrincipal,
    totalRemainingBalance,
    totalRepaid,
    overallRepaidPercent,
    weightedApr,
    totalMonthlyCommitment,
    totalMonthlyInterest,
    latestPayoffDate,
    maxMonthsToPayoff: hasUnpayable ? Infinity : maxMonthsToPayoff,
    totalInterestRemaining,
    totalInterestSavedWithExtra,
    items,
  };
}
