/**
 * Onboarding Domain Types & State Machine Contracts
 * Module 03 Interactive AI Onboarding
 */

import { FactProvenance, WorkMode } from './candidate.js';

export type OnboardingStage =
  | 'NOT_STARTED'
  | 'INTRO'
  | 'BASIC_INFORMATION'
  | 'CAREER_TARGET'
  | 'EXPERIENCE'
  | 'SKILLS'
  | 'EDUCATION'
  | 'WORK_PREFERENCES'
  | 'COMPENSATION'
  | 'CAREER_GOALS'
  | 'PROFILE_REVIEW'
  | 'CONFIRMATION'
  | 'COMPLETED';

export const ORDERED_ONBOARDING_STAGES: readonly OnboardingStage[] = [
  'INTRO',
  'BASIC_INFORMATION',
  'CAREER_TARGET',
  'EXPERIENCE',
  'SKILLS',
  'EDUCATION',
  'WORK_PREFERENCES',
  'COMPENSATION',
  'CAREER_GOALS',
  'PROFILE_REVIEW',
  'CONFIRMATION',
  'COMPLETED',
] as const;

export type FactCategory =
  | 'profile'
  | 'target_role'
  | 'experience'
  | 'skill'
  | 'education'
  | 'preference';

export interface ExtractedFact {
  id: string;
  category: FactCategory;
  field: string;
  value: unknown;
  displayLabel: string;
  displayValue: string;
  provenance: FactProvenance;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  sourceMessageId?: string;
}

export interface OnboardingMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  stage: OnboardingStage;
  timestamp: string;
  quickReplies?: string[];
  pendingFactIds?: string[];
}

export interface OnboardingSession {
  sessionId: string;
  userId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  currentStage: OnboardingStage;
  completedStages: OnboardingStage[];
  messages: OnboardingMessage[];
  pendingFacts: ExtractedFact[];
  confirmedFacts: ExtractedFact[];
  createdAt: string;
  updatedAt: string;
}

export interface StartOnboardingResponse {
  session: OnboardingSession;
  isResumed: boolean;
}

export interface SendMessageRequest {
  sessionId: string;
  message: string;
}

export interface SendMessageResponse {
  session: OnboardingSession;
  assistantMessage: OnboardingMessage;
  newPendingFacts: ExtractedFact[];
}

export interface ConfirmFactsRequest {
  sessionId: string;
  factIds: string[];
}

export interface ConfirmFactsResponse {
  session: OnboardingSession;
  persistedCount: number;
}

export interface CorrectFactRequest {
  sessionId: string;
  factId: string;
  correctedValue: unknown;
  displayValue?: string;
}

export interface CorrectFactResponse {
  session: OnboardingSession;
  updatedFact: ExtractedFact;
}

export interface CompleteOnboardingRequest {
  sessionId: string;
}

export interface CompleteOnboardingResponse {
  session: OnboardingSession;
  summary: {
    displayName: string;
    targetRoles: string[];
    skillsCount: number;
    experienceCount: number;
    educationCount: number;
    workModes: WorkMode[];
  };
}
