/**
 * Semantic Skill Normalizer & Synonym Reasoning Service
 * Module 06: Matching Engine
 * 
 * Rules:
 * - Deterministic dictionary normalization for common equivalents (e.g. React.js ≈ React, Postgres ≈ PostgreSQL).
 * - Prohibits treating different technologies as identical (e.g. React != Angular, Python != Java, AWS != Azure).
 * - Distinguishes between IDENTICAL, SYNONYM, TRANSFERABLE, and UNRELATED.
 */

export type SkillRelationType = 'IDENTICAL' | 'SYNONYM' | 'TRANSFERABLE' | 'UNRELATED';

export interface SkillComparisonResult {
  relation: SkillRelationType;
  confidence: number;
  explanation: string;
}

export class SkillNormalizerService {
  private static readonly SYNONYM_GROUPS: Array<Set<string>> = [
    new Set(['react', 'react.js', 'reactjs']),
    new Set(['node', 'node.js', 'nodejs']),
    new Set(['typescript', 'ts']),
    new Set(['javascript', 'js', 'ecmascript']),
    new Set(['postgres', 'postgresql']),
    new Set(['golang', 'go']),
    new Set(['mongo', 'mongodb']),
    new Set(['k8s', 'kubernetes']),
    new Set(['amazon web services', 'aws']),
    new Set(['google cloud platform', 'gcp', 'google cloud']),
    new Set(['microsoft azure', 'azure']),
    new Set(['next', 'next.js', 'nextjs']),
    new Set(['vue', 'vue.js', 'vuejs']),
  ];

  // Specific transferable relationship mappings (e.g., REST API experience is transferable to GraphQL understanding)
  private static readonly TRANSFERABLE_MAP: Record<string, string[]> = {
    graphql: ['rest api', 'restful api', 'api design', 'rest'],
    kubernetes: ['docker', 'containerization'],
    aws: ['gcp', 'azure', 'cloud infrastructure'],
    gcp: ['aws', 'azure', 'cloud infrastructure'],
    azure: ['aws', 'gcp', 'cloud infrastructure'],
    postgresql: ['mysql', 'sql', 'relational database'],
    mysql: ['postgresql', 'sql', 'relational database'],
  };

  /**
   * Normalizes skill string for comparison (trimmed, lowercase, removed special punctuation).
   */
  public normalizeSkillName(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * Evaluates relationship between a job requirement skill and a candidate evidence skill.
   */
  public compareSkills(requiredSkill: string, candidateSkill: string): SkillComparisonResult {
    const reqNorm = this.normalizeSkillName(requiredSkill);
    const candNorm = this.normalizeSkillName(candidateSkill);

    // 1. Direct equality
    if (reqNorm === candNorm) {
      return {
        relation: 'IDENTICAL',
        confidence: 1.0,
        explanation: `Exact match for ${requiredSkill}.`,
      };
    }

    // 2. Known Synonym check
    for (const group of SkillNormalizerService.SYNONYM_GROUPS) {
      if (group.has(reqNorm) && group.has(candNorm)) {
        return {
          relation: 'SYNONYM',
          confidence: 0.98,
          explanation: `Normalized synonym match: candidate has ${candidateSkill}, matching required ${requiredSkill}.`,
        };
      }
    }

    // 3. Strict Non-equivalence check for known competitors (prohibited from being equated)
    const competitorPairs = [
      ['react', 'angular'],
      ['react', 'vue'],
      ['python', 'java'],
      ['c++', 'java'],
      ['aws', 'azure'],
    ];

    for (const [a, b] of competitorPairs) {
      if ((reqNorm.includes(a) && candNorm.includes(b)) || (reqNorm.includes(b) && candNorm.includes(a))) {
        return {
          relation: 'UNRELATED',
          confidence: 0.0,
          explanation: `${candidateSkill} and ${requiredSkill} are distinct technologies and cannot be substituted.`,
        };
      }
    }

    // 4. Transferable skill check
    const transferableTargets = SkillNormalizerService.TRANSFERABLE_MAP[reqNorm];
    if (transferableTargets && transferableTargets.some(t => candNorm.includes(t))) {
      return {
        relation: 'TRANSFERABLE',
        confidence: 0.70,
        explanation: `Transferable skill: candidate experience in ${candidateSkill} provides transferable foundation for ${requiredSkill}.`,
      };
    }

    return {
      relation: 'UNRELATED',
      confidence: 0.0,
      explanation: `No direct or transferable match between ${requiredSkill} and ${candidateSkill}.`,
    };
  }
}

export const skillNormalizerService = new SkillNormalizerService();
