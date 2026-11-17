import { useEffect, useMemo, useState } from 'react';
import { AccountsTab } from './components/accounts/AccountsTab';
import { CalendarTab } from './components/calendar/CalendarTab';
import { OverviewTab } from './components/dashboard/OverviewTab';
import { LogEntrySheet } from './components/entry/LogEntrySheet';
import { EnvelopesTab } from './components/envelopes/EnvelopesTab';
import { BottomNav } from './components/layout/BottomNav';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { TopBar } from './components/layout/TopBar';
import { ViewportStageChrome } from './components/layout/ViewportBar';
import { DailyPaceTab } from './components/pace/DailyPaceTab';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { BudgetAlertToasts } from './components/notifications/BudgetAlertToasts';
import { MonthlyReportModal } from './components/reports/MonthlyReportModal';
import { PinOverlay } from './components/security/PinOverlay';
import { ProfileSwitcherMenu } from './components/security/ProfileSwitcherMenu';
import { useMizanStore } from './store/useMizanStore';
import { computeViewportFit } from './utils/viewportFit';

export default function App() {
  const theme = useMizanStore((s) => s.theme);
  const viewportMode = useMizanStore((s) => s.viewportMode);
  const activeTab = useMizanStore((s) => s.activeTab);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0B1120' : '#F8FAFC');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.viewport = viewportMode;
  }, [viewportMode]);

  useEffect(() => {
    const onResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fit = useMemo(
    () =>
      computeViewportFit({
        mode: viewportMode,
        windowWidth: windowSize.width,
        windowHeight: windowSize.height,
      }),
    [viewportMode, windowSize.width, windowSize.height],
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'calendar':
        return <CalendarTab />;
      case 'envelopes':
        return <EnvelopesTab />;
      case 'pace':
        return <DailyPaceTab />;
      case 'accounts':
        return <AccountsTab />;
      default:
        return <OverviewTab />;
    }
  };

  const appSurface = (
    <div
      className={`${
        fit.framed ? 'h-full overflow-hidden flex flex-col relative' : 'min-h-screen'
      } bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors duration-200`}
    >
      <div className={`flex ${fit.framed ? 'flex-1 min-h-0 overflow-hidden' : 'min-h-screen'}`}>
        <DesktopSidebar />

        <div className={`flex-1 flex flex-col min-w-0 ${fit.framed ? 'min-h-0 overflow-y-auto overflow-x-hidden' : ''}`}>
          <TopBar onOpenProfileSwitcher={() => setProfileMenuOpen(true)} />

          <main className="flex-1 w-full max-w-6xl mx-auto px-4 lg:px-6 pt-6 pb-24 lg:pb-10">
            {renderTabContent()}
          </main>
        </div>
      </div>

      <BottomNav />
      <ProfileSwitcherMenu open={profileMenuOpen} onClose={() => setProfileMenuOpen(false)} />
      <PinOverlay />
      <LogEntrySheet />
      <MonthlyReportModal />
      <BudgetAlertToasts />
      <OfflineIndicator />
    </div>
  );

  if (!fit.framed) {
    return appSurface;
  }

  return (
    <div className="h-dvh w-screen overflow-hidden flex flex-col bg-slate-200/80 dark:bg-[#050914] text-slate-900 dark:text-slate-100">
      <ViewportStageChrome fit={fit} />

      <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-3">
        <div
          data-testid="viewport-fit-frame"
          style={{
            width: `${Math.round(fit.frameWidth * fit.scale)}px`,
            height: `${Math.round(fit.frameHeight * fit.scale)}px`,
          }}
          className="relative overflow-hidden rounded-[26px] border border-slate-300/90 dark:border-slate-700/80 shadow-2xl bg-slate-50 dark:bg-[#0B1120]"
        >
          <div
            style={{
              width: `${fit.frameWidth}px`,
              height: `${fit.frameHeight}px`,
              transform: `scale(${fit.scale})`,
              transformOrigin: 'top left',
            }}
          >
            {appSurface}
          </div>
        </div>
      </div>
    </div>
  );
}
