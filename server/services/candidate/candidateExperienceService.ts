import { requireDatabaseClient } from '../supabaseClient.js';
import { CandidateExperience, FactProvenance } from '../../../src/types/candidate.js';
import {
  validateUuid,
  validateString,
  validateStringArray,
  validateDate,
  validateProvenance,
} from './candidateValidation.js';
import { candidateProfileService } from './candidateProfileService.js';
import { AppError, NotFoundError, ValidationError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export interface CreateCandidateExperienceInput {
  company: string;
  roleTitle: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  skillsUsed?: string[];
  provenance?: FactProvenance;
}

export interface UpdateCandidateExperienceInput {
  company?: string;
  roleTitle?: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  skillsUsed?: string[];
  provenance?: FactProvenance;
}

export function mapDbExperienceToEntity(row: Record<string, any>): CandidateExperience {
  return {
    id: row.id,
    profileId: row.profile_id,
    userId: row.user_id,
    company: row.company,
    roleTitle: row.role_title,
    startDate: row.start_date,
    endDate: row.end_date,
    isCurrent: Boolean(row.is_current),
    description: row.description,
    skillsUsed: row.skills_used || [],
    provenance: row.provenance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const candidateExperienceService = {
  /**
   * Retrieves all experience entries for the authenticated candidate.
   */
  async listExperience(userId: string): Promise<CandidateExperience[]> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_experience')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false, nullsFirst: false });

    if (error) {
      logger.error('Failed to list candidate experience', { userId, error: error.message });
      throw new AppError('Failed to retrieve candidate experience', 500);
    }

    return (data || []).map(mapDbExperienceToEntity);
  },

  /**
   * Adds an experience entry for the authenticated user.
   */
  async createExperience(userId: string, input: CreateCandidateExperienceInput): Promise<CandidateExperience> {
    const company = validateString(input.company, 'company', { required: true, maxLength: 100 })!;
    const roleTitle = validateString(input.roleTitle, 'role_title', { required: true, maxLength: 100 })!;
    const isCurrent = Boolean(input.isCurrent);
    const startDate = validateDate(input.startDate ?? undefined, 'start_date');
    const endDate = validateDate(input.endDate ?? undefined, 'end_date');
    const description = validateString(input.description ?? undefined, 'description', { maxLength: 2000 });
    const skillsUsed = validateStringArray(input.skillsUsed, 'skills_used', { maxItems: 30, maxItemLength: 50 });
    const provenance = validateProvenance(input.provenance, 'CANDIDATE_PROVIDED');

    // Temporal validation
    if (isCurrent && endDate) {
      throw new ValidationError('An active current position (is_current = true) cannot have an end_date.');
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ValidationError('start_date cannot be later than end_date.');
    }

    const profileId = await candidateProfileService.ensureProfileId(userId);

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_experience')
      .insert({
        profile_id: profileId,
        user_id: userId,
        company,
        role_title: roleTitle,
        start_date: startDate ?? null,
        end_date: isCurrent ? null : (endDate ?? null),
        is_current: isCurrent,
        description: description ?? null,
        skills_used: skillsUsed,
        provenance,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create candidate experience', { userId, error: error.message });
      throw new AppError('Failed to create candidate experience', 500);
    }

    return mapDbExperienceToEntity(data);
  },

  /**
   * Updates an experience entry enforcing ownership (id AND user_id).
   */
  async updateExperience(userId: string, experienceId: string, input: UpdateCandidateExperienceInput): Promise<CandidateExperience> {
    const validatedId = validateUuid(experienceId, 'experienceId');

    const updatePayload: Record<string, any> = {};

    if (input.company !== undefined) {
      updatePayload.company = validateString(input.company, 'company', { required: true, maxLength: 100 });
    }
    if (input.roleTitle !== undefined) {
      updatePayload.role_title = validateString(input.roleTitle, 'role_title', { required: true, maxLength: 100 });
    }
    if (input.isCurrent !== undefined) {
      updatePayload.is_current = Boolean(input.isCurrent);
    }
    if (input.startDate !== undefined) {
      updatePayload.start_date = validateDate(input.startDate ?? undefined, 'start_date') ?? null;
    }
    if (input.endDate !== undefined) {
      updatePayload.end_date = validateDate(input.endDate ?? undefined, 'end_date') ?? null;
    }
    if (input.description !== undefined) {
      updatePayload.description = validateString(input.description ?? undefined, 'description', { maxLength: 2000 }) ?? null;
    }
    if (input.skillsUsed !== undefined) {
      updatePayload.skills_used = validateStringArray(input.skillsUsed, 'skills_used', { maxItems: 30, maxItemLength: 50 });
    }
    if (input.provenance !== undefined) {
      updatePayload.provenance = validateProvenance(input.provenance);
    }

    // Temporal validation if both are set
    if (updatePayload.is_current === true && updatePayload.end_date) {
      throw new ValidationError('An active current position cannot have an end_date.');
    }
    if (updatePayload.start_date && updatePayload.end_date && new Date(updatePayload.start_date) > new Date(updatePayload.end_date)) {
      throw new ValidationError('start_date cannot be after end_date.');
    }

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_experience')
      .update(updatePayload)
      .eq('id', validatedId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Failed to update candidate experience', { userId, experienceId: validatedId, error: error.message });
      throw new AppError('Failed to update candidate experience', 500);
    }

    if (!data) {
      throw new NotFoundError('Candidate experience entry not found or does not belong to you');
    }

    return mapDbExperienceToEntity(data);
  },

  /**
   * Deletes an experience entry enforcing ownership (id AND user_id).
   */
  async deleteExperience(userId: string, experienceId: string): Promise<boolean> {
    const validatedId = validateUuid(experienceId, 'experienceId');

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_experience')
      .delete()
      .eq('id', validatedId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      logger.error('Failed to delete candidate experience', { userId, experienceId: validatedId, error: error.message });
      throw new AppError('Failed to delete candidate experience', 500);
    }

    if (!data || data.length === 0) {
      throw new NotFoundError('Candidate experience entry not found or does not belong to you');
    }

    return true;
  },
};
