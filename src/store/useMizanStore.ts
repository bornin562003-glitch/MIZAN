import { create } from 'zustand';
import {
  Account,
  AccountKind,
  BudgetToastItem,
  DebtItem,
  Envelope,
  LoanRecord,
  MonthReflection,
  NavTab,
  PaydayTemplate,
  PersistedRegistry,
  ProfileData,
  ProfileMeta,
  ProfilePreferences,
  QuickPreset,
  RecurringTransaction,
  SideProjectData,
  ThemeMode,
  Transaction,
  TransactionType,
  ViewportMode,
} from '../types/finance';
import { computeBudgetMetrics, getMonthPrefix } from '../utils/budgetEngine';
import { getTodayIso } from '../utils/formatters';
import { hashPin, verifyPin } from '../utils/pinCrypto';
import { advanceRecurringDate, processDueRecurringTransactions } from '../utils/recurringEngine';
import {
  DEFAULT_PREFERENCES,
  INITIAL_PROFILES,
  createBlankProfileData,
  createSeedDataForProfile,
} from './seedData';

const REGISTRY_STORAGE_KEY = 'mizan:registry:v1';
const profileStorageKey = (profileId: string) => `mizan:profile:${profileId}:v1`;

function safeReadJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function safeRemoveKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors gracefully
  }
}

function hydrateProfileDefaults(data: ProfileData): ProfileData {
  return {
    ...data,
    monthlySavingsGoal: data.monthlySavingsGoal ?? 0,
    quickPresets: data.quickPresets ?? [],
    loans: data.loans ?? [],
    paydayTemplates: data.paydayTemplates ?? [],
    recurringTransactions: data.recurringTransactions ?? [],
    debts: data.debts ?? [],
    commuteTracker: data.commuteTracker ?? { kmPerTrip: 10, savingsPerTrip: 100, trips: [] },
    sideProject: data.sideProject ?? {
      name: 'Side Hustle P&L',
      plannedReserve: 0,
      invested: 0,
      revenue: 0,
      guardrails: [],
      nextMonthChecklist: [],
    },
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...data.preferences,
      enabledTrackers: {
        ...DEFAULT_PREFERENCES.enabledTrackers,
        ...(data.preferences?.enabledTrackers ?? {}),
        debtTracker: data.preferences?.enabledTrackers?.debtTracker ?? true,
      },
    },
  };
}

function loadOrSeedProfileData(profileId: string): ProfileData {
  const existing = safeReadJson<ProfileData>(profileStorageKey(profileId));
  const base =
    existing && existing.profileId === profileId
      ? hydrateProfileDefaults(existing)
      : hydrateProfileDefaults(
          profileId === 'personal' || profileId === 'family' || profileId === 'business'
            ? createSeedDataForProfile(profileId)
            : createBlankProfileData(profileId),
        );

  const { updatedData, postedTransactions } = processDueRecurringTransactions(base, getTodayIso());
  if (!existing || postedTransactions.length > 0) {
    safeWriteJson(profileStorageKey(profileId), updatedData);
  }
  return updatedData;
}

function loadInitialRegistry(): PersistedRegistry {
  const saved = safeReadJson<PersistedRegistry>(REGISTRY_STORAGE_KEY);
  if (saved && Array.isArray(saved.profiles) && saved.profiles.length > 0) {
    return saved;
  }
  const fresh: PersistedRegistry = {
    version: 1,
    theme: 'dark',
    viewportMode: 'auto',
    discreetMode: false,
    activeTab: 'overview',
    activeProfileId: 'personal',
    profiles: INITIAL_PROFILES,
  };
  safeWriteJson(REGISTRY_STORAGE_KEY, fresh);
  INITIAL_PROFILES.forEach((p) => {
    loadOrSeedProfileData(p.id);
  });
  return fresh;
}

const initialRegistry = loadInitialRegistry();
const initialActiveProfile =
  initialRegistry.profiles.find((p) => p.id === initialRegistry.activeProfileId) ??
  initialRegistry.profiles[0];

const startsLocked = Boolean(initialActiveProfile?.pinHash);
const initialActiveData: ProfileData = startsLocked
  ? createBlankProfileData(initialActiveProfile.id)
  : loadOrSeedProfileData(initialActiveProfile.id);

export interface MizanStoreState {
  theme: ThemeMode;
  viewportMode: ViewportMode;
  discreetMode: boolean;
  activeTab: NavTab;
  searchQuery: string;
  profiles: ProfileMeta[];
  activeProfileId: string;
  pendingProfileId: string | null;
  activeData: ProfileData;

  entrySheetOpen: boolean;
  entryInitialType: TransactionType;
  entryInitialDate: string | null;
  editingTransaction: Transaction | null;
  reportModalOpen: boolean;

  budgetToasts: BudgetToastItem[];
  dismissedAlertKeys: Record<string, boolean>;

  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setViewportMode: (mode: ViewportMode) => void;
  toggleDiscreetMode: () => void;
  setActiveTab: (tab: NavTab) => void;
  setSearchQuery: (query: string) => void;

  switchProfileRequest: (targetProfileId: string) => void;
  verifyPinAndUnlock: (pin: string) => Promise<boolean>;
  cancelPinChallenge: () => void;
  createProfile: (input: { name: string; currency: string; pin?: string }) => Promise<void>;
  deleteProfile: (profileId: string) => void;
  setProfilePin: (profileId: string, pin: string | null) => Promise<void>;

  openEntrySheet: (type?: TransactionType, initialDate?: string) => void;
  openEditTransaction: (tx: Transaction) => void;
  closeEntrySheet: () => void;
  openReportModal: () => void;
  closeReportModal: () => void;

  dismissBudgetToast: (id: string) => void;
  clearBudgetToasts: () => void;
  dismissBudgetAlertBanner: (envelopeId: string, threshold: 80 | 100) => void;

  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  importCsvTransactions: (txs: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  updateTransaction: (txId: string, patch: Omit<Transaction, 'id' | 'createdAt'>) => void;
  deleteTransaction: (txId: string) => void;
  bulkDeleteTransactions: (txIds: string[]) => void;

  moveEnvelopeMoney: (fromEnvelopeId: string, toEnvelopeId: string, amount: number) => void;
  assignCashToEnvelope: (envelopeId: string, delta: number) => void;
  setEnvelopeAssigned: (envelopeId: string, assigned: number) => void;
  createEnvelope: (env: Omit<Envelope, 'id'>) => void;

  createAccount: (acc: Omit<Account, 'id' | 'updatedAt'>) => void;
  updateAccount: (accountId: string, patch: { name: string; kind: AccountKind; balance: number }) => void;
  reconcileAccount: (accountId: string, actualBalance: number) => void;
  deleteAccount: (accountId: string) => void;
  updateAccountSectionLabels: (labels: { accounts?: string; vaults?: string }) => void;

  setMonthlySavingsGoal: (goal: number) => void;
  addQuickPreset: (preset: Omit<QuickPreset, 'id'>) => void;
  deleteQuickPreset: (presetId: string) => void;

  addLoan: (loan: Omit<LoanRecord, 'id' | 'status'>) => void;
  settleLoan: (loanId: string) => void;
  deleteLoan: (loanId: string) => void;

  addRecurringTransaction: (rule: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurringTransaction: (ruleId: string, patch: Partial<Omit<RecurringTransaction, 'id'>>) => void;
  toggleRecurringActive: (ruleId: string) => void;
  deleteRecurringTransaction: (ruleId: string) => void;
  runRecurringTransactionNow: (ruleId: string) => void;
  processAllDueRecurring: () => number;

  addDebt: (debt: Omit<DebtItem, 'id' | 'createdAt'>) => void;
  updateDebt: (debtId: string, patch: Partial<Omit<DebtItem, 'id' | 'createdAt'>>) => void;
  deleteDebt: (debtId: string) => void;
  recordDebtPayment: (debtId: string, amount: number, payFromAccountId?: string) => void;

  applyPaydayTemplate: (templateId: string, dateIso?: string) => void;
  addPaydayTemplate: (tpl: Omit<PaydayTemplate, 'id'>) => void;
  deletePaydayTemplate: (templateId: string) => void;

  logCommuteTrip: () => void;
  updateCommuteConfig: (kmPerTrip: number, savingsPerTrip: number) => void;
  deleteCommuteTrip: (tripId: string) => void;

  updateSideProject: (patch: Partial<SideProjectData>) => void;
  toggleProjectChecklist: (list: 'guardrails' | 'nextMonthChecklist', itemId: string) => void;
  addChecklistItem: (list: 'guardrails' | 'nextMonthChecklist', label: string) => void;

  updatePreferences: (patch: Partial<ProfilePreferences>) => void;
  dismissEveningNudgeForToday: () => void;

  saveReflection: (monthKey: string, reflection: Omit<MonthReflection, 'monthKey' | 'updatedAt'>) => void;
  importProfileBackup: (data: ProfileData) => void;
  resetActiveProfile: () => void;
}

function persistRegistry(
  state: Pick<
    MizanStoreState,
    'theme' | 'viewportMode' | 'discreetMode' | 'activeTab' | 'activeProfileId' | 'profiles'
  >,
) {
  safeWriteJson(REGISTRY_STORAGE_KEY, {
    version: 1,
    theme: state.theme,
    viewportMode: state.viewportMode,
    discreetMode: state.discreetMode,
    activeTab: state.activeTab,
    activeProfileId: state.activeProfileId,
    profiles: state.profiles,
  } satisfies PersistedRegistry);
}

function applyTransactionToAccounts(accounts: Account[], tx: Transaction, reverse = false): Account[] {
  const dir = reverse ? -1 : 1;
  const nowIso = new Date().toISOString();

  return accounts.map((acc) => {
    let delta = 0;
    if (tx.type === 'spend' && acc.id === tx.accountId) {
      delta = -tx.amount * dir;
    } else if (tx.type === 'income' && acc.id === tx.accountId) {
      delta = tx.amount * dir;
    } else if (tx.type === 'transfer') {
      if (acc.id === tx.accountId) delta = -tx.amount * dir;
      if (acc.id === tx.toAccountId) delta = tx.amount * dir;
    } else if (tx.type === 'borrow' && acc.id === tx.accountId) {
      delta = tx.amount * dir;
    } else if (tx.type === 'lend' && acc.id === tx.accountId) {
      delta = -tx.amount * dir;
    }
    if (delta === 0) return acc;
    return {
      ...acc,
      balance: acc.balance + delta,
      updatedAt: nowIso,
    };
  });
}

function commitProfileUpdate(
  set: (partial: Partial<MizanStoreState>) => void,
  activeProfileId: string,
  updated: ProfileData,
) {
  safeWriteJson(profileStorageKey(activeProfileId), updated);
  set({ activeData: updated });
}

function detectBudgetCrossings(
  prevData: ProfileData,
  nextData: ProfileData,
  currency: string,
): BudgetToastItem[] {
  const prevMetrics = computeBudgetMetrics(prevData);
  const nextMetrics = computeBudgetMetrics(nextData);
  const prevMap = new Map(prevMetrics.envelopeSummaries.map((s) => [s.envelope.id, s]));
  const nowIso = new Date().toISOString();
  const alerts: BudgetToastItem[] = [];

  for (const nextSummary of nextMetrics.envelopeSummaries) {
    if (nextSummary.envelope.assigned <= 0) continue;
    const prevSummary = prevMap.get(nextSummary.envelope.id);
    const prevPct = prevSummary ? prevSummary.percentUsed : 0;
    const nextPct = nextSummary.percentUsed;

    if (nextPct >= 100 && prevPct < 100) {
      alerts.push({
        id: `toast-${nextSummary.envelope.id}-100-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        envelopeId: nextSummary.envelope.id,
        envelopeName: nextSummary.envelope.name,
        threshold: 100,
        percentUsed: nextPct,
        spent: nextSummary.spent,
        assigned: nextSummary.envelope.assigned,
        currency,
        createdAt: nowIso,
      });
    } else if (nextPct >= 80 && nextPct < 100 && prevPct < 80) {
      alerts.push({
        id: `toast-${nextSummary.envelope.id}-80-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        envelopeId: nextSummary.envelope.id,
        envelopeName: nextSummary.envelope.name,
        threshold: 80,
        percentUsed: nextPct,
        spent: nextSummary.spent,
        assigned: nextSummary.envelope.assigned,
        currency,
        createdAt: nowIso,
      });
    }
  }

  return alerts;
}

export const useMizanStore = create<MizanStoreState>((set, get) => ({
  theme: initialRegistry.theme,
  viewportMode: initialRegistry.viewportMode ?? 'auto',
  discreetMode: initialRegistry.discreetMode ?? false,
  activeTab: initialRegistry.activeTab,
  searchQuery: '',
  profiles: initialRegistry.profiles,
  activeProfileId: initialActiveProfile.id,
  pendingProfileId: startsLocked ? initialActiveProfile.id : null,
  activeData: initialActiveData,

  entrySheetOpen: false,
  entryInitialType: 'spend',
  entryInitialDate: null,
  editingTransaction: null,
  reportModalOpen: false,

  budgetToasts: [],
  dismissedAlertKeys: {},

  setTheme: (theme) => {
    set({ theme });
    persistRegistry(get());
  },

  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setViewportMode: (viewportMode) => {
    set({ viewportMode });
    persistRegistry(get());
  },

  toggleDiscreetMode: () => {
    set((s) => ({ discreetMode: !s.discreetMode }));
    persistRegistry(get());
  },

  setActiveTab: (activeTab) => {
    set({ activeTab });
    persistRegistry(get());
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  switchProfileRequest: (targetProfileId) => {
    const { profiles, activeProfileId, pendingProfileId } = get();
    if (targetProfileId === activeProfileId && !pendingProfileId) return;
    const target = profiles.find((p) => p.id === targetProfileId);
    if (!target) return;

    if (target.pinHash) {
      set({ pendingProfileId: target.id });
      return;
    }

    const isolatedData = loadOrSeedProfileData(target.id);
    set({
      activeProfileId: target.id,
      pendingProfileId: null,
      activeData: isolatedData,
      searchQuery: '',
    });
    persistRegistry(get());
  },

  verifyPinAndUnlock: async (pin) => {
    const { pendingProfileId, profiles } = get();
    if (!pendingProfileId) return false;
    const target = profiles.find((p) => p.id === pendingProfileId);
    if (!target) return false;

    const ok = await verifyPin(pin, target.pinHash);
    if (!ok) return false;

    const isolatedData = loadOrSeedProfileData(target.id);
    set({
      activeProfileId: target.id,
      pendingProfileId: null,
      activeData: isolatedData,
      searchQuery: '',
    });
    persistRegistry(get());
    return true;
  },

  cancelPinChallenge: () => {
    const { activeProfileId, profiles, pendingProfileId } = get();
    if (pendingProfileId === activeProfileId) {
      const fallback = profiles.find((p) => !p.pinHash);
      if (fallback) {
        const data = loadOrSeedProfileData(fallback.id);
        set({
          activeProfileId: fallback.id,
          pendingProfileId: null,
          activeData: data,
        });
        persistRegistry(get());
      }
      return;
    }
    set({ pendingProfileId: null });
  },

  createProfile: async ({ name, currency, pin }) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const id = `prof-${Date.now().toString(36)}`;
    const words = cleanName.split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : cleanName.slice(0, 2).toUpperCase();

    const palette = ['#0D9488', '#2563EB', '#D97706', '#7C3AED', '#059669'];
    const accentColor = palette[get().profiles.length % palette.length];
    const pinHash = pin && /^\d{4}$/.test(pin) ? await hashPin(pin) : null;

    const newMeta: ProfileMeta = {
      id,
      name: cleanName,
      initials,
      accentColor,
      currency: currency || 'PKR',
      pinHash,
      createdAt: new Date().toISOString(),
    };

    const blankData = createBlankProfileData(id);
    safeWriteJson(profileStorageKey(id), blankData);

    set((state) => ({
      profiles: [...state.profiles, newMeta],
      activeProfileId: id,
      pendingProfileId: null,
      activeData: blankData,
      searchQuery: '',
    }));
    persistRegistry(get());
  },

  deleteProfile: (profileId) => {
    const { profiles, activeProfileId } = get();
    if (profiles.length <= 1) return;
    const remaining = profiles.filter((p) => p.id !== profileId);
    if (remaining.length === profiles.length) return;

    safeRemoveKey(profileStorageKey(profileId));

    if (activeProfileId === profileId) {
      const fallback = remaining.find((p) => !p.pinHash) ?? remaining[0];
      const nextLocked = Boolean(fallback.pinHash);
      const nextData = nextLocked
        ? createBlankProfileData(fallback.id)
        : loadOrSeedProfileData(fallback.id);

      set({
        profiles: remaining,
        activeProfileId: fallback.id,
        pendingProfileId: nextLocked ? fallback.id : null,
        activeData: nextData,
        searchQuery: '',
        budgetToasts: [],
      });
    } else {
      set({ profiles: remaining });
    }
    persistRegistry(get());
  },

  setProfilePin: async (profileId, pin) => {
    const nextHash = pin && /^\d{4}$/.test(pin) ? await hashPin(pin) : null;
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === profileId ? { ...p, pinHash: nextHash } : p)),
    }));
    persistRegistry(get());
  },

  openEntrySheet: (type = 'spend', initialDate) => {
    set({
      entrySheetOpen: true,
      entryInitialType: type,
      entryInitialDate: initialDate ?? null,
      editingTransaction: null,
    });
  },

  openEditTransaction: (tx) => {
    set({
      entrySheetOpen: true,
      entryInitialType: tx.type,
      entryInitialDate: tx.date,
      editingTransaction: tx,
    });
  },

  closeEntrySheet: () => {
    set({ entrySheetOpen: false, editingTransaction: null, entryInitialDate: null });
  },

  openReportModal: () => set({ reportModalOpen: true }),
  closeReportModal: () => set({ reportModalOpen: false }),

  dismissBudgetToast: (id) =>
    set((s) => ({ budgetToasts: s.budgetToasts.filter((t) => t.id !== id) })),

  clearBudgetToasts: () => set({ budgetToasts: [] }),

  dismissBudgetAlertBanner: (envelopeId, threshold) => {
    const { activeProfileId } = get();
    const key = `${activeProfileId}:${envelopeId}:${threshold}:${getMonthPrefix(new Date())}`;
    set((s) => ({
      dismissedAlertKeys: { ...s.dismissedAlertKeys, [key]: true },
    }));
  },

  addTransaction: (txInput) => {
    const { activeProfileId, activeData, profiles } = get();
    const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
    const newTx: Transaction = {
      ...txInput,
      id: `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updatedAccounts = applyTransactionToAccounts(activeData.accounts, newTx, false);
    const nextData: ProfileData = {
      ...activeData,
      accounts: updatedAccounts,
      transactions: [newTx, ...activeData.transactions],
    };
    const crossings = detectBudgetCrossings(activeData, nextData, currency);
    commitProfileUpdate(set, activeProfileId, nextData);
    if (crossings.length > 0) {
      set((s) => ({ budgetToasts: [...crossings, ...s.budgetToasts].slice(0, 4) }));
    }
    return newTx;
  },

  importCsvTransactions: (txInputs) => {
    const { activeProfileId, activeData } = get();
    if (txInputs.length === 0) return;
    let accounts = activeData.accounts;
    const nowIso = new Date().toISOString();
    const created: Transaction[] = txInputs.map((txInput, idx) => {
      const tx: Transaction = {
        ...txInput,
        id: `tx-csv-${Date.now().toString(36)}-${idx}`,
        createdAt: nowIso,
      };
      accounts = applyTransactionToAccounts(accounts, tx, false);
      return tx;
    });
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts,
      transactions: [...created, ...activeData.transactions],
    });
  },

  updateTransaction: (txId, patch) => {
    const { activeProfileId, activeData, profiles } = get();
    const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
    const existing = activeData.transactions.find((t) => t.id === txId);
    if (!existing) return;

    const revertedAccounts = applyTransactionToAccounts(activeData.accounts, existing, true);
    const updatedTx: Transaction = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
    };
    const nextAccounts = applyTransactionToAccounts(revertedAccounts, updatedTx, false);
    const nextData: ProfileData = {
      ...activeData,
      accounts: nextAccounts,
      transactions: activeData.transactions.map((t) => (t.id === txId ? updatedTx : t)),
    };
    const crossings = detectBudgetCrossings(activeData, nextData, currency);
    commitProfileUpdate(set, activeProfileId, nextData);
    if (crossings.length > 0) {
      set((s) => ({ budgetToasts: [...crossings, ...s.budgetToasts].slice(0, 4) }));
    }
  },

  deleteTransaction: (txId) => {
    const { activeProfileId, activeData } = get();
    const target = activeData.transactions.find((t) => t.id === txId);
    if (!target) return;
    const updatedAccounts = applyTransactionToAccounts(activeData.accounts, target, true);
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts: updatedAccounts,
      transactions: activeData.transactions.filter((t) => t.id !== txId),
    });
  },

  bulkDeleteTransactions: (txIds) => {
    if (txIds.length === 0) return;
    const { activeProfileId, activeData } = get();
    const idSet = new Set(txIds);
    let accounts = activeData.accounts;
    const remaining: Transaction[] = [];
    for (const tx of activeData.transactions) {
      if (idSet.has(tx.id)) {
        accounts = applyTransactionToAccounts(accounts, tx, true);
      } else {
        remaining.push(tx);
      }
    }
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts,
      transactions: remaining,
    });
  },

  moveEnvelopeMoney: (fromEnvelopeId, toEnvelopeId, amount) => {
    if (amount <= 0 || fromEnvelopeId === toEnvelopeId) return;
    const { activeProfileId, activeData, profiles } = get();
    const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
    const nextData: ProfileData = {
      ...activeData,
      envelopes: activeData.envelopes.map((env) => {
        if (env.id === fromEnvelopeId) return { ...env, assigned: Math.max(0, env.assigned - amount) };
        if (env.id === toEnvelopeId) return { ...env, assigned: env.assigned + amount };
        return env;
      }),
    };
    const crossings = detectBudgetCrossings(activeData, nextData, currency);
    commitProfileUpdate(set, activeProfileId, nextData);
    if (crossings.length > 0) {
      set((s) => ({ budgetToasts: [...crossings, ...s.budgetToasts].slice(0, 4) }));
    }
  },

  assignCashToEnvelope: (envelopeId, delta) => {
    const { activeProfileId, activeData, profiles } = get();
    const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
    const nextData: ProfileData = {
      ...activeData,
      envelopes: activeData.envelopes.map((env) =>
        env.id === envelopeId ? { ...env, assigned: Math.max(0, env.assigned + delta) } : env,
      ),
    };
    const crossings = detectBudgetCrossings(activeData, nextData, currency);
    commitProfileUpdate(set, activeProfileId, nextData);
    if (crossings.length > 0) {
      set((s) => ({ budgetToasts: [...crossings, ...s.budgetToasts].slice(0, 4) }));
    }
  },

  setEnvelopeAssigned: (envelopeId, assigned) => {
    const numeric = Number(assigned);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.max(0, numeric);
    const { activeProfileId, activeData, profiles } = get();
    const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
    const nextData: ProfileData = {
      ...activeData,
      envelopes: activeData.envelopes.map((env) =>
        env.id === envelopeId ? { ...env, assigned: clamped } : env,
      ),
    };
    const crossings = detectBudgetCrossings(activeData, nextData, currency);
    commitProfileUpdate(set, activeProfileId, nextData);
    if (crossings.length > 0) {
      set((s) => ({ budgetToasts: [...crossings, ...s.budgetToasts].slice(0, 4) }));
    }
  },

  createEnvelope: (envInput) => {
    const { activeProfileId, activeData } = get();
    const newEnv: Envelope = {
      ...envInput,
      id: `env-${Date.now().toString(36)}`,
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      envelopes: [...activeData.envelopes, newEnv],
    });
  },

  createAccount: (accInput) => {
    const { activeProfileId, activeData } = get();
    const newAcc: Account = {
      ...accInput,
      id: `acc-${Date.now().toString(36)}`,
      updatedAt: new Date().toISOString(),
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts: [...activeData.accounts, newAcc],
    });
  },

  updateAccount: (accountId, patch) => {
    const { activeProfileId, activeData } = get();
    const cleanName = patch.name.trim();
    if (!cleanName) return;
    const nowIso = new Date().toISOString();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts: activeData.accounts.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              name: cleanName,
              kind: patch.kind,
              balance: Number.isFinite(patch.balance) ? patch.balance : acc.balance,
              updatedAt: nowIso,
            }
          : acc,
      ),
    });
  },

  reconcileAccount: (accountId, actualBalance) => {
    const { activeProfileId, activeData } = get();
    const target = activeData.accounts.find((a) => a.id === accountId);
    if (!target || !Number.isFinite(actualBalance)) return;
    const delta = actualBalance - target.balance;
    const nowIso = new Date().toISOString();

    const updatedAccounts = activeData.accounts.map((acc) =>
      acc.id === accountId ? { ...acc, balance: actualBalance, updatedAt: nowIso } : acc,
    );

    let nextTransactions = activeData.transactions;
    if (Math.abs(delta) > 0.001) {
      const adjTx: Transaction = {
        id: `tx-rec-${Date.now().toString(36)}`,
        type: delta > 0 ? 'income' : 'spend',
        amount: Math.abs(delta),
        date: getTodayIso(),
        merchant: `Reconciliation · ${target.name}`,
        accountId,
        splits: [],
        tags: ['reconcile'],
        notes: 'Balance snapped to verified statement total.',
        createdAt: nowIso,
      };
      nextTransactions = [adjTx, ...activeData.transactions];
    }

    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts: updatedAccounts,
      transactions: nextTransactions,
    });
  },

  deleteAccount: (accountId) => {
    const { activeProfileId, activeData } = get();
    if (activeData.accounts.length <= 1) return;
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts: activeData.accounts.filter((acc) => acc.id !== accountId),
    });
  },

  updateAccountSectionLabels: (labels) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      sectionLabels: {
        ...activeData.sectionLabels,
        ...labels,
      },
    });
  },

  setMonthlySavingsGoal: (goal) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      monthlySavingsGoal: Math.max(0, Number(goal) || 0),
    });
  },

  addQuickPreset: (preset) => {
    const { activeProfileId, activeData } = get();
    const newPreset: QuickPreset = {
      ...preset,
      id: `pre-${Date.now().toString(36)}`,
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      quickPresets: [...(activeData.quickPresets ?? []), newPreset],
    });
  },

  deleteQuickPreset: (presetId) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      quickPresets: (activeData.quickPresets ?? []).filter((p) => p.id !== presetId),
    });
  },

  addLoan: (loanInput) => {
    const { activeProfileId, activeData } = get();
    const record: LoanRecord = {
      ...loanInput,
      id: `loan-${Date.now().toString(36)}`,
      status: 'open',
    };
    const delta = loanInput.kind === 'receivable' ? -loanInput.amount : loanInput.amount;
    const nowIso = new Date().toISOString();
    const updatedAccounts = activeData.accounts.map((acc) =>
      acc.id === loanInput.accountId ? { ...acc, balance: acc.balance + delta, updatedAt: nowIso } : acc,
    );
    const tx: Transaction = {
      id: `tx-loan-${Date.now().toString(36)}`,
      type: loanInput.kind === 'receivable' ? 'lend' : 'borrow',
      amount: loanInput.amount,
      date: loanInput.date,
      merchant: loanInput.description || `${loanInput.kind === 'receivable' ? 'Lent to' : 'Borrowed from'} ${loanInput.person}`,
      accountId: loanInput.accountId,
      counterparty: loanInput.person,
      splits: [],
      tags: [loanInput.kind],
      createdAt: nowIso,
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts: updatedAccounts,
      loans: [record, ...(activeData.loans ?? [])],
      transactions: [tx, ...activeData.transactions],
    });
  },

  settleLoan: (loanId) => {
    const { activeProfileId, activeData } = get();
    const target = (activeData.loans ?? []).find((l) => l.id === loanId);
    if (!target || target.status === 'settled') return;

    const nowIso = new Date().toISOString();
    const today = getTodayIso();
    // Receivable repaid -> cash comes back (+amount); Liability paid -> cash goes out (-amount)
    const delta = target.kind === 'receivable' ? target.amount : -target.amount;
    const updatedAccounts = activeData.accounts.map((acc) =>
      acc.id === target.accountId ? { ...acc, balance: acc.balance + delta, updatedAt: nowIso } : acc,
    );
    const tx: Transaction = {
      id: `tx-settle-${Date.now().toString(36)}`,
      type: target.kind === 'receivable' ? 'income' : 'spend',
      amount: target.amount,
      date: today,
      merchant:
        target.kind === 'receivable'
          ? `Loan Repaid · ${target.person}`
          : `Debt Settled · ${target.person}`,
      accountId: target.accountId,
      counterparty: target.person,
      splits: [],
      tags: ['settled', target.kind],
      createdAt: nowIso,
    };

    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts: updatedAccounts,
      loans: (activeData.loans ?? []).map((l) =>
        l.id === loanId ? { ...l, status: 'settled', settledAt: today } : l,
      ),
      transactions: [tx, ...activeData.transactions],
    });
  },

  deleteLoan: (loanId) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      loans: (activeData.loans ?? []).filter((l) => l.id !== loanId),
    });
  },

  addRecurringTransaction: (ruleInput) => {
    const { activeProfileId, activeData, profiles } = get();
    const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
    const newRule: RecurringTransaction = {
      ...ruleInput,
      id: `rec-${Date.now().toString(36)}`,
    };
    const withRule: ProfileData = {
      ...activeData,
      recurringTransactions: [newRule, ...(activeData.recurringTransactions ?? [])],
    };
    const { updatedData } = processDueRecurringTransactions(withRule, getTodayIso());
    const crossings = detectBudgetCrossings(activeData, updatedData, currency);
    commitProfileUpdate(set, activeProfileId, updatedData);
    if (crossings.length > 0) {
      set((s) => ({ budgetToasts: [...crossings, ...s.budgetToasts].slice(0, 4) }));
    }
  },

  updateRecurringTransaction: (ruleId, patch) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      recurringTransactions: (activeData.recurringTransactions ?? []).map((r) =>
        r.id === ruleId ? { ...r, ...patch } : r,
      ),
    });
  },

  toggleRecurringActive: (ruleId) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      recurringTransactions: (activeData.recurringTransactions ?? []).map((r) =>
        r.id === ruleId ? { ...r, active: !r.active } : r,
      ),
    });
  },

  deleteRecurringTransaction: (ruleId) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      recurringTransactions: (activeData.recurringTransactions ?? []).filter((r) => r.id !== ruleId),
    });
  },

  runRecurringTransactionNow: (ruleId) => {
    const { activeProfileId, activeData, profiles } = get();
    const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
    const rule = (activeData.recurringTransactions ?? []).find((r) => r.id === ruleId);
    if (!rule) return;
    const today = getTodayIso();
    const nowIso = new Date().toISOString();
    const newTx: Transaction = {
      id: `tx-rec-now-${Date.now().toString(36)}`,
      type: rule.type,
      amount: rule.amount,
      date: today,
      merchant: rule.title,
      accountId: rule.accountId || activeData.accounts[0]?.id || '',
      splits:
        rule.type === 'spend' && rule.envelopeId
          ? [{ id: `rec-sp-${Date.now()}`, envelopeId: rule.envelopeId, amount: rule.amount }]
          : [],
      tags: Array.from(new Set([...(rule.tags ?? []), 'recurring', rule.frequency])),
      notes: `Manual run · ${rule.frequency} schedule`,
      createdAt: nowIso,
    };

    const nextAccounts = applyTransactionToAccounts(activeData.accounts, newTx, false);
    const nextRun =
      rule.nextRunDate <= today ? advanceRecurringDate(today, rule.frequency) : rule.nextRunDate;

    const nextData: ProfileData = {
      ...activeData,
      accounts: nextAccounts,
      transactions: [newTx, ...activeData.transactions],
      recurringTransactions: (activeData.recurringTransactions ?? []).map((r) =>
        r.id === ruleId ? { ...r, lastRunDate: today, nextRunDate: nextRun } : r,
      ),
    };
    const crossings = detectBudgetCrossings(activeData, nextData, currency);
    commitProfileUpdate(set, activeProfileId, nextData);
    if (crossings.length > 0) {
      set((s) => ({ budgetToasts: [...crossings, ...s.budgetToasts].slice(0, 4) }));
    }
  },

  processAllDueRecurring: () => {
    const { activeProfileId, activeData, profiles } = get();
    const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
    const { updatedData, postedTransactions } = processDueRecurringTransactions(
      activeData,
      getTodayIso(),
    );
    if (postedTransactions.length === 0) return 0;
    const crossings = detectBudgetCrossings(activeData, updatedData, currency);
    commitProfileUpdate(set, activeProfileId, updatedData);
    if (crossings.length > 0) {
      set((s) => ({ budgetToasts: [...crossings, ...s.budgetToasts].slice(0, 4) }));
    }
    return postedTransactions.length;
  },

  addDebt: (debtInput) => {
    const { activeProfileId, activeData } = get();
    const newDebt: DebtItem = {
      ...debtInput,
      id: `debt-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      debts: [newDebt, ...(activeData.debts ?? [])],
    });
  },

  updateDebt: (debtId, patch) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      debts: (activeData.debts ?? []).map((d) => (d.id === debtId ? { ...d, ...patch } : d)),
    });
  },

  deleteDebt: (debtId) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      debts: (activeData.debts ?? []).filter((d) => d.id !== debtId),
    });
  },

  recordDebtPayment: (debtId, amount, payFromAccountId) => {
    const { activeProfileId, activeData } = get();
    const target = (activeData.debts ?? []).find((d) => d.id === debtId);
    if (!target || !Number.isFinite(amount) || amount <= 0) return;

    const applied = Math.min(target.currentBalance, amount);
    const nextBalance = Math.max(0, target.currentBalance - applied);
    const nowIso = new Date().toISOString();
    const today = getTodayIso();

    let nextAccounts = activeData.accounts;
    let nextTransactions = activeData.transactions;

    const sourceAccId = payFromAccountId || target.accountId;
    if (sourceAccId && activeData.accounts.some((a) => a.id === sourceAccId)) {
      const paymentTx: Transaction = {
        id: `tx-debt-${Date.now().toString(36)}`,
        type: 'spend',
        amount,
        date: today,
        merchant: `Debt Payment · ${target.name}`,
        accountId: sourceAccId,
        counterparty: target.lender,
        splits: [],
        tags: ['debt-payment'],
        notes: `Principal reduced to ${nextBalance}`,
        createdAt: nowIso,
      };
      nextAccounts = applyTransactionToAccounts(activeData.accounts, paymentTx, false);
      nextTransactions = [paymentTx, ...activeData.transactions];
    }

    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      accounts: nextAccounts,
      transactions: nextTransactions,
      debts: (activeData.debts ?? []).map((d) =>
        d.id === debtId ? { ...d, currentBalance: nextBalance } : d,
      ),
    });
  },

  applyPaydayTemplate: (templateId, dateIso) => {
    const { activeData } = get();
    const tpl = (activeData.paydayTemplates ?? []).find((t) => t.id === templateId);
    if (!tpl) return;
    get().addTransaction({
      type: tpl.type,
      amount: tpl.amount,
      date: dateIso ?? getTodayIso(),
      merchant: tpl.name,
      accountId: tpl.accountId || activeData.accounts[0]?.id || '',
      splits:
        tpl.type === 'spend' && tpl.envelopeId
          ? [{ id: `tpl-sp-${Date.now()}`, envelopeId: tpl.envelopeId, amount: tpl.amount }]
          : [],
      tags: ['template'],
    });
  },

  addPaydayTemplate: (tplInput) => {
    const { activeProfileId, activeData } = get();
    const tpl: PaydayTemplate = {
      ...tplInput,
      id: `tpl-${Date.now().toString(36)}`,
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      paydayTemplates: [...(activeData.paydayTemplates ?? []), tpl],
    });
  },

  deletePaydayTemplate: (templateId) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      paydayTemplates: (activeData.paydayTemplates ?? []).filter((t) => t.id !== templateId),
    });
  },

  logCommuteTrip: () => {
    const { activeProfileId, activeData } = get();
    const tracker = activeData.commuteTracker ?? { kmPerTrip: 10, savingsPerTrip: 100, trips: [] };
    const newTrip = {
      id: `ct-${Date.now().toString(36)}`,
      date: getTodayIso(),
      km: tracker.kmPerTrip,
      saved: tracker.savingsPerTrip,
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      commuteTracker: {
        ...tracker,
        trips: [newTrip, ...tracker.trips],
      },
    });
  },

  updateCommuteConfig: (kmPerTrip, savingsPerTrip) => {
    const { activeProfileId, activeData } = get();
    const tracker = activeData.commuteTracker ?? { kmPerTrip: 10, savingsPerTrip: 100, trips: [] };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      commuteTracker: {
        ...tracker,
        kmPerTrip: Math.max(1, kmPerTrip),
        savingsPerTrip: Math.max(0, savingsPerTrip),
      },
    });
  },

  deleteCommuteTrip: (tripId) => {
    const { activeProfileId, activeData } = get();
    const tracker = activeData.commuteTracker ?? { kmPerTrip: 10, savingsPerTrip: 100, trips: [] };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      commuteTracker: {
        ...tracker,
        trips: tracker.trips.filter((t) => t.id !== tripId),
      },
    });
  },

  updateSideProject: (patch) => {
    const { activeProfileId, activeData } = get();
    const curr = activeData.sideProject ?? {
      name: 'Side Hustle P&L',
      plannedReserve: 0,
      invested: 0,
      revenue: 0,
      guardrails: [],
      nextMonthChecklist: [],
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      sideProject: { ...curr, ...patch },
    });
  },

  toggleProjectChecklist: (list, itemId) => {
    const { activeProfileId, activeData } = get();
    const curr = activeData.sideProject ?? {
      name: 'Side Hustle P&L',
      plannedReserve: 0,
      invested: 0,
      revenue: 0,
      guardrails: [],
      nextMonthChecklist: [],
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      sideProject: {
        ...curr,
        [list]: curr[list].map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item,
        ),
      },
    });
  },

  addChecklistItem: (list, label) => {
    const clean = label.trim();
    if (!clean) return;
    const { activeProfileId, activeData } = get();
    const curr = activeData.sideProject ?? {
      name: 'Side Hustle P&L',
      plannedReserve: 0,
      invested: 0,
      revenue: 0,
      guardrails: [],
      nextMonthChecklist: [],
    };
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      sideProject: {
        ...curr,
        [list]: [...curr[list], { id: `chk-${Date.now().toString(36)}`, label: clean, checked: false }],
      },
    });
  },

  updatePreferences: (patch) => {
    const { activeProfileId, activeData } = get();
    const curr = activeData.preferences ?? DEFAULT_PREFERENCES;
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      preferences: {
        ...curr,
        ...patch,
        enabledTrackers: {
          ...curr.enabledTrackers,
          ...(patch.enabledTrackers ?? {}),
        },
      },
    });
  },

  dismissEveningNudgeForToday: () => {
    get().updatePreferences({ nudgeDismissedDate: getTodayIso() });
  },

  saveReflection: (monthKey, reflection) => {
    const { activeProfileId, activeData } = get();
    commitProfileUpdate(set, activeProfileId, {
      ...activeData,
      reflections: {
        ...activeData.reflections,
        [monthKey]: {
          monthKey,
          mood: reflection.mood,
          notes: reflection.notes,
          surprisedPrompt: reflection.surprisedPrompt,
          capComfortPrompt: reflection.capComfortPrompt,
          nextMonthChangePrompt: reflection.nextMonthChangePrompt,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  },

  importProfileBackup: (data) => {
    const { activeProfileId } = get();
    const normalized = hydrateProfileDefaults({
      ...data,
      profileId: activeProfileId,
    });
    commitProfileUpdate(set, activeProfileId, normalized);
  },

  resetActiveProfile: () => {
    const { activeProfileId } = get();
    const fresh =
      activeProfileId === 'personal' || activeProfileId === 'family' || activeProfileId === 'business'
        ? createSeedDataForProfile(activeProfileId)
        : createBlankProfileData(activeProfileId);
    commitProfileUpdate(set, activeProfileId, hydrateProfileDefaults(fresh));
  },
}));
