import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg animate-in slide-in-from-top duration-200">
      <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
      <span>Offline Mode — Cached data active</span>
    </div>
  );
};
