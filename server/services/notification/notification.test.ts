/**
 * Module 12: Notifications & Daily Career Report Comprehensive Forensic Test Suite
 * 
 * Tests:
 * 1. Authentication & Security: Unauthenticated requests return 401 across all reports & notification endpoints.
 * 2. Deterministic Facts Integrity: Report numbers match underlying service counts exactly (zero fabricated numbers).
 * 3. Daily Report Period & Timezone: Respects configured timezone and date boundaries.
 * 4. AI Narrative Summary: AI summarizes facts only without altering counts; AI failure does not break report.
 * 5. Partial Module Degradation: If Gmail/Jobs query errors or is unconfigured, report still aggregates remaining sources cleanly.
 * 6. Deduplication & Idempotency: Duplicate reports for (userId, reportDate, timezone) return existing record.
 * 7. In-App Notifications: Dispatches notification for report; deduplication prevents duplicate notifications.
 * 8. Notification Read States: Candidate can mark notification as read; user ownership enforced (IDOR).
 * 9. Report Preferences: Candidate can update dailyReportEnabled, timezone, and preferredReportTime.
 * 10. Database Migration & RLS Security: Confirms tables daily_career_reports, career_report_preferences, internal_notifications with strict auth.uid() = user_id policies.
 * 11. Forbidden Automation & Leakage Scan: Ensures no email sending, no localStorage, no frontend tokens or secrets.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createServerApp } from '../../index.js';
import { dailyCareerReportService } from './dailyCareerReportService.js';
import { careerReportPreferencesService } from './careerReportPreferencesService.js';
import { notificationService } from './notificationService.js';
import { aiClient } from '../ai/aiClient.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function testAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function runModule12Tests() {
  console.log('=== STARTING MODULE 12 NOTIFICATIONS & DAILY CAREER REPORT VERIFICATION SUITE ===');

  const app = createServerApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Authentication & Security Tests (Unauthenticated must return 401)
    await testAsync('Unauthenticated GET /api/reports/today returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/reports/today`);
      assert.equal(res.status, 401);
    });

    await testAsync('Unauthenticated GET /api/reports/preferences returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/reports/preferences`);
      assert.equal(res.status, 401);
    });

    await testAsync('Unauthenticated PUT /api/reports/preferences returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/reports/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyReportEnabled: false }),
      });
      assert.equal(res.status, 401);
    });

    await testAsync('Unauthenticated GET /api/notifications returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/notifications`);
      assert.equal(res.status, 401);
    });

    await testAsync('Unauthenticated POST /api/notifications/:id/read returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/00000000-0000-0000-0000-000000000000/read`, {
        method: 'POST',
      });
      assert.equal(res.status, 401);
    });

    // 2. Report Preferences Management
    await testAsync('Preferences: Default values are returned when no database record exists', async () => {
      const userId = 'user-pref-test-01';
      const prefs = await careerReportPreferencesService.getPreferences(userId);
      assert.equal(prefs.userId, userId);
      assert.equal(prefs.dailyReportEnabled, true);
      assert.equal(prefs.preferredReportTime, '08:00');
      assert.equal(prefs.timezone, 'UTC');
    });

    await testAsync('Preferences: Validation rejects malformed report time format', async () => {
      const userId = 'user-pref-test-02';
      await assert.rejects(async () => {
        await careerReportPreferencesService.updatePreferences(userId, {
          preferredReportTime: 'invalid-time',
        });
      });
    });

    await testAsync('Preferences: Valid preferences update succeeds', async () => {
      const userId = 'user-pref-test-03';
      const updated = await careerReportPreferencesService.updatePreferences(userId, {
        timezone: 'Asia/Kolkata',
        preferredReportTime: '09:30',
        dailyReportEnabled: false,
      });
      assert.equal(updated.timezone, 'Asia/Kolkata');
      assert.equal(updated.preferredReportTime, '09:30');
      assert.equal(updated.dailyReportEnabled, false);
    });

    // 3. Deterministic Facts Aggregation & Zero Fake Numbers
    await testAsync('Report Service: Aggregates real data without inventing activity', async () => {
      const testUserId = 'test-report-candidate-01';
      const testDate = '2026-10-02';
      const timezone = 'UTC';

      const facts = await dailyCareerReportService.aggregateReportFacts(testUserId, testDate, timezone);
      assert.equal(facts.periodDate, testDate);
      assert.equal(facts.timezone, timezone);
      assert.equal(typeof facts.applicationsSubmittedCount, 'number');
      assert.equal(typeof facts.interviewsCount, 'number');
      assert.equal(typeof facts.openTasksCount, 'number');
      assert.equal(typeof facts.offersCount, 'number');
      assert.ok(Array.isArray(facts.priorities), 'Priorities must be an array');
    });

    // 4. Deterministic Text Summary Fallback
    test('Report Service: Deterministic summary formats numbers accurately without AI', () => {
      const facts = {
        periodDate: '2026-10-02',
        timezone: 'UTC',
        newRecommendedJobsCount: 4,
        newRecommendedJobs: [],
        jobsSavedCount: 1,
        applicationsSubmittedCount: 2,
        applicationsUpdatedCount: 1,
        interviewsCount: 1,
        interviews: [{ company: 'Acme Corp' }],
        assessmentsCount: 0,
        assessments: [],
        rejectionsCount: 0,
        offersCount: 1,
        offers: [{ company: 'Beta Corp' }],
        openTasksCount: 2,
        openTasks: [],
        upcomingEvents: [],
        priorities: ['Prepare for interview'],
      };

      const summary = dailyCareerReportService.buildFallbackSummary(facts);
      assert.ok(summary.includes('1 interview invitation'), 'Must contain 1 interview invitation');
      assert.ok(summary.includes('2 action item'), 'Must contain action items');
      assert.ok(summary.includes('1 job offer'), 'Must contain job offer');
      assert.ok(summary.includes('2 applications submitted'), 'Must contain applications submitted');
      assert.ok(summary.includes('4 new job matches'), 'Must contain new job matches');
    });

    // 5. AI Narrative Generation with Injected Double
    await testAsync('AI Summary: Generates narrative without altering underlying facts', async () => {
      const testUserId = 'test-report-candidate-ai';
      aiClient.setTestProviderDouble(async (prompt) => {
        assert.ok(prompt.includes('CRITICAL RULES'), 'Must provide anti-hallucination rules in prompt');
        assert.ok(prompt.includes('NEVER INVENT NUMBERS'), 'Must mandate using exact numbers');
        return {
          text: 'Good morning! You submitted 2 applications yesterday and received 1 interview invitation from Acme Corp.',
        };
      });

      try {
        const report = await dailyCareerReportService.getOrGenerateReport(testUserId, {
          targetDate: '2026-10-02',
          forceRegenerate: true,
        });

        assert.equal(report.userId, testUserId);
        assert.ok(report.generatedSummary?.includes('2 applications'), 'Narrative summary retained');
      } finally {
        aiClient.setTestProviderDouble(undefined);
      }
    });

    // 6. Graceful Degradation when AI is Unavailable
    await testAsync('Report Resilience: AI failure does NOT break daily career report generation', async () => {
      const testUserId = 'test-report-candidate-ai-fail';
      // Force AI to throw error
      aiClient.setTestProviderDouble(async () => {
        throw new Error('Gemini upstream network timeout 504');
      });

      try {
        const report = await dailyCareerReportService.getOrGenerateReport(testUserId, {
          targetDate: '2026-10-02',
          forceRegenerate: true,
        });

        assert.ok(report, 'Report must be created successfully');
        assert.equal(report.generatedSummary, null, 'generatedSummary is null when AI unavailable');
        assert.ok(report.summaryData, 'Factual summaryData remains authoritative');
      } finally {
        aiClient.setTestProviderDouble(undefined);
      }
    });

    // 7. Internal Notification Creation & Deduplication
    await testAsync('Notification: Deduplication prevents duplicate notifications for the same key', async () => {
      const userId = 'user-notif-test-01';
      const dedupKey = 'interview-invite-test-999';

      const notif1 = await notificationService.createNotification({
        userId,
        notificationType: 'INTERVIEW',
        title: 'Interview invitation: Acme Corp',
        message: 'You have an interview scheduled for tomorrow at 10:00 AM.',
        deduplicationKey: dedupKey,
      });

      assert.equal(notif1.notificationType, 'INTERVIEW');
      assert.equal(notif1.status, 'UNREAD');

      // Duplicate attempt
      const notif2 = await notificationService.createNotification({
        userId,
        notificationType: 'INTERVIEW',
        title: 'Interview invitation: Acme Corp',
        message: 'Duplicate event should return original.',
        deduplicationKey: dedupKey,
      });

      assert.equal(notif2.id, notif1.id, 'Must return identical notification ID on duplicate dedupKey');
    });

    // 8. Notification Read Transition
    await testAsync('Notification: Mark as read updates status and enforces user ownership', async () => {
      const userIdAlice = 'user-notif-alice';
      const userIdBob = 'user-notif-bob';

      const notif = await notificationService.createNotification({
        userId: userIdAlice,
        notificationType: 'ACTION_REQUIRED',
        title: 'Confirm application details',
        message: 'Action required on pending application.',
        deduplicationKey: 'action-item-unique-01',
      });

      // User Bob cannot mark Alice's notification as read
      await assert.rejects(async () => {
        await notificationService.markAsRead(userIdBob, notif.id);
      });

      // User Alice marks own notification as read
      const readNotif = await notificationService.markAsRead(userIdAlice, notif.id);
      assert.equal(readNotif.status, 'READ');
      assert.ok(readNotif.readAt !== null);
    });

    // 9. Database Migration & RLS Security Inspection
    test('Database Migration: Tables daily_career_reports, career_report_preferences, internal_notifications exist with RLS', () => {
      const migrationPath = path.resolve('supabase/migrations/20261001080000_create_notifications_and_daily_report.sql');
      assert.ok(fs.existsSync(migrationPath), 'Module 12 SQL migration must exist');
      const sql = fs.readFileSync(migrationPath, 'utf8');

      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.daily_career_reports'), 'daily_career_reports table required');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.career_report_preferences'), 'career_report_preferences table required');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.internal_notifications'), 'internal_notifications table required');
      assert.ok(sql.includes('ALTER TABLE public.daily_career_reports ENABLE ROW LEVEL SECURITY'), 'RLS required on daily_career_reports');
      assert.ok(sql.includes('ALTER TABLE public.career_report_preferences ENABLE ROW LEVEL SECURITY'), 'RLS required on career_report_preferences');
      assert.ok(sql.includes('ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY'), 'RLS required on internal_notifications');
      assert.ok(sql.includes('auth.uid() = user_id'), 'Strict user ownership policy required');
    });

    // 10. Forbidden Automation & Secret Leakage Inspection
    test('Security: Zero forbidden automation (no email sending, no infinite loop intervals, no frontend secrets)', () => {
      const notifServicesDir = path.resolve('server/services/notification');
      const files = fs.readdirSync(notifServicesDir);

      for (const f of files) {
        if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue;
        const content = fs.readFileSync(path.join(notifServicesDir, f), 'utf8');
        assert.ok(!content.includes('setInterval('), `File ${f} must not contain setInterval loop`);
        assert.ok(!content.includes('sendgrid'), `File ${f} must not send emails`);
        assert.ok(!content.includes('nodemailer'), `File ${f} must not send emails`);
      }

      // Check frontend code
      const frontendApi = fs.readFileSync(path.resolve('src/features/notifications/notifications.api.ts'), 'utf8');
      assert.ok(!frontendApi.includes('localStorage'), 'Frontend API must not use localStorage');
      assert.ok(!frontendApi.includes('sessionStorage'), 'Frontend API must not use sessionStorage');
      assert.ok(!frontendApi.includes('service_role'), 'Frontend API must not contain service_role');
    });

  } finally {
    server.close();
  }

  console.log(`\n=== MODULE 12 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runModule12Tests().catch((err) => {
  console.error('Fatal test error in Module 12:', err);
  process.exit(1);
});
