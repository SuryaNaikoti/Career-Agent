/**
 * AI Structured Schemas for Grounded Outputs
 * Module 02 AI Service Foundation
 */

export interface CandidateAnalysisOutput {
  summary: string;
  strengths: string[];
  gaps: string[];
  questions: string[];
  suggestions: string[];
}

export interface JobAnalysisOutput {
  role: string;
  requirements: string[];
  qualifications: string[];
  missingQualifications: string[];
  concerns: string[];
  recommendation: 'STRONG_MATCH' | 'MODERATE_MATCH' | 'LOW_MATCH' | 'NOT_RECOMMENDED';
}

export const CandidateAnalysisJsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'strengths', 'gaps', 'questions', 'suggestions'],
};

export const JobAnalysisJsonSchema = {
  type: 'object',
  properties: {
    role: { type: 'string' },
    requirements: { type: 'array', items: { type: 'string' } },
    qualifications: { type: 'array', items: { type: 'string' } },
    missingQualifications: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } },
    recommendation: {
      type: 'string',
      enum: ['STRONG_MATCH', 'MODERATE_MATCH', 'LOW_MATCH', 'NOT_RECOMMENDED'],
    },
  },
  required: ['role', 'requirements', 'qualifications', 'missingQualifications', 'concerns', 'recommendation'],
};
