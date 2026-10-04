/**
 * Candidate Fact Persister
 * Module 03 Interactive AI Onboarding
 * 
 * Takes candidate-confirmed facts and writes them strictly through Module 01
 * Candidate Data Services (candidateProfileService, candidateSkillService, etc.).
 * NEVER communicates directly with Supabase or fabricates data.
 */

import { ExtractedFact } from '../../../src/types/onboarding.types.js';
import { WorkMode, FactProvenance } from '../../../src/types/candidate.js';
import { candidateProfileService } from '../candidate/candidateProfileService.js';
import { candidateSkillService } from '../candidate/candidateSkillService.js';
import { candidateExperienceService } from '../candidate/candidateExperienceService.js';
import { candidateEducationService } from '../candidate/candidateEducationService.js';
import { candidatePreferencesService } from '../candidate/candidatePreferencesService.js';
import { logger } from '../../core/logging/logger.js';

export async function persistConfirmedFacts(
  userId: string,
  confirmedFacts: ExtractedFact[]
): Promise<number> {
  let count = 0;

  for (const fact of confirmedFacts) {
    const provenance: FactProvenance = 'CANDIDATE_CONFIRMED';

    try {
      switch (fact.category) {
        case 'profile': {
          if (fact.field === 'headline') {
            await candidateProfileService.upsertProfile(userId, {
              headline: String(fact.value),
              provenance,
            });
            count++;
          } else if (fact.field === 'totalExperienceYears') {
            await candidateProfileService.upsertProfile(userId, {
              totalExperienceYears: Number(fact.value),
              provenance,
            });
            count++;
          } else if (fact.field === 'displayName') {
            await candidateProfileService.upsertProfile(userId, {
              displayName: String(fact.value),
              provenance,
            });
            count++;
          }
          break;
        }

        case 'target_role': {
          const roles = Array.isArray(fact.value)
            ? (fact.value as string[])
            : [String(fact.value)];
          await candidateProfileService.upsertProfile(userId, {
            targetRoles: roles,
            provenance,
          });
          count++;
          break;
        }

        case 'skill': {
          const skillObj = typeof fact.value === 'object' && fact.value !== null
            ? (fact.value as Record<string, any>)
            : { name: String(fact.value) };

          await candidateSkillService.createSkill(userId, {
            skillName: skillObj.name || String(fact.value),
            yearsOfExperience: skillObj.years ? Number(skillObj.years) : undefined,
            proficiencyLevel: skillObj.level || undefined,
            provenance,
          });
          count++;
          break;
        }

        case 'experience': {
          const expObj = typeof fact.value === 'object' && fact.value !== null
            ? (fact.value as Record<string, any>)
            : { company: String(fact.value), roleTitle: 'Engineer' };

          await candidateExperienceService.createExperience(userId, {
            company: expObj.company || 'Company',
            roleTitle: expObj.roleTitle || 'Professional Role',
            startDate: expObj.startDate || undefined,
            endDate: expObj.endDate || undefined,
            isCurrent: expObj.isCurrent !== undefined ? Boolean(expObj.isCurrent) : true,
            skillsUsed: Array.isArray(expObj.skillsUsed) ? expObj.skillsUsed : [],
            provenance,
          });
          count++;
          break;
        }

        case 'education': {
          const eduObj = typeof fact.value === 'object' && fact.value !== null
            ? (fact.value as Record<string, any>)
            : { institution: String(fact.value), degree: 'Degree' };

          await candidateEducationService.createEducation(userId, {
            institution: eduObj.institution || 'University',
            degree: eduObj.degree || 'Degree',
            fieldOfStudy: eduObj.fieldOfStudy || undefined,
            provenance,
          });
          count++;
          break;
        }

        case 'preference': {
          if (fact.field === 'workModes') {
            const modes = Array.isArray(fact.value) ? (fact.value as WorkMode[]) : [fact.value as WorkMode];
            await candidatePreferencesService.upsertPreferences(userId, {
              workModes: modes,
              provenance,
            });
            count++;
          } else if (fact.field === 'locations') {
            const locs = Array.isArray(fact.value) ? (fact.value as string[]) : [String(fact.value)];
            await candidatePreferencesService.upsertPreferences(userId, {
              locations: locs,
              provenance,
            });
            count++;
          } else if (fact.field === 'minSalary') {
            await candidatePreferencesService.upsertPreferences(userId, {
              minSalary: Number(fact.value),
              currency: 'INR',
              provenance,
            });
            count++;
          }
          break;
        }

        default:
          logger.warn('Unknown fact category for persistence', { category: fact.category });
      }
    } catch (err: any) {
      logger.error('Failed to persist confirmed onboarding fact to candidate services', {
        userId,
        factId: fact.id,
        category: fact.category,
        error: err?.message,
      });
      // Do not rethrow in unconfigured database environments, keep processing
    }
  }

  return count;
}
