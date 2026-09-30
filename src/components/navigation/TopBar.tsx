import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { useAuth } from '../../features/authentication/auth.context.js';
import { Sparkles, Bell, ArrowLeft } from 'lucide-react';
import { Avatar } from '../ui/Avatar.js';
import { DEMO_CANDIDATE } from '../../../mock/demo-data/candidate.js';

export interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { goBack, navigate } = useRouter();
  const { user, isAuthenticated } = useAuth();

  const avatarName =
    (user?.userMetadata?.full_name as string) ||
    (user?.email ? user.email.split('@')[0] : DEMO_CANDIDATE.name);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 pt-safe">
      <div className="max-w-[430px] mx-auto px-4 h-14 flex items-center justify-between">
        {showBack ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onBack || goBack}
              aria-label="Go back"
              className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-slate-900 truncate">
              {title || 'Back'}
            </h1>
          </div>
        ) : (
          <div
            onClick={() => navigate('/app/home')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              Career <span className="text-blue-600">Agent</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {rightAction ? (
            rightAction
          ) : (
            <>
              {/* Notification Bell */}
              <button
                aria-label="Notifications"
                onClick={() => navigate('/app/applications')}
                className="relative w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
              </button>

              {/* Candidate Avatar */}
              <button
                aria-label="Profile Settings"
                onClick={() => navigate('/app/profile')}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Avatar
                  name={avatarName}
                  size="sm"
                  online={isAuthenticated}
                />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
