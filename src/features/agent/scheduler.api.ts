import { getSupabaseBrowserClient } from '../../lib/supabase/client.js';

export type BackgroundScheduleType = 'JOB_SEARCH' | 'DAILY_REPORT';

export type BackgroundExecutionStatus =
  | 'PENDING'
  | 'CLAIMED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'SKIPPED';

export interface BackgroundSchedule {
  id: string;
  userId: string;
  scheduleType: BackgroundScheduleType;
  isEnabled: boolean;
  preferredTime: string;
  timezone: string;
  nextRunAt: string;
  lastRunAt: string | null;
  lastStatus: BackgroundExecutionStatus | null;
  consecutiveFailures: number;
  configurationSnapshot: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BackgroundExecutionRecord {
  id: string;
  scheduleId: string | null;
  userId: string;
  scheduleType: BackgroundScheduleType;
  workerId: string;
  status: BackgroundExecutionStatus;
  retryCount: number;
  maxRetries: number;
  sessionId: string | null;
  reportId: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  summary: Record<string, any>;
  errorDetails: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  workerId: string;
  lastTickAt: string | null;
  activeClaimsCount: number;
  pendingDueCount: number;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const schedulerApi = {
  async getPreferences(): Promise<{ schedules: BackgroundSchedule[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/scheduler/preferences', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'Failed to fetch scheduler preferences');
    }
    return res.json();
  },

  async updatePreference(
    type: BackgroundScheduleType,
    updates: {
      isEnabled?: boolean;
      preferredTime?: string;
      timezone?: string;
      configurationSnapshot?: Record<string, any>;
    }
  ): Promise<{ schedule: BackgroundSchedule }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/scheduler/preferences/${type}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'Failed to update scheduler preference');
    }
    return res.json();
  },

  async getHistory(limit: number = 10): Promise<{ history: BackgroundExecutionRecord[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/scheduler/history?limit=${limit}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'Failed to fetch execution history');
    }
    return res.json();
  },

  async getStatus(): Promise<{ status: SchedulerStatus }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/scheduler/status', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'Failed to fetch scheduler status');
    }
    return res.json();
  },

  async triggerTick(): Promise<{ result: { processedCount: number; errorsCount: number } }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/scheduler/tick', {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'Failed to trigger scheduler tick');
    }
    return res.json();
  },
};
