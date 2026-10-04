/**
 * Jobs Experience Domain Types & Contracts
 * Module 07: Jobs Experience
 */

import { CanonicalJob } from '../job/jobTypes.js';
import { JobMatchSummary } from '../matching/matchingTypes.js';

export interface EnrichedJobCardData {
  job: CanonicalJob;
  match?: JobMatchSummary | null;
  isSaved: boolean;
  isDismissed: boolean;
}

export interface JobsFeedParams {
  query?: string;
  title?: string;
  location?: string;
  country?: string;
  experienceLevel?: string;
  workplaceType?: string;
  employmentType?: string;
  minSalary?: number;
  company?: string;
  sortBy?: 'relevance' | 'newest' | 'salary_high';
  page?: number;
  limit?: number;
}

export interface JobsFeedResult {
  jobs: EnrichedJobCardData[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CandidateInteractionSummary {
  savedJobIds: Set<string>;
  dismissedJobIds: Set<string>;
  recentJobIds: string[];
}
