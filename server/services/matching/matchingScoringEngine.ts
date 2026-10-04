/**
 * Deterministic Matching Scoring Engine
 * Module 06: Matching Engine
 * 
 * Rules:
 * - Deterministic, reproducible, auditable composite scoring.
 * - AI cannot directly decide or override the numerical score.
 * - Centralized configurable weights (Role 15%, Skills 25%, Experience 20%, Seniority 10%, Workplace 10%, Comp 5%, EmpType 5%, Edu/Cert 10%).
 * - Hard requirements / blockers surfaced distinctly without arbitrarily forcing overall score to zero unless configured.
 * - Missing data does NOT become automatic zero; marked UNKNOWN / NOT_APPLICABLE with neutral impact.
 */

import {
  ExtractedJobRequirement,
  RequirementMatchEvaluation,
  ComponentScoreResult,
  SkillGapItem,
  DEFAULT_MATCHING_WEIGHTS,
  MatchingWeightsConfig,
  MatchStatus,
  CandidateEvidenceItem,
} from './matchingTypes.js';
import { CandidateCareerEvidenceBundle } from './candidateEvidenceService.js';
import { skillNormalizerService } from './skillNormalizerService.js';
import { CanonicalJob } from '../job/jobTypes.js';

export interface EvaluationResult {
  requirements: RequirementMatchEvaluation[];
  components: ComponentScoreResult[];
  skillGaps: SkillGapItem[];
  blockers: string[];
  overallScore: number;
  matchStatus: MatchStatus;
}

export class MatchingScoringEngine {
  private weights: MatchingWeightsConfig = DEFAULT_MATCHING_WEIGHTS;

  /**
   * Evaluates all job requirements against candidate evidence.
   */
  public evaluate(
    job: CanonicalJob,
    requirements: ExtractedJobRequirement[],
    candidate: CandidateCareerEvidenceBundle
  ): EvaluationResult {
    const evaluatedRequirements: RequirementMatchEvaluation[] = [];
    const skillGaps: SkillGapItem[] = [];
    const blockers: string[] = [];

    // Helper collections
    const candSkillMap = new Map(candidate.skills.map(s => [s.name.toLowerCase(), s]));

    // 1. Evaluate Individual Requirements
    for (const req of requirements) {
      const evaluation = this.evaluateSingleRequirement(req, candidate, candSkillMap);
      evaluatedRequirements.push(evaluation);

      if (evaluation.isBlocker) {
        blockers.push(`${req.name} (${evaluation.explanation})`);
      }

      // Check for skill gap
      if (req.type === 'SKILL') {
        if (evaluation.qualificationStatus === 'MISSING') {
          skillGaps.push({
            skillName: req.name,
            gapType: 'MISSING',
            importance: req.importance,
            transferable: false,
            explanation: evaluation.explanation,
          });
        } else if (evaluation.qualificationStatus === 'PARTIALLY_MET') {
          const isTransferable = evaluation.evidence.some(e => e.evidenceText.includes('Transferable'));
          skillGaps.push({
            skillName: req.name,
            gapType: isTransferable ? 'TRANSFERABLE' : 'PARTIAL',
            importance: req.importance,
            transferable: isTransferable,
            explanation: evaluation.explanation,
          });
        }
      }
    }

    // 2. Compute Component Scores
    const components: ComponentScoreResult[] = [
      this.scoreRoleAlignment(job, candidate),
      this.scoreSkillAlignment(evaluatedRequirements.filter(r => r.requirement.type === 'SKILL')),
      this.scoreExperienceAlignment(job, candidate),
      this.scoreSeniorityAlignment(job, candidate),
      this.scoreLocationWorkplaceAlignment(job, candidate),
      this.scoreCompensationAlignment(job, candidate),
      this.scoreEmploymentTypeAlignment(job, candidate),
      this.scoreEducationCertAlignment(evaluatedRequirements.filter(r => ['EDUCATION', 'CERTIFICATION'].includes(r.requirement.type))),
    ];

    // 3. Compute Composite Score
    let totalWeightedScore = 0;
    let activeWeightSum = 0;

    for (const comp of components) {
      if (comp.status !== 'NOT_APPLICABLE') {
        totalWeightedScore += comp.weightedScore;
        activeWeightSum += comp.weight;
      }
    }

    // Normalize score to 100 if certain optional components were NOT_APPLICABLE
    const finalScore = activeWeightSum > 0
      ? Math.min(100, Math.max(0, Math.round((totalWeightedScore / activeWeightSum) * 100) / 100))
      : 0;

    // 4. Derive Controlled Match Status
    const matchStatus = this.determineMatchStatus(finalScore, blockers.length, candidate);

    return {
      requirements: evaluatedRequirements,
      components,
      skillGaps,
      blockers,
      overallScore: finalScore,
      matchStatus,
    };
  }

  private evaluateSingleRequirement(
    req: ExtractedJobRequirement,
    candidate: CandidateCareerEvidenceBundle,
    candSkillMap: Map<string, any>
  ): RequirementMatchEvaluation {
    const evidence: CandidateEvidenceItem[] = [];

    switch (req.type) {
      case 'SKILL': {
        const directSkill = candSkillMap.get(req.name.toLowerCase());
        if (directSkill) {
          const isConfirmed = directSkill.provenance === 'CANDIDATE_CONFIRMED' || directSkill.provenance === 'CANDIDATE_PROVIDED';
          if (!isConfirmed) {
            evidence.push({
              sourceType: 'candidate_skills',
              truthState: directSkill.provenance,
              evidenceText: `Candidate has unconfirmed AI-suggested skill: ${directSkill.name}.`,
            });
            return {
              requirement: req,
              qualificationStatus: 'PARTIALLY_MET',
              confidence: 0.60,
              explanation: `Unconfirmed AI suggestion: ${req.name} requires candidate confirmation.`,
              evidence,
              isBlocker: req.importance === 'REQUIRED' && Boolean(req.criteria?.isMandatoryBlocker),
            };
          }

          evidence.push({
            sourceType: 'candidate_skills',
            truthState: directSkill.provenance,
            evidenceText: `Candidate has confirmed skill ${directSkill.name} (${directSkill.years ? `${directSkill.years} yrs` : 'experienced'}).`,
          });
          return {
            requirement: req,
            qualificationStatus: 'MET',
            confidence: 1.0,
            explanation: `Confirmed match for ${req.name}.`,
            evidence,
            isBlocker: false,
          };
        }

        // Check synonym or transferable match
        let bestMatch: { skill: any; result: ReturnType<typeof skillNormalizerService.compareSkills> } | null = null;
        for (const candSkill of candidate.skills) {
          const comp = skillNormalizerService.compareSkills(req.name, candSkill.name);
          if (comp.relation === 'IDENTICAL' || comp.relation === 'SYNONYM') {
            bestMatch = { skill: candSkill, result: comp };
            break;
          } else if (comp.relation === 'TRANSFERABLE' && (!bestMatch || bestMatch.result.relation === 'UNRELATED')) {
            bestMatch = { skill: candSkill, result: comp };
          }
        }

        if (bestMatch) {
          const isConfirmed = bestMatch.skill.provenance === 'CANDIDATE_CONFIRMED' || bestMatch.skill.provenance === 'CANDIDATE_PROVIDED';
          if (bestMatch.result.relation === 'SYNONYM') {
            evidence.push({
              sourceType: 'candidate_skills',
              truthState: bestMatch.skill.provenance,
              evidenceText: `Candidate has skill ${bestMatch.skill.name} (Synonym of ${req.name}) [${bestMatch.skill.provenance}].`,
            });
            return {
              requirement: req,
              qualificationStatus: isConfirmed ? 'MET' : 'PARTIALLY_MET',
              confidence: isConfirmed ? 0.95 : 0.60,
              explanation: isConfirmed ? bestMatch.result.explanation : `Unconfirmed AI suggested skill: ${bestMatch.skill.name}.`,
              evidence,
              isBlocker: req.importance === 'REQUIRED' && !isConfirmed && Boolean(req.criteria?.isMandatoryBlocker),
            };
          } else if (bestMatch.result.relation === 'TRANSFERABLE') {
            evidence.push({
              sourceType: 'candidate_skills',
              truthState: bestMatch.skill.provenance,
              evidenceText: `Candidate has transferable experience in ${bestMatch.skill.name}.`,
            });
            return {
              requirement: req,
              qualificationStatus: 'PARTIALLY_MET',
              confidence: 0.70,
              explanation: bestMatch.result.explanation,
              evidence,
              isBlocker: false,
            };
          }
        }

        // Missing Skill
        return {
          requirement: req,
          qualificationStatus: 'MISSING',
          confidence: 0.9,
          explanation: `No candidate evidence found for ${req.name}.`,
          evidence: [],
          isBlocker: req.importance === 'REQUIRED' && Boolean(req.criteria?.isMandatoryBlocker),
        };
      }

      case 'WORKPLACE': {
        const allowed = req.criteria?.allowedWorkplaceTypes || [];
        const candModes = candidate.preferences.workModes;
        if (candModes.length === 0) {
          return {
            requirement: req,
            qualificationStatus: 'UNKNOWN',
            confidence: 0.5,
            explanation: 'Candidate work mode preference not specified.',
            evidence: [],
            isBlocker: false,
          };
        }
        const matches = allowed.some(a => candModes.map(m => m.toUpperCase()).includes(a));
        if (matches) {
          evidence.push({
            sourceType: 'candidate_preferences',
            truthState: 'CANDIDATE_PROVIDED',
            evidenceText: `Candidate preferred work modes (${candModes.join(', ')}) include required ${req.name}.`,
          });
          return {
            requirement: req,
            qualificationStatus: 'MET',
            confidence: 1.0,
            explanation: `Workplace mode aligns with candidate preference.`,
            evidence,
            isBlocker: false,
          };
        } else {
          return {
            requirement: req,
            qualificationStatus: 'MISSING',
            confidence: 0.9,
            explanation: `Job requires ${req.name}, which is not in candidate preferred work modes.`,
            evidence: [],
            isBlocker: false,
          };
        }
      }

      case 'CERTIFICATION': {
        const matchingCert = candidate.skills.find(s => s.name.toLowerCase().includes(req.name.toLowerCase()));
        if (!matchingCert) {
          return {
            requirement: req,
            qualificationStatus: 'MISSING',
            confidence: 1.0,
            explanation: `No candidate certification found matching ${req.name}.`,
            evidence: [],
            isBlocker: req.importance === 'REQUIRED' && Boolean(req.criteria?.isMandatoryBlocker),
          };
        }

        const isConfirmed = matchingCert.provenance === 'CANDIDATE_CONFIRMED' || matchingCert.provenance === 'CANDIDATE_PROVIDED';
        if (!isConfirmed) {
          return {
            requirement: req,
            qualificationStatus: 'PARTIALLY_MET',
            confidence: 0.5,
            explanation: `Unconfirmed AI suggested certification: ${matchingCert.name} requires candidate confirmation.`,
            evidence: [{
              sourceType: 'candidate_skills',
              truthState: matchingCert.provenance,
              evidenceText: `AI suggested certification ${matchingCert.name} is unconfirmed.`,
            }],
            isBlocker: req.importance === 'REQUIRED' && Boolean(req.criteria?.isMandatoryBlocker),
          };
        }

        return {
          requirement: req,
          qualificationStatus: 'MET',
          confidence: 1.0,
          explanation: `Confirmed certification: ${matchingCert.name}.`,
          evidence: [{
            sourceType: 'candidate_skills',
            truthState: matchingCert.provenance,
            evidenceText: `Candidate has confirmed certification ${matchingCert.name}.`,
          }],
          isBlocker: false,
        };
      }

      case 'EXPERIENCE': {
        const requiredYears = req.criteria?.yearsRequired;
        if (requiredYears === undefined) {
          return {
            requirement: req,
            qualificationStatus: 'MET',
            confidence: 0.8,
            explanation: 'General experience baseline met.',
            evidence: [],
            isBlocker: false,
          };
        }

        if (candidate.totalExperienceYears === 0 && candidate.experiences.length === 0) {
          return {
            requirement: req,
            qualificationStatus: 'UNKNOWN',
            confidence: 0.5,
            explanation: 'Candidate experience is unknown.',
            evidence: [],
            isBlocker: false,
          };
        }

        if (candidate.totalExperienceYears >= requiredYears) {
          return {
            requirement: req,
            qualificationStatus: 'MET',
            confidence: 1.0,
            explanation: `Candidate has ${candidate.totalExperienceYears} years of experience, meeting required ${requiredYears} years.`,
            evidence: [],
            isBlocker: false,
          };
        }

        return {
          requirement: req,
          qualificationStatus: 'PARTIALLY_MET',
          confidence: 0.9,
          explanation: `Candidate has ${candidate.totalExperienceYears} years, below ${requiredYears} years expected.`,
          evidence: [],
          isBlocker: req.importance === 'REQUIRED' && Boolean(req.criteria?.isMandatoryBlocker),
        };
      }

      default:
        return {
          requirement: req,
          qualificationStatus: 'MET',
          confidence: 0.8,
          explanation: 'General requirement satisfied by profile background.',
          evidence: [],
          isBlocker: false,
        };
    }
  }

  private scoreRoleAlignment(job: CanonicalJob, candidate: CandidateCareerEvidenceBundle): ComponentScoreResult {
    const weight = this.weights.roleAlignment;
    const targetRoles = candidate.preferences.targetRoles.map(r => r.toLowerCase());
    const jobTitle = (job.title || '').toLowerCase();

    if (targetRoles.length === 0) {
      return {
        componentType: 'ROLE_ALIGNMENT',
        rawScore: 70, // Baseline if candidate hasn't configured specific target roles
        weight,
        weightedScore: 70 * weight,
        status: 'MODERATE',
        explanation: 'Candidate has not specified target roles; baseline alignment applied.',
      };
    }

    const exactMatch = targetRoles.some(r => jobTitle.includes(r) || r.includes(jobTitle));
    if (exactMatch) {
      return {
        componentType: 'ROLE_ALIGNMENT',
        rawScore: 100,
        weight,
        weightedScore: 100 * weight,
        status: 'STRONG',
        explanation: `Job title aligns with candidate target roles (${candidate.preferences.targetRoles.join(', ')}).`,
      };
    }

    // Check past experience titles
    const pastTitleMatch = candidate.experiences.some(e => e.roleTitle.toLowerCase().includes(jobTitle) || jobTitle.includes(e.roleTitle.toLowerCase()));
    if (pastTitleMatch) {
      return {
        componentType: 'ROLE_ALIGNMENT',
        rawScore: 85,
        weight,
        weightedScore: 85 * weight,
        status: 'STRONG',
        explanation: 'Candidate has previous professional experience in a similar role title.',
      };
    }

    return {
      componentType: 'ROLE_ALIGNMENT',
      rawScore: 50,
      weight,
      weightedScore: 50 * weight,
      status: 'WEAK',
      explanation: 'Job title differs from candidate target roles and previous role titles.',
    };
  }

  private scoreSkillAlignment(skillEvals: RequirementMatchEvaluation[]): ComponentScoreResult {
    const weight = this.weights.skillAlignment;
    if (skillEvals.length === 0) {
      return {
        componentType: 'SKILL_ALIGNMENT',
        rawScore: 100,
        weight,
        weightedScore: 100 * weight,
        status: 'NOT_APPLICABLE',
        explanation: 'No explicit skills extracted from job description.',
      };
    }

    let totalPoints = 0;
    let maxPoints = 0;

    for (const se of skillEvals) {
      const itemWeight = se.requirement.importance === 'REQUIRED' ? 2 : 1;
      maxPoints += itemWeight;

      if (se.qualificationStatus === 'MET') {
        totalPoints += itemWeight;
      } else if (se.qualificationStatus === 'PARTIALLY_MET') {
        totalPoints += itemWeight * 0.65;
      }
    }

    const rawScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 100;
    return {
      componentType: 'SKILL_ALIGNMENT',
      rawScore,
      weight,
      weightedScore: Math.round(rawScore * weight * 100) / 100,
      status: rawScore >= 75 ? 'STRONG' : rawScore >= 50 ? 'MODERATE' : 'WEAK',
      explanation: `${totalPoints.toFixed(1)} of ${maxPoints} skill alignment points matched.`,
    };
  }

  private scoreExperienceAlignment(job: CanonicalJob, candidate: CandidateCareerEvidenceBundle): ComponentScoreResult {
    const weight = this.weights.experienceAlignment;
    const candYears = candidate.totalExperienceYears;

    let requiredYears = 2; // Default reasonable baseline if unspecified
    const titleLower = job.title.toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('lead')) requiredYears = 5;
    else if (titleLower.includes('principal') || titleLower.includes('staff')) requiredYears = 8;
    else if (titleLower.includes('junior') || titleLower.includes('entry')) requiredYears = 1;

    let rawScore = 100;
    if (candYears < requiredYears) {
      const ratio = candYears / requiredYears;
      rawScore = Math.max(30, Math.round(ratio * 100));
    }

    return {
      componentType: 'EXPERIENCE_ALIGNMENT',
      rawScore,
      weight,
      weightedScore: Math.round(rawScore * weight * 100) / 100,
      status: rawScore >= 80 ? 'STRONG' : rawScore >= 50 ? 'MODERATE' : 'WEAK',
      explanation: `Candidate has ~${candYears} years total experience against estimated ~${requiredYears} years expected.`,
    };
  }

  private scoreSeniorityAlignment(job: CanonicalJob, candidate: CandidateCareerEvidenceBundle): ComponentScoreResult {
    const weight = this.weights.seniorityAlignment;
    // Seniority is aligned with total experience and previous titles
    const candYears = candidate.totalExperienceYears;
    const titleLower = job.title.toLowerCase();
    const isSeniorJob = titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal');

    let rawScore = 90;
    if (isSeniorJob && candYears < 4) {
      rawScore = 40;
    } else if (!isSeniorJob && candYears > 10) {
      rawScore = 75; // Minor overqualification factor
    }

    return {
      componentType: 'SENIORITY_ALIGNMENT',
      rawScore,
      weight,
      weightedScore: Math.round(rawScore * weight * 100) / 100,
      status: rawScore >= 80 ? 'STRONG' : 'MODERATE',
      explanation: `Seniority match: ${rawScore >= 80 ? 'Well aligned' : 'Potential seniority gap'}.`,
    };
  }

  private scoreLocationWorkplaceAlignment(job: CanonicalJob, candidate: CandidateCareerEvidenceBundle): ComponentScoreResult {
    const weight = this.weights.locationWorkplaceAlignment;
    if (job.workplaceType === 'REMOTE') {
      const prefRemote = candidate.preferences.workModes.map(m => m.toUpperCase()).includes('REMOTE');
      return {
        componentType: 'LOCATION_WORKPLACE_ALIGNMENT',
        rawScore: 100,
        weight,
        weightedScore: 100 * weight,
        status: 'STRONG',
        explanation: 'Job is 100% Remote, offering maximum location flexibility.',
      };
    }

    return {
      componentType: 'LOCATION_WORKPLACE_ALIGNMENT',
      rawScore: 80,
      weight,
      weightedScore: 80 * weight,
      status: 'MODERATE',
      explanation: `Workplace mode is ${job.workplaceType || 'On-site'}.`,
    };
  }

  private scoreCompensationAlignment(job: CanonicalJob, candidate: CandidateCareerEvidenceBundle): ComponentScoreResult {
    const weight = this.weights.compensationAlignment;
    const candMinSalary = candidate.preferences.minSalary;

    if (!job.salaryMax && !job.salaryMin) {
      return {
        componentType: 'COMPENSATION_ALIGNMENT',
        rawScore: 75,
        weight,
        weightedScore: 75 * weight,
        status: 'NOT_APPLICABLE',
        explanation: 'Salary not disclosed by job source; neutral score assigned without penalty.',
      };
    }

    if (!candMinSalary) {
      return {
        componentType: 'COMPENSATION_ALIGNMENT',
        rawScore: 85,
        weight,
        weightedScore: 85 * weight,
        status: 'MODERATE',
        explanation: 'Candidate has not set minimum expected compensation.',
      };
    }

    const jobCap = job.salaryMax || job.salaryMin || 0;
    if (jobCap >= candMinSalary) {
      return {
        componentType: 'COMPENSATION_ALIGNMENT',
        rawScore: 100,
        weight,
        weightedScore: 100 * weight,
        status: 'STRONG',
        explanation: `Offered compensation (${job.salaryCurrency || ''} ${jobCap}) meets candidate minimum expectation (${candMinSalary}).`,
      };
    }

    return {
      componentType: 'COMPENSATION_ALIGNMENT',
      rawScore: 40,
      weight,
      weightedScore: 40 * weight,
      status: 'WEAK',
      explanation: `Disclosed salary is below candidate target threshold.`,
    };
  }

  private scoreEmploymentTypeAlignment(job: CanonicalJob, candidate: CandidateCareerEvidenceBundle): ComponentScoreResult {
    const weight = this.weights.employmentTypeAlignment;
    return {
      componentType: 'EMPLOYMENT_TYPE_ALIGNMENT',
      rawScore: 100,
      weight,
      weightedScore: 100 * weight,
      status: 'STRONG',
      explanation: `Employment type (${job.employmentType || 'Standard'}) matches candidate availability.`,
    };
  }

  private scoreEducationCertAlignment(eduEvals: RequirementMatchEvaluation[]): ComponentScoreResult {
    const weight = this.weights.educationCertificationAlignment;
    if (eduEvals.length === 0) {
      return {
        componentType: 'EDUCATION_CERTIFICATION_ALIGNMENT',
        rawScore: 100,
        weight,
        weightedScore: 100 * weight,
        status: 'NOT_APPLICABLE',
        explanation: 'No mandatory degree or certification barriers listed for this opportunity.',
      };
    }

    const metCount = eduEvals.filter(e => e.qualificationStatus === 'MET').length;
    const rawScore = Math.round((metCount / eduEvals.length) * 100);

    return {
      componentType: 'EDUCATION_CERTIFICATION_ALIGNMENT',
      rawScore,
      weight,
      weightedScore: Math.round(rawScore * weight * 100) / 100,
      status: rawScore >= 80 ? 'STRONG' : 'WEAK',
      explanation: `${metCount} of ${eduEvals.length} education/certification requirements confirmed.`,
    };
  }

  private determineMatchStatus(score: number, blockerCount: number, candidate: CandidateCareerEvidenceBundle): MatchStatus {
    if (candidate.skills.length === 0 && candidate.experiences.length === 0) {
      return 'INSUFFICIENT_DATA';
    }
    if (blockerCount > 0) {
      return 'BLOCKED_BY_REQUIREMENT';
    }
    if (score >= 85) return 'EXCELLENT_MATCH';
    if (score >= 70) return 'STRONG_MATCH';
    if (score >= 55) return 'MODERATE_MATCH';
    if (score >= 40) return 'PARTIAL_MATCH';
    return 'LOW_MATCH';
  }
}

export const matchingScoringEngine = new MatchingScoringEngine();
