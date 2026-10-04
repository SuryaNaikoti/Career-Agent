/**
 * Frontend Applications API Client
 * Module 08: Application Preparation
 * 
 * Provides client-side calls to /api/applications with Bearer authentication.
 */

import { supabase } from '../../lib/supabase/client.js';
import {
  ApplicationPreparationPackage,
} from '../../../server/services/applicationPreparation/applicationPreparationTypes.js';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User is not authenticated.');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export const applicationsApiClient = {
  /**
   * Prepares application materials for a target job
   */
  async prepareApplication(jobId: string): Promise<ApplicationPreparationPackage> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/applications/prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ jobId }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to prepare application.');
    }
    return body.data;
  },

  /**
   * Retrieves an application preparation package by ID or Job ID
   */
  async getPreparation(id: string): Promise<ApplicationPreparationPackage> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/applications/${encodeURIComponent(id)}/preparation`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to load preparation.');
    }
    return body.data;
  },

  /**
   * Resolves a human review task item
   */
  async resolveReviewItem(
    preparationId: string,
    reviewItemId: string,
    candidateResponse: string
  ): Promise<ApplicationPreparationPackage> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/applications/${encodeURIComponent(preparationId)}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ reviewItemId, candidateResponse }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to resolve review item.');
    }
    return body.data;
  },

  /**
   * Retrieves claim-to-source evidence
   */
  async getEvidence(preparationId: string): Promise<any[]> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/applications/${encodeURIComponent(preparationId)}/evidence`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to load evidence.');
    }
    return body.data;
  },

  // ==========================================================================
  // MODULE 09 LIFECYCLE & SUBMISSION CALLS
  // ==========================================================================

  /**
   * Initializes or retrieves an application lifecycle record from an approved preparation package
   */
  async createOrGetLifecycle(preparationId: string, idempotencyKey?: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/applications/lifecycle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ preparationId, idempotencyKey }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to initialize application lifecycle.');
    }
    return body.data;
  },

  /**
   * Lists all active and past application lifecycle records
   */
  async listApplications(): Promise<any[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/applications/lifecycle', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to list applications.');
    }
    return body.data;
  },

  /**
   * Retrieves full details for an application
   */
  async getApplicationDetail(id: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/applications/lifecycle/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to load application details.');
    }
    return body.data;
  },

  /**
   * Dispatches application submission
   */
  async submitApplication(id: string, options?: { candidateConfirmed?: boolean; candidateNotes?: string }): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/applications/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(options || {}),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Submission failed.');
    }
    return body.data;
  },

  /**
   * Explicit candidate confirmation of human external submission
   */
  async confirmHumanSubmission(id: string, details: { externalApplicationId?: string; candidateNotes?: string }): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/applications/${encodeURIComponent(id)}/confirm-human`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(details),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to confirm submission.');
    }
    return body.data;
  },

  /**
   * Cancels active application workflow
   */
  async cancelApplication(id: string, reason?: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/applications/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ reason }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || body.error || 'Failed to cancel application.');
    }
    return body.data;
  },
};
