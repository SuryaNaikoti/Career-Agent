/**
 * Module 14: Background Automation & Scheduling Domain Types
 */

export type BackgroundScheduleType = 'JOB_SEARCH' | 'DAILY_REPORT';

export type BackgroundExecutionStatus =
  | 'PENDING'
  | 'CLAIMED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'SKIPPED';

export interface BackgroundScheduleRecord {
  id: string;
  userId: string;
  scheduleType: BackgroundScheduleType;
  isEnabled: boolean;
  preferredTime: string; // 'HH:MM' 24-hr format
  timezone: string;
  nextRunAt: string;
  lastRunAt: string | null;
  lastStatus: BackgroundExecutionStatus | null;
  consecutiveFailures: number;
  configurationSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBackgroundScheduleInput {
  isEnabled?: boolean;
  preferredTime?: string;
  timezone?: string;
  configurationSnapshot?: Record<string, unknown>;
}

export interface BackgroundExecutionRecord {
  id: string;
  scheduleId: string | null;
  userId: string;
  scheduleType: BackgroundScheduleType;
  workerId: string;
  status: BackgroundExecutionStatus;
  retryCount: number;
  maxRetries: number;
  sessionId: string | null;
  reportId: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  summary: Record<string, unknown>;
  errorDetails: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackgroundJobClaimRecord {
  id: string;
  scheduleId: string;
  userId: string;
  scheduleType: BackgroundScheduleType;
  claimedBy: string;
  claimedAt: string;
  leaseExpiresAt: string;
  isReleased: boolean;
  releasedAt: string | null;
  createdAt: string;
}

export interface SchedulerStatusSummary {
  isRunning: boolean;
  workerId: string;
  lastTickAt: string | null;
  activeClaimsCount: number;
  pendingDueCount: number;
}
