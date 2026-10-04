/**
 * Resume Review & Confirmation Service
 * Module 04: Resume Intelligence
 * 
 * Bridges confirmed facts to Module 01 Candidate Data Services:
 * - candidateProfileService
 * - candidateSkillService
 * - candidateExperienceService
 * - candidateEducationService
 * 
 * Rules:
 * - Never blindly overwrite confirmed candidate profile facts.
 * - Promotes confirmed facts from AI_SUGGESTED to CANDIDATE_CONFIRMED.
 * - Leaves unconfirmed facts out of confirmed candidate profile.
 */

import { candidateProfileService } from '../candidate/candidateProfileService.js';
import { candidateSkillService } from '../candidate/candidateSkillService.js';
import { candidateExperienceService } from '../candidate/candidateExperienceService.js';
import { candidateEducationService } from '../candidate/candidateEducationService.js';
import { ResumeConfirmationInput, ResumeCorrectionInput } from './resumeTypes.js';
import { logger } from '../../core/logging/logger.js';

export class ResumeReviewService {
  /**
   * Applies candidate-confirmed facts into Module 01 candidate profile and tables
   */
  public async applyConfirmedFacts(
    userId: string,
    confirmation: ResumeConfirmationInput
  ): Promise<{ profileUpdated: boolean; skillsCount: number; experienceCount: number; educationCount: number }> {
    let profileUpdated = false;
    let skillsCount = 0;
    let experienceCount = 0;
    let educationCount = 0;

    // 1. Fetch or create Candidate Profile
    const existingProfile = await candidateProfileService.getProfile(userId);
    if (!existingProfile) {
      await candidateProfileService.upsertProfile(userId, {
        displayName: confirmation.confirmedProfile?.displayName || 'Candidate',
        headline: confirmation.confirmedProfile?.headline || undefined,
        targetRoles: confirmation.confirmedProfile?.targetRoles || [],
        totalExperienceYears: confirmation.confirmedProfile?.totalExperienceYears || 0,
        preferredLocations: confirmation.confirmedProfile?.preferredLocations || [],
        workModes: confirmation.confirmedProfile?.workModes || [],
        provenance: 'CANDIDATE_CONFIRMED',
      });
      profileUpdated = true;
    } else if (confirmation.confirmedProfile) {
      // Update profile only if user confirmed changes; do not overwrite existing confirmed values blindly
      await candidateProfileService.upsertProfile(userId, {
        displayName: confirmation.confirmedProfile.displayName || existingProfile.displayName,
        headline: confirmation.confirmedProfile.headline !== undefined ? confirmation.confirmedProfile.headline : existingProfile.headline,
        targetRoles: confirmation.confirmedProfile.targetRoles && confirmation.confirmedProfile.targetRoles.length > 0
          ? Array.from(new Set([...existingProfile.targetRoles, ...confirmation.confirmedProfile.targetRoles]))
          : existingProfile.targetRoles,
        totalExperienceYears: confirmation.confirmedProfile.totalExperienceYears !== undefined
          ? confirmation.confirmedProfile.totalExperienceYears
          : existingProfile.totalExperienceYears,
        preferredLocations: confirmation.confirmedProfile.preferredLocations && confirmation.confirmedProfile.preferredLocations.length > 0
          ? Array.from(new Set([...existingProfile.preferredLocations, ...confirmation.confirmedProfile.preferredLocations]))
          : existingProfile.preferredLocations,
        workModes: confirmation.confirmedProfile.workModes && confirmation.confirmedProfile.workModes.length > 0
          ? confirmation.confirmedProfile.workModes
          : existingProfile.workModes,
        provenance: 'CANDIDATE_CONFIRMED',
      });
      profileUpdated = true;
    }

    // 2. Persist Confirmed Skills via candidateSkillService
    if (confirmation.confirmedSkills && confirmation.confirmedSkills.length > 0) {
      const existingSkills = await candidateSkillService.listSkills(userId);
      const existingNames = new Set(existingSkills.map((s) => s.skillName.toLowerCase()));

      for (const skill of confirmation.confirmedSkills) {
        if (!existingNames.has(skill.name.toLowerCase())) {
          await candidateSkillService.createSkill(userId, {
            skillName: skill.name,
            proficiencyLevel: skill.proficiencyLevel || null,
            yearsOfExperience: skill.yearsOfExperience || null,
            provenance: 'CANDIDATE_CONFIRMED',
          });
          skillsCount++;
        }
      }
    }

    // 3. Persist Confirmed Experience via candidateExperienceService
    if (confirmation.confirmedExperience && confirmation.confirmedExperience.length > 0) {
      for (const exp of confirmation.confirmedExperience) {
        await candidateExperienceService.createExperience(userId, {
          company: exp.company,
          roleTitle: exp.roleTitle,
          startDate: exp.startDate || null,
          endDate: exp.endDate || null,
          isCurrent: exp.isCurrent,
          description: exp.description || null,
          skillsUsed: exp.skillsUsed || [],
          provenance: 'CANDIDATE_CONFIRMED',
        });
        experienceCount++;
      }
    }

    // 4. Persist Confirmed Education via candidateEducationService
    if (confirmation.confirmedEducation && confirmation.confirmedEducation.length > 0) {
      for (const edu of confirmation.confirmedEducation) {
        await candidateEducationService.createEducation(userId, {
          institution: edu.institution,
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy || null,
          startDate: edu.startDate || null,
          endDate: edu.endDate || null,
          provenance: 'CANDIDATE_CONFIRMED',
        });
        educationCount++;
      }
    }

    logger.info('Successfully persisted confirmed resume facts via Module 01 Candidate Services', {
      userId,
      skillsCount,
      experienceCount,
      educationCount,
    });

    return {
      profileUpdated,
      skillsCount,
      experienceCount,
      educationCount,
    };
  }
}

export const resumeReviewService = new ResumeReviewService();
