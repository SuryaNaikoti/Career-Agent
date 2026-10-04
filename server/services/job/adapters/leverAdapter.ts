/**
 * Lever Public Postings API Source Adapter
 * Module 05: Job Discovery & Ingestion
 * 
 * Documentation: https://hire.lever.co/developer/documentation
 * Endpoint: https://api.lever.co/v0/postings/{site}?mode=json
 * 
 * Features:
 * - Public ATS endpoint (no secret credentials needed)
 * - Supported fields: title, categories, workplaceType, salaryRange, description, urls
 * - Allowed hosts strictly: ['api.lever.co']
 */

import { BaseJobSourceAdapter, FetchJobsParams, FetchJobsResult } from './baseAdapter.js';
import { RawExternalJob } from '../jobTypes.js';

export class LeverJobSourceAdapter extends BaseJobSourceAdapter {
  private allowedHosts = ['api.lever.co'];

  constructor() {
    super({
      id: 'lever',
      name: 'Lever Postings API',
      sourceType: 'ATS',
      acquisitionMethod: 'PUBLIC_API',
      policyStatus: 'ALLOWED',
      enabled: true,
      documentationUrl: 'https://hire.lever.co/developer/documentation',
      rateLimitPerMinute: 60,
      capabilities: {
        supportsSearch: false,
        supportsDetail: true,
        supportsPagination: false,
        supportsRemoteFilter: true,
        supportsSalary: true,
        supportsApplyUrl: true,
      },
    });
  }

  public async fetchJobs(params: FetchJobsParams): Promise<FetchJobsResult> {
    const site = encodeURIComponent(params.siteOrCompanyId || 'leverdemo');
    const url = `https://api.lever.co/v0/postings/${site}?mode=json`;

    const response = await this.safeFetch(url, this.allowedHosts);
    const data = await response.json();

    if (!Array.isArray(data)) {
      return { jobs: [], hasMore: false };
    }

    const rawJobs = data.map((item) => this.transformRawRecord(item, params.siteOrCompanyId));
    return {
      jobs: rawJobs,
      hasMore: false,
      total: rawJobs.length,
    };
  }

  public transformRawRecord(record: any, companyIdentifier: string): RawExternalJob {
    const categories = record.categories || {};
    const salary = record.salaryRange || {};

    let salaryMin: number | undefined;
    let salaryMax: number | undefined;
    if (typeof salary.min === 'number') salaryMin = salary.min;
    if (typeof salary.max === 'number') salaryMax = salary.max;

    let salaryText: string | undefined;
    if (salaryMin && salaryMax) {
      salaryText = `${salary.currency || '$'}${salaryMin.toLocaleString()} - ${salary.currency || '$'}${salaryMax.toLocaleString()}${salary.interval ? ` / ${salary.interval}` : ''}`;
    }

    return {
      externalId: String(record.id || ''),
      title: String(record.text || 'Untitled Position'),
      companyName: companyIdentifier,
      sourceUrl: record.hostedUrl || `https://jobs.lever.co/${companyIdentifier}/${record.id}`,
      applyUrl: record.applyUrl || record.hostedUrl,
      locationRaw: categories.location || 'Unspecified',
      descriptionRaw: record.description || record.descriptionPlain || '',
      postedAtRaw: record.createdAt,
      workplaceTypeRaw: record.workplaceType,
      employmentTypeRaw: categories.commitment,
      departmentRaw: categories.department || categories.team,
      categoryRaw: categories.allLocations ? categories.allLocations.join(', ') : undefined,
      salaryRaw: salaryMin || salaryMax ? {
        min: salaryMin,
        max: salaryMax,
        currency: salary.currency,
        interval: salary.interval,
        text: salaryText,
      } : undefined,
    };
  }
}

export const leverJobSourceAdapter = new LeverJobSourceAdapter();
