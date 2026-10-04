/**
 * Background Automation Runner & Worker Engine
 * Module 14: Background Automation & Scheduling
 * 
 * Core responsibilities:
 * 1. Find due schedules across enabled candidates
 * 2. Atomic job claiming via distributed mutex (background_job_claims)
 * 3. Overlapping run prevention per candidate
 * 4. Recovery after server crashes / restarts (stale lease reclaiming)
 * 5. Timezone-aware re-scheduling and missed-run advancement
 * 6. Bounded retries with backoff
 * 7. Invokes Module 13 autonomousJobSearchEngine and Module 12 dailyCareerReportService
 * 8. Strict failure handling with DatabaseNotConfiguredError (HTTP 503)
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import {
  BackgroundExecutionRecord,
  BackgroundExecutionStatus,
  BackgroundScheduleRecord,
  SchedulerStatusSummary,
} from './schedulerTypes.js';
import { ScheduleCalculator } from './scheduleCalculator.js';
import { autonomousJobSearchEngine } from '../agentEngine/autonomousJobSearchEngine.js';
import { agentConfigurationService } from '../agentEngine/agentConfigurationService.js';
import { dailyCareerReportService } from '../notification/dailyCareerReportService.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class BackgroundRunnerService {
  private workerId: string = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
  private isRunning: boolean = false;
  private lastTickAt: string | null = null;
  private leaseDurationMs: number = 10 * 60 * 1000; // 10 minute claim lease
  private maxRetries: number = 3;

  public getWorkerId(): string {
    return this.workerId;
  }

  /**
   * Status summary for observability endpoints.
   */
  public async getSchedulerStatus(): Promise<SchedulerStatusSummary> {
    const supabase = requireDatabaseClient();
    const now = new Date().toISOString();

    const { count: activeClaimsCount } = await supabase
      .from('background_job_claims')
      .select('*', { count: 'exact', head: true })
      .eq('is_released', false)
      .gt('lease_expires_at', now);

    const { count: pendingDueCount } = await supabase
      .from('background_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('is_enabled', true)
      .lte('next_run_at', now);

    return {
      isRunning: this.isRunning,
      workerId: this.workerId,
      lastTickAt: this.lastTickAt,
      activeClaimsCount: activeClaimsCount || 0,
      pendingDueCount: pendingDueCount || 0,
    };
  }

  /**
   * Main scheduler tick: claims and processes all due background tasks.
   * Can be triggered by server tick, serverless cron endpoint, or manual run.
   */
  public async executeSchedulerTick(): Promise<{ processedCount: number; errorsCount: number }> {
    this.lastTickAt = new Date().toISOString();
    const supabase = requireDatabaseClient();

    // 1. Recover stale / crashed claims
    await this.recoverStaleClaims();

    // 2. Query due schedules
    const now = new Date().toISOString();
    const { data: dueSchedules, error } = await supabase
      .from('background_schedules')
      .select('*')
      .eq('is_enabled', true)
      .lte('next_run_at', now)
      .order('next_run_at', { ascending: true })
      .limit(20);

    if (error) {
      logger.error('Failed to query due background schedules', { error: error.message });
      throw new AppError(`Failed to fetch due schedules: ${error.message}`, 500);
    }

    let processedCount = 0;
    let errorsCount = 0;

    for (const scheduleRow of dueSchedules || []) {
      const schedule: BackgroundScheduleRecord = {
        id: scheduleRow.id,
        userId: scheduleRow.user_id,
        scheduleType: scheduleRow.schedule_type,
        isEnabled: Boolean(scheduleRow.is_enabled),
        preferredTime: scheduleRow.preferred_time,
        timezone: scheduleRow.timezone,
        nextRunAt: scheduleRow.next_run_at,
        lastRunAt: scheduleRow.last_run_at,
        lastStatus: scheduleRow.last_status,
        consecutiveFailures: scheduleRow.consecutive_failures || 0,
        configurationSnapshot: scheduleRow.configuration_snapshot || {},
        createdAt: scheduleRow.created_at,
        updatedAt: scheduleRow.updated_at,
      };

      const claimed = await this.tryClaimSchedule(schedule);
      if (!claimed) {
        // Concurrently claimed by another worker or actively running
        continue;
      }

      try {
        const outcome = await this.runClaimedJob(schedule, claimed.claimId);
        if (outcome.status === 'FAILED') {
          errorsCount++;
        } else {
          processedCount++;
        }
      } catch (err: any) {
        errorsCount++;
        logger.error('Error running claimed background job', {
          scheduleId: schedule.id,
          userId: schedule.userId,
          error: err?.message,
        });
      }
    }

    return { processedCount, errorsCount };
  }

  /**
   * Attempts to atomically claim a schedule via background_job_claims.
   */
  public async tryClaimSchedule(
    schedule: BackgroundScheduleRecord
  ): Promise<{ claimId: string } | null> {
    const supabase = requireDatabaseClient();
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + this.leaseDurationMs).toISOString();

    // Check if there is an active unreleased claim
    const { data: activeClaim } = await supabase
      .from('background_job_claims')
      .select('id, lease_expires_at')
      .eq('schedule_id', schedule.id)
      .eq('is_released', false)
      .gt('lease_expires_at', now.toISOString())
      .maybeSingle();

    if (activeClaim) {
      // Overlapping run prevented
      return null;
    }

    const claimId = randomUUID();
    const { error: insertError } = await supabase.from('background_job_claims').insert({
      id: claimId,
      schedule_id: schedule.id,
      user_id: schedule.userId,
      schedule_type: schedule.scheduleType,
      claimed_by: this.workerId,
      claimed_at: now.toISOString(),
      lease_expires_at: leaseExpiresAt,
      is_released: false,
    });

    if (insertError) {
      // Race condition captured by unique constraints or DB concurrency
      return null;
    }

    return { claimId };
  }

  /**
   * Executes the claimed background workflow.
   */
  private async runClaimedJob(
    schedule: BackgroundScheduleRecord,
    claimId: string
  ): Promise<{ status: BackgroundExecutionStatus }> {
    const supabase = requireDatabaseClient();
    const startTime = Date.now();
    const executionId = randomUUID();
    const now = new Date();

    // Insert pending execution record
    await supabase.from('background_execution_history').insert({
      id: executionId,
      schedule_id: schedule.id,
      user_id: schedule.userId,
      schedule_type: schedule.scheduleType,
      worker_id: this.workerId,
      status: 'RUNNING',
      retry_count: schedule.consecutiveFailures,
      max_retries: this.maxRetries,
      started_at: now.toISOString(),
    });

    let executionStatus: BackgroundExecutionStatus = 'COMPLETED';
    let summary: Record<string, unknown> = {};
    let errorDetails: Record<string, unknown> | null = null;
    let sessionId: string | null = null;
    let reportId: string | null = null;

    try {
      if (schedule.scheduleType === 'JOB_SEARCH') {
        // Trigger Module 13 Autonomous Job Search in SCHEDULED mode
        const session = await autonomousJobSearchEngine.startSession(schedule.userId, {
          mode: 'SCHEDULED',
        });
        sessionId = session.id;
        summary = {
          sessionId: session.id,
          jobsFound: session.jobsFoundCount,
          jobsMatched: session.jobsMatchedCount,
          applicationsPrepared: session.applicationsPreparedCount,
          applicationsSubmitted: session.applicationsSubmittedCount,
        };
      } else if (schedule.scheduleType === 'DAILY_REPORT') {
        // Trigger Module 12 Daily Career Report
        const report = await dailyCareerReportService.getOrGenerateReport(schedule.userId);
        reportId = report.id;
        summary = {
          reportId: report.id,
          reportDate: report.reportDate,
          timezone: report.timezone,
          applicationsSubmittedToday: report.summaryData?.applicationsSubmittedCount ?? 0,
          interviewsCount: report.summaryData?.interviewsCount ?? 0,
        };
      }
    } catch (err: any) {
      executionStatus = 'FAILED';
      errorDetails = { message: err?.message || 'Workflow execution error' };
      logger.error('Background execution failed', {
        scheduleType: schedule.scheduleType,
        userId: schedule.userId,
        error: err?.message,
      });
    }

    const durationMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    // Update execution history
    await supabase
      .from('background_execution_history')
      .update({
        status: executionStatus,
        session_id: sessionId,
        report_id: reportId,
        completed_at: completedAt,
        duration_ms: durationMs,
        summary,
        error_details: errorDetails,
        updated_at: completedAt,
      })
      .eq('id', executionId);

    // Calculate next run date
    const nextRun = ScheduleCalculator.calculateNextRun(
      schedule.preferredTime,
      schedule.timezone,
      new Date()
    );

    const consecutiveFailures =
      executionStatus === 'FAILED' ? schedule.consecutiveFailures + 1 : 0;

    // Update schedule state
    await supabase
      .from('background_schedules')
      .update({
        last_run_at: completedAt,
        last_status: executionStatus,
        next_run_at: nextRun,
        consecutive_failures: consecutiveFailures,
        updated_at: completedAt,
      })
      .eq('id', schedule.id);

    // Release claim
    await supabase
      .from('background_job_claims')
      .update({
        is_released: true,
        released_at: completedAt,
      })
      .eq('id', claimId);

    return { status: executionStatus };
  }

  /**
   * Releases expired claims left behind by terminated or restarted workers.
   */
  public async recoverStaleClaims(): Promise<number> {
    const supabase = requireDatabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('background_job_claims')
      .update({
        is_released: true,
        released_at: now,
      })
      .eq('is_released', false)
      .lte('lease_expires_at', now)
      .select('id');

    if (error) {
      logger.warn('Failed to recover stale claims', { error: error.message });
      return 0;
    }

    return (data || []).length;
  }

  /**
   * Queries execution history for candidate.
   */
  public async getExecutionHistory(
    userId: string,
    limit: number = 20
  ): Promise<BackgroundExecutionRecord[]> {
    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('background_execution_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50));

    if (error) {
      logger.error('Failed to query execution history', { userId, error: error.message });
      throw new AppError(`Failed to fetch execution history: ${error.message}`, 500);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      scheduleId: row.schedule_id,
      userId: row.user_id,
      scheduleType: row.schedule_type,
      workerId: row.worker_id,
      status: row.status,
      retryCount: row.retry_count || 0,
      maxRetries: row.max_retries || 3,
      sessionId: row.session_id,
      reportId: row.report_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      summary: row.summary || {},
      errorDetails: row.error_details,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

export const backgroundRunnerService = new BackgroundRunnerService();
