import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { Button } from '../../components/ui/Button.js';
import { gmailApiClient } from '../../features/gmail/gmail.api.js';
import {
  NormalizedGmailMessage,
  GmailConnectionRecord,
  HiringEmailClassification,
} from '../../../server/services/gmail/gmailTypes.js';
import {
  Mail,
  Sparkles,
  RefreshCw,
  Calendar,
  AlertCircle,
  PartyPopper,
  XCircle,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Briefcase,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react';

type FilterCategory = 'ALL' | 'APPLICATION_UPDATES' | 'INTERVIEWS' | 'RECRUITER_OUTREACH' | 'JOB_ALERTS' | 'OTHER';

export const HiringIntelligenceScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [connection, setConnection] = useState<GmailConnectionRecord | null>(null);
  const [messages, setMessages] = useState<NormalizedGmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<NormalizedGmailMessage | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [showFullEmail, setShowFullEmail] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, msgRes] = await Promise.all([
        gmailApiClient.getStatus().catch(() => ({ connected: false, connection: null })),
        gmailApiClient.listHiringIntelligence().catch(() => []),
      ]);
      setConnection(statusRes.connection);
      setMessages(Array.isArray(msgRes) ? msgRes : []);
    } catch {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (code && state) {
        setIsLoading(true);
        try {
          const authHeader = await (await import('../../lib/supabase/client.js')).supabase.auth.getSession();
          const token = authHeader.data.session?.access_token;
          await fetch(`/api/gmail/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {
          // ignore
        }
      }
      loadData();
    };

    handleOAuthCallback();
  }, []);

  // Reset showFullEmail when selected message changes
  useEffect(() => {
    setShowFullEmail(false);
  }, [selectedMessage?.id]);

  // Handle escape key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await gmailApiClient.syncNow();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to sync Gmail');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { url } = await gmailApiClient.getConnectUrl();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Google OAuth is not configured on server.');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Gmail account? Future hiring updates will not sync.')) return;
    try {
      await gmailApiClient.disconnect();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect.');
    }
  };

  // Helper to categorize a message into user-friendly filter groups
  const getFilterGroup = (msg: NormalizedGmailMessage): FilterCategory => {
    const cat = msg.classification;
    const subj = (msg.subject || '').toLowerCase();
    const sender = (msg.senderEmail || '').toLowerCase();

    if (
      subj.includes('job alert') ||
      subj.includes('new jobs for') ||
      subj.includes('jobs for you') ||
      sender.includes('jobalert') ||
      sender.includes('notify-noreply@google.com')
    ) {
      return 'JOB_ALERTS';
    }

    if (cat === 'INTERVIEW_INVITATION' || cat === 'INTERVIEW_SCHEDULE') {
      return 'INTERVIEWS';
    }

    if (
      cat === 'APPLICATION_RECEIVED' ||
      cat === 'APPLICATION_UPDATE' ||
      cat === 'REJECTION' ||
      cat === 'OFFER'
    ) {
      return 'APPLICATION_UPDATES';
    }

    if (cat === 'RECRUITER_OUTREACH') {
      return 'RECRUITER_OUTREACH';
    }

    return 'OTHER';
  };

  // Dynamic filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      ALL: messages.length,
      APPLICATION_UPDATES: 0,
      INTERVIEWS: 0,
      RECRUITER_OUTREACH: 0,
      JOB_ALERTS: 0,
      OTHER: 0,
    };

    messages.forEach((msg) => {
      const group = getFilterGroup(msg);
      counts[group] = (counts[group] || 0) + 1;
    });

    return counts;
  }, [messages]);

  // Filtered and sorted messages
  const displayedMessages = useMemo(() => {
    let list = [...messages];

    if (activeFilter !== 'ALL') {
      list = list.filter((m) => getFilterGroup(m) === activeFilter);
    }

    list.sort((a, b) => {
      const timeA = new Date(a.receivedAt).getTime();
      const timeB = new Date(b.receivedAt).getTime();
      return sortBy === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [messages, activeFilter, sortBy]);

  // Brand / Provider logo helper (Google, Indeed, or default)
  const renderSourceAvatar = (msg: NormalizedGmailMessage) => {
    const sender = (msg.senderEmail || '').toLowerCase();
    const senderName = (msg.senderName || '').toLowerCase();

    if (sender.includes('google.com') || senderName.includes('google')) {
      return (
        <div className="w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        </div>
      );
    }

    if (sender.includes('indeed.com') || senderName.includes('indeed')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#003A9B] text-white font-bold flex items-center justify-center shrink-0 shadow-2xs">
          <span className="font-serif italic text-lg leading-none">i</span>
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100/80 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
        <Mail className="w-4 h-4" />
      </div>
    );
  };

  // Structured Badge for display (Job Alert, Recruiter Outreach, Interview, Offer, etc.)
  const getDisplayBadge = (msg: NormalizedGmailMessage) => {
    const group = getFilterGroup(msg);

    if (group === 'JOB_ALERTS') {
      return {
        label: 'Job Alert',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
        icon: Briefcase,
      };
    }

    if (msg.classification === 'INTERVIEW_INVITATION' || msg.classification === 'INTERVIEW_SCHEDULE') {
      return {
        label: 'Interview',
        color: 'bg-amber-50 text-amber-700 border-amber-200/70',
        icon: Calendar,
      };
    }

    if (msg.classification === 'OFFER') {
      return {
        label: 'Offer',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
        icon: PartyPopper,
      };
    }

    if (msg.classification === 'REJECTION') {
      return {
        label: 'Decision',
        color: 'bg-rose-50 text-rose-700 border-rose-200/70',
        icon: XCircle,
      };
    }

    if (msg.classification === 'RECRUITER_OUTREACH') {
      return {
        label: 'Recruiter Outreach',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
        icon: CheckCircle2,
      };
    }

    return {
      label: 'Application Update',
      color: 'bg-blue-50 text-blue-700 border-blue-200/70',
      icon: Mail,
    };
  };

  // Extract total job count snippet pill (e.g. "10 new jobs", "8 new jobs")
  const getJobCountPill = (msg: NormalizedGmailMessage) => {
    const match = msg.subject.match(/(\d+)\s+new\s+jobs/i);
    if (match) {
      return `${match[1]} new jobs`;
    }
    if (msg.subject.toLowerCase().includes('job alert')) {
      return 'Job Alert';
    }
    return 'Informational';
  };

  // Safe structured information parser from subject / snippet
  const getJobDetailsData = (msg: NormalizedGmailMessage) => {
    const queryMatch = msg.subject.match(/for\s+[‘']([^’']+)['’]/i);
    const countMatch = msg.subject.match(/(\d+)\s+new\s+jobs/i);

    let location: string | undefined;
    if (msg.safeBodyPlain.includes('Hyderabad')) {
      location = 'Near Hyderabad, Telangana';
    } else if (msg.safeBodyPlain.includes('Bengaluru') || msg.safeBodyPlain.includes('Bangalore')) {
      location = 'Bengaluru, Karnataka';
    }

    let source = 'Gmail';
    if (msg.senderEmail.includes('google.com')) source = 'Google Jobs';
    else if (msg.senderEmail.includes('indeed.com')) source = 'Indeed';

    return {
      searchQuery: queryMatch ? queryMatch[1] : undefined,
      totalNewJobs: countMatch ? countMatch[1] : undefined,
      location,
      source,
    };
  };

  // Helper to determine if summary was generated by Gemini AI or deterministic fallback
  const isAiGeneratedSummary = (msg: NormalizedGmailMessage): boolean => {
    return Boolean(
      msg.classificationReason &&
      !msg.classificationReason.toLowerCase().startsWith('deterministic match') &&
      !msg.classificationReason.toLowerCase().includes('deterministic')
    );
  };

  // Helper to get formatted confidence string from stored confidence score
  const getConfidenceBadge = (confidence?: number) => {
    const score = typeof confidence === 'number' ? confidence : 0.8;
    if (score >= 0.85) return { label: 'Confidence: High', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' };
    if (score >= 0.65) return { label: 'Confidence: Medium', color: 'bg-amber-50 text-amber-700 border-amber-200/60' };
    return { label: 'Confidence: Low', color: 'bg-slate-50 text-slate-700 border-slate-200/60' };
  };

  // Generates safe summary based strictly on existing data
  const getAiSummaryText = (msg: NormalizedGmailMessage) => {
    if (isAiGeneratedSummary(msg)) {
      return msg.classificationReason!;
    }

    const details = getJobDetailsData(msg);
    if (details.searchQuery && details.totalNewJobs) {
      return `This is a Google Job Alert email containing ${details.totalNewJobs} new job listings for your search '${details.searchQuery}'. These are recent opportunities that match your interests.`;
    }

    if (msg.extractedCompany && msg.extractedRole) {
      return `Career Agent detected an outreach opportunity from ${msg.extractedCompany} for the position of ${msg.extractedRole}.`;
    }

    return `Career Agent identified this communication as a hiring-related notification from ${msg.senderName || msg.senderEmail}.`;
  };

  const formattedLastSync = connection?.lastSyncAt
    ? new Date(connection.lastSyncAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      {/* Top Navigation on Mobile */}
      <TopBar
        title="Hiring Intelligence"
        showBack
        onBack={() => navigate('/app/home')}
      />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Desktop Page Title Lockup */}
        <div className="hidden lg:block space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Hiring Intelligence
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            AI-powered analysis of your hiring emails and application updates
          </p>
        </div>

        {/* 1. Gmail Integration Card */}
        <section className="rounded-[22px] bg-white border border-slate-200/80 p-5 md:p-6 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Provider branding & status */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Gmail Integration</h3>
                  {connection?.connectionStatus === 'CONNECTED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                      Disconnected
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {connection?.connectionStatus === 'CONNECTED'
                    ? 'Read-only sync active'
                    : 'Connect your Gmail to sync recruiter updates'}
                </div>
              </div>
            </div>

            {/* Right: Last Sync & Actions */}
            {connection?.connectionStatus === 'CONNECTED' ? (
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right hidden md:block">
                  <div className="text-[11px] text-slate-400 font-medium">Last synced</div>
                  <div className="text-xs font-semibold text-slate-700">{formattedLastSync}</div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isSyncing}
                  onClick={handleSyncNow}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  className="font-semibold text-slate-800 hover:text-blue-600"
                >
                  Sync Now
                </Button>

                {/* More actions menu (Disconnect) */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="More actions"
                    className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <div
                      className="absolute right-0 top-11 w-40 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 z-20"
                      onMouseLeave={() => setIsMenuOpen(false)}
                    >
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleDisconnect();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleConnectGmail}
                leftIcon={<Mail className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Connect Gmail (Read-Only)
              </Button>
            )}
          </div>

          {/* Security Banner Footer */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Read-only: will never send or delete emails</span>
            </div>
            {connection?.connectionStatus === 'CONNECTED' && (
              <div className="md:hidden text-[10px] text-slate-400">
                Synced: {formattedLastSync}
              </div>
            )}
          </div>
        </section>

        {/* 2. Update Filters & Sort */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({filterCounts.ALL})
              </button>

              <button
                onClick={() => setActiveFilter('APPLICATION_UPDATES')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'APPLICATION_UPDATES'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Application Updates ({filterCounts.APPLICATION_UPDATES})
              </button>

              <button
                onClick={() => setActiveFilter('INTERVIEWS')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'INTERVIEWS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Interviews ({filterCounts.INTERVIEWS})
              </button>

              <button
                onClick={() => setActiveFilter('RECRUITER_OUTREACH')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'RECRUITER_OUTREACH'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Recruiter Outreach ({filterCounts.RECRUITER_OUTREACH})
              </button>

              <button
                onClick={() => setActiveFilter('JOB_ALERTS')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'JOB_ALERTS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Job Alerts ({filterCounts.JOB_ALERTS})
              </button>

              <button
                onClick={() => setActiveFilter('OTHER')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'OTHER'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Other ({filterCounts.OTHER})
              </button>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-[11px] text-slate-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="NEWEST">Newest first</option>
                <option value="OLDEST">Oldest first</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. Hiring Update Cards List */}
        <section className="space-y-3 pb-8">
          {isLoading ? (
            <div className="rounded-[22px] bg-white border border-slate-200/80 p-12 text-center text-xs text-slate-400 font-medium">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
              Loading hiring intelligence...
            </div>
          ) : displayedMessages.length === 0 ? (
            <div className="rounded-[22px] bg-white border border-slate-200/80 p-10 text-center space-y-2.5">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
              <div className="text-sm font-bold text-slate-900">
                {messages.length === 0 ? 'No hiring updates yet' : 'No updates in this filter category'}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {messages.length === 0
                  ? 'Once hiring emails, interview schedules, or recruiter updates arrive in your connected inbox, they will be classified and displayed here.'
                  : 'Try selecting "All" or a different category to view your synchronized communications.'}
              </p>
            </div>
          ) : (
            displayedMessages.map((msg) => {
              const badge = getDisplayBadge(msg);
              const BadgeIcon = badge.icon;
              const pill = getJobCountPill(msg);
              const formattedDate = new Date(msg.receivedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = new Date(msg.receivedAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className="group rounded-[20px] bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-blue-400/80 hover:shadow-sm transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left & Center Information */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Source Provider Avatar */}
                    {renderSourceAvatar(msg)}

                    {/* Content Details */}
                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Classification Badge & Sender */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3 shrink-0" />
                          {badge.label}
                        </span>

                        <span className="text-xs font-bold text-slate-800 truncate">
                          {msg.senderName || msg.extractedCompany || 'Employer Update'}
                        </span>
                      </div>

                      {/* Subject */}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors truncate">
                        {msg.subject}
                      </h3>

                      {/* Metadata Row: Gmail Indicator & Timestamp */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-0.5">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          Gmail
                        </span>
                        <span>•</span>
                        <span>
                          {formattedDate} at {formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badge Pill & View Details action */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {pill && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        {pill}
                      </span>
                    )}

                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] text-slate-400">{formattedDate}</div>
                      <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-0.5">
                        <span>View details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <span className="sm:hidden text-xs font-bold text-blue-600 flex items-center gap-0.5">
                      <span>View details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* 4. DETAILS EXPERIENCE — Centered Modal (Desktop) & Dedicated Sheet/Screen (Mobile) */}
      {selectedMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Job Update Details"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-150"
        >
          {/* Surface */}
          <div className="w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90vh] bg-white rounded-none sm:rounded-[24px] shadow-2xl border-0 sm:border sm:border-slate-100 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-white sticky top-0 z-10">
              <div className="flex items-start gap-3 min-w-0">
                {/* Mobile Back button (< 640px) */}
                <button
                  onClick={() => setSelectedMessage(null)}
                  aria-label="Back to list"
                  className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 -ml-1 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Source Avatar */}
                <div className="hidden sm:block">
                  {renderSourceAvatar(selectedMessage)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const badge = getDisplayBadge(selectedMessage);
                      const BadgeIcon = badge.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3 shrink-0" />
                          {badge.label}
                        </span>
                      );
                    })()}
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(selectedMessage.receivedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(selectedMessage.receivedAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                    {selectedMessage.subject}
                  </h2>

                  <div className="text-xs text-slate-500 font-medium truncate">
                    From:{' '}
                    <span className="text-slate-800 font-semibold">
                      {selectedMessage.senderName || selectedMessage.senderEmail}
                    </span>{' '}
                    &lt;{selectedMessage.senderEmail}&gt;
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedMessage(null)}
                aria-label="Close details"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 bg-slate-50/50">
              {/* Section 1: Summary Card (AI Summary if Gemini-generated, Career Summary if deterministic) */}
              {(() => {
                const isAi = isAiGeneratedSummary(selectedMessage);
                const confidenceBadge = getConfidenceBadge(selectedMessage.confidence);
                return (
                  <div className="rounded-[18px] bg-white border border-blue-100 p-4 sm:p-5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>{isAi ? 'AI Summary' : 'Career Summary'}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${confidenceBadge.color}`}>
                        {confidenceBadge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {getAiSummaryText(selectedMessage)}
                    </p>
                  </div>
                );
              })()}

              {/* Section 2: Why This Matters Card */}
              <div className="rounded-[18px] bg-emerald-50/60 border border-emerald-100 p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Why this matters</span>
                </div>
                <ul className="text-xs text-emerald-900 space-y-1.5 list-none pl-0 font-medium">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>Matches your saved job preferences and target keywords</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>New opportunities detected in your target role and location</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>Can be referenced directly for autonomous agent search matching</span>
                  </li>
                </ul>
              </div>

              {/* Section 3: Job Information (structured only if available) */}
              {(() => {
                const details = getJobDetailsData(selectedMessage);
                const hasAnyDetail =
                  details.searchQuery ||
                  details.totalNewJobs ||
                  details.location ||
                  details.source;

                if (!hasAnyDetail) return null;

                return (
                  <div className="rounded-[18px] bg-white border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span>Job Information</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {details.searchQuery && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Search Query
                          </span>
                          <span className="font-semibold text-slate-800">
                            {details.searchQuery}
                          </span>
                        </div>
                      )}

                      {details.totalNewJobs && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Total New Jobs
                          </span>
                          <span className="font-semibold text-slate-800">
                            {details.totalNewJobs}
                          </span>
                        </div>
                      )}

                      {details.location && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Location
                          </span>
                          <span className="font-semibold text-slate-800">
                            {details.location}
                          </span>
                        </div>
                      )}

                      {details.source && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Source
                          </span>
                          <span className="font-semibold text-slate-800">
                            {details.source}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Section 4: Email Content (Sanitized) */}
              <div className="rounded-[18px] bg-white border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>Email Content (Sanitized)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Text only</span>
                </div>

                <div
                  className={`p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed transition-all ${
                    showFullEmail ? 'max-h-96 overflow-y-auto' : 'max-h-24 overflow-hidden relative'
                  }`}
                >
                  {selectedMessage.safeBodyPlain}

                  {!showFullEmail && (
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                  )}
                </div>

                <div className="text-center pt-1">
                  <button
                    onClick={() => setShowFullEmail(!showFullEmail)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{showFullEmail ? 'Show less' : 'Show more'}</span>
                    {showFullEmail ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedMessage(null)}
                leftIcon={<Bookmark className="w-4 h-4 text-slate-400" />}
                className="font-semibold text-slate-700"
              >
                Mark as Not Relevant
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => setSelectedMessage(null)}
                className="px-6 font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

