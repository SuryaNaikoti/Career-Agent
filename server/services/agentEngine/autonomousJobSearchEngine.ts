/**
 * Autonomous Job Search Engine (Master Workflow Orchestrator)
 * Module 13: Autonomous Job Search Engine
 * 
 * Rules:
 * 1. Coordinates:
 *    Preferences (Mod 01)
 *    -> Job Discovery (Mod 05)
 *    -> Deterministic Filtering
 *    -> Match Scoring & Ranking (Mod 06)
 *    -> Application Preparation (Mod 08)
 *    -> Human Review Tasks if needed (Mod 10)
 *    -> Submission if authorized (Mod 09)
 * 2. QUALITY > QUANTITY: Enforces minimum match threshold and session application limits.
 * 3. Never mass-applies blindly.
 * 4. Strictly enforces permission checks (AUTO vs CONFIRM vs DENY).
 * 5. Strict session state machine:
 *    CREATED -> RUNNING -> PAUSED | WAITING_FOR_HUMAN | COMPLETED | FAILED | CANCELLED
 * 6. Audit logs all transitions in job_search_session_events.
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import {
  JobSearchSessionRecord,
  JobSearchSessionStatus,
  JobSearchSessionMode,
  JobSearchSessionEventType,
  StartJobSearchSessionInput,
  JobSearchSessionSummaryFacts,
} from './jobSearchEngineTypes.js';
import { agentConfigurationService } from './agentConfigurationService.js';
import { candidatePreferencesService } from '../candidate/candidatePreferencesService.js';
import { jobSearchService } from '../job/jobSearchService.js';
import { matchingService } from '../matching/matchingService.js';
import { applicationPreparationService } from '../applicationPreparation/applicationPreparationService.js';
import { applicationLifecycleService } from '../applicationLifecycle/applicationLifecycleService.js';
import { humanTaskService } from '../humanTask/humanTaskService.js';
import { submissionPolicyEngine } from '../applicationLifecycle/submissionPolicyEngine.js';
import { CanonicalJob } from '../job/jobTypes.js';
import { AppError, NotFoundError, ForbiddenError, ValidationError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class AutonomousJobSearchEngine {
  private activeRunningSessions: Set<string> = new Set();

  /**
   * Starts a new job search session for authenticated candidate.
   */
  public async startSession(
    userId: string,
    input: StartJobSearchSessionInput = {}
  ): Promise<JobSearchSessionRecord> {
    const config = await agentConfigurationService.getConfiguration(userId);
    const mode: JobSearchSessionMode = input.mode || (config.isEnabled ? 'AGENT' : 'MANUAL');

    // Check if candidate already has an active RUNNING session
    const existingActive = await this.findActiveSession(userId);
    if (existingActive) {
      throw new AppError(`A search session (${existingActive.id}) is already in progress.`, 409);
    }

    const sessionId = randomUUID();
    const now = new Date().toISOString();

    const sessionRecord: JobSearchSessionRecord = {
      id: sessionId,
      userId,
      mode,
      status: 'RUNNING',
      jobsFoundCount: 0,
      jobsFilteredCount: 0,
      jobsMatchedCount: 0,
      applicationsPreparedCount: 0,
      applicationsSubmittedCount: 0,
      humanTasksCreatedCount: 0,
      configurationSnapshot: {
        minMatchScore: config.minMatchScore,
        maxApplicationsPerSession: config.maxApplicationsPerSession,
        maxApplicationsPerDay: config.maxApplicationsPerDay,
        allowAutoSubmitOnAllowedSources: config.allowAutoSubmitOnAllowedSources,
        allowedWorkModes: config.allowedWorkModes,
      },
      summaryFacts: {
        jobsFoundCount: 0,
        jobsFilteredCount: 0,
        jobsMatchedCount: 0,
        applicationsPreparedCount: 0,
        applicationsSubmittedCount: 0,
        humanTasksCreatedCount: 0,
        explanations: [],
        matchedJobSummaries: [],
      },
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Save session initialized
    await this.persistSession(sessionRecord);
    await this.logEvent(sessionId, userId, 'SESSION_STARTED', null, 'RUNNING', {});

    // Execute session asynchronously / synchronously
    this.activeRunningSessions.add(sessionId);
    this.executeWorkflow(sessionRecord, input).catch((err) => {
      logger.error('Background session error', { sessionId, error: err?.message });
    });

    return sessionRecord;
  }

  /**
   * Pauses an active RUNNING session.
   */
  public async pauseSession(userId: string, sessionId: string): Promise<JobSearchSessionRecord> {
    const session = await this.getSessionById(userId, sessionId);
    if (!session) throw new NotFoundError(`Session '${sessionId}' not found.`);
    if (session.userId !== userId) throw new ForbiddenError('Unauthorized: Candidate does not own session.');

    if (session.status !== 'RUNNING') {
      throw new AppError(`Cannot pause session with status '${session.status}'. Only RUNNING sessions can be paused.`, 409);
    }

    const now = new Date().toISOString();
    const updated: JobSearchSessionRecord = {
      ...session,
      status: 'PAUSED',
      pausedAt: now,
      updatedAt: now,
    };

    this.activeRunningSessions.delete(sessionId);
    await this.persistSession(updated);
    await this.logEvent(sessionId, userId, 'SESSION_PAUSED', 'RUNNING', 'PAUSED', {});

    return updated;
  }

  /**
   * Resumes a PAUSED session.
   */
  public async resumeSession(userId: string, sessionId: string): Promise<JobSearchSessionRecord> {
    const session = await this.getSessionById(userId, sessionId);
    if (!session) throw new NotFoundError(`Session '${sessionId}' not found.`);
    if (session.userId !== userId) throw new ForbiddenError('Unauthorized: Candidate does not own session.');

    if (session.status !== 'PAUSED') {
      throw new AppError(`Cannot resume session with status '${session.status}'. Only PAUSED sessions can be resumed.`, 409);
    }

    const now = new Date().toISOString();
    const updated: JobSearchSessionRecord = {
      ...session,
      status: 'RUNNING',
      pausedAt: null,
      updatedAt: now,
    };

    this.activeRunningSessions.add(sessionId);
    await this.persistSession(updated);
    await this.logEvent(sessionId, userId, 'SESSION_RESUMED', 'PAUSED', 'RUNNING', {});

    this.executeWorkflow(updated, {}).catch((err) => {
      logger.error('Background resume error', { sessionId, error: err?.message });
    });

    return updated;
  }

  /**
   * Stops/Cancels an active or paused session safely.
   */
  public async stopSession(userId: string, sessionId: string): Promise<JobSearchSessionRecord> {
    const session = await this.getSessionById(userId, sessionId);
    if (!session) throw new NotFoundError(`Session '${sessionId}' not found.`);
    if (session.userId !== userId) throw new ForbiddenError('Unauthorized: Candidate does not own session.');

    if (session.status === 'COMPLETED' || session.status === 'CANCELLED' || session.status === 'FAILED') {
      return session; // idempotent
    }

    const prevStatus = session.status;
    const now = new Date().toISOString();
    const updated: JobSearchSessionRecord = {
      ...session,
      status: 'CANCELLED',
      completedAt: now,
      updatedAt: now,
    };

    this.activeRunningSessions.delete(sessionId);
    await this.persistSession(updated);
    await this.logEvent(sessionId, userId, 'SESSION_STOPPED', prevStatus, 'CANCELLED', {});

    return updated;
  }

  /**
   * Core workflow execution pipeline
   */
  private async executeWorkflow(
    session: JobSearchSessionRecord,
    input: StartJobSearchSessionInput
  ): Promise<void> {
    const userId = session.userId;
    const sessionId = session.id;

    try {
      // 1. Load Candidate Preferences (Module 01)
      const preferences = await candidatePreferencesService.getPreferences(userId);

      await this.logEvent(sessionId, userId, 'PREFERENCES_LOADED', 'RUNNING', 'RUNNING', {
        targetRoles: preferences?.targetRoles || [],
        locations: preferences?.locations || [],
      });

      // 2. Discover Jobs (Module 05)
      const maxScan = input.maxJobsToScan || 30;
      const primaryRole = input.targetRoleOverride || preferences?.targetRoles?.[0] || '';
      
      const searchRes = await jobSearchService.searchJobs({
        query: primaryRole || undefined,
        limit: maxScan,
      });

      const discoveredJobs: CanonicalJob[] = searchRes.jobs || [];
      session.jobsFoundCount = discoveredJobs.length;
      await this.logEvent(sessionId, userId, 'JOBS_DISCOVERED', 'RUNNING', 'RUNNING', {
        count: discoveredJobs.length,
      });

      // Check pause/cancel state
      if (!this.activeRunningSessions.has(sessionId)) return;

      // 3. Deterministic Filtering
      const eligibleJobs: CanonicalJob[] = [];
      let filteredOutCount = 0;

      for (const job of discoveredJobs) {
        if (!this.activeRunningSessions.has(sessionId)) return;

        if (!this.matchesCandidatePreferences(job, preferences, session.configurationSnapshot.allowedWorkModes)) {
          filteredOutCount++;
          continue;
        }

        eligibleJobs.push(job);
      }

      session.jobsFilteredCount = filteredOutCount;

      // 4. Match & Rank Jobs (Module 06)
      const scoredJobs: Array<{ job: CanonicalJob; score: number; status: string }> = [];
      const minScore = session.configurationSnapshot.minMatchScore || 65;

      for (const job of eligibleJobs) {
        if (!this.activeRunningSessions.has(sessionId)) return;

        try {
          const matchResult = await matchingService.getOrCalculateJobMatch(userId, job.id);
          if (matchResult && matchResult.overallScore >= minScore) {
            scoredJobs.push({
              job,
              score: matchResult.overallScore,
              status: matchResult.matchStatus,
            });
            await this.logEvent(sessionId, userId, 'JOB_MATCHED', 'RUNNING', 'RUNNING', {
              jobId: job.id,
              score: matchResult.overallScore,
            });
          }
        } catch {
          // Non-blocking per job error
        }
      }

      // Order by match quality descending
      scoredJobs.sort((a, b) => b.score - a.score);
      session.jobsMatchedCount = scoredJobs.length;

      // 5. Select & Prepare Applications (Module 08)
      const maxAppsPerSession = session.configurationSnapshot.maxApplicationsPerSession || 2;
      const targetJobsToApply = scoredJobs.slice(0, maxAppsPerSession);
      let waitingForHuman = false;

      for (const { job, score, status } of targetJobsToApply) {
        if (!this.activeRunningSessions.has(sessionId)) return;

        // Duplicate Application Protection: check if already applied/prepared
        const existingApp = await applicationLifecycleService.getApplicationById(userId, job.id);
        if (existingApp && (existingApp.status === 'SUBMITTED' || existingApp.status === 'READY_FOR_SUBMISSION')) {
          session.summaryFacts.matchedJobSummaries.push({
            jobId: job.id,
            title: job.title,
            companyName: job.companyName,
            overallScore: score,
            matchStatus: status,
            actionTaken: 'DISMISSED',
          });
          continue;
        }

        try {
          // Prepare Application
          await this.logEvent(sessionId, userId, 'APPLICATION_PREPARATION_STARTED', 'RUNNING', 'RUNNING', {
            jobId: job.id,
          });

          const prepPackage = await applicationPreparationService.prepareApplication(userId, job.id);
          session.applicationsPreparedCount++;

          // Check if preparation is ready or blocked
          if (!prepPackage.preparation.isReadyForApplication) {
            // Blocked review items -> Human Task required (Module 10)
            waitingForHuman = true;
            session.humanTasksCreatedCount += prepPackage.reviewItems.length;

            session.summaryFacts.matchedJobSummaries.push({
              jobId: job.id,
              title: job.title,
              companyName: job.companyName,
              overallScore: score,
              matchStatus: status,
              actionTaken: 'HUMAN_TASK_REQUIRED',
            });
            continue;
          }

          // Preparation is ready
          await this.logEvent(sessionId, userId, 'APPLICATION_READY', 'RUNNING', 'RUNNING', {
            jobId: job.id,
            preparationId: prepPackage.preparation.id,
          });

          // Check Submission Policy (Module 09)
          const strategyResult = submissionPolicyEngine.resolveSubmissionStrategy(job);

          if (strategyResult.strategy === 'HUMAN_REQUIRED' || strategyResult.strategy === 'RESTRICTED') {
            // Create human task for manual submission on employer portal
            const lifecycleApp = await applicationLifecycleService.createOrGetApplication(userId, prepPackage.preparation.id);
            session.humanTasksCreatedCount++;
            waitingForHuman = true;

            session.summaryFacts.matchedJobSummaries.push({
              jobId: job.id,
              title: job.title,
              companyName: job.companyName,
              overallScore: score,
              matchStatus: status,
              actionTaken: 'HUMAN_TASK_REQUIRED',
            });
          } else if (
            strategyResult.strategy === 'AUTHORIZED_AUTOMATIC' &&
            session.configurationSnapshot.allowAutoSubmitOnAllowedSources
          ) {
            // Submit if authorized
            const lifecycleApp = await applicationLifecycleService.createOrGetApplication(userId, prepPackage.preparation.id);
            const submissionRes = await applicationLifecycleService.submitApplication(userId, lifecycleApp.id);
            
            if (submissionRes.application.status === 'SUBMITTED') {
              session.applicationsSubmittedCount++;
              await this.logEvent(sessionId, userId, 'APPLICATION_SUBMITTED', 'RUNNING', 'RUNNING', {
                applicationId: lifecycleApp.id,
                jobId: job.id,
              });

              session.summaryFacts.matchedJobSummaries.push({
                jobId: job.id,
                title: job.title,
                companyName: job.companyName,
                overallScore: score,
                matchStatus: status,
                actionTaken: 'SUBMITTED',
              });
            }
          } else {
            // Needs candidate confirmation
            waitingForHuman = true;
            session.summaryFacts.matchedJobSummaries.push({
              jobId: job.id,
              title: job.title,
              companyName: job.companyName,
              overallScore: score,
              matchStatus: status,
              actionTaken: 'PREPARED',
            });
          }
        } catch (err: any) {
          logger.warn('Failed application workflow for job', { jobId: job.id, error: err?.message });
        }
      }

      // 6. Complete or Wait
      const finalStatus: JobSearchSessionStatus = waitingForHuman ? 'WAITING_FOR_HUMAN' : 'COMPLETED';
      session.status = finalStatus;
      session.completedAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();

      // Build structured explanations
      session.summaryFacts.jobsFoundCount = session.jobsFoundCount;
      session.summaryFacts.jobsFilteredCount = session.jobsFilteredCount;
      session.summaryFacts.jobsMatchedCount = session.jobsMatchedCount;
      session.summaryFacts.applicationsPreparedCount = session.applicationsPreparedCount;
      session.summaryFacts.applicationsSubmittedCount = session.applicationsSubmittedCount;
      session.summaryFacts.humanTasksCreatedCount = session.humanTasksCreatedCount;

      session.summaryFacts.explanations = [
        `Discovered ${session.jobsFoundCount} canonical opportunities.`,
        `Filtered out ${session.jobsFilteredCount} jobs that did not meet candidate preferences.`,
        `Identified ${session.jobsMatchedCount} qualified matches (score >= ${minScore}%).`,
        `Prepared ${session.applicationsPreparedCount} tailored application packages.`,
        session.applicationsSubmittedCount > 0
          ? `Submitted ${session.applicationsSubmittedCount} applications via authorized ATS.`
          : 'Zero applications auto-submitted (awaiting candidate review or restricted source).',
        session.humanTasksCreatedCount > 0
          ? `Created ${session.humanTasksCreatedCount} action tasks requiring candidate input.`
          : 'Zero blocking human tasks.',
      ];

      await this.persistSession(session);
      await this.logEvent(sessionId, userId, waitingForHuman ? 'HUMAN_TASK_CREATED' : 'SESSION_COMPLETED', 'RUNNING', finalStatus, {
        summary: session.summaryFacts,
      });
    } catch (err: any) {
      session.status = 'FAILED';
      session.errorMessage = err?.message || 'Internal session error';
      session.completedAt = new Date().toISOString();
      await this.persistSession(session);
      await this.logEvent(sessionId, userId, 'SESSION_FAILED', 'RUNNING', 'FAILED', { error: err?.message });
    } finally {
      this.activeRunningSessions.delete(sessionId);
    }
  }

  public async getSessionById(userId: string, sessionId: string): Promise<JobSearchSessionRecord | null> {
    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('job_search_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get session by id', { userId, sessionId, error: error.message });
      throw new AppError(`Failed to fetch session: ${error.message}`, 500);
    }

    if (!data) return null;
    return this.mapDbRowToRecord(data);
  }

  public async getSessionEvents(userId: string, sessionId: string): Promise<any[]> {
    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('job_search_session_events')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to get session events', { userId, sessionId, error: error.message });
      throw new AppError(`Failed to fetch session events: ${error.message}`, 500);
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      sessionId: d.session_id,
      userId: d.user_id,
      eventType: d.event_type,
      fromStatus: d.from_status,
      toStatus: d.to_status,
      details: d.details || {},
      message: `${d.event_type}: ${JSON.stringify(d.details || {})}`,
      createdAt: d.created_at,
    }));
  }

  public async listSessions(userId: string, limit = 10): Promise<JobSearchSessionRecord[]> {
    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('job_search_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to list sessions', { userId, error: error.message });
      throw new AppError(`Failed to list sessions: ${error.message}`, 500);
    }

    return (data || []).map((d: any) => this.mapDbRowToRecord(d));
  }

  public async getLatestSession(userId: string): Promise<JobSearchSessionRecord | null> {
    const list = await this.listSessions(userId, 1);
    return list[0] || null;
  }

  private async findActiveSession(userId: string): Promise<JobSearchSessionRecord | null> {
    const list = await this.listSessions(userId, 5);
    return list.find((s) => s.status === 'RUNNING') || null;
  }

  private async persistSession(session: JobSearchSessionRecord): Promise<void> {
    const supabase = requireDatabaseClient();
    const { error } = await supabase.from('job_search_sessions').upsert({
      id: session.id,
      user_id: session.userId,
      mode: session.mode,
      status: session.status,
      jobs_found_count: session.jobsFoundCount,
      jobs_filtered_count: session.jobsFilteredCount,
      jobs_matched_count: session.jobsMatchedCount,
      applications_prepared_count: session.applicationsPreparedCount,
      applications_submitted_count: session.applicationsSubmittedCount,
      human_tasks_created_count: session.humanTasksCreatedCount,
      configuration_snapshot: session.configurationSnapshot,
      summary_facts: session.summaryFacts,
      error_message: session.errorMessage || null,
      started_at: session.startedAt || null,
      paused_at: session.pausedAt || null,
      completed_at: session.completedAt || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      logger.error('Failed to persist job search session', { sessionId: session.id, error: error.message });
      throw new AppError(`Failed to persist session: ${error.message}`, 500);
    }
  }

  private async logEvent(
    sessionId: string,
    userId: string,
    eventType: JobSearchSessionEventType,
    fromStatus: JobSearchSessionStatus | null,
    toStatus: JobSearchSessionStatus | null,
    details: Record<string, unknown>
  ): Promise<void> {
    const event = {
      id: randomUUID(),
      sessionId,
      userId,
      eventType,
      fromStatus,
      toStatus,
      details,
      createdAt: new Date().toISOString(),
    };

    const supabase = requireDatabaseClient();
    const { error } = await supabase.from('job_search_session_events').insert({
      id: event.id,
      session_id: sessionId,
      user_id: userId,
      event_type: eventType,
      from_status: fromStatus,
      to_status: toStatus,
      details,
      created_at: event.createdAt,
    });

    if (error) {
      logger.warn('Failed to insert session event telemetry', { sessionId, error: error.message });
    }
  }

  private mapDbRowToRecord(row: any): JobSearchSessionRecord {
    return {
      id: row.id,
      userId: row.user_id,
      mode: row.mode,
      status: row.status,
      jobsFoundCount: row.jobs_found_count || 0,
      jobsFilteredCount: row.jobs_filtered_count || 0,
      jobsMatchedCount: row.jobs_matched_count || 0,
      applicationsPreparedCount: row.applications_prepared_count || 0,
      applicationsSubmittedCount: row.applications_submitted_count || 0,
      humanTasksCreatedCount: row.human_tasks_created_count || 0,
      configurationSnapshot: row.configuration_snapshot || {},
      summaryFacts: row.summary_facts || {},
      errorMessage: row.error_message,
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Deterministic pre-filter verifying candidate constraints
   */
  public matchesCandidatePreferences(
    job: any,
    preferences: any,
    allowedWorkModes: string[] = ['Remote', 'Hybrid']
  ): boolean {
    if (!job) return false;

    // Filter: Excluded company
    const excludedCompanies = new Set(
      ((preferences?.companiesExcluded || preferences?.excludedCompanies || []) as string[]).map((c: string) =>
        c.toLowerCase()
      )
    );
    const company = (job.companyName || job.company || '').toLowerCase();
    if (excludedCompanies.has(company)) {
      return false;
    }

    // Filter: Minimum salary
    const minRequiredSalary = preferences?.minSalary || preferences?.minBaseSalary;
    if (minRequiredSalary) {
      const jobMax = job.salaryMax ?? job.salaryRange?.max;
      if (jobMax !== undefined && jobMax !== null && jobMax < minRequiredSalary) {
        return false;
      }
    }

    // Filter: Work mode
    const workplace = job.workplaceType || job.workMode;
    if (workplace && workplace !== 'UNKNOWN' && !allowedWorkModes.map((m) => m.toLowerCase()).includes(workplace.toLowerCase())) {
      return false;
    }

    return true;
  }
}

export const autonomousJobSearchEngine = new AutonomousJobSearchEngine();
