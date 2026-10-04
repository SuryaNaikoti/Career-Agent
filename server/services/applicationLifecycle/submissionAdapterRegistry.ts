/**
 * Submission Adapter Contract & Registry
 * Module 09: Application Lifecycle
 * 
 * Rules:
 * 1. Defines strict SubmissionAdapter interface.
 * 2. Adapters validate payload, execute authorized transmission, and interpret results cleanly.
 * 3. Never bypasses CAPTCHA, MFA, or anti-bot protections.
 * 4. Zero fake success: if submission provider fails or credentials are unconfigured, throws or returns clean failure.
 * 5. Test double injection is strictly limited to automated tests.
 */

import { CanonicalJob } from '../job/jobTypes.js';
import { SubmissionPayload, SubmissionResult } from './applicationLifecycleTypes.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export interface SubmissionAdapter {
  readonly id: string;
  readonly name: string;
  readonly supportedSourceId: string;

  canHandle(job: CanonicalJob): boolean;
  validatePayload(payload: SubmissionPayload): { valid: boolean; errors?: string[] };
  submit(payload: SubmissionPayload): Promise<SubmissionResult>;
}

export class SubmissionAdapterRegistry {
  private adapters: Map<string, SubmissionAdapter> = new Map();
  private testAdapterDouble?: SubmissionAdapter;

  /**
   * For automated tests ONLY: allows injecting a test double adapter.
   */
  public setTestAdapterDouble(double?: SubmissionAdapter): void {
    this.testAdapterDouble = double;
  }

  public register(adapter: SubmissionAdapter): void {
    this.adapters.set(adapter.supportedSourceId.toLowerCase(), adapter);
  }

  public getAdapterForJob(job: CanonicalJob): SubmissionAdapter | null {
    if (this.testAdapterDouble && this.testAdapterDouble.canHandle(job)) {
      return this.testAdapterDouble;
    }

    const sourceId = job.sourceId ? job.sourceId.toLowerCase() : '';
    const adapter = this.adapters.get(sourceId);
    if (adapter && adapter.canHandle(job)) {
      return adapter;
    }

    return null;
  }

  public listAdapters(): SubmissionAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const submissionAdapterRegistry = new SubmissionAdapterRegistry();
