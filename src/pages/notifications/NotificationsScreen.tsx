import React, { useEffect, useState } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { Button } from '../../components/ui/Button.js';
import { notificationsApiClient } from '../../features/notifications/notifications.api.js';
import { InternalNotificationRecord } from '../../../server/services/notification/notificationTypes.js';
import {
  Bell,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Mail,
  PartyPopper,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [notifications, setNotifications] = useState<InternalNotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await notificationsApiClient.listNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApiClient.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApiClient.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
    } catch (err: any) {
      alert(err.message || 'Failed to mark all as read');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INTERVIEW':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'ACTION_REQUIRED':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'OFFER':
        return <PartyPopper className="w-4 h-4 text-emerald-600" />;
      case 'DAILY_REPORT':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      default:
        return <Mail className="w-4 h-4 text-slate-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar title="Notifications" showBack onBack={() => navigate('/app/home')} />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Header Actions */}
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-slate-700">
            {unreadCount > 0 ? `${unreadCount} Unread Notifications` : 'All caught up'}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 && !isLoading ? (
          <div className="rounded-[22px] bg-white border border-slate-200/80 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No notifications yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When new job matches, recruiter emails, or daily reports are ready, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-[20px] bg-white border p-4 shadow-xs transition-all ${
                  n.status === 'UNREAD'
                    ? 'border-blue-200/80 bg-blue-50/10'
                    : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(n.notificationType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {n.title}
                      </h4>
                      {n.status === 'UNREAD' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        {n.actionUrl && (
                          <button
                            onClick={() => navigate(n.actionUrl as any)}
                            className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {n.status === 'UNREAD' && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="font-semibold text-slate-500 hover:text-slate-700"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
