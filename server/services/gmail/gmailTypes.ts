/**
 * Gmail & Hiring Intelligence Domain Types
 * Module 11: Gmail & Hiring Intelligence
 * 
 * Strict contracts for read-only Gmail OAuth, synchronized messages,
 * hiring classifications, structured intelligence extraction, application matching,
 * and human task hooks.
 */

export type GmailConnectionStatus =
  | 'CONNECTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'DISCONNECTED'
  | 'ERROR';

export type HiringEmailClassification =
  | 'RECRUITER_OUTREACH'
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_UPDATE'
  | 'INTERVIEW_INVITATION'
  | 'INTERVIEW_SCHEDULE'
  | 'ASSESSMENT_REQUEST'
  | 'ADDITIONAL_INFORMATION_REQUEST'
  | 'REJECTION'
  | 'OFFER'
  | 'FOLLOW_UP_REQUEST'
  | 'WITHDRAWAL_OR_CANCELLATION'
  | 'OTHER_HIRING'
  | 'NOT_HIRING';

export type ApplicationMatchMethod =
  | 'EXACT_EXTERNAL_ID'
  | 'COMPANY_AND_TITLE'
  | 'DOMAIN'
  | 'AI_MATCH'
  | 'UNMATCHED';

export interface ExtractedInterviewDetails {
  date?: string;
  time?: string;
  timezone?: string;
  interviewType?: 'VIDEO' | 'PHONE' | 'ON_SITE' | 'UNKNOWN';
  interviewerName?: string;
  meetingUrl?: string;
  location?: string;
  instructions?: string;
}

export interface ExtractedOfferDetails {
  company?: string;
  role?: string;
  compensationAmount?: number;
  compensationCurrency?: string;
  compensationPeriod?: string;
  startDate?: string;
  responseDeadline?: string;
  location?: string;
  workMode?: string;
}

export interface ExtractedHiringInfo {
  company?: string;
  role?: string;
  interviewDetails?: ExtractedInterviewDetails;
  offerDetails?: ExtractedOfferDetails;
  actionRequired?: string;
}

/**
 * Normalized Email Message representation
 */
export interface NormalizedGmailMessage {
  id: string; // Database UUID
  userId: string;
  messageId: string; // Gmail Message ID
  threadId: string;
  senderRaw: string;
  senderEmail: string;
  senderName?: string | null;
  recipients: string[];
  subject: string;
  snippet?: string | null;
  safeBodyPlain: string;
  receivedAt: string;
  
  // Classification
  classification: HiringEmailClassification;
  confidence: number;
  classificationReason?: string | null;
  
  // Extracted Entities
  extractedCompany?: string | null;
  extractedRole?: string | null;
  extractedInterviewDetails?: ExtractedInterviewDetails | null;
  extractedOfferDetails?: ExtractedOfferDetails | null;
  extractedActionRequired?: string | null;

  // Application Association
  applicationId?: string | null;
  matchedBy?: ApplicationMatchMethod | null;
  isHumanVerified: boolean;

  // Task Link
  humanTaskId?: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * Gmail Connection Record
 */
export interface GmailConnectionRecord {
  id: string;
  userId: string;
  googleEmail?: string | null;
  googleAccountId?: string | null;
  connectionStatus: GmailConnectionStatus;
  scopes: string;
  lastSyncAt?: string | null;
  lastHistoryId?: string | null;
  lastSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw Gmail Message from API/Provider
 */
export interface RawGmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: any[] }>;
  };
  internalDate: string;
}

/**
 * AI Structured Output Contract for Hiring Classification
 */
export interface AiHiringClassificationResult {
  category: HiringEmailClassification;
  confidence: number;
  reasoning: string;
  extracted?: {
    company?: string;
    role?: string;
    actionRequired?: string;
    interviewDetails?: ExtractedInterviewDetails;
    offerDetails?: ExtractedOfferDetails;
  };
}

/**
 * Sync Session Summary
 */
export interface GmailSyncSummary {
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  messagesScanned: number;
  hiringMessagesFound: number;
  newTasksCreated: number;
  matchedApplicationsCount: number;
  error?: string;
}
