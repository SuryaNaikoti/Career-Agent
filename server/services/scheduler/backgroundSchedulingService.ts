/**
 * Background Scheduling Configuration Service
 * Module 14: Background Automation & Scheduling
 * 
 * Manages persistent candidate schedules in Supabase for:
 * 1. JOB_SEARCH
 * 2. DAILY_REPORT
 * 
 * Fails closed with DatabaseNotConfiguredError (HTTP 503) if DB is unconfigured.
 */

import { requireDatabaseClient } from '../supabaseClient.js';
import {
  BackgroundScheduleRecord,
  BackgroundScheduleType,
  UpdateBackgroundScheduleInput,
} from './schedulerTypes.js';
import { ScheduleCalculator } from './scheduleCalculator.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class BackgroundSchedulingService {
  /**
   * Retrieves all schedules for candidate, creating default records if none exist.
   */
  public async getSchedulesForUser(userId: string): Promise<BackgroundScheduleRecord[]> {
    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('background_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('schedule_type', { ascending: true });

    if (error) {
      logger.error('Failed to query background schedules', { userId, error: error.message });
      throw new AppError(`Failed to fetch schedules: ${error.message}`, 500);
    }

    const existing = (data || []).map((row) => this.mapDbRowToRecord(row));
    const types: BackgroundScheduleType[] = ['JOB_SEARCH', 'DAILY_REPORT'];

    const result: BackgroundScheduleRecord[] = [];
    for (const t of types) {
      const found = existing.find((s) => s.scheduleType === t);
      if (found) {
        result.push(found);
      } else {
        const created = await this.createDefaultSchedule(userId, t);
        result.push(created);
      }
    }

    return result;
  }

  /**
   * Retrieves single schedule by type for candidate.
   */
  public async getSchedule(
    userId: string,
    scheduleType: BackgroundScheduleType
  ): Promise<BackgroundScheduleRecord> {
    const schedules = await this.getSchedulesForUser(userId);
    const schedule = schedules.find((s) => s.scheduleType === scheduleType);
    if (!schedule) {
      throw new AppError(`Schedule not found for type '${scheduleType}'.`, 404);
    }
    return schedule;
  }

  /**
   * Updates candidate's schedule configuration and recalculates next_run_at.
   */
  public async updateSchedule(
    userId: string,
    scheduleType: BackgroundScheduleType,
    input: UpdateBackgroundScheduleInput
  ): Promise<BackgroundScheduleRecord> {
    const current = await this.getSchedule(userId, scheduleType);
    const now = new Date();

    const preferredTime = input.preferredTime
      ? ScheduleCalculator.validateTimeFormat(input.preferredTime)
      : current.preferredTime;

    const timezone = input.timezone
      ? ScheduleCalculator.validateTimezone(input.timezone)
      : current.timezone;

    const isEnabled = input.isEnabled !== undefined ? input.isEnabled : current.isEnabled;

    // Recalculate next run instant
    const nextRunAt = isEnabled
      ? ScheduleCalculator.calculateNextRun(preferredTime, timezone, now)
      : current.nextRunAt;

    const configSnapshot = input.configurationSnapshot
      ? { ...current.configurationSnapshot, ...input.configurationSnapshot }
      : current.configurationSnapshot;

    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('background_schedules')
      .upsert(
        {
          id: current.id,
          user_id: userId,
          schedule_type: scheduleType,
          is_enabled: isEnabled,
          preferred_time: preferredTime,
          timezone,
          next_run_at: nextRunAt,
          configuration_snapshot: configSnapshot,
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id,schedule_type' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Failed to update background schedule', { userId, scheduleType, error: error.message });
      throw new AppError(`Failed to update schedule: ${error.message}`, 500);
    }

    return this.mapDbRowToRecord(data);
  }

  private async createDefaultSchedule(
    userId: string,
    scheduleType: BackgroundScheduleType
  ): Promise<BackgroundScheduleRecord> {
    const now = new Date();
    const preferredTime = scheduleType === 'JOB_SEARCH' ? '09:00' : '18:00';
    const timezone = 'UTC';
    const nextRunAt = ScheduleCalculator.calculateNextRun(preferredTime, timezone, now);

    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('background_schedules')
      .upsert(
        {
          user_id: userId,
          schedule_type: scheduleType,
          is_enabled: false, // Safe default: must be explicitly enabled by candidate
          preferred_time: preferredTime,
          timezone,
          next_run_at: nextRunAt,
          consecutive_failures: 0,
          configuration_snapshot: {},
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id,schedule_type' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Failed to create default background schedule', { userId, scheduleType, error: error.message });
      throw new AppError(`Failed to initialize schedule: ${error.message}`, 500);
    }

    return this.mapDbRowToRecord(data);
  }

  private mapDbRowToRecord(row: any): BackgroundScheduleRecord {
    return {
      id: row.id,
      userId: row.user_id,
      scheduleType: row.schedule_type,
      isEnabled: Boolean(row.is_enabled),
      preferredTime: row.preferred_time || '09:00',
      timezone: row.timezone || 'UTC',
      nextRunAt: row.next_run_at,
      lastRunAt: row.last_run_at || null,
      lastStatus: row.last_status || null,
      consecutiveFailures: parseInt(row.consecutive_failures || '0', 10),
      configurationSnapshot: row.configuration_snapshot || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const backgroundSchedulingService = new BackgroundSchedulingService();
