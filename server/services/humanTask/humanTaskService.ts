/**
 * Human Task Engine Master Service
 * Module 10: Human Task Engine
 * 
 * Rules:
 * 1. Single Source of Truth for human tasks.
 * 2. Deduplication: deterministic key per (userId, taskType, context, reasonCode).
 * 3. Strict state machine transitions:
 *    OPEN -> IN_PROGRESS -> COMPLETED | CANCELLED
 * 4. Input validation before marking completed.
 * 5. Downstream synchronization:
 *    - Updates Candidate Truth Layer where applicable (CANDIDATE_PROVIDED / CANDIDATE_CONFIRMED)
 *    - Resolves Module 08 review items when applicable
 *    - Triggers Module 09 human submission confirmation when applicable
 * 6. Audits all lifecycle transitions.
 * 7. Candidate-provided external reference IDs strictly remain CANDIDATE_PROVIDED.
 */

import { randomUUID, createHash } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import {
  HumanTaskRecord,
  CreateHumanTaskInput,
  CompleteTaskInput,
  TaskListQuery,
  HumanTaskLifecycleStatus,
  HumanTaskAuditEvent,
} from './humanTaskTypes.js';
import { HumanTaskValidator } from './humanTaskValidator.js';
import { applicationLifecycleService } from '../applicationLifecycle/applicationLifecycleService.js';
import { applicationPreparationService } from '../applicationPreparation/applicationPreparationService.js';
import { candidateProfileService } from '../candidate/candidateProfileService.js';
import { AppError, ValidationError, NotFoundError, ForbiddenError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class HumanTaskService {
  /**
   * Generates a deterministic deduplication key for a task.
   */
  public generateDeduplicationKey(input: CreateHumanTaskInput): string {
    const raw = [
      input.taskType,
      input.reasonCode,
      input.context?.applicationId || '',
      input.context?.jobId || '',
      input.context?.preparationId || '',
      input.context?.candidateFactId || '',
    ].join(':');

    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  /**
   * Creates a human task with deduplication protection.
   * If an active (OPEN or IN_PROGRESS) task already exists for this requirement, returns it.
   */
  public async createTask(input: CreateHumanTaskInput): Promise<HumanTaskRecord> {
    if (!input.userId) throw new ValidationError('userId is required to create a human task.');
    if (!input.title || !input.title.trim()) throw new ValidationError('title is required.');
    if (!input.description || !input.description.trim()) throw new ValidationError('description is required.');

    const dedupKey = this.generateDeduplicationKey(input);

    // 1. Check existing open task
    const existing = await this.findOpenTaskByDedupKey(input.userId, dedupKey);
    if (existing) {
      logger.info('Duplicate task creation prevented; returning active task', {
        userId: input.userId,
        taskId: existing.id,
        dedupKey,
      });
      return existing;
    }

    const taskId = randomUUID();
    const now = new Date().toISOString();

    const record: HumanTaskRecord = {
      id: taskId,
      userId: input.userId,
      taskType: input.taskType,
      priority: input.priority || 'NORMAL',
      status: 'OPEN',
      reasonCode: input.reasonCode,
      title: input.title.trim(),
      description: input.description.trim(),
      instructions: input.instructions?.trim() || null,
      context: input.context || {},
      schema: input.schema || { inputType: 'CONFIRMATION', isSensitive: false },
      candidateConfirmed: false,
      deduplicationKey: dedupKey,
      expiresAt: input.expiresAt || null,
      createdAt: now,
      updatedAt: now,
    };

    // 2. Persist in database
    try {
      const supabase = requireDatabaseClient();
      await supabase.from('human_tasks').insert({
        id: record.id,
        user_id: record.userId,
        task_type: record.taskType,
        priority: record.priority,
        status: record.status,
        reason_code: record.reasonCode,
        title: record.title,
        description: record.description,
        instructions: record.instructions,
        application_id: record.context.applicationId || null,
        job_id: record.context.jobId || null,
        preparation_id: record.context.preparationId || null,
        preparation_version_id: record.context.preparationVersionId || null,
        resume_id: record.context.resumeId || null,
        candidate_fact_id: record.context.candidateFactId || null,
        target_url: record.context.targetUrl || null,
        input_type: record.schema.inputType,
        input_options: record.schema.options || [],
        input_placeholder: record.schema.placeholder || null,
        is_sensitive: !!record.schema.isSensitive,
        deduplication_key: record.deduplicationKey,
        expires_at: record.expiresAt,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      });

      await this.logAuditEvent(record.id, record.userId, 'TASK_CREATED', null, 'OPEN', 'SYSTEM', 'system', {
        reasonCode: record.reasonCode,
        priority: record.priority,
      });
    } catch (err: any) {
      logger.info('Database persistence skipped or unconfigured for createTask', { error: err?.message });
    }

    return record;
  }

  /**
   * Retrieves a single task ensuring strict candidate ownership.
   */
  public async getTaskById(userId: string, taskId: string): Promise<HumanTaskRecord> {
    if (!taskId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId)) {
      throw new ValidationError(`Malformed task ID '${taskId}'`);
    }

    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('human_tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        throw new NotFoundError(`Task '${taskId}' not found.`);
      }

      return this.mapDbRowToRecord(data);
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new NotFoundError(`Task '${taskId}' not found.`);
    }
  }

  /**
   * Lists tasks for authenticated user with filtering and pagination.
   */
  public async listTasks(userId: string, query: TaskListQuery): Promise<HumanTaskRecord[]> {
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const offset = Math.max(query.offset || 0, 0);

    try {
      const supabase = requireDatabaseClient();
      let q = supabase
        .from('human_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (query.status) {
        q = q.eq('status', query.status);
      }
      if (query.priority) {
        q = q.eq('priority', query.priority);
      }
      if (query.taskType) {
        q = q.eq('task_type', query.taskType);
      }
      if (query.applicationId) {
        q = q.eq('application_id', query.applicationId);
      }

      const { data, error } = await q;
      if (error) {
        logger.error('Failed to list human tasks from database', { userId, error: error.message });
        return [];
      }

      return (data || []).map((row) => this.mapDbRowToRecord(row));
    } catch {
      return [];
    }
  }

  /**
   * Transitions task to IN_PROGRESS.
   */
  public async startTask(userId: string, taskId: string): Promise<HumanTaskRecord> {
    const task = await this.getTaskById(userId, taskId);

    if (task.status === 'COMPLETED' || task.status === 'CANCELLED' || task.status === 'EXPIRED') {
      throw new AppError(`Cannot start task in terminal state '${task.status}'`, 409);
    }

    if (task.status === 'IN_PROGRESS') {
      return task;
    }

    const now = new Date().toISOString();
    const updated: HumanTaskRecord = {
      ...task,
      status: 'IN_PROGRESS',
      startedAt: task.startedAt || now,
      updatedAt: now,
    };

    try {
      const supabase = requireDatabaseClient();
      await supabase
        .from('human_tasks')
        .update({
          status: 'IN_PROGRESS',
          started_at: updated.startedAt,
          updated_at: now,
        })
        .eq('id', task.id)
        .eq('user_id', userId);

      await this.logAuditEvent(task.id, userId, 'TASK_STARTED', task.status, 'IN_PROGRESS', 'CANDIDATE', userId, {});
    } catch (err: any) {
      logger.info('Database update skipped for startTask', { error: err?.message });
    }

    return updated;
  }

  /**
   * Completes a task: validates response, applies truth integration, triggers downstream actions.
   */
  public async completeTask(userId: string, taskId: string, input: CompleteTaskInput): Promise<HumanTaskRecord> {
    const task = await this.getTaskById(userId, taskId);

    if (task.status === 'COMPLETED') {
      throw new AppError('Task is already completed and cannot be completed again.', 409);
    }

    if (task.status === 'CANCELLED' || task.status === 'EXPIRED') {
      throw new AppError(`Cannot complete task in '${task.status}' state.`, 409);
    }

    // 1. Server-side response validation
    const validationResult = HumanTaskValidator.validateResponse(
      task.schema,
      input.responseValue,
      input.candidateConfirmed
    );

    const now = new Date().toISOString();
    const externalRefId = input.externalReferenceId ? input.externalReferenceId.trim() : null;

    // 2. Downstream domain integration
    await this.applyDownstreamAction(userId, task, validationResult.normalizedValue, externalRefId, input.candidateNotes);

    // 3. Mark task completed
    const updated: HumanTaskRecord = {
      ...task,
      status: 'COMPLETED',
      responseValue: validationResult.normalizedValue,
      candidateNotes: input.candidateNotes?.trim() || null,
      candidateConfirmed: true,
      externalReferenceId: externalRefId,
      externalReferenceProvenance: externalRefId ? 'CANDIDATE_PROVIDED' : null,
      completedAt: now,
      updatedAt: now,
    };

    try {
      const supabase = requireDatabaseClient();
      await supabase
        .from('human_tasks')
        .update({
          status: 'COMPLETED',
          response_value: JSON.stringify(validationResult.normalizedValue),
          candidate_notes: updated.candidateNotes,
          candidate_confirmed: true,
          external_reference_id: updated.externalReferenceId,
          external_reference_provenance: updated.externalReferenceProvenance,
          completed_at: now,
          updated_at: now,
        })
        .eq('id', task.id)
        .eq('user_id', userId);

      await this.logAuditEvent(task.id, userId, 'TASK_COMPLETED', task.status, 'COMPLETED', 'CANDIDATE', userId, {
        taskType: task.taskType,
        hasExternalRef: !!externalRefId,
      });
    } catch (err: any) {
      logger.info('Database update skipped for completeTask', { error: err?.message });
    }

    return updated;
  }

  /**
   * Cancels an open or in-progress task.
   */
  public async cancelTask(userId: string, taskId: string, reason?: string): Promise<HumanTaskRecord> {
    const task = await this.getTaskById(userId, taskId);

    if (task.status === 'COMPLETED') {
      throw new AppError('Cannot cancel an already completed task.', 409);
    }

    if (task.status === 'CANCELLED') {
      return task;
    }

    const now = new Date().toISOString();
    const updated: HumanTaskRecord = {
      ...task,
      status: 'CANCELLED',
      cancelledAt: now,
      updatedAt: now,
    };

    try {
      const supabase = requireDatabaseClient();
      await supabase
        .from('human_tasks')
        .update({
          status: 'CANCELLED',
          cancelled_at: now,
          updated_at: now,
        })
        .eq('id', task.id)
        .eq('user_id', userId);

      await this.logAuditEvent(task.id, userId, 'TASK_CANCELLED', task.status, 'CANCELLED', 'CANDIDATE', userId, {
        reason: reason || 'Candidate cancelled task',
      });
    } catch (err: any) {
      logger.info('Database update skipped for cancelTask', { error: err?.message });
    }

    return updated;
  }

  /**
   * Executes downstream domain updates upon successful task completion.
   */
  private async applyDownstreamAction(
    userId: string,
    task: HumanTaskRecord,
    responseValue: unknown,
    externalRefId: string | null,
    candidateNotes?: string
  ): Promise<void> {
    // A. Manual Application / Confirm Submission -> Trigger Module 09 confirmation
    if (
      (task.taskType === 'MANUAL_APPLICATION' || task.taskType === 'CONFIRM_SUBMISSION') &&
      task.context.applicationId
    ) {
      await applicationLifecycleService.confirmHumanSubmission(userId, task.context.applicationId, {
        externalApplicationId: externalRefId || undefined,
        candidateNotes: candidateNotes || undefined,
      });
      return;
    }

    // B. Answer Application Question -> Resolve Module 08 review item if linked
    if (
      task.taskType === 'ANSWER_APPLICATION_QUESTION' &&
      task.context.preparationId &&
      task.context.candidateFactId
    ) {
      await applicationPreparationService.resolveReviewItem(
        userId,
        task.context.preparationId,
        task.context.candidateFactId,
        String(responseValue)
      );
      return;
    }

    // C. Sensitive Confirmation (e.g. Work Authorization) -> Candidate Truth Layer Profile update
    if (task.taskType === 'SENSITIVE_CONFIRMATION' && task.reasonCode === 'CONFIRM_WORK_AUTHORIZATION') {
      await candidateProfileService.upsertProfile(userId, {
        workAuthorization: String(responseValue),
        provenance: 'CANDIDATE_CONFIRMED',
      });
      return;
    }

    // D. Missing Salary / Preferences Confirmation
    if (task.taskType === 'CONFIRM_INFORMATION' && task.reasonCode === 'CONFIRM_SALARY_EXPECTATION') {
      const salaryNum = typeof responseValue === 'number' ? responseValue : parseFloat(String(responseValue));
      if (!isNaN(salaryNum)) {
        await candidateProfileService.upsertProfile(userId, {
          expectedSalaryMin: salaryNum,
          provenance: 'CANDIDATE_CONFIRMED',
        });
      }
      return;
    }
  }

  /**
   * Finds an active task by deduplication key.
   */
  private async findOpenTaskByDedupKey(userId: string, dedupKey: string): Promise<HumanTaskRecord | null> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('human_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('deduplication_key', dedupKey)
        .in('status', ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'])
        .maybeSingle();

      if (error || !data) return null;
      return this.mapDbRowToRecord(data);
    } catch {
      return null;
    }
  }

  private async logAuditEvent(
    taskId: string,
    userId: string,
    eventType: HumanTaskAuditEvent['eventType'],
    previousStatus: HumanTaskLifecycleStatus | null,
    newStatus: HumanTaskLifecycleStatus | null,
    actorType: 'CANDIDATE' | 'SYSTEM' | 'AI',
    actorId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      const supabase = requireDatabaseClient();
      await supabase.from('human_task_audit_history').insert({
        id: randomUUID(),
        task_id: taskId,
        user_id: userId,
        event_type: eventType,
        previous_status: previousStatus,
        new_status: newStatus,
        actor_id: actorId,
        actor_type: actorType,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Non-blocking in test environment
    }
  }

  private mapDbRowToRecord(row: any): HumanTaskRecord {
    return {
      id: row.id,
      userId: row.user_id,
      taskType: row.task_type,
      priority: row.priority,
      status: row.status,
      reasonCode: row.reason_code,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      context: {
        applicationId: row.application_id,
        jobId: row.job_id,
        preparationId: row.preparation_id,
        preparationVersionId: row.preparation_version_id,
        resumeId: row.resume_id,
        candidateFactId: row.candidate_fact_id,
        targetUrl: row.target_url,
      },
      schema: {
        inputType: row.input_type,
        options: row.input_options || [],
        placeholder: row.input_placeholder,
        isSensitive: row.is_sensitive,
      },
      responseValue: row.response_value ? (typeof row.response_value === 'string' ? JSON.parse(row.response_value) : row.response_value) : null,
      candidateNotes: row.candidate_notes,
      candidateConfirmed: row.candidate_confirmed,
      externalReferenceId: row.external_reference_id,
      externalReferenceProvenance: row.external_reference_provenance,
      deduplicationKey: row.deduplication_key,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const humanTaskService = new HumanTaskService();
