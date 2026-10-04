import { supabase, isSupabaseConfigured } from '../../lib/supabase/client.js';
import {
  CandidateProfile,
  CandidateSkill,
  CandidateExperience,
  CandidateEducation,
  CandidatePreferences,
} from '../../types/candidate.js';

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
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
    const errorBody = body as ApiErrorResponse;
    const message = errorBody?.error?.message || `API request failed with status ${response.status}`;
    const err = new Error(message);
    (err as any).statusCode = response.status;
    (err as any).code = errorBody?.error?.code || 'ApiError';
    (err as any).details = errorBody?.error?.details;
    throw err;
  }

  return body as T;
}

export const candidateApi = {
  // ============================================================================
  // PROFILE
  // ============================================================================
  async getProfile(): Promise<CandidateProfile | null> {
    const res = await request<ApiResponse<CandidateProfile | null>>('/api/candidate/profile');
    return res.data;
  },

  async updateProfile(profileData: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const res = await request<ApiResponse<CandidateProfile>>('/api/candidate/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return res.data;
  },

  // ============================================================================
  // SKILLS
  // ============================================================================
  async getSkills(): Promise<CandidateSkill[]> {
    const res = await request<ApiResponse<CandidateSkill[]>>('/api/candidate/skills');
    return res.data || [];
  },

  async createSkill(skillData: {
    skillName: string;
    yearsOfExperience?: number | null;
    proficiencyLevel?: 'beginner' | 'intermediate' | 'expert' | null;
    provenance?: string;
  }): Promise<CandidateSkill> {
    const res = await request<ApiResponse<CandidateSkill>>('/api/candidate/skills', {
      method: 'POST',
      body: JSON.stringify(skillData),
    });
    return res.data;
  },

  async updateSkill(id: string, skillData: Partial<CandidateSkill>): Promise<CandidateSkill> {
    const res = await request<ApiResponse<CandidateSkill>>(`/api/candidate/skills/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(skillData),
    });
    return res.data;
  },

  async deleteSkill(id: string): Promise<boolean> {
    await request<{ success: boolean }>(`/api/candidate/skills/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  },

  // ============================================================================
  // EXPERIENCE
  // ============================================================================
  async getExperience(): Promise<CandidateExperience[]> {
    const res = await request<ApiResponse<CandidateExperience[]>>('/api/candidate/experience');
    return res.data || [];
  },

  async createExperience(experienceData: {
    company: string;
    roleTitle: string;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
    description?: string | null;
    skillsUsed?: string[];
    provenance?: string;
  }): Promise<CandidateExperience> {
    const res = await request<ApiResponse<CandidateExperience>>('/api/candidate/experience', {
      method: 'POST',
      body: JSON.stringify(experienceData),
    });
    return res.data;
  },

  async updateExperience(id: string, experienceData: Partial<CandidateExperience>): Promise<CandidateExperience> {
    const res = await request<ApiResponse<CandidateExperience>>(`/api/candidate/experience/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(experienceData),
    });
    return res.data;
  },

  async deleteExperience(id: string): Promise<boolean> {
    await request<{ success: boolean }>(`/api/candidate/experience/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  },

  // ============================================================================
  // EDUCATION
  // ============================================================================
  async getEducation(): Promise<CandidateEducation[]> {
    const res = await request<ApiResponse<CandidateEducation[]>>('/api/candidate/education');
    return res.data || [];
  },

  async createEducation(educationData: {
    institution: string;
    degree: string;
    fieldOfStudy?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    provenance?: string;
  }): Promise<CandidateEducation> {
    const res = await request<ApiResponse<CandidateEducation>>('/api/candidate/education', {
      method: 'POST',
      body: JSON.stringify(educationData),
    });
    return res.data;
  },

  async updateEducation(id: string, educationData: Partial<CandidateEducation>): Promise<CandidateEducation> {
    const res = await request<ApiResponse<CandidateEducation>>(`/api/candidate/education/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(educationData),
    });
    return res.data;
  },

  async deleteEducation(id: string): Promise<boolean> {
    await request<{ success: boolean }>(`/api/candidate/education/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  },

  // ============================================================================
  // PREFERENCES
  // ============================================================================
  async getPreferences(): Promise<CandidatePreferences | null> {
    const res = await request<ApiResponse<CandidatePreferences | null>>('/api/candidate/preferences');
    return res.data;
  },

  async updatePreferences(preferencesData: Partial<CandidatePreferences>): Promise<CandidatePreferences> {
    const res = await request<ApiResponse<CandidatePreferences>>('/api/candidate/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferencesData),
    });
    return res.data;
  },
};
