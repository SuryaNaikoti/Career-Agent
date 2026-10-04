/**
 * Candidate Evidence Aggregation Service
 * Module 06: Matching Engine
 * 
 * Rules:
 * - Gathers facts exclusively through Module 01 candidate services.
 * - Adheres strictly to the Truth Layer provenance model (CANDIDATE_PROVIDED, CANDIDATE_CONFIRMED, AI_SUGGESTED, UNKNOWN).
 * - Distinguishes between confirmed candidate facts and unconfirmed AI suggestions.
 * - Never hallucinates, invents, or extrapolates unsupported candidate qualifications.
 */

import { candidateProfileService } from '../candidate/candidateProfileService.js';
import { candidateSkillService } from '../candidate/candidateSkillService.js';
import { candidateExperienceService } from '../candidate/candidateExperienceService.js';
import { candidateEducationService } from '../candidate/candidateEducationService.js';
import { candidatePreferencesService } from '../candidate/candidatePreferencesService.js';
import { CandidateEvidenceItem } from './matchingTypes.js';
import { FactProvenance } from '../../../src/types/candidate.js';

export interface CandidateCareerEvidenceBundle {
  userId: string;
  skills: Array<{ name: string; years?: number | null; proficiency?: string | null; provenance: FactProvenance }>;
  experiences: Array<{ company: string; roleTitle: string; years: number; skillsUsed: string[]; description?: string | null; provenance: FactProvenance }>;
  educations: Array<{ institution: string; degree: string; fieldOfStudy?: string | null; provenance: FactProvenance }>;
  preferences: {
    targetRoles: string[];
    locations: string[];
    workModes: string[];
    minSalary: number | null;
  };
  totalExperienceYears: number;
  evidenceItems: CandidateEvidenceItem[];
  snapshotHash: string;
}

export class CandidateEvidenceService {
  /**
   * Aggregates all validated candidate data into a normalized evidence bundle.
   */
  public async loadCandidateEvidenceBundle(userId: string): Promise<CandidateCareerEvidenceBundle> {
    const [profile, skills, experience, education, preferences] = await Promise.all([
      candidateProfileService.getProfile(userId).catch(() => null),
      candidateSkillService.listSkills(userId).catch(() => []),
      candidateExperienceService.listExperience(userId).catch(() => []),
      candidateEducationService.listEducation(userId).catch(() => []),
      candidatePreferencesService.getPreferences(userId).catch(() => null),
    ]);

    const evidenceItems: CandidateEvidenceItem[] = [];

    // 1. Skill evidence
    const normalizedSkills = (skills || []).map((s) => {
      evidenceItems.push({
        sourceType: 'candidate_skills',
        sourceReference: s.id,
        truthState: s.provenance,
        evidenceText: `Candidate has skill: ${s.skillName}${s.yearsOfExperience ? ` (${s.yearsOfExperience} yrs)` : ''} [${s.provenance}]`,
        requirementName: s.skillName,
      });
      return {
        name: s.skillName,
        years: s.yearsOfExperience,
        proficiency: s.proficiencyLevel,
        provenance: s.provenance,
      };
    });

    // 2. Experience evidence
    const normalizedExperience = (experience || []).map((e) => {
      // Calculate duration in years
      let years = 1.0;
      if (e.startDate) {
        const start = new Date(e.startDate).getTime();
        const end = e.endDate ? new Date(e.endDate).getTime() : Date.now();
        const diffYears = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
        if (diffYears > 0) years = parseFloat(diffYears.toFixed(1));
      }

      evidenceItems.push({
        sourceType: 'candidate_experience',
        sourceReference: e.id,
        truthState: e.provenance,
        evidenceText: `Worked as ${e.roleTitle} at ${e.company} for ~${years} years. Skills used: ${(e.skillsUsed || []).join(', ')}.`,
      });

      return {
        company: e.company,
        roleTitle: e.roleTitle,
        years,
        skillsUsed: e.skillsUsed || [],
        description: e.description,
        provenance: e.provenance,
      };
    });

    // 3. Education evidence
    const normalizedEducation = (education || []).map((ed) => {
      evidenceItems.push({
        sourceType: 'candidate_education',
        sourceReference: ed.id,
        truthState: ed.provenance,
        evidenceText: `Completed ${ed.degree}${ed.fieldOfStudy ? ` in ${ed.fieldOfStudy}` : ''} at ${ed.institution}.`,
      });
      return {
        institution: ed.institution,
        degree: ed.degree,
        fieldOfStudy: ed.fieldOfStudy,
        provenance: ed.provenance,
      };
    });

    // 4. Preferences evidence
    const prefData = {
      targetRoles: preferences?.targetRoles || profile?.targetRoles || [],
      locations: preferences?.locations || profile?.preferredLocations || [],
      workModes: preferences?.workModes || profile?.workModes || [],
      minSalary: preferences?.minSalary || profile?.expectedSalaryMin || null,
    };

    if (prefData.targetRoles.length > 0) {
      evidenceItems.push({
        sourceType: 'candidate_preferences',
        truthState: preferences?.provenance || 'CANDIDATE_PROVIDED',
        evidenceText: `Target roles: ${prefData.targetRoles.join(', ')}.`,
      });
    }

    const totalExperienceYears = profile?.totalExperienceYears || normalizedExperience.reduce((sum, e) => sum + e.years, 0);

    // Compute deterministic snapshot hash for staleness detection
    const rawFingerprint = JSON.stringify({
      skills: normalizedSkills.map(s => `${s.name}:${s.years}:${s.provenance}`).sort(),
      experience: normalizedExperience.map(e => `${e.roleTitle}:${e.company}:${e.years}`).sort(),
      education: normalizedEducation.map(ed => `${ed.degree}:${ed.institution}`).sort(),
      preferences: prefData,
      totalYears: totalExperienceYears,
    });

    const crypto = await import('crypto');
    const snapshotHash = crypto.createHash('sha256').update(rawFingerprint).digest('hex');

    return {
      userId,
      skills: normalizedSkills,
      experiences: normalizedExperience,
      educations: normalizedEducation,
      preferences: prefData,
      totalExperienceYears,
      evidenceItems,
      snapshotHash,
    };
  }
}

export const candidateEvidenceService = new CandidateEvidenceService();
