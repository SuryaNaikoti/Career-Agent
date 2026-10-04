/**
 * Application Lifecycle & Submission Domain Types
 * Module 09: Application Lifecycle
 * 
 * Strict contracts for lifecycle states, submission strategies, submission adapters,
 * human action tasks, submission attempts, history audits, and candidate confirmation.
 */

import { CanonicalJob } from '../job/jobTypes.js';
import {
  ApplicationPreparation,
  ApplicationPreparationVersion,
  TailoredResumeData,
  TailoredCoverLetterData,
  ApplicationQuestionAnswer,
} from '../applicationPreparation/applicationPreparationTypes.js';

export type ApplicationLifecycleStatus =
  | 'READY_FOR_SUBMISSION'
  | 'SUBMISSION_PENDING'
  | 'HUMAN_ACTION_REQUIRED'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'SUBMISSION_FAILED'
  | 'WITHDRAWN'
  | 'CANCELLED';

export type SubmissionStrategy =
  | 'AUTHORIZED_AUTOMATIC'
  | 'ASSISTED_APPLICATION'
  | 'HUMAN_REQUIRED'
  | 'RESTRICTED'
  | 'DISABLED';

export type SubmissionMethod =
  | 'AUTHORIZED_ATS_API'
  | 'CANDIDATE_CONFIRMED_EXTERNAL'
  | 'MANUAL_HUMAN';

export type SubmissionAttemptStatus =
  | 'INITIATED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'CHALLENGE_REQUIRED'
  | 'UNKNOWN_RESULT';

export type HumanTaskStatus =
  | 'PENDING'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type LifecycleActorType =
  | 'CANDIDATE'
  | 'SYSTEM'
  | 'AUTHORIZED_ADAPTER'
  | 'ADMIN';

export type ExternalIdProvenance =
  | 'SYSTEM_VERIFIED'
  | 'CANDIDATE_PROVIDED'
  | 'UNKNOWN';

export type SubmissionVerificationSource =
  | 'AUTHORIZED_ADAPTER'
  | 'CANDIDATE_CONFIRMATION'
  | null;

/**
 * Core Application Lifecycle Record
 */
export interface ApplicationRecord {
  id: string;
  userId: string;
  jobId: string;
  preparationId: string;
  preparationVersionId: string;
  status: ApplicationLifecycleStatus;
  submissionStrategy: SubmissionStrategy;
  submissionMethod?: SubmissionMethod | null;
  idempotencyKey: string;
  externalApplicationId?: string | null;
  externalApplicationIdProvenance?: ExternalIdProvenance | null;
  confirmationUrl?: string | null;
  submittedAt?: string | null;
  isVerifiedSubmission: boolean;
  submissionVerificationSource?: SubmissionVerificationSource;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Auditable Submission Attempt Record
 */
export interface SubmissionAttemptRecord {
  id: string;
  applicationId: string;
  userId: string;
  preparationVersionId: string;
  sourceId: string;
  adapterId: string;
  attemptStatus: SubmissionAttemptStatus;
  httpStatus?: number | null;
  externalApplicationId?: string | null;
  confirmationUrl?: string | null;
  failureCode?: string | null;
  failureCategory?: string | null;
  sanitizedErrorMessage?: string | null;
  correlationId: string;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
}

/**
 * Human Action Task for Restricted / External Flows
 */
export interface ApplicationHumanTask {
  id: string;
  applicationId: string;
  userId: string;
  jobId: string;
  preparationVersionId: string;
  title: string;
  reason: string;
  targetUrl: string;
  status: HumanTaskStatus;
  instructions?: string | null;
  candidateNotes?: string | null;
  candidateConfirmedSubmission: boolean;
  candidateExternalApplicationId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
}

/**
 * Immutable Status Transition Audit Record
 */
export interface ApplicationStatusHistoryRecord {
  id: string;
  applicationId: string;
  userId: string;
  previousStatus?: ApplicationLifecycleStatus | null;
  newStatus: ApplicationLifecycleStatus;
  actorType: LifecycleActorType;
  actorId: string;
  reason: string;
  metadata: Record<string, unknown>;
  correlationId: string;
  createdAt: string;
}

/**
 * Submission Payload passed to authorized adapters
 */
export interface SubmissionPayload {
  applicationId: string;
  userId: string;
  job: CanonicalJob;
  preparationVersion: ApplicationPreparationVersion;
  tailoredResume: TailoredResumeData;
  tailoredCoverLetter: TailoredCoverLetterData;
  applicationAnswers: ApplicationQuestionAnswer[];
  correlationId: string;
  candidateNotes?: string;
}

/**
 * Structured Submission Result returned by adapters
 */
export interface SubmissionResult {
  status: 'SUBMITTED' | 'SUBMISSION_FAILED' | 'CHALLENGE_REQUIRED' | 'UNKNOWN_RESULT';
  externalApplicationId?: string;
  confirmationUrl?: string;
  submittedAt?: string;
  httpStatus?: number;
  failureCode?: string;
  failureCategory?: string;
  errorMessage?: string;
  sanitizedDetails?: Record<string, unknown>;
}

/**
 * Candidate Auto-submission Preference Settings (Server-side model)
 */
export interface CandidateSubmissionSettings {
  userId: string;
  automaticSubmissionEnabled: boolean;
  requireConfirmationBeforeSubmission: boolean;
  allowedSources: string[];
  maxDailySubmissions: number;
}

/**
 * Complete Application Detail Response Package
 */
export interface ApplicationDetailPackage {
  application: ApplicationRecord;
  job: CanonicalJob | null;
  preparation: ApplicationPreparation | null;
  activeVersion: ApplicationPreparationVersion | null;
  humanTasks: ApplicationHumanTask[];
  submissionAttempts: SubmissionAttemptRecord[];
  history: ApplicationStatusHistoryRecord[];
}
