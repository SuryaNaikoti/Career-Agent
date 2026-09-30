/**
 * Conceptual Permission Architecture (Module 00 Foundation)
 * 
 * Enforces strict ethical and operational boundaries for Career Agent:
 * - AUTO: Autonomous actions that read public data or prepare drafts for candidate review.
 * - CONFIRM: Sensitive actions requiring explicit human confirmation before dispatch.
 * - DENY: Prohibited operations (fabricating credentials, scraping violations, bypassing CAPTCHAs).
 */

export type AgentPermissionLevel = 'AUTO' | 'CONFIRM' | 'DENY';

export type AgentActionType =
  // Autonomous safe operations
  | 'SEARCH_JOBS'
  | 'FILTER_JOBS'
  | 'SCORE_JOB_MATCH'
  | 'GENERATE_TAILORED_RESUME_DRAFT'
  | 'GENERATE_COVER_LETTER_DRAFT'
  | 'TRACK_APPLICATION_STATUS'
  
  // Human confirmation required
  | 'READ_GMAIL_COMMUNICATIONS'
  | 'SUBMIT_JOB_APPLICATION'
  | 'SEND_OUTBOUND_EMAIL'
  | 'ANSWER_SENSITIVE_APPLICATION_QUESTION'
  | 'UPDATE_CANDIDATE_PROFILE'
  
  // Strictly Denied
  | 'FABRICATE_CANDIDATE_EXPERIENCE'
  | 'INVENT_QUALIFICATIONS'
  | 'BYPASS_CAPTCHA'
  | 'BYPASS_ANTI_BOT_PROTECTION'
  | 'BYPASS_PLATFORM_ACCESS_CONTROLS'
  | 'UNAUTHORIZED_SCRAPING';

export interface PermissionPolicy {
  action: AgentActionType;
  level: AgentPermissionLevel;
  description: string;
  requiresCandidatePrompt: boolean;
}

export const PERMISSION_POLICIES: Record<AgentActionType, PermissionPolicy> = {
  // AUTO
  SEARCH_JOBS: {
    action: 'SEARCH_JOBS',
    level: 'AUTO',
    description: 'Search public job feeds and configured board APIs',
    requiresCandidatePrompt: false,
  },
  FILTER_JOBS: {
    action: 'FILTER_JOBS',
    level: 'AUTO',
    description: 'Filter opportunities matching candidate criteria and salary expectations',
    requiresCandidatePrompt: false,
  },
  SCORE_JOB_MATCH: {
    action: 'SCORE_JOB_MATCH',
    level: 'AUTO',
    description: 'Compute match percentage between candidate verified profile and job description',
    requiresCandidatePrompt: false,
  },
  GENERATE_TAILORED_RESUME_DRAFT: {
    action: 'GENERATE_TAILORED_RESUME_DRAFT',
    level: 'AUTO',
    description: 'Rephrase and tailor verified candidate experience for target role',
    requiresCandidatePrompt: false,
  },
  GENERATE_COVER_LETTER_DRAFT: {
    action: 'GENERATE_COVER_LETTER_DRAFT',
    level: 'AUTO',
    description: 'Synthesize tailored cover letter draft based exclusively on candidate facts',
    requiresCandidatePrompt: false,
  },
  TRACK_APPLICATION_STATUS: {
    action: 'TRACK_APPLICATION_STATUS',
    level: 'AUTO',
    description: 'Record and update lifecycle milestones of submitted applications',
    requiresCandidatePrompt: false,
  },

  // CONFIRM
  READ_GMAIL_COMMUNICATIONS: {
    action: 'READ_GMAIL_COMMUNICATIONS',
    level: 'CONFIRM',
    description: 'Scan recruiter emails for interview invitations, updates, and offer letters',
    requiresCandidatePrompt: true,
  },
  SUBMIT_JOB_APPLICATION: {
    action: 'SUBMIT_JOB_APPLICATION',
    level: 'CONFIRM',
    description: 'Dispatch completed job application to company portal or authorized API',
    requiresCandidatePrompt: true,
  },
  SEND_OUTBOUND_EMAIL: {
    action: 'SEND_OUTBOUND_EMAIL',
    level: 'CONFIRM',
    description: 'Send direct email response or inquiry to hiring manager or recruiter',
    requiresCandidatePrompt: true,
  },
  ANSWER_SENSITIVE_APPLICATION_QUESTION: {
    action: 'ANSWER_SENSITIVE_APPLICATION_QUESTION',
    level: 'CONFIRM',
    description: 'Answer legal eligibility, salary history, or work authorization questions',
    requiresCandidatePrompt: true,
  },
  UPDATE_CANDIDATE_PROFILE: {
    action: 'UPDATE_CANDIDATE_PROFILE',
    level: 'CONFIRM',
    description: 'Commit changes to primary candidate profile and core resume data',
    requiresCandidatePrompt: true,
  },

  // DENY
  FABRICATE_CANDIDATE_EXPERIENCE: {
    action: 'FABRICATE_CANDIDATE_EXPERIENCE',
    level: 'DENY',
    description: 'Prohibited: Never invent employment history or unverified claims',
    requiresCandidatePrompt: false,
  },
  INVENT_QUALIFICATIONS: {
    action: 'INVENT_QUALIFICATIONS',
    level: 'DENY',
    description: 'Prohibited: Never invent degrees, certifications, or unverified skills',
    requiresCandidatePrompt: false,
  },
  BYPASS_CAPTCHA: {
    action: 'BYPASS_CAPTCHA',
    level: 'DENY',
    description: 'Prohibited: Never attempt to automate bypass of security challenges',
    requiresCandidatePrompt: false,
  },
  BYPASS_ANTI_BOT_PROTECTION: {
    action: 'BYPASS_ANTI_BOT_PROTECTION',
    level: 'DENY',
    description: 'Prohibited: Respect platform terms and anti-bot boundaries',
    requiresCandidatePrompt: false,
  },
  BYPASS_PLATFORM_ACCESS_CONTROLS: {
    action: 'BYPASS_PLATFORM_ACCESS_CONTROLS',
    level: 'DENY',
    description: 'Prohibited: Never access unauthorized services or private endpoints',
    requiresCandidatePrompt: false,
  },
  UNAUTHORIZED_SCRAPING: {
    action: 'UNAUTHORIZED_SCRAPING',
    level: 'DENY',
    description: 'Prohibited: Do not scrape websites in violation of robots.txt or terms of service',
    requiresCandidatePrompt: false,
  },
};

export function checkActionPermission(action: AgentActionType): {
  allowed: boolean;
  level: AgentPermissionLevel;
  requiresConfirmation: boolean;
  policy: PermissionPolicy;
} {
  const policy = PERMISSION_POLICIES[action];
  return {
    allowed: policy.level !== 'DENY',
    level: policy.level,
    requiresConfirmation: policy.level === 'CONFIRM',
    policy,
  };
}
