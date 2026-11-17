export type ThemeMode = 'light' | 'dark';
export type ViewportMode = 'auto' | 'mobile' | 'desktop';
export type NavTab = 'overview' | 'calendar' | 'envelopes' | 'pace' | 'accounts';
export type TransactionType = 'spend' | 'income' | 'transfer' | 'borrow' | 'lend';
export type EnvelopeGroup = 'daily_living' | 'fixed_expenses' | 'savings';
export type AccountKind = 'cash' | 'bank' | 'card' | 'vault' | 'receivable' | 'debt';

export interface ProfileMeta {
  id: string;
  name: string;
  initials: string;
  accentColor: string;
  currency: string;
  pinHash: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  balance: number;
  updatedAt: string;
}

export interface Envelope {
  id: string;
  name: string;
  group: EnvelopeGroup;
  assigned: number;
  dailyHabitTarget?: number;
  isEssential: boolean;
}

export interface TransactionSplit {
  id: string;
  envelopeId: string;
  amount: number;
  note?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  merchant: string;
  accountId: string;
  toAccountId?: string;
  counterparty?: string;
  splits: TransactionSplit[];
  tags: string[];
  notes?: string;
  createdAt: string;
}

export interface MonthReflection {
  monthKey: string; // YYYY-MM
  mood: 'on_track' | 'tight' | 'overspent';
  notes: string;
  surprisedPrompt?: string;
  capComfortPrompt?: string;
  nextMonthChangePrompt?: string;
  updatedAt: string;
}

export interface QuickPreset {
  id: string;
  label: string;
  amount: number;
  envelopeId: string;
  accountId?: string;
}

export interface LoanRecord {
  id: string;
  kind: 'receivable' | 'liability';
  person: string;
  amount: number;
  description: string;
  accountId: string;
  date: string;
  expectedReturnDate?: string;
  status: 'open' | 'settled';
  settledAt?: string;
}

export interface PaydayTemplate {
  id: string;
  name: string;
  type: 'income' | 'spend';
  amount: number;
  accountId: string;
  envelopeId?: string;
  cadence: string;
}

export interface CommuteTrip {
  id: string;
  date: string;
  km: number;
  saved: number;
}

export interface CommuteTrackerData {
  kmPerTrip: number;
  savingsPerTrip: number;
  trips: CommuteTrip[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface SideProjectData {
  name: string;
  plannedReserve: number;
  invested: number;
  revenue: number;
  guardrails: ChecklistItem[];
  nextMonthChecklist: ChecklistItem[];
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringTransaction {
  id: string;
  title: string;
  type: 'income' | 'spend';
  amount: number;
  frequency: RecurringFrequency;
  accountId: string;
  envelopeId?: string;
  nextRunDate: string; // YYYY-MM-DD
  lastRunDate?: string; // YYYY-MM-DD
  active: boolean;
  autoPost: boolean;
  tags?: string[];
}

export interface DebtItem {
  id: string;
  name: string;
  lender: string;
  principalOriginal: number;
  currentBalance: number;
  annualInterestRate: number; // APR %
  monthlyPayment: number;
  accountId?: string;
  createdAt: string;
}

export interface BudgetToastItem {
  id: string;
  envelopeId: string;
  envelopeName: string;
  threshold: 80 | 100;
  percentUsed: number;
  spent: number;
  assigned: number;
  currency: string;
  createdAt: string;
}

export interface ProfilePreferences {
  eveningNudgeEnabled: boolean;
  eveningNudgeTime: string; // HH:MM (24h)
  nudgeDismissedDate?: string;
  enabledTrackers: {
    dailyPaceKpi: boolean;
    loansLending: boolean;
    sideHustlePnl: boolean;
    commuteSavings: boolean;
    debtTracker?: boolean;
  };
}

export interface ProfileData {
  profileId: string;
  monthlyIncomeTarget: number;
  monthlySavingsGoal?: number;
  accounts: Account[];
  envelopes: Envelope[];
  transactions: Transaction[];
  reflections: Record<string, MonthReflection>;
  sectionLabels?: {
    accounts?: string;
    vaults?: string;
  };
  quickPresets?: QuickPreset[];
  loans?: LoanRecord[];
  paydayTemplates?: PaydayTemplate[];
  recurringTransactions?: RecurringTransaction[];
  debts?: DebtItem[];
  commuteTracker?: CommuteTrackerData;
  sideProject?: SideProjectData;
  preferences?: ProfilePreferences;
}

export interface PersistedRegistry {
  version: number;
  theme: ThemeMode;
  viewportMode?: ViewportMode;
  discreetMode?: boolean;
  activeTab: NavTab;
  activeProfileId: string;
  profiles: ProfileMeta[];
}
