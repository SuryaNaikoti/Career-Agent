/**
 * Matching Engine Domain Types & Interfaces
 * Module 06: Matching Engine
 */

import { FactProvenance } from '../../../src/types/candidate.js';
import { WorkplaceType, CanonicalEmploymentType } from '../job/jobTypes.js';

export const SCORING_VERSION = 'v1.0.0';
export const ANALYSIS_VERSION = 'v1.0.0';

export type MatchStatus =
  | 'EXCELLENT_MATCH'
  | 'STRONG_MATCH'
  | 'MODERATE_MATCH'
  | 'PARTIAL_MATCH'
  | 'LOW_MATCH'
  | 'BLOCKED_BY_REQUIREMENT'
  | 'INSUFFICIENT_DATA';

export type QualificationStatus =
  | 'MET'
  | 'PARTIALLY_MET'
  | 'MISSING'
  | 'UNKNOWN'
  | 'NOT_APPLICABLE';

export type RequirementImportance = 'REQUIRED' | 'PREFERRED';

export type RequirementType =
  | 'ROLE'
  | 'SKILL'
  | 'EXPERIENCE'
  | 'SENIORITY'
  | 'LOCATION'
  | 'WORKPLACE'
  | 'EMPLOYMENT_TYPE'
  | 'COMPENSATION'
  | 'EDUCATION'
  | 'CERTIFICATION'
  | 'LANGUAGE'
  | 'ELIGIBILITY';

export type MatchComponentType =
  | 'ROLE_ALIGNMENT'
  | 'SKILL_ALIGNMENT'
  | 'EXPERIENCE_ALIGNMENT'
  | 'SENIORITY_ALIGNMENT'
  | 'LOCATION_WORKPLACE_ALIGNMENT'
  | 'COMPENSATION_ALIGNMENT'
  | 'EMPLOYMENT_TYPE_ALIGNMENT'
  | 'EDUCATION_CERTIFICATION_ALIGNMENT';

export interface MatchingWeightsConfig {
  roleAlignment: number;
  skillAlignment: number;
  experienceAlignment: number;
  seniorityAlignment: number;
  locationWorkplaceAlignment: number;
  compensationAlignment: number;
  employmentTypeAlignment: number;
  educationCertificationAlignment: number;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeightsConfig = {
  roleAlignment: 0.15,
  skillAlignment: 0.25,
  experienceAlignment: 0.20,
  seniorityAlignment: 0.10,
  locationWorkplaceAlignment: 0.10,
  compensationAlignment: 0.05,
  employmentTypeAlignment: 0.05,
  educationCertificationAlignment: 0.10,
};

export interface ExtractedJobRequirement {
  id?: string;
  type: RequirementType;
  name: string;
  importance: RequirementImportance;
  sourceText?: string;
  confidence: number;
  criteria?: {
    yearsRequired?: number;
    degreeLevel?: string;
    targetRoles?: string[];
    allowedLocations?: string[];
    allowedWorkplaceTypes?: WorkplaceType[];
    allowedEmploymentTypes?: CanonicalEmploymentType[];
    minSalary?: number;
    isMandatoryBlocker?: boolean;
  };
}

export interface CandidateEvidenceItem {
  id?: string;
  requirementName?: string;
  sourceType: 'candidate_skills' | 'candidate_experience' | 'candidate_education' | 'candidate_profile' | 'candidate_preferences';
  sourceReference?: string;
  truthState: FactProvenance;
  evidenceText: string;
}

export interface RequirementMatchEvaluation {
  requirement: ExtractedJobRequirement;
  qualificationStatus: QualificationStatus;
  confidence: number;
  explanation: string;
  evidence: CandidateEvidenceItem[];
  isBlocker: boolean;
}

export interface ComponentScoreResult {
  componentType: MatchComponentType;
  rawScore: number; // 0 to 100
  weight: number;
  weightedScore: number;
  status: 'STRONG' | 'MODERATE' | 'WEAK' | 'NOT_APPLICABLE' | 'BLOCKED';
  explanation: string;
}

export interface SkillGapItem {
  skillName: string;
  gapType: 'MISSING' | 'PARTIAL' | 'TRANSFERABLE';
  importance: RequirementImportance;
  transferable: boolean;
  explanation: string;
  relatedCandidateSkill?: string;
}

export interface JobMatchResult {
  id: string;
  userId: string;
  jobId: string;
  overallScore: number; // 0 to 100
  matchStatus: MatchStatus;
  criticalRequirementCount: number;
  requiredGapCount: number;
  preferredGapCount: number;
  scoringVersion: string;
  analysisVersion: string;
  candidateSnapshotHash: string;
  jobSnapshotHash: string;
  summaryExplanation: string;
  components: ComponentScoreResult[];
  requirements: RequirementMatchEvaluation[];
  skillGaps: SkillGapItem[];
  blockers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JobMatchSummary {
  jobId: string;
  score: number;
  matchStatus: MatchStatus;
  criticalBlockers: number;
  requiredGaps: number;
  preferredGaps: number;
  summaryExplanation: string;
}
