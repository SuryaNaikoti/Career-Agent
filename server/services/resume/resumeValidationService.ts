/**
 * Resume File Validation Service
 * Module 04: Resume Intelligence
 * 
 * Enforces:
 * - Allowed extensions (.pdf, .docx)
 * - Allowed MIME types
 * - Magic byte / file signature validation (e.g. %PDF-, PK..)
 * - Size limits (10MB default)
 * - Malformed file header rejection
 * - Executable / script detection rejection
 */

import path from 'path';
import { DEFAULT_RESUME_LIMITS, ResumeUploadLimits } from './resumeTypes.js';
import { AppError } from '../../core/errors/appError.js';

export class ResumeValidationError extends AppError {
  public readonly code: string;
  constructor(message: string, code = 'INVALID_RESUME_FILE') {
    super(message, 400, true, { code });
    this.name = code;
    this.code = code;
  }
}

export class ResumeValidationService {
  private limits: ResumeUploadLimits;

  constructor(limits: ResumeUploadLimits = DEFAULT_RESUME_LIMITS) {
    this.limits = limits;
  }

  /**
   * Validates file metadata and binary magic bytes
   */
  public validateFile(
    fileBuffer: Buffer,
    originalFilename: string,
    declaredMimeType: string
  ): { isValid: true; detectedFormat: 'pdf' | 'docx' } {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new ResumeValidationError('Uploaded resume file is empty.', 'EMPTY_DOCUMENT');
    }

    if (fileBuffer.length > this.limits.maxFileSizeBytes) {
      throw new ResumeValidationError(
        `Resume file exceeds maximum allowed size of ${Math.round(this.limits.maxFileSizeBytes / (1024 * 1024))}MB.`,
        'FILE_TOO_LARGE'
      );
    }

    // 1. Extension validation
    const ext = path.extname(originalFilename || '').toLowerCase();
    if (!this.limits.allowedExtensions.includes(ext)) {
      throw new ResumeValidationError(
        `Unsupported file extension: '${ext}'. Supported extensions: ${this.limits.allowedExtensions.join(', ')}`,
        'INVALID_FILE_TYPE'
      );
    }

    // 2. MIME type check
    const normalizedMime = (declaredMimeType || '').toLowerCase().trim();
    if (!this.limits.allowedMimeTypes.includes(normalizedMime)) {
      throw new ResumeValidationError(
        `Unsupported MIME type: '${declaredMimeType}'. Expected PDF or DOCX.`,
        'INVALID_FILE_TYPE'
      );
    }

    // 3. Binary Magic Byte Validation
    // PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    // DOCX (ZIP archive) magic bytes: PK (0x50, 0x4B, 0x03, 0x04)
    if (ext === '.pdf') {
      const isPdfHeader =
        fileBuffer.length >= 5 &&
        fileBuffer[0] === 0x25 && // %
        fileBuffer[1] === 0x50 && // P
        fileBuffer[2] === 0x44 && // D
        fileBuffer[3] === 0x46 && // F
        fileBuffer[4] === 0x2d;   // -

      if (!isPdfHeader) {
        throw new ResumeValidationError(
          'File signature does not match valid PDF format (magic bytes mismatch).',
          'INVALID_FILE_SIGNATURE'
        );
      }

      // Check for executable or script markers disguised in PDF
      const headerSample = fileBuffer.slice(0, 1024).toString('utf-8', 0, 1024);
      if (headerSample.includes('<script') || headerSample.includes('<?php') || headerSample.includes('eval(')) {
        throw new ResumeValidationError(
          'File contains suspicious script payload.',
          'MALFORMED_DOCUMENT'
        );
      }

      return { isValid: true, detectedFormat: 'pdf' };
    }

    if (ext === '.docx') {
      const isZipHeader =
        fileBuffer.length >= 4 &&
        fileBuffer[0] === 0x50 && // P
        fileBuffer[1] === 0x4b && // K
        (fileBuffer[2] === 0x03 || fileBuffer[2] === 0x05 || fileBuffer[2] === 0x07) &&
        (fileBuffer[3] === 0x04 || fileBuffer[3] === 0x06 || fileBuffer[3] === 0x08);

      if (!isZipHeader) {
        throw new ResumeValidationError(
          'File signature does not match valid DOCX format (magic bytes mismatch).',
          'INVALID_FILE_SIGNATURE'
        );
      }

      return { isValid: true, detectedFormat: 'docx' };
    }

    throw new ResumeValidationError('Unsupported resume document format.', 'INVALID_FILE_TYPE');
  }
}

export const resumeValidationService = new ResumeValidationService();
