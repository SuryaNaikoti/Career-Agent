/**
 * Domain Types for Autonomous Job Search Engine
 * Module 13: Autonomous Job Search Engine
 */

export type JobSearchSessionStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'PAUSED'
  | 'WAITING_FOR_HUMAN'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type JobSearchSessionMode =
  | 'MANUAL'
  | 'SCHEDULED'
  | 'AGENT';

export type JobSearchSessionEventType =
  | 'SESSION_CREATED'
  | 'SESSION_STARTED'
  | 'PREFERENCES_LOADED'
  | 'JOBS_DISCOVERED'
  | 'JOB_FILTERED'
  | 'JOB_MATCHED'
  | 'JOB_RANKED'
  | 'APPLICATION_PREPARATION_STARTED'
  | 'APPLICATION_READY'
  | 'HUMAN_TASK_CREATED'
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_FAILED'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'SESSION_STOPPED'
  | 'SESSION_COMPLETED'
  | 'SESSION_FAILED';

export interface AgentSearchConfigurationRecord {
  id: string;
  userId: string;
  isEnabled: boolean;
  minMatchScore: number;
  maxApplicationsPerDay: number;
  maxApplicationsPerSession: number;
  allowAutoSubmitOnAllowedSources: boolean;
  allowedWorkModes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAgentSearchConfigurationInput {
  isEnabled?: boolean;
  minMatchScore?: number;
  maxApplicationsPerDay?: number;
  maxApplicationsPerSession?: number;
  allowAutoSubmitOnAllowedSources?: boolean;
  allowedWorkModes?: string[];
}

export interface JobSearchSessionSummaryFacts {
  jobsFoundCount: number;
  jobsFilteredCount: number;
  jobsMatchedCount: number;
  applicationsPreparedCount: number;
  applicationsSubmittedCount: number;
  humanTasksCreatedCount: number;
  explanations: string[];
  matchedJobSummaries: Array<{
    jobId: string;
    title: string;
    companyName: string;
    overallScore: number;
    matchStatus: string;
    actionTaken: 'PREPARED' | 'SUBMITTED' | 'HUMAN_TASK_REQUIRED' | 'FILTERED' | 'DISMISSED';
  }>;
}

export interface JobSearchSessionRecord {
  id: string;
  userId: string;
  mode: JobSearchSessionMode;
  status: JobSearchSessionStatus;
  jobsFoundCount: number;
  jobsFilteredCount: number;
  jobsMatchedCount: number;
  applicationsPreparedCount: number;
  applicationsSubmittedCount: number;
  humanTasksCreatedCount: number;
  configurationSnapshot: Partial<AgentSearchConfigurationRecord>;
  summaryFacts: JobSearchSessionSummaryFacts;
  errorMessage?: string | null;
  startedAt?: string | null;
  pausedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobSearchSessionEventRecord {
  id: string;
  sessionId: string;
  userId: string;
  eventType: JobSearchSessionEventType;
  fromStatus?: JobSearchSessionStatus | null;
  toStatus?: JobSearchSessionStatus | null;
  jobId?: string | null;
  applicationId?: string | null;
  taskId?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface StartJobSearchSessionInput {
  mode?: JobSearchSessionMode;
  maxJobsToScan?: number;
  targetRoleOverride?: string;
}
