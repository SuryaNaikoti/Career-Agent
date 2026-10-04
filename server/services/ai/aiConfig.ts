/**
 * Centralized AI Configuration
 * Module 02 AI Service Foundation
 * 
 * Server-side only. Reads GEMINI_API_KEY from environment.
 * NEVER exposes private keys or credentials to the client.
 */

export interface AiServiceConfig {
  provider: 'gemini';
  apiKey: string;
  defaultModel: string;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
  isConfigured: boolean;
}

export function getAiConfig(): AiServiceConfig {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const defaultModel = (process.env.AI_MODEL || 'gemini-2.5-flash').trim();
  const maxOutputTokens = process.env.AI_MAX_OUTPUT_TOKENS
    ? parseInt(process.env.AI_MAX_OUTPUT_TOKENS, 10)
    : 2048;
  const timeoutMs = process.env.AI_TIMEOUT_MS
    ? parseInt(process.env.AI_TIMEOUT_MS, 10)
    : 25000;
  const maxRetries = process.env.AI_MAX_RETRIES
    ? parseInt(process.env.AI_MAX_RETRIES, 10)
    : 2;

  const isConfigured = Boolean(
    apiKey &&
    apiKey.length > 5 &&
    apiKey !== 'your-gemini-api-key' &&
    apiKey !== 'placeholder'
  );

  return {
    provider: 'gemini',
    apiKey,
    defaultModel,
    maxOutputTokens: isNaN(maxOutputTokens) ? 2048 : maxOutputTokens,
    timeoutMs: isNaN(timeoutMs) ? 25000 : timeoutMs,
    maxRetries: isNaN(maxRetries) ? 2 : maxRetries,
    isConfigured,
  };
}
