/**
 * Candidate Job Interaction Service
 * Module 07: Jobs Experience
 * 
 * Rules:
 * - Candidate-level state tracking (save, unsave, dismiss, undismiss, record view).
 * - Enforces candidate identity strictly from authentication context.
 * - Adheres to zero-mock persistence rules (fails cleanly if Supabase unconfigured).
 * - Bounded recent job views.
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import { CanonicalJob } from '../job/jobTypes.js';
import { jobSearchService } from '../job/jobSearchService.js';
import { AppError, NotFoundError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class JobInteractionService {
  /**
   * Saves a job for the candidate. Idempotent.
   */
  public async saveJob(userId: string, jobId: string): Promise<{ success: boolean; isSaved: boolean }> {
    const supabase = requireDatabaseClient();

    // Verify job exists in canonical inventory
    const job = await jobSearchService.getJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Job not found: ${jobId}`);
    }

    const { error } = await supabase
      .from('saved_jobs')
      .upsert(
        {
          user_id: userId,
          job_id: jobId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,job_id' }
      );

    if (error) {
      logger.error('Failed to save job', { userId, jobId, error: error.message });
      throw new AppError(`Failed to save job: ${error.message}`, 500);
    }

    return { success: true, isSaved: true };
  }

  /**
   * Unsaves a job for the candidate.
   */
  public async unsaveJob(userId: string, jobId: string): Promise<{ success: boolean; isSaved: boolean }> {
    const supabase = requireDatabaseClient();

    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId);

    if (error) {
      logger.error('Failed to unsave job', { userId, jobId, error: error.message });
      throw new AppError(`Failed to unsave job: ${error.message}`, 500);
    }

    return { success: true, isSaved: false };
  }

  /**
   * Dismisses a job from the candidate's discovery feed.
   */
  public async dismissJob(userId: string, jobId: string): Promise<{ success: boolean; isDismissed: boolean }> {
    const supabase = requireDatabaseClient();

    const job = await jobSearchService.getJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Job not found: ${jobId}`);
    }

    const { error } = await supabase
      .from('dismissed_jobs')
      .upsert(
        {
          user_id: userId,
          job_id: jobId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,job_id' }
      );

    if (error) {
      logger.error('Failed to dismiss job', { userId, jobId, error: error.message });
      throw new AppError(`Failed to dismiss job: ${error.message}`, 500);
    }

    return { success: true, isDismissed: true };
  }

  /**
   * Undismisses a previously dismissed job.
   */
  public async undismissJob(userId: string, jobId: string): Promise<{ success: boolean; isDismissed: boolean }> {
    const supabase = requireDatabaseClient();

    const { error } = await supabase
      .from('dismissed_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId);

    if (error) {
      logger.error('Failed to undismiss job', { userId, jobId, error: error.message });
      throw new AppError(`Failed to undismiss job: ${error.message}`, 500);
    }

    return { success: true, isDismissed: false };
  }

  /**
   * Records a job view in candidate recent history.
   */
  public async recordJobView(userId: string, jobId: string): Promise<void> {
    try {
      const supabase = requireDatabaseClient();
      await supabase
        .from('recent_job_views')
        .upsert(
          {
            user_id: userId,
            job_id: jobId,
            viewed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,job_id' }
        );
    } catch (err: any) {
      // Non-blocking telemetry tracking
      logger.info('Job view recording skipped or DB unconfigured', { userId, jobId, error: err.message });
    }
  }

  /**
   * Lists all saved canonical jobs for the candidate.
   */
  public async listSavedJobs(userId: string): Promise<CanonicalJob[]> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('saved_jobs')
      .select('job_id, jobs(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list saved jobs', { userId, error: error.message });
      throw new AppError(`Failed to list saved jobs: ${error.message}`, 500);
    }

    return (data || [])
      .filter((row: any) => Boolean(row.jobs))
      .map((row: any) => jobSearchService.mapDbRowToJob(row.jobs));
  }

  /**
   * Lists recent viewed jobs for candidate.
   */
  public async listRecentlyViewed(userId: string, limit = 10): Promise<CanonicalJob[]> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('recent_job_views')
      .select('job_id, viewed_at, jobs(*)')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to list recent job views', { userId, error: error.message });
      throw new AppError(`Failed to list recent job views: ${error.message}`, 500);
    }

    return (data || [])
      .filter((row: any) => Boolean(row.jobs))
      .map((row: any) => jobSearchService.mapDbRowToJob(row.jobs));
  }

  /**
   * Retrieves sets of saved and dismissed job IDs for fast in-memory badge lookup.
   */
  public async getCandidateInteractions(userId: string): Promise<{ savedIds: Set<string>; dismissedIds: Set<string> }> {
    try {
      const supabase = requireDatabaseClient();
      const [savedRes, dismissedRes] = await Promise.all([
        supabase.from('saved_jobs').select('job_id').eq('user_id', userId),
        supabase.from('dismissed_jobs').select('job_id').eq('user_id', userId),
      ]);

      const savedIds = new Set<string>((savedRes.data || []).map((r: any) => r.job_id));
      const dismissedIds = new Set<string>((dismissedRes.data || []).map((r: any) => r.job_id));

      return { savedIds, dismissedIds };
    } catch {
      return { savedIds: new Set(), dismissedIds: new Set() };
    }
  }
}

export const jobInteractionService = new JobInteractionService();
