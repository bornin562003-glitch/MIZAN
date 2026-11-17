import React, { useEffect, useState } from 'react';
import { BookOpenCheck, Check } from 'lucide-react';
import { MonthReflection } from '../../types/finance';
import { getMonthKey } from '../../utils/formatters';

interface MonthReflectionsProps {
  reflections: Record<string, MonthReflection>;
  onSave: (monthKey: string, data: Omit<MonthReflection, 'monthKey' | 'updatedAt'>) => void;
}

export const MonthReflections: React.FC<MonthReflectionsProps> = ({ reflections, onSave }) => {
  const monthKey = getMonthKey();
  const existing = reflections[monthKey];

  const [mood, setMood] = useState<MonthReflection['mood']>(existing?.mood ?? 'on_track');
  const [surprisedPrompt, setSurprisedPrompt] = useState(existing?.surprisedPrompt ?? '');
  const [capComfortPrompt, setCapComfortPrompt] = useState(existing?.capComfortPrompt ?? '');
  const [nextMonthChangePrompt, setNextMonthChangePrompt] = useState(
    existing?.nextMonthChangePrompt ?? '',
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setMood(existing?.mood ?? 'on_track');
    setSurprisedPrompt(existing?.surprisedPrompt ?? '');
    setCapComfortPrompt(existing?.capComfortPrompt ?? '');
    setNextMonthChangePrompt(existing?.nextMonthChangePrompt ?? '');
    setNotes(existing?.notes ?? '');
  }, [
    monthKey,
    existing?.mood,
    existing?.surprisedPrompt,
    existing?.capComfortPrompt,
    existing?.nextMonthChangePrompt,
    existing?.notes,
  ]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(monthKey, {
      mood,
      notes: notes.trim(),
      surprisedPrompt: surprisedPrompt.trim() || undefined,
      capComfortPrompt: capComfortPrompt.trim() || undefined,
      nextMonthChangePrompt: nextMonthChangePrompt.trim() || undefined,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <section
      aria-label="Month-end reflections"
      className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <BookOpenCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Guided Month-End Reflections ({monthKey})
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Capture spending lessons, cap comfort, and concrete adjustments for next month
      </p>

      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'on_track', label: 'On Track' },
              { id: 'tight', label: 'Felt Tight' },
              { id: 'overspent', label: 'Overspent' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMood(option.id)}
              className={`min-h-[42px] rounded-xl border text-xs font-medium transition-colors ${
                mood === option.id
                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="prompt-surprised" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Which envelope surprised me most?
            </label>
            <input
              id="prompt-surprised"
              type="text"
              value={surprisedPrompt}
              onChange={(e) => setSurprisedPrompt(e.target.value)}
              placeholder="e.g. Commute & Fuel"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 text-xs"
            />
          </div>
          <div>
            <label htmlFor="prompt-comfort" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Did my discretionary cap feel comfortable?
            </label>
            <input
              id="prompt-comfort"
              type="text"
              value={capComfortPrompt}
              onChange={(e) => setCapComfortPrompt(e.target.value)}
              placeholder="e.g. Yes, plenty of cushion"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 text-xs"
            />
          </div>
          <div>
            <label htmlFor="prompt-next" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              What will I change next month?
            </label>
            <input
              id="prompt-next"
              type="text"
              value={nextMonthChangePrompt}
              onChange={(e) => setNextMonthChangePrompt(e.target.value)}
              placeholder="e.g. Sweep 5k to Gold Vault"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 text-xs"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reflection-notes" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Additional Journal Notes
          </label>
          <textarea
            id="reflection-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Overall reflections, wins, or mindset notes..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
            {savedToast && (
              <>
                <Check className="w-3.5 h-3.5" />
                Saved to local journal
              </>
            )}
          </span>
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
          >
            Save Reflection
          </button>
        </div>
      </form>
    </section>
  );
};
