import { getSupabaseBrowserClient } from '../../lib/supabase/client.js';

export interface AgentConfiguration {
  id: string;
  userId: string;
  isEnabled: boolean;
  minMatchScore: number;
  maxApplicationsPerDay: number;
  maxApplicationsPerSession: number;
  allowAutoSubmitOnAllowedSources: boolean;
  allowedWorkModes: string[];
  allowedJobSources: string[];
  scheduleTimezone: string;
  updatedAt: string;
}

export interface AgentSessionSummary {
  jobsFound: number;
  jobsFiltered: number;
  jobsMatched: number;
  applicationsPrepared: number;
  applicationsSubmitted: number;
  humanTasksCreated: number;
  errorsCount: number;
  notes: string[];
}

export interface AgentSession {
  id: string;
  userId: string;
  mode: 'MANUAL' | 'SCHEDULED' | 'AGENT';
  status: 'CREATED' | 'RUNNING' | 'PAUSED' | 'WAITING_FOR_HUMAN' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: string;
  completedAt: string | null;
  summary: AgentSessionSummary;
  configurationSnapshot: Record<string, any>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSessionEvent {
  id: string;
  sessionId: string;
  eventType: string;
  message: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface AgentStatusResponse {
  config: AgentConfiguration;
  latestSession: AgentSession | null;
  status: string;
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

export const agentSearchApi = {
  async getStatus(): Promise<AgentStatusResponse> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/agent/status', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch agent status');
    }
    return res.json();
  },

  async getConfig(): Promise<{ config: AgentConfiguration }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/agent/config', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch agent configuration');
    }
    return res.json();
  },

  async updateConfig(updates: Partial<AgentConfiguration>): Promise<{ config: AgentConfiguration }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/agent/config', {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update agent configuration');
    }
    return res.json();
  },

  async startSearch(mode: 'MANUAL' | 'SCHEDULED' | 'AGENT' = 'MANUAL'): Promise<{ session: AgentSession }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/agent/search/start', {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to start search session');
    }
    return res.json();
  },

  async getSession(id: string): Promise<{ session: AgentSession; events: AgentSessionEvent[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/agent/search/${id}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch session detail');
    }
    return res.json();
  },

  async pauseSession(id: string): Promise<{ session: AgentSession }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/agent/search/${id}/pause`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to pause search session');
    }
    return res.json();
  },

  async resumeSession(id: string): Promise<{ session: AgentSession }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/agent/search/${id}/resume`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to resume search session');
    }
    return res.json();
  },

  async stopSession(id: string): Promise<{ session: AgentSession }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/agent/search/${id}/stop`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to stop search session');
    }
    return res.json();
  },

  async getHistory(limit: number = 10): Promise<{ sessions: AgentSession[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/agent/search/history?limit=${limit}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch session history');
    }
    return res.json();
  },
};
