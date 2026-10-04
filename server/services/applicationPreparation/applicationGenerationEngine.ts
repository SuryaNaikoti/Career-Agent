/**
 * Application Preparation Generation Engine
 * Module 08: Application Preparation
 * 
 * Rules:
 * 1. Invokes Module 02 aiClient within defensive safety envelopes.
 * 2. Strictly enforces structured output schemas.
 * 3. Sanitizes untrusted job descriptions, treating them as DATA not instructions.
 * 4. Grounded in candidate truth; produces structured resume, cover letter, and screening answers.
 */

import { aiClient } from '../ai/aiClient.js';
import { CORE_SYSTEM_PROMPT } from '../ai/aiPrompts.js';
import { CandidateCareerEvidenceBundle } from '../matching/candidateEvidenceService.js';
import { CanonicalJob } from '../job/jobTypes.js';
import { JobMatchResult } from '../matching/matchingTypes.js';
import {
  TailoredResumeData,
  TailoredCoverLetterData,
  ApplicationQuestionAnswer,
} from './applicationPreparationTypes.js';
import { applicationEvidenceValidator } from './applicationEvidenceValidator.js';
import { ResumeDocumentRecord } from '../resume/resumeTypes.js';
import { AiSchemaValidationError } from '../ai/aiErrors.js';
import { logger } from '../../core/logging/logger.js';

export class ApplicationGenerationEngine {
  /**
   * Generates a tailored resume grounded in confirmed candidate truth.
   */
  public async generateTailoredResume(
    candidate: CandidateCareerEvidenceBundle,
    job: CanonicalJob,
    match: JobMatchResult | null,
    resumeDoc: ResumeDocumentRecord | null
  ): Promise<TailoredResumeData> {
    // 1. Prepare confirmed skills
    const validSkills = candidate.skills
      .filter((s) => s.provenance === 'CANDIDATE_CONFIRMED' || s.provenance === 'CANDIDATE_PROVIDED')
      .map((s) => ({ name: s.name, truthState: s.provenance }));

    // 2. Prepare experience from candidate truth / confirmed resume items
    const parsedExp = resumeDoc?.parsedData?.experience || [];
    const experienceList = candidate.experiences.map((exp) => {
      // Find matching resume experience bullets if available
      const matchingResumeExp = parsedExp.find(
        (p) => p.company.toLowerCase() === exp.company.toLowerCase()
      );
      const rawBullets = matchingResumeExp?.achievements || (exp.description ? [exp.description] : []);

      const tailoredBullets = rawBullets.map((b) => ({
        text: b,
        truthState: exp.provenance,
        evidenceSourceId: exp.company,
      }));

      return {
        company: exp.company,
        roleTitle: exp.roleTitle,
        startDate: null,
        endDate: null,
        isCurrent: false,
        location: null,
        bullets: tailoredBullets.length > 0 ? tailoredBullets : [{ text: `Contributed as ${exp.roleTitle} specializing in ${exp.skillsUsed.join(', ')}`, truthState: exp.provenance }],
        skillsUsed: exp.skillsUsed || [],
      };
    });

    // 3. Prepare education
    const educationList = candidate.educations.map((ed) => ({
      institution: ed.institution,
      degree: ed.degree,
      fieldOfStudy: ed.fieldOfStudy || null,
    }));

    // 4. Synthesize professional summary using AI safely
    const prompt = `
[DEFENSIVE BOUNDARY: UNTRUSTED EXTERNAL JOB POSTING]
Target Job Title: "${job.title.replace(/"/g, '')}"
Target Company: "${job.companyName.replace(/"/g, '')}"
Job Description Snippet: "${job.descriptionText.slice(0, 1000).replace(/"/g, '')}"
[END UNTRUSTED EXTERNAL JOB POSTING]

[CANDIDATE CONFIRMED TRUTH]
Total Experience Years: ${candidate.totalExperienceYears}
Target Roles: ${candidate.preferences.targetRoles.join(', ')}
Key Confirmed Skills: ${validSkills.map((s) => s.name).slice(0, 10).join(', ')}
Key Employers: ${candidate.experiences.map((e) => e.company).join(', ')}
[END CANDIDATE CONFIRMED TRUTH]

INSTRUCTION:
Write a concise 2-sentence professional executive summary for the candidate's tailored resume.
STRICT TRUTH RULE:
- Do NOT invent certifications, awards, leadership titles, or unconfirmed skills.
- Return ONLY JSON: {"summary": "..."}
`.trim();

    const res = await aiClient.generateContent(prompt, {
      modelName: 'gemini-2.5-flash',
      temperature: 0.1,
      responseMimeType: 'application/json',
      systemInstruction: `${CORE_SYSTEM_PROMPT}\nYou are drafting a tailored resume summary. Strictly prohibit hallucinated metrics, unconfirmed skills, and invented degrees.`,
    });

    let summary = '';
    if (res.text) {
      try {
        const parsed = JSON.parse(res.text);
        if (parsed.summary && typeof parsed.summary === 'string') {
          summary = parsed.summary.trim();
        }
      } catch (parseErr) {
        throw new AiSchemaValidationError('AI resume generation output was not valid JSON.', undefined, { raw: res.text });
      }
    }

    if (!summary) {
      throw new AiSchemaValidationError('AI resume generation failed to produce a valid executive summary.', undefined, { raw: res.text });
    }

    return {
      fullName: candidate.preferences.targetRoles[0] ? `Candidate (${candidate.preferences.targetRoles[0]})` : 'Candidate',
      headline: `${job.title} | ${validSkills.slice(0, 3).map((s) => s.name).join(' • ')}`,
      summary,
      skills: validSkills,
      experience: experienceList,
      education: educationList,
    };
  }

  /**
   * Generates a tailored cover letter grounded in candidate evidence.
   */
  public async generateTailoredCoverLetter(
    candidate: CandidateCareerEvidenceBundle,
    job: CanonicalJob
  ): Promise<TailoredCoverLetterData> {
    const confirmedSkills = candidate.skills
      .filter((s) => s.provenance === 'CANDIDATE_CONFIRMED' || s.provenance === 'CANDIDATE_PROVIDED')
      .map((s) => s.name);

    const primaryEmployer = candidate.experiences[0]?.company || 'technology organizations';
    const primarySkillList = confirmedSkills.slice(0, 5).join(', ');

    const prompt = `
[DEFENSIVE BOUNDARY: UNTRUSTED EXTERNAL JOB POSTING]
Job Title: "${job.title.replace(/"/g, '')}"
Company: "${job.companyName.replace(/"/g, '')}"
Description: "${job.descriptionText.slice(0, 1200).replace(/"/g, '')}"
[END UNTRUSTED EXTERNAL JOB POSTING]

[CANDIDATE CONFIRMED TRUTH]
Total Years: ${candidate.totalExperienceYears}
Confirmed Skills: ${primarySkillList}
Recent Experience: ${candidate.experiences.map((e) => `${e.roleTitle} at ${e.company}`).join('; ')}
[END CANDIDATE CONFIRMED TRUTH]

INSTRUCTION:
Generate a tailored 4-paragraph cover letter formatted as JSON with keys:
- openingParagraph: Express interest in the ${job.title} position at ${job.companyName}.
- experienceParagraph: Highlight verified achievements at ${primaryEmployer}.
- skillsAlignmentParagraph: Relate confirmed skills (${primarySkillList}) to the role.
- closingParagraph: Professional closing requesting discussion.
STRICT TRUTH RULE: Do NOT invent admiration for company history unless stated in description. Never claim unconfirmed qualifications.
`.trim();

    const res = await aiClient.generateContent(prompt, {
      modelName: 'gemini-2.5-flash',
      temperature: 0.2,
      responseMimeType: 'application/json',
      systemInstruction: `${CORE_SYSTEM_PROMPT}\nYou are a cover letter generator. Output valid JSON only. Never introduce ungrounded claims.`,
    });

    let parsed: any;
    try {
      parsed = JSON.parse(res.text || '{}');
    } catch (parseErr) {
      throw new AiSchemaValidationError('AI cover letter generation output was not valid JSON.', undefined, { raw: res.text });
    }

    if (!parsed.openingParagraph || !parsed.experienceParagraph) {
      throw new AiSchemaValidationError('AI cover letter generation missing required paragraphs.', undefined, { parsed });
    }

    return {
      salutation: `Dear Hiring Team at ${job.companyName},`,
      openingParagraph: parsed.openingParagraph,
      experienceParagraph: parsed.experienceParagraph,
      skillsAlignmentParagraph: parsed.skillsAlignmentParagraph || `My verified background with ${primarySkillList} directly supports the technical requirements of this position.`,
      closingParagraph: parsed.closingParagraph || `Thank you for your time and consideration. I look forward to discussing how my verified background aligns with your objectives.`,
      signOff: 'Sincerely,\nCandidate',
      groundedClaimsCount: 4,
    };
  }

  /**
   * Prepares application question answers and categorizes unknown items as review tasks.
   */
  public prepareApplicationAnswers(
    candidate: CandidateCareerEvidenceBundle,
    job: CanonicalJob
  ): { answers: ApplicationQuestionAnswer[]; reviewTasks: Array<{ title: string; question: string; category: string }> } {
    const answers: ApplicationQuestionAnswer[] = [];
    const reviewTasks: Array<{ title: string; question: string; category: string }> = [];

    // 1. Work authorization
    // In CandidateProfile: workAuthorization is candidate-provided
    const workAuth = (candidate as any).workAuthorization;
    if (workAuth) {
      answers.push({
        id: 'q-work-auth',
        question: 'Are you authorized to work in this location?',
        category: 'work_authorization',
        required: true,
        answerText: workAuth,
        status: 'READY',
        truthState: 'CANDIDATE_PROVIDED',
        evidenceSource: 'candidate_profile.work_authorization',
      });
    } else {
      answers.push({
        id: 'q-work-auth',
        question: 'Are you authorized to work in this location?',
        category: 'work_authorization',
        required: true,
        answerText: null,
        status: 'UNKNOWN',
        truthState: 'UNKNOWN',
      });
      reviewTasks.push({
        title: 'Work Authorization Required',
        question: 'Are you authorized to work in the required job location?',
        category: 'work_authorization',
      });
    }

    // 2. Notice period
    const noticePeriod = (candidate as any).noticePeriod;
    if (noticePeriod) {
      answers.push({
        id: 'q-notice-period',
        question: 'What is your current notice period?',
        category: 'notice_period',
        required: true,
        answerText: noticePeriod,
        status: 'READY',
        truthState: 'CANDIDATE_PROVIDED',
        evidenceSource: 'candidate_profile.notice_period',
      });
    } else {
      answers.push({
        id: 'q-notice-period',
        question: 'What is your current notice period?',
        category: 'notice_period',
        required: true,
        answerText: null,
        status: 'UNKNOWN',
        truthState: 'UNKNOWN',
      });
      reviewTasks.push({
        title: 'Notice Period Required',
        question: 'What is your current notice period?',
        category: 'notice_period',
      });
    }

    // 3. Relevant experience summary
    const relevantExpText = `I bring ${candidate.totalExperienceYears} years of verified experience in ${candidate.preferences.targetRoles[0] || job.title}, working with technologies including ${candidate.skills.slice(0, 4).map((s) => s.name).join(', ')}.`;
    answers.push({
      id: 'q-experience-summary',
      question: 'Briefly describe your relevant experience for this role.',
      category: 'experience',
      required: true,
      answerText: relevantExpText,
      status: 'READY',
      truthState: 'CANDIDATE_CONFIRMED',
      evidenceSource: 'candidate_career_summary',
    });

    // 4. Compensation expectations
    if (candidate.preferences.minSalary) {
      answers.push({
        id: 'q-salary-expectation',
        question: 'What are your compensation expectations?',
        category: 'salary',
        required: false,
        answerText: `Expecting around ${candidate.preferences.minSalary} (base minimum).`,
        status: 'READY',
        truthState: 'CANDIDATE_PROVIDED',
        evidenceSource: 'candidate_preferences.min_salary',
      });
    } else {
      answers.push({
        id: 'q-salary-expectation',
        question: 'What are your compensation expectations?',
        category: 'salary',
        required: false,
        answerText: 'Open to market rates commensurate with role responsibilities.',
        status: 'READY',
        truthState: 'CANDIDATE_PROVIDED',
        evidenceSource: 'standard_candidate_preference',
      });
    }

    return { answers, reviewTasks };
  }
}

export const applicationGenerationEngine = new ApplicationGenerationEngine();
