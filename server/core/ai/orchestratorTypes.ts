/**
 * AI Orchestration Layer Types (Module 00 Architectural Specification)
 * 
 * Future pipeline:
 * User Request -> Chat UI -> AI Orchestrator -> Tool Registry -> Permission Engine -> Services/DB -> Structured UI Payload
 */

import { AgentPermissionLevel } from '../permissions/permissionEngine.js';

export interface ToolDefinition<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  permissionLevel: AgentPermissionLevel;
  parametersSchema: Record<string, unknown>;
  execute?: (params: TParams, context: ToolExecutionContext) => Promise<TResult>;
}

export interface ToolExecutionContext {
  userId: string;
  candidateId: string;
  confirmedByCandidate?: boolean;
}

export interface StructuredAgentMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  timestamp: string;
  content: string;
  // Rich payload types for structured UI rendering
  type?: 'text' | 'understanding' | 'searching' | 'job_results' | 'job_detail' | 'application_prep' | 'application_preview' | 'needs_input' | 'submitted_success';
  metadata?: Record<string, unknown>;
}

/**
 * Planned Tool Signatures (To be implemented module-by-module)
 */
export interface JobSearchCriteria {
  keywords?: string[];
  roleTitle?: string;
  location?: string;
  isRemote?: boolean;
  minSalary?: number;
  currency?: string;
  skills?: string[];
}

export interface CareerAgentToolRegistry {
  search_jobs: ToolDefinition<JobSearchCriteria, unknown>;
  get_job: ToolDefinition<{ jobId: string }, unknown>;
  score_job: ToolDefinition<{ jobId: string; candidateProfileId: string }, unknown>;
  generate_resume: ToolDefinition<{ jobId: string; baseResumeId: string }, unknown>;
  generate_cover_letter: ToolDefinition<{ jobId: string; companyName: string }, unknown>;
  prepare_application: ToolDefinition<{ jobId: string }, unknown>;
  submit_application: ToolDefinition<{ applicationId: string; candidateConfirmed: boolean }, unknown>;
  track_application: ToolDefinition<{ applicationId: string; status: string }, unknown>;
  read_gmail: ToolDefinition<{ sinceDate?: string; queryFilter?: string }, unknown>;
  classify_email: ToolDefinition<{ emailId: string; subject: string; body: string }, unknown>;
  create_action: ToolDefinition<{ title: string; type: string; priority: string }, unknown>;
  generate_daily_report: ToolDefinition<{ date: string }, unknown>;
}
