/**
 * Onboarding Session Repository & Manager
 * Module 03 Interactive AI Onboarding
 * 
 * Manages resumable workflow sessions in memory, backed by candidate_profiles.metadata
 * in Supabase via candidateProfileService. Avoids modifying database schema while ensuring
 * sessions survive across requests and restarts.
 */

import { randomUUID } from 'crypto';
import {
  OnboardingSession,
  OnboardingStage,
  ExtractedFact,
  OnboardingMessage,
  ORDERED_ONBOARDING_STAGES,
} from '../../../src/types/onboarding.types.js';
import { candidateProfileService } from '../candidate/candidateProfileService.js';
import { logger } from '../../core/logging/logger.js';
import { getStageInitialPrompt } from '../ai/onboardingPrompts.js';

// In-memory cache of active onboarding sessions for instant latency
const activeSessions = new Map<string, OnboardingSession>();

export class OnboardingSessionManager {
  /**
   * Clears in-memory sessions (useful for test suites)
   */
  public clearCache(): void {
    activeSessions.clear();
  }

  /**
   * Retrieves an existing session for a user or loads it from candidate profile metadata.
   */
  public async getSessionForUser(userId: string): Promise<OnboardingSession | null> {
    // 1. Check in-memory active sessions
    for (const session of activeSessions.values()) {
      if (session.userId === userId) {
        return session;
      }
    }

    // 2. Check profile metadata in database via candidateProfileService
    try {
      const profile = await candidateProfileService.getProfile(userId);
      if (profile && profile.metadata && (profile.metadata as any).onboardingSession) {
        const persisted = (profile.metadata as any).onboardingSession as OnboardingSession;
        activeSessions.set(persisted.sessionId, persisted);
        return persisted;
      }
    } catch (err: any) {
      logger.info('Could not retrieve persisted onboarding session from database metadata', { userId, error: err?.message });
    }

    return null;
  }

  /**
   * Retrieves session by its unique sessionId, verifying user ownership.
   */
  public async getSessionById(sessionId: string, userId: string): Promise<OnboardingSession | null> {
    const session = activeSessions.get(sessionId);
    if (session) {
      if (session.userId !== userId) {
        return null; // Ownership mismatch
      }
      return session;
    }

    // Check user profile metadata fallback
    const userSession = await this.getSessionForUser(userId);
    if (userSession && userSession.sessionId === sessionId) {
      return userSession;
    }

    return null;
  }

  /**
   * Creates a new onboarding session for the candidate.
   */
  public async createSession(userId: string, candidateDisplayName?: string): Promise<OnboardingSession> {
    const sessionId = randomUUID();
    const initialPrompt = getStageInitialPrompt('INTRO', candidateDisplayName);

    const initialMessage: OnboardingMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: initialPrompt.message,
      stage: 'INTRO',
      timestamp: new Date().toISOString(),
      quickReplies: initialPrompt.quickReplies,
    };

    const session: OnboardingSession = {
      sessionId,
      userId,
      status: 'IN_PROGRESS',
      currentStage: 'INTRO',
      completedStages: [],
      messages: [initialMessage],
      pendingFacts: [],
      confirmedFacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    activeSessions.set(sessionId, session);
    await this.persistSessionState(session);

    return session;
  }

  /**
   * Persists the session state to candidate_profiles.metadata
   */
  public async persistSessionState(session: OnboardingSession): Promise<void> {
    activeSessions.set(session.sessionId, session);

    try {
      const existingProfile = await candidateProfileService.getProfile(session.userId);
      const currentMeta = existingProfile?.metadata || {};

      await candidateProfileService.upsertProfile(session.userId, {
        metadata: {
          ...currentMeta,
          onboardingSession: session,
          onboardingCompleted: session.status === 'COMPLETED',
        },
      });
    } catch (err: any) {
      // In unconfigured database test environments, log safe info
      logger.info('Onboarding session state saved in-memory (DB unconfigured)', {
        sessionId: session.sessionId,
        error: err?.message,
      });
    }
  }

  /**
   * Computes the next stage in the linear onboarding state machine.
   */
  public getNextStage(current: OnboardingStage): OnboardingStage {
    const currentIndex = ORDERED_ONBOARDING_STAGES.indexOf(current);
    if (currentIndex >= 0 && currentIndex < ORDERED_ONBOARDING_STAGES.length - 1) {
      return ORDERED_ONBOARDING_STAGES[currentIndex + 1];
    }
    return 'COMPLETED';
  }
}

export const onboardingSessionManager = new OnboardingSessionManager();
