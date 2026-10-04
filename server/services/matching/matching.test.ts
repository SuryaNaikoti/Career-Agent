/**
 * Module 06 Matching Engine Verification Suite
 */

import { strict as assert } from 'assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createServerApp } from '../../index.js';
import { SCORING_VERSION, ANALYSIS_VERSION } from './matchingTypes.js';
import { skillNormalizerService } from './skillNormalizerService.js';
import { matchingScoringEngine } from './matchingScoringEngine.js';
import { requirementExtractionService } from './requirementExtractionService.js';
import { CandidateCareerEvidenceBundle } from './candidateEvidenceService.js';
import { CanonicalJob } from '../job/jobTypes.js';

async function runMatchingTests() {
  console.log('=== STARTING MODULE 06 MATCHING ENGINE VERIFICATION SUITE ===');

  const app = createServerApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  async function testAsync(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  try {
    // 1. Authentication boundary tests
    await testAsync('Unauthenticated GET /api/matches returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/matches`);
      assert.equal(res.status, 401);
    });

    await testAsync('Unauthenticated GET /api/jobs/:id/match returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/jobs/test-id/match`);
      assert.equal(res.status, 401);
    });

    await testAsync('Unauthenticated POST /api/jobs/:id/match/recalculate returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/jobs/test-id/match/recalculate`, { method: 'POST' });
      assert.equal(res.status, 401);
    });

    // 2. Skill Normalizer & Synonym Rules
    test('React.js and React normalized as SYNONYM', () => {
      const comp = skillNormalizerService.compareSkills('React', 'React.js');
      assert.equal(comp.relation, 'SYNONYM');
      assert.ok(comp.confidence >= 0.95);
    });

    test('Postgres and PostgreSQL normalized as SYNONYM', () => {
      const comp = skillNormalizerService.compareSkills('PostgreSQL', 'Postgres');
      assert.equal(comp.relation, 'SYNONYM');
    });

    test('Node.js and Node normalized as SYNONYM', () => {
      const comp = skillNormalizerService.compareSkills('Node.js', 'Node');
      assert.equal(comp.relation, 'SYNONYM');
    });

    test('React and Angular are strictly UNRELATED and cannot substitute', () => {
      const comp = skillNormalizerService.compareSkills('React', 'Angular');
      assert.equal(comp.relation, 'UNRELATED');
      assert.equal(comp.confidence, 0.0);
    });

    test('Python and Java are strictly UNRELATED and cannot substitute', () => {
      const comp = skillNormalizerService.compareSkills('Python', 'Java');
      assert.equal(comp.relation, 'UNRELATED');
      assert.equal(comp.confidence, 0.0);
    });

    test('REST API is recognized as TRANSFERABLE foundation for GraphQL', () => {
      const comp = skillNormalizerService.compareSkills('GraphQL', 'REST API');
      assert.equal(comp.relation, 'TRANSFERABLE');
      assert.ok(comp.confidence > 0.6);
    });

    // 3. Requirement Extraction Determinism & Defensive Boundary
    const sampleJob: CanonicalJob = {
      id: 'job-sample-1',
      sourceId: 'lever',
      externalJobId: 'ext-100',
      sourceUrl: 'https://example.com/job/100',
      title: 'Senior Fullstack Engineer',
      companyName: 'Acme Cloud Corp',
      descriptionText: 'Looking for a Senior Fullstack Engineer with 5+ years of experience in React, TypeScript, and Node.js. Bonus/nice to have: GraphQL experience. Must be located in United States.',
      locationText: 'San Francisco, CA',
      workplaceType: 'REMOTE',
      employmentType: 'FULL_TIME',
      skills: ['TypeScript', 'React'],
      contentHash: 'hash-abc-123',
      status: 'ACTIVE',
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    test('Deterministic requirement extraction accurately identifies required skills', () => {
      const reqs = requirementExtractionService.extractDeterministicRequirements(sampleJob);
      const skillNames = reqs.filter(r => r.type === 'SKILL').map(r => r.name);
      assert.ok(skillNames.includes('TypeScript'), 'Includes TypeScript');
      assert.ok(skillNames.includes('React'), 'Includes React');
      assert.ok(skillNames.includes('Node.js'), 'Includes Node.js from text');
    });

    test('Seniority requirement correctly extracted from title', () => {
      const reqs = requirementExtractionService.extractDeterministicRequirements(sampleJob);
      const seniority = reqs.find(r => r.type === 'SENIORITY');
      assert.ok(seniority, 'Seniority requirement extracted');
      assert.equal(seniority?.criteria?.yearsRequired, 5);
    });

    test('Preferred skill correctly categorized with PREFERRED importance', () => {
      const reqs = requirementExtractionService.extractDeterministicRequirements(sampleJob);
      const graphql = reqs.find(r => r.name === 'GraphQL');
      assert.ok(graphql, 'GraphQL extracted');
      assert.equal(graphql?.importance, 'PREFERRED');
    });

    // 4. Candidate Qualification & Truth Layer Evaluation
    const candidateConfirmed: CandidateCareerEvidenceBundle = {
      userId: 'user-candidate-1',
      skills: [
        { name: 'TypeScript', years: 4, provenance: 'CANDIDATE_CONFIRMED' },
        { name: 'React.js', years: 4, provenance: 'CANDIDATE_CONFIRMED' },
        { name: 'Node.js', years: 3, provenance: 'CANDIDATE_PROVIDED' },
        { name: 'REST API', years: 3, provenance: 'CANDIDATE_CONFIRMED' },
      ],
      experiences: [
        {
          company: 'Tech Solutions Inc',
          roleTitle: 'Fullstack Engineer',
          years: 4.5,
          skillsUsed: ['TypeScript', 'React', 'Node.js'],
          provenance: 'CANDIDATE_CONFIRMED',
        },
      ],
      educations: [
        {
          institution: 'University of California',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          provenance: 'CANDIDATE_CONFIRMED',
        },
      ],
      preferences: {
        targetRoles: ['Fullstack Engineer', 'Frontend Engineer'],
        locations: ['San Francisco, CA', 'Remote'],
        workModes: ['REMOTE'],
        minSalary: 120000,
      },
      totalExperienceYears: 4.5,
      evidenceItems: [],
      snapshotHash: 'cand-hash-999',
    };

    test('Candidate match evaluation produces explainable composite score', () => {
      const reqs = requirementExtractionService.extractDeterministicRequirements(sampleJob);
      const evaluation = matchingScoringEngine.evaluate(sampleJob, reqs, candidateConfirmed);

      assert.ok(evaluation.overallScore >= 70, `Score is strong (actual: ${evaluation.overallScore})`);
      assert.ok(['EXCELLENT_MATCH', 'STRONG_MATCH'].includes(evaluation.matchStatus), `Status is ${evaluation.matchStatus}`);
      assert.equal(evaluation.blockers.length, 0, 'Zero blockers');
    });

    test('Missing preferred skill is noted in skill gaps without blocking match', () => {
      const reqs = requirementExtractionService.extractDeterministicRequirements(sampleJob);
      const evaluation = matchingScoringEngine.evaluate(sampleJob, reqs, candidateConfirmed);

      const graphqlGap = evaluation.skillGaps.find(g => g.skillName === 'GraphQL');
      assert.ok(graphqlGap, 'GraphQL is flagged in skill gaps');
      assert.equal(graphqlGap?.importance, 'PREFERRED');
    });

    // Case A: Required confirmed skill -> MET
    test('Case A: Required confirmed skill results in MET', () => {
      const reqs: any[] = [{ type: 'SKILL', name: 'TypeScript', importance: 'REQUIRED', confidence: 1.0 }];
      const evalResult = matchingScoringEngine.evaluate(sampleJob, reqs, candidateConfirmed);
      const reqEval = evalResult.requirements.find(r => r.requirement.name === 'TypeScript');
      assert.equal(reqEval?.qualificationStatus, 'MET');
      assert.equal(reqEval?.confidence, 1.0);
    });

    // Case B: Required AI_SUGGESTED skill only -> NOT treated as confirmed MET (PARTIALLY_MET)
    test('Case B: Required AI_SUGGESTED skill only is NOT treated as confirmed MET', () => {
      const candAiOnly: CandidateCareerEvidenceBundle = {
        ...candidateConfirmed,
        skills: [{ name: 'TypeScript', years: 2, provenance: 'AI_SUGGESTED' }],
      };
      const reqs: any[] = [{ type: 'SKILL', name: 'TypeScript', importance: 'REQUIRED', confidence: 1.0 }];
      const evalResult = matchingScoringEngine.evaluate(sampleJob, reqs, candAiOnly);
      const reqEval = evalResult.requirements.find(r => r.requirement.name === 'TypeScript');
      assert.equal(reqEval?.qualificationStatus, 'PARTIALLY_MET', 'AI_SUGGESTED must be PARTIALLY_MET, not MET');
      assert.notEqual(reqEval?.qualificationStatus, 'MET');
      assert.ok(reqEval?.explanation.includes('Unconfirmed AI suggestion'));
    });

    // Case C: Required certification AI_SUGGESTED only -> must not satisfy confirmed certification requirement
    test('Case C: Required certification AI_SUGGESTED only must NOT satisfy confirmed requirement', () => {
      const candCertAiOnly: CandidateCareerEvidenceBundle = {
        ...candidateConfirmed,
        skills: [{ name: 'AWS Certified Solutions Architect', provenance: 'AI_SUGGESTED' }],
      };
      const reqs: any[] = [{
        type: 'CERTIFICATION',
        name: 'AWS Certified Solutions Architect',
        importance: 'REQUIRED',
        confidence: 1.0,
      }];
      const evalResult = matchingScoringEngine.evaluate(sampleJob, reqs, candCertAiOnly);
      const reqEval = evalResult.requirements.find(r => r.requirement.name === 'AWS Certified Solutions Architect');
      assert.equal(reqEval?.qualificationStatus, 'PARTIALLY_MET');
      assert.notEqual(reqEval?.qualificationStatus, 'MET');
      assert.ok(reqEval?.explanation.includes('Unconfirmed AI suggested certification'));
    });

    // Case D: Required experience UNKNOWN -> UNKNOWN, not MISSING and not MET
    test('Case D: Required experience UNKNOWN results in UNKNOWN', () => {
      const candNoExp: CandidateCareerEvidenceBundle = {
        ...candidateConfirmed,
        experiences: [],
        totalExperienceYears: 0,
      };
      const reqs: any[] = [{
        type: 'EXPERIENCE',
        name: '4+ Years Software Development',
        importance: 'REQUIRED',
        confidence: 1.0,
        criteria: { yearsRequired: 4 },
      }];
      const evalResult = matchingScoringEngine.evaluate(sampleJob, reqs, candNoExp);
      const reqEval = evalResult.requirements.find(r => r.requirement.type === 'EXPERIENCE');
      assert.equal(reqEval?.qualificationStatus, 'UNKNOWN');
      assert.notEqual(reqEval?.qualificationStatus, 'MET');
      assert.notEqual(reqEval?.qualificationStatus, 'MISSING');
    });

    // Case E: Required qualification explicitly absent -> MISSING
    test('Case E: Required qualification explicitly absent results in MISSING', () => {
      const reqs: any[] = [{
        type: 'CERTIFICATION',
        name: 'CPA License',
        importance: 'REQUIRED',
        confidence: 1.0,
      }];
      const evalResult = matchingScoringEngine.evaluate(sampleJob, reqs, candidateConfirmed);
      const reqEval = evalResult.requirements.find(r => r.requirement.name === 'CPA License');
      assert.equal(reqEval?.qualificationStatus, 'MISSING');
    });

    // Case F: Hard blocker present -> BLOCKED_BY_REQUIREMENT
    test('Case F: Hard blocker present results in BLOCKED_BY_REQUIREMENT', () => {
      const reqWithBlocker: any[] = [
        {
          type: 'SKILL',
          name: 'Active Nursing License',
          importance: 'REQUIRED',
          confidence: 1.0,
          criteria: { isMandatoryBlocker: true },
        },
      ];
      const evaluation = matchingScoringEngine.evaluate(sampleJob, reqWithBlocker, candidateConfirmed);
      assert.equal(evaluation.matchStatus, 'BLOCKED_BY_REQUIREMENT');
      assert.ok(evaluation.blockers.length > 0);
      assert.ok(evaluation.blockers[0].includes('Active Nursing License'));
    });

    test('Candidate with zero skills and zero experience receives INSUFFICIENT_DATA', () => {
      const emptyCandidate: CandidateCareerEvidenceBundle = {
        userId: 'empty-user',
        skills: [],
        experiences: [],
        educations: [],
        preferences: { targetRoles: [], locations: [], workModes: [], minSalary: null },
        totalExperienceYears: 0,
        evidenceItems: [],
        snapshotHash: 'empty-hash',
      };
      const reqs = requirementExtractionService.extractDeterministicRequirements(sampleJob);
      const evaluation = matchingScoringEngine.evaluate(sampleJob, reqs, emptyCandidate);
      assert.equal(evaluation.matchStatus, 'INSUFFICIENT_DATA');
    });

    test('Scoring components sum deterministically with active weights', () => {
      const reqs = requirementExtractionService.extractDeterministicRequirements(sampleJob);
      const eval1 = matchingScoringEngine.evaluate(sampleJob, reqs, candidateConfirmed);
      const eval2 = matchingScoringEngine.evaluate(sampleJob, reqs, candidateConfirmed);
      assert.equal(eval1.overallScore, eval2.overallScore, 'Same input produces identical deterministic score');
    });

    test('Secret scanning in frontend code (/src)', () => {
      function scanDir(dir: string): { hasGenAiImport: boolean; hasGeminiKey: boolean } {
        let hasGenAiImport = false;
        let hasGeminiKey = false;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const sub = scanDir(fullPath);
            if (sub.hasGenAiImport) hasGenAiImport = true;
            if (sub.hasGeminiKey) hasGeminiKey = true;
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('@google/genai')) {
              console.error(`FORBIDDEN: Found @google/genai import in client file: ${fullPath}`);
              hasGenAiImport = true;
            }
            if (content.includes('GEMINI_API_KEY')) {
              console.error(`FORBIDDEN: Found GEMINI_API_KEY reference in client file: ${fullPath}`);
              hasGeminiKey = true;
            }
          }
        }
        return { hasGenAiImport, hasGeminiKey };
      }

      const clientScan = scanDir(path.resolve('src'));
      assert.equal(clientScan.hasGenAiImport, false, 'Zero @google/genai imports in frontend code (/src)');
      assert.equal(clientScan.hasGeminiKey, false, 'Zero GEMINI_API_KEY references in frontend code (/src)');
    });

  } finally {
    server.close();
  }

  console.log(`=== MODULE 06 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runMatchingTests().catch((err) => {
  console.error('Matching test execution failed:', err);
  process.exit(1);
});
