/**
 * Frontend Onboarding API Client
 * Module 03 Interactive AI Onboarding
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabase/client.js';
import {
  OnboardingSession,
  StartOnboardingResponse,
  SendMessageResponse,
  ConfirmFactsResponse,
  CorrectFactResponse,
  CompleteOnboardingResponse,
} from '../../types/onboarding.types.js';

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    } catch {
      // Session retrieval failed; proceed without token
    }
  }

  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers: mergedHeaders,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.error?.message || `Onboarding request failed with status ${response.status}`;
    const err = new Error(message);
    (err as any).statusCode = response.status;
    (err as any).code = body?.error?.code;
    throw err;
  }

  return body as T;
}

export const onboardingApi = {
  /**
   * Initializes or resumes onboarding for authenticated candidate
   */
  async start(): Promise<StartOnboardingResponse> {
    return request<StartOnboardingResponse>('/api/onboarding/start', {
      method: 'POST',
    });
  },

  /**
   * Retrieves active onboarding state
   */
  async getState(): Promise<{ session: OnboardingSession }> {
    return request<{ session: OnboardingSession }>('/api/onboarding/state', {
      method: 'GET',
    });
  },

  /**
   * Sends candidate message and gets AI response + extracted facts
   */
  async sendMessage(sessionId: string, message: string): Promise<SendMessageResponse> {
    return request<SendMessageResponse>('/api/onboarding/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    });
  },

  /**
   * Confirms pending facts
   */
  async confirmFacts(sessionId: string, factIds: string[]): Promise<ConfirmFactsResponse> {
    return request<ConfirmFactsResponse>('/api/onboarding/confirm', {
      method: 'POST',
      body: JSON.stringify({ sessionId, factIds }),
    });
  },

  /**
   * Corrects a pending fact
   */
  async correctFact(
    sessionId: string,
    factId: string,
    correctedValue: unknown,
    displayValue?: string
  ): Promise<CorrectFactResponse> {
    return request<CorrectFactResponse>('/api/onboarding/correct', {
      method: 'POST',
      body: JSON.stringify({ sessionId, factId, correctedValue, displayValue }),
    });
  },

  /**
   * Finalizes onboarding session
   */
  async complete(sessionId: string): Promise<CompleteOnboardingResponse> {
    return request<CompleteOnboardingResponse>('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },
};
