/**
 * Domain Types for Notifications & Daily Career Report
 * Module 12: Notifications & Daily Career Report
 */

export type NotificationType =
  | 'DAILY_REPORT'
  | 'ACTION_REQUIRED'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'APPLICATION_UPDATE'
  | 'SYSTEM';

export type NotificationStatus = 'UNREAD' | 'READ';

export interface InternalNotificationRecord {
  id: string;
  userId: string;
  notificationType: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  deduplicationKey: string;
  applicationId?: string | null;
  jobId?: string | null;
  taskId?: string | null;
  hiringMessageId?: string | null;
  reportId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  deduplicationKey: string;
  applicationId?: string | null;
  jobId?: string | null;
  taskId?: string | null;
  hiringMessageId?: string | null;
  reportId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CareerReportPreferencesRecord {
  id: string;
  userId: string;
  dailyReportEnabled: boolean;
  preferredReportTime: string; // "HH:MM" e.g. "08:00"
  timezone: string;
  inAppNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCareerReportPreferencesInput {
  dailyReportEnabled?: boolean;
  preferredReportTime?: string;
  timezone?: string;
  inAppNotificationsEnabled?: boolean;
}

/**
 * Deterministic facts aggregated from existing modules for the report period.
 * AI must NOT alter these numbers.
 */
export interface DailyReportFacts {
  periodDate: string; // YYYY-MM-DD
  timezone: string;
  newRecommendedJobsCount: number;
  newRecommendedJobs: Array<{
    id: string;
    title: string;
    companyName: string;
    locationText?: string | null;
    workplaceType?: string | null;
  }>;
  jobsSavedCount: number;
  applicationsSubmittedCount: number;
  applicationsUpdatedCount: number;
  interviewsCount: number;
  interviews: Array<{
    company: string;
    role?: string | null;
    date?: string | null;
    time?: string | null;
    interviewType?: string | null;
    hiringMessageId?: string | null;
    applicationId?: string | null;
  }>;
  assessmentsCount: number;
  assessments: Array<{
    company: string;
    role?: string | null;
    actionRequired?: string | null;
  }>;
  rejectionsCount: number;
  offersCount: number;
  offers: Array<{
    company: string;
    role?: string | null;
    compensationAmount?: number | null;
    compensationCurrency?: string | null;
    responseDeadline?: string | null;
  }>;
  openTasksCount: number;
  openTasks: Array<{
    id: string;
    title: string;
    priority: string;
    taskType: string;
    dueDate?: string | null;
  }>;
  upcomingEvents: Array<{
    title: string;
    date: string;
    type: 'INTERVIEW' | 'DEADLINE' | 'TASK';
    referenceId?: string | null;
  }>;
  priorities: string[];
}

export interface DailyCareerReportRecord {
  id: string;
  userId: string;
  reportDate: string; // YYYY-MM-DD
  timezone: string;
  summaryData: DailyReportFacts;
  generatedSummary: string | null;
  createdAt: string;
  updatedAt: string;
}
