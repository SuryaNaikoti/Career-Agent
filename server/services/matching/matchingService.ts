/**
 * Core Job Matching Service
 * Module 06: Matching Engine
 * 
 * Orchestrates:
 * 1. Auth context verification
 * 2. Loading candidate career facts via Module 01
 * 3. Loading canonical job via Module 05
 * 4. Requirement extraction (Module 02 safe boundary)
 * 5. Deterministic scoring & skill-gap evaluation
 * 6. Match persistence, caching, and staleness detection
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import { jobSearchService } from '../job/jobSearchService.js';
import { candidateEvidenceService } from './candidateEvidenceService.js';
import { requirementExtractionService } from './requirementExtractionService.js';
import { matchingScoringEngine } from './matchingScoringEngine.js';
import {
  JobMatchResult,
  JobMatchSummary,
  SCORING_VERSION,
  ANALYSIS_VERSION,
} from './matchingTypes.js';
import { AppError, NotFoundError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class MatchingService {
  /**
   * Retrieves or calculates the match between authenticated candidate and target job.
   */
  public async getOrCalculateJobMatch(userId: string, jobId: string, forceRecalculate = false): Promise<JobMatchResult> {
    const job = await jobSearchService.getJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Job not found: ${jobId}`);
    }

    const candidateBundle = await candidateEvidenceService.loadCandidateEvidenceBundle(userId);

    // Check existing match in database if not forced
    if (!forceRecalculate) {
      const cached = await this.getCachedMatch(userId, jobId);
      if (
        cached &&
        cached.scoringVersion === SCORING_VERSION &&
        cached.analysisVersion === ANALYSIS_VERSION &&
        cached.candidateSnapshotHash === candidateBundle.snapshotHash &&
        cached.jobSnapshotHash === job.contentHash
      ) {
        return cached;
      }
    }

    // Perform fresh match calculation
    return this.calculateAndPersistMatch(userId, job, candidateBundle);
  }

  /**
   * Calculates a match from scratch and persists the result.
   */
  public async calculateAndPersistMatch(
    userId: string,
    job: any,
    candidateBundle: any
  ): Promise<JobMatchResult> {
    const requirements = await requirementExtractionService.extractRequirements(job);
    const evaluation = matchingScoringEngine.evaluate(job, requirements, candidateBundle);

    const matchId = randomUUID();
    const now = new Date().toISOString();

    const summaryExplanation = this.buildSummaryExplanation(evaluation.overallScore, evaluation.skillGaps, evaluation.blockers);

    const result: JobMatchResult = {
      id: matchId,
      userId,
      jobId: job.id,
      overallScore: evaluation.overallScore,
      matchStatus: evaluation.matchStatus,
      criticalRequirementCount: evaluation.blockers.length,
      requiredGapCount: evaluation.skillGaps.filter(g => g.importance === 'REQUIRED').length,
      preferredGapCount: evaluation.skillGaps.filter(g => g.importance === 'PREFERRED').length,
      scoringVersion: SCORING_VERSION,
      analysisVersion: ANALYSIS_VERSION,
      candidateSnapshotHash: candidateBundle.snapshotHash,
      jobSnapshotHash: job.contentHash,
      summaryExplanation,
      components: evaluation.components,
      requirements: evaluation.requirements,
      skillGaps: evaluation.skillGaps,
      blockers: evaluation.blockers,
      createdAt: now,
      updatedAt: now,
    };

    // Persist to Supabase if configured
    await this.persistMatchResult(result);

    return result;
  }

  /**
   * Retrieves lightweight summary for job search listing cards.
   */
  public async getMatchSummary(userId: string, jobId: string): Promise<JobMatchSummary> {
    const match = await this.getOrCalculateJobMatch(userId, jobId);
    return {
      jobId: match.jobId,
      score: match.overallScore,
      matchStatus: match.matchStatus,
      criticalBlockers: match.criticalRequirementCount,
      requiredGaps: match.requiredGapCount,
      preferredGaps: match.preferredGapCount,
      summaryExplanation: match.summaryExplanation,
    };
  }

  /**
   * Lists match summaries for candidate's viewed or saved jobs.
   */
  public async listCandidateMatches(userId: string): Promise<JobMatchSummary[]> {
    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('job_matches')
      .select('*')
      .eq('user_id', userId)
      .order('overall_score', { ascending: false });

    if (error) {
      logger.error('Failed to list candidate matches', { userId, error: error.message });
      throw new AppError('Failed to retrieve candidate matches', 500);
    }

    return (data || []).map((row: any) => ({
      jobId: row.job_id,
      score: parseFloat(row.overall_score),
      matchStatus: row.match_status,
      criticalBlockers: row.critical_requirement_count,
      requiredGaps: row.required_gap_count,
      preferredGaps: row.preferred_gap_count,
      summaryExplanation: row.summary_explanation,
    }));
  }

  private async getCachedMatch(userId: string, jobId: string): Promise<JobMatchResult | null> {
    try {
      const supabase = requireDatabaseClient();
      const { data: matchRow, error } = await supabase
        .from('job_matches')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .maybeSingle();

      if (error || !matchRow) return null;

      const [comps, reqs, gaps] = await Promise.all([
        supabase.from('match_components').select('*').eq('match_id', matchRow.id),
        supabase.from('match_requirements').select('*').eq('match_id', matchRow.id),
        supabase.from('match_skill_gaps').select('*').eq('match_id', matchRow.id),
      ]);

      return {
        id: matchRow.id,
        userId: matchRow.user_id,
        jobId: matchRow.job_id,
        overallScore: parseFloat(matchRow.overall_score),
        matchStatus: matchRow.match_status,
        criticalRequirementCount: matchRow.critical_requirement_count,
        requiredGapCount: matchRow.required_gap_count,
        preferredGapCount: matchRow.preferred_gap_count,
        scoringVersion: matchRow.scoring_version,
        analysisVersion: matchRow.analysis_version,
        candidateSnapshotHash: matchRow.candidate_snapshot_hash,
        jobSnapshotHash: matchRow.job_snapshot_hash,
        summaryExplanation: matchRow.summary_explanation,
        components: (comps.data || []).map((c: any) => ({
          componentType: c.component_type,
          rawScore: parseFloat(c.raw_score),
          weight: parseFloat(c.weight),
          weightedScore: parseFloat(c.weighted_score),
          status: c.status,
          explanation: c.explanation,
        })),
        requirements: (reqs.data || []).map((r: any) => ({
          requirement: {
            type: r.requirement_type,
            name: r.requirement_name,
            importance: r.importance,
            confidence: parseFloat(r.confidence || '1'),
          },
          qualificationStatus: r.qualification_status,
          confidence: parseFloat(r.confidence || '1'),
          explanation: r.explanation,
          evidence: [],
          isBlocker: false,
        })),
        skillGaps: (gaps.data || []).map((g: any) => ({
          skillName: g.skill_name,
          gapType: g.gap_type,
          importance: g.importance,
          transferable: Boolean(g.transferable),
          explanation: g.explanation,
        })),
        blockers: [],
        createdAt: matchRow.created_at,
        updatedAt: matchRow.updated_at,
      };
    } catch {
      return null;
    }
  }

  private async persistMatchResult(match: JobMatchResult): Promise<void> {
    try {
      const supabase = requireDatabaseClient();

      // Upsert primary match record
      await supabase.from('job_matches').upsert(
        {
          id: match.id,
          user_id: match.userId,
          job_id: match.jobId,
          overall_score: match.overallScore,
          match_status: match.matchStatus,
          critical_requirement_count: match.criticalRequirementCount,
          required_gap_count: match.requiredGapCount,
          preferred_gap_count: match.preferredGapCount,
          scoring_version: match.scoringVersion,
          analysis_version: match.analysisVersion,
          candidate_snapshot_hash: match.candidateSnapshotHash,
          job_snapshot_hash: match.jobSnapshotHash,
          summary_explanation: match.summaryExplanation,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,job_id' }
      );

      // Insert components
      if (match.components.length > 0) {
        await supabase.from('match_components').delete().eq('match_id', match.id);
        await supabase.from('match_components').insert(
          match.components.map(c => ({
            match_id: match.id,
            user_id: match.userId,
            component_type: c.componentType,
            raw_score: c.rawScore,
            weight: c.weight,
            weighted_score: c.weightedScore,
            status: c.status,
            explanation: c.explanation,
          }))
        );
      }

      // Insert skill gaps
      if (match.skillGaps.length > 0) {
        await supabase.from('match_skill_gaps').delete().eq('match_id', match.id);
        await supabase.from('match_skill_gaps').insert(
          match.skillGaps.map(g => ({
            match_id: match.id,
            user_id: match.userId,
            skill_name: g.skillName,
            gap_type: g.gapType,
            importance: g.importance,
            transferable: g.transferable,
            explanation: g.explanation,
          }))
        );
      }
    } catch (err: any) {
      logger.info('Match persistence skipped or database unconfigured', {
        userId: match.userId,
        jobId: match.jobId,
        error: err.message,
      });
    }
  }

  private buildSummaryExplanation(score: number, gaps: any[], blockers: string[]): string {
    if (blockers.length > 0) {
      return `Missing critical requirement: ${blockers[0]}`;
    }
    const reqGaps = gaps.filter(g => g.importance === 'REQUIRED');
    if (score >= 80) {
      return reqGaps.length === 0
        ? 'Excellent alignment across skills, experience, and role expectations.'
        : `Strong candidate match with ${reqGaps.length} minor required skill gap(s).`;
    }
    if (score >= 60) {
      return `Moderate role and background match with ${reqGaps.length} skill gap(s) to address.`;
    }
    return `Low alignment with current profile; multiple key requirements differ.`;
  }
}

export const matchingService = new MatchingService();
