import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Download, FileText, X } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { computeBudgetMetrics } from '../../utils/budgetEngine';
import { generateStatementPdf } from '../../utils/exporters';
import { buildMonthlyReportData, formatMonthKeyLabel, getAvailableReportMonths } from '../../utils/reportHelpers';
import { PdfStatementTemplate } from './PdfStatementTemplate';

export const MonthlyReportModal: React.FC = () => {
  const open = useMizanStore((s) => s.reportModalOpen);
  const closeReportModal = useMizanStore((s) => s.closeReportModal);
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const availableMonths = useMemo(() => getAvailableReportMonths(activeData), [activeData]);
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] ?? new Date().toISOString().slice(0, 7));
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeLedger, setIncludeLedger] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const exportRef = useRef<HTMLDivElement | null>(null);

  const metrics = useMemo(() => computeBudgetMetrics(activeData), [activeData]);
  const effectiveMonth = availableMonths.includes(selectedMonth)
    ? selectedMonth
    : (availableMonths[0] ?? new Date().toISOString().slice(0, 7));

  const reportData = useMemo(
    () => buildMonthlyReportData(activeData, effectiveMonth),
    [activeData, effectiveMonth],
  );

  const handleDownloadPdf = async () => {
    if (!exportRef.current || busy) return;
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const slug = activeProfile.name.replace(/\s+/g, '-');
      await generateStatementPdf(
        exportRef.current,
        `Mizan-Report-${slug}-${effectiveMonth}.pdf`,
      );
      setStatusMsg('Monthly PDF report downloaded.');
    } catch {
      setErrorMsg('Unable to generate PDF report right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeReportModal}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-report-title"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative z-10 w-full sm:max-w-3xl max-h-[92%] flex flex-col rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 id="pdf-report-title" className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                    Monthly PDF Statement
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Preview & export formatted summary and ledger via jsPDF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReportModal}
                aria-label="Close report modal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Controls */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label htmlFor="report-month-select" className="sr-only">
                    Statement month
                  </label>
                  <select
                    id="report-month-select"
                    value={effectiveMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-medium text-slate-800 dark:text-slate-100"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthKeyLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Charts</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAccounts}
                    onChange={(e) => setIncludeAccounts(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Accounts</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLedger}
                    onChange={(e) => setIncludeLedger(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Ledger</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={busy}
                className="min-h-[42px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{busy ? 'Generating PDF...' : 'Download PDF Report'}</span>
              </button>
            </div>

            {statusMsg && (
              <div
                role="status"
                className="mx-5 mt-3 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="mx-5 mt-3 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-300"
              >
                {errorMsg}
              </div>
            )}

            {/* Live Formatted Statement Preview */}
            <div className="flex-1 overflow-auto p-4 sm:p-5 bg-slate-100/80 dark:bg-slate-950/70">
              <div className="mx-auto w-fit rounded-xl shadow-md border border-slate-200 overflow-hidden bg-white">
                <div className="w-[335px] sm:w-[620px] overflow-x-auto">
                  <div style={{ zoom: 0.78 }} className="hidden sm:block">
                    <PdfStatementTemplate
                      inlinePreview
                      profile={activeProfile}
                      data={activeData}
                      metrics={metrics}
                      reportData={reportData}
                      includeCharts={includeCharts}
                      includeAccounts={includeAccounts}
                      includeLedger={includeLedger}
                    />
                  </div>
                  <div style={{ zoom: 0.42 }} className="sm:hidden">
                    <PdfStatementTemplate
                      inlinePreview
                      profile={activeProfile}
                      data={activeData}
                      metrics={metrics}
                      reportData={reportData}
                      includeCharts={includeCharts}
                      includeAccounts={includeAccounts}
                      includeLedger={includeLedger}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Full-scale unscaled off-screen target for crisp html2canvas capture */}
            <PdfStatementTemplate
              statementRef={exportRef}
              profile={activeProfile}
              data={activeData}
              metrics={metrics}
              reportData={reportData}
              includeCharts={includeCharts}
              includeAccounts={includeAccounts}
              includeLedger={includeLedger}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
