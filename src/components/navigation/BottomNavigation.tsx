import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { Home, Search, FileText, Bot, User } from 'lucide-react';
import { cn } from '../../lib/utils/cn.js';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  isAgent?: boolean;
  hasBadge?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/app/home', icon: Home },
  { id: 'jobs', label: 'Jobs', path: '/app/jobs', icon: Search },
  { id: 'applications', label: 'Applications', path: '/app/applications', icon: FileText },
  { id: 'agent', label: 'Agent', path: '/app/agent', icon: Bot, isAgent: true, hasBadge: true },
  { id: 'profile', label: 'Profile', path: '/app/profile', icon: User },
];

export const BottomNavigation: React.FC = () => {
  const { path, navigate } = useRouter();

  // Helper to determine if a tab is active
  const isTabActive = (itemPath: string) => {
    if (itemPath === '/app/home') {
      return path === '/app/home' || path === '/app' || path === '/';
    }
    return path.startsWith(itemPath);
  };

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(15,23,42,0.03)] pb-safe transition-all"
    >
      <div className="max-w-[430px] mx-auto grid grid-cols-5 h-16 items-center px-1">
        {NAV_ITEMS.map((item) => {
          const active = isTabActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative group select-none active:scale-95',
                active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <div className="relative">
                {item.isAgent ? (
                  <div
                    className={cn(
                      'p-1 rounded-xl transition-all',
                      active ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-500'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                ) : (
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform',
                      active && 'stroke-[2.5px] scale-105'
                    )}
                  />
                )}

                {/* Agent notification badge */}
                {item.hasBadge && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"
                    aria-label="New agent notification"
                  />
                )}
              </div>

              <span
                className={cn(
                  'text-[10px] tracking-tight mt-1 font-medium transition-colors',
                  active ? 'font-bold text-blue-600' : 'text-slate-500'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
