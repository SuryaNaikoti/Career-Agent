/**
 * Resume Storage Service
 * Module 04: Resume Intelligence
 * 
 * Manages private, isolated storage for candidate resumes in Supabase Storage.
 * Path convention: resumes/{userId}/{resumeId}/original.{ext}
 * 
 * Security:
 * - Private bucket 'resumes'
 * - Server-controlled path (never trusting client-supplied user_id)
 * - Temporary signed URLs for preview (never permanent public URLs)
 * - Safe deletion of storage objects
 */

import { requireDatabaseClient } from '../supabaseClient.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class ResumeStorageError extends AppError {
  public readonly code: string;
  constructor(message: string, code = 'STORAGE_ERROR', statusCode = 500) {
    super(message, statusCode, true, { code });
    this.name = code;
    this.code = code;
  }
}

export class ResumeStorageService {
  private bucketName = 'resumes';

  /**
   * Builds the server-authoritative isolated path
   */
  public buildStoragePath(userId: string, resumeId: string, extension: string): string {
    const cleanExt = extension.startsWith('.') ? extension.slice(1) : extension;
    return `${userId}/${resumeId}/original.${cleanExt}`;
  }

  /**
   * Uploads resume binary directly to private Supabase bucket
   */
  public async uploadResumeFile(
    userId: string,
    resumeId: string,
    fileBuffer: Buffer,
    mimeType: string,
    extension: string
  ): Promise<{ storagePath: string }> {
    const supabase = requireDatabaseClient();
    const storagePath = this.buildStoragePath(userId, resumeId, extension);

    const { error } = await supabase.storage
      .from(this.bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      logger.error('Failed to upload resume to Supabase Storage', {
        userId,
        resumeId,
        error: error.message,
      });
      throw new ResumeStorageError(`Storage upload failed: ${error.message}`);
    }

    return { storagePath };
  }

  /**
   * Downloads resume file buffer from storage
   */
  public async downloadResumeFile(storagePath: string): Promise<Buffer> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .download(storagePath);

    if (error || !data) {
      logger.error('Failed to download resume from Supabase Storage', {
        storagePath,
        error: error?.message,
      });
      throw new ResumeStorageError(`Storage download failed: ${error?.message || 'Empty file'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generates a short-lived signed URL for private candidate preview (never public)
   */
  public async createSignedUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
    const supabase = requireDatabaseClient();

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      logger.error('Failed to generate signed URL for resume', {
        storagePath,
        error: error?.message,
      });
      throw new ResumeStorageError('Failed to generate secure preview URL.');
    }

    return data.signedUrl;
  }

  /**
   * Deletes the resume file from private storage
   */
  public async deleteResumeFile(storagePath: string): Promise<void> {
    const supabase = requireDatabaseClient();

    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([storagePath]);

    if (error) {
      logger.error('Failed to delete resume file from Supabase Storage', {
        storagePath,
        error: error.message,
      });
      throw new ResumeStorageError(`Storage deletion failed: ${error.message}`);
    }
  }
}

export const resumeStorageService = new ResumeStorageService();
