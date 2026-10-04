/**
 * AI Audit Logger & Event Boundary
 * Module 02 AI Service Foundation
 * 
 * Records structured audit events for AI requests, tool proposals, and safety evaluations.
 * NEVER logs credentials, tokens, or raw sensitive candidate secrets.
 */

import { AiAuditEvent } from './aiTypes.js';
import { logger } from '../../core/logging/logger.js';

export class AiAuditService {
  private inMemoryEvents: AiAuditEvent[] = [];

  public logEvent(event: AiAuditEvent): void {
    // Keep bounded in-memory trail for test assertions and diagnostics
    this.inMemoryEvents.push(event);
    if (this.inMemoryEvents.length > 500) {
      this.inMemoryEvents.shift();
    }

    logger.info('AI Audit Event', {
      requestId: event.requestId,
      userId: event.userId,
      taskType: event.taskType,
      outcome: event.outcome,
      durationMs: event.durationMs,
      toolProposed: event.toolProposed,
      permissionDecision: event.permissionDecision,
      errorCode: event.errorCode,
    });
  }

  public getEventsForRequest(requestId: string): AiAuditEvent[] {
    return this.inMemoryEvents.filter((e) => e.requestId === requestId);
  }

  public clearEvents(): void {
    this.inMemoryEvents = [];
  }
}

export const aiAuditService = new AiAuditService();
