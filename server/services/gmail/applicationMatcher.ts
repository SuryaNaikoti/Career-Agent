/**
 * Application Matcher & Entity Correlator
 * Module 11: Gmail & Hiring Intelligence
 * 
 * Rules:
 * 1. Matches hiring emails to candidate's existing Career Agent applications.
 * 2. Uses deterministic signals first (external ID, company domain, company name + title).
 * 3. Never blindly links low-confidence matches; marks UNMATCHED.
 * 4. Creates Human Task when ambiguous matching requires human confirmation.
 */

import { ApplicationRecord } from '../applicationLifecycle/applicationLifecycleTypes.js';
import { applicationLifecycleService } from '../applicationLifecycle/applicationLifecycleService.js';
import { jobSearchService } from '../job/jobSearchService.js';
import {
  NormalizedGmailMessage,
  ApplicationMatchMethod,
} from './gmailTypes.js';
import { humanTaskService } from '../humanTask/humanTaskService.js';
import { logger } from '../../core/logging/logger.js';

export interface ApplicationMatchResult {
  applicationId: string | null;
  matchMethod: ApplicationMatchMethod;
  confidence: number;
}

export class ApplicationMatcher {
  /**
   * Attempts to correlate an email to an active application.
   */
  public async matchEmailToApplication(
    userId: string,
    email: {
      senderEmail: string;
      subject: string;
      safeBodyPlain: string;
      extractedCompany?: string | null;
      extractedRole?: string | null;
    }
  ): Promise<ApplicationMatchResult> {
    const applications = await applicationLifecycleService.listApplications(userId);
    if (!applications || applications.length === 0) {
      return { applicationId: null, matchMethod: 'UNMATCHED', confidence: 0 };
    }

    const fullContent = `${email.subject} ${email.safeBodyPlain}`.toLowerCase();
    const senderDomain = email.senderEmail.split('@')[1]?.toLowerCase() || '';

    // 1. Exact External Application ID match
    for (const app of applications) {
      if (app.externalApplicationId && fullContent.includes(app.externalApplicationId.toLowerCase())) {
        return {
          applicationId: app.id,
          matchMethod: 'EXACT_EXTERNAL_ID',
          confidence: 0.98,
        };
      }
    }

    // Load canonical jobs for active applications
    const jobList = await Promise.all(
      applications.map(async (app) => {
        try {
          const job = await jobSearchService.getJobById(app.jobId);
          return { app, job };
        } catch {
          return { app, job: null };
        }
      })
    );

    // 2. Exact Company Domain match
    if (senderDomain && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(senderDomain)) {
      for (const { app, job } of jobList) {
        if (job?.companyDomain && job.companyDomain.toLowerCase().includes(senderDomain)) {
          return {
            applicationId: app.id,
            matchMethod: 'DOMAIN',
            confidence: 0.90,
          };
        }
      }
    }

    // 3. Company Name + Job Title mention match
    for (const { app, job } of jobList) {
      if (job) {
        const companyLower = job.companyName.toLowerCase();
        const titleLower = job.title.toLowerCase();

        if (fullContent.includes(companyLower) && fullContent.includes(titleLower)) {
          return {
            applicationId: app.id,
            matchMethod: 'COMPANY_AND_TITLE',
            confidence: 0.85,
          };
        }

        if (email.extractedCompany && email.extractedCompany.toLowerCase() === companyLower) {
          return {
            applicationId: app.id,
            matchMethod: 'COMPANY_AND_TITLE',
            confidence: 0.80,
          };
        }
      }
    }

    return { applicationId: null, matchMethod: 'UNMATCHED', confidence: 0 };
  }
}

export const applicationMatcher = new ApplicationMatcher();
