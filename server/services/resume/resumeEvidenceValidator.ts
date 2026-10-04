/**
 * Resume Evidence & Hallucination Validator
 * Module 04: Resume Intelligence
 * 
 * Verifies that structured facts returned by the AI parser are genuinely traceable
 * to the source document text. Flags or demotes fabricated facts to UNKNOWN.
 */

import {
  StructuredResumeData,
  ExtractedSkillItem,
  ExtractedExperienceItem,
  ExtractedEducationItem,
  ExtractedCertificationItem,
} from './resumeTypes.js';
import { logger } from '../../core/logging/logger.js';

export interface EvidenceValidationResult {
  validatedData: StructuredResumeData;
  totalClaimsCount: number;
  supportedClaimsCount: number;
  flaggedClaimsCount: number;
  warnings: string[];
}

export class ResumeEvidenceValidator {
  /**
   * Validates all extracted claims against the full normalized resume text and associates
   * page-level and section-level provenance.
   */
  public validate(
    parsedData: StructuredResumeData,
    normalizedResumeText: string,
    documentContext?: {
      pages?: Array<{ pageNumber: number; text: string }>;
      sections?: Array<{ type: string; title: string; rawText: string }>;
    }
  ): EvidenceValidationResult {
    const textLower = normalizedResumeText.toLowerCase();
    const warnings: string[] = [];
    let totalClaimsCount = 0;
    let supportedClaimsCount = 0;
    let flaggedClaimsCount = 0;

    const pages = documentContext?.pages || [];
    const sections = documentContext?.sections || [];

    // Helper: find page number where text/token appears
    const resolvePageAndSection = (
      snippet?: string | null,
      token?: string | null
    ): { page: number | null; section: string | null } => {
      let foundPage: number | null = null;
      let foundSection: string | null = null;

      const target = (snippet || token || '').trim().toLowerCase();
      if (!target) return { page: null, section: null };

      // Find page
      for (const p of pages) {
        if (p.text.toLowerCase().includes(target) || (token && p.text.toLowerCase().includes(token.toLowerCase()))) {
          foundPage = p.pageNumber;
          break;
        }
      }

      // Find section
      for (const s of sections) {
        if (s.rawText.toLowerCase().includes(target) || (token && s.rawText.toLowerCase().includes(token.toLowerCase()))) {
          foundSection = s.type;
          break;
        }
      }

      return { page: foundPage || (pages.length === 1 ? 1 : null), section: foundSection };
    };

    // Helper: fuzzy search for snippet or tokens in resume text
    const verifyInSource = (snippet?: string | null, tokenToFind?: string | null): boolean => {
      if (tokenToFind && tokenToFind.trim()) {
        const cleanToken = tokenToFind.trim().toLowerCase();
        const escaped = cleanToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tokenRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (tokenRegex.test(normalizedResumeText) || textLower.includes(cleanToken)) {
          return true;
        }
      }
      if (snippet && snippet.trim()) {
        const cleanSnippet = snippet.trim().toLowerCase();
        if (textLower.includes(cleanSnippet.slice(0, 30))) {
          return true;
        }
      }
      return false;
    };

    // 1. Validate Skills
    const validatedSkills: ExtractedSkillItem[] = [];
    for (const skill of parsedData.skills || []) {
      totalClaimsCount++;
      const isPresent = verifyInSource(skill.evidence?.textSnippet, skill.name);

      if (isPresent) {
        supportedClaimsCount++;
        const resolved = resolvePageAndSection(skill.evidence?.textSnippet, skill.name);
        validatedSkills.push({
          ...skill,
          truthState: 'AI_SUGGESTED',
          evidence: {
            type: 'RESUME',
            page: skill.evidence?.page ?? resolved.page,
            section: skill.evidence?.section ?? resolved.section ?? 'SKILLS',
            textSnippet: skill.evidence?.textSnippet || `Mention of ${skill.name}`,
          },
        });
      } else {
        flaggedClaimsCount++;
        warnings.push(`Skill '${skill.name}' was extracted by AI but could not be located in source resume text.`);
        validatedSkills.push({
          ...skill,
          proficiency: 'UNKNOWN',
          truthState: 'UNKNOWN',
        });
      }
    }

    // 2. Validate Experience
    const validatedExperience: ExtractedExperienceItem[] = [];
    for (const exp of parsedData.experience || []) {
      totalClaimsCount++;
      const companyPresent = verifyInSource(exp.evidence?.textSnippet, exp.company);
      const rolePresent = verifyInSource(exp.evidence?.textSnippet, exp.roleTitle);

      if (companyPresent || rolePresent) {
        supportedClaimsCount++;
        const resolved = resolvePageAndSection(exp.evidence?.textSnippet, exp.company);
        validatedExperience.push({
          ...exp,
          truthState: 'AI_SUGGESTED',
          evidence: {
            type: 'RESUME',
            page: exp.evidence?.page ?? resolved.page,
            section: exp.evidence?.section ?? resolved.section ?? 'EXPERIENCE',
            textSnippet: exp.evidence?.textSnippet || `${exp.roleTitle} at ${exp.company}`,
          },
        });
      } else {
        flaggedClaimsCount++;
        warnings.push(`Experience '${exp.roleTitle} at ${exp.company}' not verified in resume text.`);
        validatedExperience.push({
          ...exp,
          truthState: 'UNKNOWN',
        });
      }
    }

    // 3. Validate Education
    const validatedEducation: ExtractedEducationItem[] = [];
    for (const edu of parsedData.education || []) {
      totalClaimsCount++;
      const instPresent = verifyInSource(edu.evidence?.textSnippet, edu.institution);

      if (instPresent) {
        supportedClaimsCount++;
        const resolved = resolvePageAndSection(edu.evidence?.textSnippet, edu.institution);
        validatedEducation.push({
          ...edu,
          truthState: 'AI_SUGGESTED',
          evidence: {
            type: 'RESUME',
            page: edu.evidence?.page ?? resolved.page,
            section: edu.evidence?.section ?? resolved.section ?? 'EDUCATION',
            textSnippet: edu.evidence?.textSnippet || `${edu.degree} from ${edu.institution}`,
          },
        });
      } else {
        flaggedClaimsCount++;
        warnings.push(`Education entry '${edu.institution}' not found in resume text.`);
        validatedEducation.push({
          ...edu,
          truthState: 'UNKNOWN',
        });
      }
    }

    // 4. Validate Certifications
    const validatedCerts: ExtractedCertificationItem[] = [];
    for (const cert of parsedData.certifications || []) {
      totalClaimsCount++;
      const certPresent = verifyInSource(cert.evidence?.textSnippet, cert.name);

      if (certPresent) {
        supportedClaimsCount++;
        const resolved = resolvePageAndSection(cert.evidence?.textSnippet, cert.name);
        validatedCerts.push({
          ...cert,
          truthState: 'AI_SUGGESTED',
          evidence: {
            type: 'RESUME',
            page: cert.evidence?.page ?? resolved.page,
            section: cert.evidence?.section ?? resolved.section ?? 'CERTIFICATIONS',
            textSnippet: cert.evidence?.textSnippet || cert.name,
          },
        });
      } else {
        flaggedClaimsCount++;
        warnings.push(`Certification '${cert.name}' not found in resume text.`);
        validatedCerts.push({
          ...cert,
          truthState: 'UNKNOWN',
        });
      }
    }

    const validatedData: StructuredResumeData = {
      ...parsedData,
      skills: validatedSkills,
      experience: validatedExperience,
      education: validatedEducation,
      certifications: validatedCerts,
      warnings: [...(parsedData.warnings || []), ...warnings],
    };

    return {
      validatedData,
      totalClaimsCount,
      supportedClaimsCount,
      flaggedClaimsCount,
      warnings,
    };
  }
}

export const resumeEvidenceValidator = new ResumeEvidenceValidator();
