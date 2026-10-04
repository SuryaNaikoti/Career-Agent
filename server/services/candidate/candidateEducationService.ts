import { requireDatabaseClient } from '../supabaseClient.js';
import { CandidateEducation, FactProvenance } from '../../../src/types/candidate.js';
import {
  validateUuid,
  validateString,
  validateDate,
  validateProvenance,
} from './candidateValidation.js';
import { candidateProfileService } from './candidateProfileService.js';
import { AppError, NotFoundError, ValidationError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export interface CreateCandidateEducationInput {
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  provenance?: FactProvenance;
}

export interface UpdateCandidateEducationInput {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  provenance?: FactProvenance;
}

export function mapDbEducationToEntity(row: Record<string, any>): CandidateEducation {
  return {
    id: row.id,
    profileId: row.profile_id,
    userId: row.user_id,
    institution: row.institution,
    degree: row.degree,
    fieldOfStudy: row.field_of_study,
    startDate: row.start_date,
    endDate: row.end_date,
    provenance: row.provenance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const candidateEducationService = {
  /**
   * Retrieves education entries for the authenticated candidate.
   */
  async listEducation(userId: string): Promise<CandidateEducation[]> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_education')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false, nullsFirst: false });

    if (error) {
      logger.error('Failed to list candidate education', { userId, error: error.message });
      throw new AppError('Failed to retrieve candidate education', 500);
    }

    return (data || []).map(mapDbEducationToEntity);
  },

  /**
   * Adds an education entry for the candidate.
   */
  async createEducation(userId: string, input: CreateCandidateEducationInput): Promise<CandidateEducation> {
    const institution = validateString(input.institution, 'institution', { required: true, maxLength: 120 })!;
    const degree = validateString(input.degree, 'degree', { required: true, maxLength: 100 })!;
    const fieldOfStudy = validateString(input.fieldOfStudy ?? undefined, 'field_of_study', { maxLength: 100 });
    const startDate = validateDate(input.startDate ?? undefined, 'start_date');
    const endDate = validateDate(input.endDate ?? undefined, 'end_date');
    const provenance = validateProvenance(input.provenance, 'CANDIDATE_PROVIDED');

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ValidationError('start_date cannot be later than end_date.');
    }

    const profileId = await candidateProfileService.ensureProfileId(userId);

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_education')
      .insert({
        profile_id: profileId,
        user_id: userId,
        institution,
        degree,
        fieldOfStudy: fieldOfStudy ?? null,
        start_date: startDate ?? null,
        end_date: endDate ?? null,
        provenance,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create candidate education', { userId, error: error.message });
      throw new AppError('Failed to create candidate education', 500);
    }

    return mapDbEducationToEntity(data);
  },

  /**
   * Updates an education entry enforcing ownership (id AND user_id).
   */
  async updateEducation(userId: string, educationId: string, input: UpdateCandidateEducationInput): Promise<CandidateEducation> {
    const validatedId = validateUuid(educationId, 'educationId');

    const updatePayload: Record<string, any> = {};

    if (input.institution !== undefined) {
      updatePayload.institution = validateString(input.institution, 'institution', { required: true, maxLength: 120 });
    }
    if (input.degree !== undefined) {
      updatePayload.degree = validateString(input.degree, 'degree', { required: true, maxLength: 100 });
    }
    if (input.fieldOfStudy !== undefined) {
      updatePayload.field_of_study = validateString(input.fieldOfStudy ?? undefined, 'field_of_study', { maxLength: 100 }) ?? null;
    }
    if (input.startDate !== undefined) {
      updatePayload.start_date = validateDate(input.startDate ?? undefined, 'start_date') ?? null;
    }
    if (input.endDate !== undefined) {
      updatePayload.end_date = validateDate(input.endDate ?? undefined, 'end_date') ?? null;
    }
    if (input.provenance !== undefined) {
      updatePayload.provenance = validateProvenance(input.provenance);
    }

    if (updatePayload.start_date && updatePayload.end_date && new Date(updatePayload.start_date) > new Date(updatePayload.end_date)) {
      throw new ValidationError('start_date cannot be after end_date.');
    }

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_education')
      .update(updatePayload)
      .eq('id', validatedId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Failed to update candidate education', { userId, educationId: validatedId, error: error.message });
      throw new AppError('Failed to update candidate education', 500);
    }

    if (!data) {
      throw new NotFoundError('Candidate education entry not found or does not belong to you');
    }

    return mapDbEducationToEntity(data);
  },

  /**
   * Deletes an education entry enforcing ownership (id AND user_id).
   */
  async deleteEducation(userId: string, educationId: string): Promise<boolean> {
    const validatedId = validateUuid(educationId, 'educationId');

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_education')
      .delete()
      .eq('id', validatedId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      logger.error('Failed to delete candidate education', { userId, educationId: validatedId, error: error.message });
      throw new AppError('Failed to delete candidate education', 500);
    }

    if (!data || data.length === 0) {
      throw new NotFoundError('Candidate education entry not found or does not belong to you');
    }

    return true;
  },
};
