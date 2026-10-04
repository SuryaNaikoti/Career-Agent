/**
 * AI Service Error Classes
 * Module 02 AI Service Foundation
 * 
 * Re-exports error types from appError and provides AI-specific error normalizers.
 */

export {
  ValidationError,
  AiNotConfiguredError,
  AiProviderError,
  AiTimeoutError,
  AiRateLimitedError,
  AiSafetyBlockedError,
  AiSchemaValidationError,
  AiToolNotAllowedError,
  AiToolNotFoundError,
  AiToolArgumentsInvalidError,
  AiPermissionRequiredError,
} from '../../core/errors/appError.js';
