import { requireDatabaseClient } from '../supabaseClient.js';
import { CandidateProfile, FactProvenance, WorkMode } from '../../../src/types/candidate.js';
import {
  validateString,
  validateStringArray,
  validateWorkModes,
  validateNumber,
  validateProvenance,
} from './candidateValidation.js';
import { AppError, NotFoundError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export interface UpdateCandidateProfileInput {
  displayName?: string;
  headline?: string | null;
  careerGoal?: string | null;
  targetRoles?: string[];
  totalExperienceYears?: number;
  preferredLocations?: string[];
  workModes?: WorkMode[];
  expectedSalaryMin?: number | null;
  expectedSalaryMax?: number | null;
  currency?: string;
  workAuthorization?: string | null;
  provenance?: FactProvenance;
  metadata?: Record<string, unknown>;
}

export function mapDbProfileToEntity(row: Record<string, any>): CandidateProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    headline: row.headline,
    careerGoal: row.career_goal,
    targetRoles: row.target_roles || [],
    totalExperienceYears: parseFloat(row.total_experience_years || '0'),
    preferredLocations: row.preferred_locations || [],
    workModes: row.work_modes || [],
    expectedSalaryMin: row.expected_salary_min ? parseFloat(row.expected_salary_min) : null,
    expectedSalaryMax: row.expected_salary_max ? parseFloat(row.expected_salary_max) : null,
    currency: row.currency || 'INR',
    workAuthorization: row.work_authorization,
    provenance: row.provenance,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const candidateProfileService = {
  /**
   * Retrieves the candidate profile strictly scoped by authenticated userId.
   */
  async getProfile(userId: string): Promise<CandidateProfile | null> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get candidate profile', { userId, error: error.message });
      throw new AppError('Failed to retrieve candidate profile', 500);
    }

    if (!data) {
      return null;
    }

    return mapDbProfileToEntity(data);
  },

  /**
   * Creates or updates the candidate profile for the authenticated user.
   */
  async upsertProfile(userId: string, input: UpdateCandidateProfileInput, defaultDisplayName?: string): Promise<CandidateProfile> {
    // 1. Validate inputs thoroughly
    const displayName = validateString(input.displayName, 'display_name', {
      required: false,
      maxLength: 100,
    }) || defaultDisplayName || 'Candidate';

    const headline = validateString(input.headline ?? undefined, 'headline', { maxLength: 250 });
    const careerGoal = validateString(input.careerGoal ?? undefined, 'career_goal', { maxLength: 1000 });
    const targetRoles = validateStringArray(input.targetRoles, 'target_roles', { maxItems: 20, maxItemLength: 80 });
    const preferredLocations = validateStringArray(input.preferredLocations, 'preferred_locations', { maxItems: 20, maxItemLength: 80 });
    const workModes = validateWorkModes(input.workModes);
    const totalExperienceYears = validateNumber(input.totalExperienceYears, 'total_experience_years', { min: 0, max: 70 }) ?? 0;
    const expectedSalaryMin = validateNumber(input.expectedSalaryMin ?? undefined, 'expected_salary_min', { min: 0 });
    const expectedSalaryMax = validateNumber(input.expectedSalaryMax ?? undefined, 'expected_salary_max', { min: 0 });
    const currency = validateString(input.currency, 'currency', { maxLength: 3 }) || 'INR';
    const workAuthorization = validateString(input.workAuthorization ?? undefined, 'work_authorization', { maxLength: 100 });
    const provenance = validateProvenance(input.provenance, 'CANDIDATE_PROVIDED');

    const dbPayload: Record<string, any> = {
      user_id: userId,
      display_name: displayName,
      headline: headline ?? null,
      career_goal: careerGoal ?? null,
      target_roles: targetRoles,
      total_experience_years: totalExperienceYears,
      preferred_locations: preferredLocations,
      work_modes: workModes,
      expected_salary_min: expectedSalaryMin ?? null,
      expected_salary_max: expectedSalaryMax ?? null,
      currency,
      work_authorization: workAuthorization ?? null,
      provenance,
      metadata: input.metadata || {},
    };

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_profiles')
      .upsert(dbPayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      logger.error('Failed to upsert candidate profile', { userId, error: error.message });
      throw new AppError('Failed to save candidate profile', 500);
    }

    return mapDbProfileToEntity(data);
  },

  /**
   * Ensures a profile exists for a user (creating a minimal base profile if none exists),
   * returning the profileId needed for child relation tables.
   */
  async ensureProfileId(userId: string, defaultName?: string): Promise<string> {
    const existing = await this.getProfile(userId);
    if (existing) {
      return existing.id;
    }
    const created = await this.upsertProfile(userId, {}, defaultName);
    return created.id;
  },
};
