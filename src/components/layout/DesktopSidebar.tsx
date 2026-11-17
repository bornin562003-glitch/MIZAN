import React from 'react';
import { Scale } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { NAV_ITEMS } from './BottomNav';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export const DesktopSidebar: React.FC = () => {
  const activeTab = useMizanStore((s) => s.activeTab);
  const setActiveTab = useMizanStore((s) => s.setActiveTab);
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F172A]/60 min-h-full sticky top-0 h-full">
      {/* Brand Wordmark */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-teal-600/10 dark:bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400">
          <Scale className="w-5 h-5" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
          Mizan
        </span>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Primary desktop navigation" className="flex-1 px-3 py-5 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isActive
                  ? 'bg-teal-600/10 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile Summary & PWA Install */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <div className="text-xs text-slate-500 dark:text-slate-400 px-1">
          <div className="font-medium text-slate-700 dark:text-slate-200 truncate">
            {activeProfile?.name} Ledger
          </div>
          <div className="mt-0.5">
            {activeProfile?.currency} · Local Device Storage
          </div>
        </div>
        <PWAInstallButton />
      </div>
    </aside>
  );
};
