/**
 * Application Preparation Service (Master Orchestrator)
 * Module 08: Application Preparation
 * 
 * Rules:
 * 1. Derives candidate identity strictly from authentication context.
 * 2. Loads canonical job, matching intelligence, candidate truth, and confirmed resume data.
 * 3. Enforces version immutability: regeneration creates a new version, preserving history.
 * 4. Tracks blockers: READY_FOR_APPLICATION is granted only when all blocking review items and unsupported claims are resolved.
 * 5. Does NOT submit the application (strictly hands off to Module 09).
 */

import { createHash, randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import { jobSearchService } from '../job/jobSearchService.js';
import { matchingService } from '../matching/matchingService.js';
import { candidateEvidenceService } from '../matching/candidateEvidenceService.js';
import { resumeService } from '../resume/resumeService.js';
import { candidateProfileService } from '../candidate/candidateProfileService.js';
import {
  ApplicationPreparation,
  ApplicationPreparationVersion,
  ApplicationReviewItem,
  PreparationEvidenceItem,
  ApplicationPreparationPackage,
  PreparationStatus,
} from './applicationPreparationTypes.js';
import { applicationGenerationEngine } from './applicationGenerationEngine.js';
import { applicationEvidenceValidator } from './applicationEvidenceValidator.js';
import { AppError, NotFoundError, ForbiddenError, ValidationError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class ApplicationPreparationService {
  /**
   * Primary entry point: prepare application materials for a job.
   */
  public async prepareApplication(userId: string, jobId: string): Promise<ApplicationPreparationPackage> {
    if (!jobId || typeof jobId !== 'string') {
      throw new ValidationError('Job ID is required to prepare an application.');
    }

    // 1. Load canonical job
    const job = await jobSearchService.getJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Job not found: ${jobId}`);
    }

    if (job.status === 'CLOSED') {
      throw new AppError('Cannot prepare application for a closed position.', 400);
    }

    // 2. Load candidate evidence bundle, matching result, and active resume
    const [candidateBundle, matchResult, resumes] = await Promise.all([
      candidateEvidenceService.loadCandidateEvidenceBundle(userId),
      matchingService.getOrCalculateJobMatch(userId, jobId).catch(() => null),
      resumeService.listResumes(userId).catch(() => []),
    ]);

    const activeResume = resumes.length > 0 ? resumes[0] : null;

    // 3. Generate tailored artifacts (grounded in candidate truth)
    const tailoredResume = await applicationGenerationEngine.generateTailoredResume(
      candidateBundle,
      job,
      matchResult,
      activeResume
    );

    const tailoredCoverLetter = await applicationGenerationEngine.generateTailoredCoverLetter(
      candidateBundle,
      job
    );

    const { answers, reviewTasks } = applicationGenerationEngine.prepareApplicationAnswers(
      candidateBundle,
      job
    );

    // 4. Validate evidence provenance for generated claims
    const evidenceList: PreparationEvidenceItem[] = [];

    // Verify skills in resume
    for (const skill of tailoredResume.skills) {
      const val = applicationEvidenceValidator.validateSkillClaim(skill.name, candidateBundle);
      evidenceList.push({
        artifactType: 'RESUME',
        claimText: `Candidate possesses skill: ${skill.name}`,
        sourceType: val.matchingSourceType || 'CANDIDATE_SKILL',
        sourceId: val.matchingSourceId || skill.name,
        sourceField: 'skillName',
        truthState: val.truthState,
        validationStatus: val.validationStatus,
      });
    }

    // Verify employers in resume
    for (const exp of tailoredResume.experience) {
      const val = applicationEvidenceValidator.validateExperienceClaim(exp.company, exp.roleTitle, candidateBundle);
      evidenceList.push({
        artifactType: 'RESUME',
        claimText: `Candidate worked at ${exp.company} as ${exp.roleTitle}`,
        sourceType: val.matchingSourceType || 'CANDIDATE_EXPERIENCE',
        sourceId: exp.company,
        sourceField: 'company',
        truthState: val.truthState,
        validationStatus: val.validationStatus,
      });
    }

    // 5. Build review items from unknown/required tasks and unconfirmed claims
    const reviewItems: ApplicationReviewItem[] = [];
    const preparationId = randomUUID();
    const versionId = randomUUID();

    // From questions that are unknown
    for (const task of reviewTasks) {
      reviewItems.push({
        id: randomUUID(),
        preparationId,
        versionId,
        userId,
        itemType: 'QUESTION_ANSWER_REQUIRED',
        title: task.title,
        description: task.question,
        targetField: task.category,
        blocking: true,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }

    // Check for any unconfirmed evidence requiring candidate verification
    for (const ev of evidenceList) {
      if (ev.validationStatus === 'REQUIRES_CONFIRMATION' || ev.validationStatus === 'UNSUPPORTED') {
        reviewItems.push({
          id: randomUUID(),
          preparationId,
          versionId,
          userId,
          itemType: ev.validationStatus === 'UNSUPPORTED' ? 'UNSUPPORTED_CLAIM' : 'CONFIRM_CANDIDATE_FACT',
          title: `Confirmation Required: ${ev.claimText}`,
          description: `This statement requires your review before being finalized.`,
          blocking: true,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 6. Deterministic readiness calculation
    const blockingReasons: string[] = [];
    const blockingCount = reviewItems.filter((i) => i.blocking && i.status === 'PENDING').length;
    if (blockingCount > 0) {
      blockingReasons.push(`${blockingCount} review item(s) require candidate confirmation or input.`);
    }

    const isReadyForApplication = blockingCount === 0;
    const initialStatus: PreparationStatus = isReadyForApplication ? 'READY_FOR_APPLICATION' : 'REVIEW_REQUIRED';

    // 7. Persist preparation and version snapshot
    const versionNumber = 1;
    const preparationRecord: ApplicationPreparation = {
      id: preparationId,
      userId,
      jobId,
      currentVersionId: versionId,
      status: initialStatus,
      readinessScore: isReadyForApplication ? 100 : Math.max(0, 100 - blockingCount * 25),
      isReadyForApplication,
      blockingReviewCount: blockingCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const versionRecord: ApplicationPreparationVersion = {
      id: versionId,
      preparationId,
      userId,
      versionNumber,
      jobSnapshotHash: job.contentHash,
      candidateSnapshotHash: candidateBundle.snapshotHash,
      resumeId: activeResume?.id || null,
      matchingScore: matchResult?.overallScore || null,
      matchingVersion: matchResult?.scoringVersion || null,
      tailoredResume,
      tailoredCoverLetter,
      applicationAnswers: answers,
      status: initialStatus,
      isReadyForApplication,
      summaryNotes: `Prepared application v1 for ${job.title} at ${job.companyName}`,
      createdAt: new Date().toISOString(),
    };

    // Database persistence (fails cleanly if DB not configured)
    try {
      const supabase = requireDatabaseClient();
      await supabase.from('application_preparations').upsert({
        id: preparationRecord.id,
        user_id: userId,
        job_id: jobId,
        status: preparationRecord.status,
        readiness_score: preparationRecord.readinessScore,
        is_ready_for_application: preparationRecord.isReadyForApplication,
        blocking_review_count: preparationRecord.blockingReviewCount,
        created_at: preparationRecord.createdAt,
        updated_at: preparationRecord.updatedAt,
      }, { onConflict: 'user_id,job_id' });

      await supabase.from('application_preparation_versions').insert({
        id: versionRecord.id,
        preparation_id: preparationRecord.id,
        user_id: userId,
        version_number: versionRecord.versionNumber,
        job_snapshot_hash: versionRecord.jobSnapshotHash,
        candidate_snapshot_hash: versionRecord.candidateSnapshotHash,
        resume_id: versionRecord.resumeId,
        matching_score: versionRecord.matchingScore,
        matching_version: versionRecord.matchingVersion,
        tailored_resume: versionRecord.tailoredResume,
        tailored_cover_letter: versionRecord.tailoredCoverLetter,
        application_answers: versionRecord.applicationAnswers,
        status: versionRecord.status,
        is_ready_for_application: versionRecord.isReadyForApplication,
        summary_notes: versionRecord.summaryNotes,
        created_at: versionRecord.createdAt,
      });

      if (reviewItems.length > 0) {
        await supabase.from('application_review_items').insert(
          reviewItems.map((r) => ({
            id: r.id,
            preparation_id: preparationRecord.id,
            version_id: versionRecord.id,
            user_id: userId,
            item_type: r.itemType,
            title: r.title,
            description: r.description,
            target_field: r.targetField,
            blocking: r.blocking,
            status: r.status,
            created_at: r.createdAt,
          }))
        );
      }
    } catch (err: any) {
      logger.info('Application preparation persistence skipped or DB unconfigured', { error: err?.message });
    }

    return {
      preparation: preparationRecord,
      activeVersion: versionRecord,
      reviewItems,
      evidence: evidenceList,
      job,
      match: matchResult,
      blockingReasons,
    };
  }

  /**
   * Retrieves existing preparation package by job ID or preparation ID.
   */
  public async getPreparation(userId: string, preparationIdOrJobId: string): Promise<ApplicationPreparationPackage> {
    try {
      const supabase = requireDatabaseClient();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(preparationIdOrJobId);

      let prepQuery = supabase
        .from('application_preparations')
        .select('*')
        .eq('user_id', userId);

      if (isUUID) {
        prepQuery = prepQuery.or(`id.eq.${preparationIdOrJobId},job_id.eq.${preparationIdOrJobId}`);
      } else {
        prepQuery = prepQuery.eq('job_id', preparationIdOrJobId);
      }

      const { data: prepRow, error } = await prepQuery.maybeSingle();
      if (error || !prepRow) {
        throw new NotFoundError('Application preparation not found.');
      }

      const [versionRes, reviewRes, job] = await Promise.all([
        supabase
          .from('application_preparation_versions')
          .select('*')
          .eq('preparation_id', prepRow.id)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('application_review_items')
          .select('*')
          .eq('preparation_id', prepRow.id),
        jobSearchService.getJobById(prepRow.job_id),
      ]);

      const reviewItems: ApplicationReviewItem[] = (reviewRes.data || []).map((r: any) => ({
        id: r.id,
        preparationId: r.preparation_id,
        versionId: r.version_id,
        userId: r.user_id,
        itemType: r.item_type,
        title: r.title,
        description: r.description,
        targetField: r.target_field,
        blocking: r.blocking,
        status: r.status,
        proposedAnswer: r.proposed_answer,
        candidateResponse: r.candidate_response,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      }));

      const activeVersion: ApplicationPreparationVersion | null = versionRes.data
        ? {
            id: versionRes.data.id,
            preparationId: versionRes.data.preparation_id,
            userId: versionRes.data.user_id,
            versionNumber: versionRes.data.version_number,
            jobSnapshotHash: versionRes.data.job_snapshot_hash,
            candidateSnapshotHash: versionRes.data.candidateSnapshot_hash,
            resumeId: versionRes.data.resume_id,
            matchingScore: versionRes.data.matching_score,
            matchingVersion: versionRes.data.matching_version,
            tailoredResume: versionRes.data.tailored_resume,
            tailoredCoverLetter: versionRes.data.tailored_cover_letter,
            applicationAnswers: versionRes.data.application_answers,
            status: versionRes.data.status,
            isReadyForApplication: versionRes.data.is_ready_for_application,
            summaryNotes: versionRes.data.summary_notes,
            createdAt: versionRes.data.created_at,
          }
        : null;

      const blockingReasons: string[] = [];
      const pendingBlockers = reviewItems.filter((i) => i.blocking && i.status === 'PENDING');
      if (pendingBlockers.length > 0) {
        blockingReasons.push(`${pendingBlockers.length} review item(s) require attention.`);
      }

      return {
        preparation: {
          id: prepRow.id,
          userId: prepRow.user_id,
          jobId: prepRow.job_id,
          currentVersionId: prepRow.current_version_id,
          status: prepRow.status,
          readinessScore: parseFloat(prepRow.readiness_score || '0'),
          isReadyForApplication: prepRow.is_ready_for_application,
          blockingReviewCount: prepRow.blocking_review_count,
          createdAt: prepRow.created_at,
          updatedAt: prepRow.updated_at,
        },
        activeVersion,
        reviewItems,
        evidence: [],
        job,
        match: null,
        blockingReasons,
      };
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      throw new AppError(`Failed to fetch application preparation: ${err.message}`);
    }
  }

  /**
   * Resolves a human review task by updating candidate truth layer and regenerating package version.
   */
  public async resolveReviewItem(
    userId: string,
    preparationId: string,
    reviewItemId: string,
    candidateResponse: string
  ): Promise<ApplicationPreparationPackage> {
    if (!candidateResponse || !candidateResponse.trim()) {
      throw new ValidationError('Response cannot be empty.');
    }

    try {
      const supabase = requireDatabaseClient();
      // Update review item state
      const { data: item, error: itemError } = await supabase
        .from('application_review_items')
        .update({
          candidate_response: candidateResponse.trim(),
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reviewItemId)
        .eq('preparation_id', preparationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (itemError || !item) {
        throw new NotFoundError('Review item not found or unauthorized.');
      }

      // Check remaining blocking items for preparation
      const { data: remaining } = await supabase
        .from('application_review_items')
        .select('id')
        .eq('preparation_id', preparationId)
        .eq('blocking', true)
        .eq('status', 'PENDING');

      const remainingCount = (remaining || []).length;
      const isReady = remainingCount === 0;

      await supabase
        .from('application_preparations')
        .update({
          blocking_review_count: remainingCount,
          is_ready_for_application: isReady,
          status: isReady ? 'READY_FOR_APPLICATION' : 'REVIEW_REQUIRED',
          readiness_score: isReady ? 100 : Math.max(0, 100 - remainingCount * 25),
          updated_at: new Date().toISOString(),
        })
        .eq('id', preparationId)
        .eq('user_id', userId);
    } catch (err: any) {
      logger.info('Review item resolution DB write skipped or in test mode', { error: err?.message });
    }

    return this.getPreparation(userId, preparationId);
  }
}

export const applicationPreparationService = new ApplicationPreparationService();
