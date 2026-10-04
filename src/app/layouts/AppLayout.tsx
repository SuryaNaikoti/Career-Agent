import React from 'react';
import { useRouter } from '../router/index.js';
import { BottomNavigation } from '../../components/navigation/BottomNavigation.js';
import { DesktopSidebar } from '../../components/navigation/DesktopSidebar.js';
import { DesktopHeader } from '../../components/navigation/DesktopHeader.js';
import { OfflineIndicator } from '../../components/pwa/OfflineIndicator.js';
import { InstallPrompt } from '../../components/pwa/InstallPrompt.js';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { path } = useRouter();
  const { isInstallable, isInstalled } = usePWAInstall();
  const [showTopInstallBanner, setShowTopInstallBanner] = React.useState(true);

  const isAuthOrOnboardingRoute =
    path === '/' || path === '/install' || path === '/auth' || path === '/auth/reset-password' || path === '/onboarding';

  // For public auth, splash, install, or onboarding: render centered responsive view without app sidebar
  if (isAuthOrOnboardingRoute) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-start">
        <OfflineIndicator />
        <div className="flex-1 w-full flex flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-row justify-start w-full">
      {/* Offline Connectivity Status Pill */}
      <OfflineIndicator />

      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <DesktopSidebar />

      {/* Main SaaS App Shell Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen relative overflow-x-hidden">
        {/* Optional top install banner if running on mobile device in browser and installable */}
        {isInstallable && !isInstalled && showTopInstallBanner && (
          <div className="lg:hidden">
            <InstallPrompt
              variant="banner"
              onDismiss={() => setShowTopInstallBanner(false)}
            />
          </div>
        )}

        {/* Desktop Top Header (>= 1024px) */}
        <DesktopHeader />

        {/* Page Content Container: full width with comfortable desktop max-width where appropriate */}
        <div className="flex-1 flex flex-col w-full">{children}</div>

        {/* Mobile Bottom Navigation (< 1024px) */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
};

