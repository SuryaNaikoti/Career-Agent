/**
 * Standardized Application Error Classes
 * Module 00 & Module 02 Architecture Baseline
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, isOperational = true, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized: Authentication required', details?: unknown) {
    super(message, 401, true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden: Access denied', details?: unknown) {
    super(message, 403, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 404, true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, true, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', details?: unknown) {
    super(message, 503, true, details);
  }
}

export class DatabaseNotConfiguredError extends ServiceUnavailableError {
  constructor(message = 'Candidate data service is not configured.', details?: unknown) {
    super(message, details);
    this.name = 'DATABASE_NOT_CONFIGURED';
  }
}

// ============================================================================
// AI SERVICE ERRORS (MODULE 02)
// ============================================================================

export class AiNotConfiguredError extends ServiceUnavailableError {
  public readonly requestId?: string;
  constructor(message = 'AI service is not configured.', requestId?: string) {
    super(message, { requestId });
    this.name = 'AI_NOT_CONFIGURED';
    this.requestId = requestId;
  }
}

export class AiProviderError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'AI provider encountered an error.', requestId?: string, details?: unknown) {
    super(message, 502, true, details ? { requestId, details } : { requestId });
    this.name = 'AI_PROVIDER_ERROR';
    this.requestId = requestId;
  }
}

export class AiTimeoutError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'AI request timed out.', requestId?: string) {
    super(message, 504, true, { requestId });
    this.name = 'AI_TIMEOUT';
    this.requestId = requestId;
  }
}

export class AiRateLimitedError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'AI service rate limit exceeded. Please retry shortly.', requestId?: string) {
    super(message, 429, true, { requestId });
    this.name = 'AI_RATE_LIMITED';
    this.requestId = requestId;
  }
}

export class AiSafetyBlockedError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'Request or response was blocked by AI safety policy.', requestId?: string, details?: unknown) {
    super(message, 400, true, details ? { requestId, details } : { requestId });
    this.name = 'AI_SAFETY_BLOCKED';
    this.requestId = requestId;
  }
}

export class AiSchemaValidationError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'AI generated response failed validation.', requestId?: string, details?: unknown) {
    super(message, 502, true, details ? { requestId, details } : { requestId });
    this.name = 'AI_SCHEMA_VALIDATION_FAILED';
    this.requestId = requestId;
  }
}

export class AiToolNotAllowedError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'Proposed tool is not permitted for this task.', requestId?: string, details?: unknown) {
    super(message, 403, true, details ? { requestId, details } : { requestId });
    this.name = 'AI_TOOL_NOT_ALLOWED';
    this.requestId = requestId;
  }
}

export class AiToolNotFoundError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'Proposed tool was not found in registry.', requestId?: string) {
    super(message, 404, true, { requestId });
    this.name = 'AI_TOOL_NOT_FOUND';
    this.requestId = requestId;
  }
}

export class AiToolArgumentsInvalidError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'Tool arguments are invalid.', requestId?: string, details?: unknown) {
    super(message, 400, true, details ? { requestId, details } : { requestId });
    this.name = 'AI_TOOL_ARGUMENTS_INVALID';
    this.requestId = requestId;
  }
}

export class AiPermissionRequiredError extends AppError {
  public readonly requestId?: string;
  constructor(message = 'Explicit user permission or confirmation is required for this action.', requestId?: string, details?: unknown) {
    super(message, 403, true, details ? { requestId, details } : { requestId });
    this.name = 'AI_PERMISSION_REQUIRED';
    this.requestId = requestId;
  }
}

// ============================================================================
// ONBOARDING SERVICE ERRORS (MODULE 03)
// ============================================================================

export class OnboardingNotFoundError extends NotFoundError {
  constructor(message = 'Onboarding session not found', details?: unknown) {
    super(message, details);
    this.name = 'ONBOARDING_NOT_FOUND';
  }
}

export class OnboardingAlreadyCompletedError extends AppError {
  constructor(message = 'Onboarding has already been completed.', details?: unknown) {
    super(message, 409, true, details);
    this.name = 'ONBOARDING_ALREADY_COMPLETED';
  }
}

export class OnboardingInvalidStageError extends ValidationError {
  constructor(message = 'Invalid stage transition requested.', details?: unknown) {
    super(message, details);
    this.name = 'ONBOARDING_INVALID_STAGE';
  }
}

export class OnboardingConfirmationRequiredError extends AppError {
  constructor(message = 'Extracted facts require candidate confirmation before proceeding.', details?: unknown) {
    super(message, 422, true, details);
    this.name = 'ONBOARDING_CONFIRMATION_REQUIRED';
  }
}

export class OnboardingFactInvalidError extends ValidationError {
  constructor(message = 'Extracted fact is invalid or missing required fields.', details?: unknown) {
    super(message, details);
    this.name = 'ONBOARDING_FACT_INVALID';
  }
}

export class OnboardingPersistenceFailedError extends AppError {
  constructor(message = 'Failed to persist confirmed candidate data.', details?: unknown) {
    super(message, 500, true, details);
    this.name = 'ONBOARDING_PERSISTENCE_FAILED';
  }
}

