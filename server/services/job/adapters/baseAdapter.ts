/**
 * Job Source Adapter Abstract Base Class & Interface
 * Module 05: Job Discovery & Ingestion
 * 
 * Rules:
 * - Declares required adapter interface methods
 * - Enforces SSRF boundary: adapters only fetch explicitly configured hostnames
 * - Supports bounded pagination, retries, and rate limits
 */

import {
  JobSourceMetadata,
  RawExternalJob,
  SourcePolicyStatus,
} from '../jobTypes.js';
import { AppError } from '../../../core/errors/appError.js';
import { logger } from '../../../core/logging/logger.js';

export class SourceAdapterError extends AppError {
  public readonly code: string;
  constructor(message: string, code = 'SOURCE_ADAPTER_ERROR', statusCode = 502) {
    super(message, statusCode, true, { code });
    this.name = code;
    this.code = code;
  }
}

export interface FetchJobsParams {
  siteOrCompanyId: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface FetchJobsResult {
  jobs: RawExternalJob[];
  hasMore: boolean;
  total?: number;
  nextPage?: number;
  nextOffset?: number;
}

export abstract class BaseJobSourceAdapter {
  protected metadata: JobSourceMetadata;

  constructor(metadata: JobSourceMetadata) {
    this.metadata = metadata;
  }

  public getMetadata(): JobSourceMetadata {
    return this.metadata;
  }

  public getPolicyStatus(): SourcePolicyStatus {
    return this.metadata.policyStatus;
  }

  public isAllowed(): boolean {
    return this.metadata.policyStatus === 'ALLOWED' && this.metadata.enabled;
  }

  /**
   * Safe fetch with SSRF boundary check, timeouts, and bounded retries
   */
  protected async safeFetch(
    url: string,
    allowedHosts: string[],
    options?: RequestInit,
    timeoutMs = 15000
  ): Promise<Response> {
    const parsedUrl = new URL(url);

    // SSRF Defense: strictly check hostname against allowedHosts allowlist
    const isAllowedHost = allowedHosts.some(
      (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
    );

    if (!isAllowedHost) {
      logger.error('Blocked attempted SSRF fetch to unapproved host', {
        hostname: parsedUrl.hostname,
        url,
      });
      throw new SourceAdapterError(
        `Destination host '${parsedUrl.hostname}' is not in the allowed host list.`,
        'SSRF_BLOCKED',
        403
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let attempt = 0;
    const maxRetries = 2;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': 'CareerAgent-JobIngestion/1.0',
            ...(options?.headers || {}),
          },
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          if (attempt <= maxRetries) {
            const retryAfterSec = parseInt(response.headers.get('Retry-After') || '1', 10);
            await new Promise((r) => setTimeout(r, Math.min(retryAfterSec * 1000, 3000)));
            continue;
          }
          throw new SourceAdapterError('Source rate limit exceeded (429)', 'SOURCE_RATE_LIMITED', 429);
        }

        if (response.status === 401 || response.status === 403) {
          throw new SourceAdapterError(
            `Source authentication failed with status ${response.status}`,
            'SOURCE_AUTH_FAILED',
            403
          );
        }

        if (!response.ok) {
          throw new SourceAdapterError(
            `Source responded with HTTP status ${response.status}`,
            'SOURCE_BAD_RESPONSE',
            502
          );
        }

        return response;
      } catch (err: any) {
        if (err instanceof SourceAdapterError) throw err;
        if (err.name === 'AbortError') {
          throw new SourceAdapterError('Source request timed out', 'SOURCE_TIMEOUT', 504);
        }
        if (attempt > maxRetries) {
          throw new SourceAdapterError(`Network failure contacting source: ${err.message}`, 'SOURCE_UNAVAILABLE', 503);
        }
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }

    clearTimeout(timeout);
    throw new SourceAdapterError('Failed to fetch from source', 'SOURCE_UNAVAILABLE', 503);
  }

  /**
   * Fetches batch of jobs from external source
   */
  public abstract fetchJobs(params: FetchJobsParams): Promise<FetchJobsResult>;

  /**
   * Normalizes source-specific record into standard RawExternalJob
   */
  public abstract transformRawRecord(record: any, companyIdentifier: string): RawExternalJob;
}
