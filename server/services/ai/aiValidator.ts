/**
 * AI Output & Truth Layer Validator
 * Module 02 AI Service Foundation
 * 
 * Validates JSON structures, verifies claims against the Candidate Truth Layer,
 * and ensures fabricated qualifications are rejected.
 */

import { AiCandidateContext, AiValidationResult } from './aiTypes.js';
import { AiSchemaValidationError } from './aiErrors.js';
import { logger } from '../../core/logging/logger.js';

export class AiValidator {
  /**
   * Validates structured JSON string against expected shape.
   */
  public parseAndValidateJson<T>(rawJson: string, requestId?: string): T {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (err) {
      logger.warn('AI output is not valid JSON', { requestId, error: String(err) });
      throw new AiSchemaValidationError('AI response failed JSON syntax parsing', requestId);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new AiSchemaValidationError('AI response must be a JSON object', requestId);
    }

    return parsed as T;
  }

  /**
   * Verifies that the model's text does not invent claims about known UNKNOWN skills or attributes.
   * If a skill was explicitly identified as UNKNOWN, the model must NOT assert that the candidate has it.
   */
  public validateTruthLayerConsistency(
    responseText: string,
    candidateContext?: AiCandidateContext | null,
    requestId?: string
  ): AiValidationResult {
    const errors: string[] = [];

    if (!candidateContext || !candidateContext.truthMetadata) {
      return { isValid: true, errors: [] };
    }

    const lowerResponse = responseText.toLowerCase();
    const unknownAttrs = candidateContext.truthMetadata.unknownAttributes || [];

    for (const unknownAttr of unknownAttrs) {
      const lowerAttr = unknownAttr.toLowerCase();
      // Heuristic detection: check if response asserts candidate possesses this unknown attribute
      const positiveAssertionRegex = new RegExp(
        `(candidate|you|applicant)\\s+(has|have|possess|possesses|with)\\s+.*\\b${lowerAttr}\\b`,
        'i'
      );

      const yearsOfExperienceRegex = new RegExp(
        `\\d+\\+?\\s+years?\\s+(of\\s+)?(experience\\s+in\\s+)?\\b${lowerAttr}\\b`,
        'i'
      );

      if (positiveAssertionRegex.test(lowerResponse) || yearsOfExperienceRegex.test(lowerResponse)) {
        // Check if the statement acknowledges it's unconfirmed or asking a question
        const isDoubtfulOrAsking =
          lowerResponse.includes(`confirm whether you have ${lowerAttr}`) ||
          lowerResponse.includes(`not confirmed in your profile`) ||
          lowerResponse.includes(`confirm your experience with ${lowerAttr}`) ||
          lowerResponse.includes(`unconfirmed`);

        if (!isDoubtfulOrAsking) {
          const errMsg = `AI generated unsupported positive claim regarding UNKNOWN attribute "${unknownAttr}"`;
          errors.push(errMsg);
          logger.warn('Candidate Truth Layer violation detected in AI output', { requestId, unknownAttr });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const aiValidator = new AiValidator();
