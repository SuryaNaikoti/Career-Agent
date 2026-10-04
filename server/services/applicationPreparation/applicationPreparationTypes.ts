/**
 * Application Preparation Core Domain Types
 * Module 08: Application Preparation
 * 
 * Strict contracts for application preparation lifecycles, tailored resume,
 * tailored cover letter, application answers, review tasks, evidence mapping,
 * readiness evaluation, and snapshots.
 */

import { FactProvenance } from '../../../src/types/candidate.js';
import { CanonicalJob } from '../job/jobTypes.js';
import { ExtractedJobRequirement, JobMatchResult } from '../matching/matchingTypes.js';

export type PreparationStatus =
  | 'DRAFT'
  | 'PREPARING'
  | 'REVIEW_REQUIRED'
  | 'READY_FOR_APPLICATION'
  | 'STALE'
  | 'FAILED';

export type ReviewItemType =
  | 'MISSING_INFORMATION'
  | 'CONFIRM_CANDIDATE_FACT'
  | 'UNSUPPORTED_CLAIM'
  | 'QUESTION_ANSWER_REQUIRED';

export type ReviewItemStatus =
  | 'PENDING'
  | 'RESOLVED'
  | 'REJECTED'
  | 'DISMISSED';

export type EvidenceSourceType =
  | 'CANDIDATE_PROFILE'
  | 'CANDIDATE_SKILL'
  | 'CANDIDATE_EXPERIENCE'
  | 'CANDIDATE_EDUCATION'
  | 'CANDIDATE_PREFERENCES'
  | 'RESUME_FACT'
  | 'CANDIDATE_CONFIRMED_RESPONSE';

export type EvidenceValidationStatus =
  | 'VERIFIED_CONFIRMED'
  | 'VERIFIED_PROVIDED'
  | 'REQUIRES_CONFIRMATION'
  | 'UNSUPPORTED';

/**
 * Claim-to-source provenance link
 */
export interface PreparationEvidenceItem {
  id?: string;
  preparationId?: string;
  versionId?: string;
  artifactType: 'RESUME' | 'COVER_LETTER' | 'APPLICATION_ANSWER';
  claimText: string;
  sourceType: EvidenceSourceType;
  sourceId?: string;
  sourceField?: string;
  truthState: FactProvenance;
  validationStatus: EvidenceValidationStatus;
}

/**
 * Tailored Resume Structure (grounded in candidate truth)
 */
export interface TailoredResumeExperienceBullet {
  text: string;
  evidenceSourceId?: string;
  truthState: FactProvenance;
}

export interface TailoredResumeExperience {
  company: string;
  roleTitle: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  location?: string | null;
  bullets: TailoredResumeExperienceBullet[];
  skillsUsed: string[];
}

export interface TailoredResumeData {
  fullName: string;
  headline: string;
  summary: string;
  skills: Array<{ name: string; truthState: FactProvenance }>;
  experience: TailoredResumeExperience[];
  education: Array<{ institution: string; degree: string; fieldOfStudy?: string | null }>;
  certifications?: string[];
}

/**
 * Tailored Cover Letter Structure
 */
export interface TailoredCoverLetterData {
  salutation: string;
  openingParagraph: string;
  experienceParagraph: string;
  skillsAlignmentParagraph: string;
  closingParagraph: string;
  signOff: string;
  groundedClaimsCount: number;
}

/**
 * Application Question and Drafted Answer
 */
export interface ApplicationQuestionAnswer {
  id: string;
  question: string;
  category: 'work_authorization' | 'salary' | 'experience' | 'notice_period' | 'relocation' | 'general';
  required: boolean;
  answerText: string | null;
  status: 'READY' | 'REQUIRES_REVIEW' | 'UNKNOWN';
  truthState: FactProvenance;
  evidenceSource?: string;
}

/**
 * Human Review Item
 */
export interface ApplicationReviewItem {
  id: string;
  preparationId: string;
  versionId?: string;
  userId: string;
  itemType: ReviewItemType;
  title: string;
  description: string;
  targetField?: string;
  blocking: boolean;
  status: ReviewItemStatus;
  proposedAnswer?: string | null;
  candidateResponse?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

/**
 * Immutable Version Snapshot
 */
export interface ApplicationPreparationVersion {
  id: string;
  preparationId: string;
  userId: string;
  versionNumber: number;
  jobSnapshotHash: string;
  candidateSnapshotHash: string;
  resumeId?: string | null;
  matchingScore?: number | null;
  matchingVersion?: string | null;
  tailoredResume: TailoredResumeData;
  tailoredCoverLetter: TailoredCoverLetterData;
  applicationAnswers: ApplicationQuestionAnswer[];
  status: PreparationStatus;
  isReadyForApplication: boolean;
  summaryNotes?: string | null;
  createdAt: string;
}

/**
 * Top-level Application Preparation Record
 */
export interface ApplicationPreparation {
  id: string;
  userId: string;
  jobId: string;
  currentVersionId?: string | null;
  status: PreparationStatus;
  readinessScore: number;
  isReadyForApplication: boolean;
  blockingReviewCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full Hydrated Application Package
 */
export interface ApplicationPreparationPackage {
  preparation: ApplicationPreparation;
  activeVersion: ApplicationPreparationVersion | null;
  reviewItems: ApplicationReviewItem[];
  evidence: PreparationEvidenceItem[];
  job: CanonicalJob;
  match?: JobMatchResult | null;
  blockingReasons: string[];
}
