import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60">
      <svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        fill="none"
        aria-hidden="true"
        className="mb-5 text-teal-600 dark:text-teal-400"
      >
        <circle cx="44" cy="44" r="38" className="fill-slate-100 dark:fill-slate-800/70" />
        <path
          d="M44 22V62M31 62H57"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M25 32L44 26L63 32"
          className="stroke-slate-700 dark:stroke-slate-300"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25 32L19 47C19 50.5 22 53 25 53C28 53 31 50.5 31 47L25 32Z"
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M63 32L57 47C57 50.5 60 53 63 53C66 53 69 50.5 69 47L63 32Z"
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
