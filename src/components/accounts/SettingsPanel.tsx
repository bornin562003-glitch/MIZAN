import React, { useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Lock,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { computeBudgetMetrics } from '../../utils/budgetEngine';
import {
  exportTransactionsToCsv,
  generateStatementPdf,
  parseImportedTransactionsCsv,
  triggerFileDownload,
  validateImportedProfileJson,
} from '../../utils/exporters';
import { ViewportModeSelector } from '../layout/ViewportBar';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { PdfStatementTemplate } from '../reports/PdfStatementTemplate';

export const SettingsPanel: React.FC = () => {
  const theme = useMizanStore((s) => s.theme);
  const toggleTheme = useMizanStore((s) => s.toggleTheme);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const toggleDiscreetMode = useMizanStore((s) => s.toggleDiscreetMode);
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const setProfilePin = useMizanStore((s) => s.setProfilePin);
  const importProfileBackup = useMizanStore((s) => s.importProfileBackup);
  const importCsvTransactions = useMizanStore((s) => s.importCsvTransactions);
  const updatePreferences = useMizanStore((s) => s.updatePreferences);
  const resetActiveProfile = useMizanStore((s) => s.resetActiveProfile);
  const openReportModal = useMizanStore((s) => s.openReportModal);
  const createProfile = useMizanStore((s) => s.createProfile);
  const deleteProfile = useMizanStore((s) => s.deleteProfile);
  const switchProfileRequest = useMizanStore((s) => s.switchProfileRequest);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const metrics = useMemo(() => computeBudgetMetrics(activeData), [activeData]);
  const statementRef = useRef<HTMLDivElement | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const [pinInput, setPinInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Profile Management state
  const [addingProfile, setAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileCurrency, setNewProfileCurrency] = useState('PKR');
  const [newProfilePin, setNewProfilePin] = useState('');
  const [confirmDeleteProfileId, setConfirmDeleteProfileId] = useState<string | null>(null);

  const prefs = activeData.preferences;

  const flashStatus = (msg: string) => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    setErrorMsg(null);
    setStatusMessage(msg);
    statusTimerRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      statusTimerRef.current = null;
    }, 5000);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      setErrorMsg('PIN must be exactly 4 digits.');
      return;
    }
    await setProfilePin(activeProfile.id, pinInput);
    setPinInput('');
    flashStatus(`4-digit PIN enabled for ${activeProfile.name}.`);
  };

  const handleRemovePin = async () => {
    await setProfilePin(activeProfile.id, null);
    flashStatus(`PIN lock removed for ${activeProfile.name}.`);
  };

  const handleExportCsv = () => {
    const csv = exportTransactionsToCsv(activeProfile, activeData);
    triggerFileDownload(
      csv,
      `mizan-${activeProfile.name.toLowerCase().replace(/\s+/g, '-')}.csv`,
      'text/csv;charset=utf-8',
    );
    flashStatus('CSV ledger exported.');
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = parseImportedTransactionsCsv(text, activeData);
    if (res.error) {
      setErrorMsg(res.error);
      e.target.value = '';
      return;
    }
    importCsvTransactions(res.transactions);
    flashStatus(`Imported ${res.transactions.length} transactions from CSV into ${activeProfile.name}.`);
    e.target.value = '';
  };

  const handleExportJson = () => {
    const json = JSON.stringify(activeData, null, 2);
    triggerFileDownload(
      json,
      `mizan-backup-${activeProfile.name.toLowerCase().replace(/\s+/g, '-')}.json`,
      'application/json',
    );
    flashStatus('JSON backup downloaded.');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = validateImportedProfileJson(text);
    if (!res.data) {
      setErrorMsg(res.error ?? 'Failed to import backup.');
      return;
    }
    importProfileBackup(res.data);
    flashStatus(`Restored backup into ${activeProfile.name}.`);
    e.target.value = '';
  };

  const handleExportPdf = async () => {
    if (!statementRef.current || pdfBusy) return;
    setPdfBusy(true);
    setErrorMsg(null);
    try {
      const monthSlug = new Date().toISOString().slice(0, 7);
      await generateStatementPdf(
        statementRef.current,
        `Mizan-Statement-${activeProfile.name.replace(/\s+/g, '-')}-${monthSlug}.pdf`,
      );
      flashStatus('Monthly PDF statement generated.');
    } catch {
      setErrorMsg('Unable to generate PDF statement right now.');
    } finally {
      setPdfBusy(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) {
      setErrorMsg('Enter a profile name.');
      return;
    }
    if (newProfilePin && !/^\d{4}$/.test(newProfilePin)) {
      setErrorMsg('Profile PIN must be 4 digits or left blank.');
      return;
    }
    await createProfile({
      name: newProfileName.trim(),
      currency: newProfileCurrency,
      pin: newProfilePin || undefined,
    });
    const createdName = newProfileName.trim();
    setNewProfileName('');
    setNewProfilePin('');
    setAddingProfile(false);
    flashStatus(`Created and switched to profile "${createdName}".`);
  };

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <section aria-label="Settings, security, and local backups" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Privacy, Preferences, Backups & Statements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure discreet masking, optional trackers, evening check-in, PIN lock, and local exports
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Appearance, Privacy & Security Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Color Theme
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Currently using {theme === 'dark' ? 'Deep Slate Dark' : 'Crisp Light'} mode
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="h-[38px] min-w-[118px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          {/* Discreet Mode */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Discreet Privacy Mode
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Mask all currency balances with •••• in public spaces
              </div>
            </div>
            <button
              type="button"
              onClick={toggleDiscreetMode}
              aria-pressed={discreetMode}
              className={`h-[38px] min-w-[118px] px-3.5 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap transition-colors ${
                discreetMode
                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {discreetMode ? <EyeOff className="w-4 h-4 shrink-0" /> : <Eye className="w-4 h-4 shrink-0" />}
              <span>{discreetMode ? 'Masked' : 'Visible'}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Window Layout & Screen Ratio
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between Mobile (9:19.5), Desktop (16:10), or Auto Fit mode
            </p>
            <div className="overflow-x-auto pb-0.5">
              <ViewportModeSelector />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Profile PIN Lock ({activeProfile.name})
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {activeProfile.pinHash ? 'Protected' : 'Unlocked'}
              </span>
            </div>

            <form onSubmit={(e) => void handleSavePin(e)} className="flex items-center gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter 4-digit PIN"
                aria-label="New 4-digit PIN"
                className="flex-1 h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num"
              />
              <button
                type="submit"
                className="h-[40px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium whitespace-nowrap"
              >
                {activeProfile.pinHash ? 'Update PIN' : 'Enable PIN'}
              </button>
              {activeProfile.pinHash && (
                <button
                  type="button"
                  onClick={() => void handleRemovePin()}
                  className="h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap"
                >
                  Remove
                </button>
              )}
            </form>
          </div>

          <div className="pt-2">
            <PWAInstallButton />
          </div>

          {/* App Profiles Management */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  App Profiles ({profiles.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAddingProfile((v) => !v)}
                className="h-[36px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-teal-700 dark:text-teal-300 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Profile</span>
              </button>
            </div>

            {addingProfile && (
              <form
                onSubmit={(e) => void handleCreateProfile(e)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Profile name"
                    aria-label="New profile name"
                    className="sm:col-span-2 min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                  />
                  <select
                    value={newProfileCurrency}
                    onChange={(e) => setNewProfileCurrency(e.target.value)}
                    aria-label="New profile currency"
                    className="min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newProfilePin}
                    onChange={(e) => setNewProfilePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Optional 4-digit PIN"
                    aria-label="New profile optional PIN"
                    className="flex-1 min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono-num"
                  />
                  <button
                    type="submit"
                    className="min-h-[38px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingProfile(false)}
                    className="min-h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              {profiles.map((p) => {
                const isCurrent = p.id === activeProfileId;
                const isConfirming = confirmDeleteProfileId === p.id;
                return (
                  <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => switchProfileRequest(p.id)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                    >
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                        style={{ backgroundColor: p.accentColor }}
                      >
                        {p.initials}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {p.name} {isCurrent && <span className="text-teal-600 dark:text-teal-400">· Active</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.currency}</div>
                      </div>
                    </button>

                    {profiles.length > 1 && (
                      <div className="shrink-0">
                        {!isConfirming ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProfileId(p.id)}
                            aria-label={`Delete ${p.name} profile`}
                            className="min-h-[32px] px-2.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deleteProfile(p.id);
                                setConfirmDeleteProfileId(null);
                                flashStatus(`Deleted profile "${p.name}".`);
                              }}
                              className="min-h-[30px] px-2.5 rounded-lg bg-rose-600 text-white text-[11px] font-semibold"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProfileId(null)}
                              className="min-h-[30px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reminders, Optional Trackers & Export/Backup Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-5">
          {/* Evening Check-in Nudge */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Evening Check-In Nudge
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updatePreferences({ eveningNudgeEnabled: !(prefs?.eveningNudgeEnabled ?? true) })
                }
                aria-pressed={prefs?.eveningNudgeEnabled ?? true}
                className={`h-[36px] min-w-[84px] px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center whitespace-nowrap ${
                  prefs?.eveningNudgeEnabled
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {prefs?.eveningNudgeEnabled ? 'Enabled' : 'Off'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Reminder window start time</span>
              <input
                type="time"
                aria-label="Evening check-in reminder time"
                value={prefs?.eveningNudgeTime ?? '21:00'}
                onChange={(e) => updatePreferences({ eveningNudgeTime: e.target.value })}
                className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-mono-num"
              />
            </div>
          </div>

          {/* Optional Tracker Modules */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Optional Tracker Modules
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(
                [
                  { key: 'dailyPaceKpi', label: 'Safe Daily Pace KPI' },
                  { key: 'debtTracker', label: 'Debt & Loan Repayment' },
                  { key: 'loansLending', label: 'Loans & Lending' },
                  { key: 'sideHustlePnl', label: 'Side-Hustle P&L' },
                  { key: 'commuteSavings', label: 'Commute Savings Tracker' },
                ] as const
              ).map((item) => {
                const checked = prefs?.enabledTrackers[item.key] ?? true;
                return (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        updatePreferences({
                          enabledTrackers: {
                            ...(prefs?.enabledTrackers ?? {
                              dailyPaceKpi: true,
                              debtTracker: true,
                              loansLending: true,
                              sideHustlePnl: true,
                              commuteSavings: true,
                            }),
                            [item.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Exports & CSV/JSON Imports */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Data Export, CSV Import & Statements
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportCsv}
                className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Export CSV</span>
              </button>

              <label className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Import CSV Ledger</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void handleImportCsv(e)}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={handleExportJson}
                className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Export JSON Backup</span>
              </button>

              <label className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => void handleImportJson(e)}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleExportPdf()}
                disabled={pdfBusy}
                className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-60 text-xs font-medium inline-flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>{pdfBusy ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={openReportModal}
                className="min-h-[42px] px-3.5 rounded-xl border border-teal-600/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-medium inline-flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Customize PDF</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Restore {activeProfile.name} to initial ledger state
            </span>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="min-h-[38px] px-3 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Profile
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    resetActiveProfile();
                    setConfirmReset(false);
                    flashStatus(`${activeProfile.name} ledger reset.`);
                  }}
                  className="min-h-[36px] px-3 rounded-lg bg-rose-600 text-white text-xs font-medium"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PdfStatementTemplate
        statementRef={statementRef}
        profile={activeProfile}
        data={activeData}
        metrics={metrics}
        monthLabel={monthLabel}
      />
    </section>
  );
};
