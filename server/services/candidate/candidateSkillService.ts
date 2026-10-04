import { requireDatabaseClient } from '../supabaseClient.js';
import { CandidateSkill, FactProvenance } from '../../../src/types/candidate.js';
import {
  validateUuid,
  validateString,
  validateNumber,
  validateProficiencyLevel,
  validateProvenance,
} from './candidateValidation.js';
import { candidateProfileService } from './candidateProfileService.js';
import { AppError, NotFoundError, ValidationError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export interface CreateCandidateSkillInput {
  skillName: string;
  yearsOfExperience?: number | null;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'expert' | null;
  provenance?: FactProvenance;
}

export interface UpdateCandidateSkillInput {
  skillName?: string;
  yearsOfExperience?: number | null;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'expert' | null;
  provenance?: FactProvenance;
}

export function mapDbSkillToEntity(row: Record<string, any>): CandidateSkill {
  return {
    id: row.id,
    profileId: row.profile_id,
    userId: row.user_id,
    skillName: row.skill_name,
    yearsOfExperience: row.years_of_experience ? parseFloat(row.years_of_experience) : null,
    proficiencyLevel: row.proficiency_level,
    provenance: row.provenance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const candidateSkillService = {
  /**
   * Retrieves all candidate skills for the authenticated user.
   */
  async listSkills(userId: string): Promise<CandidateSkill[]> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_skills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to list candidate skills', { userId, error: error.message });
      throw new AppError('Failed to retrieve candidate skills', 500);
    }

    return (data || []).map(mapDbSkillToEntity);
  },

  /**
   * Adds a new skill for the candidate. Enforces uniqueness per candidate profile.
   */
  async createSkill(userId: string, input: CreateCandidateSkillInput): Promise<CandidateSkill> {
    const skillName = validateString(input.skillName, 'skill_name', { required: true, maxLength: 80 })!;
    const yearsOfExperience = validateNumber(input.yearsOfExperience ?? undefined, 'years_of_experience', { min: 0, max: 70 });
    const proficiencyLevel = validateProficiencyLevel(input.proficiencyLevel);
    const provenance = validateProvenance(input.provenance, 'CANDIDATE_PROVIDED');

    const profileId = await candidateProfileService.ensureProfileId(userId);

    const supabase = requireDatabaseClient();

    // Check duplicate skill name for this profile
    const { data: existing } = await supabase
      .from('candidate_skills')
      .select('id')
      .eq('profile_id', profileId)
      .ilike('skill_name', skillName)
      .maybeSingle();

    if (existing) {
      throw new ValidationError(`Skill "${skillName}" is already listed for this candidate profile`);
    }

    const { data, error } = await supabase
      .from('candidate_skills')
      .insert({
        profile_id: profileId,
        user_id: userId,
        skill_name: skillName,
        years_of_experience: yearsOfExperience ?? null,
        proficiency_level: proficiencyLevel ?? null,
        provenance,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to insert candidate skill', { userId, error: error.message });
      throw new AppError('Failed to create candidate skill', 500);
    }

    return mapDbSkillToEntity(data);
  },

  /**
   * Updates an existing skill strictly enforcing resource ownership (id AND user_id).
   */
  async updateSkill(userId: string, skillId: string, input: UpdateCandidateSkillInput): Promise<CandidateSkill> {
    const validatedId = validateUuid(skillId, 'skillId');

    const updatePayload: Record<string, any> = {};

    if (input.skillName !== undefined) {
      updatePayload.skill_name = validateString(input.skillName, 'skill_name', { required: true, maxLength: 80 });
    }
    if (input.yearsOfExperience !== undefined) {
      updatePayload.years_of_experience = validateNumber(input.yearsOfExperience ?? undefined, 'years_of_experience', { min: 0, max: 70 }) ?? null;
    }
    if (input.proficiencyLevel !== undefined) {
      updatePayload.proficiency_level = validateProficiencyLevel(input.proficiencyLevel) ?? null;
    }
    if (input.provenance !== undefined) {
      updatePayload.provenance = validateProvenance(input.provenance);
    }

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_skills')
      .update(updatePayload)
      .eq('id', validatedId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Failed to update candidate skill', { userId, skillId: validatedId, error: error.message });
      throw new AppError('Failed to update candidate skill', 500);
    }

    if (!data) {
      throw new NotFoundError('Candidate skill not found or does not belong to you');
    }

    return mapDbSkillToEntity(data);
  },

  /**
   * Deletes a skill strictly enforcing resource ownership (id AND user_id).
   */
  async deleteSkill(userId: string, skillId: string): Promise<boolean> {
    const validatedId = validateUuid(skillId, 'skillId');

    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('candidate_skills')
      .delete()
      .eq('id', validatedId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      logger.error('Failed to delete candidate skill', { userId, skillId: validatedId, error: error.message });
      throw new AppError('Failed to delete candidate skill', 500);
    }

    if (!data || data.length === 0) {
      throw new NotFoundError('Candidate skill not found or does not belong to you');
    }

    return true;
  },
};
