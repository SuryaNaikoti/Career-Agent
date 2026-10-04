/**
 * Greenhouse Job Board API Source Adapter
 * Module 05: Job Discovery & Ingestion
 * 
 * Documentation: https://developers.greenhouse.io/job-board.html
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
 * 
 * Features:
 * - Public job board API (no authentication required)
 * - Supported fields: title, location, content/description, updatedAt, absolute_url
 * - Allowed hosts strictly: ['boards-api.greenhouse.io']
 */

import { BaseJobSourceAdapter, FetchJobsParams, FetchJobsResult } from './baseAdapter.js';
import { RawExternalJob } from '../jobTypes.js';

export class GreenhouseJobSourceAdapter extends BaseJobSourceAdapter {
  private allowedHosts = ['boards-api.greenhouse.io'];

  constructor() {
    super({
      id: 'greenhouse',
      name: 'Greenhouse Job Board API',
      sourceType: 'ATS',
      acquisitionMethod: 'PUBLIC_API',
      policyStatus: 'ALLOWED',
      enabled: true,
      documentationUrl: 'https://developers.greenhouse.io/job-board.html',
      rateLimitPerMinute: 60,
      capabilities: {
        supportsSearch: false,
        supportsDetail: true,
        supportsPagination: false,
        supportsRemoteFilter: false,
        supportsSalary: false,
        supportsApplyUrl: true,
      },
    });
  }

  public async fetchJobs(params: FetchJobsParams): Promise<FetchJobsResult> {
    const board = encodeURIComponent(params.siteOrCompanyId || 'stripe');
    const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;

    const response = await this.safeFetch(url, this.allowedHosts);
    const data = await response.json();

    const jobsList = Array.isArray(data.jobs) ? data.jobs : [];
    const rawJobs = jobsList.map((item: any) => this.transformRawRecord(item, params.siteOrCompanyId));

    return {
      jobs: rawJobs,
      hasMore: false,
      total: rawJobs.length,
    };
  }

  public transformRawRecord(record: any, companyIdentifier: string): RawExternalJob {
    return {
      externalId: String(record.id || ''),
      title: String(record.title || 'Untitled Position'),
      companyName: companyIdentifier,
      sourceUrl: record.absolute_url || `https://boards.greenhouse.io/${companyIdentifier}/jobs/${record.id}`,
      applyUrl: record.absolute_url,
      locationRaw: record.location?.name || 'Unspecified',
      descriptionRaw: record.content || '',
      departmentRaw: Array.isArray(record.departments) ? record.departments.map((d: any) => d.name).join(', ') : undefined,
    };
  }
}

export const greenhouseJobSourceAdapter = new GreenhouseJobSourceAdapter();
