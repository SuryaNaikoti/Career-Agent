/**
 * Core Job Discovery & Ingestion Domain Types
 * Module 05: Job Discovery & Ingestion
 * 
 * Strict TypeScript interfaces for sources, adapters, canonical jobs,
 * normalized jobs, ingestion runs, search parameters, and policies.
 */

export type SourcePolicyStatus =
  | 'ALLOWED'
  | 'REQUIRES_AUTHORIZATION'
  | 'RESTRICTED'
  | 'DISABLED'
  | 'UNKNOWN';

export type JobSourceType = 'ATS' | 'PUBLIC_API' | 'FEED' | 'JOB_BOARD';

export type JobAcquisitionMethod = 'PUBLIC_API' | 'PARTNER_API' | 'FEED' | 'UNAUTHORIZED_SCRAPING';

export type WorkplaceType = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';

export type CanonicalEmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'TEMPORARY'
  | 'INTERNSHIP'
  | 'OTHER'
  | 'UNKNOWN';

export type CanonicalJobStatus =
  | 'ACTIVE'
  | 'STALE_CANDIDATE'
  | 'CLOSED'
  | 'REMOVED'
  | 'UNKNOWN';

export type IngestionRunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface JobSourceMetadata {
  id: string; // e.g. 'lever', 'greenhouse'
  name: string;
  sourceType: JobSourceType;
  acquisitionMethod: JobAcquisitionMethod;
  policyStatus: SourcePolicyStatus;
  enabled: boolean;
  documentationUrl?: string;
  termsUrl?: string;
  rateLimitPerMinute: number;
  capabilities: {
    supportsSearch: boolean;
    supportsDetail: boolean;
    supportsPagination: boolean;
    supportsRemoteFilter: boolean;
    supportsSalary: boolean;
    supportsApplyUrl: boolean;
  };
}

export interface RawExternalJob {
  externalId: string;
  title: string;
  companyName: string;
  companyDomain?: string;
  companyLogoUrl?: string;
  sourceUrl: string;
  applyUrl?: string;
  locationRaw?: string;
  descriptionRaw?: string;
  postedAtRaw?: string | number;
  workplaceTypeRaw?: string;
  employmentTypeRaw?: string;
  salaryRaw?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string;
    text?: string;
  };
  departmentRaw?: string;
  categoryRaw?: string;
  skillsRaw?: string[];
  additionalMetadata?: Record<string, unknown>;
}

export interface CanonicalJob {
  id: string; // uuid
  sourceId: string;
  externalJobId: string;
  sourceUrl: string;
  applyUrl?: string | null;
  title: string;
  companyName: string;
  companyDomain?: string | null;
  companyLogoUrl?: string | null;
  descriptionRaw?: string | null;
  descriptionText: string;
  locationText: string;
  country?: string | null;
  stateRegion?: string | null;
  city?: string | null;
  workplaceType: WorkplaceType;
  employmentType: CanonicalEmploymentType;
  experienceLevel?: string | null;
  department?: string | null;
  category?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryInterval?: string | null;
  salaryText?: string | null;
  skills: string[];
  contentHash: string;
  status: CanonicalJobStatus;
  postedAt?: string | null;
  expiresAt?: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionRunRecord {
  id: string;
  sourceId: string;
  startedAt: string;
  completedAt?: string | null;
  status: IngestionRunStatus;
  jobsSeen: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsSkipped: number;
  jobsFailed: number;
  errorSummary?: string | null;
  metadata?: Record<string, unknown>;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  workplaceType?: WorkplaceType;
  employmentType?: CanonicalEmploymentType;
  company?: string;
  country?: string;
  title?: string;
  experienceLevel?: string;
  minSalary?: number;
  currency?: string;
  page?: number;
  limit?: number;
  sortBy?: 'posted_at' | 'created_at' | 'salary_max';
  sortOrder?: 'asc' | 'desc';
}

export interface JobSearchResult {
  jobs: CanonicalJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
