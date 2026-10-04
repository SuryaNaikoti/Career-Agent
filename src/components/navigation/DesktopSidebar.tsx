import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { useAuth } from '../../features/authentication/auth.context.js';
import {
  Home,
  Search,
  FileText,
  Bot,
  CheckSquare,
  Mail,
  BarChart3,
  Bell,
  FileCode2,
  User,
  Sliders,
  Sparkles,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn.js';
import { Avatar } from '../ui/Avatar.js';
import { DEMO_CANDIDATE } from '../../../mock/demo-data/candidate.js';

export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  section?: 'main' | 'intelligence' | 'profile';
}

export const DESKTOP_NAV_ITEMS: SidebarItem[] = [
  // Main
  { id: 'home', label: 'Home', path: '/app/home', icon: Home, section: 'main' },
  { id: 'jobs', label: 'Jobs', path: '/app/jobs', icon: Search, section: 'main' },
  { id: 'applications', label: 'Applications', path: '/app/applications', icon: FileText, section: 'main' },
  { id: 'agent', label: 'Agent', path: '/app/agent', icon: Bot, badge: 'Live', section: 'main' },
  { id: 'tasks', label: 'Tasks', path: '/app/tasks', icon: CheckSquare, section: 'main' },

  // Intelligence & Communications
  { id: 'hiring', label: 'Hiring Intelligence', path: '/app/hiring', icon: Mail, section: 'intelligence' },
  { id: 'reports', label: 'Daily Reports', path: '/app/report', icon: BarChart3, section: 'intelligence' },
  { id: 'notifications', label: 'Notifications', path: '/app/notifications', icon: Bell, section: 'intelligence' },

  // Candidate Data & Configuration
  { id: 'resume', label: 'Resume Intelligence', path: '/app/resume', icon: FileCode2, section: 'profile' },
  { id: 'profile', label: 'Candidate Profile', path: '/app/profile', icon: User, section: 'profile' },
  { id: 'preferences', label: 'Preferences', path: '/app/preferences', icon: Sliders, section: 'profile' },
];

export const DesktopSidebar: React.FC = () => {
  const { path, navigate } = useRouter();
  const { user, signOut } = useAuth();

  const isTabActive = (itemPath: string) => {
    if (itemPath === '/app/home') {
      return path === '/app/home' || path === '/app' || path === '/';
    }
    return path.startsWith(itemPath);
  };

  const candidateName =
    (user?.userMetadata?.full_name as string) ||
    (user?.email ? user.email.split('@')[0] : DEMO_CANDIDATE.name);

  const candidateEmail = user?.email || DEMO_CANDIDATE.email;

  const renderNavSection = (title: string, sectionKey: 'main' | 'intelligence' | 'profile') => {
    const items = DESKTOP_NAV_ITEMS.filter((i) => i.section === sectionKey);

    return (
      <div className="space-y-1">
        <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </div>
        <div className="space-y-0.5">
          {items.map((item) => {
            const active = isTabActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group select-none text-left',
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-transform group-hover:scale-105',
                      active ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider',
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-50 text-blue-700'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside
      aria-label="Desktop Sidebar Navigation"
      className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none"
    >
      {/* Top Header / Logo */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div
          onClick={() => navigate('/app/home')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
              Career <span className="text-blue-600">Agent</span>
            </div>
            <div className="text-[10px] font-medium text-slate-400">Autonomous SaaS</div>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {renderNavSection('Platform', 'main')}
        {renderNavSection('Intelligence', 'intelligence')}
        {renderNavSection('Profile & Truth Layer', 'profile')}
      </div>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
          <div
            onClick={() => navigate('/app/profile')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <Avatar name={candidateName} size="sm" />
            <div className="min-w-0 text-left">
              <div className="text-xs font-bold text-slate-900 truncate">
                {candidateName}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {candidateEmail}
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            title="Sign out"
            aria-label="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
