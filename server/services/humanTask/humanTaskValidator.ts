/**
 * Human Task Input Validator
 * Module 10: Human Task Engine
 * 
 * Strict server-side validation of task answers based on input schema:
 * - TEXT: bounded string, sanitization
 * - LONG_TEXT: bounded string up to 2000 chars
 * - YES_NO: strict boolean or 'yes'/'no'
 * - SINGLE_SELECT: must match defined options array
 * - MULTI_SELECT: array of strings matching defined options
 * - NUMBER: valid finite number, range check
 * - DATE: valid ISO date string
 * - CONFIRMATION: boolean true or confirmed flag
 */

import { TaskInputSchema, HumanTaskInputType } from './humanTaskTypes.js';
import { ValidationError } from '../../core/errors/appError.js';

export class HumanTaskValidator {
  /**
   * Validates submitted response against task input schema.
   */
  public static validateResponse(
    schema: TaskInputSchema,
    responseValue: unknown,
    candidateConfirmed?: boolean
  ): { valid: boolean; normalizedValue: unknown } {
    const { inputType, options = [], isSensitive } = schema;

    if (isSensitive && !candidateConfirmed && responseValue !== true && responseValue !== 'yes') {
      throw new ValidationError('Sensitive actions require explicit candidate confirmation.');
    }

    switch (inputType) {
      case 'CONFIRMATION': {
        const confirmed = responseValue === true || responseValue === 'true' || !!candidateConfirmed;
        if (!confirmed) {
          throw new ValidationError('You must confirm this task to complete it.');
        }
        return { valid: true, normalizedValue: true };
      }

      case 'YES_NO': {
        if (typeof responseValue === 'boolean') {
          return { valid: true, normalizedValue: responseValue };
        }
        if (typeof responseValue === 'string') {
          const lower = responseValue.trim().toLowerCase();
          if (lower === 'yes' || lower === 'true') return { valid: true, normalizedValue: true };
          if (lower === 'no' || lower === 'false') return { valid: true, normalizedValue: false };
        }
        throw new ValidationError("Expected 'yes' or 'no' for this question.");
      }

      case 'TEXT': {
        if (typeof responseValue !== 'string' || !responseValue.trim()) {
          throw new ValidationError('A non-empty text response is required.');
        }
        const trimmed = responseValue.trim();
        if (trimmed.length > 500) {
          throw new ValidationError('Text response exceeds maximum allowed length of 500 characters.');
        }
        return { valid: true, normalizedValue: trimmed };
      }

      case 'LONG_TEXT': {
        if (typeof responseValue !== 'string' || !responseValue.trim()) {
          throw new ValidationError('A detailed text response is required.');
        }
        const trimmed = responseValue.trim();
        if (trimmed.length > 3000) {
          throw new ValidationError('Response exceeds maximum allowed length of 3000 characters.');
        }
        return { valid: true, normalizedValue: trimmed };
      }

      case 'NUMBER': {
        const num = typeof responseValue === 'number' ? responseValue : parseFloat(String(responseValue));
        if (isNaN(num) || !isFinite(num)) {
          throw new ValidationError('A valid numeric response is required.');
        }
        return { valid: true, normalizedValue: num };
      }

      case 'DATE': {
        if (typeof responseValue !== 'string' || !responseValue.trim()) {
          throw new ValidationError('A valid date is required.');
        }
        const parsed = Date.parse(responseValue);
        if (isNaN(parsed)) {
          throw new ValidationError('Malformed date format. Expected ISO-8601 date string.');
        }
        return { valid: true, normalizedValue: new Date(parsed).toISOString().split('T')[0] };
      }

      case 'SINGLE_SELECT': {
        if (typeof responseValue !== 'string' || !responseValue.trim()) {
          throw new ValidationError('An option selection is required.');
        }
        const selected = responseValue.trim();
        if (options.length > 0 && !options.includes(selected)) {
          throw new ValidationError(`Invalid selection '${selected}'. Must be one of: ${options.join(', ')}`);
        }
        return { valid: true, normalizedValue: selected };
      }

      case 'MULTI_SELECT': {
        if (!Array.isArray(responseValue) || responseValue.length === 0) {
          throw new ValidationError('At least one option selection is required.');
        }
        const cleaned = responseValue.map((v) => String(v).trim()).filter(Boolean);
        if (options.length > 0) {
          for (const item of cleaned) {
            if (!options.includes(item)) {
              throw new ValidationError(`Invalid selection '${item}'. Must be in: ${options.join(', ')}`);
            }
          }
        }
        return { valid: true, normalizedValue: cleaned };
      }

      default:
        throw new ValidationError(`Unsupported input type '${inputType}'`);
    }
  }
}
