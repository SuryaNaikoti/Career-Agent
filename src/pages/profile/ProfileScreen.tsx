import React, { useState } from 'react';
import { useRouter } from '../../app/router/index.js';
import { useAuth } from '../../features/authentication/auth.context.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { Avatar } from '../../components/ui/Avatar.js';
import {
  FileText,
  Sliders,
  Target,
  Mail,
  Shield,
  Bell,
  Settings,
  ChevronRight,
  LogOut,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { DEMO_CANDIDATE } from '../../../mock/demo-data/candidate.js';
import { Button } from '../../components/ui/Button.js';

export const ProfileScreen: React.FC = () => {
  const { navigate } = useRouter();
  const { user, signOut, isAuthenticated } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  // Derive identity from authenticated Supabase user or fallback cleanly
  const displayName =
    (user?.userMetadata?.full_name as string) ||
    (user?.email ? user.email.split('@')[0] : DEMO_CANDIDATE.name);

  const displayEmail = user?.email || DEMO_CANDIDATE.email;
  const isVerified = user?.emailConfirmed ?? false;

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    navigate('/auth');
  };

  const menuSections = [
    {
      title: 'Career Assets',
      items: [
        {
          id: 'resume',
          icon: FileText,
          label: 'Resume & Verified Facts',
          description: '1 verified resume attached',
          path: '/app/resume',
        },
        {
          id: 'preferences',
          icon: Sliders,
          label: 'Job & Salary Preferences',
          description: 'Hyderabad + Remote · ₹20L+',
          path: '/app/preferences',
        },
        {
          id: 'goals',
          icon: Target,
          label: 'Career Target & Role Progression',
          description: 'Staff UI / Senior Frontend Lead',
          action: () => alert('Career Goals editor will be wired in Module 04.'),
        },
      ],
    },
    {
      title: 'Automations & Permissions',
      items: [
        {
          id: 'services',
          icon: Mail,
          label: 'Connected Services',
          description: 'Gmail Hiring Sync (Active)',
          action: () => alert('Connected services management in Module 14.'),
        },
        {
          id: 'privacy',
          icon: Shield,
          label: 'AI Permissions & Candidate Truth Layer',
          description: 'Strict Anti-Hallucination Active',
          action: () => alert('Candidate Truth Layer & Permission Engine in Module 15.'),
        },
        {
          id: 'notifications',
          icon: Bell,
          label: 'Alerts & Daily Digest',
          description: 'Push & In-App enabled',
          action: () => alert('Notifications in Module 16.'),
        },
        {
          id: 'settings',
          icon: Settings,
          label: 'App & PWA Settings',
          description: 'Version 0.1.0 (Module 01)',
          action: () => navigate('/install'),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <TopBar title="Profile" />

      <main className="max-w-[430px] mx-auto w-full px-4 pt-4 space-y-5">
        {/* Candidate Profile Card */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <Avatar name={displayName} size="lg" online={isAuthenticated} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {displayName}
              </h2>
              {isVerified && (
                <span title="Verified Account" className="text-blue-600">
                  <ShieldCheck className="w-4 h-4 fill-blue-50" />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{DEMO_CANDIDATE.title}</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{displayEmail}</p>
          </div>
        </div>

        {/* Account & Session Identity Card */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Account Identity</span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              <UserCheck className="w-3 h-3 text-blue-600" />
              {user ? `${user.id.slice(0, 8)}...` : 'Demo Session'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-500">Authentication</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-200/60">
              {isAuthenticated ? 'Authenticated' : 'Demo Mode'}
            </span>
          </div>
        </div>

        {/* Menu Sections */}
        {menuSections.map((sec) => (
          <div key={sec.title} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              {sec.title}
            </h3>

            <div className="rounded-[22px] bg-white border border-slate-200/80 overflow-hidden shadow-2xs divide-y divide-slate-100">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.path) navigate(item.path);
                      else if (item.action) item.action();
                    }}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Sign Out Action Button */}
        <div className="pt-2">
          <Button
            fullWidth
            size="lg"
            variant="danger"
            onClick={handleSignOut}
            isLoading={signingOut}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign out
          </Button>
        </div>
      </main>
    </div>
  );
};
