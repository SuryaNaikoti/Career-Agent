/**
 * Gmail Email Normalizer & Security Sanitizer
 * Module 11: Gmail & Hiring Intelligence
 * 
 * Rules:
 * 1. Email content is UNTRUSTED external input.
 * 2. Strips all HTML tags, script blocks, tracking pixels, and malicious markup.
 * 3. Extracts clean text representation bounded to maximum safe lengths.
 * 4. Extracts standardized sender, recipients, and headers.
 */

import { RawGmailMessage } from './gmailTypes.js';

export interface NormalizedEmailContent {
  messageId: string;
  threadId: string;
  senderRaw: string;
  senderEmail: string;
  senderName: string | null;
  recipients: string[];
  subject: string;
  snippet: string;
  safeBodyPlain: string;
  receivedAt: string;
}

export class GmailNormalizer {
  /**
   * Normalizes a raw Gmail message into safe plain text.
   */
  public static normalize(raw: RawGmailMessage): NormalizedEmailContent {
    const headers = raw.payload?.headers || [];
    const getHeader = (name: string) => {
      const h = headers.find((item) => item.name.toLowerCase() === name.toLowerCase());
      return h ? h.value : '';
    };

    const senderRaw = getHeader('From') || 'Unknown Sender';
    const { name: senderName, email: senderEmail } = this.parseSender(senderRaw);
    const toRaw = getHeader('To');
    const recipients = toRaw
      ? toRaw.split(',').map((r) => r.trim()).filter(Boolean)
      : [];

    const subject = getHeader('Subject') || '(No Subject)';
    const snippet = raw.snippet ? raw.snippet.trim() : '';

    // Extract text body from payload parts
    const rawBody = this.extractBodyContent(raw.payload);
    const safeBodyPlain = this.sanitizeHtmlToPlain(rawBody || snippet);

    const receivedDate = raw.internalDate ? new Date(parseInt(raw.internalDate, 10)).toISOString() : new Date().toISOString();

    return {
      messageId: raw.id,
      threadId: raw.threadId,
      senderRaw,
      senderEmail,
      senderName,
      recipients,
      subject,
      snippet,
      safeBodyPlain: safeBodyPlain.slice(0, 10000), // Enforce upper bound of 10,000 chars
      receivedAt: receivedDate,
    };
  }

  /**
   * Parses "John Doe <john@example.com>" into name and email.
   */
  private static parseSender(senderRaw: string): { name: string | null; email: string } {
    const match = senderRaw.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
      return {
        name: match[1].replace(/["']/g, '').trim() || null,
        email: match[2].trim().toLowerCase(),
      };
    }
    return {
      name: null,
      email: senderRaw.replace(/["']/g, '').trim().toLowerCase(),
    };
  }

  /**
   * Recursively traverses MIME parts to extract the best text representation.
   */
  private static extractBodyContent(payload: RawGmailMessage['payload']): string {
    if (!payload) return '';

    // Prefer plain text data
    if (payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }

    if (payload.parts && payload.parts.length > 0) {
      // Look for text/plain part first
      const plainPart = payload.parts.find((p) => p.mimeType === 'text/plain');
      if (plainPart?.body?.data) {
        return this.decodeBase64Url(plainPart.body.data);
      }

      // Fallback to text/html part
      const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
      if (htmlPart?.body?.data) {
        return this.decodeBase64Url(htmlPart.body.data);
      }

      // Check nested parts
      for (const part of payload.parts) {
        if (part.parts) {
          const nested = this.extractBodyContent(part as any);
          if (nested) return nested;
        }
      }
    }

    return '';
  }

  /**
   * Safely decodes Base64URL string.
   */
  private static decodeBase64Url(base64UrlStr: string): string {
    try {
      const base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(base64, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  /**
   * Completely strips HTML tags, script blocks, styles, and dangerous markup.
   */
  public static sanitizeHtmlToPlain(htmlStr: string): string {
    if (!htmlStr) return '';

    return htmlStr
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // remove styles
      .replace(/<br\s*[\/]?>/gi, '\n')                                     // replace br with newline
      .replace(/<\/p>/gi, '\n\n')                                         // replace /p with double newline
      .replace(/<[^>]+>/g, '')                                            // strip all tags
      .replace(/&nbsp;/g, ' ')                                            // decode entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')                                         // normalize whitespace
      .trim();
  }
}
