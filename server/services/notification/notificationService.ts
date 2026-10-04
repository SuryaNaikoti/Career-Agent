/**
 * Internal Notification Service
 * Module 12: Notifications & Daily Career Report
 * 
 * Rules:
 * 1. Single source of truth for in-app notifications.
 * 2. Deterministic deduplication: identical deduplicationKey per user is idempotent.
 * 3. Minimal entity referencing (applicationId, taskId, jobId, reportId).
 * 4. User-isolated: auth.uid() = user_id.
 * 5. Supports read/unread transitions.
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import {
  InternalNotificationRecord,
  CreateNotificationInput,
  NotificationStatus,
} from './notificationTypes.js';
import { AppError, ValidationError, NotFoundError, ForbiddenError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class NotificationService {
  private localNotifications: Map<string, InternalNotificationRecord[]> = new Map();

  /**
   * Creates an in-app notification with deduplication protection.
   * If a notification with the deduplication key already exists for this user, returns the existing record.
   */
  public async createNotification(input: CreateNotificationInput): Promise<InternalNotificationRecord> {
    if (!input.userId) throw new ValidationError('userId is required.');
    if (!input.title || !input.title.trim()) throw new ValidationError('title is required.');
    if (!input.message || !input.message.trim()) throw new ValidationError('message is required.');
    if (!input.deduplicationKey) throw new ValidationError('deduplicationKey is required.');

    const now = new Date().toISOString();
    const id = randomUUID();

    try {
      const supabase = requireDatabaseClient();

      // Check existing by deduplication key
      const { data: existing } = await supabase
        .from('internal_notifications')
        .select('*')
        .eq('user_id', input.userId)
        .eq('deduplication_key', input.deduplicationKey)
        .maybeSingle();

      if (existing) {
        return this.mapDbRowToRecord(existing);
      }

      const { data, error } = await supabase
        .from('internal_notifications')
        .insert({
          id,
          user_id: input.userId,
          notification_type: input.notificationType,
          status: 'UNREAD',
          title: input.title.trim(),
          message: input.message.trim(),
          deduplication_key: input.deduplicationKey,
          application_id: input.applicationId || null,
          job_id: input.jobId || null,
          task_id: input.taskId || null,
          hiring_message_id: input.hiringMessageId || null,
          report_id: input.reportId || null,
          action_url: input.actionUrl || null,
          metadata: input.metadata || {},
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        // If conflict on concurrent insert, return existing
        if (error.code === '23505') {
          const { data: conflictRow } = await supabase
            .from('internal_notifications')
            .select('*')
            .eq('user_id', input.userId)
            .eq('deduplication_key', input.deduplicationKey)
            .maybeSingle();
          if (conflictRow) return this.mapDbRowToRecord(conflictRow);
        }
        logger.error('Failed to insert internal notification', { userId: input.userId, error: error.message });
        throw new AppError(`Failed to create notification: ${error.message}`, 500);
      }

      return this.mapDbRowToRecord(data);
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode !== 503) throw err;
      logger.info('Database insert skipped for notification (DB unconfigured)', { error: err?.message });
      
      const userList = this.localNotifications.get(input.userId) || [];
      const existing = userList.find((n) => n.deduplicationKey === input.deduplicationKey);
      if (existing) return existing;

      const record: InternalNotificationRecord = {
        id,
        userId: input.userId,
        notificationType: input.notificationType,
        status: 'UNREAD',
        title: input.title,
        message: input.message,
        deduplicationKey: input.deduplicationKey,
        applicationId: input.applicationId || null,
        jobId: input.jobId || null,
        taskId: input.taskId || null,
        hiringMessageId: input.hiringMessageId || null,
        reportId: input.reportId || null,
        actionUrl: input.actionUrl || null,
        metadata: input.metadata || {},
        readAt: null,
        createdAt: now,
        updatedAt: now,
      };

      userList.unshift(record);
      this.localNotifications.set(input.userId, userList);
      return record;
    }
  }

  /**
   * Lists notifications for authenticated candidate.
   */
  public async listNotifications(
    userId: string,
    filter?: { status?: NotificationStatus; limit?: number }
  ): Promise<InternalNotificationRecord[]> {
    try {
      const supabase = requireDatabaseClient();
      let q = supabase
        .from('internal_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filter?.status) {
        q = q.eq('status', filter.status);
      }
      if (filter?.limit) {
        q = q.limit(filter.limit);
      }

      const { data, error } = await q;
      if (error || !data) return [];
      return data.map((d: any) => this.mapDbRowToRecord(d));
    } catch {
      return [];
    }
  }

  /**
   * Marks a notification as read. Enforces user ownership.
   */
  public async markAsRead(userId: string, notificationId: string): Promise<InternalNotificationRecord> {
    const notification = await this.getNotificationById(userId, notificationId);
    if (!notification) {
      throw new NotFoundError(`Notification '${notificationId}' not found.`);
    }
    if (notification.userId !== userId) {
      throw new ForbiddenError('Unauthorized: Candidate does not own this notification.');
    }

    if (notification.status === 'READ') {
      return notification;
    }

    const now = new Date().toISOString();
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('internal_notifications')
        .update({
          status: 'READ',
          read_at: now,
          updated_at: now,
        })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) {
        return { ...notification, status: 'READ', readAt: now, updatedAt: now };
      }
      return this.mapDbRowToRecord(data);
    } catch {
      return { ...notification, status: 'READ', readAt: now, updatedAt: now };
    }
  }

  /**
   * Marks all notifications as read for candidate.
   */
  public async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const now = new Date().toISOString();
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('internal_notifications')
        .update({
          status: 'READ',
          read_at: now,
          updated_at: now,
        })
        .eq('user_id', userId)
        .eq('status', 'UNREAD')
        .select();

      return { updatedCount: data ? data.length : 0 };
    } catch {
      return { updatedCount: 0 };
    }
  }

  public async getNotificationById(userId: string, notificationId: string): Promise<InternalNotificationRecord | null> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('internal_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('id', notificationId)
        .maybeSingle();

      if (!error && data) return this.mapDbRowToRecord(data);
    } catch {
      // Fallback to local store
    }

    const userList = this.localNotifications.get(userId) || [];
    const found = userList.find((n) => n.id === notificationId);
    return found || null;
  }

  private mapDbRowToRecord(row: any): InternalNotificationRecord {
    return {
      id: row.id,
      userId: row.user_id,
      notificationType: row.notification_type,
      status: row.status,
      title: row.title,
      message: row.message,
      deduplicationKey: row.deduplication_key,
      applicationId: row.application_id,
      jobId: row.job_id,
      taskId: row.task_id,
      hiringMessageId: row.hiring_message_id,
      reportId: row.report_id,
      actionUrl: row.action_url,
      metadata: row.metadata || {},
      readAt: row.read_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const notificationService = new NotificationService();
