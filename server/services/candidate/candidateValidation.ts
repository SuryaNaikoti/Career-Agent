import { ValidationError } from '../../core/errors/appError.js';
import { FactProvenance, WorkMode } from '../../../src/types/candidate.js';

const VALID_PROVENANCE: ReadonlySet<FactProvenance> = new Set([
  'CANDIDATE_PROVIDED',
  'CANDIDATE_CONFIRMED',
  'AI_SUGGESTED',
  'EXTERNAL_SOURCE',
  'UNKNOWN',
]);

const VALID_WORK_MODES: ReadonlySet<WorkMode> = new Set([
  'Remote',
  'Hybrid',
  'On-site',
]);

const VALID_PROFICIENCY_LEVELS = new Set(['beginner', 'intermediate', 'expert']);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateUuid(id: unknown, fieldName = 'id'): string {
  if (typeof id !== 'string' || !UUID_REGEX.test(id.trim())) {
    throw new ValidationError(`Invalid format for ${fieldName}: must be a valid UUID`);
  }
  return id.trim();
}

export function validateProvenance(provenance: unknown, defaultProvenance: FactProvenance = 'CANDIDATE_PROVIDED'): FactProvenance {
  if (provenance === undefined || provenance === null) {
    return defaultProvenance;
  }
  if (typeof provenance !== 'string' || !VALID_PROVENANCE.has(provenance as FactProvenance)) {
    throw new ValidationError(`Invalid provenance value. Must be one of: ${Array.from(VALID_PROVENANCE).join(', ')}`);
  }
  return provenance as FactProvenance;
}

export function validateString(
  value: unknown,
  fieldName: string,
  options: { required?: boolean; maxLength?: number; minLength?: number } = {}
): string | undefined {
  const { required = false, maxLength = 500, minLength = 0 } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`);
    }
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  if (trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }

  return trimmed;
}

export function validateStringArray(
  value: unknown,
  fieldName: string,
  options: { maxItems?: number; maxItemLength?: number } = {}
): string[] {
  const { maxItems = 50, maxItemLength = 100 } = options;

  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array of strings`);
  }

  if (value.length > maxItems) {
    throw new ValidationError(`${fieldName} exceeds maximum allowed elements (${maxItems})`);
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new ValidationError(`${fieldName}[${index}] must be a string`);
    }
    const trimmed = item.trim();
    if (trimmed.length > maxItemLength) {
      throw new ValidationError(`${fieldName}[${index}] exceeds max length of ${maxItemLength}`);
    }
    return trimmed;
  });
}

export function validateWorkModes(modes: unknown): WorkMode[] {
  if (modes === undefined || modes === null) {
    return [];
  }
  if (!Array.isArray(modes)) {
    throw new ValidationError('work_modes must be an array');
  }
  return modes.map((mode) => {
    if (typeof mode !== 'string' || !VALID_WORK_MODES.has(mode as WorkMode)) {
      throw new ValidationError(`Invalid work mode "${mode}". Must be one of: ${Array.from(VALID_WORK_MODES).join(', ')}`);
    }
    return mode as WorkMode;
  });
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {}
): number | undefined {
  const { min, max, required = false } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`);
    }
    return undefined;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} cannot be less than ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} cannot exceed ${max}`);
  }

  return num;
}

export function validateDate(value: unknown, fieldName: string, required = false): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ValidationError(`${fieldName} is required`);
    }
    return undefined;
  }

  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value.trim())) {
    throw new ValidationError(`${fieldName} must be a valid date in YYYY-MM-DD format`);
  }

  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} represents an invalid calendar date`);
  }

  return value.trim();
}

export function validateProficiencyLevel(level: unknown): 'beginner' | 'intermediate' | 'expert' | undefined {
  if (level === undefined || level === null || level === '') {
    return undefined;
  }
  if (typeof level !== 'string' || !VALID_PROFICIENCY_LEVELS.has(level.toLowerCase().trim())) {
    throw new ValidationError(`proficiency_level must be one of: ${Array.from(VALID_PROFICIENCY_LEVELS).join(', ')}`);
  }
  return level.toLowerCase().trim() as 'beginner' | 'intermediate' | 'expert';
}
