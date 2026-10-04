/**
 * Application Evidence & Truth Validator Service
 * Module 08: Application Preparation
 * 
 * Rules:
 * 1. CANDIDATE_CONFIRMED: May be used as factual content.
 * 2. CANDIDATE_PROVIDED: May be used, marked as provided.
 * 3. AI_SUGGESTED: Must NOT silently become confirmed candidate fact. Requires candidate review.
 * 4. UNKNOWN: Must NOT be guessed. Requires human review task.
 * 5. Rejects any generated claim that cannot be supported by candidate evidence.
 */

import { FactProvenance } from '../../../src/types/candidate.js';
import { CandidateCareerEvidenceBundle } from '../matching/candidateEvidenceService.js';
import {
  PreparationEvidenceItem,
  EvidenceValidationStatus,
  ApplicationReviewItem,
} from './applicationPreparationTypes.js';

export interface ClaimValidationResult {
  isValid: boolean;
  truthState: FactProvenance;
  validationStatus: EvidenceValidationStatus;
  matchingSourceId?: string;
  matchingSourceType?: any;
  reason?: string;
}

export class ApplicationEvidenceValidator {
  /**
   * Validates a candidate skill claim against the confirmed candidate evidence bundle.
   */
  public validateSkillClaim(
    skillName: string,
    evidenceBundle: CandidateCareerEvidenceBundle
  ): ClaimValidationResult {
    const cleanClaim = skillName.trim().toLowerCase();

    // Check confirmed or provided skills in candidate bundle
    const foundSkill = evidenceBundle.skills.find(
      (s) => s.name.trim().toLowerCase() === cleanClaim
    );

    if (foundSkill) {
      if (foundSkill.provenance === 'CANDIDATE_CONFIRMED') {
        return {
          isValid: true,
          truthState: 'CANDIDATE_CONFIRMED',
          validationStatus: 'VERIFIED_CONFIRMED',
          matchingSourceId: foundSkill.name,
          matchingSourceType: 'CANDIDATE_SKILL',
        };
      }
      if (foundSkill.provenance === 'CANDIDATE_PROVIDED') {
        return {
          isValid: true,
          truthState: 'CANDIDATE_PROVIDED',
          validationStatus: 'VERIFIED_PROVIDED',
          matchingSourceId: foundSkill.name,
          matchingSourceType: 'CANDIDATE_SKILL',
        };
      }
      if (foundSkill.provenance === 'AI_SUGGESTED') {
        return {
          isValid: false,
          truthState: 'AI_SUGGESTED',
          validationStatus: 'REQUIRES_CONFIRMATION',
          reason: `Skill "${skillName}" is an unconfirmed AI suggestion.`,
        };
      }
    }

    return {
      isValid: false,
      truthState: 'UNKNOWN',
      validationStatus: 'UNSUPPORTED',
      reason: `Skill "${skillName}" is not present in candidate truth layer.`,
    };
  }

  /**
   * Validates an experience claim (employer/role/dates) against candidate experience truth.
   */
  public validateExperienceClaim(
    company: string,
    roleTitle: string,
    evidenceBundle: CandidateCareerEvidenceBundle
  ): ClaimValidationResult {
    const cleanComp = company.trim().toLowerCase();
    const cleanRole = roleTitle.trim().toLowerCase();

    const foundExp = evidenceBundle.experiences.find(
      (e) =>
        e.company.trim().toLowerCase() === cleanComp ||
        cleanComp.includes(e.company.trim().toLowerCase()) ||
        e.company.trim().toLowerCase().includes(cleanComp)
    );

    if (!foundExp) {
      return {
        isValid: false,
        truthState: 'UNKNOWN',
        validationStatus: 'UNSUPPORTED',
        reason: `Employer "${company}" does not exist in candidate verified experience.`,
      };
    }

    if (foundExp.provenance === 'CANDIDATE_CONFIRMED' || foundExp.provenance === 'CANDIDATE_PROVIDED') {
      return {
        isValid: true,
        truthState: foundExp.provenance,
        validationStatus: foundExp.provenance === 'CANDIDATE_CONFIRMED' ? 'VERIFIED_CONFIRMED' : 'VERIFIED_PROVIDED',
        matchingSourceId: foundExp.company,
        matchingSourceType: 'CANDIDATE_EXPERIENCE',
      };
    }

    return {
      isValid: false,
      truthState: foundExp.provenance,
      validationStatus: 'REQUIRES_CONFIRMATION',
      reason: `Experience at "${company}" is unconfirmed (${foundExp.provenance}).`,
    };
  }

  /**
   * Scans a generated bullet point for fabricated quantified metrics not grounded in source text.
   * If candidate source bullet did not mention numbers/metrics, flags as requiring review.
   */
  public validateBulletMetrics(
    generatedBullet: string,
    sourceText: string
  ): { hasUnsupportedMetrics: boolean; detectedMetrics: string[] } {
    // Detect numbers, percentages, currency, team sizes: e.g. "8 engineers", "45%", "$1M", "10x"
    const metricRegex = /(\b\d+(\.\d+)?%|\$\d+[kKmMbB]?|\b\d+\+?\s+(engineers|developers|clients|users|members|projects|people|teams)\b|\b\d+x\b)/gi;
    const generatedMatches = generatedBullet.match(metricRegex) || [];
    const sourceMatches = sourceText.match(metricRegex) || [];

    const unsupported: string[] = [];
    for (const gm of generatedMatches) {
      const normalizedGm = gm.toLowerCase().replace(/\s+/g, '');
      const existsInSource = sourceMatches.some(
        (sm) => sm.toLowerCase().replace(/\s+/g, '') === normalizedGm || sourceText.toLowerCase().includes(gm.toLowerCase())
      );
      if (!existsInSource) {
        unsupported.push(gm);
      }
    }

    return {
      hasUnsupportedMetrics: unsupported.length > 0,
      detectedMetrics: unsupported,
    };
  }
}

export const applicationEvidenceValidator = new ApplicationEvidenceValidator();
