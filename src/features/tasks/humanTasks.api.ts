/**
 * Frontend Human Tasks API Client
 * Module 10: Human Task Engine
 * 
 * Provides client-side calls to /api/tasks with Bearer authentication.
 */

import { supabase } from '../../lib/supabase/client.js';
import {
  HumanTaskRecord,
  TaskListQuery,
  CompleteTaskInput,
} from '../../../server/services/humanTask/humanTaskTypes.js';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User is not authenticated.');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export const humanTasksApiClient = {
  /**
   * Lists tasks for the authenticated user with optional filtering
   */
  async listTasks(query: TaskListQuery = {}): Promise<HumanTaskRecord[]> {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (query.status) params.append('status', query.status);
    if (query.priority) params.append('priority', query.priority);
    if (query.taskType) params.append('taskType', query.taskType);
    if (query.applicationId) params.append('applicationId', query.applicationId);
    if (query.limit) params.append('limit', String(query.limit));
    if (query.offset) params.append('offset', String(query.offset));

    const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to list tasks.');
    }
    return body.data;
  },

  /**
   * Retrieves a single task by ID
   */
  async getTask(id: string): Promise<HumanTaskRecord> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to retrieve task.');
    }
    return body.data;
  },

  /**
   * Marks a task as IN_PROGRESS
   */
  async startTask(id: string): Promise<HumanTaskRecord> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to start task.');
    }
    return body.data;
  },

  /**
   * Submits a candidate response and completes the task
   */
  async completeTask(id: string, input: CompleteTaskInput): Promise<HumanTaskRecord> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(input),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to complete task.');
    }
    return body.data;
  },

  /**
   * Cancels a task
   */
  async cancelTask(id: string, reason?: string): Promise<HumanTaskRecord> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ reason }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to cancel task.');
    }
    return body.data;
  },
};
