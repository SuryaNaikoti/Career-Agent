/**
 * Frontend Jobs API Client
 * Module 05: Job Discovery & Ingestion
 * 
 * Provides client-side calls to /api/jobs with Bearer authentication.
 */

import { supabase } from '../../lib/supabase/client.js';
import {
  CanonicalJob,
  JobSearchParams,
  JobSearchResult,
  JobSourceMetadata,
} from '../../../server/services/job/jobTypes.js';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User is not authenticated.');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export const jobsApiClient = {
  /**
   * Search jobs from the canonical database
   */
  async searchJobs(params: JobSearchParams = {}): Promise<JobSearchResult> {
    const headers = await getAuthHeader();
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.set('q', params.query);
    if (params.location) searchParams.set('location', params.location);
    if (params.workplaceType && params.workplaceType !== 'UNKNOWN') searchParams.set('workplace', params.workplaceType);
    if (params.employmentType && params.employmentType !== 'UNKNOWN') searchParams.set('employment', params.employmentType);
    if (params.company) searchParams.set('company', params.company);
    if (params.minSalary) searchParams.set('minSalary', String(params.minSalary));
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const res = await fetch(`/api/jobs?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to search jobs.');
    }

    return body.data;
  },

  /**
   * Get single job by canonical ID
   */
  async getJob(id: string): Promise<CanonicalJob> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to load job details.');
    }

    return body.data;
  },

  /**
   * List configured job sources
   */
  async listSources(): Promise<JobSourceMetadata[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/jobs/sources', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to fetch job sources.');
    }

    return body.data;
  },

  /**
   * Fetch candidate discovery feed with match intelligence and interaction states
   */
  async getCandidateFeed(params: Record<string, any> = {}): Promise<any> {
    const headers = await getAuthHeader();
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });

    const res = await fetch(`/api/jobs/feed?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to load candidate feed.');
    }
    return body.data;
  },

  /**
   * Fetch personalized recommendations
   */
  async getRecommendedJobs(): Promise<any[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/jobs/recommended', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to load recommendations.');
    }
    return body.data;
  },

  /**
   * Fetch saved jobs
   */
  async getSavedJobs(): Promise<CanonicalJob[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/jobs/saved', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to load saved jobs.');
    }
    return body.data;
  },

  /**
   * Save a job
   */
  async saveJob(jobId: string): Promise<{ success: boolean; isSaved: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to save job.');
    }
    return body.data;
  },

  /**
   * Unsave a job
   */
  async unsaveJob(jobId: string): Promise<{ success: boolean; isSaved: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/save`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to unsave job.');
    }
    return body.data;
  },

  /**
   * Dismiss a job
   */
  async dismissJob(jobId: string): Promise<{ success: boolean; isDismissed: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/dismiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to dismiss job.');
    }
    return body.data;
  },

  /**
   * Record a viewed job
   */
  async recordJobView(jobId: string): Promise<void> {
    try {
      const headers = await getAuthHeader();
      await fetch(`/api/jobs/${encodeURIComponent(jobId)}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
    } catch {
      // Non-blocking
    }
  },
};
