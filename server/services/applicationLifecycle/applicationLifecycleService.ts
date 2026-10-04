/**
 * Application Lifecycle Orchestrator Service
 * Module 09: Application Lifecycle
 * 
 * Master orchestrator managing:
 * 1. Preparation Gate: verifies candidate ownership, version immutability, and READY_FOR_APPLICATION status.
 * 2. Submission Strategy: resolves strategy deterministically from source policy.
 * 3. Human Task Workflow: creates and completes human action items for restricted sources.
 * 4. Authorized Adapter Execution: dispatches payload, records auditable attempts.
 * 5. Idempotency & Duplicate Prevention: ensures the same preparation version is never duplicate-submitted.
 * 6. Auditable Status History: records all state transitions with actor and reason.
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import { jobSearchService } from '../job/jobSearchService.js';
import { applicationPreparationService } from '../applicationPreparation/applicationPreparationService.js';
import { submissionPolicyEngine } from './submissionPolicyEngine.js';
import { submissionAdapterRegistry } from './submissionAdapterRegistry.js';
import { supportedAtsSubmissionAdapter } from './adapters/supportedAtsAdapter.js';
import { humanSubmissionService } from './humanSubmissionService.js';
import {
  ApplicationRecord,
  ApplicationLifecycleStatus,
  SubmissionAttemptRecord,
  ApplicationHumanTask,
  ApplicationStatusHistoryRecord,
  ApplicationDetailPackage,
  LifecycleActorType,
  SubmissionPayload,
  SubmissionResult,
} from './applicationLifecycleTypes.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

// Auto-register supported ATS adapter on startup
submissionAdapterRegistry.register(supportedAtsSubmissionAdapter);

export class ApplicationLifecycleService {
  /**
   * Initializes or gets an application lifecycle record from an approved preparation package.
   * Enforces the Preparation Gate: preparation MUST exist, belong to user, and be READY_FOR_APPLICATION.
   */
  public async createOrGetApplication(
    userId: string,
    preparationId: string,
    idempotencyKey?: string
  ): Promise<ApplicationRecord> {
    if (!preparationId || typeof preparationId !== 'string') {
      throw new ValidationError('Preparation ID is required.');
    }

    // 1. Fetch preparation package from Module 08
    const prepPackage = await applicationPreparationService.getPreparation(userId, preparationId);
    if (!prepPackage || !prepPackage.preparation) {
      throw new NotFoundError(`Application preparation '${preparationId}' not found.`);
    }

    const { preparation, activeVersion, job } = prepPackage;

    // Security check: verify candidate ownership
    if (preparation.userId !== userId) {
      throw new ForbiddenError('Unauthorized: Candidate does not own this preparation package.');
    }

    // Preparation Gate: must be READY_FOR_APPLICATION
    if (!preparation.isReadyForApplication || preparation.status !== 'READY_FOR_APPLICATION') {
      throw new AppError(
        `Application cannot enter submission lifecycle: Preparation status is '${preparation.status}'. All blocking review items must be resolved first.`,
        409
      );
    }

    if (!activeVersion) {
      throw new AppError('Preparation version missing: active version snapshot is required.', 409);
    }

    if (!job) {
      throw new NotFoundError(`Target job not found for preparation '${preparationId}'.`);
    }

    if (job.status === 'CLOSED') {
      throw new AppError('Target job is CLOSED. Application submissions for closed jobs are prohibited.', 400);
    }

    // Deterministic idempotency key if not supplied
    const effectiveKey = idempotencyKey || `idem-${userId}-${activeVersion.id}`;

    // Check existing application in DB or in-memory fallback
    const strategyResult = submissionPolicyEngine.resolveSubmissionStrategy(job);

    const initialStatus: ApplicationLifecycleStatus =
      strategyResult.strategy === 'HUMAN_REQUIRED' || strategyResult.strategy === 'RESTRICTED'
        ? 'HUMAN_ACTION_REQUIRED'
        : 'READY_FOR_SUBMISSION';

    const appId = randomUUID();
    const appRecord: ApplicationRecord = {
      id: appId,
      userId,
      jobId: job.id,
      preparationId: preparation.id,
      preparationVersionId: activeVersion.id,
      status: initialStatus,
      submissionStrategy: strategyResult.strategy,
      submissionMethod: strategyResult.strategy === 'AUTHORIZED_AUTOMATIC' ? 'AUTHORIZED_ATS_API' : 'MANUAL_HUMAN',
      idempotencyKey: effectiveKey,
      isVerifiedSubmission: false,
      metadata: {
        sourceId: job.sourceId,
        jobTitle: job.title,
        companyName: job.companyName,
        strategyReason: strategyResult.reason,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Persistence in Supabase
    try {
      const supabase = requireDatabaseClient();

      // Check existing
      const { data: existing } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .eq('preparation_version_id', activeVersion.id)
        .maybeSingle();

      if (existing) {
        return this.mapApplicationRow(existing);
      }

      await supabase.from('applications').insert({
        id: appRecord.id,
        user_id: appRecord.userId,
        job_id: appRecord.jobId,
        preparation_id: appRecord.preparationId,
        preparation_version_id: appRecord.preparationVersionId,
        status: appRecord.status,
        submission_strategy: appRecord.submissionStrategy,
        submission_method: appRecord.submissionMethod,
        idempotency_key: appRecord.idempotencyKey,
        is_verified_submission: appRecord.isVerifiedSubmission,
        metadata: appRecord.metadata,
        created_at: appRecord.createdAt,
        updated_at: appRecord.updatedAt,
      });

      // Record initial history
      await this.recordStatusTransition(
        appRecord.id,
        userId,
        null,
        initialStatus,
        'SYSTEM',
        'system',
        `Application entered lifecycle with strategy '${strategyResult.strategy}'`,
        { strategy: strategyResult.strategy },
        effectiveKey
      );

      // If human required, create initial human task
      if (initialStatus === 'HUMAN_ACTION_REQUIRED') {
        const humanTask = humanSubmissionService.createHumanTask(
          appRecord.id,
          userId,
          job,
          activeVersion,
          strategyResult.reason
        );

        await supabase.from('application_human_tasks').insert({
          id: humanTask.id,
          application_id: humanTask.applicationId,
          user_id: humanTask.userId,
          job_id: humanTask.jobId,
          preparation_version_id: humanTask.preparationVersionId,
          title: humanTask.title,
          reason: humanTask.reason,
          target_url: humanTask.targetUrl,
          status: humanTask.status,
          instructions: humanTask.instructions,
          candidate_confirmed_submission: humanTask.candidateConfirmedSubmission,
          created_at: humanTask.createdAt,
        });

        // Also register into Module 10 generalized human_tasks engine
        const dedupKey = `MANUAL_APPLICATION:RESTRICTED_SOURCE:${appRecord.id}:${job.id}`;
        await supabase.from('human_tasks').upsert({
          id: humanTask.id,
          user_id: humanTask.userId,
          task_type: 'MANUAL_APPLICATION',
          priority: 'HIGH',
          status: 'OPEN',
          reason_code: 'RESTRICTED_SOURCE',
          title: humanTask.title,
          description: humanTask.reason,
          instructions: humanTask.instructions,
          application_id: appRecord.id,
          job_id: job.id,
          preparation_id: appRecord.preparationId,
          preparation_version_id: appRecord.preparationVersionId,
          target_url: humanTask.targetUrl,
          input_type: 'CONFIRMATION',
          is_sensitive: false,
          deduplication_key: dedupKey,
          created_at: humanTask.createdAt,
          updated_at: humanTask.createdAt,
        }, { onConflict: 'user_id,deduplication_key' });
      }
    } catch (err: any) {
      logger.info('Database persistence skipped or DB unconfigured for createOrGetApplication', { error: err?.message });
    }

    return appRecord;
  }

  /**
   * Submits an application via authorized adapter or enforces human action.
   * Strictly enforces Idempotency: cannot resubmit an already SUBMITTED application.
   */
  public async submitApplication(
    userId: string,
    applicationId: string,
    options?: { candidateConfirmed?: boolean; candidateNotes?: string }
  ): Promise<{ application: ApplicationRecord; attempt?: SubmissionAttemptRecord; result: SubmissionResult }> {
    const app = await this.getApplicationById(userId, applicationId);
    if (!app) {
      throw new NotFoundError(`Application '${applicationId}' not found.`);
    }

    if (app.userId !== userId) {
      throw new ForbiddenError('Unauthorized: Candidate does not own this application.');
    }

    // Idempotency: check if already successfully submitted
    if (app.status === 'SUBMITTED') {
      logger.info('Idempotency check: application is already SUBMITTED', { applicationId });
      return {
        application: app,
        result: {
          status: 'SUBMITTED',
          externalApplicationId: app.externalApplicationId || undefined,
          confirmationUrl: app.confirmationUrl || undefined,
          submittedAt: app.submittedAt || undefined,
        },
      };
    }

    const prepPackage = await applicationPreparationService.getPreparation(userId, app.preparationId);
    const { activeVersion, job } = prepPackage;

    if (!job || !activeVersion) {
      throw new AppError('Cannot submit: preparation version or target job is missing.', 409);
    }

    // Strategy check
    const strategy = submissionPolicyEngine.resolveSubmissionStrategy(job, options?.candidateConfirmed);

    // If source is restricted or requires human action:
    if (strategy.strategy === 'HUMAN_REQUIRED' || strategy.strategy === 'RESTRICTED') {
      await this.transitionStatus(
        app,
        'HUMAN_ACTION_REQUIRED',
        'SYSTEM',
        'submission_orchestrator',
        strategy.reason,
        { strategy: strategy.strategy }
      );

      return {
        application: { ...app, status: 'HUMAN_ACTION_REQUIRED' },
        result: {
          status: 'SUBMISSION_FAILED',
          failureCode: 'HUMAN_ACTION_REQUIRED',
          failureCategory: 'POLICY',
          errorMessage: strategy.reason,
        },
      };
    }

    if (strategy.strategy === 'DISABLED') {
      throw new AppError(`Submission to source '${job.sourceId}' is disabled.`, 403);
    }

    // Find registered adapter
    const adapter = submissionAdapterRegistry.getAdapterForJob(job);
    if (!adapter) {
      throw new AppError(`No authorized submission adapter configured for source '${job.sourceId}'.`, 503);
    }

    const correlationId = randomUUID();

    // Transition to SUBMITTING
    await this.transitionStatus(
      app,
      'SUBMITTING',
      'CANDIDATE',
      userId,
      'Candidate initiated direct submission via authorized adapter',
      { adapterId: adapter.id, correlationId }
    );

    const payload: SubmissionPayload = {
      applicationId: app.id,
      userId,
      job,
      preparationVersion: activeVersion,
      tailoredResume: activeVersion.tailoredResume,
      tailoredCoverLetter: activeVersion.tailoredCoverLetter,
      applicationAnswers: activeVersion.applicationAnswers,
      correlationId,
      candidateNotes: options?.candidateNotes,
    };

    const startedAt = new Date().toISOString();
    const result = await adapter.submit(payload);
    const completedAt = new Date().toISOString();

    const attemptRecord: SubmissionAttemptRecord = {
      id: randomUUID(),
      applicationId: app.id,
      userId,
      preparationVersionId: activeVersion.id,
      sourceId: job.sourceId,
      adapterId: adapter.id,
      attemptStatus: result.status === 'SUBMITTED' ? 'SUCCEEDED' : 'FAILED',
      httpStatus: result.httpStatus || (result.status === 'SUBMITTED' ? 200 : 502),
      externalApplicationId: result.externalApplicationId || null,
      confirmationUrl: result.confirmationUrl || null,
      failureCode: result.failureCode || null,
      failureCategory: result.failureCategory || null,
      sanitizedErrorMessage: result.errorMessage || null,
      correlationId,
      startedAt,
      completedAt,
      createdAt: completedAt,
    };

    // Persist attempt in DB
    try {
      const supabase = requireDatabaseClient();
      await supabase.from('application_submission_attempts').insert({
        id: attemptRecord.id,
        application_id: attemptRecord.applicationId,
        user_id: attemptRecord.userId,
        preparation_version_id: attemptRecord.preparationVersionId,
        source_id: attemptRecord.sourceId,
        adapter_id: attemptRecord.adapterId,
        attempt_status: attemptRecord.attemptStatus,
        http_status: attemptRecord.httpStatus,
        external_application_id: attemptRecord.externalApplicationId,
        confirmation_url: attemptRecord.confirmationUrl,
        failure_code: attemptRecord.failureCode,
        failure_category: attemptRecord.failureCategory,
        sanitized_error_message: attemptRecord.sanitizedErrorMessage,
        correlation_id: attemptRecord.correlationId,
        started_at: attemptRecord.startedAt,
        completed_at: attemptRecord.completedAt,
        created_at: attemptRecord.createdAt,
      });
    } catch (err: any) {
      logger.info('Database persistence skipped for submission attempt', { error: err?.message });
    }

    if (result.status === 'SUBMITTED') {
      const updatedApp: ApplicationRecord = {
        ...app,
        status: 'SUBMITTED',
        externalApplicationId: result.externalApplicationId || null,
        externalApplicationIdProvenance: result.externalApplicationId ? 'SYSTEM_VERIFIED' : null,
        confirmationUrl: result.confirmationUrl || null,
        submittedAt: result.submittedAt || completedAt,
        isVerifiedSubmission: true,
        submissionVerificationSource: 'AUTHORIZED_ADAPTER',
        updatedAt: completedAt,
      };

      await this.transitionStatus(
        updatedApp,
        'SUBMITTED',
        'AUTHORIZED_ADAPTER',
        adapter.id,
        'Application successfully submitted via authorized API gateway',
        { externalApplicationId: result.externalApplicationId, confirmationUrl: result.confirmationUrl }
      );

      return { application: updatedApp, attempt: attemptRecord, result };
    }

    // Failure branch
    const failedApp: ApplicationRecord = {
      ...app,
      status: 'SUBMISSION_FAILED',
      updatedAt: completedAt,
    };

    await this.transitionStatus(
      failedApp,
      'SUBMISSION_FAILED',
      'AUTHORIZED_ADAPTER',
      adapter.id,
      result.errorMessage || 'Submission attempt failed upstream',
      { failureCode: result.failureCode, failureCategory: result.failureCategory }
    );

    return { application: failedApp, attempt: attemptRecord, result };
  }

  /**
   * Candidate explicitly confirms human submission of external application.
   */
  public async confirmHumanSubmission(
    userId: string,
    applicationId: string,
    details: { externalApplicationId?: string; candidateNotes?: string }
  ): Promise<ApplicationRecord> {
    const app = await this.getApplicationById(userId, applicationId);
    if (!app) {
      throw new NotFoundError(`Application '${applicationId}' not found.`);
    }

    if (app.userId !== userId) {
      throw new ForbiddenError('Unauthorized: Candidate does not own this application.');
    }

    if (app.status === 'SUBMITTED') {
      return app;
    }

    const now = new Date().toISOString();
    const updatedApp: ApplicationRecord = {
      ...app,
      status: 'SUBMITTED',
      externalApplicationId: details.externalApplicationId || null,
      externalApplicationIdProvenance: details.externalApplicationId ? 'CANDIDATE_PROVIDED' : null,
      submittedAt: now,
      isVerifiedSubmission: false,
      submissionVerificationSource: 'CANDIDATE_CONFIRMATION',
      updatedAt: now,
    };

    // Update human task if present
    try {
      const supabase = requireDatabaseClient();
      await supabase
        .from('application_human_tasks')
        .update({
          status: 'COMPLETED',
          candidate_confirmed_submission: true,
          candidate_external_application_id: details.externalApplicationId || null,
          candidate_notes: details.candidateNotes || null,
          completed_at: now,
        })
        .eq('application_id', app.id)
        .eq('user_id', userId);

      // Also update general human_tasks table
      await supabase
        .from('human_tasks')
        .update({
          status: 'COMPLETED',
          candidate_confirmed: true,
          external_reference_id: details.externalApplicationId || null,
          external_reference_provenance: details.externalApplicationId ? 'CANDIDATE_PROVIDED' : null,
          candidate_notes: details.candidateNotes || null,
          completed_at: now,
          updated_at: now,
        })
        .eq('application_id', app.id)
        .eq('user_id', userId);
    } catch (err: any) {
      logger.info('Database update skipped for human task', { error: err?.message });
    }

    await this.transitionStatus(
      updatedApp,
      'SUBMITTED',
      'CANDIDATE',
      userId,
      'Candidate explicitly confirmed external submission completed',
      { candidateNotes: details.candidateNotes, externalApplicationId: details.externalApplicationId }
    );

    return updatedApp;
  }

  /**
   * Cancels an active application workflow.
   */
  public async cancelApplication(userId: string, applicationId: string, reason?: string): Promise<ApplicationRecord> {
    const app = await this.getApplicationById(userId, applicationId);
    if (!app) throw new NotFoundError(`Application '${applicationId}' not found.`);
    if (app.userId !== userId) throw new ForbiddenError('Unauthorized: Candidate does not own this application.');

    if (app.status === 'SUBMITTED') {
      throw new AppError('Cannot cancel an application that has already been submitted. Use withdraw instead.', 400);
    }

    const updatedApp: ApplicationRecord = {
      ...app,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    };

    await this.transitionStatus(
      updatedApp,
      'CANCELLED',
      'CANDIDATE',
      userId,
      reason || 'Candidate cancelled application workflow',
      {}
    );

    return updatedApp;
  }

  /**
   * Fetches an application by ID or preparation ID.
   */
  public async getApplicationById(userId: string, id: string): Promise<ApplicationRecord | null> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .or(`id.eq.${id},preparation_id.eq.${id}`)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapApplicationRow(data);
    } catch {
      return null;
    }
  }

  /**
   * Lists all applications for the authenticated candidate.
   */
  public async listApplications(userId: string): Promise<ApplicationRecord[]> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((d: any) => this.mapApplicationRow(d));
    } catch {
      return [];
    }
  }

  /**
   * Fetches full application detail package including job, preparation, attempts, and history.
   */
  public async getApplicationDetail(userId: string, applicationId: string): Promise<ApplicationDetailPackage> {
    const app = await this.getApplicationById(userId, applicationId);
    if (!app) {
      throw new NotFoundError(`Application '${applicationId}' not found.`);
    }

    const [job, prepPackage, attempts, humanTasks, history] = await Promise.all([
      jobSearchService.getJobById(app.jobId).catch(() => null),
      applicationPreparationService.getPreparation(userId, app.preparationId).catch(() => null),
      this.listAttempts(userId, app.id),
      this.listHumanTasks(userId, app.id),
      this.listStatusHistory(userId, app.id),
    ]);

    return {
      application: app,
      job,
      preparation: prepPackage?.preparation || null,
      activeVersion: prepPackage?.activeVersion || null,
      humanTasks,
      submissionAttempts: attempts,
      history,
    };
  }

  private async listAttempts(userId: string, applicationId: string): Promise<SubmissionAttemptRecord[]> {
    try {
      const supabase = requireDatabaseClient();
      const { data } = await supabase
        .from('application_submission_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

      return (data || []).map((d: any) => ({
        id: d.id,
        applicationId: d.application_id,
        userId: d.user_id,
        preparationVersionId: d.preparation_version_id,
        sourceId: d.source_id,
        adapterId: d.adapter_id,
        attemptStatus: d.attempt_status,
        httpStatus: d.http_status,
        externalApplicationId: d.external_application_id,
        confirmationUrl: d.confirmation_url,
        failureCode: d.failure_code,
        failureCategory: d.failure_category,
        sanitizedErrorMessage: d.sanitized_error_message,
        correlationId: d.correlation_id,
        startedAt: d.started_at,
        completedAt: d.completed_at,
        createdAt: d.created_at,
      }));
    } catch {
      return [];
    }
  }

  private async listHumanTasks(userId: string, applicationId: string): Promise<ApplicationHumanTask[]> {
    try {
      const supabase = requireDatabaseClient();
      const { data } = await supabase
        .from('application_human_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('application_id', applicationId);

      return (data || []).map((d: any) => ({
        id: d.id,
        applicationId: d.application_id,
        userId: d.user_id,
        jobId: d.job_id,
        preparationVersionId: d.preparation_version_id,
        title: d.title,
        reason: d.reason,
        targetUrl: d.target_url,
        status: d.status,
        instructions: d.instructions,
        candidateNotes: d.candidate_notes,
        candidateConfirmedSubmission: d.candidate_confirmed_submission,
        candidateExternalApplicationId: d.candidate_external_application_id,
        startedAt: d.started_at,
        completedAt: d.completed_at,
        cancelledAt: d.cancelled_at,
        createdAt: d.created_at,
      }));
    } catch {
      return [];
    }
  }

  private async listStatusHistory(userId: string, applicationId: string): Promise<ApplicationStatusHistoryRecord[]> {
    try {
      const supabase = requireDatabaseClient();
      const { data } = await supabase
        .from('application_status_history')
        .select('*')
        .eq('user_id', userId)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      return (data || []).map((d: any) => ({
        id: d.id,
        applicationId: d.application_id,
        userId: d.user_id,
        previousStatus: d.previous_status,
        newStatus: d.new_status,
        actorType: d.actor_type,
        actorId: d.actor_id,
        reason: d.reason,
        metadata: d.metadata || {},
        correlationId: d.correlation_id,
        createdAt: d.created_at,
      }));
    } catch {
      return [];
    }
  }

  private async transitionStatus(
    app: ApplicationRecord,
    newStatus: ApplicationLifecycleStatus,
    actorType: LifecycleActorType,
    actorId: string,
    reason: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const previousStatus = app.status;
    const now = new Date().toISOString();

    try {
      const supabase = requireDatabaseClient();
      await supabase
        .from('applications')
        .update({
          status: newStatus,
          external_application_id: app.externalApplicationId,
          external_application_id_provenance: app.externalApplicationIdProvenance,
          confirmation_url: app.confirmationUrl,
          submitted_at: app.submittedAt,
          is_verified_submission: app.isVerifiedSubmission,
          submission_verification_source: app.submissionVerificationSource,
          updated_at: now,
        })
        .eq('id', app.id)
        .eq('user_id', app.userId);

      await this.recordStatusTransition(
        app.id,
        app.userId,
        previousStatus,
        newStatus,
        actorType,
        actorId,
        reason,
        metadata,
        randomUUID()
      );
    } catch (err: any) {
      logger.info('Database transition update skipped or DB unconfigured', { error: err?.message });
    }
  }

  private async recordStatusTransition(
    applicationId: string,
    userId: string,
    previousStatus: ApplicationLifecycleStatus | null,
    newStatus: ApplicationLifecycleStatus,
    actorType: LifecycleActorType,
    actorId: string,
    reason: string,
    metadata: Record<string, unknown>,
    correlationId: string
  ): Promise<void> {
    try {
      const supabase = requireDatabaseClient();
      await supabase.from('application_status_history').insert({
        id: randomUUID(),
        application_id: applicationId,
        user_id: userId,
        previous_status: previousStatus,
        new_status: newStatus,
        actor_type: actorType,
        actor_id: actorId,
        reason,
        metadata,
        correlation_id: correlationId,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.info('Status transition record skipped or DB unconfigured', { error: err?.message });
    }
  }

  private mapApplicationRow(row: any): ApplicationRecord {
    return {
      id: row.id,
      userId: row.user_id,
      jobId: row.job_id,
      preparationId: row.preparation_id,
      preparationVersionId: row.preparation_version_id,
      status: row.status,
      submissionStrategy: row.submission_strategy,
      submissionMethod: row.submission_method,
      idempotencyKey: row.idempotency_key,
      externalApplicationId: row.external_application_id,
      externalApplicationIdProvenance: row.external_application_id_provenance,
      confirmationUrl: row.confirmation_url,
      submittedAt: row.submitted_at,
      isVerifiedSubmission: row.is_verified_submission,
      submissionVerificationSource: row.submission_verification_source,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const applicationLifecycleService = new ApplicationLifecycleService();
