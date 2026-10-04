/**
 * AI Orchestrator Service
 * Module 02 AI Service Foundation
 * 
 * Orchestrates:
 * 1. AI Safety scanning
 * 2. Context retrieval via Candidate Data Services
 * 3. System prompt construction
 * 4. Gemini SDK invocation via AiClient
 * 5. Output safety & Truth Layer validation
 * 6. Tool proposal permission verification
 * 7. Structured audit event generation
 */

import { randomUUID } from 'crypto';
import { aiClient } from './aiClient.js';
import { getAiConfig } from './aiConfig.js';
import { aiSafetyService } from './aiSafety.js';
import { aiValidator } from './aiValidator.js';
import { toolRegistry } from './toolRegistry.js';
import { aiAuditService } from './aiAuditService.js';
import { buildAiContext } from './aiContextBuilder.js';
import {
  CORE_SYSTEM_PROMPT,
  buildTaskSystemPrompt,
  formatCandidateContextForPrompt,
} from './aiPrompts.js';
import {
  AiRequest,
  AiResponse,
  AiTaskType,
  VALID_AI_TASK_TYPES,
  AiModelConfig,
  AiToolCall,
} from './aiTypes.js';
import {
  ValidationError,
  AiSchemaValidationError,
} from './aiErrors.js';
import { logger } from '../../core/logging/logger.js';

export interface ExecuteAiRequestParams {
  userId: string;
  request: AiRequest;
  customRequestId?: string;
}

export class AiOrchestrator {
  public async processRequest(params: ExecuteAiRequestParams): Promise<AiResponse> {
    const { userId, request } = params;
    const requestId = params.customRequestId || randomUUID();
    const startTime = Date.now();

    // 1. Validate Task Type
    if (!request.taskType || !VALID_AI_TASK_TYPES.has(request.taskType as AiTaskType)) {
      throw new ValidationError(
        `Invalid taskType. Must be one of: ${Array.from(VALID_AI_TASK_TYPES).join(', ')}`,
        { requestId }
      );
    }

    // 2. Validate Message Content
    if (!request.message || typeof request.message !== 'string' || !request.message.trim()) {
      throw new ValidationError('Message cannot be empty', { requestId });
    }

    if (request.message.length > 8000) {
      throw new ValidationError('Message exceeds maximum allowed length of 8000 characters', { requestId });
    }

    // 3. AI Safety Check on User Input
    const sanitizedUserMessage = aiSafetyService.sanitizeAndValidateInput(request.message, requestId);

    // 4. Build Context via Candidate Domain Services (no direct DB access)
    const aiContext = await buildAiContext({
      userId,
      taskType: request.taskType,
      userMessage: sanitizedUserMessage,
      untrustedExternalContent: request.untrustedExternalContent,
      requestId,
    });

    // 5. Build System & User Prompts
    const taskPrompt = buildTaskSystemPrompt(request.taskType);
    const candidateContextPrompt = formatCandidateContextForPrompt(aiContext.candidateContext);
    const fullSystemInstruction = `${CORE_SYSTEM_PROMPT}\n\n${taskPrompt}\n\n${candidateContextPrompt}`;

    let combinedPrompt = sanitizedUserMessage;
    if (request.untrustedExternalContent) {
      const wrappedUntrusted = aiSafetyService.wrapUntrustedContent(
        request.untrustedExternalContent,
        'user_provided_document'
      );
      combinedPrompt = `${wrappedUntrusted}\n\nUSER QUERY:\n${sanitizedUserMessage}`;
    }

    // 6. Invoke Gemini Model via AiClient
    const config = getAiConfig();
    const modelConfig: AiModelConfig = {
      modelName: config.defaultModel,
      systemInstruction: fullSystemInstruction,
      temperature: 0.2,
      maxOutputTokens: config.maxOutputTokens,
    };

    let result;
    try {
      result = await aiClient.generateContent(combinedPrompt, modelConfig, requestId);
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      aiAuditService.logEvent({
        requestId,
        userId,
        taskType: request.taskType,
        timestamp: new Date().toISOString(),
        model: config.defaultModel,
        outcome: 'ERROR',
        durationMs,
        errorCode: err?.name || 'AiProviderError',
      });
      throw err;
    }

    const durationMs = Date.now() - startTime;
    const generatedText = result.text.trim();

    // 7. Validate Model Output Safety
    aiSafetyService.validateModelOutput(generatedText, requestId);

    // 8. Validate Model Output Truth Layer Consistency
    const truthValidation = aiValidator.validateTruthLayerConsistency(
      generatedText,
      aiContext.candidateContext,
      requestId
    );
    if (!truthValidation.isValid) {
      logger.warn('Truth Layer validation failure on generated output', { requestId, errors: truthValidation.errors });
      aiAuditService.logEvent({
        requestId,
        userId,
        taskType: request.taskType,
        timestamp: new Date().toISOString(),
        model: config.defaultModel,
        outcome: 'SAFETY_BLOCKED',
        durationMs,
        errorCode: 'TRUTH_LAYER_VIOLATION',
      });
      throw new AiSchemaValidationError(
        'Generated response contradicts authoritative candidate truth layer.',
        requestId,
        { details: truthValidation.errors }
      );
    }

    // 9. Inspect if model proposed a tool call
    let proposedToolCall: AiToolCall | undefined;
    let permissionDecision: 'ALLOWED' | 'DENIED' | 'REQUIRES_CONFIRMATION' | undefined;

    if (result.toolCalls && result.toolCalls.length > 0) {
      const firstCall = result.toolCalls[0];
      const tool = toolRegistry.getTool(firstCall.name);
      if (tool) {
        toolRegistry.validateToolArguments(tool, firstCall.arguments, requestId);
        const permCheck = toolRegistry.checkPermission({
          userId,
          action: firstCall.name,
          tool,
          taskType: request.taskType,
          arguments: firstCall.arguments,
        });

        permissionDecision = permCheck.allowed
          ? 'ALLOWED'
          : permCheck.requiresConfirmation
          ? 'REQUIRES_CONFIRMATION'
          : 'DENIED';

        proposedToolCall = {
          name: firstCall.name,
          arguments: firstCall.arguments,
        };
      }
    }

    // 10. Record Audit Event
    aiAuditService.logEvent({
      requestId,
      userId,
      taskType: request.taskType,
      timestamp: new Date().toISOString(),
      model: config.defaultModel,
      toolProposed: proposedToolCall?.name,
      permissionDecision,
      outcome: 'SUCCESS',
      durationMs,
      usage: result.usage,
    });

    return {
      success: true,
      requestId,
      data: {
        message: generatedText,
        taskType: request.taskType,
        proposedToolCall,
      },
      usage: result.usage,
    };
  }
}

export const aiOrchestrator = new AiOrchestrator();
