import { requireDatabaseClient } from '../supabaseClient.js';
import { CandidatePreferences, FactProvenance, WorkMode } from '../../../src/types/candidate.js';
import {
  validateString,
  validateStringArray,
  validateWorkModes,
  validateNumber,
  validateProvenance,
} from './candidateValidation.js';
import { candidateProfileService } from './candidateProfileService.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export interface UpdateCandidatePreferencesInput {
  targetRoles?: string[];
  locations?: string[];
  workModes?: WorkMode[];
  minSalary?: number | null;
  currency?: string;
  benefitsPreferred?: string[];
  companiesTargeted?: string[];
  companiesExcluded?: string[];
  provenance?: FactProvenance;
}

export function mapDbPreferencesToEntity(row: Record<string, any>): CandidatePreferences {
  return {
    id: row.id,
    profileId: row.profile_id,
    userId: row.user_id,
    targetRoles: row.target_roles || [],
    locations: row.locations || [],
    workModes: row.work_modes || [],
    minSalary: row.min_salary ? parseFloat(row.min_salary) : null,
    currency: row.currency || 'INR',
    benefitsPreferred: row.benefits_preferred || [],
    companiesTargeted: row.companies_targeted || [],
    companiesExcluded: row.companies_excluded || [],
    provenance: row.provenance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const candidatePreferencesService = {
  /**
   * Retrieves candidate preferences for the authenticated user.
   */
  async getPreferences(userId: string): Promise<CandidatePreferences | null> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get candidate preferences', { userId, error: error.message });
      throw new AppError('Failed to retrieve candidate preferences', 500);
    }

    if (!data) {
      return null;
    }

    return mapDbPreferencesToEntity(data);
  },

  /**
   * Creates or updates the candidate preferences record for the user.
   */
  async upsertPreferences(userId: string, input: UpdateCandidatePreferencesInput): Promise<CandidatePreferences> {
    const targetRoles = validateStringArray(input.targetRoles, 'target_roles', { maxItems: 20, maxItemLength: 80 });
    const locations = validateStringArray(input.locations, 'locations', { maxItems: 20, maxItemLength: 80 });
    const workModes = validateWorkModes(input.workModes);
    const minSalary = validateNumber(input.minSalary ?? undefined, 'min_salary', { min: 0 });
    const currency = validateString(input.currency, 'currency', { maxLength: 3 }) || 'INR';
    const benefitsPreferred = validateStringArray(input.benefitsPreferred, 'benefits_preferred', { maxItems: 20, maxItemLength: 80 });
    const companiesTargeted = validateStringArray(input.companiesTargeted, 'companies_targeted', { maxItems: 50, maxItemLength: 100 });
    const companiesExcluded = validateStringArray(input.companiesExcluded, 'companies_excluded', { maxItems: 50, maxItemLength: 100 });
    const provenance = validateProvenance(input.provenance, 'CANDIDATE_PROVIDED');

    const profileId = await candidateProfileService.ensureProfileId(userId);

    const supabase = requireDatabaseClient();

    const dbPayload = {
      profile_id: profileId,
      user_id: userId,
      target_roles: targetRoles,
      locations,
      work_modes: workModes,
      min_salary: minSalary ?? null,
      currency,
      benefits_preferred: benefitsPreferred,
      companies_targeted: companiesTargeted,
      companies_excluded: companiesExcluded,
      provenance,
    };

    const { data, error } = await supabase
      .from('candidate_preferences')
      .upsert(dbPayload, { onConflict: 'profile_id' })
      .select()
      .single();

    if (error) {
      logger.error('Failed to upsert candidate preferences', { userId, error: error.message });
      throw new AppError('Failed to save candidate preferences', 500);
    }

    return mapDbPreferencesToEntity(data);
  },
};
