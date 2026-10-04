/**
 * Career Report Preferences Service
 * Module 12: Notifications & Daily Career Report
 * 
 * Manages candidate preferences for:
 * - dailyReportEnabled (boolean)
 * - preferredReportTime ("HH:MM", default "08:00")
 * - timezone (string, e.g. "Asia/Kolkata", "America/New_York", defaults to UTC)
 * - inAppNotificationsEnabled (boolean)
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import {
  CareerReportPreferencesRecord,
  UpdateCareerReportPreferencesInput,
} from './notificationTypes.js';
import { AppError, ValidationError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class CareerReportPreferencesService {
  private localPreferences: Map<string, CareerReportPreferencesRecord> = new Map();

  /**
   * Retrieves preferences for authenticated candidate. Defaults if none set.
   */
  public async getPreferences(userId: string): Promise<CareerReportPreferencesRecord> {
    const defaultPrefs: CareerReportPreferencesRecord = this.localPreferences.get(userId) || {
      id: `default-${userId}`,
      userId,
      dailyReportEnabled: true,
      preferredReportTime: '08:00',
      timezone: 'UTC',
      inAppNotificationsEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('career_report_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return defaultPrefs;

      return {
        id: data.id,
        userId: data.user_id,
        dailyReportEnabled: data.daily_report_enabled,
        preferredReportTime: data.preferred_report_time,
        timezone: data.timezone,
        inAppNotificationsEnabled: data.in_app_notifications_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return defaultPrefs;
    }
  }

  /**
   * Updates report preferences for candidate.
   */
  public async updatePreferences(
    userId: string,
    input: UpdateCareerReportPreferencesInput
  ): Promise<CareerReportPreferencesRecord> {
    // Validate preferredReportTime if supplied
    if (input.preferredReportTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(input.preferredReportTime)) {
        throw new ValidationError('preferredReportTime must be in format HH:MM (e.g. 08:00)');
      }
    }

    const current = await this.getPreferences(userId);
    const now = new Date().toISOString();

    const updated: CareerReportPreferencesRecord = {
      ...current,
      dailyReportEnabled: input.dailyReportEnabled !== undefined ? input.dailyReportEnabled : current.dailyReportEnabled,
      preferredReportTime: input.preferredReportTime !== undefined ? input.preferredReportTime : current.preferredReportTime,
      timezone: input.timezone !== undefined ? input.timezone : current.timezone,
      inAppNotificationsEnabled: input.inAppNotificationsEnabled !== undefined ? input.inAppNotificationsEnabled : current.inAppNotificationsEnabled,
      updatedAt: now,
    };

    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('career_report_preferences')
        .upsert(
          {
            user_id: userId,
            daily_report_enabled: updated.dailyReportEnabled,
            preferred_report_time: updated.preferredReportTime,
            timezone: updated.timezone,
            in_app_notifications_enabled: updated.inAppNotificationsEnabled,
            updated_at: now,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        logger.error('Failed to update career report preferences', { userId, error: error.message });
        throw new AppError(`Failed to update preferences: ${error.message}`, 500);
      }

      this.localPreferences.set(userId, updated);
      return {
        id: data.id,
        userId: data.user_id,
        dailyReportEnabled: data.daily_report_enabled,
        preferredReportTime: data.preferred_report_time,
        timezone: data.timezone,
        inAppNotificationsEnabled: data.in_app_notifications_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode !== 503) throw err;
      this.localPreferences.set(userId, updated);
      return updated;
    }
  }
}

export const careerReportPreferencesService = new CareerReportPreferencesService();
