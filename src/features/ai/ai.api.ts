/**
 * Minimal Frontend Client for AI Foundation Endpoint
 * Module 02 AI Service Foundation
 * 
 * Server-only AI communication. Frontend ONLY talks to /api/ai/respond via Express.
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabase/client.js';

export interface AiClientRequest {
  taskType: string;
  message: string;
  untrustedExternalContent?: string;
}

export interface AiClientResponse {
  success: boolean;
  requestId: string;
  data: {
    message: string;
    taskType: string;
    proposedToolCall?: {
      name: string;
      arguments: Record<string, unknown>;
    };
  };
}

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

export const aiClientApi = {
  /**
   * Sends a controlled AI request to the server-side AI foundation endpoint.
   */
  async askAi(request: AiClientRequest): Promise<AiClientResponse> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/respond', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(body?.error?.message || `AI request failed with status ${res.status}`);
      (err as any).statusCode = res.status;
      (err as any).code = body?.error?.code;
      (err as any).requestId = body?.error?.requestId;
      throw err;
    }

    return body as AiClientResponse;
  },
};
