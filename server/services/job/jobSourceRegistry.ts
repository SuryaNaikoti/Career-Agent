/**
 * Centralized Job Source Registry
 * Module 05: Job Discovery & Ingestion
 * 
 * Rules:
 * - Registers all known sources and adapters
 * - Enforces policyStatus check: only ALLOWED sources can be executed
 * - Marks restricted sources (e.g. LinkedIn, Indeed scraping) as RESTRICTED
 * - Fails closed: UNKNOWN / RESTRICTED / DISABLED sources never run
 */

import { JobSourceMetadata, SourcePolicyStatus } from './jobTypes.js';
import { BaseJobSourceAdapter, SourceAdapterError } from './adapters/baseAdapter.js';
import { leverJobSourceAdapter } from './adapters/leverAdapter.js';
import { greenhouseJobSourceAdapter } from './adapters/greenhouseAdapter.js';
import { AppError } from '../../core/errors/appError.js';

export interface RegisteredSource {
  metadata: JobSourceMetadata;
  adapter?: BaseJobSourceAdapter;
}

export class JobSourceRegistry {
  private sources: Map<string, RegisteredSource> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 1. Lever Public Postings (ALLOWED)
    this.register({
      metadata: leverJobSourceAdapter.getMetadata(),
      adapter: leverJobSourceAdapter,
    });

    // 2. Greenhouse Public Board (ALLOWED)
    this.register({
      metadata: greenhouseJobSourceAdapter.getMetadata(),
      adapter: greenhouseJobSourceAdapter,
    });

    // 3. LinkedIn (RESTRICTED - Unauthorized scraping strictly prohibited by terms)
    this.register({
      metadata: {
        id: 'linkedin',
        name: 'LinkedIn Jobs',
        sourceType: 'JOB_BOARD',
        acquisitionMethod: 'UNAUTHORIZED_SCRAPING',
        policyStatus: 'RESTRICTED',
        enabled: false,
        documentationUrl: 'https://www.linkedin.com/legal/user-agreement',
        rateLimitPerMinute: 0,
        capabilities: {
          supportsSearch: false,
          supportsDetail: false,
          supportsPagination: false,
          supportsRemoteFilter: false,
          supportsSalary: false,
          supportsApplyUrl: false,
        },
      },
    });

    // 4. Indeed (RESTRICTED - Anti-scraping policy enforced)
    this.register({
      metadata: {
        id: 'indeed',
        name: 'Indeed Jobs',
        sourceType: 'JOB_BOARD',
        acquisitionMethod: 'UNAUTHORIZED_SCRAPING',
        policyStatus: 'RESTRICTED',
        enabled: false,
        documentationUrl: 'https://www.indeed.com/legal',
        rateLimitPerMinute: 0,
        capabilities: {
          supportsSearch: false,
          supportsDetail: false,
          supportsPagination: false,
          supportsRemoteFilter: false,
          supportsSalary: false,
          supportsApplyUrl: false,
        },
      },
    });
  }

  public register(entry: RegisteredSource): void {
    this.sources.set(entry.metadata.id.toLowerCase(), entry);
  }

  public getSource(sourceId: string): RegisteredSource | undefined {
    return this.sources.get(sourceId.toLowerCase());
  }

  public listSources(): JobSourceMetadata[] {
    return Array.from(this.sources.values()).map((s) => s.metadata);
  }

  /**
   * Retrieves an adapter and enforces policy check
   */
  public getExecutableAdapter(sourceId: string): BaseJobSourceAdapter {
    const entry = this.getSource(sourceId);

    if (!entry) {
      throw new SourceAdapterError(`Unknown job source: '${sourceId}'`, 'SOURCE_NOT_FOUND', 404);
    }

    if (entry.metadata.policyStatus !== 'ALLOWED') {
      throw new SourceAdapterError(
        `Source '${sourceId}' is policy restricted (${entry.metadata.policyStatus}). Automated access is prohibited.`,
        'SOURCE_NOT_ALLOWED',
        403
      );
    }

    if (!entry.metadata.enabled) {
      throw new SourceAdapterError(`Source '${sourceId}' is currently disabled.`, 'SOURCE_DISABLED', 403);
    }

    if (!entry.adapter) {
      throw new SourceAdapterError(`No adapter implementation found for source '${sourceId}'.`, 'ADAPTER_MISSING', 501);
    }

    return entry.adapter;
  }
}

export const jobSourceRegistry = new JobSourceRegistry();
