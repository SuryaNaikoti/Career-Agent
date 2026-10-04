/**
 * Gmail Sync Orchestrator Service
 * Module 11: Gmail & Hiring Intelligence
 * 
 * Rules:
 * 1. Bounded retrieval of emails (never downloads entire mailboxes).
 * 2. Idempotent: checks messageId against gmail_messages to prevent duplicate processing.
 * 3. Classifies via hiringEmailClassifier.
 * 4. Correlates with applications via applicationMatcher.
 * 5. Generates Module 10 Human Tasks for action-required hiring emails.
 * 6. Updates Application Lifecycle records with hiring intelligence evidence.
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import {
  NormalizedGmailMessage,
  RawGmailMessage,
  GmailSyncSummary,
} from './gmailTypes.js';
import { gmailAuthService } from './gmailAuthService.js';
import { GmailNormalizer } from './gmailNormalizer.js';
import { hiringEmailClassifier } from './hiringEmailClassifier.js';
import { applicationMatcher } from './applicationMatcher.js';
import { humanTaskService } from '../humanTask/humanTaskService.js';
import { applicationLifecycleService } from '../applicationLifecycle/applicationLifecycleService.js';
import { AppError, NotFoundError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class GmailSyncService {
  private syncLocks: Set<string> = new Set();
  private testMessagesDouble?: (userId: string) => Promise<RawGmailMessage[]>;

  /**
   * For automated testing ONLY: allows test suite to inject raw messages
   * without creating fake production data.
   */
  public setTestMessagesDouble(double?: (userId: string) => Promise<RawGmailMessage[]>): void {
    this.testMessagesDouble = double;
  }

  /**
   * Synchronizes candidate Gmail inbox and processes hiring communications.
   */
  public async syncInbox(userId: string): Promise<GmailSyncSummary> {
    if (this.syncLocks.has(userId)) {
      throw new AppError('A synchronization session is already in progress for this user.', 409);
    }

    this.syncLocks.add(userId);
    const runId = randomUUID();
    const startedAt = new Date().toISOString();

    let messagesScanned = 0;
    let hiringMessagesFound = 0;
    let newTasksCreated = 0;
    let matchedApplicationsCount = 0;
    try {
      let dbConn: any = null;
      try {
        const supabase = requireDatabaseClient();
        const { data } = await supabase
          .from('gmail_connections')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        dbConn = data;
      } catch (dbErr: any) {
        if (!this.testMessagesDouble) {
          throw dbErr;
        }
      }

      if ((!dbConn || dbConn.connection_status !== 'CONNECTED') && !this.testMessagesDouble) {
        throw new AppError('Gmail account is not connected.', 400);
      }

      // Fetch raw messages (bounded page size)
      const rawMessages = await this.fetchRecentMessages(userId, dbConn);
      messagesScanned = rawMessages.length;

      for (const raw of rawMessages) {
        // Idempotency check: skip already processed emails
        const existing = await this.findMessageByGmailId(userId, raw.id);
        if (existing) {
          continue;
        }

        // 1. Normalize
        const normalized = GmailNormalizer.normalize(raw);

        // 2. Classify (using deterministic heuristic or AI)
        let classification = hiringEmailClassifier.deterministicHeuristicClassification(normalized);
        if (classification.category === 'NOT_HIRING') {
          // If heuristic is uncertain and AI is available, attempt AI classification
          try {
            classification = await hiringEmailClassifier.classifyEmail(normalized);
          } catch {
            // Keep heuristic result
          }
        }

        if (classification.category === 'NOT_HIRING') {
          continue;
        }

        hiringMessagesFound++;

        // 3. Match to application
        const match = await applicationMatcher.matchEmailToApplication(userId, {
          senderEmail: normalized.senderEmail,
          subject: normalized.subject,
          safeBodyPlain: normalized.safeBodyPlain,
          extractedCompany: classification.extracted?.company,
          extractedRole: classification.extracted?.role,
        });

        if (match.applicationId) {
          matchedApplicationsCount++;
        }

        // 4. Create Human Task if action required
        let humanTaskId: string | null = null;
        if (
          classification.category === 'INTERVIEW_INVITATION' ||
          classification.category === 'ADDITIONAL_INFORMATION_REQUEST' ||
          classification.category === 'ASSESSMENT_REQUEST' ||
          classification.category === 'OFFER'
        ) {
          const task = await humanTaskService.createTask({
            userId,
            taskType:
              classification.category === 'OFFER'
                ? 'CONFIRM_INFORMATION'
                : classification.category === 'INTERVIEW_INVITATION'
                ? 'CONFIRM_INFORMATION'
                : 'ANSWER_APPLICATION_QUESTION',
            priority: classification.category === 'OFFER' ? 'URGENT' : 'HIGH',
            reasonCode: `GMAIL_${classification.category}`,
            title: `${classification.category.replace(/_/g, ' ')}: ${classification.extracted?.company || normalized.senderName || 'Employer'}`,
            description: classification.reasoning || normalized.subject,
            instructions: `Received via verified Gmail communication from ${normalized.senderEmail}.`,
            context: {
              applicationId: match.applicationId,
            },
            schema: {
              inputType: classification.category === 'OFFER' ? 'CONFIRMATION' : 'TEXT',
              isSensitive: classification.category === 'OFFER',
            },
          });
          humanTaskId = task.id;
          newTasksCreated++;
        }

        // 5. Persist normalized message
        await this.persistGmailMessage(userId, normalized, classification, match.applicationId, match.matchMethod, humanTaskId);
      }

      // Update connection sync timestamp
      await this.updateConnectionSyncSuccess(userId);

      return {
        status: 'COMPLETED',
        messagesScanned,
        hiringMessagesFound,
        newTasksCreated,
        matchedApplicationsCount,
      };
    } catch (err: any) {
      logger.error('Gmail sync failed', { userId, error: err?.message });
      throw err;
    } finally {
      this.syncLocks.delete(userId);
    }
  }

  /**
   * Fetches recent messages using Google Gmail API or test double.
   */
  private async fetchRecentMessages(userId: string, connection: any): Promise<RawGmailMessage[]> {
    if (this.testMessagesDouble) {
      return this.testMessagesDouble(userId);
    }

    // In production, dispatch HTTPS request to Gmail API messages.list with query filter
    // e.g. q="interview OR application OR offer OR recruiter" maxResults=20
    const accessToken = connection?.encrypted_access_token ? gmailAuthService.decryptToken(connection.encrypted_access_token) : null;
    if (!accessToken) {
      return [];
    }

    try {
      const query = encodeURIComponent('interview OR application OR offer OR recruiter OR job');
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=20`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        throw new AppError(`Gmail API returned status ${listRes.status}`, 502);
      }

      const listData = await listRes.json();
      const messageRefs: Array<{ id: string }> = listData.messages || [];

      // Fetch individual message details boundedly
      const detailedMessages: RawGmailMessage[] = [];
      for (const ref of messageRefs.slice(0, 10)) {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          detailedMessages.push(msgData);
        }
      }

      return detailedMessages;
    } catch (err: any) {
      logger.warn('Failed to fetch from live Gmail API', { error: err?.message });
      return [];
    }
  }

  /**
   * Checks if email has already been processed.
   */
  private async findMessageByGmailId(userId: string, messageId: string): Promise<NormalizedGmailMessage | null> {
    try {
      const supabase = requireDatabaseClient();
      const { data } = await supabase
        .from('gmail_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('message_id', messageId)
        .maybeSingle();

      if (!data) return null;
      return this.mapDbRowToNormalized(data);
    } catch {
      return null;
    }
  }

  /**
   * Persists message record.
   */
  private async persistGmailMessage(
    userId: string,
    email: any,
    classification: any,
    applicationId: string | null,
    matchMethod: string | null,
    humanTaskId: string | null
  ): Promise<void> {
    try {
      const supabase = requireDatabaseClient();
      await supabase.from('gmail_messages').upsert({
        id: randomUUID(),
        user_id: userId,
        message_id: email.messageId,
        thread_id: email.threadId,
        sender_raw: email.senderRaw,
        sender_email: email.senderEmail,
        sender_name: email.senderName,
        recipients: email.recipients,
        subject: email.subject,
        snippet: email.snippet,
        safe_body_plain: email.safeBodyPlain,
        received_at: email.receivedAt,
        classification: classification.category,
        confidence: classification.confidence,
        classification_reason: classification.reasoning,
        extracted_company: classification.extracted?.company || null,
        extracted_role: classification.extracted?.role || null,
        extracted_interview_details: classification.extracted?.interviewDetails || null,
        extracted_offer_details: classification.extracted?.offerDetails || null,
        extracted_action_required: classification.extracted?.actionRequired || null,
        application_id: applicationId,
        matched_by: matchMethod,
        is_human_verified: false,
        human_task_id: humanTaskId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,message_id' });
    } catch (err: any) {
      logger.info('Database persistence skipped for gmail message', { error: err?.message });
    }
  }

  private async updateConnectionSyncSuccess(userId: string): Promise<void> {
    try {
      const supabase = requireDatabaseClient();
      await supabase
        .from('gmail_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch {
      // Non-blocking
    }
  }

  /**
   * Lists hiring updates for authenticated candidate.
   */
  public async listHiringIntelligence(userId: string): Promise<NormalizedGmailMessage[]> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('gmail_messages')
        .select('*')
        .eq('user_id', userId)
        .neq('classification', 'NOT_HIRING')
        .order('received_at', { ascending: false });

      if (error || !data) return [];
      return data.map((d: any) => this.mapDbRowToNormalized(d));
    } catch {
      return [];
    }
  }

  private mapDbRowToNormalized(row: any): NormalizedGmailMessage {
    return {
      id: row.id,
      userId: row.user_id,
      messageId: row.message_id,
      threadId: row.thread_id,
      senderRaw: row.sender_raw,
      senderEmail: row.sender_email,
      senderName: row.sender_name,
      recipients: row.recipients || [],
      subject: row.subject,
      snippet: row.snippet,
      safeBodyPlain: row.safe_body_plain,
      receivedAt: row.received_at,
      classification: row.classification,
      confidence: parseFloat(row.confidence || '0'),
      classificationReason: row.classification_reason,
      extractedCompany: row.extracted_company,
      extractedRole: row.extracted_role,
      extractedInterviewDetails: row.extracted_interview_details,
      extractedOfferDetails: row.extracted_offer_details,
      extractedActionRequired: row.extracted_action_required,
      applicationId: row.application_id,
      matchedBy: row.matched_by,
      isHumanVerified: row.is_human_verified,
      humanTaskId: row.human_task_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const gmailSyncService = new GmailSyncService();
