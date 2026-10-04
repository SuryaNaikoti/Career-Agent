import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { Button } from '../../components/ui/Button.js';
import { gmailApiClient } from '../../features/gmail/gmail.api.js';
import {
  NormalizedGmailMessage,
  GmailConnectionRecord,
} from '../../../server/services/gmail/gmailTypes.js';
import {
  Mail,
  Sparkles,
  RefreshCw,
  Calendar,
  AlertCircle,
  PartyPopper,
  XCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const HiringIntelligenceScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [connection, setConnection] = useState<GmailConnectionRecord | null>(null);
  const [messages, setMessages] = useState<NormalizedGmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<NormalizedGmailMessage | null>(null);

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
          // Clean URL params
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {
          // ignore
        }
      }
      loadData();
    };

    handleOAuthCallback();
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

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'INTERVIEW_INVITATION':
      case 'INTERVIEW_SCHEDULE':
        return { label: 'Interview', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/60', icon: Calendar };
      case 'OFFER':
        return { label: 'Offer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', icon: PartyPopper };
      case 'REJECTION':
        return { label: 'Decision', color: 'bg-rose-50 text-rose-700 border-rose-200/60', icon: XCircle };
      case 'ADDITIONAL_INFORMATION_REQUEST':
      case 'ASSESSMENT_REQUEST':
        return { label: 'Action Needed', color: 'bg-amber-50 text-amber-700 border-amber-200/60', icon: AlertCircle };
      default:
        return { label: 'Application Update', color: 'bg-blue-50 text-blue-700 border-blue-200/60', icon: Mail };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar title="Hiring Intelligence" showBack onBack={() => navigate('/app/home')} />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Connection Status Card */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Gmail Integration</h3>
                <div className="text-[10px] text-slate-400">
                  {connection?.connectionStatus === 'CONNECTED' ? 'Read-only sync active' : 'Not connected'}
                </div>
              </div>
            </div>

            {connection?.connectionStatus === 'CONNECTED' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            ) : null}
          </div>

          {connection?.connectionStatus === 'CONNECTED' ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{connection.googleEmail || 'Candidate Account'}</div>
                  <div className="text-[10px] text-slate-400">
                    Last synced: {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isSyncing}
                  onClick={handleSyncNow}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Sync Now
                </Button>
              </div>

              <div className="flex justify-between items-center text-xs px-1">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Read-only: will never send or delete emails
                </span>
                <button
                  onClick={handleDisconnect}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your Gmail account to allow Career Agent to automatically track recruiter communications, schedule invitations, and updates.
              </p>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleConnectGmail}
                leftIcon={<Mail className="w-4 h-4" />}
              >
                Connect Gmail (Read-Only)
              </Button>
            </div>
          )}
        </div>

        {/* Hiring Updates List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Hiring Updates ({messages.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading intelligence...</div>
          ) : messages.length === 0 ? (
            <div className="rounded-[22px] bg-white border border-slate-200/80 p-8 text-center space-y-2">
              <Sparkles className="w-7 h-7 text-indigo-400 mx-auto" />
              <div className="text-sm font-bold text-slate-900">No hiring updates yet</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Once hiring emails or interview confirmations arrive in your connected inbox, they will be classified and linked here.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const badge = getCategoryBadge(msg.classification);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className="rounded-[20px] bg-white border border-slate-200/80 p-4 shadow-xs hover:border-blue-300 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.color}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.receivedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {msg.extractedCompany || msg.senderName || 'Employer Update'}
                    </h3>
                    <div className="text-xs font-medium text-slate-600 truncate mt-0.5">
                      {msg.subject}
                    </div>
                  </div>

                  {msg.extractedInterviewDetails && (
                    <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 font-medium flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>
                        Interview: {msg.extractedInterviewDetails.date} · {msg.extractedInterviewDetails.time || 'TBD'}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Source: <strong className="text-slate-600">Gmail</strong>
                    </span>
                    <span className="font-semibold text-blue-600 flex items-center gap-1">
                      <span>View details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Email Detail Inspection Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {selectedMessage.classification}
              </span>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400">
                From: <span className="font-semibold text-slate-700">{selectedMessage.senderRaw}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                {selectedMessage.subject}
              </h2>
              <div className="text-[10px] text-slate-400">
                Received: {new Date(selectedMessage.receivedAt).toLocaleString()}
              </div>
            </div>

            {selectedMessage.classificationReason && (
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 leading-relaxed font-medium">
                {selectedMessage.classificationReason}
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Sanitized Content
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                {selectedMessage.safeBodyPlain}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => setSelectedMessage(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
