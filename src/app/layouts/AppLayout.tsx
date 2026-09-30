import React from 'react';
import { useRouter } from '../router/index.js';
import { BottomNavigation } from '../../components/navigation/BottomNavigation.js';
import { OfflineIndicator } from '../../components/pwa/OfflineIndicator.js';
import { InstallPrompt } from '../../components/pwa/InstallPrompt.js';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { path } = useRouter();
  const { isInstallable, isInstalled } = usePWAInstall();
  const [showTopInstallBanner, setShowTopInstallBanner] = React.useState(true);

  const isAuthOrOnboardingRoute =
    path === '/' || path === '/install' || path === '/auth' || path === '/onboarding';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start">
      {/* Offline Connectivity Status Pill */}
      <OfflineIndicator />

      {/* Primary Mobile Container Frame (Center-anchored for desktop preview, 100% on mobile devices) */}
      <div className="w-full max-w-[430px] min-h-screen bg-slate-50 flex flex-col shadow-2xl relative overflow-x-hidden border-x border-slate-200/60">
        {/* Optional top install banner if running in browser and installable */}
        {!isAuthOrOnboardingRoute && isInstallable && !isInstalled && showTopInstallBanner && (
          <InstallPrompt
            variant="banner"
            onDismiss={() => setShowTopInstallBanner(false)}
          />
        )}

        {/* Page Content */}
        <div className="flex-1 flex flex-col">{children}</div>

        {/* Bottom Navigation for App Routes */}
        {!isAuthOrOnboardingRoute && <BottomNavigation />}
      </div>
    </div>
  );
};
