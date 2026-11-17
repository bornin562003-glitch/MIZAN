import React, { useState } from 'react';
import { ChevronDown, Eye, EyeOff, Lock, Monitor, Moon, Plus, Search, Smartphone, Sun, X } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface TopBarProps {
  onOpenProfileSwitcher: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenProfileSwitcher }) => {
  const theme = useMizanStore((s) => s.theme);
  const toggleTheme = useMizanStore((s) => s.toggleTheme);
  const viewportMode = useMizanStore((s) => s.viewportMode);
  const setViewportMode = useMizanStore((s) => s.setViewportMode);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const toggleDiscreetMode = useMizanStore((s) => s.toggleDiscreetMode);
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const searchQuery = useMizanStore((s) => s.searchQuery);
  const setSearchQuery = useMizanStore((s) => s.setSearchQuery);
  const openEntrySheet = useMizanStore((s) => s.openEntrySheet);

  const [searchOpen, setSearchOpen] = useState(false);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const isCurrentlyDesktop =
    viewportMode === 'desktop' ||
    (viewportMode === 'auto' && typeof window !== 'undefined' && window.innerWidth >= 1024);

  const handleToggleViewport = () => {
    setViewportMode(isCurrentlyDesktop ? 'mobile' : 'desktop');
  };

  return (
    <header className="sticky top-0 z-30 h-14 lg:h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0B1120]/85 backdrop-blur-md">
      <div className="h-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
        {/* Left: Profile Switcher Avatar Trigger */}
        <div className={`items-center gap-2 min-w-0 ${searchOpen ? 'hidden sm:flex' : 'flex'}`}>
          <button
            type="button"
            onClick={onOpenProfileSwitcher}
            aria-label={`Switch profile, current ${activeProfile?.name ?? 'Personal'}`}
            className="min-h-[44px] flex items-center gap-2 pr-2 pl-1 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 whitespace-nowrap shrink-0"
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ backgroundColor: activeProfile?.accentColor ?? '#0D9488' }}
            >
              {activeProfile?.initials ?? 'PR'}
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[84px] sm:max-w-[160px]">
              {activeProfile?.name ?? 'Personal'}
            </span>
            {activeProfile?.pinHash && (
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          </button>
        </div>

        {/* Center/Right: Search, Discreet Mode, Viewport Switcher, Theme Toggle, PWA Install, Add Entry */}
        <div className={`flex items-center gap-0.5 sm:gap-1.5 ${searchOpen ? 'flex-1 sm:flex-initial justify-end min-w-0' : 'shrink-0'}`}>
          {searchOpen ? (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-xl px-2.5 h-10 border border-slate-200 dark:border-slate-700 flex-1 sm:flex-initial min-w-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <label htmlFor="top-search-input" className="sr-only">
                Search ledger
              </label>
              <input
                id="top-search-input"
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger..."
                className="w-full sm:w-44 min-w-0 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                aria-label="Close search"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              className="min-h-[42px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
          )}

          {!searchOpen && (
            <button
              type="button"
              onClick={toggleDiscreetMode}
              aria-pressed={discreetMode}
              aria-label={discreetMode ? 'Show balances' : 'Mask balances (Discreet mode)'}
              title={discreetMode ? 'Discreet mode on — balances hidden' : 'Hide balances (Discreet mode)'}
              className={`min-h-[42px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                discreetMode
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {discreetMode ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          )}

          {!searchOpen && (
            <button
              type="button"
              onClick={handleToggleViewport}
              aria-label={isCurrentlyDesktop ? 'Switch to mobile view' : 'Switch to desktop view'}
              title={isCurrentlyDesktop ? 'Switch to Mobile view (9:19.5)' : 'Switch to Desktop view (16:10)'}
              className="min-h-[42px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {isCurrentlyDesktop ? (
                <Smartphone className="w-[18px] h-[18px]" />
              ) : (
                <Monitor className="w-[18px] h-[18px]" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-h-[42px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <div className="hidden sm:block lg:hidden">
            <PWAInstallButton compact />
          </div>

          <button
            type="button"
            onClick={() => openEntrySheet('spend')}
            aria-label="Add entry"
            className="min-h-[42px] px-3 sm:px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium inline-flex items-center gap-1.5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Add Entry</span>
          </button>
        </div>
      </div>
    </header>
  );
};
