/**
 * Human Task Engine Domain Types & Contracts
 * Module 10: Human Task Engine
 * 
 * Generalizes human-required action tasks across the entire Career Agent system:
 * - Missing application answers
 * - Candidate fact verification & correction
 * - Resume tailoring review
 * - Manual employer submissions
 * - Uncertain job requirements
 * - Sensitive info confirmations (work authorization, legal clearance)
 */

import { FactProvenance } from '../../../src/types/candidate.js';

export type HumanTaskType =
  | 'MISSING_INFORMATION'
  | 'CONFIRM_INFORMATION'
  | 'CORRECT_INFORMATION'
  | 'REVIEW_RESUME'
  | 'REVIEW_APPLICATION'
  | 'ANSWER_APPLICATION_QUESTION'
  | 'MANUAL_APPLICATION'
  | 'CONFIRM_SUBMISSION'
  | 'RESOLVE_MATCH_QUESTION'
  | 'SENSITIVE_CONFIRMATION';

export type HumanTaskPriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT';

export type HumanTaskLifecycleStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type HumanTaskInputType =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'YES_NO'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'NUMBER'
  | 'DATE'
  | 'CONFIRMATION';

export type HumanTaskActorType =
  | 'CANDIDATE'
  | 'SYSTEM'
  | 'AI';

export interface TaskContextReferences {
  applicationId?: string | null;
  jobId?: string | null;
  preparationId?: string | null;
  preparationVersionId?: string | null;
  resumeId?: string | null;
  candidateFactId?: string | null;
  targetUrl?: string | null;
}

export interface TaskInputSchema {
  inputType: HumanTaskInputType;
  options?: string[]; // Allowed options for SINGLE_SELECT / MULTI_SELECT
  placeholder?: string;
  isSensitive?: boolean;
}

/**
 * Core Human Task Record
 */
export interface HumanTaskRecord {
  id: string;
  userId: string;
  taskType: HumanTaskType;
  priority: HumanTaskPriority;
  status: HumanTaskLifecycleStatus;
  reasonCode: string;
  title: string;
  description: string;
  instructions?: string | null;
  
  // Context
  context: TaskContextReferences;
  
  // Input schema & sensitivity
  schema: TaskInputSchema;
  
  // Candidate response & provenance
  responseValue?: unknown | null;
  candidateNotes?: string | null;
  candidateConfirmed: boolean;
  externalReferenceId?: string | null;
  externalReferenceProvenance?: 'CANDIDATE_PROVIDED' | 'SYSTEM_VERIFIED' | null;
  
  // Deduplication
  deduplicationKey: string;
  
  // Timestamps
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Task Creation Payload
 */
export interface CreateHumanTaskInput {
  userId: string;
  taskType: HumanTaskType;
  priority?: HumanTaskPriority;
  reasonCode: string;
  title: string;
  description: string;
  instructions?: string;
  context?: TaskContextReferences;
  schema?: TaskInputSchema;
  expiresAt?: string;
}

/**
 * Candidate Task Completion Submission Payload
 */
export interface CompleteTaskInput {
  responseValue?: unknown;
  candidateNotes?: string;
  candidateConfirmed?: boolean;
  externalReferenceId?: string;
}

/**
 * Task List Query Filter
 */
export interface TaskListQuery {
  status?: HumanTaskLifecycleStatus;
  priority?: HumanTaskPriority;
  taskType?: HumanTaskType;
  applicationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Human Task Audit Event Record
 */
export interface HumanTaskAuditEvent {
  id: string;
  taskId: string;
  userId: string;
  eventType:
    | 'TASK_CREATED'
    | 'TASK_STARTED'
    | 'TASK_COMPLETED'
    | 'TASK_CANCELLED'
    | 'TASK_EXPIRED'
    | 'TASK_RESPONSE_REJECTED';
  previousStatus?: HumanTaskLifecycleStatus | null;
  newStatus?: HumanTaskLifecycleStatus | null;
  actorId: string;
  actorType: HumanTaskActorType;
  metadata: Record<string, unknown>;
  createdAt: string;
}
