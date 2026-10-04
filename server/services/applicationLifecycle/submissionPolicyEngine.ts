/**
 * Submission Policy & Strategy Engine
 * Module 09: Application Lifecycle
 * 
 * Rules:
 * 1. Derives submission strategy strictly server-side from Module 05 JobSourceRegistry.
 * 2. Client CANNOT override strategy (e.g. sending autoSubmit: true is rejected/ignored).
 * 3. ALLOWED sources with configured authorized adapters -> AUTHORIZED_AUTOMATIC.
 * 4. RESTRICTED sources (e.g. LinkedIn, Indeed) -> HUMAN_REQUIRED.
 * 5. UNKNOWN sources -> fail closed (RESTRICTED or DISABLED).
 * 6. DISABLED sources -> DISABLED.
 * 7. Candidate permissions checked: CONFIRM / DENY strictly respected.
 */

import { jobSourceRegistry } from '../job/jobSourceRegistry.js';
import { CanonicalJob, SourcePolicyStatus } from '../job/jobTypes.js';
import { SubmissionStrategy } from './applicationLifecycleTypes.js';
import { checkActionPermission } from '../../core/permissions/permissionEngine.js';
import { AppError, ForbiddenError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export interface StrategyResolutionResult {
  strategy: SubmissionStrategy;
  sourceId: string;
  policyStatus: SourcePolicyStatus;
  reason: string;
  isAutomatable: boolean;
  requiresHumanAction: boolean;
}

export class SubmissionPolicyEngine {
  /**
   * Resolves the server-controlled submission strategy for a canonical job.
   */
  public resolveSubmissionStrategy(job: CanonicalJob, candidateConfirmed?: boolean): StrategyResolutionResult {
    const sourceId = job.sourceId ? job.sourceId.toLowerCase() : 'unknown';
    const registered = jobSourceRegistry.getSource(sourceId);

    // 1. Unknown Source -> Fail Closed
    if (!registered) {
      return {
        strategy: 'RESTRICTED',
        sourceId,
        policyStatus: 'UNKNOWN',
        reason: `Source '${sourceId}' is not registered in system catalog. Automation strictly denied.`,
        isAutomatable: false,
        requiresHumanAction: true,
      };
    }

    const { policyStatus, enabled } = registered.metadata;

    // 2. Restricted Source (e.g. LinkedIn, Indeed, proprietary portal without API)
    // Automated submission is prohibited by platform terms/anti-bot controls, routing to HUMAN_REQUIRED
    if (policyStatus === 'RESTRICTED') {
      return {
        strategy: 'HUMAN_REQUIRED',
        sourceId,
        policyStatus: 'RESTRICTED',
        reason: `Platform terms or technical controls for '${registered.metadata.name}' require human application submission. Automated submission is prohibited.`,
        isAutomatable: false,
        requiresHumanAction: true,
      };
    }

    // 3. Disabled Source
    if (!enabled || policyStatus === 'DISABLED') {
      return {
        strategy: 'DISABLED',
        sourceId,
        policyStatus: 'DISABLED',
        reason: `Submissions to source '${sourceId}' are currently disabled.`,
        isAutomatable: false,
        requiresHumanAction: false,
      };
    }

    // 4. Requires Authorization (e.g. requires OAuth connection or candidate ATS account)
    if (policyStatus === 'REQUIRES_AUTHORIZATION') {
      return {
        strategy: 'ASSISTED_APPLICATION',
        sourceId,
        policyStatus: 'REQUIRES_AUTHORIZATION',
        reason: `Source '${registered.metadata.name}' requires candidate authorization or supported assisted workflow.`,
        isAutomatable: false,
        requiresHumanAction: true,
      };
    }

    // 5. Allowed Source (e.g. Lever, Greenhouse, or partner API)
    if (policyStatus === 'ALLOWED') {
      // Check permission policy for SUBMIT_JOB_APPLICATION
      const perm = checkActionPermission('SUBMIT_JOB_APPLICATION');
      if (!perm.allowed) {
        throw new ForbiddenError('Application submissions are globally prohibited by system security policy.');
      }

      // If action requires candidate confirmation and candidate has not explicitly confirmed:
      if (perm.requiresConfirmation && !candidateConfirmed) {
        return {
          strategy: 'ASSISTED_APPLICATION',
          sourceId,
          policyStatus: 'ALLOWED',
          reason: `Action requires explicit candidate review and submission dispatch confirmation.`,
          isAutomatable: false,
          requiresHumanAction: true,
        };
      }

      return {
        strategy: 'AUTHORIZED_AUTOMATIC',
        sourceId,
        policyStatus: 'ALLOWED',
        reason: `Source '${registered.metadata.name}' is verified for authorized direct submission.`,
        isAutomatable: true,
        requiresHumanAction: false,
      };
    }

    // Default: fail closed
    return {
      strategy: 'RESTRICTED',
      sourceId,
      policyStatus: 'UNKNOWN',
      reason: `Unhandled policy status '${policyStatus}'. Defaulting to safe restricted flow.`,
      isAutomatable: false,
      requiresHumanAction: true,
    };
  }
}

export const submissionPolicyEngine = new SubmissionPolicyEngine();
