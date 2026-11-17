import React from 'react';
import { CalendarDays, Gauge, LayoutDashboard, Landmark, Wallet } from 'lucide-react';
import { NavTab } from '../../types/finance';
import { useMizanStore } from '../../store/useMizanStore';

export const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'envelopes', label: 'Envelopes', icon: Wallet },
  { id: 'pace', label: 'Daily Pace', icon: Gauge },
  { id: 'accounts', label: 'Accounts', icon: Landmark },
];

export const BottomNav: React.FC = () => {
  const activeTab = useMizanStore((s) => s.activeTab);
  const setActiveTab = useMizanStore((s) => s.setActiveTab);

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md pb-safe"
    >
      <div className="grid grid-cols-5 h-[60px] max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
