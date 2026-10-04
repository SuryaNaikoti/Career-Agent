/**
 * Resume Intelligence Core Types & Contracts
 * Module 04: Resume Intelligence
 * 
 * Defines strict TypeScript interfaces for resume upload, parsing, provenance,
 * extracted schema, review, confirmation, and error conditions.
 */

import { FactProvenance, WorkMode } from '../../../src/types/candidate.js';

export type ResumeStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'EXTRACTING'
  | 'PARSING'
  | 'REVIEW_REQUIRED'
  | 'COMPLETED'
  | 'FAILED'
  | 'DELETED';

export type ResumeProcessingStage =
  | 'UPLOAD'
  | 'VALIDATION'
  | 'EXTRACTION'
  | 'NORMALIZATION'
  | 'AI_PARSING'
  | 'EVIDENCE_VALIDATION'
  | 'REVIEW'
  | 'PERSISTENCE';

export interface ResumeSourceEvidence {
  type: 'RESUME';
  page?: number | null;
  section?: string | null;
  textSnippet: string;
}

export interface ExtractedContact {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  links?: string[];
  evidence?: ResumeSourceEvidence;
}

export interface ExtractedExperienceItem {
  id: string; // temporary client/review id
  company: string;
  roleTitle: string;
  employmentType?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
  achievements?: string[];
  skillsUsed?: string[];
  evidence?: ResumeSourceEvidence;
  truthState: FactProvenance; // Default AI_SUGGESTED
  isConfirmed?: boolean;
  isRejected?: boolean;
}

export interface ExtractedSkillItem {
  id: string; // temporary client/review id
  name: string;
  category?: string | null;
  proficiency?: 'beginner' | 'intermediate' | 'expert' | 'UNKNOWN' | null;
  yearsOfExperience?: number | null;
  evidence?: ResumeSourceEvidence;
  truthState: FactProvenance; // Default AI_SUGGESTED
  isConfirmed?: boolean;
  isRejected?: boolean;
}

export interface ExtractedEducationItem {
  id: string; // temporary client/review id
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  gradeOrGpa?: string | null;
  evidence?: ResumeSourceEvidence;
  truthState: FactProvenance; // Default AI_SUGGESTED
  isConfirmed?: boolean;
  isRejected?: boolean;
}

export interface ExtractedCertificationItem {
  id: string;
  name: string;
  issuer?: string | null;
  issueDate?: string | null;
  credentialId?: string | null;
  expirationDate?: string | null;
  evidence?: ResumeSourceEvidence;
  truthState: FactProvenance; // Default AI_SUGGESTED
  isConfirmed?: boolean;
  isRejected?: boolean;
}

export interface ExtractedProjectItem {
  id: string;
  name: string;
  description?: string | null;
  technologies?: string[];
  link?: string | null;
  evidence?: ResumeSourceEvidence;
  truthState: FactProvenance;
  isConfirmed?: boolean;
  isRejected?: boolean;
}

export interface ResumeAdvisoryAnalysis {
  missingMeasurableAchievements: boolean;
  inconsistentDates: boolean;
  unclearJobTitles: boolean;
  missingContactInfo: boolean;
  skillsWithoutContext: string[];
  recommendations: string[];
}

export interface StructuredResumeData {
  candidate: ExtractedContact;
  headline?: string | null;
  summary?: string | null;
  targetRoles: string[];
  totalExperienceYears?: number | null;
  workModes?: WorkMode[];
  preferredLocations?: string[];
  experience: ExtractedExperienceItem[];
  skills: ExtractedSkillItem[];
  education: ExtractedEducationItem[];
  certifications: ExtractedCertificationItem[];
  projects: ExtractedProjectItem[];
  achievements: string[];
  languages: string[];
  unknowns: string[];
  warnings: string[];
  advisoryAnalysis?: ResumeAdvisoryAnalysis;
}

export interface DocumentSection {
  type: string;
  title: string;
  rawText: string;
  startChar: number;
  endChar: number;
}

export interface ExtractedDocument {
  text: string;
  normalizedText: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
  sections: DocumentSection[];
  warnings: string[];
  isScannedOrImageOnly?: boolean;
}

export interface ResumeDocumentRecord {
  id: string;
  userId: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
  status: ResumeStatus;
  processingStage: ResumeProcessingStage;
  errorCode?: string | null;
  errorMessageSafe?: string | null;
  documentMetadata: {
    pageCount?: number;
    pages?: Array<{ pageNumber: number; textLength: number }>;
    warnings?: string[];
    sectionsDetected?: string[];
  };
  parsedData?: StructuredResumeData | null;
  evidenceSummary?: {
    totalClaimsExtracted: number;
    supportedClaimsCount: number;
    flaggedOrUnknownClaimsCount: number;
  } | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
}

export interface ResumeUploadLimits {
  maxFileSizeBytes: number;
  maxPages: number;
  maxExtractedTextChars: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export const DEFAULT_RESUME_LIMITS: ResumeUploadLimits = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  maxPages: 10,
  maxExtractedTextChars: 150000,
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedExtensions: ['.pdf', '.docx'],
};

export interface ResumeConfirmationInput {
  confirmedProfile?: {
    displayName?: string;
    headline?: string;
    totalExperienceYears?: number;
    targetRoles?: string[];
    preferredLocations?: string[];
    workModes?: WorkMode[];
  };
  confirmedSkills?: Array<{
    name: string;
    proficiencyLevel?: 'beginner' | 'intermediate' | 'expert' | null;
    yearsOfExperience?: number | null;
  }>;
  confirmedExperience?: Array<{
    company: string;
    roleTitle: string;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent: boolean;
    description?: string | null;
    skillsUsed?: string[];
  }>;
  confirmedEducation?: Array<{
    institution: string;
    degree: string;
    fieldOfStudy?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
}

export interface ResumeCorrectionInput {
  category: 'profile' | 'skills' | 'experience' | 'education';
  itemId?: string;
  field: string;
  correctedValue: unknown;
}
