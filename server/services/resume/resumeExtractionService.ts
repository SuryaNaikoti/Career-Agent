/**
 * Document Extraction Service
 * Module 04: Resume Intelligence
 * 
 * Extracts raw and normalized text from PDF and DOCX documents.
 * Preserves page boundaries and detects scanned / image-only PDFs.
 */

import { createRequire } from 'module';
import { ExtractedDocument, DocumentSection, DEFAULT_RESUME_LIMITS } from './resumeTypes.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

export class ResumeExtractionError extends AppError {
  public readonly code: string;
  constructor(message: string, code = 'TEXT_EXTRACTION_FAILED', statusCode = 422) {
    super(message, statusCode, true, { code });
    this.name = code;
    this.code = code;
  }
}

export class ResumeExtractionService {
  /**
   * Main entry point to extract text and structure from a validated file buffer
   */
  public async extractDocument(
    fileBuffer: Buffer,
    format: 'pdf' | 'docx'
  ): Promise<ExtractedDocument> {
    if (format === 'pdf') {
      return this.extractPdf(fileBuffer);
    } else if (format === 'docx') {
      return this.extractDocx(fileBuffer);
    } else {
      throw new ResumeExtractionError(`Unsupported format for extraction: ${format}`, 'INVALID_FILE_TYPE');
    }
  }

  /**
   * PDF text extraction with page separation and scanned document detection
   */
  private async extractPdf(fileBuffer: Buffer): Promise<ExtractedDocument> {
    try {
      const pageTexts: Array<{ pageNumber: number; text: string }> = [];
      let currentPage = 1;

      // Custom pager to preserve page boundaries
      const options = {
        pagerender: function (pageData: any) {
          return pageData.getTextContent().then(function (textContent: any) {
            let lastY: number | null = null;
            let text = '';
            for (const item of textContent.items) {
              if (lastY === item.transform[5] || lastY === null) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            pageTexts.push({ pageNumber: currentPage++, text });
            return text;
          });
        },
      };

      const data = await (pdfParse as any)(fileBuffer, options);

      const totalPages = data.numpages || pageTexts.length || 1;
      const rawText = data.text || '';
      const warnings: string[] = [];

      // Check max pages limit
      if (totalPages > DEFAULT_RESUME_LIMITS.maxPages) {
        warnings.push(`Document exceeds recommended ${DEFAULT_RESUME_LIMITS.maxPages} pages (detected ${totalPages} pages). Processing first ${DEFAULT_RESUME_LIMITS.maxPages} pages.`);
      }

      // Check if text is suspiciously empty or contains almost no alphanumeric characters
      const cleanAlphaNumeric = rawText.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanAlphaNumeric.length < 50) {
        // Scanned / Image-only PDF detection
        throw new ResumeExtractionError(
          'Document appears to be a scanned image or contains no selectable text. OCR is required.',
          'OCR_REQUIRED'
        );
      }

      // Normalize text
      const normalizedText = this.normalizeExtractedText(rawText);

      if (normalizedText.length > DEFAULT_RESUME_LIMITS.maxExtractedTextChars) {
        warnings.push('Extracted text exceeded maximum allowed length and was truncated safely.');
      }

      const boundedText = normalizedText.slice(0, DEFAULT_RESUME_LIMITS.maxExtractedTextChars);
      const sections = this.detectSections(boundedText);

      return {
        text: rawText,
        normalizedText: boundedText,
        pageCount: totalPages,
        pages: pageTexts.length > 0 ? pageTexts : [{ pageNumber: 1, text: boundedText }],
        sections,
        warnings,
        isScannedOrImageOnly: false,
      };
    } catch (err: any) {
      if (err instanceof ResumeExtractionError) {
        throw err;
      }
      logger.error('Failed to parse PDF document', { error: err?.message });
      throw new ResumeExtractionError(`Failed to parse PDF document: ${err?.message || 'Corrupted file'}`, 'MALFORMED_DOCUMENT');
    }
  }

  /**
   * DOCX text extraction
   */
  private async extractDocx(fileBuffer: Buffer): Promise<ExtractedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const rawText = result.value || '';
      const warnings: string[] = result.messages.map((m: any) => m.message);

      const cleanAlphaNumeric = rawText.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanAlphaNumeric.length < 50) {
        throw new ResumeExtractionError(
          'Document appears empty or contains no readable text.',
          'EMPTY_DOCUMENT'
        );
      }

      const normalizedText = this.normalizeExtractedText(rawText);
      const boundedText = normalizedText.slice(0, DEFAULT_RESUME_LIMITS.maxExtractedTextChars);
      const sections = this.detectSections(boundedText);

      return {
        text: rawText,
        normalizedText: boundedText,
        pageCount: 1, // Word documents do not have explicit physical page counts in raw text
        pages: [{ pageNumber: 1, text: boundedText }],
        sections,
        warnings,
        isScannedOrImageOnly: false,
      };
    } catch (err: any) {
      if (err instanceof ResumeExtractionError) {
        throw err;
      }
      logger.error('Failed to parse DOCX document', { error: err?.message });
      throw new ResumeExtractionError(`Failed to parse DOCX document: ${err?.message || 'Corrupted file'}`, 'MALFORMED_DOCUMENT');
    }
  }

  /**
   * Normalizes whitespace, carriage returns, and control characters while preserving words
   */
  public normalizeExtractedText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Heuristic Section Detector
   * Organizes source text without inventing any facts or hallucinating details.
   */
  public detectSections(text: string): DocumentSection[] {
    const sectionKeywords: Record<string, RegExp> = {
      SUMMARY: /^(professional\s+summary|summary|profile|about\s+me|career\s+objective)\b/im,
      EXPERIENCE: /^(work\s+experience|professional\s+experience|experience|employment\s+history|work\s+history)\b/im,
      EDUCATION: /^(education|academic\s+background|academic\s+qualifications|degrees)\b/im,
      SKILLS: /^(skills|technical\s+skills|core\s+competencies|technologies|tools)\b/im,
      PROJECTS: /^(projects|personal\s+projects|key\s+projects)\b/im,
      CERTIFICATIONS: /^(certifications|licenses|credentials|courses)\b/im,
      ACHIEVEMENTS: /^(achievements|awards|honors|accomplishments)\b/im,
      LANGUAGES: /^(languages|language\s+proficiency)\b/im,
    };

    const lines = text.split('\n');
    const sections: DocumentSection[] = [];
    let currentSection: { type: string; title: string; lines: string[]; startChar: number } | null = null;
    let runningCharCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      let matchedType: string | null = null;

      if (trimmed.length > 2 && trimmed.length < 50) {
        for (const [secType, regex] of Object.entries(sectionKeywords)) {
          if (regex.test(trimmed)) {
            matchedType = secType;
            break;
          }
        }
      }

      if (matchedType) {
        if (currentSection) {
          const rawSecText = currentSection.lines.join('\n');
          sections.push({
            type: currentSection.type,
            title: currentSection.title,
            rawText: rawSecText,
            startChar: currentSection.startChar,
            endChar: currentSection.startChar + rawSecText.length,
          });
        }
        currentSection = {
          type: matchedType,
          title: trimmed,
          lines: [],
          startChar: runningCharCount,
        };
      } else {
        if (currentSection) {
          currentSection.lines.push(line);
        }
      }

      runningCharCount += line.length + 1;
    }

    if (currentSection) {
      const rawSecText = currentSection.lines.join('\n');
      sections.push({
        type: currentSection.type,
        title: currentSection.title,
        rawText: rawSecText,
        startChar: currentSection.startChar,
        endChar: currentSection.startChar + rawSecText.length,
      });
    }

    return sections;
  }
}

export const resumeExtractionService = new ResumeExtractionService();
