/**
 * Job Ingestion Service
 * Module 05: Job Discovery & Ingestion
 * 
 * Responsibilities:
 * - Invokes source adapters via JobSourceRegistry
 * - Enforces source policies and rate limits
 * - Normalizes raw jobs into canonical drafts
 * - Computes content hashes
 * - Performs deterministic deduplication & upsert
 * - Tracks Ingestion Runs with counts and errors
 * - Maintains source attribution and freshness
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import { jobSourceRegistry } from './jobSourceRegistry.js';
import { jobNormalizationService } from './jobNormalizationService.js';
import {
  CanonicalJob,
  IngestionRunRecord,
  RawExternalJob,
} from './jobTypes.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export interface RunIngestionParams {
  sourceId: string;
  companyIdentifier: string; // e.g. 'leverdemo' or 'stripe'
  limit?: number;
}

export class JobIngestionService {
  /**
   * Orchestrates an ingestion run for a permitted source
   */
  public async ingestFromSource(params: RunIngestionParams): Promise<IngestionRunRecord> {
    const { sourceId, companyIdentifier } = params;
    const runId = randomUUID();
    const startedAt = new Date().toISOString();

    // 1. Policy check and adapter lookup
    const adapter = jobSourceRegistry.getExecutableAdapter(sourceId);

    const supabase = requireDatabaseClient();

    // 2. Create Ingestion Run record
    await supabase.from('job_ingestion_runs').insert({
      id: runId,
      source_id: sourceId,
      started_at: startedAt,
      status: 'RUNNING',
      jobs_seen: 0,
      jobs_created: 0,
      jobs_updated: 0,
      jobs_skipped: 0,
      jobs_failed: 0,
      metadata: { companyIdentifier, limit: params.limit },
    });

    let jobsSeen = 0;
    let jobsCreated = 0;
    let jobsUpdated = 0;
    let jobsSkipped = 0;
    let jobsFailed = 0;
    let errorSummary: string | null = null;

    try {
      // 3. Fetch from source adapter
      const result = await adapter.fetchJobs({
        siteOrCompanyId: companyIdentifier,
        limit: params.limit,
      });

      jobsSeen = result.jobs.length;

      // 4. Normalize, validate, and upsert each job
      for (const rawJob of result.jobs) {
        try {
          if (!rawJob.title || !rawJob.externalId) {
            jobsSkipped++;
            continue;
          }

          const existingJob = await this.findJobBySourceAndExternalId(sourceId, rawJob.externalId);
          const jobId = existingJob ? existingJob.id : randomUUID();

          const canonicalDraft = jobNormalizationService.normalizeRawJob(rawJob, sourceId, jobId);

          if (existingJob) {
            // Check if content hash changed
            if (existingJob.content_hash !== canonicalDraft.contentHash) {
              await supabase
                .from('jobs')
                .update({
                  title: canonicalDraft.title,
                  source_url: canonicalDraft.sourceUrl,
                  apply_url: canonicalDraft.applyUrl,
                  description_raw: canonicalDraft.descriptionRaw,
                  description_text: canonicalDraft.descriptionText,
                  location_text: canonicalDraft.locationText,
                  workplace_type: canonicalDraft.workplaceType,
                  employment_type: canonicalDraft.employmentType,
                  salary_min: canonicalDraft.salaryMin,
                  salary_max: canonicalDraft.salaryMax,
                  salary_currency: canonicalDraft.salaryCurrency,
                  salary_interval: canonicalDraft.salaryInterval,
                  salary_text: canonicalDraft.salaryText,
                  content_hash: canonicalDraft.contentHash,
                  status: 'ACTIVE',
                  last_seen_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingJob.id);
              jobsUpdated++;
            } else {
              // Same content, just touch last_seen_at for freshness
              await supabase
                .from('jobs')
                .update({
                  last_seen_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingJob.id);
              jobsSkipped++;
            }
          } else {
            // Insert new canonical job
            await supabase.from('jobs').insert({
              id: canonicalDraft.id,
              source_id: canonicalDraft.sourceId,
              external_job_id: canonicalDraft.externalJobId,
              source_url: canonicalDraft.sourceUrl,
              apply_url: canonicalDraft.applyUrl,
              title: canonicalDraft.title,
              company_name: canonicalDraft.companyName,
              company_domain: canonicalDraft.companyDomain,
              company_logo_url: canonicalDraft.companyLogoUrl,
              description_raw: canonicalDraft.descriptionRaw,
              description_text: canonicalDraft.descriptionText,
              location_text: canonicalDraft.locationText,
              workplace_type: canonicalDraft.workplaceType,
              employment_type: canonicalDraft.employmentType,
              salary_min: canonicalDraft.salaryMin,
              salary_max: canonicalDraft.salaryMax,
              salary_currency: canonicalDraft.salaryCurrency,
              salary_interval: canonicalDraft.salaryInterval,
              salary_text: canonicalDraft.salaryText,
              skills: canonicalDraft.skills,
              content_hash: canonicalDraft.contentHash,
              status: 'ACTIVE',
              posted_at: canonicalDraft.postedAt,
              last_seen_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            jobsCreated++;
          }
        } catch (itemErr: any) {
          logger.warn('Failed to ingest single job item', {
            sourceId,
            externalId: rawJob.externalId,
            error: itemErr.message,
          });
          jobsFailed++;
        }
      }

      // 5. Complete Ingestion Run
      const completedRecord: IngestionRunRecord = {
        id: runId,
        sourceId,
        startedAt,
        completedAt: new Date().toISOString(),
        status: jobsFailed > 0 && jobsCreated === 0 ? 'PARTIAL' : 'COMPLETED',
        jobsSeen,
        jobsCreated,
        jobsUpdated,
        jobsSkipped,
        jobsFailed,
        errorSummary: null,
      };

      await supabase
        .from('job_ingestion_runs')
        .update({
          completed_at: completedRecord.completedAt,
          status: completedRecord.status,
          jobs_seen: jobsSeen,
          jobs_created: jobsCreated,
          jobs_updated: jobsUpdated,
          jobs_skipped: jobsSkipped,
          jobs_failed: jobsFailed,
        })
        .eq('id', runId);

      return completedRecord;
    } catch (err: any) {
      errorSummary = err.message || 'Ingestion failed';
      logger.error('Job ingestion run failed', { sourceId, runId, error: errorSummary });

      await supabase
        .from('job_ingestion_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'FAILED',
          jobs_seen: jobsSeen,
          jobs_created: jobsCreated,
          jobs_updated: jobsUpdated,
          jobs_skipped: jobsSkipped,
          jobs_failed: jobsFailed,
          error_summary: errorSummary,
        })
        .eq('id', runId);

      throw err;
    }
  }

  private async findJobBySourceAndExternalId(
    sourceId: string,
    externalJobId: string
  ): Promise<any | null> {
    const supabase = requireDatabaseClient();
    const { data } = await supabase
      .from('jobs')
      .select('id, content_hash')
      .eq('source_id', sourceId)
      .eq('external_job_id', externalJobId)
      .maybeSingle();

    return data;
  }
}

export const jobIngestionService = new JobIngestionService();
