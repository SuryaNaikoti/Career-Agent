/**
 * Job Experience Discovery & Recommendation Service
 * Module 07: Jobs Experience
 * 
 * Rules:
 * - Aggregates canonical jobs from Module 05.
 * - Integrates match summaries from Module 06 without duplicating scoring logic.
 * - Filters out dismissed jobs from personalized discovery feed.
 * - Deterministic recommendation ranking: prioritizes high match score, target role alignment, and freshness.
 * - Zero fake recommendations, zero fake match scores.
 */

import { jobSearchService } from '../job/jobSearchService.js';
import { matchingService } from '../matching/matchingService.js';
import { jobInteractionService } from './jobInteractionService.js';
import { candidatePreferencesService } from '../candidate/candidatePreferencesService.js';
import { candidateProfileService } from '../candidate/candidateProfileService.js';
import {
  EnrichedJobCardData,
  JobsFeedParams,
  JobsFeedResult,
} from './jobExperienceTypes.js';
import { CanonicalJob, WorkplaceType, CanonicalEmploymentType } from '../job/jobTypes.js';

export class JobExperienceService {
  /**
   * Primary discovery feed for candidate.
   */
  public async getCandidateFeed(userId: string, params: JobsFeedParams): Promise<JobsFeedResult> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);

    // 1. Fetch candidate interactions (saved & dismissed sets)
    const { savedIds, dismissedIds } = await jobInteractionService.getCandidateInteractions(userId);

    // 2. Fetch canonical search results from Module 05
    const searchRes = await jobSearchService.searchJobs({
      query: params.query,
      title: params.title,
      location: params.location,
      country: params.country,
      experienceLevel: params.experienceLevel,
      workplaceType: params.workplaceType as WorkplaceType,
      employmentType: params.employmentType as CanonicalEmploymentType,
      minSalary: params.minSalary,
      company: params.company,
      page,
      limit: limit + dismissedIds.size, // fetch extra buffer to account for dismissed
      sortBy: params.sortBy === 'salary_high' ? 'salary_max' : 'posted_at',
      sortOrder: 'desc',
    });

    // 3. Filter out dismissed jobs
    const activeJobs = searchRes.jobs.filter(j => !dismissedIds.has(j.id)).slice(0, limit);

    // 4. Enrich jobs with saved state and cached Module 06 match summaries (without triggering new AI calls)
    const enrichedList: EnrichedJobCardData[] = await Promise.all(
      activeJobs.map(async (job) => {
        let matchSummary = null;
        try {
          matchSummary = await matchingService.getMatchSummary(userId, job.id);
        } catch {
          // Non-blocking: if match cannot be computed, matchSummary remains null
        }
        return {
          job,
          match: matchSummary,
          isSaved: savedIds.has(job.id),
          isDismissed: false,
        };
      })
    );

    // 5. Apply deterministic relevance sorting if requested
    if (params.sortBy === 'relevance') {
      enrichedList.sort((a, b) => {
        const scoreA = a.match ? a.match.score : 0;
        const scoreB = b.match ? b.match.score : 0;
        return scoreB - scoreA;
      });
    }

    return {
      jobs: enrichedList,
      total: Math.max(0, searchRes.total - dismissedIds.size),
      page,
      limit,
      hasMore: searchRes.page < searchRes.totalPages,
    };
  }

  /**
   * Deterministic personalized recommendations feed.
   */
  public async getRecommendedJobs(userId: string, limit = 10): Promise<EnrichedJobCardData[]> {
    const [preferences, profile, interactions] = await Promise.all([
      candidatePreferencesService.getPreferences(userId).catch(() => null),
      candidateProfileService.getProfile(userId).catch(() => null),
      jobInteractionService.getCandidateInteractions(userId),
    ]);

    const targetRoles = preferences?.targetRoles || profile?.targetRoles || [];
    const primaryRole = targetRoles.length > 0 ? targetRoles[0] : undefined;

    // Search canonical jobs matching primary target role
    const searchRes = await jobSearchService.searchJobs({
      query: primaryRole,
      limit: limit * 2,
    });

    const activeJobs = searchRes.jobs
      .filter(j => !interactions.dismissedIds.has(j.id) && j.status === 'ACTIVE')
      .slice(0, limit);

    const enriched = await Promise.all(
      activeJobs.map(async (job) => {
        let match = null;
        try {
          match = await matchingService.getMatchSummary(userId, job.id);
        } catch {
          match = null;
        }
        return {
          job,
          match,
          isSaved: interactions.savedIds.has(job.id),
          isDismissed: false,
        };
      })
    );

    // Sort by match score then freshness
    return enriched.sort((a, b) => {
      const scoreA = a.match ? a.match.score : 0;
      const scoreB = b.match ? b.match.score : 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const dateA = new Date(a.job.postedAt || a.job.createdAt).getTime();
      const dateB = new Date(b.job.postedAt || b.job.createdAt).getTime();
      return dateB - dateA;
    });
  }
}

export const jobExperienceService = new JobExperienceService();
