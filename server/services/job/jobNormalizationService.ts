/**
 * Job Content Normalization & Hashing Service
 * Module 05: Job Discovery & Ingestion
 * 
 * Rules:
 * - HTML sanitization and text extraction without DOM execution
 * - Clean whitespace and formatting normalization
 * - Workplace type mapping (REMOTE, HYBRID, ONSITE, UNKNOWN)
 * - Employment type mapping (FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP)
 * - Deterministic SHA-256 content hashing from stable normalized fields
 * - Never fabricate salary numbers or employment dates
 */

import { createHash } from 'crypto';
import {
  RawExternalJob,
  CanonicalJob,
  WorkplaceType,
  CanonicalEmploymentType,
} from './jobTypes.js';

export class JobNormalizationService {
  /**
   * Strips HTML tags, script blocks, style blocks, and normalizes plain text safely
   */
  public sanitizeAndExtractText(rawHtmlOrText?: string | null): string {
    if (!rawHtmlOrText) return '';

    return rawHtmlOrText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Maps source workplace string to canonical enum
   */
  public normalizeWorkplaceType(raw?: string | null, locationRaw?: string | null): WorkplaceType {
    const combined = `${raw || ''} ${locationRaw || ''}`.toLowerCase();

    if (combined.includes('remote') || combined.includes('telecommute') || combined.includes('virtual')) {
      return 'REMOTE';
    }
    if (combined.includes('hybrid') || combined.includes('flexible')) {
      return 'HYBRID';
    }
    if (combined.includes('on-site') || combined.includes('onsite') || combined.includes('in-office') || combined.includes('office')) {
      return 'ONSITE';
    }
    return 'UNKNOWN';
  }

  /**
   * Maps source employment string to canonical enum
   */
  public normalizeEmploymentType(raw?: string | null): CanonicalEmploymentType {
    if (!raw) return 'FULL_TIME';
    const clean = raw.toLowerCase();

    if (clean.includes('part') || clean.includes('part-time') || clean.includes('part time')) {
      return 'PART_TIME';
    }
    if (clean.includes('contract') || clean.includes('contractor') || clean.includes('freelance') || clean.includes('c2c')) {
      return 'CONTRACT';
    }
    if (clean.includes('intern') || clean.includes('internship') || clean.includes('trainee')) {
      return 'INTERNSHIP';
    }
    if (clean.includes('temp') || clean.includes('temporary')) {
      return 'TEMPORARY';
    }
    if (clean.includes('full') || clean.includes('full-time') || clean.includes('permanent')) {
      return 'FULL_TIME';
    }
    return 'OTHER';
  }

  /**
   * Computes deterministic SHA-256 content fingerprint from stable normalized fields
   */
  public computeContentHash(
    title: string,
    company: string,
    location: string,
    descriptionText: string,
    employmentType: string
  ): string {
    const normalizedInput = [
      title.toLowerCase().trim(),
      company.toLowerCase().trim(),
      location.toLowerCase().trim(),
      descriptionText.slice(0, 500).toLowerCase().trim(),
      employmentType.toUpperCase().trim(),
    ].join('||');

    return createHash('sha256').update(normalizedInput).digest('hex');
  }

  /**
   * Normalizes raw job payload into canonical job draft
   */
  public normalizeRawJob(
    raw: RawExternalJob,
    sourceId: string,
    jobId: string
  ): Omit<CanonicalJob, 'createdAt' | 'updatedAt' | 'lastSeenAt'> {
    const title = (raw.title || '').trim();
    const companyName = (raw.companyName || '').trim();
    const locationText = (raw.locationRaw || 'Unspecified').trim();
    const descriptionText = this.sanitizeAndExtractText(raw.descriptionRaw || '');
    const workplaceType = this.normalizeWorkplaceType(raw.workplaceTypeRaw, raw.locationRaw);
    const employmentType = this.normalizeEmploymentType(raw.employmentTypeRaw);

    const contentHash = this.computeContentHash(
      title,
      companyName,
      locationText,
      descriptionText,
      employmentType
    );

    let postedAt: string | null = null;
    if (raw.postedAtRaw) {
      const parsedDate = new Date(raw.postedAtRaw);
      if (!isNaN(parsedDate.getTime())) {
        postedAt = parsedDate.toISOString();
      }
    }

    return {
      id: jobId,
      sourceId,
      externalJobId: String(raw.externalId).trim(),
      sourceUrl: (raw.sourceUrl || '').trim(),
      applyUrl: raw.applyUrl ? raw.applyUrl.trim() : null,
      title,
      companyName,
      companyDomain: raw.companyDomain ? raw.companyDomain.trim() : null,
      companyLogoUrl: raw.companyLogoUrl ? raw.companyLogoUrl.trim() : null,
      descriptionRaw: raw.descriptionRaw || null,
      descriptionText,
      locationText,
      country: null,
      stateRegion: null,
      city: null,
      workplaceType,
      employmentType,
      experienceLevel: null,
      department: raw.departmentRaw ? raw.departmentRaw.trim() : null,
      category: raw.categoryRaw ? raw.categoryRaw.trim() : null,
      salaryMin: raw.salaryRaw?.min ?? null,
      salaryMax: raw.salaryRaw?.max ?? null,
      salaryCurrency: raw.salaryRaw?.currency ?? null,
      salaryInterval: raw.salaryRaw?.interval ?? null,
      salaryText: raw.salaryRaw?.text ?? null,
      skills: Array.isArray(raw.skillsRaw) ? raw.skillsRaw : [],
      contentHash,
      status: 'ACTIVE',
      postedAt,
      expiresAt: null,
    };
  }
}

export const jobNormalizationService = new JobNormalizationService();
