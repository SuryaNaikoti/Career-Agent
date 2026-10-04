/**
 * Frontend Gmail & Hiring Intelligence API Client
 * Module 11: Gmail & Hiring Intelligence
 */

import { supabase } from '../../lib/supabase/client.js';
import {
  GmailConnectionRecord,
  NormalizedGmailMessage,
  GmailSyncSummary,
} from '../../../server/services/gmail/gmailTypes.js';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User is not authenticated.');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export const gmailApiClient = {
  /**
   * Retrieves Gmail connection status for the authenticated user
   */
  async getStatus(): Promise<{ connected: boolean; connection: GmailConnectionRecord | null }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/gmail/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to get Gmail status.');
    }
    return body.data;
  },

  /**
   * Requests Google OAuth consent authorization URL
   */
  async getConnectUrl(redirectUri?: string): Promise<{ url: string; state: string }> {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (redirectUri) params.append('redirectUri', redirectUri);

    const res = await fetch(`/api/gmail/connect${params.toString() ? `?${params.toString()}` : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to initiate Gmail connection.');
    }
    return body.data;
  },

  /**
   * Triggers a bounded inbox synchronization
   */
  async syncNow(): Promise<GmailSyncSummary> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/gmail/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to sync Gmail inbox.');
    }
    return body.data;
  },

  /**
   * Disconnects Gmail account and wipes stored tokens
   */
  async disconnect(): Promise<void> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/gmail/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to disconnect Gmail.');
    }
  },

  /**
   * Retrieves list of classified hiring intelligence messages
   */
  async listHiringIntelligence(): Promise<NormalizedGmailMessage[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/hiring-intelligence', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to load hiring updates.');
    }
    return body.data;
  },
};
