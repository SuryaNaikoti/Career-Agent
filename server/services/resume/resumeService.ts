/**
 * Resume Service (Master Orchestrator)
 * Module 04: Resume Intelligence
 * 
 * Orchestrates:
 * 1. File validation (extension, MIME, magic bytes, size)
 * 2. SHA-256 calculation
 * 3. Database record creation & updates (public.resume_documents)
 * 4. Private Supabase storage upload
 * 5. Document text & structure extraction
 * 6. AI parsing via Module 02
 * 7. Evidence validation
 * 8. Candidate review state management
 * 9. Confirmation bridge to Module 01
 * 10. Private storage and database cleanup on deletion
 */

import { createHash, randomUUID } from 'crypto';
import path from 'path';
import { requireDatabaseClient } from '../supabaseClient.js';
import { resumeValidationService } from './resumeValidationService.js';
import { resumeStorageService } from './resumeStorageService.js';
import { resumeExtractionService } from './resumeExtractionService.js';
import { resumeParserService } from './resumeParserService.js';
import { resumeReviewService } from './resumeReviewService.js';
import {
  ResumeDocumentRecord,
  ResumeStatus,
  ResumeProcessingStage,
  ResumeConfirmationInput,
  ResumeCorrectionInput,
} from './resumeTypes.js';
import { AppError, NotFoundError, ForbiddenError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class ResumeService {
  /**
   * Helper to map DB row to TypeScript record
   */
  private mapDbRowToRecord(row: Record<string, any>): ResumeDocumentRecord {
    return {
      id: row.id,
      userId: row.user_id,
      originalFilename: row.original_filename,
      storagePath: row.storage_path,
      mimeType: row.mime_type,
      fileSizeBytes: parseInt(row.file_size_bytes || '0', 10),
      sha256: row.sha256,
      status: row.status as ResumeStatus,
      processingStage: row.processing_stage as ResumeProcessingStage,
      errorCode: row.error_code,
      errorMessageSafe: row.error_message_safe,
      documentMetadata: row.document_metadata || {},
      parsedData: row.parsed_data,
      evidenceSummary: row.evidence_summary,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      processedAt: row.processed_at,
    };
  }

  /**
   * Upload and process a new resume file
   */
  public async uploadAndProcessResume(
    userId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    declaredMimeType: string
  ): Promise<ResumeDocumentRecord> {
    const resumeId = randomUUID();

    // 1. Validate File signature and parameters
    const { detectedFormat } = resumeValidationService.validateFile(
      fileBuffer,
      originalFilename,
      declaredMimeType
    );

    // 2. Compute SHA-256
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const ext = path.extname(originalFilename).toLowerCase();

    // 3. Upload to private Supabase Storage
    const { storagePath } = await resumeStorageService.uploadResumeFile(
      userId,
      resumeId,
      fileBuffer,
      declaredMimeType,
      ext
    );

    // 4. Create initial DB record
    const supabase = requireDatabaseClient();
    const { data: insertedRow, error: insertErr } = await supabase
      .from('resume_documents')
      .insert({
        id: resumeId,
        user_id: userId,
        original_filename: originalFilename,
        storage_path: storagePath,
        mime_type: declaredMimeType,
        file_size_bytes: fileBuffer.length,
        sha256,
        status: 'EXTRACTING',
        processing_stage: 'EXTRACTION',
      })
      .select()
      .single();

    if (insertErr || !insertedRow) {
      logger.error('Failed to create resume database record', { userId, resumeId, error: insertErr?.message });
      // Cleanup storage on failure
      try {
        await resumeStorageService.deleteResumeFile(storagePath);
      } catch (cleanErr) {
        // ignore
      }
      throw new AppError(`Failed to save resume record: ${insertErr?.message || 'Database error'}`);
    }

    let currentRecord = this.mapDbRowToRecord(insertedRow);

    // 5. Run text extraction
    try {
      const extractedDoc = await resumeExtractionService.extractDocument(fileBuffer, detectedFormat);

      // Update stage to PARSING
      await supabase
        .from('resume_documents')
        .update({
          status: 'PARSING',
          processing_stage: 'AI_PARSING',
          document_metadata: {
            pageCount: extractedDoc.pageCount,
            pages: extractedDoc.pages.map((p) => ({ pageNumber: p.pageNumber, textLength: p.text.length })),
            warnings: extractedDoc.warnings,
            sectionsDetected: extractedDoc.sections.map((s) => s.type),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', resumeId)
        .eq('user_id', userId);

      // 6. AI Parsing & Evidence Validation
      const { parsedData, evidenceSummary } = await resumeParserService.parseResume(
        extractedDoc,
        userId
      );

      // 7. Transition to REVIEW_REQUIRED
      const { data: completedRow, error: updateErr } = await supabase
        .from('resume_documents')
        .update({
          status: 'REVIEW_REQUIRED',
          processing_stage: 'REVIEW',
          parsed_data: parsedData,
          evidence_summary: evidenceSummary,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', resumeId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateErr || !completedRow) {
        throw new AppError('Failed to persist parsed resume intelligence.');
      }

      currentRecord = this.mapDbRowToRecord(completedRow);
      return currentRecord;
    } catch (err: any) {
      const errorCode = err?.code || 'PROCESSING_FAILED';
      const safeMessage = err?.message || 'Failed to process resume.';

      logger.error('Resume processing pipeline failed', {
        userId,
        resumeId,
        errorCode,
        error: safeMessage,
      });

      // Update document to FAILED state
      await supabase
        .from('resume_documents')
        .update({
          status: 'FAILED',
          error_code: errorCode,
          error_message_safe: safeMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resumeId)
        .eq('user_id', userId);

      throw err;
    }
  }

  /**
   * List resumes belonging strictly to authenticated user
   */
  public async listResumes(userId: string): Promise<ResumeDocumentRecord[]> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('resume_documents')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch resumes: ${error.message}`);
    }

    return (data || []).map((row) => this.mapDbRowToRecord(row));
  }

  /**
   * Get single resume by ID with strict ownership validation
   */
  public async getResume(userId: string, resumeId: string): Promise<ResumeDocumentRecord> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase
      .from('resume_documents')
      .select('*')
      .eq('id', resumeId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Resume document not found.');
    }

    // Strict ownership enforcement
    if (data.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this resume.');
    }

    return this.mapDbRowToRecord(data);
  }

  /**
   * Get secure short-lived preview URL
   */
  public async getPreviewUrl(userId: string, resumeId: string): Promise<string> {
    const record = await this.getResume(userId, resumeId);
    return resumeStorageService.createSignedUrl(record.storagePath, 300);
  }

  /**
   * Candidate confirmation of extracted facts -> passes to Module 01
   */
  public async confirmResumeFacts(
    userId: string,
    resumeId: string,
    confirmation: ResumeConfirmationInput
  ): Promise<{ status: 'COMPLETED'; summary: any }> {
    const resume = await this.getResume(userId, resumeId);

    // Persist confirmed facts through Module 01 candidate services
    const summary = await resumeReviewService.applyConfirmedFacts(userId, confirmation);

    // Mark resume as COMPLETED
    const supabase = requireDatabaseClient();
    await supabase
      .from('resume_documents')
      .update({
        status: 'COMPLETED',
        processing_stage: 'PERSISTENCE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', resumeId)
      .eq('user_id', userId);

    return {
      status: 'COMPLETED',
      summary,
    };
  }

  /**
   * Candidate correction of a specific fact
   */
  public async correctResumeFact(
    userId: string,
    resumeId: string,
    correction: ResumeCorrectionInput
  ): Promise<ResumeDocumentRecord> {
    const resume = await this.getResume(userId, resumeId);

    if (!resume.parsedData) {
      throw new AppError('Resume has not been parsed yet.', 400, true, { code: 'NOT_READY' });
    }

    const updatedData = { ...resume.parsedData };

    if (correction.category === 'profile') {
      (updatedData as any)[correction.field] = correction.correctedValue;
    } else if (correction.category === 'skills' && correction.itemId) {
      const target = updatedData.skills.find((s) => s.id === correction.itemId);
      if (target) {
        (target as any)[correction.field] = correction.correctedValue;
        target.truthState = 'CANDIDATE_PROVIDED';
      }
    } else if (correction.category === 'experience' && correction.itemId) {
      const target = updatedData.experience.find((e) => e.id === correction.itemId);
      if (target) {
        (target as any)[correction.field] = correction.correctedValue;
        target.truthState = 'CANDIDATE_PROVIDED';
      }
    } else if (correction.category === 'education' && correction.itemId) {
      const target = updatedData.education.find((ed) => ed.id === correction.itemId);
      if (target) {
        (target as any)[correction.field] = correction.correctedValue;
        target.truthState = 'CANDIDATE_PROVIDED';
      }
    }

    const supabase = requireDatabaseClient();
    const { data: updatedRow, error } = await supabase
      .from('resume_documents')
      .update({
        parsed_data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resumeId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !updatedRow) {
      throw new AppError('Failed to save correction to resume intelligence.');
    }

    return this.mapDbRowToRecord(updatedRow);
  }

  /**
   * Deletes resume document record and removes file from private storage
   */
  public async deleteResume(userId: string, resumeId: string): Promise<{ success: true }> {
    const resume = await this.getResume(userId, resumeId);

    // 1. Remove storage object
    try {
      await resumeStorageService.deleteResumeFile(resume.storagePath);
    } catch (storageErr: any) {
      logger.error('Failed to remove storage object during resume delete', {
        userId,
        resumeId,
        error: storageErr?.message,
      });
      // Continue to DB deletion or fail safely
    }

    // 2. Remove DB record
    const supabase = requireDatabaseClient();
    const { error } = await supabase
      .from('resume_documents')
      .delete()
      .eq('id', resumeId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to delete resume record: ${error.message}`);
    }

    return { success: true };
  }
}

export const resumeService = new ResumeService();
