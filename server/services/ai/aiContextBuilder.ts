/**
 * AI Candidate Context Builder
 * Module 02 AI Service Foundation
 * 
 * Uses Module 01 Candidate Data Services to build a sanitized, authoritative,
 * minimal context for the AI Orchestrator. NEVER queries Supabase directly.
 */

import { candidateProfileService } from '../candidate/candidateProfileService.js';
import { candidateSkillService } from '../candidate/candidateSkillService.js';
import { candidateExperienceService } from '../candidate/candidateExperienceService.js';
import { candidateEducationService } from '../candidate/candidateEducationService.js';
import { candidatePreferencesService } from '../candidate/candidatePreferencesService.js';
import { AiCandidateContext, AiContext, AiTaskType } from './aiTypes.js';
import { logger } from '../../core/logging/logger.js';

export async function buildCandidateContext(userId: string, requestId?: string): Promise<AiCandidateContext | null> {
  try {
    // 1. Retrieve Candidate Profile via candidateProfileService
    const profile = await candidateProfileService.getProfile(userId);
    if (!profile) {
      return null;
    }

    // 2. Retrieve Skills via candidateSkillService
    const skills = await candidateSkillService.listSkills(userId);
    const confirmedSkills = skills
      .filter((s) => s.provenance === 'CANDIDATE_PROVIDED' || s.provenance === 'CANDIDATE_CONFIRMED')
      .map((s) => ({
        name: s.skillName,
        years: s.yearsOfExperience,
        level: s.proficiencyLevel,
      }));

    // 3. Retrieve Experience via candidateExperienceService
    const experiences = await candidateExperienceService.listExperience(userId);
    const confirmedExperience = experiences
      .filter((e) => e.provenance === 'CANDIDATE_PROVIDED' || e.provenance === 'CANDIDATE_CONFIRMED')
      .map((e) => ({
        company: e.company,
        roleTitle: e.roleTitle,
        startDate: e.startDate,
        endDate: e.endDate,
        isCurrent: e.isCurrent,
      }));

    // 4. Retrieve Education via candidateEducationService
    const educations = await candidateEducationService.listEducation(userId);
    const confirmedEducation = educations
      .filter((ed) => ed.provenance === 'CANDIDATE_PROVIDED' || ed.provenance === 'CANDIDATE_CONFIRMED')
      .map((ed) => ({
        institution: ed.institution,
        degree: ed.degree,
      }));

    // 5. Retrieve Preferences via candidatePreferencesService
    const preferences = await candidatePreferencesService.getPreferences(userId);

    const confirmedSkillNames = confirmedSkills.map((s) => s.name);

    return {
      profileId: profile.id,
      displayName: profile.displayName,
      headline: profile.headline,
      targetRoles: profile.targetRoles,
      totalExperienceYears: profile.totalExperienceYears,
      preferredLocations: profile.preferredLocations,
      workModes: profile.workModes,
      expectedSalaryMin: profile.expectedSalaryMin,
      currency: profile.currency,
      confirmedSkills,
      confirmedExperience,
      confirmedEducation,
      preferences: {
        targetRoles: preferences?.targetRoles || [],
        locations: preferences?.locations || [],
        workModes: preferences?.workModes || [],
        minSalary: preferences?.minSalary,
        companiesTargeted: preferences?.companiesTargeted || [],
        companiesExcluded: preferences?.companiesExcluded || [],
      },
      truthMetadata: {
        confirmedSkillNames,
        unknownAttributes: [], // can be dynamically populated by task evaluation
      },
    };
  } catch (err: any) {
    // If database is not configured (e.g., during unconfigured integration test), log and return null context
    logger.info('Candidate context building skipped or incomplete', { userId, requestId, error: err?.message });
    return null;
  }
}

export async function buildAiContext(params: {
  userId: string;
  taskType: AiTaskType;
  userMessage: string;
  untrustedExternalContent?: string;
  requestId: string;
}): Promise<AiContext> {
  const candidateContext = await buildCandidateContext(params.userId, params.requestId);

  return {
    userId: params.userId,
    taskType: params.taskType,
    userMessage: params.userMessage,
    candidateContext,
    allowedActions: [],
    untrustedExternalContent: params.untrustedExternalContent || null,
    requestId: params.requestId,
  };
}
