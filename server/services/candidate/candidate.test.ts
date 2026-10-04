import { createServerApp } from '../../index.js';
import {
  validateUuid,
  validateDate,
  validateProficiencyLevel,
  validateString,
  validateStringArray,
  validateProvenance,
  validateWorkModes,
} from './candidateValidation.js';
import { candidateProfileService } from './candidateProfileService.js';
import { candidateSkillService } from './candidateSkillService.js';
import { candidateExperienceService } from './candidateExperienceService.js';
import { candidateEducationService } from './candidateEducationService.js';
import { candidatePreferencesService } from './candidatePreferencesService.js';
import {
  ValidationError,
  DatabaseNotConfiguredError,
} from '../../core/errors/appError.js';

async function runTests() {
  console.log('=== STARTING MODULE 01 AUTOMATED VERIFICATION SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: UNAUTHENTICATED ENDPOINT ACCESS REJECTION (401)
  // --------------------------------------------------------------------------
  const app = createServerApp();
  const PORT = 3199;
  const server = app.listen(PORT);

  try {
    const endpoints = [
      ['GET', '/api/candidate/profile'],
      ['PUT', '/api/candidate/profile'],
      ['GET', '/api/candidate/skills'],
      ['POST', '/api/candidate/skills'],
      ['GET', '/api/candidate/experience'],
      ['POST', '/api/candidate/experience'],
      ['GET', '/api/candidate/education'],
      ['POST', '/api/candidate/education'],
      ['GET', '/api/candidate/preferences'],
      ['PUT', '/api/candidate/preferences'],
    ];

    for (const [method, path] of endpoints) {
      const res = await fetch(`http://127.0.0.1:${PORT}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
      });
      assert(res.status === 401, `Unauthenticated ${method} ${path} returns 401`);
    }

    // --------------------------------------------------------------------------
    // TEST GROUP 2: VALIDATION LAYER UNIT ASSERTIONS (400)
    // --------------------------------------------------------------------------
    // 2.1 UUID validation
    let uuidErr = false;
    try {
      validateUuid('invalid-uuid-format', 'testId');
    } catch (e: any) {
      uuidErr = e instanceof ValidationError;
    }
    assert(uuidErr, 'Malformed UUID throws ValidationError (400)');

    assert(
      validateUuid('123e4567-e89b-12d3-a456-426614174000', 'validId') === '123e4567-e89b-12d3-a456-426614174000',
      'Valid RFC UUID passes validation'
    );

    // 2.2 Date validation
    let dateErr = false;
    try {
      validateDate('2026-13-45', 'start_date', true);
    } catch (e: any) {
      dateErr = e instanceof ValidationError;
    }
    assert(dateErr, 'Invalid calendar date throws ValidationError (400)');

    let nonIsoDateErr = false;
    try {
      validateDate('not-a-date', 'start_date', true);
    } catch (e: any) {
      nonIsoDateErr = e instanceof ValidationError;
    }
    assert(nonIsoDateErr, 'Non-ISO date string throws ValidationError (400)');

    assert(validateDate('2026-05-15', 'start_date', true) === '2026-05-15', 'Valid ISO date passes');

    // 2.3 Proficiency level validation
    let profErr = false;
    try {
      validateProficiencyLevel('guru');
    } catch (e: any) {
      profErr = e instanceof ValidationError;
    }
    assert(profErr, 'Invalid proficiency level throws ValidationError (400)');

    assert(validateProficiencyLevel('intermediate') === 'intermediate', 'Valid proficiency level accepted');

    // 2.4 Provenance validation
    let provErr = false;
    try {
      validateProvenance('HUMAN_GUESS');
    } catch (e: any) {
      provErr = e instanceof ValidationError;
    }
    assert(provErr, 'Invalid provenance tag throws ValidationError (400)');

    assert(validateProvenance('CANDIDATE_PROVIDED') === 'CANDIDATE_PROVIDED', 'CANDIDATE_PROVIDED accepted');
    assert(validateProvenance('AI_SUGGESTED') === 'AI_SUGGESTED', 'AI_SUGGESTED accepted');
    assert(validateProvenance('CANDIDATE_CONFIRMED') === 'CANDIDATE_CONFIRMED', 'CANDIDATE_CONFIRMED accepted');

    // 2.5 WorkModes and Skills validation
    let workModeErr = false;
    try {
      validateWorkModes(['Teleportation' as any]);
    } catch (e: any) {
      workModeErr = e instanceof ValidationError;
    }
    assert(workModeErr, 'Invalid work mode throws ValidationError (400)');
    assert(validateWorkModes(['Remote', 'Hybrid']).length === 2, 'Valid work modes pass validation');

    let skillArrErr = false;
    try {
      validateStringArray(Array(51).fill('skill'), 'skills', { maxItems: 50 });
    } catch (e: any) {
      skillArrErr = e instanceof ValidationError;
    }
    assert(skillArrErr, 'Exceeding max skills count throws ValidationError (400)');

    // --------------------------------------------------------------------------
    // TEST GROUP 3: DATABASE CONFIGURATION & FALLBACK REMOVAL VERIFICATION
    // --------------------------------------------------------------------------
    // When Supabase configuration is missing in the environment:
    // All Candidate Data Services must fail explicitly with DatabaseNotConfiguredError (503),
    // and MUST NOT fall back to in-memory emulators or fake database adapters.

    const TEST_USER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    // 3.1 candidateProfileService
    let profileDbErr: any = null;
    try {
      await candidateProfileService.getProfile(TEST_USER);
    } catch (e: any) {
      profileDbErr = e;
    }
    assert(
      profileDbErr instanceof DatabaseNotConfiguredError && profileDbErr.statusCode === 503,
      'Profile retrieval without Supabase config fails with DatabaseNotConfiguredError (503)'
    );
    assert(
      profileDbErr?.name === 'DATABASE_NOT_CONFIGURED' && profileDbErr?.message === 'Candidate data service is not configured.',
      'Profile retrieval produces exact error contract {"code":"DATABASE_NOT_CONFIGURED","message":"Candidate data service is not configured."}'
    );

    // 3.2 candidateSkillService
    let skillDbErr: any = null;
    try {
      await candidateSkillService.listSkills(TEST_USER);
    } catch (e: any) {
      skillDbErr = e;
    }
    assert(
      skillDbErr instanceof DatabaseNotConfiguredError && skillDbErr.statusCode === 503,
      'Skill retrieval without Supabase config fails with DatabaseNotConfiguredError (503)'
    );

    // 3.3 candidateExperienceService
    let expDbErr: any = null;
    try {
      await candidateExperienceService.listExperience(TEST_USER);
    } catch (e: any) {
      expDbErr = e;
    }
    assert(
      expDbErr instanceof DatabaseNotConfiguredError && expDbErr.statusCode === 503,
      'Experience retrieval without Supabase config fails with DatabaseNotConfiguredError (503)'
    );

    // 3.4 candidateEducationService
    let eduDbErr: any = null;
    try {
      await candidateEducationService.listEducation(TEST_USER);
    } catch (e: any) {
      eduDbErr = e;
    }
    assert(
      eduDbErr instanceof DatabaseNotConfiguredError && eduDbErr.statusCode === 503,
      'Education retrieval without Supabase config fails with DatabaseNotConfiguredError (503)'
    );

    // 3.5 candidatePreferencesService
    let prefDbErr: any = null;
    try {
      await candidatePreferencesService.getPreferences(TEST_USER);
    } catch (e: any) {
      prefDbErr = e;
    }
    assert(
      prefDbErr instanceof DatabaseNotConfiguredError && prefDbErr.statusCode === 503,
      'Preferences retrieval without Supabase config fails with DatabaseNotConfiguredError (503)'
    );

    // 3.6 Mutation calls also fail with DatabaseNotConfiguredError and NO in-memory fallback
    let mutationErr: any = null;
    try {
      await candidateProfileService.upsertProfile(TEST_USER, {
        displayName: 'Test Candidate',
        headline: 'Engineer',
      });
    } catch (e: any) {
      mutationErr = e;
    }
    assert(
      mutationErr instanceof DatabaseNotConfiguredError && mutationErr.statusCode === 503,
      'Profile mutation without Supabase config fails with DatabaseNotConfiguredError (503) instead of emulating persistence'
    );

    // 3.7 Verify no in-memory state was created or retained
    let verificationErr: any = null;
    try {
      await candidateProfileService.getProfile(TEST_USER);
    } catch (e: any) {
      verificationErr = e;
    }
    assert(
      verificationErr instanceof DatabaseNotConfiguredError,
      'Verified zero in-memory fallback persistence exists across operations'
    );

  } finally {
    server.close();
  }

  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
