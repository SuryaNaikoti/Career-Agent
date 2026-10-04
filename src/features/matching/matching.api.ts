/**
 * Matching API Client
 * Module 06: Matching Engine
 */

import { supabase } from '../../lib/supabase/client.js';
import { JobMatchResult, JobMatchSummary } from '../../../server/services/matching/matchingTypes.js';

export const matchingApiClient = {
  /**
   * Fetches or calculates match details for a specific job.
   */
  async getJobMatch(jobId: string): Promise<JobMatchResult> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/match`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch match intelligence' }));
      throw new Error(err.message || `Error ${res.status}`);
    }

    const payload = await res.json();
    return payload.data;
  },

  /**
   * Forces recalculation of job match.
   */
  async recalculateJobMatch(jobId: string): Promise<JobMatchResult> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/match/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to recalculate match' }));
      throw new Error(err.message || `Error ${res.status}`);
    }

    const payload = await res.json();
    return payload.data;
  },

  /**
   * Lists candidate match summaries.
   */
  async listMatches(): Promise<JobMatchSummary[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch('/api/matches', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch matches' }));
      throw new Error(err.message || `Error ${res.status}`);
    }

    const payload = await res.json();
    return payload.data;
  },
};
