/**
 * Resume API Client for Frontend
 * Module 04: Resume Intelligence
 * 
 * Provides client-side calls to /api/resumes with Bearer authentication.
 */

import { supabase } from '../../lib/supabase/client.js';
import {
  ResumeDocumentRecord,
  ResumeConfirmationInput,
  ResumeCorrectionInput,
} from '../../../server/services/resume/resumeTypes.js';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User is not authenticated.');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export const resumeApiClient = {
  /**
   * Upload resume file (PDF or DOCX)
   */
  async uploadResume(file: File): Promise<ResumeDocumentRecord> {
    const headers = await getAuthHeader();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/resumes', {
      method: 'POST',
      headers: {
        ...headers,
      },
      body: formData,
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to upload resume.');
    }

    return body.data;
  },

  /**
   * List all resumes
   */
  async listResumes(): Promise<ResumeDocumentRecord[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/resumes', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to fetch resumes.');
    }

    return body.data;
  },

  /**
   * Get single resume details
   */
  async getResume(resumeId: string): Promise<ResumeDocumentRecord> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to load resume details.');
    }

    return body.data;
  },

  /**
   * Get signed preview URL
   */
  async getPreviewUrl(resumeId: string): Promise<string> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/preview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to get preview URL.');
    }

    return body.data.previewUrl;
  },

  /**
   * Confirm selected facts to merge with Module 01 profile
   */
  async confirmFacts(
    resumeId: string,
    confirmation: ResumeConfirmationInput
  ): Promise<{ status: string; summary: any }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(confirmation),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to confirm resume facts.');
    }

    return body.data;
  },

  /**
   * Submit correction
   */
  async correctFact(
    resumeId: string,
    correction: ResumeCorrectionInput
  ): Promise<ResumeDocumentRecord> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/correct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(correction),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to submit fact correction.');
    }

    return body.data;
  },

  /**
   * Delete resume
   */
  async deleteResume(resumeId: string): Promise<void> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Failed to delete resume.');
    }
  },
};
