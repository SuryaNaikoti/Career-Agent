/**
 * Supported ATS Direct Submission Adapter (Lever / Greenhouse Partner Interface)
 * Module 09: Application Lifecycle
 * 
 * Demonstrates a production-grade authorized direct API adapter.
 * Connects only via authorized HTTPS API endpoints.
 * Handles timeouts, network failure, CAPTCHA detection, and unconfigured states.
 */

import { SubmissionAdapter } from '../submissionAdapterRegistry.js';
import { CanonicalJob } from '../../job/jobTypes.js';
import { SubmissionPayload, SubmissionResult } from '../applicationLifecycleTypes.js';
import { logger } from '../../../core/logging/logger.js';

export class SupportedAtsSubmissionAdapter implements SubmissionAdapter {
  public readonly id = 'lever_direct_adapter';
  public readonly name = 'Lever Direct Application Gateway';
  public readonly supportedSourceId = 'lever';

  public canHandle(job: CanonicalJob): boolean {
    return job.sourceId?.toLowerCase() === 'lever' && !!job.externalJobId;
  }

  public validatePayload(payload: SubmissionPayload): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!payload.tailoredResume || !payload.tailoredResume.fullName) {
      errors.push('Candidate full name is required on tailored resume.');
    }
    if (!payload.job.externalJobId) {
      errors.push('External Job ID is missing from canonical job.');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  public async submit(payload: SubmissionPayload): Promise<SubmissionResult> {
    const validation = this.validatePayload(payload);
    if (!validation.valid) {
      return {
        status: 'SUBMISSION_FAILED',
        failureCode: 'INVALID_PAYLOAD',
        failureCategory: 'VALIDATION',
        errorMessage: `Payload failed validation: ${validation.errors?.join(', ')}`,
      };
    }

    // Check if live API key / posting endpoint credentials are configured
    const apiKey = process.env.LEVER_API_KEY;
    if (!apiKey) {
      logger.info('Supported ATS direct submission adapter invoked without LEVER_API_KEY configuration');
      return {
        status: 'SUBMISSION_FAILED',
        failureCode: 'SUBMISSION_NOT_CONFIGURED',
        failureCategory: 'CONFIGURATION',
        errorMessage: 'Direct submission provider credentials (LEVER_API_KEY) are not configured on server.',
      };
    }

    // Real API dispatch over HTTPS to authorized host
    try {
      const site = payload.job.companyDomain ? payload.job.companyDomain.split('.')[0] : 'leverdemo';
      const targetUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}/${encodeURIComponent(payload.job.externalJobId)}/apply`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
          'X-Correlation-ID': payload.correlationId,
        },
        body: JSON.stringify({
          name: payload.tailoredResume.fullName,
          comments: payload.tailoredCoverLetter.openingParagraph,
          urls: { portfolio: payload.tailoredResume.headline },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Check for security challenge / anti-bot interception
      if (response.status === 403 || response.status === 429) {
        const text = await response.text().catch(() => '');
        if (text.includes('captcha') || text.includes('challenge') || text.includes('cloudflare')) {
          return {
            status: 'CHALLENGE_REQUIRED',
            httpStatus: response.status,
            failureCode: 'CAPTCHA_CHALLENGE_DETECTED',
            failureCategory: 'SECURITY_CHALLENGE',
            errorMessage: 'Security verification or challenge detected. Autonomous bypass is strictly prohibited.',
          };
        }
      }

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          status: 'SUBMITTED',
          httpStatus: response.status,
          externalApplicationId: data.applicationId || data.id,
          confirmationUrl: data.confirmationUrl || payload.job.sourceUrl,
          submittedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'SUBMISSION_FAILED',
        httpStatus: response.status,
        failureCode: 'UPSTREAM_API_ERROR',
        failureCategory: 'PROVIDER_ERROR',
        errorMessage: `ATS responded with status ${response.status}`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          status: 'SUBMISSION_FAILED',
          failureCode: 'SUBMISSION_TIMEOUT',
          failureCategory: 'NETWORK',
          errorMessage: 'Request to ATS endpoint timed out after 15000ms',
        };
      }

      return {
        status: 'SUBMISSION_FAILED',
        failureCode: 'NETWORK_ERROR',
        failureCategory: 'NETWORK',
        errorMessage: err.message || 'Unknown network error during submission dispatch',
      };
    }
  }
}

export const supportedAtsSubmissionAdapter = new SupportedAtsSubmissionAdapter();
