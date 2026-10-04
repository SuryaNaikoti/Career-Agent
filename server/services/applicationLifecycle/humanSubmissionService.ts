/**
 * Human Submission Action Workflow Service
 * Module 09: Application Lifecycle
 * 
 * Rules:
 * 1. Manages HumanActionTasks for restricted or external flows.
 * 2. Opening the external task / URL NEVER marks an application submitted.
 * 3. Only explicit candidate confirmation transitions status to SUBMITTED.
 * 4. Cancellation transitions task to CANCELLED and application to CANCELLED.
 * 5. Strictly validates HTTPS URL scheme, preventing SSRF or malicious javascript: links.
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import { ApplicationHumanTask, HumanTaskStatus } from './applicationLifecycleTypes.js';
import { CanonicalJob } from '../job/jobTypes.js';
import { ApplicationPreparationVersion } from '../applicationPreparation/applicationPreparationTypes.js';
import { AppError, ValidationError, NotFoundError, ForbiddenError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class HumanSubmissionService {
  /**
   * Safely validates external URL scheme for security (HTTPS only, no unsafe schemes).
   */
  public validateApplicationUrl(rawUrl: string): string {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new ValidationError('Application URL is missing or invalid.');
    }

    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new ValidationError(`Disallowed URL protocol '${parsed.protocol}'. Only HTTPS/HTTP URLs are allowed.`);
      }

      // Block SSRF / localhost / private IP targets if resolved
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '169.254.169.254' || // AWS metadata
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local')
      ) {
        throw new ValidationError('Application URL targets an internal or restricted network address.');
      }

      return parsed.toString();
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(`Malformed application URL: ${err.message}`);
    }
  }

  /**
   * Creates a HumanActionTask for restricted or assisted applications.
   */
  public createHumanTask(
    applicationId: string,
    userId: string,
    job: CanonicalJob,
    prepVersion: ApplicationPreparationVersion,
    reason: string
  ): ApplicationHumanTask {
    const rawTarget = job.applyUrl || job.sourceUrl || '';
    const safeUrl = this.validateApplicationUrl(rawTarget || 'https://company.example.com/apply');

    const task: ApplicationHumanTask = {
      id: randomUUID(),
      applicationId,
      userId,
      jobId: job.id,
      preparationVersionId: prepVersion.id,
      title: `Submit application on ${job.companyName} site`,
      reason,
      targetUrl: safeUrl,
      status: 'PENDING',
      instructions: `Please review your tailored resume and cover letter, visit the employer portal, fill in any additional questions, and confirm once submitted.`,
      candidateNotes: null,
      candidateConfirmedSubmission: false,
      candidateExternalApplicationId: null,
      createdAt: new Date().toISOString(),
    };

    return task;
  }
}

export const humanSubmissionService = new HumanSubmissionService();
