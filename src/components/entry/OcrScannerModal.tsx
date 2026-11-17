import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, FileText, Loader2, ScanLine, Upload, X } from 'lucide-react';
import { Envelope } from '../../types/finance';
import { ParsedOcrItem, simulateOcrReceiptParse } from '../../utils/categorizer';
import { formatCurrency, getTodayIso } from '../../utils/formatters';

interface OcrScannerModalProps {
  open: boolean;
  onClose: () => void;
  envelopes: Envelope[];
  currency: string;
  onApplyParsed: (payload: {
    merchant: string;
    date: string;
    items: ParsedOcrItem[];
  }) => void;
}

const SAMPLE_SOURCES = [
  { id: 'grocery-receipt.jpg', label: 'Al-Fatah Grocery Receipt' },
  { id: 'handwritten-diary.jpg', label: 'Handwritten Daily Diary' },
  { id: 'shell-fuel-slip.jpg', label: 'Shell Station Fuel Slip' },
];

export const OcrScannerModal: React.FC<OcrScannerModalProps> = ({
  open,
  onClose,
  envelopes,
  currency,
  onApplyParsed,
}) => {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'review'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(getTodayIso());
  const [confidence, setConfidence] = useState(95);
  const [items, setItems] = useState<ParsedOcrItem[]>([]);

  useEffect(() => {
    if (!open) {
      setPhase('idle');
      setPreviewUrl(null);
      setItems([]);
    }
  }, [open]);

  const startSimulatedExtraction = (name: string, objectUrl?: string) => {
    setSourceName(name);
    setPreviewUrl(objectUrl ?? null);
    setPhase('scanning');

    setTimeout(() => {
      const parsed = simulateOcrReceiptParse(name, envelopes, getTodayIso());
      setMerchant(parsed.merchant);
      setDate(parsed.date);
      setConfidence(parsed.confidence);
      setItems(parsed.items);
      setPhase('review');
    }, 900);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    startSimulatedExtraction(file.name, url);
  };

  const updateItem = (id: string, patch: Partial<ParsedOcrItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const includedItems = items.filter((i) => i.included && i.amount > 0);
  const totalExtracted = includedItems.reduce((sum, i) => sum + i.amount, 0);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ocr-scanner-title"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h2 id="ocr-scanner-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Receipt & Diary OCR Scanner
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close OCR scanner"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {phase === 'idle' && (
              <div className="mt-4 space-y-5">
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-7 cursor-pointer hover:border-teal-500 transition-colors text-center">
                  <Upload className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Upload receipt photo or handwritten diary page
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Processed locally in your browser — no cloud upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Or test immediately with a sample scan:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {SAMPLE_SOURCES.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => startSimulatedExtraction(sample.id)}
                        className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 text-left"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="truncate">{sample.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-spin" />
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Extracting line items from {sourceName}...
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detecting merchant totals and matching zero-based envelopes
                </p>
              </div>
            )}

            {phase === 'review' && (
              <div className="mt-4 space-y-4">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Uploaded receipt preview"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                  />
                )}

                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Extracted {items.length} line items ({confidence}% confidence)
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhase('idle')}
                    className="text-slate-500 hover:underline"
                  >
                    Rescan
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="ocr-merchant" className="block text-xs font-medium text-slate-500 mb-1">
                      Merchant / Source
                    </label>
                    <input
                      id="ocr-merchant"
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="ocr-date" className="block text-xs font-medium text-slate-500 mb-1">
                      Date
                    </label>
                    <input
                      id="ocr-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.included}
                          onChange={(e) => updateItem(item.id, { included: e.target.checked })}
                          aria-label={`Include ${item.description}`}
                          className="w-4 h-4 accent-teal-600"
                        />
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                        <input
                          type="number"
                          min="1"
                          value={item.amount}
                          onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) || 0 })}
                          className="w-24 text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-sm font-mono-num"
                        />
                      </div>

                      <select
                        value={item.envelopeId}
                        onChange={(e) => updateItem(item.id, { envelopeId: e.target.value })}
                        aria-label={`Envelope for ${item.description}`}
                        className="w-full min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
                      >
                        {envelopes.map((env) => (
                          <option key={env.id} value={env.id}>
                            {env.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">
                    Total to import:{' '}
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(totalExtracted, currency)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={includedItems.length === 0}
                    onClick={() => {
                      onApplyParsed({ merchant, date, items: includedItems });
                      onClose();
                    }}
                    className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    Use Extracted Items
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
