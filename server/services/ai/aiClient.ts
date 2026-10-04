/**
 * Centralized Gemini Client
 * Module 02 AI Service Foundation
 * 
 * Exclusively responsible for communicating with @google/genai SDK.
 * Handles server-side GEMINI_API_KEY, timeouts, bounded retries, and error normalization.
 * The rest of the application MUST NEVER call GoogleGenAI directly.
 */

import { GoogleGenAI } from '@google/genai';
import { getAiConfig } from './aiConfig.js';
import { AiModelConfig, AiUsage } from './aiTypes.js';
import {
  AiNotConfiguredError,
  AiProviderError,
  AiTimeoutError,
  AiRateLimitedError,
} from './aiErrors.js';
import { logger } from '../../core/logging/logger.js';

export interface GenerateTextResult {
  text: string;
  usage?: AiUsage;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
}

export class AiClient {
  private genAiClient: GoogleGenAI | null = null;
  private customProviderDouble?: (prompt: string, config: AiModelConfig) => Promise<GenerateTextResult>;

  /**
   * For testing purposes ONLY: allows unit test suites to inject a deterministic double
   * without fabricating live responses in production code.
   */
  public setTestProviderDouble(double?: (prompt: string, config: AiModelConfig) => Promise<GenerateTextResult>): void {
    this.customProviderDouble = double;
  }

  private getGenAiInstance(requestId?: string): GoogleGenAI {
    if (this.genAiClient) {
      return this.genAiClient;
    }

    const config = getAiConfig();
    if (!config.isConfigured) {
      throw new AiNotConfiguredError('AI service is not configured.', requestId);
    }

    this.genAiClient = new GoogleGenAI({ apiKey: config.apiKey });
    return this.genAiClient;
  }

  /**
   * Core invocation method for Gemini. Implements timeouts and bounded exponential retries.
   */
  public async generateContent(
    prompt: string,
    modelConfig: AiModelConfig,
    requestId?: string
  ): Promise<GenerateTextResult> {
    const startTime = Date.now();

    // 1. Check if a test provider double was supplied (for automated test environments)
    if (this.customProviderDouble) {
      const res = await this.customProviderDouble(prompt, modelConfig);
      return {
        ...res,
        usage: {
          model: modelConfig.modelName,
          durationMs: Date.now() - startTime,
        },
      };
    }

    // 2. Ensure Google GenAI client is configured
    const client = this.getGenAiInstance(requestId);
    const config = getAiConfig();

    let attempt = 0;
    const maxRetries = config.maxRetries;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new AiTimeoutError(`AI request timed out after ${config.timeoutMs}ms`, requestId));
          }, config.timeoutMs);
        });

        const executionPromise = (async (): Promise<GenerateTextResult> => {
          const modelToUse = (modelConfig.modelName && !modelConfig.modelName.includes('2.5')) 
            ? modelConfig.modelName 
            : config.defaultModel;

          const response = await client.models.generateContent({
            model: modelToUse,
            contents: prompt,
            config: {
              systemInstruction: modelConfig.systemInstruction,
              maxOutputTokens: modelConfig.maxOutputTokens || config.maxOutputTokens,
              temperature: modelConfig.temperature ?? 0.2,
              responseMimeType: modelConfig.responseMimeType,
              responseSchema: modelConfig.responseSchema,
            },
          });

          const durationMs = Date.now() - startTime;
          const text = response.text || '';

          // Extract usage metadata if present
          const usageMeta = response.usageMetadata;
          const usage: AiUsage = {
            model: modelConfig.modelName || config.defaultModel,
            inputTokenCount: usageMeta?.promptTokenCount,
            outputTokenCount: usageMeta?.candidatesTokenCount,
            totalTokenCount: usageMeta?.totalTokenCount,
            durationMs,
          };

          // Extract function/tool calls if proposed by the model
          const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          for (const part of parts) {
            if (part.functionCall && part.functionCall.name) {
              toolCalls.push({
                name: part.functionCall.name,
                arguments: (part.functionCall.args as Record<string, unknown>) || {},
              });
            }
          }

          return { text, usage, toolCalls };
        })();

        return await Promise.race([executionPromise, timeoutPromise]);
      } catch (err: any) {
        // If it's already an AppError, rethrow immediately
        if (err instanceof AiNotConfiguredError || err instanceof AiTimeoutError) {
          throw err;
        }

        const isRateLimit = err?.status === 429 || String(err?.message).includes('429') || String(err?.message).includes('RESOURCE_EXHAUSTED');
        if (isRateLimit) {
          if (attempt <= maxRetries) {
            const delay = Math.pow(2, attempt) * 500;
            logger.warn('AI Rate limited, retrying transient failure', { attempt, delay, requestId });
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw new AiRateLimitedError('AI provider rate limit reached.', requestId);
        }

        const isTransient = err?.status === 503 || err?.status === 500;
        if (isTransient && attempt <= maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          logger.warn('AI Transient failure, retrying', { attempt, delay, requestId });
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        logger.error('Gemini API call failed', { requestId, error: err?.message });
        throw new AiProviderError('AI provider encountered an error processing request.', requestId, {
          reason: err?.message,
        });
      }
    }

    throw new AiProviderError('Exceeded maximum retry attempts for AI provider.', requestId);
  }
}

export const aiClient = new AiClient();
