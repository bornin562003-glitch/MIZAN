import { ProfileData, ProfileMeta, ProfilePreferences } from '../types/finance';
import { syncHashPin } from '../utils/pinCrypto';

function isoDaysAgo(daysAgo: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - daysAgo));
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function currentMonthDay(day: number): string {
  const now = new Date();
  const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(safeDay).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nextMonthDay(day: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(safeDay).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoDaysAhead(daysAhead: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DEFAULT_PREFERENCES: ProfilePreferences = {
  eveningNudgeEnabled: true,
  eveningNudgeTime: '21:00',
  enabledTrackers: {
    dailyPaceKpi: true,
    loansLending: true,
    sideHustlePnl: true,
    commuteSavings: true,
    debtTracker: true,
  },
};

export const INITIAL_PROFILES: ProfileMeta[] = [
  {
    id: 'personal',
    name: 'Personal',
    initials: 'PR',
    accentColor: '#0D9488',
    currency: 'PKR',
    pinHash: null,
    createdAt: '2026-01-01T09:00:00.000Z',
  },
  {
    id: 'family',
    name: 'Family',
    initials: 'FM',
    accentColor: '#2563EB',
    currency: 'PKR',
    pinHash: syncHashPin('1234'),
    createdAt: '2026-01-01T09:00:00.000Z',
  },
  {
    id: 'business',
    name: 'Studio Ops',
    initials: 'SO',
    accentColor: '#D97706',
    currency: 'USD',
    pinHash: null,
    createdAt: '2026-01-01T09:00:00.000Z',
  },
];

export function createSeedDataForProfile(profileId: string): ProfileData {
  const nowIso = new Date().toISOString();
  const monthKey = currentMonthDay(1).slice(0, 7);

  if (profileId === 'family') {
    return {
      profileId: 'family',
      monthlyIncomeTarget: 220000,
      monthlySavingsGoal: 45000,
      accounts: [
        { id: 'fam-bank', name: 'HBL Joint Savings', kind: 'bank', balance: 485000, updatedAt: nowIso },
        { id: 'fam-cash', name: 'Home Cash Box', kind: 'cash', balance: 28000, updatedAt: nowIso },
        { id: 'fam-vault', name: 'Education Reserve Vault', kind: 'vault', balance: 150000, updatedAt: nowIso },
      ],
      envelopes: [
        { id: 'fam-groceries', name: 'Household Groceries', group: 'daily_living', assigned: 55000, dailyHabitTarget: 1850, isEssential: true },
        { id: 'fam-utilities', name: 'Electricity & Gas', group: 'fixed_expenses', assigned: 32000, isEssential: true },
        { id: 'fam-school', name: 'School & Tuition', group: 'fixed_expenses', assigned: 60000, isEssential: true },
        { id: 'fam-reserve', name: 'Family Reserve', group: 'savings', assigned: 45000, isEssential: false },
      ],
      transactions: [
        {
          id: 'fam-tx-1',
          type: 'income',
          amount: 220000,
          date: currentMonthDay(1),
          merchant: 'Household Pool Deposit',
          accountId: 'fam-bank',
          splits: [],
          tags: ['monthly'],
          createdAt: nowIso,
        },
        {
          id: 'fam-tx-2',
          type: 'spend',
          amount: 58000,
          date: currentMonthDay(3),
          merchant: 'Beaconhouse Term Fee',
          accountId: 'fam-bank',
          splits: [{ id: 's-f2', envelopeId: 'fam-school', amount: 58000 }],
          tags: ['essential', 'education'],
          createdAt: nowIso,
        },
        {
          id: 'fam-tx-3',
          type: 'spend',
          amount: 19400,
          date: currentMonthDay(6),
          merchant: 'Metro Cash & Carry',
          accountId: 'fam-bank',
          splits: [{ id: 's-f3', envelopeId: 'fam-groceries', amount: 19400 }],
          tags: ['essential', 'groceries'],
          createdAt: nowIso,
        },
      ],
      reflections: {
        [monthKey]: {
          monthKey,
          mood: 'on_track',
          notes: 'School fees cleared early; grocery run stayed within weekly pacing.',
          surprisedPrompt: 'Weekly produce delivery stayed lower than projected.',
          capComfortPrompt: 'Yes, weekly grocery allowance felt comfortable.',
          nextMonthChangePrompt: 'Top up Education Reserve Vault by 10,000.',
          updatedAt: nowIso,
        },
      },
      quickPresets: [
        { id: 'fam-pre-1', label: 'Fresh Milk & Bread', amount: 420, envelopeId: 'fam-groceries', accountId: 'fam-cash' },
        { id: 'fam-pre-2', label: 'Fruit Market', amount: 1200, envelopeId: 'fam-groceries', accountId: 'fam-cash' },
      ],
      loans: [],
      paydayTemplates: [
        { id: 'fam-tpl-1', name: 'Household Pool Deposit', type: 'income', amount: 220000, accountId: 'fam-bank', cadence: 'Monthly · 1st' },
        { id: 'fam-tpl-2', name: 'School & Tuition', type: 'spend', amount: 58000, accountId: 'fam-bank', envelopeId: 'fam-school', cadence: 'Monthly · 3rd' },
      ],
      recurringTransactions: [
        {
          id: 'fam-rec-1',
          title: 'Household Pool Deposit',
          type: 'income',
          amount: 220000,
          frequency: 'monthly',
          accountId: 'fam-bank',
          nextRunDate: nextMonthDay(1),
          active: true,
          autoPost: true,
          tags: ['salary', 'monthly'],
        },
        {
          id: 'fam-rec-2',
          title: 'Weekly Produce Box',
          type: 'spend',
          amount: 4200,
          frequency: 'weekly',
          accountId: 'fam-cash',
          envelopeId: 'fam-groceries',
          nextRunDate: isoDaysAhead(3),
          active: true,
          autoPost: true,
          tags: ['groceries'],
        },
      ],
      debts: [
        {
          id: 'fam-debt-1',
          name: 'Home Solar Financing',
          lender: 'Meezan Green',
          principalOriginal: 480000,
          currentBalance: 295000,
          annualInterestRate: 9.5,
          monthlyPayment: 24500,
          accountId: 'fam-bank',
          createdAt: nowIso,
        },
      ],
      commuteTracker: { kmPerTrip: 12, savingsPerTrip: 150, trips: [] },
      sideProject: {
        name: 'Home Solar Payback',
        plannedReserve: 50000,
        invested: 0,
        revenue: 8500,
        guardrails: [
          { id: 'fg-1', label: 'Keep grid backup under 25% of monthly bill', checked: true },
        ],
        nextMonthChecklist: [
          { id: 'fn-1', label: 'Transfer 15,000 to Education Reserve Vault', checked: false },
        ],
      },
      preferences: DEFAULT_PREFERENCES,
    };
  }

  if (profileId === 'business') {
    return {
      profileId: 'business',
      monthlyIncomeTarget: 6400,
      monthlySavingsGoal: 2500,
      accounts: [
        { id: 'biz-checking', name: 'Mercury Checking', kind: 'bank', balance: 14250, updatedAt: nowIso },
        { id: 'biz-card', name: 'Ops Corporate Card', kind: 'card', balance: -680, updatedAt: nowIso },
        { id: 'biz-vault', name: 'Tax Reserve Vault', kind: 'vault', balance: 4200, updatedAt: nowIso },
        { id: 'biz-recv', name: 'Client Receivables', kind: 'receivable', balance: 1850, updatedAt: nowIso },
      ],
      envelopes: [
        { id: 'biz-cloud', name: 'Cloud & SaaS', group: 'fixed_expenses', assigned: 950, isEssential: true },
        { id: 'biz-travel', name: 'Client Travel & Meals', group: 'daily_living', assigned: 1100, dailyHabitTarget: 40, isEssential: false },
        { id: 'biz-tax', name: 'Quarterly Tax Vault', group: 'savings', assigned: 1800, isEssential: true },
        { id: 'biz-runway', name: 'Operating Runway', group: 'savings', assigned: 2100, isEssential: false },
      ],
      transactions: [
        {
          id: 'biz-tx-1',
          type: 'income',
          amount: 6400,
          date: currentMonthDay(2),
          merchant: 'Northstar Retainer',
          accountId: 'biz-checking',
          splits: [],
          tags: ['retainer'],
          createdAt: nowIso,
        },
        {
          id: 'biz-tx-2',
          type: 'spend',
          amount: 420,
          date: currentMonthDay(5),
          merchant: 'Vercel & AWS Infrastructure',
          accountId: 'biz-card',
          splits: [{ id: 's-b2', envelopeId: 'biz-cloud', amount: 420 }],
          tags: ['essential', 'infra'],
          createdAt: nowIso,
        },
        {
          id: 'biz-tx-3',
          type: 'spend',
          amount: 145,
          date: isoDaysAgo(1),
          merchant: 'Client Coffee & Lunch',
          accountId: 'biz-card',
          splits: [{ id: 's-b3', envelopeId: 'biz-travel', amount: 145 }],
          tags: ['work', 'client'],
          createdAt: nowIso,
        },
      ],
      reflections: {},
      quickPresets: [
        { id: 'biz-pre-1', label: 'Client Coffee', amount: 18, envelopeId: 'biz-travel', accountId: 'biz-card' },
        { id: 'biz-pre-2', label: 'Domain Renewal', amount: 24, envelopeId: 'biz-cloud', accountId: 'biz-card' },
      ],
      loans: [
        {
          id: 'biz-loan-1',
          kind: 'receivable',
          person: 'Northstar Labs',
          amount: 1850,
          description: 'Design Sprint Milestone #2',
          accountId: 'biz-checking',
          date: currentMonthDay(4),
          expectedReturnDate: currentMonthDay(25),
          status: 'open',
        },
      ],
      paydayTemplates: [
        { id: 'biz-tpl-1', name: 'Northstar Monthly Retainer', type: 'income', amount: 6400, accountId: 'biz-checking', cadence: 'Monthly · 2nd' },
        { id: 'biz-tpl-2', name: 'Cloud Hosting Bundle', type: 'spend', amount: 420, accountId: 'biz-card', envelopeId: 'biz-cloud', cadence: 'Monthly · 5th' },
      ],
      recurringTransactions: [
        {
          id: 'biz-rec-1',
          title: 'Northstar Retainer Invoice',
          type: 'income',
          amount: 6400,
          frequency: 'monthly',
          accountId: 'biz-checking',
          nextRunDate: nextMonthDay(2),
          active: true,
          autoPost: true,
          tags: ['retainer'],
        },
        {
          id: 'biz-rec-2',
          title: 'Cloud Infrastructure & CDN',
          type: 'spend',
          amount: 420,
          frequency: 'monthly',
          accountId: 'biz-card',
          envelopeId: 'biz-cloud',
          nextRunDate: nextMonthDay(5),
          active: true,
          autoPost: true,
          tags: ['infra'],
        },
      ],
      debts: [
        {
          id: 'biz-debt-1',
          name: 'Workstation Equipment Lease',
          lender: 'Mercury Credit',
          principalOriginal: 4200,
          currentBalance: 1650,
          annualInterestRate: 11.2,
          monthlyPayment: 295,
          accountId: 'biz-checking',
          createdAt: nowIso,
        },
      ],
      commuteTracker: { kmPerTrip: 15, savingsPerTrip: 8, trips: [] },
      sideProject: {
        name: 'UI Kit Digital Store',
        plannedReserve: 1200,
        invested: 480,
        revenue: 920,
        guardrails: [
          { id: 'bg-1', label: 'Keep paid ads under 25% of gross revenue', checked: true },
          { id: 'bg-2', label: 'Set aside 25% into Quarterly Tax Vault', checked: false },
        ],
        nextMonthChecklist: [
          { id: 'bn-1', label: 'Reconcile Stripe payout to Mercury Checking', checked: false },
        ],
      },
      preferences: DEFAULT_PREFERENCES,
    };
  }

  // Default: 'personal' profile
  return {
    profileId: 'personal',
    monthlyIncomeTarget: 165000,
    monthlySavingsGoal: 35000,
    accounts: [
      { id: 'per-bank', name: 'Meezan Current', kind: 'bank', balance: 214500, updatedAt: nowIso },
      { id: 'per-wallet', name: 'Everyday Wallet', kind: 'cash', balance: 14200, updatedAt: nowIso },
      { id: 'per-card', name: 'SadaPay Virtual', kind: 'bank', balance: 32800, updatedAt: nowIso },
      { id: 'per-vault', name: 'Emergency Gold Vault', kind: 'vault', balance: 95000, updatedAt: nowIso },
      { id: 'per-lend', name: 'Lent to Adeel', kind: 'receivable', balance: 8500, updatedAt: nowIso },
    ],
    envelopes: [
      { id: 'env-food', name: 'Food & Dining', group: 'daily_living', assigned: 32000, dailyHabitTarget: 1100, isEssential: true },
      { id: 'env-commute', name: 'Fuel & Commute', group: 'daily_living', assigned: 18000, dailyHabitTarget: 650, isEssential: true },
      { id: 'env-household', name: 'Household & Care', group: 'daily_living', assigned: 12000, dailyHabitTarget: 400, isEssential: true },
      { id: 'env-allowance', name: 'Daily Allowances', group: 'daily_living', assigned: 10000, dailyHabitTarget: 350, isEssential: false },
      { id: 'env-rent', name: 'Rent & Maintenance', group: 'fixed_expenses', assigned: 45000, isEssential: true },
      { id: 'env-utilities', name: 'Fiber & Utilities', group: 'fixed_expenses', assigned: 14500, isEssential: true },
      { id: 'env-emergency', name: 'Emergency Buffer', group: 'savings', assigned: 22000, isEssential: true },
    ],
    transactions: [
      {
        id: 'per-tx-1',
        type: 'income',
        amount: 165000,
        date: currentMonthDay(1),
        merchant: 'Monthly Salary Credit',
        accountId: 'per-bank',
        splits: [],
        tags: ['salary'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-2',
        type: 'spend',
        amount: 45000,
        date: currentMonthDay(2),
        merchant: 'Apartment Rent Transfer',
        accountId: 'per-bank',
        splits: [{ id: 's-p2', envelopeId: 'env-rent', amount: 45000 }],
        tags: ['essential', 'housing'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-3',
        type: 'spend',
        amount: 11200,
        date: currentMonthDay(4),
        merchant: 'Nayatel & IESCO Bill',
        accountId: 'per-bank',
        splits: [{ id: 's-p3', envelopeId: 'env-utilities', amount: 11200 }],
        tags: ['essential', 'bills'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-4',
        type: 'spend',
        amount: 4800,
        date: currentMonthDay(6),
        merchant: 'Shell Service Station',
        accountId: 'per-card',
        splits: [{ id: 's-p4', envelopeId: 'env-commute', amount: 4800 }],
        tags: ['commute', 'fuel'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-5',
        type: 'spend',
        amount: 6400,
        date: currentMonthDay(8),
        merchant: 'Al-Fatah Supermarket',
        accountId: 'per-card',
        splits: [
          { id: 's-p5a', envelopeId: 'env-food', amount: 4500, note: 'Fresh produce & pantry' },
          { id: 's-p5b', envelopeId: 'env-household', amount: 1900, note: 'Detergent & supplies' },
        ],
        tags: ['essential', 'groceries'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-6',
        type: 'spend',
        amount: 2150,
        date: currentMonthDay(10),
        merchant: 'Dera Chai & Dinner',
        accountId: 'per-wallet',
        splits: [{ id: 's-p6', envelopeId: 'env-food', amount: 2150 }],
        tags: ['dining'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-7',
        type: 'spend',
        amount: 3200,
        date: currentMonthDay(12),
        merchant: 'PSO Fuel Pump',
        accountId: 'per-card',
        splits: [{ id: 's-p7', envelopeId: 'env-commute', amount: 3200 }],
        tags: ['commute'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-8',
        type: 'lend',
        amount: 8500,
        date: currentMonthDay(13),
        merchant: 'Adeel Lunch & Ride Share',
        accountId: 'per-bank',
        counterparty: 'Adeel',
        splits: [],
        tags: ['receivable'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-9',
        type: 'spend',
        amount: 1650,
        date: isoDaysAgo(1),
        merchant: 'Roastery Coffee & Bakery',
        accountId: 'per-wallet',
        splits: [
          { id: 's-p9a', envelopeId: 'env-food', amount: 1050 },
          { id: 's-p9b', envelopeId: 'env-allowance', amount: 600 },
        ],
        tags: ['daily'],
        createdAt: nowIso,
      },
      {
        id: 'per-tx-10',
        type: 'spend',
        amount: 950,
        date: isoDaysAgo(0),
        merchant: 'Fresh Mart Corner',
        accountId: 'per-wallet',
        splits: [{ id: 's-p10', envelopeId: 'env-food', amount: 950 }],
        tags: ['essential'],
        createdAt: nowIso,
      },
    ],
    reflections: {
      [monthKey]: {
        monthKey,
        mood: 'on_track',
        notes: 'Fixed bills settled in week one. Keeping discretionary cafe runs inside the daily allowance.',
        surprisedPrompt: 'Fuel & Commute stayed calmer on WFH days.',
        capComfortPrompt: 'Yes — daily allowance kept evening snacks guilt-free.',
        nextMonthChangePrompt: 'Sweep extra unassigned cash into Emergency Gold Vault.',
        updatedAt: nowIso,
      },
    },
    quickPresets: [
      { id: 'per-pre-1', label: 'Eggs & Bread', amount: 260, envelopeId: 'env-food', accountId: 'per-wallet' },
      { id: 'per-pre-2', label: 'Yoghurt', amount: 90, envelopeId: 'env-food', accountId: 'per-wallet' },
      { id: 'per-pre-3', label: 'Bike Petrol', amount: 300, envelopeId: 'env-commute', accountId: 'per-wallet' },
      { id: 'per-pre-4', label: 'Chai & Biscuit', amount: 150, envelopeId: 'env-allowance', accountId: 'per-wallet' },
    ],
    loans: [
      {
        id: 'per-loan-1',
        kind: 'receivable',
        person: 'Adeel',
        amount: 8500,
        description: 'Lunch & Ride Share split',
        accountId: 'per-bank',
        date: currentMonthDay(13),
        expectedReturnDate: currentMonthDay(26),
        status: 'open',
      },
      {
        id: 'per-loan-2',
        kind: 'liability',
        person: 'Hamza',
        amount: 3500,
        description: 'Concert ticket advance',
        accountId: 'per-card',
        date: currentMonthDay(9),
        expectedReturnDate: currentMonthDay(28),
        status: 'open',
      },
    ],
    paydayTemplates: [
      { id: 'per-tpl-1', name: 'Monthly Salary Credit', type: 'income', amount: 165000, accountId: 'per-bank', cadence: 'Monthly · 1st' },
      { id: 'per-tpl-2', name: 'Apartment Rent Transfer', type: 'spend', amount: 45000, accountId: 'per-bank', envelopeId: 'env-rent', cadence: 'Monthly · 2nd' },
      { id: 'per-tpl-3', name: 'Fiber & Utilities Bundle', type: 'spend', amount: 11200, accountId: 'per-bank', envelopeId: 'env-utilities', cadence: 'Monthly · 5th' },
    ],
    recurringTransactions: [
      {
        id: 'per-rec-1',
        title: 'Monthly Salary Credit',
        type: 'income',
        amount: 165000,
        frequency: 'monthly',
        accountId: 'per-bank',
        nextRunDate: nextMonthDay(1),
        active: true,
        autoPost: true,
        tags: ['salary'],
      },
      {
        id: 'per-rec-2',
        title: 'Apartment Rent Transfer',
        type: 'spend',
        amount: 45000,
        frequency: 'monthly',
        accountId: 'per-bank',
        envelopeId: 'env-rent',
        nextRunDate: nextMonthDay(2),
        active: true,
        autoPost: true,
        tags: ['housing', 'essential'],
      },
      {
        id: 'per-rec-3',
        title: 'Weekly Commute & Fuel Top-Up',
        type: 'spend',
        amount: 2200,
        frequency: 'weekly',
        accountId: 'per-card',
        envelopeId: 'env-commute',
        nextRunDate: isoDaysAhead(4),
        active: true,
        autoPost: true,
        tags: ['commute'],
      },
      {
        id: 'per-rec-4',
        title: 'Daily Fresh Milk & Pantry',
        type: 'spend',
        amount: 250,
        frequency: 'daily',
        accountId: 'per-wallet',
        envelopeId: 'env-food',
        nextRunDate: isoDaysAhead(1),
        active: true,
        autoPost: false,
        tags: ['daily'],
      },
    ],
    debts: [
      {
        id: 'per-debt-1',
        name: 'Motorbike Financing',
        lender: 'Meezan Auto',
        principalOriginal: 240000,
        currentBalance: 118000,
        annualInterestRate: 13.5,
        monthlyPayment: 12500,
        accountId: 'per-bank',
        createdAt: nowIso,
      },
      {
        id: 'per-debt-2',
        name: 'Laptop 0% Installment',
        lender: 'Bank Alfalah',
        principalOriginal: 180000,
        currentBalance: 60000,
        annualInterestRate: 0,
        monthlyPayment: 15000,
        accountId: 'per-bank',
        createdAt: nowIso,
      },
    ],
    commuteTracker: {
      kmPerTrip: 10,
      savingsPerTrip: 120,
      trips: [
        { id: 'ct-1', date: isoDaysAgo(2), km: 10, saved: 120 },
        { id: 'ct-2', date: isoDaysAgo(1), km: 10, saved: 120 },
      ],
    },
    sideProject: {
      name: 'Freelance Design Retainer',
      plannedReserve: 15000,
      invested: 4200,
      revenue: 18500,
      guardrails: [
        { id: 'pg-1', label: 'Reinvest max 30% of side income into tools', checked: true },
        { id: 'pg-2', label: 'Sweep 50% of profit straight to Emergency Gold Vault', checked: false },
      ],
      nextMonthChecklist: [
        { id: 'pn-1', label: 'Pre-fund Rent & Utilities on payday morning', checked: false },
        { id: 'pn-2', label: 'Review Daily Living cushion before weekend dining', checked: false },
      ],
    },
    preferences: DEFAULT_PREFERENCES,
  };
}

export function createBlankProfileData(profileId: string): ProfileData {
  const nowIso = new Date().toISOString();
  return {
    profileId,
    monthlyIncomeTarget: 0,
    monthlySavingsGoal: 0,
    accounts: [
      { id: `${profileId}-cash`, name: 'Main Wallet', kind: 'cash', balance: 0, updatedAt: nowIso },
      { id: `${profileId}-bank`, name: 'Primary Bank', kind: 'bank', balance: 0, updatedAt: nowIso },
    ],
    envelopes: [
      { id: `${profileId}-food`, name: 'Food & Dining', group: 'daily_living', assigned: 0, dailyHabitTarget: 500, isEssential: true },
      { id: `${profileId}-commute`, name: 'Commute & Fuel', group: 'daily_living', assigned: 0, dailyHabitTarget: 300, isEssential: true },
      { id: `${profileId}-bills`, name: 'Fixed Bills', group: 'fixed_expenses', assigned: 0, isEssential: true },
      { id: `${profileId}-savings`, name: 'Savings Buffer', group: 'savings', assigned: 0, isEssential: true },
    ],
    transactions: [],
    reflections: {},
    quickPresets: [],
    loans: [],
    paydayTemplates: [],
    recurringTransactions: [],
    debts: [],
    commuteTracker: { kmPerTrip: 10, savingsPerTrip: 100, trips: [] },
    sideProject: {
      name: 'Side Hustle P&L',
      plannedReserve: 0,
      invested: 0,
      revenue: 0,
      guardrails: [],
      nextMonthChecklist: [],
    },
    preferences: DEFAULT_PREFERENCES,
  };
}
