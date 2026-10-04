/**
 * Interactive Onboarding Service
 * Module 03 Interactive AI Onboarding
 * 
 * Orchestrates interview turns, AI extraction, fact confirmations, corrections,
 * and completion verification through Module 01 & 02 services.
 */

import { randomUUID } from 'crypto';
import {
  OnboardingSession,
  OnboardingMessage,
  ExtractedFact,
  SendMessageResponse,
  ConfirmFactsResponse,
  CorrectFactResponse,
  CompleteOnboardingResponse,
} from '../../../src/types/onboarding.types.js';
import { onboardingSessionManager } from './onboardingSessionManager.js';
import { persistConfirmedFacts } from './candidateFactPersister.js';
import { aiOrchestrator } from '../ai/aiOrchestrator.js';
import { aiSafetyService } from '../ai/aiSafety.js';
import { aiClient } from '../ai/aiClient.js';
import {
  OnboardingNotFoundError,
  OnboardingAlreadyCompletedError,
  OnboardingFactInvalidError,
  ValidationError,
} from '../../core/errors/appError.js';
import {
  ONBOARDING_SYSTEM_PROMPT,
  OnboardingExtractionJsonSchema,
  AiInterviewExtractionResult,
} from '../ai/onboardingPrompts.js';
import { logger } from '../../core/logging/logger.js';

export class OnboardingService {
  /**
   * Initializes or resumes a candidate onboarding session.
   */
  public async startOnboarding(userId: string, displayName?: string): Promise<{ session: OnboardingSession; isResumed: boolean }> {
    const existing = await onboardingSessionManager.getSessionForUser(userId);
    if (existing) {
      if (existing.status === 'COMPLETED') {
        return { session: existing, isResumed: true };
      }
      return { session: existing, isResumed: true };
    }

    const newSession = await onboardingSessionManager.createSession(userId, displayName);
    return { session: newSession, isResumed: false };
  }

  /**
   * Retrieves current onboarding session state for the authenticated user.
   */
  public async getSessionState(userId: string): Promise<OnboardingSession> {
    const session = await onboardingSessionManager.getSessionForUser(userId);
    if (!session) {
      throw new OnboardingNotFoundError('No active onboarding session found for user');
    }
    return session;
  }

  /**
   * Processes a candidate message during onboarding:
   * 1. Safety validation
   * 2. Appends user message
   * 3. AI extraction of candidate facts
   * 4. Appends assistant response
   * 5. Persists session state
   */
  public async processMessage(
    userId: string,
    sessionId: string,
    userMessage: string
  ): Promise<SendMessageResponse> {
    const session = await onboardingSessionManager.getSessionById(sessionId, userId);
    if (!session) {
      throw new OnboardingNotFoundError('Onboarding session not found or unauthorized');
    }

    if (session.status === 'COMPLETED') {
      throw new OnboardingAlreadyCompletedError();
    }

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      throw new ValidationError('Message cannot be empty');
    }

    if (userMessage.length > 3000) {
      throw new ValidationError('Message exceeds maximum allowed length of 3000 characters');
    }

    // 1. AI Safety check on user message
    const sanitizedInput = aiSafetyService.sanitizeAndValidateInput(userMessage);

    // 2. Perform AI extraction and next question generation BEFORE mutating session
    // If Gemini is not configured or errors, this throws and session state remains completely unchanged.
    const extractionResult = await this.extractFactsAndGenerateReply(
      sanitizedInput,
      session
    );

    const userMsgId = randomUUID();
    const candidateMessageObj: OnboardingMessage = {
      id: userMsgId,
      role: 'user',
      content: sanitizedInput,
      stage: session.currentStage,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(candidateMessageObj);

    // 3. Map extracted facts into pending facts
    const newPendingFacts: ExtractedFact[] = extractionResult.extractedFacts.map((f) => ({
      id: randomUUID(),
      category: f.category,
      field: f.field,
      value: f.value,
      displayLabel: f.displayLabel,
      displayValue: f.displayValue,
      provenance: 'CANDIDATE_PROVIDED',
      status: 'PENDING',
      sourceMessageId: userMsgId,
    }));

    session.pendingFacts.push(...newPendingFacts);

    // 4. Create assistant response message
    const assistantMsgId = randomUUID();
    const assistantMessage: OnboardingMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: extractionResult.replyMessage,
      stage: session.currentStage,
      timestamp: new Date().toISOString(),
      quickReplies: extractionResult.suggestedQuickReplies,
      pendingFactIds: newPendingFacts.map((f) => f.id),
    };
    session.messages.push(assistantMessage);

    // 5. Advance stage if suggested or appropriate
    if (extractionResult.nextStage && extractionResult.nextStage !== session.currentStage) {
      if (!session.completedStages.includes(session.currentStage)) {
        session.completedStages.push(session.currentStage);
      }
      session.currentStage = extractionResult.nextStage;
    } else if (newPendingFacts.length > 0) {
      // Advance to next linear stage upon capturing facts
      if (!session.completedStages.includes(session.currentStage)) {
        session.completedStages.push(session.currentStage);
      }
      session.currentStage = onboardingSessionManager.getNextStage(session.currentStage);
    }

    session.updatedAt = new Date().toISOString();
    await onboardingSessionManager.persistSessionState(session);

    return {
      session,
      assistantMessage,
      newPendingFacts,
    };
  }

  /**
   * Confirms candidate pending facts and writes them through Module 01 Candidate Data Services.
   */
  public async confirmFacts(
    userId: string,
    sessionId: string,
    factIds: string[]
  ): Promise<ConfirmFactsResponse> {
    const session = await onboardingSessionManager.getSessionById(sessionId, userId);
    if (!session) {
      throw new OnboardingNotFoundError('Onboarding session not found or unauthorized');
    }

    const factsToConfirm: ExtractedFact[] = [];
    const remainingPending: ExtractedFact[] = [];

    for (const fact of session.pendingFacts) {
      if (factIds.includes(fact.id)) {
        fact.status = 'CONFIRMED';
        fact.provenance = 'CANDIDATE_CONFIRMED';
        factsToConfirm.push(fact);
        session.confirmedFacts.push(fact);
      } else {
        remainingPending.push(fact);
      }
    }

    session.pendingFacts = remainingPending;

    // Write through Module 01 Candidate Data Services
    const persistedCount = await persistConfirmedFacts(userId, factsToConfirm);

    session.updatedAt = new Date().toISOString();
    await onboardingSessionManager.persistSessionState(session);

    return {
      session,
      persistedCount,
    };
  }

  /**
   * Corrects a pending fact before confirmation.
   */
  public async correctFact(
    userId: string,
    sessionId: string,
    factId: string,
    correctedValue: unknown,
    displayValue?: string
  ): Promise<CorrectFactResponse> {
    const session = await onboardingSessionManager.getSessionById(sessionId, userId);
    if (!session) {
      throw new OnboardingNotFoundError('Onboarding session not found or unauthorized');
    }

    const targetFact = session.pendingFacts.find((f) => f.id === factId);
    if (!targetFact) {
      throw new OnboardingFactInvalidError(`Fact "${factId}" not found in pending facts`);
    }

    targetFact.value = correctedValue;
    targetFact.displayValue = displayValue || String(correctedValue);
    targetFact.provenance = 'CANDIDATE_PROVIDED';

    session.updatedAt = new Date().toISOString();
    await onboardingSessionManager.persistSessionState(session);

    return {
      session,
      updatedFact: targetFact,
    };
  }

  /**
   * Completes onboarding, persists all confirmed data, and sets status to COMPLETED.
   */
  public async completeOnboarding(
    userId: string,
    sessionId: string
  ): Promise<CompleteOnboardingResponse> {
    const session = await onboardingSessionManager.getSessionById(sessionId, userId);
    if (!session) {
      throw new OnboardingNotFoundError('Onboarding session not found or unauthorized');
    }

    // Auto-confirm any remaining pending facts on final completion
    if (session.pendingFacts.length > 0) {
      const remainingIds = session.pendingFacts.map((f) => f.id);
      await this.confirmFacts(userId, sessionId, remainingIds);
    }

    session.status = 'COMPLETED';
    session.currentStage = 'COMPLETED';
    if (!session.completedStages.includes('COMPLETED')) {
      session.completedStages.push('COMPLETED');
    }
    session.updatedAt = new Date().toISOString();

    await onboardingSessionManager.persistSessionState(session);

    // Prepare summary from confirmed facts
    const roles = session.confirmedFacts
      .filter((f) => f.category === 'target_role')
      .map((f) => f.displayValue);

    const skills = session.confirmedFacts.filter((f) => f.category === 'skill');
    const experiences = session.confirmedFacts.filter((f) => f.category === 'experience');
    const educations = session.confirmedFacts.filter((f) => f.category === 'education');
    const workModesFact = session.confirmedFacts.find((f) => f.category === 'preference' && f.field === 'workModes');

    return {
      session,
      summary: {
        displayName: 'Candidate',
        targetRoles: roles,
        skillsCount: skills.length,
        experienceCount: experiences.length,
        educationCount: educations.length,
        workModes: (workModesFact?.value as any) || ['Remote'],
      },
    };
  }

  /**
   * Invokes Gemini to extract structured facts and generate assistant reply.
   * If Gemini is unavailable, propagates AiNotConfiguredError (503) or provider error.
   * NO in-memory or heuristic fallback is permitted.
   */
  private async extractFactsAndGenerateReply(
    userMessage: string,
    session: OnboardingSession
  ): Promise<AiInterviewExtractionResult> {
    const prompt = `
Current Onboarding Stage: ${session.currentStage}
Candidate Response: "${userMessage}"

Extract any factual information the candidate provided into structured facts.
Respond with JSON matching the extraction schema.
`.trim();

    const aiResponse = await aiClient.generateContent(prompt, {
      modelName: 'gemini-2.5-flash',
      systemInstruction: ONBOARDING_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: OnboardingExtractionJsonSchema,
    });

    if (!aiResponse.text) {
      throw new Error('AI provider returned empty response during extraction');
    }

    const parsed = JSON.parse(aiResponse.text) as AiInterviewExtractionResult;
    if (!parsed.replyMessage || !Array.isArray(parsed.extractedFacts)) {
      throw new Error('AI extraction result did not match expected structured schema');
    }

    return parsed;
  }
}

export const onboardingService = new OnboardingService();
