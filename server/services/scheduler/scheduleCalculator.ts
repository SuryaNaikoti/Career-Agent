/**
 * Schedule Calculator & Timezone Helper
 * Module 14: Background Automation & Scheduling
 * 
 * Safely computes next run timestamps in target candidate timezones
 * without browser timers, infinite loops, or external heavy libraries.
 */

import { ValidationError } from '../../core/errors/appError.js';

export class ScheduleCalculator {
  /**
   * Validates 'HH:MM' 24-hour time format.
   */
  public static validateTimeFormat(timeStr: string): string {
    const trimmed = (timeStr || '').trim();
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regex.test(trimmed)) {
      throw new ValidationError(`Invalid preferred time format: '${timeStr}'. Must be 'HH:MM' (00:00 to 23:59).`);
    }
    return trimmed;
  }

  /**
   * Validates IANA timezone name.
   */
  public static validateTimezone(tz: string): string {
    const trimmed = (tz || '').trim();
    try {
      Intl.DateTimeFormat(undefined, { timeZone: trimmed });
      return trimmed;
    } catch {
      throw new ValidationError(`Invalid IANA timezone: '${tz}'.`);
    }
  }

  /**
   * Calculates the next UTC ISO string for a given 'HH:MM' preferred time in a target timezone.
   * If the time today in that timezone has already passed, schedules for tomorrow.
   */
  public static calculateNextRun(
    preferredTime: string,
    timezone: string,
    now: Date = new Date()
  ): string {
    const validTime = this.validateTimeFormat(preferredTime);
    const validTz = this.validateTimezone(timezone);

    const [hours, minutes] = validTime.split(':').map((v) => parseInt(v, 10));

    // Get current date parts in candidate's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        partMap[p.type] = p.value;
      }
    }

    const currentYear = parseInt(partMap.year, 10);
    const currentMonth = parseInt(partMap.month, 10);
    const currentDay = parseInt(partMap.day, 10);
    const currentHour = parseInt(partMap.hour, 10);
    const currentMinute = parseInt(partMap.minute, 10);

    // Determine if today's time in the timezone has passed
    const isPastToday =
      currentHour > hours || (currentHour === hours && currentMinute >= minutes);

    // Construct target local date components
    let targetYear = currentYear;
    let targetMonth = currentMonth;
    let targetDay = currentDay + (isPastToday ? 1 : 0);

    // Adjust month/year rollover safely using standard JS Date
    const tempDate = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, hours, minutes, 0));
    targetYear = tempDate.getUTCFullYear();
    targetMonth = tempDate.getUTCMonth() + 1;
    targetDay = tempDate.getUTCDate();

    // Now resolve the exact UTC instant for target local (targetYear, targetMonth, targetDay, hours, minutes) in validTz
    // We approximate with UTC and find the offset discrepancy
    const candidateUtc = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, hours, minutes, 0));
    
    // Measure timezone offset at that candidate point
    const candParts = formatter.formatToParts(candidateUtc);
    const candMap: Record<string, string> = {};
    for (const p of candParts) {
      if (p.type !== 'literal') candMap[p.type] = p.value;
    }

    const candHour = parseInt(candMap.hour, 10);
    const candMin = parseInt(candMap.minute, 10);
    const candDay = parseInt(candMap.day, 10);

    // Calculate diff between desired local time and what UTC produced in validTz
    let desiredTotalMins = (targetDay * 24 * 60) + (hours * 60) + minutes;
    let actualTotalMins = (candDay * 24 * 60) + (candHour * 60) + candMin;
    let diffMins = desiredTotalMins - actualTotalMins;

    const finalInstant = new Date(candidateUtc.getTime() + diffMins * 60 * 1000);

    // Ensure it is strictly in the future relative to `now`
    if (finalInstant.getTime() <= now.getTime()) {
      return new Date(finalInstant.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    return finalInstant.toISOString();
  }
}

export const scheduleCalculator = {
  isValidTimeFormat(timeStr: string): boolean {
    try {
      ScheduleCalculator.validateTimeFormat(timeStr);
      return true;
    } catch {
      return false;
    }
  },
  isValidTimezone(tz: string): boolean {
    try {
      ScheduleCalculator.validateTimezone(tz);
      return true;
    } catch {
      return false;
    }
  },
  computeNextRunAt(preferredTime: string, timezone: string, now?: Date): string {
    return ScheduleCalculator.calculateNextRun(preferredTime, timezone, now);
  },
};
