import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { useAuth } from '../../features/authentication/auth.context.js';
import { Bell, Search, Sparkles, Bot } from 'lucide-react';
import { Avatar } from '../ui/Avatar.js';
import { DEMO_CANDIDATE } from '../../../mock/demo-data/candidate.js';

export interface DesktopHeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  title,
  subtitle,
  rightAction,
}) => {
  const { path, navigate } = useRouter();
  const { user } = useAuth();

  const candidateName =
    (user?.userMetadata?.full_name as string) ||
    (user?.email ? user.email.split('@')[0] : DEMO_CANDIDATE.name);

  // Derive contextual title if not explicitly passed
  const getDerivedTitle = () => {
    if (title) return title;
    if (path === '/app/home' || path === '/app') return 'Overview';
    if (path.startsWith('/app/jobs')) return 'Job Discovery';
    if (path.startsWith('/app/applications')) return 'Applications';
    if (path === '/app/agent') return 'Autonomous Agent';
    if (path.startsWith('/app/tasks')) return 'Human Tasks';
    if (path === '/app/hiring') return 'Hiring Intelligence';
    if (path === '/app/profile') return 'Candidate Profile';
    if (path === '/app/resume') return 'Resume Intelligence';
    if (path === '/app/preferences') return 'Target Preferences';
    if (path.startsWith('/app/report')) return 'Daily Career Report';
    if (path === '/app/notifications') return 'Notifications';
    return 'Dashboard';
  };

  const getDerivedSubtitle = () => {
    if (subtitle) return subtitle;
    if (path === '/app/hiring') return 'AI-powered analysis of your hiring emails and application updates';
    return undefined;
  };

  const currentSubtitle = getDerivedSubtitle();

  return (
    <header className="hidden lg:flex h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 px-8 items-center justify-between">
      {/* Title & Context */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
          {getDerivedTitle()}
        </h1>
        {currentSubtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{currentSubtitle}</p>
        )}
      </div>

      {/* Global Actions Bar */}
      <div className="flex items-center gap-3">
        {rightAction}

        {/* Global Autonomous Search Quick Trigger */}
        <button
          onClick={() => navigate('/app/agent')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-semibold"
        >
          <Bot className="w-4 h-4 text-blue-600" />
          <span>Agent Status</span>
        </button>

        {/* Notifications Icon */}
        <button
          onClick={() => navigate('/app/notifications')}
          aria-label="Notifications"
          className="w-9 h-9 rounded-xl border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* Candidate Avatar Menu Trigger */}
        <div
          onClick={() => navigate('/app/profile')}
          className="flex items-center gap-2.5 pl-2 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <Avatar name={candidateName} size="sm" />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {candidateName}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">Candidate Truth Active</div>
          </div>
        </div>
      </div>
    </header>
  );
};
