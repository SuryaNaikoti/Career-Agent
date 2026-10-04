/**
 * Core AI Domain Types & Contracts
 * Module 02 AI Service Foundation
 * 
 * Defines strict TypeScript interfaces for requests, responses, tasks, tools,
 * truth layers, usage metadata, and audit events.
 */

import { FactProvenance, WorkMode } from '../../../src/types/candidate.js';

export type AiProvider = 'gemini';

export type AiTaskType =
  | 'GENERAL_CAREER_ASSISTANCE'
  | 'CANDIDATE_PROFILE_ANALYSIS'
  | 'CANDIDATE_PROFILE_QUESTION'
  | 'RESUME_ANALYSIS'
  | 'JOB_ANALYSIS'
  | 'JOB_MATCHING'
  | 'APPLICATION_PREPARATION'
  | 'CAREER_RECOMMENDATION';

export const VALID_AI_TASK_TYPES: ReadonlySet<AiTaskType> = new Set([
  'GENERAL_CAREER_ASSISTANCE',
  'CANDIDATE_PROFILE_ANALYSIS',
  'CANDIDATE_PROFILE_QUESTION',
  'RESUME_ANALYSIS',
  'JOB_ANALYSIS',
  'JOB_MATCHING',
  'APPLICATION_PREPARATION',
  'CAREER_RECOMMENDATION',
]);

export interface AiModelConfig {
  modelName: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  responseMimeType?: 'text/plain' | 'application/json';
  responseSchema?: unknown;
}

export interface AiCandidateFact {
  factName: string;
  factValue: unknown;
  provenance: FactProvenance;
}

export interface AiCandidateContext {
  profileId?: string;
  displayName: string;
  headline?: string | null;
  targetRoles: string[];
  totalExperienceYears: number;
  preferredLocations: string[];
  workModes: WorkMode[];
  expectedSalaryMin?: number | null;
  currency: string;
  confirmedSkills: Array<{ name: string; years?: number | null; level?: string | null }>;
  confirmedExperience: Array<{ company: string; roleTitle: string; startDate?: string | null; endDate?: string | null; isCurrent: boolean }>;
  confirmedEducation: Array<{ institution: string; degree: string }>;
  preferences: {
    targetRoles: string[];
    locations: string[];
    workModes: WorkMode[];
    minSalary?: number | null;
    companiesTargeted: string[];
    companiesExcluded: string[];
  };
  truthMetadata: {
    confirmedSkillNames: string[];
    unknownAttributes: string[];
  };
}

export interface AiContext {
  userId: string;
  taskType: AiTaskType;
  userMessage: string;
  candidateContext?: AiCandidateContext | null;
  allowedActions: string[];
  untrustedExternalContent?: string | null;
  requestId: string;
}

export interface AiToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiToolResult {
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AiUsage {
  model: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
  totalTokenCount?: number;
  durationMs: number;
}

export interface AiRequest {
  taskType: AiTaskType;
  message: string;
  untrustedExternalContent?: string;
}

export interface AiResponseData {
  message: string;
  taskType: AiTaskType;
  structuredOutput?: unknown;
  proposedToolCall?: AiToolCall;
}

export interface AiResponse {
  success: boolean;
  requestId: string;
  data: AiResponseData;
  usage?: AiUsage;
}

export interface AiAuditEvent {
  requestId: string;
  userId: string;
  taskType: AiTaskType;
  timestamp: string;
  model: string;
  toolProposed?: string;
  permissionDecision?: 'ALLOWED' | 'DENIED' | 'REQUIRES_CONFIRMATION';
  outcome: 'SUCCESS' | 'ERROR' | 'SAFETY_BLOCKED';
  durationMs: number;
  usage?: AiUsage;
  errorCode?: string;
}

export interface AiValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedText?: string;
  parsedStructuredData?: unknown;
}
