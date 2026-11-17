import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Banknote,
  Check,
  CheckCheck,
  CreditCard,
  HandCoins,
  Landmark,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Vault,
  X,
} from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { Account, AccountKind } from '../../types/finance';
import { formatCurrency, formatShortDate, getTodayIso } from '../../utils/formatters';
import { SettingsPanel } from './SettingsPanel';

const KIND_LABELS: Record<AccountKind, string> = {
  bank: 'Bank Account',
  cash: 'Cash Wallet',
  card: 'Card',
  vault: 'Vault',
  receivable: 'Receivable (Lent)',
  debt: 'Debt (Borrowed)',
};

export const AccountsTab: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const createAccount = useMizanStore((s) => s.createAccount);
  const updateAccount = useMizanStore((s) => s.updateAccount);
  const reconcileAccount = useMizanStore((s) => s.reconcileAccount);
  const deleteAccount = useMizanStore((s) => s.deleteAccount);
  const updateAccountSectionLabels = useMizanStore((s) => s.updateAccountSectionLabels);
  const addLoan = useMizanStore((s) => s.addLoan);
  const settleLoan = useMizanStore((s) => s.settleLoan);
  const deleteLoan = useMizanStore((s) => s.deleteLoan);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const currency = activeProfile?.currency ?? 'PKR';

  const accountItems = activeData.accounts.filter((a) => a.kind !== 'vault');
  const vaultItems = activeData.accounts.filter((a) => a.kind === 'vault');
  const netWorth = activeData.accounts.reduce((sum, a) => sum + a.balance, 0);
  const vaultTotal = vaultItems.reduce((sum, a) => sum + a.balance, 0);

  const accountsSectionName = activeData.sectionLabels?.accounts?.trim() || 'Accounts';
  const vaultsSectionName = activeData.sectionLabels?.vaults?.trim() || 'Vaults';

  const showLoans = activeData.preferences?.enabledTrackers.loansLending ?? true;
  const loans = activeData.loans ?? [];
  const receivables = loans.filter((l) => l.kind === 'receivable');
  const liabilities = loans.filter((l) => l.kind === 'liability');

  // Add account form state
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('bank');
  const [balance, setBalance] = useState('');

  // Edit account/vault modal state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editKind, setEditKind] = useState<AccountKind>('bank');
  const [editBalance, setEditBalance] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reconcile modal state
  const [reconcilingAccount, setReconcilingAccount] = useState<Account | null>(null);
  const [reconcileBalance, setReconcileBalance] = useState('');

  // Inline section heading rename state
  const [renamingSection, setRenamingSection] = useState<'accounts' | 'vaults' | null>(null);
  const [sectionDraft, setSectionDraft] = useState('');

  // Loan creation form state
  const [addingLoanKind, setAddingLoanKind] = useState<'receivable' | 'liability' | null>(null);
  const [loanPerson, setLoanPerson] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDesc, setLoanDesc] = useState('');
  const [loanReturnDate, setLoanReturnDate] = useState('');
  const [loanAccountId, setLoanAccountId] = useState(activeData.accounts[0]?.id ?? '');

  useEffect(() => {
    setLoanAccountId((prev) =>
      activeData.accounts.some((a) => a.id === prev) ? prev : activeData.accounts[0]?.id ?? '',
    );
  }, [activeProfileId, activeData.accounts]);

  const openAddForm = (defaultKind: AccountKind) => {
    setKind(defaultKind);
    setName('');
    setBalance('');
    setAdding(true);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createAccount({
      name: name.trim(),
      kind,
      balance: Number(balance) || 0,
    });
    setName('');
    setBalance('');
    setAdding(false);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditKind(acc.kind);
    setEditBalance(String(acc.balance));
    setConfirmDelete(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName.trim()) return;
    updateAccount(editingAccount.id, {
      name: editName.trim(),
      kind: editKind,
      balance: Number(editBalance) || 0,
    });
    setEditingAccount(null);
  };

  const handleDeleteEdit = () => {
    if (!editingAccount) return;
    deleteAccount(editingAccount.id);
    setEditingAccount(null);
  };

  const handleReconcileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingAccount) return;
    reconcileAccount(reconcilingAccount.id, Number(reconcileBalance) || 0);
    setReconcilingAccount(null);
  };

  const startRenameSection = (section: 'accounts' | 'vaults') => {
    setRenamingSection(section);
    setSectionDraft(section === 'accounts' ? accountsSectionName : vaultsSectionName);
  };

  const saveRenameSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingSection) return;
    const trimmed = sectionDraft.trim();
    if (trimmed) {
      updateAccountSectionLabels(
        renamingSection === 'accounts' ? { accounts: trimmed } : { vaults: trimmed },
      );
    }
    setRenamingSection(null);
  };

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(loanAmount);
    if (!addingLoanKind || !loanPerson.trim() || !Number.isFinite(amt) || amt <= 0) return;
    addLoan({
      kind: addingLoanKind,
      person: loanPerson.trim(),
      amount: amt,
      description: loanDesc.trim() || (addingLoanKind === 'receivable' ? 'Personal loan' : 'Borrowed amount'),
      accountId: loanAccountId || activeData.accounts[0]?.id || '',
      date: getTodayIso(),
      expectedReturnDate: loanReturnDate || undefined,
    });
    setLoanPerson('');
    setLoanAmount('');
    setLoanDesc('');
    setLoanReturnDate('');
    setAddingLoanKind(null);
  };

  const iconForKind = (k: AccountKind) => {
    if (k === 'cash') return <Banknote className="w-4 h-4" />;
    if (k === 'card') return <CreditCard className="w-4 h-4" />;
    if (k === 'vault') return <Vault className="w-4 h-4" />;
    if (k === 'receivable' || k === 'debt') return <HandCoins className="w-4 h-4" />;
    return <Landmark className="w-4 h-4" />;
  };

  const renderCard = (acc: Account) => (
    <div
      key={acc.id}
      className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-2.5"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            acc.kind === 'vault'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400'
          }`}
        >
          {iconForKind(acc.kind)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {acc.name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {KIND_LABELS[acc.kind]}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <div
          className={`text-sm sm:text-base font-bold font-mono-num mr-1 ${
            acc.balance < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {formatCurrency(acc.balance, currency, false, discreetMode)}
        </div>

        <button
          type="button"
          onClick={() => {
            setReconcilingAccount(acc);
            setReconcileBalance(String(acc.balance));
          }}
          aria-label={`Reconcile ${acc.name}`}
          title="Reconcile balance"
          className="h-[36px] w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Scale className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => openEditModal(acc)}
          aria-label={`Edit ${acc.name}`}
          className="h-[36px] w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      key={`accounts-${activeProfileId}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {accountsSectionName} & {vaultsSectionName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Net balance {formatCurrency(netWorth, currency, false, discreetMode)} across{' '}
            {accountItems.length} accounts and {vaultItems.length} vaults (
            {formatCurrency(vaultTotal, currency, false, discreetMode)} reserved)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => openAddForm('bank')}
            className="h-[40px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Account</span>
          </button>
          <button
            type="button"
            onClick={() => openAddForm('vault')}
            className="h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Vault className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Add Vault</span>
          </button>
        </div>
      </div>

      {/* Add Account / Vault Form */}
      {adding && (
        <form
          onSubmit={handleCreateAccount}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label htmlFor="acc-name" className="block text-xs font-medium text-slate-500 mb-1">
              {kind === 'vault' ? 'Vault Name' : 'Account Name'}
            </label>
            <input
              id="acc-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'vault' ? 'e.g. Gold Reserve Vault' : 'e.g. Meezan Savings'}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="acc-kind" className="block text-xs font-medium text-slate-500 mb-1">
              Type
            </label>
            <select
              id="acc-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as AccountKind)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
            >
              <option value="bank">Bank Account</option>
              <option value="vault">Vault</option>
              <option value="cash">Cash Wallet</option>
              <option value="card">Card</option>
              <option value="receivable">Receivable (Lent)</option>
              <option value="debt">Debt (Borrowed)</option>
            </select>
          </div>
          <div>
            <label htmlFor="acc-balance" className="block text-xs font-medium text-slate-500 mb-1">
              Price / Balance ({currency})
            </label>
            <input
              id="acc-balance"
              type="number"
              step="any"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Accounts Section */}
      <section aria-label={accountsSectionName} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {renamingSection === 'accounts' ? (
            <form onSubmit={saveRenameSection} className="flex items-center gap-2">
              <label htmlFor="rename-accounts-section" className="sr-only">
                Accounts section name
              </label>
              <input
                id="rename-accounts-section"
                type="text"
                autoFocus
                value={sectionDraft}
                onChange={(e) => setSectionDraft(e.target.value)}
                className="min-h-[38px] rounded-xl border border-teal-500 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
              />
              <button
                type="submit"
                aria-label="Save accounts section name"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-teal-600 text-white"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRenamingSection(null)}
                aria-label="Cancel renaming accounts section"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {accountsSectionName}
              </h2>
              <button
                type="button"
                onClick={() => startRenameSection('accounts')}
                aria-label="Rename accounts section"
                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
            {accountItems.length} {accountItems.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountItems.map(renderCard)}
        </div>
      </section>

      {/* Vaults Section */}
      <section aria-label={vaultsSectionName} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {renamingSection === 'vaults' ? (
            <form onSubmit={saveRenameSection} className="flex items-center gap-2">
              <label htmlFor="rename-vaults-section" className="sr-only">
                Vaults section name
              </label>
              <input
                id="rename-vaults-section"
                type="text"
                autoFocus
                value={sectionDraft}
                onChange={(e) => setSectionDraft(e.target.value)}
                className="min-h-[38px] rounded-xl border border-teal-500 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
              />
              <button
                type="submit"
                aria-label="Save vaults section name"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-teal-600 text-white"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRenamingSection(null)}
                aria-label="Cancel renaming vaults section"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {vaultsSectionName}
              </h2>
              <button
                type="button"
                onClick={() => startRenameSection('vaults')}
                aria-label="Rename vaults section"
                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
            {formatCurrency(vaultTotal, currency, false, discreetMode)}
          </span>
        </div>

        {vaultItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Vault className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No vaults added yet
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Create dedicated savings, emergency, or asset vaults to separate reserves from daily spending cash.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAddForm('vault')}
              className="min-h-[42px] px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Vault</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaultItems.map(renderCard)}
          </div>
        )}
      </section>

      {/* Owed to You (Loans Receivable) & Liabilities Section */}
      {showLoans && (
        <section aria-label="Loans receivable and liabilities" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Loans & Lending
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track money owed to you and personal liabilities with 1-tap settlement
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAddingLoanKind('receivable')}
                className="h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-teal-700 dark:text-teal-300 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Lend Money</span>
              </button>
              <button
                type="button"
                onClick={() => setAddingLoanKind('liability')}
                className="h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Record Liability</span>
              </button>
            </div>
          </div>

          {addingLoanKind && (
            <form
              onSubmit={handleCreateLoan}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {addingLoanKind === 'receivable' ? 'Borrower Name' : 'Lender Name'}
                </label>
                <input
                  type="text"
                  required
                  value={loanPerson}
                  onChange={(e) => setLoanPerson(e.target.value)}
                  placeholder="e.g. Adeel"
                  className="w-full min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Account
                </label>
                <select
                  value={loanAccountId}
                  onChange={(e) => setLoanAccountId(e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
                >
                  {activeData.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Expected Return
                </label>
                <input
                  type="date"
                  value={loanReturnDate}
                  onChange={(e) => setLoanReturnDate(e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="flex-1 min-h-[38px] rounded-xl bg-teal-600 text-white text-xs font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAddingLoanKind(null)}
                  className="min-h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Owed to You */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span>Owed to You (Receivable)</span>
                <span className="font-mono-num text-teal-600 dark:text-teal-400">
                  {formatCurrency(
                    receivables.filter((l) => l.status === 'open').reduce((s, l) => s + l.amount, 0),
                    currency,
                    false,
                    discreetMode,
                  )}
                </span>
              </div>
              {receivables.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No active loans lent out.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {receivables.map((loan) => (
                    <div key={loan.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {loan.person}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {loan.description}
                          {loan.expectedReturnDate ? ` · Due ${formatShortDate(loan.expectedReturnDate)}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono-num font-semibold text-slate-900 dark:text-slate-100 sm:min-w-[88px] sm:text-right">
                          {formatCurrency(loan.amount, currency, false, discreetMode)}
                        </span>
                        {loan.status === 'open' ? (
                          <button
                            type="button"
                            onClick={() => settleLoan(loan.id)}
                            className="h-[34px] min-w-[104px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium inline-flex items-center justify-center gap-1 whitespace-nowrap"
                          >
                            <CheckCheck className="w-3 h-3 shrink-0" />
                            <span>Mark Repaid</span>
                          </button>
                        ) : (
                          <span className="h-[34px] min-w-[104px] inline-flex items-center justify-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            Repaid
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteLoan(loan.id)}
                          aria-label={`Remove loan ${loan.person}`}
                          className="h-[34px] w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liabilities */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span>Liabilities (You Owe)</span>
                <span className="font-mono-num text-rose-600 dark:text-rose-400">
                  {formatCurrency(
                    liabilities.filter((l) => l.status === 'open').reduce((s, l) => s + l.amount, 0),
                    currency,
                    false,
                    discreetMode,
                  )}
                </span>
              </div>
              {liabilities.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No open liabilities tracked.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {liabilities.map((loan) => (
                    <div key={loan.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {loan.person}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {loan.description}
                          {loan.expectedReturnDate ? ` · Due ${formatShortDate(loan.expectedReturnDate)}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono-num font-semibold text-slate-900 dark:text-slate-100 sm:min-w-[88px] sm:text-right">
                          {formatCurrency(loan.amount, currency, false, discreetMode)}
                        </span>
                        {loan.status === 'open' ? (
                          <button
                            type="button"
                            onClick={() => settleLoan(loan.id)}
                            className="h-[34px] min-w-[104px] px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium inline-flex items-center justify-center gap-1 whitespace-nowrap"
                          >
                            <CheckCheck className="w-3 h-3 shrink-0" />
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <span className="h-[34px] min-w-[104px] inline-flex items-center justify-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            Paid
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteLoan(loan.id)}
                          aria-label={`Remove liability ${loan.person}`}
                          className="h-[34px] w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Reconcile Account Modal */}
      <AnimatePresence>
        {reconcilingAccount && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReconcilingAccount(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="reconcile-account-title"
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="relative z-10 w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 id="reconcile-account-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Reconcile {reconcilingAccount.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setReconcilingAccount(null)}
                  aria-label="Close reconcile modal"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your verified bank or wallet balance. Any variance is automatically logged as a reconciliation entry.
              </p>
              <form onSubmit={handleReconcileSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reconcile-balance" className="block text-xs font-medium text-slate-500 mb-1">
                    Verified Balance ({currency})
                  </label>
                  <input
                    id="reconcile-balance"
                    type="number"
                    step="any"
                    required
                    autoFocus
                    value={reconcileBalance}
                    onChange={(e) => setReconcileBalance(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-base font-mono-num font-semibold"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReconcilingAccount(null)}
                    className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[42px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                  >
                    Snap Balance
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Account / Vault Modal */}
      <AnimatePresence>
        {editingAccount && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAccount(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-account-title"
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="relative z-10 w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 id="edit-account-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Edit {editingAccount.kind === 'vault' ? 'Vault' : 'Account'}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  aria-label="Close edit modal"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label htmlFor="edit-acc-name" className="block text-xs font-medium text-slate-500 mb-1">
                    Name
                  </label>
                  <input
                    id="edit-acc-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-acc-kind" className="block text-xs font-medium text-slate-500 mb-1">
                      Type
                    </label>
                    <select
                      id="edit-acc-kind"
                      value={editKind}
                      onChange={(e) => setEditKind(e.target.value as AccountKind)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
                    >
                      <option value="bank">Bank Account</option>
                      <option value="vault">Vault</option>
                      <option value="cash">Cash Wallet</option>
                      <option value="card">Card</option>
                      <option value="receivable">Receivable</option>
                      <option value="debt">Debt</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="edit-acc-balance" className="block text-xs font-medium text-slate-500 mb-1">
                      Price / Balance ({currency})
                    </label>
                    <input
                      id="edit-acc-balance"
                      type="number"
                      step="any"
                      required
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm font-mono-num font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  {activeData.accounts.length > 1 ? (
                    !confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="min-h-[44px] px-3 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDeleteEdit}
                        className="min-h-[44px] px-3 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                      >
                        Confirm Delete
                      </button>
                    )
                  ) : (
                    <span className="text-[11px] text-slate-400">Primary account kept</span>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setEditingAccount(null)}
                      className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings, Privacy, PIN Security, CSV/JSON Export & PDF Statements */}
      <SettingsPanel />
    </motion.div>
  );
};
