/**
 * Job Discovery & Search Service
 * Module 05: Job Discovery & Ingestion
 * 
 * Provides candidate-facing search, filtering, and detail retrieval
 * exclusively from the canonical stored job inventory in PostgreSQL.
 * Never executes external source fetching during candidate search.
 */

import { requireDatabaseClient } from '../supabaseClient.js';
import {
  CanonicalJob,
  JobSearchParams,
  JobSearchResult,
} from './jobTypes.js';
import { AppError, NotFoundError } from '../../core/errors/appError.js';

export class JobSearchService {
  /**
   * Maps database row to CanonicalJob interface
   */
  public mapDbRowToJob(row: Record<string, any>): CanonicalJob {
    return {
      id: row.id,
      sourceId: row.source_id,
      externalJobId: row.external_job_id,
      sourceUrl: row.source_url,
      applyUrl: row.apply_url,
      title: row.title,
      companyName: row.company_name,
      companyDomain: row.company_domain,
      companyLogoUrl: row.company_logo_url,
      descriptionRaw: row.description_raw,
      descriptionText: row.description_text,
      locationText: row.location_text,
      country: row.country,
      stateRegion: row.state_region,
      city: row.city,
      workplaceType: row.workplace_type,
      employmentType: row.employment_type,
      experienceLevel: row.experience_level,
      department: row.department,
      category: row.category,
      salaryMin: row.salary_min ? parseFloat(row.salary_min) : null,
      salaryMax: row.salary_max ? parseFloat(row.salary_max) : null,
      salaryCurrency: row.salary_currency,
      salaryInterval: row.salary_interval,
      salaryText: row.salary_text,
      skills: row.skills || [],
      contentHash: row.content_hash,
      status: row.status,
      postedAt: row.posted_at,
      expiresAt: row.expires_at,
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Search and filter canonical jobs
   */
  public async searchJobs(params: JobSearchParams = {}): Promise<JobSearchResult> {
    const supabase = requireDatabaseClient();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('status', 'ACTIVE');

    if (params.query && params.query.trim()) {
      const q = params.query.trim();
      query = query.or(`title.ilike.%${q}%,company_name.ilike.%${q}%,description_text.ilike.%${q}%`);
    }

    if (params.title && params.title.trim()) {
      query = query.ilike('title', `%${params.title.trim()}%`);
    }

    if (params.location && params.location.trim()) {
      query = query.ilike('location_text', `%${params.location.trim()}%`);
    }

    if (params.country && params.country.trim()) {
      query = query.ilike('country', `%${params.country.trim()}%`);
    }

    if (params.experienceLevel && params.experienceLevel.trim()) {
      query = query.ilike('experience_level', `%${params.experienceLevel.trim()}%`);
    }

    if (params.company && params.company.trim()) {
      query = query.ilike('company_name', `%${params.company.trim()}%`);
    }

    if (params.workplaceType && params.workplaceType !== 'UNKNOWN') {
      query = query.eq('workplace_type', params.workplaceType);
    }

    if (params.employmentType && params.employmentType !== 'UNKNOWN') {
      query = query.eq('employment_type', params.employmentType);
    }

    if (params.minSalary && params.minSalary > 0) {
      query = query.gte('salary_max', params.minSalary);
    }

    const sortField = params.sortBy === 'salary_max' ? 'salary_max' : 'posted_at';
    const ascending = params.sortOrder === 'asc';

    query = query.order(sortField, { ascending, nullsFirst: false });
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new AppError(`Failed to search jobs: ${error.message}`);
    }

    const total = count || 0;
    const jobs = (data || []).map((row) => this.mapDbRowToJob(row));

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single job by canonical ID
   */
  public async getJobById(jobId: string): Promise<CanonicalJob> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Job not found.');
    }

    return this.mapDbRowToJob(data);
  }
}

export const jobSearchService = new JobSearchService();
