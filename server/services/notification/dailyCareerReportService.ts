/**
 * Daily Career Report Generator Service
 * Module 12: Notifications & Daily Career Report
 * 
 * Rules:
 * 1. Aggregates REAL factual data across Modules 05, 06, 07, 08, 09, 10, 11.
 * 2. Deterministic facts FIRST: AI must NEVER invent or modify numbers.
 * 3. Graceful partial degradation: if Gmail is unavailable, other modules still produce valid report.
 * 4. AI summary is optional: if AI fails, deterministic report works perfectly.
 * 5. Idempotent per (user, reportDate, timezone).
 * 6. Dispatches internal notification on completion.
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import {
  DailyCareerReportRecord,
  DailyReportFacts,
} from './notificationTypes.js';
import { careerReportPreferencesService } from './careerReportPreferencesService.js';
import { notificationService } from './notificationService.js';
import { applicationLifecycleService } from '../applicationLifecycle/applicationLifecycleService.js';
import { humanTaskService } from '../humanTask/humanTaskService.js';
import { jobSearchService } from '../job/jobSearchService.js';
import { jobInteractionService } from '../jobExperience/jobInteractionService.js';
import { gmailSyncService } from '../gmail/gmailSyncService.js';
import { aiClient } from '../ai/aiClient.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class DailyCareerReportService {
  /**
   * Generates or retrieves the Daily Career Report for candidate.
   * If a report for (userId, reportDate, timezone) already exists, returns it (or regenerates if force=true).
   */
  public async getOrGenerateReport(
    userId: string,
    options?: { targetDate?: string; forceRegenerate?: boolean }
  ): Promise<DailyCareerReportRecord> {
    const preferences = await careerReportPreferencesService.getPreferences(userId);
    const timezone = preferences.timezone || 'UTC';

    // Calculate target date (defaults to yesterday in target timezone)
    const reportDate = options?.targetDate || this.calculateYesterdayDateString(timezone);

    // Check existing report
    if (!options?.forceRegenerate) {
      const existing = await this.getReportByDate(userId, reportDate, timezone);
      if (existing) {
        return existing;
      }
    }

    // 1. Deterministic Data Aggregation across modules
    const facts = await this.aggregateReportFacts(userId, reportDate, timezone);

    // 2. Generate AI narrative summary (Optional, safe boundary)
    const generatedSummary = await this.generateAiNarrativeSummary(facts);

    // 3. Persist report record
    const report = await this.persistReport(userId, reportDate, timezone, facts, generatedSummary);

    // 4. Create in-app notification if enabled
    if (preferences.inAppNotificationsEnabled) {
      await notificationService.createNotification({
        userId,
        notificationType: 'DAILY_REPORT',
        title: `Daily Career Report: ${reportDate}`,
        message: generatedSummary || this.buildFallbackSummary(facts),
        deduplicationKey: `daily-report:${reportDate}:${timezone}`,
        reportId: report.id,
        actionUrl: `/app/reports/${report.id}`,
      });
    }

    return report;
  }

  /**
   * Lists historical reports for candidate.
   */
  public async listReports(userId: string, limit = 10): Promise<DailyCareerReportRecord[]> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('daily_career_reports')
        .select('*')
        .eq('user_id', userId)
        .order('report_date', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((d: any) => this.mapDbRowToRecord(d));
    } catch {
      return [];
    }
  }

  public async getReportById(userId: string, reportId: string): Promise<DailyCareerReportRecord | null> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('daily_career_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('id', reportId)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapDbRowToRecord(data);
    } catch {
      return null;
    }
  }

  private async getReportByDate(userId: string, reportDate: string, timezone: string): Promise<DailyCareerReportRecord | null> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('daily_career_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('report_date', reportDate)
        .eq('timezone', timezone)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapDbRowToRecord(data);
    } catch {
      return null;
    }
  }

  /**
   * Deterministically aggregates factual metrics from Modules 05, 06, 07, 08, 09, 10, 11.
   */
  public async aggregateReportFacts(
    userId: string,
    reportDate: string,
    timezone: string
  ): Promise<DailyReportFacts> {
    // 1. Applications from Module 09
    let applicationsSubmittedCount = 0;
    let applicationsUpdatedCount = 0;
    try {
      const apps = await applicationLifecycleService.listApplications(userId);
      for (const a of apps) {
        if (a.submittedAt && a.submittedAt.startsWith(reportDate)) {
          applicationsSubmittedCount++;
        }
        if (a.updatedAt && a.updatedAt.startsWith(reportDate) && a.status !== 'SUBMITTED') {
          applicationsUpdatedCount++;
        }
      }
    } catch (err: any) {
      logger.warn('Failed to query applications for report', { error: err?.message });
    }

    // 2. Open Human Tasks from Module 10
    let openTasksCount = 0;
    const openTasks: DailyReportFacts['openTasks'] = [];
    try {
      const tasks = await humanTaskService.listTasks(userId, { status: 'OPEN' });
      openTasksCount = tasks.length;
      for (const t of tasks.slice(0, 5)) {
        openTasks.push({
          id: t.id,
          title: t.title,
          priority: t.priority,
          taskType: t.taskType,
          dueDate: t.expiresAt || null,
        });
      }
    } catch (err: any) {
      logger.warn('Failed to query tasks for report', { error: err?.message });
    }

    // 3. Hiring Intelligence from Module 11 (Gmail)
    let interviewsCount = 0;
    const interviews: DailyReportFacts['interviews'] = [];
    let assessmentsCount = 0;
    const assessments: DailyReportFacts['assessments'] = [];
    let offersCount = 0;
    const offers: DailyReportFacts['offers'] = [];
    let rejectionsCount = 0;

    try {
      const messages = await gmailSyncService.listHiringIntelligence(userId);
      for (const m of messages) {
        if (m.classification === 'INTERVIEW_INVITATION' || m.classification === 'INTERVIEW_SCHEDULE') {
          interviewsCount++;
          interviews.push({
            company: m.extractedCompany || m.senderName || 'Employer',
            role: m.extractedRole || null,
            date: m.extractedInterviewDetails?.date || null,
            time: m.extractedInterviewDetails?.time || null,
            interviewType: m.extractedInterviewDetails?.interviewType || null,
            hiringMessageId: m.id,
            applicationId: m.applicationId || null,
          });
        } else if (m.classification === 'ASSESSMENT_REQUEST') {
          assessmentsCount++;
          assessments.push({
            company: m.extractedCompany || m.senderName || 'Employer',
            role: m.extractedRole || null,
            actionRequired: m.extractedActionRequired || 'Complete skills assessment',
          });
        } else if (m.classification === 'OFFER') {
          offersCount++;
          offers.push({
            company: m.extractedCompany || m.senderName || 'Employer',
            role: m.extractedRole || null,
            compensationAmount: m.extractedOfferDetails?.compensationAmount || null,
            compensationCurrency: m.extractedOfferDetails?.compensationCurrency || null,
            responseDeadline: m.extractedOfferDetails?.responseDeadline || null,
          });
        } else if (m.classification === 'REJECTION') {
          rejectionsCount++;
        }
      }
    } catch (err: any) {
      logger.warn('Gmail hiring intelligence query skipped for report', { error: err?.message });
    }

    // 4. Saved Jobs & Recommended Jobs from Modules 05 & 07
    let jobsSavedCount = 0;
    try {
      const saved = await jobInteractionService.listSavedJobs(userId);
      jobsSavedCount = saved.length;
    } catch {
      jobsSavedCount = 0;
    }

    let newRecommendedJobsCount = 0;
    const newRecommendedJobs: DailyReportFacts['newRecommendedJobs'] = [];
    try {
      const searchRes = await jobSearchService.searchJobs({ limit: 5 });
      newRecommendedJobsCount = searchRes.total;
      for (const j of searchRes.jobs.slice(0, 3)) {
        newRecommendedJobs.push({
          id: j.id,
          title: j.title,
          companyName: j.companyName,
          locationText: j.locationText,
          workplaceType: j.workplaceType,
        });
      }
    } catch {
      newRecommendedJobsCount = 0;
    }

    // 5. Build upcoming dates & priorities
    const upcomingEvents: DailyReportFacts['upcomingEvents'] = [];
    for (const inv of interviews) {
      if (inv.date) {
        upcomingEvents.push({
          title: `Interview with ${inv.company}`,
          date: inv.date,
          type: 'INTERVIEW',
          referenceId: inv.hiringMessageId,
        });
      }
    }
    for (const off of offers) {
      if (off.responseDeadline) {
        upcomingEvents.push({
          title: `Offer Decision Deadline: ${off.company}`,
          date: off.responseDeadline,
          type: 'DEADLINE',
        });
      }
    }

    const priorities: string[] = [];
    if (interviewsCount > 0) {
      priorities.push(`Prepare for ${interviewsCount} upcoming interview invitation${interviewsCount > 1 ? 's' : ''}`);
    }
    if (openTasksCount > 0) {
      priorities.push(`Resolve ${openTasksCount} action item${openTasksCount > 1 ? 's' : ''} requiring candidate input`);
    }
    if (assessmentsCount > 0) {
      priorities.push(`Complete outstanding technical assessment`);
    }
    if (newRecommendedJobsCount > 0) {
      priorities.push(`Review ${Math.min(3, newRecommendedJobsCount)} newly discovered job matches`);
    }
    if (priorities.length === 0) {
      priorities.push('Explore new job recommendations and submit tailored applications');
    }

    return {
      periodDate: reportDate,
      timezone,
      newRecommendedJobsCount,
      newRecommendedJobs,
      jobsSavedCount,
      applicationsSubmittedCount,
      applicationsUpdatedCount,
      interviewsCount,
      interviews,
      assessmentsCount,
      assessments,
      rejectionsCount,
      offersCount,
      offers,
      openTasksCount,
      openTasks,
      upcomingEvents,
      priorities,
    };
  }

  /**
   * Generates a conversational summary using Module 02 aiClient.
   * If Gemini is unavailable, returns null (deterministic report remains authoritative).
   */
  private async generateAiNarrativeSummary(facts: DailyReportFacts): Promise<string | null> {
    const prompt = `You are the Daily Career Assistant for Career Agent.
Analyze the following factual job search summary and write a concise, encouraging, professional 2-3 paragraph summary.

CRITICAL RULES:
1. NEVER INVENT NUMBERS. Use the exact numbers provided below.
2. If a number is 0, do not invent activity.
3. Highlight high-priority action items first (interviews, open human tasks, offers).
4. Do not include markdown code fences or headers.

FACTS:
- Date: ${facts.periodDate}
- New Recommended Jobs: ${facts.newRecommendedJobsCount}
- Applications Submitted: ${facts.applicationsSubmittedCount}
- Applications Updated: ${facts.applicationsUpdatedCount}
- Interviews: ${facts.interviewsCount}
- Assessments: ${facts.assessmentsCount}
- Offers: ${facts.offersCount}
- Rejections: ${facts.rejectionsCount}
- Open Tasks Requiring Candidate Action: ${facts.openTasksCount}
- Priorities: ${facts.priorities.join('; ')}
`;

    try {
      const res = await aiClient.generateContent(prompt, {
        modelName: 'gemini-2.5-flash',
        temperature: 0.3,
        maxOutputTokens: 512,
      });

      return res.text ? res.text.trim() : null;
    } catch (err: any) {
      logger.info('AI summary skipped for daily report (AI unavailable/unconfigured)', { error: err?.message });
      return null;
    }
  }

  /**
   * Fallback text summary purely based on deterministic numbers.
   */
  public buildFallbackSummary(facts: DailyReportFacts): string {
    const parts: string[] = [];
    if (facts.interviewsCount > 0) {
      parts.push(`🎯 ${facts.interviewsCount} interview invitation${facts.interviewsCount > 1 ? 's' : ''}`);
    }
    if (facts.openTasksCount > 0) {
      parts.push(`⚠️ ${facts.openTasksCount} action item${facts.openTasksCount > 1 ? 's' : ''} requiring your review`);
    }
    if (facts.offersCount > 0) {
      parts.push(`🎉 ${facts.offersCount} job offer received`);
    }
    if (facts.applicationsSubmittedCount > 0) {
      parts.push(`📝 ${facts.applicationsSubmittedCount} application${facts.applicationsSubmittedCount > 1 ? 's' : ''} submitted`);
    }
    if (facts.newRecommendedJobsCount > 0) {
      parts.push(`🔍 ${facts.newRecommendedJobsCount} new job match${facts.newRecommendedJobsCount > 1 ? 'es' : ''}`);
    }

    if (parts.length === 0) {
      return 'No major application changes recorded yesterday. Review recommended jobs to keep your momentum going.';
    }

    return parts.join(' • ');
  }

  private calculateYesterdayDateString(timezone: string): string {
    try {
      const now = new Date();
      // Adjust to yesterday
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(yesterday);
    } catch {
      return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
  }

  private async persistReport(
    userId: string,
    reportDate: string,
    timezone: string,
    facts: DailyReportFacts,
    generatedSummary: string | null
  ): Promise<DailyCareerReportRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();

    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('daily_career_reports')
        .upsert(
          {
            user_id: userId,
            report_date: reportDate,
            timezone,
            summary_data: facts,
            generated_summary: generatedSummary,
            updated_at: now,
          },
          { onConflict: 'user_id,report_date,timezone' }
        )
        .select()
        .single();

      if (error) {
        logger.error('Failed to persist daily career report', { userId, reportDate, error: error.message });
        throw new AppError(`Failed to persist daily report: ${error.message}`, 500);
      }

      return this.mapDbRowToRecord(data);
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode !== 503) throw err;
      return {
        id,
        userId,
        reportDate,
        timezone,
        summaryData: facts,
        generatedSummary,
        createdAt: now,
        updatedAt: now,
      };
    }
  }

  private mapDbRowToRecord(row: any): DailyCareerReportRecord {
    return {
      id: row.id,
      userId: row.user_id,
      reportDate: row.report_date,
      timezone: row.timezone,
      summaryData: row.summary_data,
      generatedSummary: row.generated_summary,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const dailyCareerReportService = new DailyCareerReportService();
