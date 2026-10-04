/**
 * Frontend Notifications & Daily Career Report API Client
 * Module 12: Notifications & Daily Career Report
 */

import { supabase } from '../../lib/supabase/client.js';
import {
  DailyCareerReportRecord,
  CareerReportPreferencesRecord,
  UpdateCareerReportPreferencesInput,
  InternalNotificationRecord,
} from '../../../server/services/notification/notificationTypes.js';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User is not authenticated.');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export const reportsApiClient = {
  /**
   * Fetches or generates today's daily career report.
   */
  async getTodayReport(force = false): Promise<DailyCareerReportRecord> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/reports/today${force ? '?force=true' : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to fetch daily report.');
    }
    return body.data;
  },

  /**
   * Fetches past daily career reports.
   */
  async listReports(limit = 10): Promise<DailyCareerReportRecord[]> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/reports?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to list reports.');
    }
    return body.data;
  },

  /**
   * Fetches candidate report preferences.
   */
  async getPreferences(): Promise<CareerReportPreferencesRecord> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/reports/preferences', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to fetch preferences.');
    }
    return body.data;
  },

  /**
   * Updates candidate report preferences.
   */
  async updatePreferences(input: UpdateCareerReportPreferencesInput): Promise<CareerReportPreferencesRecord> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/reports/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(input),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to update preferences.');
    }
    return body.data;
  },
};

export const notificationsApiClient = {
  /**
   * Lists in-app notifications.
   */
  async listNotifications(status?: 'UNREAD' | 'READ', limit = 20): Promise<InternalNotificationRecord[]> {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', String(limit));

    const res = await fetch(`/api/notifications?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to list notifications.');
    }
    return body.data;
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(id: string): Promise<InternalNotificationRecord> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to mark notification as read.');
    }
    return body.data;
  },

  /**
   * Marks all unread notifications as read.
   */
  async markAllAsRead(): Promise<{ updatedCount: number }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to mark all as read.');
    }
    return body.data;
  },
};
